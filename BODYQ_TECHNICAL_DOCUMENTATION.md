# BodyQ — Complete Technical Documentation

> **Purpose:** This document is a full technical reference for the BodyQ mobile application.  
> It covers every layer of the project: folder structure, screens, components, hooks, services,  
> database, navigation, AI systems, and the Alexi Voice Assistant in complete detail.  
> Intended audience: developers joining the project or reviewing the codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Repository Structure](#3-repository-structure)
4. [Navigation System](#4-navigation-system)
5. [Authentication & Onboarding](#5-authentication--onboarding)
6. [Database Schema (Supabase)](#6-database-schema-supabase)
7. [Screens — Complete Reference](#7-screens--complete-reference)
8. [Components — Complete Reference](#8-components--complete-reference)
9. [Hooks — Complete Reference](#9-hooks--complete-reference)
10. [Services — Complete Reference](#10-services--complete-reference)
11. [Supabase Edge Functions](#11-supabase-edge-functions)
12. [AI Systems Overview](#12-ai-systems-overview)
13. [Alexi Voice Assistant — Deep Dive](#13-alexi-voice-assistant--deep-dive)
14. [Yara AI Companion](#14-yara-ai-companion)
15. [Data Flows — End to End](#15-data-flows--end-to-end)
16. [Key Design Patterns](#16-key-design-patterns)

---

## 1. Project Overview

**BodyQ** is a comprehensive AI-powered fitness mobile application built with Expo / React Native.

### What it does

| Feature | Description |
|---|---|
| Workout tracking | Log sets, reps, exercises; live rep counter with posture feedback |
| Nutrition logging | Food scanner (barcode + photo), macro breakdown, daily targets |
| Sleep & water | Quick-log from Home; streak tracking |
| Step counting | Live pedometer via device sensors (syncs every 5 steps) |
| Posture correction | AI posture score via camera, weekly history |
| AI Insights | 4 personalized insight cards (Yara personality AI) per period |
| Onboarding plan | 30-question form → AI-generated weekly training plan |
| **Alexi Voice AI** | Always-listening Siri-style assistant; wake word, navigation, data logging, TTS |

### Application identity

```
App name:      BodyQ
Version:       1.0.0
Bundle ID:     com.bodyq.app
Platform:      iOS + Android (Expo managed workflow)
Supabase URL:  https://pxupvxhjrpemthzntrwe.supabase.co
```

---

## 2. Tech Stack & Dependencies

### Core framework

| Library | Version | Role |
|---|---|---|
| React Native | 0.81.5 | UI framework |
| Expo | ~54.0.33 | Managed workflow, build tools |
| React | 19.1.0 | Component model |

### Navigation

| Library | Role |
|---|---|
| `@react-navigation/native` | Core navigation primitives |
| `@react-navigation/stack` | Stack screens (auth, onboarding, sub-screens) |
| `@react-navigation/bottom-tabs` | Main tab bar |

### Backend / Database

| Library | Role |
|---|---|
| `@supabase/supabase-js` 2.95.3 | Database, auth, edge function calls |

### AI & Voice

| Library | Role |
|---|---|
| `expo-av` | Audio recording (mic input for Alexi) |
| `expo-speech` | Text-to-speech output (Alexi's voice) |
| `@react-native-voice/voice` 3.2.4 | Additional voice recognition (legacy fallback) |
| Groq API | LLM inference (llama-3.3-70b-versatile, llama-3.1-8b-instant) |
| OpenAI Whisper-1 | Speech-to-text (primary STT for Alexi) |
| Groq whisper-large-v3-turbo | Speech-to-text (fallback STT) |

### Animations

| Library | Role |
|---|---|
| `react-native-reanimated` | Siri orb rings, shared values, worklets |
| `react-native` Animated API | Legacy pulse, border flash, glow fade |

### UI & Styling

| Library | Role |
|---|---|
| `expo-linear-gradient` | Card gradients, backgrounds |
| `@expo/vector-icons` (Ionicons) | Icon set throughout the app |
| `@rneui/themed` | Base UI components |
| `expo-haptics` | Haptic feedback on wake word, interactions |
| `lucide-react-native` | Additional icon set |
| `@expo-google-fonts/outfit` | Primary typeface |
| `@expo-google-fonts/inter` | Secondary typeface |

### Camera & Sensors

| Library | Role |
|---|---|
| `expo-camera` | Barcode scanning, posture AI |
| `expo-sensors` | Pedometer (step counting) |

### Storage & Files

| Library | Role |
|---|---|
| `@react-native-async-storage/async-storage` | Persisting mute state, tour flags |
| `expo-file-system` (legacy) | Read recorded audio as base64 for upload |
| `expo-asset` | Asset loading |

### Forms & Validation

| Library | Role |
|---|---|
| `react-hook-form` 7.71.1 | Auth forms (sign-in, sign-up) |

---

## 3. Repository Structure

```
bodyQ/
├── App.js                          ← Root entry point (flat navigation)
├── app.json                        ← Expo config (permissions, bundle IDs)
├── index.js                        ← registerRootComponent
├── babel.config.js
├── tsconfig.json
│
├── mobile-frontend/                ← MAIN APPLICATION CODE
│   ├── screens/                    ← 17 screen files
│   ├── components/                 ← 30+ component files
│   ├── context/                    ← Global state providers
│   ├── hooks/                      ← 20 custom hooks
│   ├── services/                   ← 14 service modules
│   ├── lib/                        ← Supabase client, Groq API, nav ref
│   ├── config/                     ← Re-exports from lib/
│   ├── constants/                  ← Theme colors, onboarding data, tour steps
│   ├── data/                       ← Local JSON fixtures (exercises, mocks)
│   ├── auth/                       ← SignIn.js, SignUp.js
│   └── assets/                     ← Images (yara_spirit.png, logo, etc.)
│
├── supabase/
│   ├── functions/
│   │   ├── ai-assistant/           ← STT + LLM voice AI edge function
│   │   ├── generate-user-insights/ ← Discovery cards generator
│   │   ├── onboarding-plan/        ← Personalized training plan generator
│   │   ├── yara-insights/          ← Yara personality insights
│   │   └── _shared/cors.ts         ← CORS headers shared across functions
│   ├── migrations/                 ← 4 SQL migration files
│   └── config.toml
│
├── backend/                        ← Legacy Express/MongoDB (not actively used)
│   ├── index.js
│   ├── Configuration/connectDB.js
│   ├── Controllers/userController.js
│   ├── Models/User.js
│   └── Routes/userRoute.js
│
└── frontend/                       ← Separate Next.js web app (not mobile)
```

---

## 4. Navigation System

### Architecture

BodyQ uses a **flat, manual navigation pattern** — NOT React Navigation's stack/tab navigator hierarchy at the App.js level. Instead, `App.js` maintains two state variables:

```js
const [activeTab, setActiveTab]   = useState('Home');   // current main tab
const [subScreen, setSubScreen]   = useState(null);     // { screen, props } or null
```

This is a deliberate choice to avoid navigator nesting complexity. Navigation is done by calling:

```js
const navigate = (screen, props = {}) => setSubScreen({ screen, props });
const goBack   = () => setSubScreen(null);
```

These functions are passed as props to every screen component.

### Tab Navigation (NavBar)

The bottom tab bar (`components/NavBar.js`) shows 5 tabs:

| Tab Label | Screen Key | Component |
|---|---|---|
| Home | `'Home'` | `screens/Home.js` |
| Fuel | `'Nutrition'` | `screens/Nutrition.js` |
| Posture | `'PostureAI'` | `screens/PostureAI.js` |
| Train | `'Training'` | `screens/Training.js` |
| Insights | `'Insights'` | `screens/Insights.js` |

> Note: **Profile** is not a tab — it is accessed via sub-screen navigation (e.g., tap profile icon on Home or via Alexi).

### Sub-Screen Navigation

When `subScreen` is not null, the main tab content is replaced by the sub-screen:

| Screen Key | Component | Props |
|---|---|---|
| `'WorkoutActive'` | `screens/workout/WorkoutActive.js` | `{ workout }` |
| `'WorkoutSummary'` | `screens/workout/WorkoutSummary.js` | `{ result, workoutName, workout }` |
| `'MealLogger'` | `screens/nutrition/MealLogger.js` | `{ mealSlot, onSaved }` |
| `'SleepLog'` | `screens/sleep/SleepLog.js` | none |
| `'FoodScanner'` | `components/FoodScanner/FoodScannerScreen.js` | calorie/macro goals, `onLogged`, `onClose` |

### Onboarding Gate

Before the main app renders, `App.js` checks `onboarded` state:

```
App starts
    │
    ├─ onboarded === false  →  <OnboardingGoal onComplete={...} />
    │
    └─ onboarded === true   →  Main app (tabs + NavBar + YaraAssistant + AppTour)
```

### AlexiEvents Navigation

Alexi voice commands bypass the navigation props entirely via the `AlexiEvents` pub/sub bus. Each main screen subscribes to `AlexiEvents.on('navigate', ...)` and calls the parent `navigate()` or `setActiveTab()` accordingly (handled in the navigation listener setup inside screens or via a global listener in App.js).

---

## 5. Authentication & Onboarding

### Auth Provider (`context/AuthContext.js`)

The `AuthProvider` wraps the entire app and manages:

| State | Type | Description |
|---|---|---|
| `user` | Supabase User | Currently signed-in user object |
| `isNewUser` | boolean | True if just registered |
| `loading` | boolean | Auth resolution in progress |
| `shouldShowTour` | boolean | Whether to launch app tour |

Key methods:
- `markOnboardingComplete()` — sets `profiles.onboarded = true` in Supabase
- `signOut()` — calls `supabase.auth.signOut()`

Auth state is watched via `supabase.auth.onAuthStateChange()`. On every state change, the provider checks `profiles.onboarded` and updates `isNewUser`.

### Sign In / Sign Up (`auth/SignIn.js`, `auth/SignUp.js`)

Both screens use `react-hook-form`. Fields are validated client-side before calling `authService`.

```
SignUp flow:
  1. User fills: full_name, email, password, confirmPassword
  2. authService.signUp(email, password, fullName)
     → supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  3. Supabase creates auth user + triggers profile row creation (via DB trigger)
  4. AuthContext detects new user → sets isNewUser = true
  5. App renders OnboardingGoal

SignIn flow:
  1. User fills: email, password
  2. authService.signIn(email, password)
     → supabase.auth.signInWithPassword({ email, password })
  3. Session stored by Supabase JS client (AsyncStorage)
  4. App renders main tabs
```

### 7-Step Onboarding (`screens/onboarding/OnboardingGoal.js`)

The onboarding is a multi-step wizard managed by `useOnboarding` hook:

| Step | Screen | Data Collected |
|---|---|---|
| 1 | Goal selection | `goal` (lose_fat, build_muscle, general_health, etc.) |
| 2 | Body info | `height_cm`, `weight_kg`, `age`, `gender` |
| 3 | Experience | `experience` (beginner, intermediate, advanced) |
| 4 | Schedule | `days_per_week`, `session_duration`, `preferred_time` |
| 5 | Equipment | `equipment` (gym, home, bodyweight, none) |
| 6 | Lifestyle | `diet_pref`, `injuries`, `stress_level`, `sleep_quality` |
| 7 | AI Plan | AI generates and displays personalized training plan |

At step 7, the app calls:
```js
supabase.functions.invoke('onboarding-plan', { body: { ...allAnswers } })
```
The edge function calls Groq LLM to produce a structured weekly plan returned as JSON.  
This plan is saved to `ai_plans`, `plan_days`, `plan_exercises` tables.

After completion, `AuthContext.markOnboardingComplete()` sets `profiles.onboarded = true`.

---

## 6. Database Schema (Supabase)

All data lives in a PostgreSQL database managed by Supabase.

### Core Tables

#### `profiles`
| Column | Type | Description |
|---|---|---|
| `id` | uuid (FK auth.users) | Primary key |
| `full_name` | text | User's full name |
| `first_name` | text | First name extracted or set |
| `goal` | text | Fitness goal |
| `activity_level` | text | Sedentary / light / moderate / active |
| `height_cm` | numeric | Height |
| `weight_kg` | numeric | Current weight |
| `gender` | text | male / female / other |
| `assistant_tone` | text | motivational / calm / strict |
| `experience` | text | beginner / intermediate / advanced |
| `equipment` | text | gym / home / bodyweight |
| `diet_pref` | text | standard / vegetarian / vegan etc. |
| `sleep_quality` | text | poor / fair / good |
| `stress_level` | text | low / medium / high |
| `daily_calorie_target` | int | Calculated from TDEE |
| `protein_target` | int | Grams |
| `carbs_target` | int | Grams |
| `fat_target` | int | Grams |
| `onboarded` | boolean | Gate for main app access |
| `xp_current` | int | Gamification XP total |

#### `daily_activity`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid (FK profiles) | Owner |
| `date` | date | Log date (YYYY-MM-DD) |
| `steps` | int | Step count |
| `water_ml` | int | Water consumed (mL) |
| `sleep_hours` | numeric | Hours slept |
| `calories_burned` | int | Active calories |

#### `food_logs`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `food_id` | uuid (FK foods) | Linked food entry |
| `consumed_at` | timestamptz | Exact timestamp |
| `meal_type` | text | breakfast / lunch / dinner / snack |
| `quantity_grams` | numeric | Grams consumed (100g = 1 serving in AI logs) |

#### `foods`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Food name |
| `calories_per_100g` | numeric | Energy |
| `protein_per_100g` | numeric | Protein grams |
| `carbs_per_100g` | numeric | Carbohydrate grams |
| `fat_per_100g` | numeric | Fat grams |
| `source` | text | `'alexi_voice'`, `'scanner'`, `'manual'` |

#### `workout_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `started_at` | timestamptz | Session start |
| `ended_at` | timestamptz | Session end |
| `calories_burned` | int | Estimated burn |
| `exercise_count` | int | Number of exercises |
| `avg_posture_score` | numeric | Average posture rating 0-100 |
| `notes` | text | Free text / exercise name |
| `source` | text | `'alexi_voice'`, `'manual'`, etc. |

#### `workout_exercises`
| Column | Type | Description |
|---|---|---|
| `workout_session_id` | uuid | FK to workout_sessions |
| `exercise_name` | text | Exercise name |
| `sets` | int | Number of sets |
| `reps` | int | Reps per set |
| `weight_kg` | numeric | Weight used |
| `duration_seconds` | int | For timed exercises |

#### `body_metrics`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `weight_kg` | numeric | Body weight |
| `body_fat_pct` | numeric | Body fat % |
| `logged_at` | timestamptz | Timestamp |

#### `ai_insights`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `insight_type` | text | nutrition / workout / recovery / habit / general |
| `message` | text | Insight text (AI response or spoken reply) |
| `source` | text | `'alexi'`, `'yara'`, `'groq'` |
| `is_read` | boolean | Whether user has seen it |
| `created_at` | timestamptz | Creation timestamp |

#### `xp_log`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `source` | text | `'workout'`, `'food_log'`, etc. |
| `amount` | int | XP earned |
| `earned_at` | timestamptz | Timestamp |

### Key RPCs (Stored Procedures)

| Function Name | Parameters | Returns |
|---|---|---|
| `get_daily_dashboard_v5` | `p_user_id` | Daily stats: steps, water, sleep, calories |
| `get_insights_data` | `p_user_id`, `p_period` | Chart data, streak, heatmap |
| `get_user_full_activity_summary` | `p_user_id` | 30-day activity averages |
| `get_user_nutrition_summary` | `p_user_id` | 30-day macro averages |
| `get_user_workout_summary` | `p_user_id` | Recent workouts list |
| `get_user_body_metrics_history` | `p_user_id` | Weight/fat% history |
| `get_user_ai_history` | `p_user_id` | Recent AI coaching history |
| `increment_xp` | `p_user_id`, `p_amount` | Updates profiles.xp_current |

---

## 7. Screens — Complete Reference

### `screens/Home.js`

**Purpose:** Main dashboard — daily overview  
**Hook:** `useDashboard`, `useShakySteps`  
**Components used:** `WaterTracker`, `CalorieRingHero`, bento layout  
**Navigation output:** `navigate('MealLogger')`, `navigate('SleepLog')`, `navigate('FoodScanner')`

Key UI sections:
- Greeting + XP badge
- `CalorieRingHero` — large animated ring showing calories consumed vs. target
- `WaterTracker` — interactive cups (tap to log 250ml)
- Step count card (live from `useShakySteps`)
- Sleep card
- Muscle fatigue heatmap (7 muscle groups, color-coded)
- Yara AI insight card (from `yaraInsight` in useDashboard)

AlexiEvents subscription:
```js
AlexiEvents.on('dataUpdated', () => refresh())
```
This means whenever Alexi logs water, food, or weight, Home instantly refreshes.

---

### `screens/Nutrition.js` (shown as "Fuel" in tab bar)

**Purpose:** Daily nutrition tracking  
**Hook:** `useNutrition`, `useProfile`  
**Components used:** `RingProgress`, `MacroBar`, `MacroPill`  
**Navigation output:** `navigate('MealLogger', { mealSlot })`, `navigate('FoodScanner')`

Key UI sections:
- Macro ring: calories remaining
- Macro pills: protein / carbs / fat progress bars
- Meal sections: Breakfast, Lunch, Dinner, Snack (each expandable, add button)
- AI-generated meal plan card (Groq, loaded once and cached)

AlexiEvents subscription:
```js
AlexiEvents.on('dataUpdated', () => refresh())
```

---

### `screens/Training.js`

**Purpose:** Exercise library + workout history  
**Hook:** `useWorkout`  
**Components used:** `ExerciseCard`  
**Navigation output:** `navigate('WorkoutActive', { workout })`

Key UI sections:
- Muscle fatigue map (visual body diagram, color = recovery state)
- Recent workouts list (date, duration, calories, exercise count)
- Exercise library (searchable, filterable by muscle group)
- Each exercise card has: name, muscle group, personal best badge

---

### `screens/Insights.js`

**Purpose:** Advanced analytics  
**Hook:** `useInsights(period)`, `generateAndCacheInsights`  
**Period selector:** Week / Month / 3 Months

Key UI sections:
- Period toggle tabs
- Trend chart (calories or steps over time)
- Activity heatmap (calendar grid, color intensity = activity level)
- Streak tracker
- Muscle fatigue history
- Nutrition summary (avg cal/protein/carbs/fat)
- Workout summary (count, total duration)
- 4 AI insight discovery cards (loading spinner then animated reveal)

AlexiEvents subscription:
```js
AlexiEvents.on('dataUpdated', () => refresh())
```

---

### `screens/Profile.js`

**Purpose:** User settings and profile editor  
**Hook:** `useProfile`

Key UI sections:
- Avatar + name + goal badge
- Editable fields: height, weight, goal, activity level, targets
- Theme toggle (dark/light)
- "Replay Tour" button
- Sign out

---

### `screens/PostureAI.js`

**Purpose:** Posture correction tracking  
**Hook:** custom posture hook

Key UI sections:
- Posture score ring (0-100)
- Weekly history chart
- Camera feed (live posture analysis)

---

### `screens/ExerciseList.js`

**Purpose:** Full exercise library browser  
**Service:** `exerciseService.ts` (GitHub exercise DB + local JSON fallback)

Key UI sections:
- Search bar
- Filter by muscle group / equipment
- Exercise cards with name, muscles, personal best badge
- Tap → `ExerciseInfo.js`

---

### `screens/ExerciseInfo.js`

**Purpose:** Individual exercise detail  
Key UI sections:
- Exercise image (GitHub CDN)
- Instructions (step by step)
- Muscle groups worked
- Variations list
- "Start" button → navigates to WorkoutActive

---

### `screens/nutrition/MealLogger.js`

**Purpose:** Add food items to a specific meal slot  
Key features:
- Food search (Supabase food table + external API)
- Barcode scan shortcut → FoodScannerScreen
- Quantity adjustment
- Save logs to `food_logs`

---

### `screens/workout/WorkoutActive.js`

**Purpose:** Live workout session screen  
Key features:
- Exercise name + current set/rep
- Rep counter (animated)
- Timer
- Yara AI breathing tip overlay
- Posture score live update
- "Finish" → saves to `workout_sessions` + `workout_exercises`, awards XP

---

### `screens/workout/WorkoutSummary.js`

**Purpose:** Post-workout recap  
Key features:
- Total duration, calories burned, exercises completed
- Average posture score
- XP earned badge
- "Go Again" + "Home" buttons

---

### `screens/sleep/SleepLog.js`

**Purpose:** Log sleep hours and quality  
Key features:
- Slider for hours (0-12)
- Quality selector (poor / fair / good)
- Saves to `daily_activity.sleep_hours`

---

### `screens/onboarding/OnboardingGoal.js`

**Purpose:** Multi-step onboarding wizard entry point  
Managed by `useOnboarding` hook. Renders 7 different sub-screens sequentially.  
Progress bar shown at top.

---

## 8. Components — Complete Reference

### `components/NavBar.js`

Bottom tab bar. 5 tabs: Home, Fuel, Posture, Train, Insights.  
Receives `activeTab` and `onTabPress` props from App.js.  
Uses `Ionicons` for icons, `LinearGradient` for background.

---

### `components/AlexiAssistant.js`

**Important:** This is a thin wrapper / alternate entry point for Alexi.  
The main Alexi UI is `AlexiCompanion` exported from `AlexiVoiceContext.js`.  
`AlexiAssistant` may be an older component — the canonical floating mascot is `AlexiCompanion`.

---

### `components/AppTour.js`

Interactive onboarding tour overlay.  
Uses highlight refs from `tourRefs.js` to spotlight UI elements.  
State managed by `useAppTour` hook.  
Triggered on first launch or via Profile → "Replay Tour".

---

### `components/home/WaterTracker.js`

Interactive water cup component on Home screen.  
Tap a cup → logs 250ml via `useDashboard.logWater()`.  
Animated fill effect.

---

### `components/home/CalorieRingHero.js`

Large animated circular progress ring showing `caloriesConsumed / calorieTarget`.  
Color changes: green (on track), yellow (near limit), red (over).

---

### `components/shared/RingProgress.js`

Reusable circular progress ring.  
Props: `value`, `max`, `color`, `size`, `label`.  
Used in Nutrition screen for macros.

---

### `components/shared/MacroBar.js`

Horizontal bar showing macro breakdown.  
Props: `protein`, `carbs`, `fat`, `calories`.  
Used in Nutrition and meal cards.

---

### `components/shared/StatCard.js`

Generic stats display card. Props: `title`, `value`, `unit`, `icon`, `color`.

---

### `components/shared/Shimmer.js`

Skeleton loading placeholder using animated opacity.  
Used while data is loading in Insights, Home.

---

### Food Scanner components (`components/food-scanner/`)

| Component | Role |
|---|---|
| `FoodScannerScreen.js` | Full-screen wrapper, switches between barcode and photo modes |
| `BarcodeScanner.js` | Uses `expo-camera` to scan barcodes; resolves food via API |
| `PhotoAnalyser.js` | Takes photo → sends to AI vision → returns food estimate |
| `FoodResultSheet.js` | Bottom sheet showing identified food with confirm/edit |
| `FoodDetail.js` | Detailed food nutrition view |
| `foodScannerApi.js` | Calls external food API (Open Food Facts or similar) |
| `useFoodScanner.js` | Hook managing scanner state |

---

### Onboarding components (`components/onBoarding/`)

| Component | Role |
|---|---|
| `AppTour.js` | Tour overlay |
| `FieldInput.js` | Styled text input for onboarding forms |
| `PillButton.js` | Rounded selection button |
| `SelectCard.js` | Large tap-to-select option card |
| `tourRefs.js` | Shared refs for tour spotlight positions |

---

## 9. Hooks — Complete Reference

### `useAuth.js`
Simple wrapper around `AuthContext`. Returns `{ user, isNewUser, loading, signOut, markOnboardingComplete }`.

---

### `useDashboard.js`
**Used by:** Home screen

Fetches:
- `get_daily_dashboard_v5` RPC → daily steps, water, sleep, calories
- Muscle fatigue from `workoutService.getMuscleFatigue(userId)`
- Yara insight from `yaraInsightsService`

Returns: `{ isLoading, error, user, stats, logWater, logSleep, refresh, yaraInsight, muscleFatigue }`

`logWater(amount)` → upserts to `daily_activity.water_ml`  
`logSleep(hours)` → upserts to `daily_activity.sleep_hours`

---

### `useNutrition.js`
**Used by:** Nutrition screen, MealLogger

Fetches food logs for today, aggregates per meal type.  
Returns: macro totals (calories, protein, carbs, fat) per meal + daily totals.  
`refresh()` re-fetches all food logs.

---

### `useInsights.js`
**Used by:** Insights screen

Fetches:
1. `get_insights_data` RPC → chart data, heatmap, streak, avg stats
2. `food_logs` direct → nutritionSummary
3. `workout_sessions` direct → workoutSummary
4. `getMuscleFatigue()` → muscleFatigue
5. `get_user_ai_history` RPC → aiHistory

Returns all the above + `refresh()`.

---

### `useWorkout.js`
**Used by:** Training screen

Fetches exercise library (remote GitHub + local JSON fallback).  
Fetches recent workout sessions.  
`saveWorkoutSession(data)` → inserts to `workout_sessions` + `workout_exercises`.

---

### `useProfile.js`
**Used by:** Profile screen, Nutrition (for macro targets)

Fetches `profiles` row for current user.  
`updateProfile(fields)` → partial update to `profiles`.

---

### `usePedometer.js`

Subscribes to `expo-sensors` pedometer.  
Accumulates steps since app opened.  
Every 5 new steps → syncs delta to `daily_activity.steps` in Supabase.

---

### `useShakySteps.js`
**Used by:** Home screen

Exposes live step count for display (without triggering re-renders on every sync).  
Returns `{ steps }`.

---

### `useOnboarding.ts`
**Used by:** OnboardingGoal

Manages multi-step form state (7 steps, 30+ fields).  
On final step: calls `groqAPI.generateAIPlan(answers)` via `onboarding-plan` edge function.  
Saves plan to Supabase.

---

### `useAlexiChat.ts`

Manages voice chat history with Alexi.  
Calls `ai-assistant` edge function with `messages` array for back-and-forth conversation.

---

### `useYaraChat.ts`

Similar to `useAlexiChat` but for Yara personality AI.  
Used in WorkoutActive for live workout tips.

---

### `useExercises.ts`

Fetches exercise library from GitHub free-exercise-db.  
Falls back to local `data/exercises.json` on network failure.  
Normalizes data shape.

---

### `useFoodScanner.js`

Manages food scanner state: mode (barcode/photo), results, loading.  
Calls `foodScannerApi.js`.

---

### `useAppTour.ts`

Manages whether the tour overlay should be shown.  
Uses AsyncStorage to persist "tour completed" flag.

---

## 10. Services — Complete Reference

### `lib/supabase.js`
**Canonical Supabase client.**

```js
const supabaseUrl  = 'https://pxupvxhjrpemthzntrwe.supabase.co'
const supabaseKey  = '<anon key>'
export const supabase = createClient(supabaseUrl, supabaseKey, { ... })
```

Also exports:
- `invokeEdgePublic(fnName, body)` — calls a Supabase edge function without auth (used for onboarding edge calls before login)

AppState listener: on app foreground, calls `supabase.auth.startAutoRefresh()`.

---

### `lib/groqAPI.ts`

Builds structured prompts for the onboarding plan generator.  
`generateAIPlan(answers)` → constructs a 1500-token prompt with user answers → calls `onboarding-plan` edge function.

---

### `lib/calculations.ts`

Pure math utilities:
- `calcBMR(weight, height, age, gender)` — Mifflin-St Jeor equation
- `calcTDEE(bmr, activityLevel)` — applies activity multiplier
- `calcCalTarget(tdee, goal)` — deficit/surplus based on goal
- `calcProtein(weight, goal)` — grams per kg
- `calcBMI(weight, height)` — standard BMI formula

---

### `services/dashboardService.js`

Single function: `getDailyDashboard(userId)` → calls `get_daily_dashboard_v5` RPC.

---

### `services/workoutService.js`

- `saveWorkoutSession(session)` → inserts to `workout_sessions`
- `saveWorkoutExercises(exercises)` → bulk inserts to `workout_exercises`
- `getMuscleFatigue(userId)` → returns per-muscle-group fatigue state (0-100%)

---

### `services/nutritionService.js`

- `getTodayLogs(userId)` → fetches today's `food_logs` joined with `foods`
- `getFoodsByQuery(query)` → searches `foods` table

---

### `services/alexiInsightsService.js`

- `generateAndCacheInsights(userId, period, rawStats)` → calls `yara-insights` edge function → saves result to `ai_insights` → returns 4 insight cards

---

### `services/profileService.ts`

- `getProfile(userId)` → fetches full profile row
- `updateProfile(userId, fields)` → partial update
- `setOnboarded(userId)` → sets `onboarded = true`
- `saveCalorieTargets(userId, tdee, goal)` → writes macro targets

---

### `services/exerciseService.ts`

- `fetchExercises()` → tries GitHub free-exercise-db, falls back to `data/exercises.json`
- Normalizes exercise shape to `{ id, name, muscles, equipment, instructions, images }`

---

### `services/authService.ts`

- `signUp(email, password, fullName)` → `supabase.auth.signUp`
- `signIn(email, password)` → `supabase.auth.signInWithPassword`

---

## 11. Supabase Edge Functions

All edge functions are Deno TypeScript, deployed at:  
`https://pxupvxhjrpemthzntrwe.supabase.co/functions/v1/<name>`

They all share `supabase/functions/_shared/cors.ts`:
```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

---

### `ai-assistant` (The Most Important Edge Function)

This function handles **three distinct responsibilities**:

#### A. Speech-to-Text (STT) — Audio transcription

**Triggered when:** `body.audioBase64` is present.

Flow:
```
Client sends: { audioBase64, mimeType, userName }
    │
    ├─ OPENAI_KEY present?
    │   YES → POST to api.openai.com/v1/audio/transcriptions (Whisper-1)
    │   NO  → POST to api.groq.com/openai/v1/audio/transcriptions (whisper-large-v3-turbo)
    │
    ├─ OpenAI fails & GROQ_KEY present? → fallback to Groq
    │
    └─ Returns: { transcript: "the transcribed text" }
```

Key Whisper parameters:
```
model:           whisper-1  (or whisper-large-v3-turbo fallback)
language:        en
response_format: json
temperature:     0          ← deterministic, prevents creative hallucinations
prompt:          "The user is Maether. Commands: Profile, Fuel, Train, Insights, Log Water, Log Food, Log Weight."
```

The `prompt` field is Whisper's vocabulary hint — it biases the model toward app-specific words. This prevents phonetic confusions (e.g., "Profile" being heard as "Video file").

---

#### B. Chat / AI Query

**Triggered when:** `body.messages` is an array (chat thread format).

```
Client sends: { messages: [{ role, content }, ...] }
    │
    └─ POST to Groq: model llama-3.1-8b-instant, max_tokens 512
       Returns: { response: "AI reply text" }
```

Used by `useAlexiChat.ts` for conversational back-and-forth.

---

#### C. Voice AI Query (Main Intelligence)

**Triggered when:** `body.query` is present (single question).

```
Client sends: { userId, query, voiceMode: true, clientContext: { profile, activity, nutrition, ... } }
    │
    ├─ Fetch profile from Supabase (merges with clientContext.profile)
    │
    ├─ classifyQuery(query) → { activity, nutrition, workout, body, history } flags
    │
    ├─ Conditionally fetch supporting data (only what's needed):
    │   • activity  → get_user_full_activity_summary RPC
    │   • nutrition → get_user_nutrition_summary RPC
    │   • workout   → get_user_workout_summary RPC
    │   • body      → get_user_body_metrics_history RPC
    │   • history   → get_user_ai_history RPC
    │
    ├─ buildPrompt() → 400-word context block:
    │   USER PROFILE / ACTIVITY SUMMARY / NUTRITION / WORKOUTS / BODY METRICS / COACHING HISTORY
    │   + VOICE MODE RULES (strict_map, COMMAND syntax)
    │
    ├─ POST to Groq: model llama-3.3-70b-versatile, max_tokens 400, temperature 0
    │
    ├─ executeVoiceCommands(aiResponse) → parses COMMAND:{...} lines:
    │   • log_water   → upserts daily_activity.water_ml
    │   • log_sleep   → upserts daily_activity.sleep_hours
    │   • log_weight  → inserts body_metrics
    │   • log_food    → upserts foods + inserts food_logs
    │   • log_workout → inserts workout_sessions + xp_log
    │   • log_metric  → inserts body_metrics (body_fat_pct)
    │   • check_status → queries daily_activity + xp_log, summarizes
    │
    ├─ Extract navigate COMMAND → navigateTo field
    │
    ├─ Strip COMMAND lines from spoken text
    │
    ├─ Insert to ai_insights table
    │
    └─ Returns: { response, navigateTo, insight_type, model, usage, executed, fallback }
```

**Voice Mode STRICT_MAP** (in system prompt):
```
profile / account / settings  → "Profile"
train / workout / exercise     → "Train"
fuel / food / nutrition        → "Fuel"
insights / stats / analytics   → "Insights"
home / dashboard               → "Home"
start workout / begin workout  → "WorkoutActive"
```

---

### `onboarding-plan`

**Triggered:** End of 7-step onboarding.  
**Input:** 30+ user answers (goal, body stats, schedule, equipment, lifestyle).  
**LLM:** Groq llama-3.3-70b-versatile  
**Output:**
```json
{
  "intro": "Welcome message",
  "nutrition_note": "Calorie/macro guidance",
  "recovery_note": "Rest day advice",
  "motivation_note": "Motivational message",
  "days": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90s" }
      ]
    }
  ]
}
```

---

### `generate-user-insights`

**Input:** `{ userId, period, rawStats }` where rawStats includes step/sleep/calorie/workout averages.  
**LLM:** Groq  
**Output:** Array of 4 insight cards:
```json
[
  { "tag": "nutrition", "title": "Protein on track", "text": "You averaged 142g protein..." },
  { "tag": "recovery", "title": "Sleep debt detected", "text": "..." },
  ...
]
```

---

### `yara-insights`

Same structure as `generate-user-insights` but uses **Yara's personality** prompt — she is warmer, more enthusiastic, and uses emotive language.

---

## 12. AI Systems Overview

BodyQ has two distinct AI personalities:

| | Alexi | Yara |
|---|---|---|
| **Role** | Voice assistant / system controller | Insights coach / motivator |
| **Interaction** | Voice (always-listening) + touch | Text cards + workout tips |
| **Model** | Whisper-1 (STT) + llama-3.3-70b (NLU) | llama-3.3-70b |
| **Edge function** | `ai-assistant` | `yara-insights`, `generate-user-insights` |
| **Primary action** | Navigate, log data, answer questions | Provide personalized insight cards |
| **Avatar** | `yara_spirit.png` mascot (animated) | Separate UI presence |
| **TTS** | Yes (`expo-speech`) | No |

---

## 13. Alexi Voice Assistant — Deep Dive

This is the most technically complex part of the codebase. All code lives in:  
**`mobile-frontend/context/AlexiVoiceContext.js`**

---

### 13.1 Architecture Philosophy

Alexi is designed as a **system controller**, not a chatbot. The priority order is:

```
1. Hard-coded keyword map (parseCommand)   ← Zero latency, no AI needed
2. Short-transcript snap table             ← Phonetic alias matching
3. AI edge function (NLU + LLM)            ← Full intelligence for complex queries
```

Navigation commands **never reach the AI** — they are resolved locally in milliseconds.

---

### 13.2 Module-Level Singleton Pattern

The recorder is a **module-level variable** (outside React), not inside a component or ref:

```js
let _rec = null;   // The ONE active Audio.Recording instance

async function stopAnyRecording() {
  const r = _rec;
  _rec = null;
  if (r) {
    try { await r.stopAndUnloadAsync(); } catch (_) {}
    await new Promise(res => setTimeout(res, 500));  // MANDATORY 500ms gap
  }
}
```

**Why module-level?**  
- Prevents "Audio hardware is busy" errors from concurrent recording attempts  
- `stopAnyRecording()` is callable from anywhere (speak(), error handlers, cleanup)  
- The 500ms gap gives iOS AVAudioSession time to fully release hardware before the next `createAsync` or `setAudioModeAsync` call

**Why NOT useRef or state?**  
- React state causes re-renders (bad for audio timing)  
- `useRef` is component-scoped (can't be accessed from module-level `stopAnyRecording`)

---

### 13.3 Audio Modes

Two audio modes are used, switching as needed:

#### RECORDING_MODE — mic open, TTS routed to earpiece
```js
const RECORDING_MODE = {
  allowsRecordingIOS:         true,
  playsInSilentModeIOS:       true,
  interruptionModeIOS:        InterruptionModeIOS.MixWithOthers,
  shouldDuckAndroid:          true,
  interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground:    true,
};
```

#### PLAYBACK_MODE — mic closed, TTS routed to speaker
```js
await Audio.setAudioModeAsync({
  allowsRecordingIOS:         false,   // ← CRITICAL: allows speaker routing
  playsInSilentModeIOS:       true,    // ← Works in Silent/Vibrate mode
  staysActiveInBackground:    true,
  interruptionModeIOS:        1,       // DoNotMix — aggressive speaker override
  shouldDuckAndroid:          true,
  interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
});
```

**Why does this matter?**  
On iOS, when `allowsRecordingIOS: true`, the audio session is in recording mode. This routes TTS output to the earpiece (as if on a phone call), not the speaker. Setting `allowsRecordingIOS: false` before `Speech.speak()` switches the session to playback mode, routing audio to the speaker — even in Silent mode (`playsInSilentModeIOS: true`).

---

### 13.4 Recording Preset

```js
const REC_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;
```

**Why the preset (not custom options)?**  
Previous versions used custom `AndroidOutputFormat` and `IOSOutputFormat` enum constants. These constants can silently produce `undefined` on certain expo-av SDK 54 builds, causing `prepareToRecordAsync` to fail immediately. When it fails in a loop, the catch block continues without delay, creating a CPU-burning tight loop that logs "[Alexi] Listening..." thousands of times per second.

`Audio.RecordingOptionsPresets.HIGH_QUALITY` is guaranteed to work on all expo-av SDK 54 builds.

---

### 13.5 The Passive Listening Loop

```
runPassiveLoop()
    │
    ├─ Request mic permission (if not granted)
    ├─ 800ms startup gap (hardware release from previous session)
    ├─ logState('listening')
    │
    └─ WHILE loop (alive() && !muted):
        │
        ├─ [1] setAudioModeAsync(RECORDING_MODE)
        │       Audio.Recording.createAsync(REC_OPTIONS)   ← atomic: prepare + start
        │       _rec = recording
        │
        ├─ [2] await 3000ms  ← FULL 3-second recording chunk
        │       if !alive() → stopAnyRecording(); break
        │
        ├─ [3] _rec = null
        │       rec.stopAndUnloadAsync()
        │       await 500ms  ← hardware release gap
        │       uri = rec.getURI()
        │
        ├─ [4] transcribeURI(uri) → Whisper via ai-assistant edge function
        │
        ├─ [5] Fuzzy snap (in-loop):
        │       if text includes 'video'/'file' or starts with 'pro' → transcript = 'Profile'
        │       if text includes 'fell' or short 'fuel' → transcript = 'Fuel'
        │
        ├─ [6] snapShortTranscript(transcript) — phonetic alias table
        │       Only for ≤3 word transcripts
        │       NAV_SNAP table: profile→Profile, fuel→Fuel, etc.
        │
        ├─ [7] Wake word check:
        │       Does transcript contain: alexi / alexie / alexey / alexy / lex?
        │
        │       NO wake word + no nav snap + mascot not visible → continue loop
        │
        │       YES (wake or nav snap):
        │           haptic feedback + flash border + show mascot
        │           logState('activated')
        │
        ├─ [8] Execute:
        │       a) Nav snap without wake word → executeCommand(snapped) immediately
        │       b) Wake word + inline command → executeCommand(commandText)
        │       c) Bare "alexi" → speak("Yes?") → 5s capture window → transcribe → executeCommand
        │
        └─ hideAlexiAfter(7000ms) → continue loop
```

#### Loop timing breakdown:

| Phase | Duration |
|---|---|
| Recording | 3000ms |
| Hardware release gap | 500ms |
| STT network call | ~300-800ms |
| Fuzzy snap + command parse | <1ms |
| **Minimum loop cycle** | ~3.8-4.3 seconds |

This timing ensures there is NO busy-spinning. Each iteration takes at minimum 3.5+ seconds.

---

### 13.6 transcribeURI()

```js
const transcribeURI = async (uri) => {
  // 1. Read audio file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

  // 2. POST to Supabase edge function (ai-assistant)
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      audioBase64:   base64,
      mimeType:      'audio/m4a',
      minConfidence: 0.4,
      userName:      userNameRef.current ?? undefined,
    },
  });

  // 3. Return the transcript string
  return (data?.transcript ?? '').trim();
};
```

The edge function receives this, calls Whisper (or Groq as fallback), and returns `{ transcript }`.

---

### 13.7 Three-Layer Fuzzy Snap

Before any command reaches `parseCommand` or the AI, the transcript goes through three layers of correction:

#### Layer 1 — In-loop pre-snap (common Whisper hallucinations)
```js
if (transcript) {
  const tl = transcript.toLowerCase();
  if (tl.includes('video') || tl.includes('file') || tl.startsWith('pro')) {
    transcript = 'Profile';
  } else if (tl.includes('fell') || (tl.includes('fuel') && tl.length < 8)) {
    transcript = 'Fuel';
  }
}
```
**Why:** Whisper frequently transcribes "Profile" as "Video file" (phonetic overlap).

#### Layer 2 — snapShortTranscript() (phonetic alias table)
```js
const NAV_SNAP = [
  { screen: 'Profile',  words: ['profile','profiles','account','settings','video','video file','for file','pro file'] },
  { screen: 'Fuel',     words: ['fuel','food','nutrition','full','few','feel','fell'] },
  { screen: 'Insights', words: ['insights','insight','inside','incite','in sites'] },
  { screen: 'Train',    words: ['train','training','workout','workouts','exercise','trim','trend'] },
  { screen: 'Home',     words: ['home','home screen','homes'] },
];
```
Only applied when the transcript is ≤3 words. Prevents false matches on longer phrases.

#### Layer 3 — parseCommand() (hard-coded keyword map)
```js
function parseCommand(text) {
  const t = text.toLowerCase().trim();

  // WorkoutActive — must be first (more specific than 'Train')
  if (/start (a |the )?workout|begin (a |my )?workout|let('?s| us) work(out| out)/.test(t))
    return { type: 'NAVIGATE', screen: 'WorkoutActive' };

  if (/\b(home|dashboard|main)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Home' };

  if (/\b(profile|account|settings|video|file)\b/.test(t) || /^pro\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Profile' };

  if (/\b(fuel|nutrition|food|meals?|eating|eat|diet|fell|macros?|calories)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Fuel' };

  if (/\b(insights?|analytics?|analysis|stats?|progress|my data)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Insights' };

  if (/\b(train|training|workout|workouts|exercise|gym|lift|work)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Train' };

  // Data logging
  if (/log (my |water)|add water|drank/.test(t))
    return { type: 'LOG_WATER', amount: parseInt(match) || 250 };

  if (/log sleep|i slept|\d+ hours? sleep/.test(t))
    return { type: 'LOG_SLEEP', hours: parseFloat(match) || 7 };

  if (/i weigh|my weight is|weigh\w+ \d/.test(t))
    return { type: 'LOG_WEIGHT', weight_kg: parseFloat(match) };

  if (/body fat|fat percentage/.test(t))
    return { type: 'LOG_METRIC', body_fat: parseFloat(match) };

  if (/log (my )?food|i ate|i had|log.*meal/.test(t))
    return { type: 'LOG_FOOD', name, calories, protein_g, carbs_g, fat_g, meal_type };

  if (/how am i doing|daily summary|check in/.test(t))
    return { type: 'CHECK_STATUS' };

  if (/stop listening|go to sleep|mute|be quiet/.test(t))
    return { type: 'MUTE' };

  // Anything else → send to AI
  return { type: 'AI_QUERY', query: text };
}
```

All navigation commands return before reaching `AI_QUERY`. The AI is only invoked for open-ended questions.

---

### 13.8 executeCommand()

This is the action executor. It handles every command type:

| Command Type | Action | Side Effects |
|---|---|---|
| `NAVIGATE` | `AlexiEvents.emit('navigate', { screen })` | Speak destination name |
| `LOG_WATER` | Upsert `daily_activity.water_ml` | `AlexiEvents.emit('dataUpdated')` + confirm chime |
| `LOG_SLEEP` | Upsert `daily_activity.sleep_hours` | `AlexiEvents.emit('dataUpdated')` |
| `LOG_WEIGHT` | Insert `body_metrics.weight_kg` | `AlexiEvents.emit('dataUpdated')` |
| `LOG_METRIC` | Insert `body_metrics.body_fat_pct` | `AlexiEvents.emit('dataUpdated')` |
| `LOG_FOOD` | Upsert `foods` + insert `food_logs` | `AlexiEvents.emit('dataUpdated')` + confirm chime |
| `CHECK_STATUS` | Query daily_activity + xp_log | Speak summary |
| `SPEAK_SUMMARY` | Same as CHECK_STATUS | Speak summary |
| `SPEAK_STEPS` | Query daily_activity.steps | Speak step count with motivational message |
| `MUTE` | `setMutedState(true)` | Speak goodbye |
| `OPEN_CHAT` | `AlexiEvents.emit('open_chat')` | Opens chat modal |
| `AI_QUERY` | Call `ai-assistant` edge function | Speak AI response, handle navigate/log commands in response |
| `SHOW_INSTRUCTIONS` | `AlexiEvents.emit('command', { type: 'SHOW_INSTRUCTIONS' })` | Speak confirmation |

For `AI_QUERY`, the edge function may itself return `COMMAND:{...}` lines in the LLM output. These are parsed by `executeVoiceCommands` in the edge function and the results returned in `executed[]`. The client receives `navigateTo` and/or `executed` in the response.

---

### 13.9 speak()

```js
const speak = (text) => new Promise(async (resolve) => {
  Speech.stop();
  await stopAnyRecording();     // Stop mic + 500ms gap

  logState('speaking');
  setResponseText(text);        // Shows in speech bubble

  // Switch to PLAYBACK mode (routes audio to speaker)
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: 1,
    ...
  });

  const done = async () => {
    await new Promise(r => setTimeout(r, 500));  // Brief pause after TTS
    await Audio.setAudioModeAsync(RECORDING_MODE);  // Restore mic mode
    logState('idle');
    resolve();
  };

  Speech.speak(text, {
    language: 'en-US', pitch: 1.0, rate: 1.0,
    onDone: done, onStopped: done, onError: () => done(),
  });
});
```

This is a Promise-based wrapper so callers can `await speak(text)` and be confident the audio session is fully restored before resuming the mic loop.

---

### 13.10 AlexiEvents (Pub/Sub Bus)

```js
export const AlexiEvents = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => {
      this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    };
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  },
};
```

This simple event bus allows Alexi to trigger actions across the entire app without prop drilling.

| Event | Emitted when | Listeners |
|---|---|---|
| `'navigate'` | Navigation command resolved | App.js / NavBar |
| `'dataUpdated'` | Water / food / weight / sleep logged | Home, Nutrition, Insights |
| `'open_chat'` | User says a complex question | Chat modal component |
| `'command'` | Any command parsed | Debug/analytics listeners |

**Magic Refresh pattern** (all three screens):
```js
useEffect(() => {
  const off = AlexiEvents.on('dataUpdated', () => refresh());
  return off;  // cleanup on unmount
}, [refresh]);
```

---

### 13.11 AlexiCompanion — Visual States

`AlexiCompanion` is the floating mascot rendered as an overlay on every screen.

```
passiveState value    Visual
─────────────────     ──────────────────────────────────────────
'idle'                Static avatar, no rings, no bubble
'muted'               Static avatar, no rings
'listening'           Subtle heartbeat ring (lime, expands+fades slowly)
'activated'           Full Siri orb (3 rotating arcs + green glow bg)
'capturing'           Full Siri orb (recording command)
'transcribing'        Full Siri orb (processing)
'speaking'            Purple glow pulse + speech bubble with responseText
'paused'              Static avatar
'error'               Static avatar
```

#### State → Animation values

**listening state:**
```js
listenOp.value = withRepeat(withSequence(
  withTiming(0.22, { duration: 1400 }),  // fade in
  withTiming(0.00, { duration: 1400 }),  // fade out
), -1, false);

listenSc.value = withRepeat(withSequence(
  withTiming(1.55, { duration: 1400 }),  // expand
  withTiming(1.00, { duration: 1400 }),  // contract
), -1, false);
```
Result: single lime ring that breathes slowly. Very subtle — shows mic is alive without distraction.

**activated/capturing/transcribing (Siri Orb):**
```js
// Ring 1: neon green (#39FF14), tightest, fastest clockwise
rot1.value = withRepeat(withTiming(360,  { duration: 2400, easing: Easing.linear }), -1, false);

// Ring 2: cyan (#00E5FF), medium, counter-clockwise
rot2.value = withRepeat(withTiming(-360, { duration: 3800, easing: Easing.linear }), -1, false);

// Ring 3: lime (#C6FF33), outermost, slowest clockwise
rot3.value = withRepeat(withTiming(360,  { duration: 6000, easing: Easing.linear }), -1, false);

// Staggered breathing — wave effect across all 3 rings
sc1.value = withRepeat(withSequence(withTiming(1.09, 700), withTiming(1.00, 700)), -1, false);
sc2.value = withDelay(233, withRepeat(...));  // 233ms offset
sc3.value = withDelay(466, withRepeat(...));  // 466ms offset

// Background green glow pulses
glowBgOp.value = withRepeat(withSequence(
  withTiming(0.28, 1200), withTiming(0.08, 1200)
), -1, false);
```

**Why asymmetric border widths on arcs?**  
A standard `borderWidth` on a perfect circle (equal all sides) produces no visible difference when rotated — the circle looks identical at any rotation. By using asymmetric widths (e.g., `borderTopWidth: 2.5, borderBottomWidth: 0`), the arc becomes a visible segment that sweeps as it rotates.

**Arc style definitions:**
```js
arc1: {
  width: AV * 1.12, height: AV * 1.12,           // 71.7px
  borderTopWidth: 2.5, borderRightWidth: 2.5,     // visible quadrant
  borderBottomWidth: 0, borderLeftWidth: 0.5,     // faded tail
  borderTopColor: '#39FF14', borderRightColor: '#39FF14',
  shadowColor: '#39FF14', shadowOpacity: 0.85, shadowRadius: 8,
},
arc2: {
  width: AV * 1.42, height: AV * 1.42,           // 90.9px
  borderTopWidth: 1.5, borderBottomWidth: 1.5,
  borderRightWidth: 0, borderLeftWidth: 0.5,
  borderTopColor: '#00E5FF', borderBottomColor: '#00E5FF',
  shadowColor: '#00E5FF', shadowOpacity: 0.7, shadowRadius: 10,
},
arc3: {
  width: AV * 1.78, height: AV * 1.78,           // 113.9px
  borderTopWidth: 1, borderRightWidth: 1,
  borderBottomWidth: 0, borderLeftWidth: 0.3,
  borderTopColor: '#C6FF33', borderRightColor: '#C6FF33',
  shadowColor: '#C6FF33', shadowOpacity: 0.6, shadowRadius: 14,
},
```

**speaking state:**
```js
speakOp.value = withRepeat(withSequence(
  withTiming(0.80, 500), withTiming(0.22, 500)
), -1, false);
speakSc.value = withRepeat(withSequence(
  withTiming(1.50, 500), withTiming(1.10, 500)
), -1, false);
```
Result: pulsing purple glow ring + speech bubble with the spoken text.

---

### 13.12 Other Exported Components from AlexiVoiceContext.js

| Component | Description |
|---|---|
| `AlexiScreenBorder` | Full-screen border flash (lime) on wake word — rendered as absolute overlay |
| `AlexiSiriGlow` | 4px lime bar at screen bottom, pulses when Alexi is visible |
| `AlexiEarDot` | 8px colored dot top-right of screen; tap → manual wake; color = passiveState |
| `AlexiVoiceOrb` | Small circular mic button (bottom-left); tap to unmute/restart |
| `AlexiDebugOverlay` | Developer overlay showing passiveState, last transcript, debugLog (off by default: `DEBUG_OVERLAY = false`) |

---

### 13.13 Context Value (what screens receive)

```js
const value = {
  passiveState,      // 'idle'|'listening'|'activated'|'capturing'|'transcribing'|'speaking'|'paused'|'muted'|'error'|'no_permission'
  isMuted,           // boolean
  permGranted,       // boolean
  lastTranscript,    // string — last thing Whisper heard
  responseText,      // string — last thing Alexi said
  debugLog,          // string — developer status string
  isAlexiVisible,    // boolean — mascot shown?
  pulseAnim,         // Animated.Value (legacy)
  borderAnim,        // Animated.Value (border flash)
  borderScale,       // Animated.Value
  siriGlow,          // Animated.Value (bottom glow)
  earDotScale,       // Animated.Value
  flashBorder,       // () => void
  showAlexi,         // () => void
  hideAlexi,         // () => void
  hideAlexiAfter,    // (ms?) => void
  startPassive,      // () => Promise<void>
  stopPassive,       // () => Promise<void>
  pausePassive,      // () => Promise<void>
  resumePassive,     // () => void
  setMutedState,     // (bool) => Promise<void>
  executeCommand,    // (text) => Promise<void>
  talkToAlexi,       // () => Promise<void> — press-to-talk
};
```

---

### 13.14 Press-to-Talk (talkToAlexi)

Called by `AlexiAssistant` or any component on long-press:

```
talkToAlexi()
    │
    ├─ Kill passive loop (increment loopGenRef)
    ├─ stopAnyRecording()
    ├─ showAlexi()
    ├─ speak("I'm listening…")  ← announces readiness
    │
    ├─ Set RECORDING_MODE
    ├─ createAsync(REC_OPTIONS)
    ├─ await 5000ms  (CMD_LISTEN_MS — full 5 second window)
    │
    ├─ stopAndUnloadAsync() + 500ms gap
    ├─ transcribeURI(uri)
    ├─ snapShortTranscript + execute
    │
    ├─ hideAlexiAfter(7000)
    └─ Restart passive loop
```

---

### 13.15 Auto-Start & Lifecycle

**Auto-start on mount:**
```js
useEffect(() => {
  const t = setTimeout(async () => {
    if (mutedRef.current) return;
    // Check if user is onboarded (don't listen during onboarding)
    const profile = await supabase.from('profiles')...
    if (profile?.onboarded !== true) return;
    startPassive();
  }, 1500);  // 1.5s delay gives app time to settle
  ...
}, []);
```

**AppState handling:**
```js
AppState.addEventListener('change', async (nextState) => {
  // App backgrounded → pause (stop recording but don't destroy loop)
  if (wasActive && !isActive) pausePassive();
  // App foregrounded → resume
  if (!wasActive && isActive) resumePassive();
});
```

**Onboarding gate:**
```js
// Every 30 seconds, verify user is still onboarded
// If not (e.g., profile deleted), stops passive loop
setInterval(check, 30000);
```

---

## 14. Yara AI Companion

Yara is the secondary AI — a motivational coach that generates insight cards.

**Files involved:**
- `services/yaraInsightsService.js` — calls `yara-insights` edge function
- `services/alexiInsightsService.js` — calls `generate-user-insights` edge function
- `supabase/functions/yara-insights/index.ts` — Groq + Yara personality prompt
- `supabase/functions/generate-user-insights/index.ts` — more data-analytical insights

**Yara on Home:**  
`useDashboard` fetches one Yara insight to show as a "daily tip" card.

**Yara on Insights:**  
`generateAndCacheInsights()` generates 4 insight cards for the current period:
- Checks if recent insights exist in `ai_insights` (cache check)
- If not, calls the edge function with `rawStats`
- Saves results to `ai_insights`
- Returns 4 cards with tags: nutrition / workout / recovery / habit / general

**Yara in WorkoutActive:**  
`useYaraChat` provides real-time motivational messages during a workout session.

---

## 15. Data Flows — End to End

### Voice Command: "Alexi, log 500ml water"

```
1. Passive loop records 3s chunk
2. Sends audio to ai-assistant edge function (Whisper)
3. Whisper returns: "Alexi log 500 milliliters water"
4. Fuzzy snap: no snap needed (clear text)
5. hasWake: true ("alexi" found)
6. commandText: "log 500 milliliters water"
7. parseCommand("log 500 milliliters water")
   → { type: 'LOG_WATER', amount: 500 }
8. executeCommand({ type: 'LOG_WATER', amount: 500 })
9. supabase: upsert daily_activity.water_ml += 500
10. AlexiEvents.emit('dataUpdated')
    → Home.refresh(), Nutrition.refresh(), Insights.refresh()
11. playConfirmSound()
12. speak("Logged 500 millilitres of water for you, Maether! That's 750 millilitres total today. Keep it up!")
```

**Total latency:** ~1.5-2.5 seconds from silence to spoken confirmation.

---

### Voice Command: "Profile" (navigation)

```
1. Passive loop records 3s chunk
2. Whisper returns: "Video file"  ← phonetic hallucination
3. Layer 1 fuzzy snap: includes 'video' → transcript = 'Profile'
4. hasWake: false. isNavSnap: true (snapShortTranscript matches)
5. executeCommand('profile')
   → parseCommand: NAVIGATE, screen: 'Profile'
   → speak("Opening your profile.")
   → AlexiEvents.emit('navigate', { screen: 'Profile' })
6. Navigation listener in App.js:
   → setActiveTab('Profile')
```

**Total latency:** ~0.5s (only Whisper STT needed, no LLM).

---

### Nutrition Logging Flow (Manual)

```
1. User taps "+" on Breakfast row in Nutrition.js
2. navigate('MealLogger', { mealSlot: 'breakfast' })
3. MealLogger shows search bar
4. User searches "chicken breast"
   → nutritionService.getFoodsByQuery("chicken breast")
   → Supabase foods table search (ilike)
5. User adjusts quantity → confirms
6. food_logs INSERT { user_id, food_id, consumed_at, meal_type: 'breakfast', quantity_grams: 150 }
7. MealLogger calls props.onSaved()
8. App.js: goBack()
9. Nutrition screen: useFocusEffect triggers refresh()
10. useNutrition re-fetches food_logs → updates macro totals
```

---

### Onboarding → AI Plan Flow

```
1. User completes 7-step wizard
2. useOnboarding.generatePlan(answers)
3. groqAPI.generateAIPlan(answers)
   → builds 1500-token prompt
   → supabase.functions.invoke('onboarding-plan', { body: answers })
4. Edge function:
   → validates answers
   → calls Groq llama-3.3-70b-versatile with structured prompt
   → returns JSON plan
5. useOnboarding saves plan:
   → ai_plans INSERT
   → plan_days BULK INSERT
   → plan_exercises BULK INSERT
6. profileService.saveCalorieTargets(userId, tdee, goal)
   → profiles UPDATE { daily_calorie_target, protein_target, carbs_target, fat_target }
7. markOnboardingComplete()
   → profiles UPDATE { onboarded: true }
8. App re-renders → main tabs
9. Alexi auto-starts (profile.onboarded === true)
```

---

## 16. Key Design Patterns

### Pattern 1: Module-Level Singleton for Hardware Resources
Used for the audio recorder (`_rec`). Prevents concurrent access to iOS AVAudioSession. The 500ms gap after every `stopAndUnloadAsync` call is non-negotiable for hardware stability.

### Pattern 2: AlexiEvents for Cross-Component Communication
Instead of prop drilling or Redux, a simple pub/sub bus connects Alexi to all screens. Any screen can subscribe to `'dataUpdated'` to refresh when Alexi logs data.

### Pattern 3: Magic Refresh
All screens that show data Alexi can modify (Home, Nutrition, Insights) subscribe to `AlexiEvents.on('dataUpdated', refresh)`. This gives instant UI feedback after voice logging — no manual pull-to-refresh required.

### Pattern 4: Three-Layer Command Resolution
1. In-loop phonetic pre-snap (instant, no function call)
2. `snapShortTranscript` alias table (instant, local lookup)
3. `parseCommand` keyword regex (instant, local regex)
4. LLM only as final fallback

This ensures navigation commands respond in <1s total (just Whisper latency), not 3-5s (Whisper + LLM).

### Pattern 5: Hooks for Data, Services for API calls
Hooks (`useNutrition`, `useDashboard`) own component state and React lifecycle.  
Services (`nutritionService`, `dashboardService`) are plain async functions — no hooks, no React.  
This separation makes services testable in isolation.

### Pattern 6: useFocusEffect for Data Freshness
Every main screen uses:
```js
useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
```
This ensures data is always current when navigating to a screen, without a global polling loop.

### Pattern 7: Edge Functions as the AI Boundary
All LLM calls go through Supabase edge functions. API keys (Groq, OpenAI) are never in the mobile app. The mobile app only holds the Supabase anon key (safe for client-side use). The edge functions use `SUPABASE_SERVICE_ROLE_KEY` to write data on behalf of the user.

---

*Document generated from codebase state: April 2026, branch `feat/alexi-siri-voice-assistant`*
