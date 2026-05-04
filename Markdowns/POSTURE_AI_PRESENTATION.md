# Posture AI — Technical Presentation Script

## Slide 1: Introduction — What Problem Are We Solving

When people exercise without supervision, two things go wrong consistently: they perform movements with poor form, which leads to injury,
and they count reps inconsistently, which undermines any structured training program.

Commercial solutions like personal trainers are expensive and don't scale. Wearable sensors require additional hardware. Our approach uses only 
the device's front-facing camera and runs entirely on-device through the browser's ML runtime — no server round-trips, no additional hardware.

The system we built performs real-time human pose estimation, calculates joint angles from the detected skeleton, validates those angles against 
biomechanically-defined form rules, and counts repetitions through a state machine — all at approximately 30 frames per second on a mobile device.

---

## Slide 2: Architecture Overview

The system is split into two execution environments that communicate through a message bridge.

The first environment is the **React Native layer**. This handles camera access through Expo Camera, 
the user interface including the heads-up display, voice feedback through Expo Speech, and all persistence to the Supabase 
backend — workout sessions, muscle fatigue tracking, XP progression, and achievement checks.

The second environment is an **embedded WebView** running a self-contained HTML application. This is where the actual machine learning inference 
happens. We load Google's MediaPipe Pose model directly in the WebView's JavaScript engine. The reason for this split is practical: MediaPipe's 
JavaScript SDK runs in a browser context, not in React Native's JavaScript runtime. The WebView gives us a full browser environment with 
GPU-accelerated inference, while React Native gives us native camera access, haptics, and speech synthesis.

The two layers communicate through a JSON-based `postMessage` protocol. The WebView sends structured messages — rep counted, form cue detected, 
calibration complete, session state — and the React Native layer consumes them to update the UI, speak coaching cues, and persist data.

---

## Slide 3: Pose Estimation — MediaPipe Pose

We use MediaPipe Pose version 0.5, which produces 33 landmark points per frame. Each landmark has an x and y coordinate normalized to the frame 
dimensions, a z depth estimate, and a visibility confidence score between 0 and 1.

The model is configured at its highest accuracy setting — `modelComplexity: 2` — with `smoothLandmarks` enabled at the MediaPipe level. 
We set `minDetectionConfidence` to 0.65 and `minTrackingConfidence` to 0.6, which means the model needs to be reasonably confident a person 
is present before it starts tracking, and it drops tracking frames that fall below the confidence floor.

The key landmarks for exercise tracking are: shoulders (indices 11, 12), elbows (13, 14), wrists (15, 16), hips (23, 24), knees (25, 26), 
and ankles (27, 28). Different exercises use different subsets of these landmarks.

---

## Slide 4: Angle Calculation Pipeline

Raw landmarks are noisy, especially on mobile where lighting and camera quality vary. We apply three processing stages before using any angle for 
form evaluation or rep counting.

**Stage one is visibility gating.** For each joint angle, we check the average visibility of the three landmarks involved. If the average falls 
below 0.55, we discard that angle entirely for the current frame rather than computing an unreliable value. This prevents occluded or off-screen 
body parts from corrupting the form score.

**Stage two is temporal smoothing.** We apply an exponential moving average with alpha equal to 0.45. 
The formula is: `smoothed = 0.45 × raw + 0.55 × previous`. This rejects single-frame spikes — for example, 
if a landmark jumps erratically for one frame — while remaining responsive enough that the user doesn't perceive lag. 
We tested alpha values from 0.2 to 0.7; below 0.3 introduced visible delay in the skeleton overlay, and above 0.6 didn't meaningfully reduce jitter.

**Stage three is bilateral side selection.** Most exercises are symmetrical — squats, push-ups, curls, presses. We track both the left 
and right sides, but for rep counting and form scoring, we dynamically select whichever side has higher average landmark visibility across all 
its joint groups. This means if a user is angled slightly to the camera's right, we automatically track their right knee for squats instead of 
their left. The selection updates every frame.

The angle itself is computed using the standard dot product formula: given three points A, B (the vertex), and C, the angle at B equals 
the arccosine of the dot product of vectors BA and BC divided by the product of their magnitudes, converted to degrees.

---

## Slide 5: Exercise Configuration System

Each of the seven supported exercises plus the posture scan mode is defined as a configuration object. 
This is a data-driven design — adding a new exercise doesn't require modifying the detection logic, only adding a new configuration.

Each configuration specifies:

- **Angle groups**: which three landmark indices form each tracked angle. For example, a squat tracks left knee (hip → knee → ankle, indices 23, 
25, 27), right knee, left hip angle, and right hip angle.

- **Form rules**: minimum and maximum acceptable angle for each group, plus a coaching cue string. For a squat, the knee must stay between 50° 
and 180°. The hip angle must stay between 45° and 150° — if it drops below 45°, the torso is leaning too far forward.

- **Rep configuration**: which joint angle drives the rep counter, and the up and down thresholds. A squat counts a rep when the knee angle drops 
below 110° (the bottom of the squat) and then rises back above 150° (standing).

- **Bilateral pairs**: which angle groups are left/right mirrors of each other, enabling the side selection logic.

- **Critical joints**: which joints, if they fail their form rule, should abort a rep mid-movement. For squats, the hip angles are critical — if 
the torso collapses forward during the rep, the rep is invalidated. The knee angles are advisory — they generate coaching cues but don't abort.

This separation between critical and advisory joints is important. Without it, the system would either be too strict — aborting reps for minor 
deviations — or too lenient, counting reps with dangerous form. The critical joint mechanism focuses strictness on the movements that actually 
risk injury.

---

## Slide 6: Rep Counting State Machine

The rep counter is a finite state machine with two modes: normal and inverted.

**Normal mode** applies to squat, push-up, shoulder press, deadlift, and lunge. The states are `up` and `down`. The machine starts in `up` after 
a calibration phase. When the tracked joint angle drops below the down threshold minus 5 degrees of hysteresis, it transitions to `down`. 
When it rises back above the up threshold plus 5 degrees of hysteresis and the form score is at least 55%, it transitions back to `up` and 
increments the rep count.

**Inverted mode** applies to the bicep curl, where the motion is reversed — the arm starts extended at a high angle, contracts to a low angle, 
then extends back. The thresholds are swapped: `upThreshold` is 50° (contracted) and `downThreshold` is 140° (extended). The state machine starts 
in `up` (extended). When the angle drops below 55° (contracted + hysteresis), it enters `down`. When the angle rises back above 135° 
(extended - hysteresis) with adequate form, it counts the rep.

**The hysteresis buffer** deserves specific attention. Without it, when a joint angle hovers near a threshold — say the knee is oscillating 
between 109° and 111° near a 110° threshold — the state machine would rapidly toggle between states. The 5-degree dead zone means the angle must 
decisively cross the threshold before a transition occurs. We chose 5 degrees empirically through iterative testing; values below 3 still 
produced occasional double-counts, and values above 8 caused users to feel the system was unresponsive.

**Calibration** precedes rep counting. The user must hold the exercise's starting position for 2 continuous seconds. If they move before 
the calibration window completes, the timer resets. This ensures the system has a stable reference frame before it begins tracking movement.

**The posture gate** requires the overall form score to be at least 55% to count a rep. This prevents counting reps performed with dangerously bad 
form, while being tolerant of the natural variation in how different users perform movements — a threshold of 70% was still too strict in testing 
and rejected reps that were biomechanically acceptable but didn't match idealized textbook form exactly.

---

## Slide 7: Form Scoring and Coaching Cues

The form score is computed every frame as: passed rules divided by total evaluated rules, times 100, rounded to the nearest integer.

When bilateral deduplication is active, rules for the less-visible side are excluded from both the numerator and denominator, so the score isn't 
penalized for landmarks the camera can't reliably see.

Coaching cues are text strings attached to each form rule. When a rule fails, the first failing rule's cue is surfaced — both visually on the 
WebView's overlay and through the message bridge to React Native. The cue changes only when a different rule begins failing, which prevents rapid 
cue flickering.

The cues are designed to be actionable and specific to the error: "Don't let hips sag — keep body straight" for push-up hip alignment, "Don't 
swing your elbow — keep it tucked" for bicep curl shoulder drift. These are spoken aloud by the voice coach with a minimum interval of 2.8 seconds 
between utterances to avoid overlapping speech.

---

## Slide 8: Skeleton Visualization

The WebView draws a real-time skeleton overlay on a canvas element positioned over the camera feed. This serves as immediate visual feedback — the 
user can see which joints are tracked and which are failing.

The skeleton consists of 25 bone connections drawn as 2.5-pixel lines. Joints within acceptable form ranges are rendered in green with a cyan glow 
effect using canvas shadow properties. Joints violating their form rules are rendered in red. The actively failing joint — the one whose coaching 
cue is being shown — is rendered at a larger size (7 pixels versus 5) to draw the user's attention.

Angle labels appear as pill-shaped badges at each joint's center, showing the current angle in degrees. The label color matches the joint's status:
 green, amber, or red based on the same thresholds used for the overall form score color.

---

## Slide 9: WebView-to-React Native Communication Protocol

The bridge uses a JSON message protocol with a `type` field for routing. The key message types are:

`AI_READY` signals that MediaPipe has initialized and the camera feed is active. React Native responds by injecting the exercise configuration and 
enabling the rep counter.

`CALIBRATED` signals the user has held the start position for 2 seconds. The HUD updates to show active tracking state.

`cue` carries the current coaching text and form score percentage. React Native updates the on-screen cue display and optionally speaks it through 
the voice system.

`REP_COUNTED` carries the new rep count. React Native triggers a haptic pulse, animates the rep counter, and queues a voice encouragement phrase.

`SYNC_STATUS` signals whether the user's posture was correct when entering the down phase of a rep. This feeds a rhythm consistency indicator on 
the HUD.

`SESSION_COMPLETE` carries the final rep count, average form score, and exercise key. React Native uses this to persist the session.

`POSTURE_SCORE` is specific to posture scan mode — it carries the averaged score across 60 frames and a verdict string.

---

## Slide 10: Persistence and Downstream Effects

When a session completes, the React Native layer executes a sequence of database operations:

First, it inserts a row into `workout_sessions` with the user ID, timestamps, calories burned (estimated as reps multiplied by 5), and a notes 
string summarizing the exercise, rep count, and form score.

Second, it upserts the `daily_activity` row for today, adding the session's calories to the running total.

Third, it calls a Supabase RPC function `award_xp` to grant 50 experience points for the workout, and a second RPC `check_achievements` to 
evaluate whether any achievement thresholds have been crossed.

Fourth, it updates the `muscle_fatigue` table. Each exercise maps to a set of muscle groups with fatigue increments — for example, a squat adds 
25% fatigue to quads, 25% to glutes, and 25% to hamstrings. The system reads the current fatigue for each muscle, adds the increment capped at 
100%, and upserts with a fresh `last_updated` timestamp. On subsequent reads, a decay function reduces fatigue by approximately 2% per hour since 
the last update, modeling natural recovery.

Finally, it emits a `WORKOUT_COMPLETED` event through the application's event bus. The Training screen listens for this event and reloads its 
data — the "Today's Exercises" section, the muscle fatigue heatmap, the streak counter, and the daily blueprint recommendation all update to 
reflect the completed session.

---

## Slide 11: Posture Scan Mode

The posture scan is a distinct mode that reuses the same pipeline but with a different goal. Instead of counting reps, it assesses static body 
alignment.

The posture configuration tracks five angles: shoulder tilt, hip tilt, left and right spine alignment, and neck forward angle. The system collects 
the form score for 60 consecutive frames — approximately 2 seconds at 30 frames per second — and averages them. This averaging is important because
 even when standing still, landmark positions fluctuate slightly frame to frame.

The final score maps to a three-tier verdict: scores at or above 85% are rated excellent, scores between 65% and 84% are rated good with a specific
improvement suggestion, and scores below 65% indicate the posture needs attention with a targeted correction cue. The verdict is both displayed 
on screen and spoken by the voice coach.

---

## Slide 12: Limitations and Future Work

There are several known limitations worth acknowledging.

MediaPipe Pose operates in 2D — it estimates x and y positions reliably but the z-depth estimate is less accurate. This means exercises with 
significant depth movement, like a forward lunge, may have less precise angle calculations than lateral movements like a squat viewed from the side.

The system currently requires a front-facing camera setup. Exercises performed perpendicular to the camera — like a lateral raise — would need 
a different landmark configuration than what we currently define.

The form rules are based on general biomechanical guidelines. They don't account for individual body proportions — a person with longer femurs 
will naturally have a different hip angle at the bottom of a squat than someone with shorter femurs.

For future work, we are considering adaptive thresholds that learn a user's movement range over multiple sessions, and potentially migrating to 
MediaPipe's newer Pose Landmarker API, which offers improved 3D estimation and runs with a WASM/GPU backend that could improve frame rates on 

lower-end devices.

---

*End of presentation script.*
