import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text,
  StatusBar, Alert, Animated, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { saveWorkoutSession } from '../../services/workoutService';
import { supabase } from '../../lib/supabase';

// ── Exercise keyword → HTML camelCase key ─────────────────────
function resolveHtmlKey(name) {
  const k = name.trim().toLowerCase();
  if (k.includes('push') || k.includes('bench')) return 'pushup';
  if (k.includes('squat'))                        return 'squat';
  if (k.includes('curl'))                         return 'bicepCurl';
  if (k.includes('press'))                        return 'shoulderPress';
  if (k.includes('deadlift') || k.includes('rdl')) return 'deadlift';
  if (k.includes('lunge'))                        return 'lunge';
  if (k.includes('plank'))                        return 'plank';
  return null;
}

function scoreColor(pct) {
  if (pct >= 80) return '#C8F135';
  if (pct >= 55) return '#FF9500';
  return '#FF3B30';
}

function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutActive({ route, navigation }) {
  const { user } = useAuth();
  const rawKey      = route.params?.exerciseKey || route.params?.exerciseName || 'squat';
  const htmlKey     = resolveHtmlKey(rawKey);
  const displayName = rawKey.replace(/_/g, ' ').toUpperCase();

  // ── Refs ───────────────────────────────────────────────────
  const webViewRef       = useRef(null);
  const startTimeRef     = useRef(Date.now());
  const pulseAnim        = useRef(new Animated.Value(0)).current;
  const pulseRunning     = useRef(false);
  const formScoreSum     = useRef(0);
  const formScoreCount   = useRef(0);
  const countScaleAnim   = useRef(new Animated.Value(0.3)).current;
  const countOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowOpacityAnim  = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef(null);
  const isMountedRef     = useRef(true);
  const pulseLoopActive  = useRef(false);   // stops the pulse loop between steps

  // ── State ──────────────────────────────────────────────────
  const [hasPermission,  setHasPermission]  = useState(null);
  const [htmlContent,    setHtmlContent]    = useState(null);
  const [cue,            setCue]            = useState('Initializing AI...');
  const [repCount,       setRepCount]       = useState(0);
  const [formScore,      setFormScore]      = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(true);   // hides camera until GO!
  const [countStep,      setCountStep]      = useState(null);   // current label: 3 | 2 | 1 | 'GO!'
  const [timerSecs,      setTimerSecs]      = useState(0);
  const [timerRunning,   setTimerRunning]   = useState(false);

  // ── Unmount cleanup ────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      pulseLoopActive.current = false;
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  // ── Hide tab bar (100% — no tab bar or Yara during workout) ─
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => navigation.getParent()?.setOptions({
      tabBarStyle: { backgroundColor: '#0F0B1E', borderTopColor: '#1E1A35', height: 85, paddingBottom: 20 },
    });
  }, [navigation]);

  // ── Camera permission + HTML pre-load ─────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      try {
        const asset = Asset.fromModule(require('../../assets/ai_coach.html'));
        await asset.downloadAsync();
        const res  = await fetch(asset.localUri || asset.uri);
        const text = await res.text();
        setHtmlContent(text);
      } catch (err) {
        console.error('[BodyQ] HTML Load Error:', err);
        Alert.alert('Engine Error', 'Could not initialize the AI Engine.');
      }
    })();
  }, []);

  // ── Live timer interval ────────────────────────────────────
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) setTimerSecs(s => s + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  // ── Electric Violet edge glow: strict (100%) form ─────────
  useEffect(() => {
    Animated.timing(glowOpacityAnim, {
      toValue:  formScore === 100 ? 1 : 0,
      duration: formScore === 100 ? 500 : 200,
      useNativeDriver: true,
    }).start();
  }, [formScore, glowOpacityAnim]);

  // ── Border pulse on bad-form correction cue ───────────────
  const triggerPulse = useCallback(() => {
    if (pulseRunning.current) return;
    pulseRunning.current = true;
    pulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 280, useNativeDriver: false }),
    ]).start(() => { pulseRunning.current = false; });
  }, [pulseAnim]);

  // ── Cinematic 3-2-1 Countdown ─────────────────────────────
  // Starts on mount. Camera is triggered after 'GO!' finishes.
  const startCountdown = useCallback(() => {
    const steps = [3, 2, 1, 'GO!'];
    let i = 0;

    // Continuous Neon Lime pulse loop while a number is on screen
    const runPulseLoop = () => {
      if (!pulseLoopActive.current || !isMountedRef.current) return;
      Animated.sequence([
        Animated.timing(countScaleAnim, { toValue: 1.12, duration: 260, useNativeDriver: true }),
        Animated.timing(countScaleAnim, { toValue: 1.00, duration: 260, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) runPulseLoop();
      });
    };

    const showStep = () => {
      if (!isMountedRef.current) return;

      if (i >= steps.length) {
        // GO! finished → reveal camera + start rep counting + start timer
        setIsCountingDown(false);
        setCountStep(null);
        webViewRef.current?.injectJavaScript(
          'window.startCamera && window.startCamera(); true;'
        );
        startTimeRef.current = Date.now();
        setTimerRunning(true);
        return;
      }

      const val = steps[i];
      setCountStep(val);

      // Reset and spring in
      pulseLoopActive.current = false;
      countScaleAnim.setValue(0.25);
      countOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(countScaleAnim, {
          toValue: 1, tension: 220, friction: 7, useNativeDriver: true,
        }),
        Animated.timing(countOpacityAnim, {
          toValue: 1, duration: 100, useNativeDriver: true,
        }),
      ]).start(() => {
        // Start the continuous pulse once fully visible
        pulseLoopActive.current = true;
        runPulseLoop();

        // Hold for ~700ms (total step ≈ 1s: 100 enter + 700 hold + 200 exit)
        const holdMs = val === 'GO!' ? 800 : 700;
        setTimeout(() => {
          if (!isMountedRef.current) return;
          pulseLoopActive.current = false;   // stop pulse before fade

          Animated.timing(countOpacityAnim, {
            toValue: 0, duration: 200, useNativeDriver: true,
          }).start(() => {
            i++;
            showStep();
          });
        }, holdMs);
      });
    };

    showStep();
  }, [countScaleAnim, countOpacityAnim]);

  // Start countdown on mount (WebView pre-loads silently in background)
  useEffect(() => {
    startCountdown();
  }, [startCountdown]);

  // ── WebView message bridge ─────────────────────────────────
  const onMessage = useCallback((e) => {
    const data = e.nativeEvent.data;

    // Camera is now ready — inject exercise key and unlock rep counting
    if (data === 'AI_READY') {
      if (htmlKey) {
        webViewRef.current?.injectJavaScript(
          `window.applyExerciseChange && window.applyExerciseChange('${htmlKey}'); true;`
        );
      }
      webViewRef.current?.injectJavaScript('window.startAI && window.startAI(); true;');
      return;
    }

    try {
      const msg = JSON.parse(data);

      if (msg.type === 'cue') {
        setCue(msg.text);
        if (msg.formScore !== undefined) {
          setFormScore(msg.formScore);
          formScoreSum.current   += msg.formScore;
          formScoreCount.current += 1;
        }
        const isBad = msg.text && !msg.text.includes('Great form') && !msg.text.includes('Detecting');
        if (isBad) triggerPulse();
      }

      if (msg.type === 'REP_COUNTED') setRepCount(msg.count);

      if (msg.type === 'SESSION_COMPLETE') {
        const elapsed      = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const avgFormScore = formScoreCount.current > 0
          ? Math.round(formScoreSum.current / formScoreCount.current)
          : (msg.score ?? 0);
        const calories     = Math.max(1, msg.reps * 5);
        const activityMins = Math.max(1, Math.round(elapsed / 60));

        setTimerRunning(false);

        (async () => {
          let sessionId = null;
          if (user?.id) {
            sessionId = await saveWorkoutSession({
              userId:         user.id,
              exerciseKey:    htmlKey ?? rawKey,
              exerciseName:   msg.exercise || displayName,
              reps:           msg.reps,
              postureScore:   avgFormScore,
              caloriesBurned: calories,
            });

            // 1. Additive upsert of calories_burned into daily_metrics
            try {
              const TODAY = new Date().toISOString().split('T')[0];
              const { data: existing } = await supabase
                .from('daily_metrics')
                .select('calories_burned')
                .eq('user_id', user.id)
                .eq('date', TODAY)
                .maybeSingle();

              const newTotal = (existing?.calories_burned || 0) + calories;
              await supabase
                .from('daily_metrics')
                .upsert(
                  { user_id: user.id, date: TODAY, calories_burned: newTotal },
                  { onConflict: 'user_id,date' }
                );
            } catch (e) {
              console.warn('[BodyQ] daily_metrics upsert failed:', e.message);
            }

            // 2. Persist activity_minutes into daily_activity
            try {
              const TODAY = new Date().toISOString().split('T')[0];
              const { data: existing } = await supabase
                .from('daily_activity')
                .select('id, activity_minutes')
                .eq('user_id', user.id)
                .eq('date', TODAY)
                .maybeSingle();

              if (existing) {
                await supabase
                  .from('daily_activity')
                  .update({ activity_minutes: (existing.activity_minutes || 0) + activityMins })
                  .eq('id', existing.id);
              } else {
                await supabase
                  .from('daily_activity')
                  .insert({ user_id: user.id, date: TODAY, activity_minutes: activityMins });
              }
            } catch (e) {
              console.warn('[BodyQ] daily_activity update failed:', e.message);
            }
          }

          navigation.replace('WorkoutSummary', {
            exerciseName: displayName,
            repCount:     msg.reps,
            formScore:    avgFormScore,
            elapsed,
            sessionId,
          });
        })();
      }
    } catch (_) {}
  }, [navigation, displayName, htmlKey, rawKey, triggerPulse, user]);

  // ── Finish button ──────────────────────────────────────────
  const handleFinish = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `if (window.getSessionState) window.getSessionState(); true;`
    );
  }, []);

  // ── Unsupported exercise ───────────────────────────────────
  if (htmlKey === null) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar hidden />
        <Text style={s.unsupportedIcon}>🤖</Text>
        <Text style={s.unsupportedTitle}>AI Tracking Unavailable</Text>
        <Text style={s.unsupportedSub}>
          AI Form Tracking is not yet available for this exercise.{'\n'}Use manual timer?
        </Text>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar hidden />
        <Text style={s.error}>Camera Permission Denied</Text>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Bad-form pulse border interpolations
  const borderColor = pulseAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(124,92,252,0)', 'rgba(124,92,252,0.9)'],
  });
  const borderWidth = pulseAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 3],
  });

  const ring = scoreColor(formScore);

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* ── WEBVIEW (hidden during countdown via pointer-events + opacity) ── */}
      {htmlContent && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent, baseUrl: 'https://localhost' }}
          style={[s.webview, isCountingDown && { opacity: 0 }]}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={false}
          onPermissionRequest={(event) => event.grant(event.resources)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          onMessage={onMessage}
        />
      )}

      {/* ── Post-countdown HUD elements ── */}
      {!isCountingDown && (
        <>
          {/* Electric Violet edge glow: strict (100%) form */}
          <Animated.View
            pointerEvents="none"
            style={[s.edgeGlow, { opacity: glowOpacityAnim }]}
          />

          {/* Pulsing border: bad-form correction */}
          <Animated.View
            pointerEvents="none"
            style={[s.pulseBorder, { borderColor, borderWidth }]}
          />

          {/* Atmospheric rep counter */}
          <View style={s.atmosWrap} pointerEvents="none">
            <Text style={s.atmosRep}>{repCount}</Text>
          </View>

          {/* Top-left: Close + Exercise name */}
          <BlurView intensity={40} tint="dark" style={s.topLeft}>
            <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
            <Text style={s.exerciseTitle}>{displayName}</Text>
          </BlurView>

          {/* Top-right: Form ring */}
          <BlurView intensity={40} tint="dark" style={s.ringWrap} pointerEvents="none">
            <View style={[s.ringOuter, { borderColor: ring }]}>
              <Text style={[s.ringPct, { color: ring }]}>{formScore}</Text>
              <Text style={s.ringLabel}>FORM</Text>
            </View>
          </BlurView>

          {/* Top-center: live timer */}
          <View style={s.timerWrap} pointerEvents="none">
            <BlurView intensity={30} tint="dark" style={s.timerBlur}>
              <Text style={s.timerText}>{formatTimer(timerSecs)}</Text>
            </BlurView>
          </View>

          {/* Bottom HUD: cue + finish */}
          <BlurView intensity={50} tint="dark" style={s.bottomOverlay}>
            <View style={s.cueRow}>
              <Ionicons name="sparkles" size={13} color="#C8F135" style={{ marginRight: 7 }} />
              <Text style={s.cueText} numberOfLines={2}>{cue}</Text>
            </View>
            <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
              <Text style={s.finishBtnTxt}>Finish</Text>
              <Ionicons name="checkmark" size={15} color="#000" />
            </TouchableOpacity>
          </BlurView>
        </>
      )}

      {/* ── CINEMATIC COUNTDOWN OVERLAY ── */}
      {isCountingDown && (
        <View style={s.countdownOverlay}>
          {/* Exercise label */}
          <Text style={s.countdownExercise}>{displayName}</Text>

          {/* Animated number */}
          {countStep !== null && (
            <Animated.Text
              style={[
                s.countdownNum,
                countStep === 'GO!' && s.countdownGoStyle,
                {
                  opacity: countOpacityAnim,
                  transform: [{ scale: countScaleAnim }],
                },
              ]}
            >
              {countStep}
            </Animated.Text>
          )}

          {/* Hint */}
          <Text style={s.countdownHint}>Step back for full-body tracking.</Text>

          {/* Skip / back button */}
          <TouchableOpacity style={s.skipBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.3)" />
            <Text style={s.skipTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  // WebView — true full-bleed
  webview: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },

  // Electric Violet edge glow
  edgeGlow: {
    ...StyleSheet.absoluteFillObject, zIndex: 25,
    borderWidth: 3, borderColor: '#7C5CFC',
    shadowColor: '#7C5CFC', shadowOpacity: 0.9, shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },

  // Bad-form pulse border
  pulseBorder: { ...StyleSheet.absoluteFillObject, zIndex: 30 },

  // Atmospheric rep counter
  atmosWrap: {
    position: 'absolute', top: '14%', left: 0, right: 0,
    alignItems: 'center', zIndex: 10,
  },
  atmosRep: {
    fontSize: 160, fontWeight: '900',
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: -8, lineHeight: 160,
  },

  // Top-left pill
  topLeft: {
    position: 'absolute', top: 52, left: 16, zIndex: 40,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 30, overflow: 'hidden',
    paddingVertical: 6, paddingHorizontal: 8,
  },
  closeBtn: {
    width: 38, height: 38, backgroundColor: '#C8F135',
    borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  exerciseTitle: {
    color: '#C8F135', fontSize: 14, fontWeight: '900',
    letterSpacing: 1.2, marginRight: 6,
    textShadowColor: 'rgba(200,241,53,0.4)', textShadowRadius: 8,
  },

  // Top-right form ring
  ringWrap: {
    position: 'absolute', top: 46, right: 16, zIndex: 40,
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  ringOuter: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  ringPct:   { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  ringLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },

  // Top-center timer
  timerWrap: {
    position: 'absolute', top: 130, left: 0, right: 0,
    alignItems: 'center', zIndex: 40,
  },
  timerBlur: { borderRadius: 12, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 7 },
  timerText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 16,
    fontWeight: '900', letterSpacing: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // Bottom HUD
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 42,
  },
  cueRow:       { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  cueText:      { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 20, flex: 1 },
  finishBtn:    {
    backgroundColor: '#C8F135', paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  finishBtnTxt: { color: '#000', fontWeight: '900', fontSize: 13 },

  // ── Cinematic countdown overlay ──────────────────────────
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: '#000',     // solid black — no camera bleed-through
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownExercise: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  countdownNum: {
    fontSize: 160,
    fontWeight: '900',
    color: '#C8F135',
    lineHeight: 168,
    letterSpacing: -8,
    textShadowColor: 'rgba(200,241,53,0.5)',
    textShadowRadius: 60,
    textShadowOffset: { width: 0, height: 0 },
  },
  countdownGoStyle: {
    fontSize: 80,
    letterSpacing: 12,
    lineHeight: 88,
  },
  countdownHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 40,
  },
  skipBtn: {
    position: 'absolute',
    bottom: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },

  // Fallback screens
  loaderTxt:        { color: '#C8F135', marginTop: 15, fontWeight: '900', letterSpacing: 2 },
  error:            { color: '#FF3B30', fontWeight: '800', fontSize: 16 },
  backLink:         { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#C8F135' },
  backLinkTxt:      { color: '#C8F135', fontWeight: '700' },
  unsupportedIcon:  { fontSize: 52, marginBottom: 16 },
  unsupportedTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  unsupportedSub:   { color: '#6B5F8A', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 30 },
});
