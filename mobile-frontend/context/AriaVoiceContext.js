/**
 * AriaVoiceContext.js
 *
 * Global "always-listening" voice engine for BodyQ.
 * Aria wakes on the keyword "Aria" from any screen — Siri-style.
 *
 * ─── Architecture ────────────────────────────────────────────────
 *  AriaVoiceProvider  — wrap around app root, inside AuthProvider
 *  AriaVoiceOrb       — small floating mic indicator (non-workout screens)
 *  AriaScreenBorder   — full-screen lime border flash on wake-word detection
 *  AriaSiriGlow       — bottom-of-screen Siri-style glow when Aria is active
 *  AriaEarDot         — tiny pulsing lime dot: visible only while listening
 *  AriaDebugOverlay   — DEV-ONLY overlay showing live state + transcript
 *  useAriaVoice()     — hook for any screen that needs state or control
 *  AriaEvents         — lightweight pub/sub bus for cross-screen commands
 *
 * ─── Passive loop lifecycle ───────────────────────────────────────
 *  IDLE → startPassive() →
 *    [LISTENING 3 s chunk] → [TRANSCRIBING] →
 *      • no "aria" found     → back to LISTENING
 *      • "aria" + command    → ACTIVATED (visible) → executeCommand() → auto-hide 5s → LISTENING
 *      • bare "aria"         → ACTIVATED (visible) → 4 s command capture → execute → LISTENING
 *      • "aria mute/stop"    → MUTED (user-muted)
 *
 * ─── Audio conflict avoidance ────────────────────────────────────
 *  ONE Ear in the entire app — only AriaVoiceContext ever touches Audio.
 *  WorkoutActive  → pausePassive() on mount  (WebView SR handles voice)
 *  AppState       → auto-pause on background, resume on foreground
 *  Mute toggle    → stored in AsyncStorage, survives app restarts
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  Animated, AppState, Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Accelerometer } from 'expo-sensors';
import { supabase } from '../lib/supabase';

// ─── Module-level audio mode (runs once on import) ────────────────────────────
// Forces MixWithOthers immediately — before any component mounts.
// This prevents the WebView camera from stealing the session at startup.
Audio.setAudioModeAsync({
  allowsRecordingIOS:         true,
  playsInSilentModeIOS:       true,
  interruptionModeIOS:        InterruptionModeIOS.MixWithOthers,
  shouldDuckAndroid:          true,
  interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground:    false,
}).catch(() => {}); // silent — will be re-applied inside initAudioSession

// ─── Constants ─────────────────────────────────────────────────────────────────
const PASSIVE_DURATION_MS    = 3000;
const COMMAND_DURATION_MS    = 4000;
const CHUNK_GAP_MS           = 300;
const AUDIO_INIT_RETRIES     = 3;
const AUDIO_RETRY_DELAY_MS   = 600;
const AUDIO_SETTLE_MS        = 500;
const HARDWARE_BUSY_LIMIT    = 5;
const HARDWARE_RESET_MS      = 2000;
const ARIA_AUTOHIDE_MS       = 7000;   // auto-hide Aria after command completes
const MUTE_KEY               = '@aria_muted';
// Minimum Whisper confidence to act on a transcript.
// Lowered to 0.4 to catch speech at 2-3 m distance.
const MIN_CONFIDENCE         = 0.4;

const DEBUG_OVERLAY = false;

const { width: SW, height: SH } = Dimensions.get('window');

// High-quality mono at 16 kHz — Whisper's native sample rate.
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a', outputFormat: 2, audioEncoder: 3,
    sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
  },
  ios: {
    extension: '.m4a', outputFormat: 'aac ',
    audioQuality: 127,
    sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
  },
  web: {},
};

// ─── Cross-screen event bus ────────────────────────────────────────────────────
export const AriaEvents = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn);
    };
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  },
};

// ─── Context ───────────────────────────────────────────────────────────────────
const AriaVoiceContext = createContext(null);

// ─── Command parser ────────────────────────────────────────────────────────────
function parseCommand(text) {
  const t = text.toLowerCase().trim();

  if (/show (me |me how to |how to )?move|instructions?|form (guide|check|tip|help)|how to do (this|it|the exercise)|help( me)?$/.test(t))
    return { type: 'SHOW_INSTRUCTIONS' };

  if (t.includes('training') || t.includes('exercise') ||
      /move to exercises|go to (workout|train)|open (workout|train)/.test(t))
    return { type: 'NAVIGATE_TRAIN' };

  if (t.includes('fat') || t.includes('lose') || t.includes('loose') || t.includes('weight loss'))
    return { type: 'FAT_LOSS' };

  if (/how am i doing|my stats|daily summary|today.?s (progress|summary)|check in/.test(t))
    return { type: 'SPEAK_SUMMARY' };

  if (/log (my |my water |water)|add water|drank( water)?|had water|drink water/.test(t))
    return { type: 'LOG_WATER', amount: 250 };

  if (/log sleep|i slept|slept \d|(\d+) hours? sleep/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_SLEEP', hours: m ? parseFloat(m[1]) : 7 };
  }

  if (/how many steps|steps today|my steps|step count/.test(t))
    return { type: 'SPEAK_STEPS' };

  if (/stop listening|go to sleep|mute|silence|be quiet|stop aria/.test(t))
    return { type: 'MUTE' };

  return { type: 'OPEN_CHAT', query: text };
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AriaVoiceProvider({ children }) {
  /**
   * passiveState:
   *  'initializing' — audio session being set up
   *  'idle'         — not yet started / loop stopped
   *  'listening'    — recording a passive chunk
   *  'transcribing' — sending audio to Whisper
   *  'activated'    — wake word detected
   *  'speaking'     — TTS playing
   *  'paused'       — temporarily suspended (conflict avoidance)
   *  'muted'        — user-muted
   *  'error'        — audio init failed
   *  'no_permission'— mic denied
   */
  const [passiveState,   setPassiveState]   = useState('idle');
  const [isMuted,        setIsMuted]        = useState(false);
  const [permGranted,    setPermGranted]    = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [debugLog,       setDebugLog]       = useState('Initializing…');
  // Siri-mode: Aria is invisible until she hears her name
  const [isAriaVisible,  setIsAriaVisible]  = useState(false);

  const loopRef        = useRef(false);
  const pausedRef      = useRef(false);
  const mutedRef       = useRef(false);
  const activeRecRef   = useRef(null);
  const appStateRef    = useRef(AppState.currentState);
  const audioReadyRef  = useRef(false);
  const failCountRef   = useRef(0);
  const hideTimerRef   = useRef(null);

  // ── Animations ───────────────────────────────────────────────────────────────
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const borderAnim   = useRef(new Animated.Value(0)).current;
  const borderScale  = useRef(new Animated.Value(1.04)).current;
  const siriGlow     = useRef(new Animated.Value(0)).current;
  const earDotScale  = useRef(new Animated.Value(1)).current;

  // Ear dot pulses while passively listening
  useEffect(() => {
    if (passiveState === 'listening') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim,   { toValue: 1.45, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim,   { toValue: 1.0,  duration: 850, useNativeDriver: true }),
      ]));
      const earLoop = Animated.loop(Animated.sequence([
        Animated.timing(earDotScale, { toValue: 1.6,  duration: 600, useNativeDriver: true }),
        Animated.timing(earDotScale, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
      ]));
      loop.start();
      earLoop.start();
      return () => { loop.stop(); earLoop.stop(); };
    }
    pulseAnim.setValue(1);
    earDotScale.setValue(1);
  }, [passiveState]);

  // Siri glow animates in/out with isAriaVisible
  useEffect(() => {
    Animated.timing(siriGlow, {
      toValue:  isAriaVisible ? 1 : 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [isAriaVisible]);

  const flashBorder = useCallback(() => {
    borderAnim.setValue(0);
    borderScale.setValue(1.04);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(borderAnim,  { toValue: 1,    duration: 220, useNativeDriver: true }),
        Animated.timing(borderAnim,  { toValue: 0.55, duration: 180, useNativeDriver: true }),
        Animated.timing(borderAnim,  { toValue: 0.85, duration: 140, useNativeDriver: true }),
        Animated.timing(borderAnim,  { toValue: 0,    duration: 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(borderScale, { toValue: 1.0,  duration: 220, useNativeDriver: true }),
        Animated.timing(borderScale, { toValue: 1.04, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Siri-mode helpers ────────────────────────────────────────────────────────
  const showAria = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setIsAriaVisible(true);
  }, []);

  const hideAria = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setIsAriaVisible(false);
  }, []);

  const hideAriaAfter = useCallback((ms = ARIA_AUTOHIDE_MS) => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setIsAriaVisible(false), ms);
  }, []);

  // ── Load mute pref ───────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then(val => {
      const muted = val === 'true';
      mutedRef.current = muted;
      setIsMuted(muted);
    });
  }, []);

  // ── forceKillRecorder() — always call before createAsync ────────────────────
  /**
   * Forcefully stops and unloads any existing recording object.
   * iOS refuses to open a new AVAudioSession if a previous Recording
   * object still holds the hardware — even after an error.
   */
  const forceKillRecorder = useCallback(async () => {
    if (activeRecRef.current) {
      console.log('[AriaVoice] forceKillRecorder — releasing hardware…');
      try { await activeRecRef.current.stopAndUnloadAsync(); } catch (_) {}
      activeRecRef.current = null;
    }
  }, []);

  // ── Audio session initializer (with retry) ──────────────────────────────────
  const initAudioSession = useCallback(async () => {
    // Step 0: Live permission check (not cached)
    let perm;
    try { perm = await Audio.getPermissionsAsync(); }
    catch (permErr) {
      setDebugLog(`MISSING PERMISSION — getPermissionsAsync threw: ${permErr.message}`);
      setPassiveState('no_permission');
      return false;
    }
    if (perm.status !== 'granted') {
      setDebugLog(`MISSING PERMISSION — status: ${perm.status}`);
      setPassiveState('no_permission');
      return false;
    }

    for (let attempt = 1; attempt <= AUDIO_INIT_RETRIES; attempt++) {
      try {
        setDebugLog(`Audio init attempt ${attempt}/${AUDIO_INIT_RETRIES}…`);

        // Step 1: forceKillRecorder any orphaned recording BEFORE touching the session
        await forceKillRecorder();

        // Step 2: MixWithOthers — coexists with WebView camera (DoNotMix caused conflict loop)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:         true,
          playsInSilentModeIOS:       true,
          interruptionModeIOS:        InterruptionModeIOS.MixWithOthers,
          shouldDuckAndroid:          true,
          interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground:    false,
        });

        // Step 3: 500ms hardware breathing room (iOS AVAudioSession switch is async)
        await new Promise(r => setTimeout(r, AUDIO_SETTLE_MS));

        audioReadyRef.current = true;
        setDebugLog('Audio session ready ✓');
        return true;
      } catch (e) {
        const code = e.code ?? e.nativeErrorCode ?? 'n/a';
        setDebugLog(`Audio init failed (${attempt}) [code:${code}]: ${e.message}`);
        if (attempt < AUDIO_INIT_RETRIES) await new Promise(r => setTimeout(r, AUDIO_RETRY_DELAY_MS));
      }
    }
    audioReadyRef.current = false;
    setPassiveState('error');
    setDebugLog('Audio init FAILED after all retries');
    return false;
  }, [forceKillRecorder]);

  // ── Internal helpers ─────────────────────────────────────────────────────────
  const stopCurrentRecording = async () => {
    if (!activeRecRef.current) return;
    try {
      const st = await activeRecRef.current.getStatusAsync();
      if (st.isRecording || st.canRecord) {
        await activeRecRef.current.stopAndUnloadAsync();
      }
    } catch (_) {}
    activeRecRef.current = null;
  };

  const speak = (text) => new Promise((resolve) => {
    Speech.stop();
    setPassiveState('speaking');
    setDebugLog(`Speaking: "${text.slice(0, 50)}…"`);
    Speech.speak(text, {
      language: 'en-US', pitch: 1.1, rate: 1.0,
      onDone:    () => { audioReadyRef.current = false; setPassiveState('idle'); resolve(); },
      onStopped: () => { audioReadyRef.current = false; setPassiveState('idle'); resolve(); },
      onError:   () => { audioReadyRef.current = false; setPassiveState('idle'); resolve(); },
    });
  });

  /**
   * Records for durationMs milliseconds.
   * ALWAYS calls forceKillRecorder() first — the nuclear fix for "recorder not prepared".
   */
  const recordChunk = async (durationMs) => {
    // Re-init audio session if dirty (after TTS, error, or phone call)
    if (!audioReadyRef.current) {
      const ok = await initAudioSession();
      if (!ok) throw new Error('Audio session not available');
    }

    // Nuclear forceKillRecorder before every createAsync — prevents hardware lock
    await forceKillRecorder();

    // "Safe Start" — 1 s for the OS to fully release the previous session
    await new Promise(r => setTimeout(r, 1000));

    // Re-assert MixWithOthers every chunk — iOS can silently reset the session
    // mode (e.g. after a TTS call, phone call, or background/foreground switch).
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:         true,
        playsInSilentModeIOS:       true,
        interruptionModeIOS:        InterruptionModeIOS.MixWithOthers,
        shouldDuckAndroid:          true,
        interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground:    false,
      });
    } catch (_) {}

    let recording;
    try {
      ({ recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS));
    } catch (createErr) {
      // "Shock" the audio engine: full disable → re-enable to unstick the hardware
      console.warn('[AriaVoice] createAsync failed, shocking audio engine…', createErr.message);
      try { await Audio.setIsEnabledAsync(false); } catch (_) {}
      await new Promise(r => setTimeout(r, 500));
      try { await Audio.setIsEnabledAsync(true); } catch (_) {}
      await new Promise(r => setTimeout(r, 500));
      audioReadyRef.current = false;
      throw createErr;  // let the loop's catch/backoff handle the retry
    }
    activeRecRef.current = recording;
    setDebugLog(`Recording… (${durationMs / 1000}s chunk)`);

    await new Promise(r => setTimeout(r, durationMs));

    if (!loopRef.current || pausedRef.current || mutedRef.current) {
      try { await recording.stopAndUnloadAsync(); } catch (_) {}
      activeRecRef.current = null;
      return null;
    }

    await recording.stopAndUnloadAsync();
    activeRecRef.current = null;
    const uri = recording.getURI() ?? null;
    if (!uri) throw new Error('Recording produced no file');
    return uri;
  };

  /**
   * Sends an audio file URI to Groq Whisper.
   * Passes minConfidence=0.4 so distant speech (2-3 m) is not filtered out.
   */
  const transcribeURI = async (uri) => {
    setDebugLog('Transcribing…');
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      throw new Error(`File read failed: ${e.message}`);
    }

    let data, error;
    try {
      ({ data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { audioBase64: base64, mimeType: 'audio/m4a', minConfidence: MIN_CONFIDENCE },
      }));
    } catch (netErr) {
      Speech.speak(
        "I'm having trouble connecting to my brain, please check your internet.",
        { language: 'en-US' }
      );
      throw new Error(`Network error: ${netErr.message}`);
    }

    if (error) throw new Error(`Supabase error: ${error.message}`);

    const transcript = (data?.transcript ?? '').trim();
    console.log('[AriaVoice] transcript:', JSON.stringify(transcript));
    setLastTranscript(transcript);
    setDebugLog(`Heard: "${transcript || '(silence)'}" `);
    return transcript;
  };

  // ── Command executor ─────────────────────────────────────────────────────────
  const executeCommand = useCallback(async (commandText) => {
    if (!commandText?.trim()) return;
    const cmd = parseCommand(commandText);
    setDebugLog(`CMD: ${cmd.type} | "${commandText.slice(0, 40)}"`);
    AriaEvents.emit('command', cmd);

    switch (cmd.type) {

      case 'SHOW_INSTRUCTIONS':
        await speak("Showing you the form now.");
        // Auto-hide Aria after 5 s so she gets out of the user's way
        hideAriaAfter(ARIA_AUTOHIDE_MS);
        break;

      case 'SPEAK_SUMMARY': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const { data: act } = await supabase
            .from('daily_activity').select('steps, water_ml, sleep_hours')
            .eq('user_id', user.id).eq('date', TODAY).maybeSingle();
          const steps = act?.steps ?? 0;
          const water = act?.water_ml ?? 0;
          const sleep = act?.sleep_hours ?? 0;
          await speak(
            `Today you've walked ${steps.toLocaleString()} steps, ` +
            `drunk ${water} millilitres of water` +
            (sleep > 0 ? `, and slept ${sleep} hours last night` : '') +
            `. Keep it up!`
          );
        } catch (e) {
          await speak("I couldn't pull your stats right now. Try again in a moment.");
        }
        hideAriaAfter();
        break;
      }

      case 'LOG_WATER': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const { data: ex } = await supabase
            .from('daily_activity').select('id, water_ml')
            .eq('user_id', user.id).eq('date', TODAY).maybeSingle();
          const newMl = (ex?.water_ml ?? 0) + cmd.amount;
          if (ex) await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', ex.id);
          else     await supabase.from('daily_activity').insert({ user_id: user.id, date: TODAY, water_ml: newMl });
          AriaEvents.emit('dataUpdated', { type: 'water', value: newMl });
          await speak(`Logged your water! That's ${newMl} millilitres total today. Keep it up!`);
        } catch (e) {
          await speak("Sorry, I couldn't log your water right now.");
        }
        hideAriaAfter();
        break;
      }

      case 'LOG_SLEEP': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          await supabase.from('daily_activity')
            .upsert({ user_id: user.id, date: TODAY, sleep_hours: cmd.hours }, { onConflict: 'user_id,date' });
          AriaEvents.emit('dataUpdated', { type: 'sleep', value: cmd.hours });
          await speak(`Logged ${cmd.hours} hours of sleep. Rest is where the gains happen!`);
        } catch (e) {
          await speak("Sorry, I couldn't log your sleep.");
        }
        hideAriaAfter();
        break;
      }

      case 'SPEAK_STEPS': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const { data: act } = await supabase
            .from('daily_activity').select('steps')
            .eq('user_id', user.id).eq('date', TODAY).maybeSingle();
          const steps = act?.steps ?? 0;
          const msg = steps > 8000
            ? `Amazing! You've walked ${steps.toLocaleString()} steps today. You're crushing it!`
            : steps > 4000
            ? `You've walked ${steps.toLocaleString()} steps. Halfway there — keep moving!`
            : `You're at ${steps.toLocaleString()} steps today. Let's get those numbers up!`;
          await speak(msg);
        } catch (e) {
          await speak("I couldn't get your step count right now.");
        }
        hideAriaAfter();
        break;
      }

      case 'MUTE':
        await speak("I'll go quiet. Tap my icon whenever you need me.");
        hideAria();
        await setMutedState(true);
        break;

      case 'NAVIGATE_TRAIN':
        await speak("Moving to exercises.");
        AriaEvents.emit('navigate', { screen: 'Train' });
        hideAriaAfter();
        break;

      case 'FAT_LOSS':
        await speak("To lose fat, focus on a calorie deficit, high protein intake, and consistent training. Want me to open your training plan?");
        hideAriaAfter();
        break;

      case 'OPEN_CHAT':
        await speak("Opening your Aria chat now.");
        hideAriaAfter();
        break;

      default:
        hideAriaAfter();
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main passive loop ─────────────────────────────────────────────────────────
  const runPassiveLoop = useCallback(async () => {
    const audioOk = await initAudioSession();
    if (!audioOk) {
      console.error('[AriaVoice] Cannot start loop: audio init failed');
      return;
    }

    while (loopRef.current) {
      // ── Paused / muted — spin until state changes ──────────────────────────
      if (pausedRef.current || mutedRef.current) {
        setPassiveState(mutedRef.current ? 'muted' : 'paused');
        setDebugLog(mutedRef.current ? 'Muted' : 'Paused');
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      try {
        setPassiveState('listening');
        const uri = await recordChunk(PASSIVE_DURATION_MS);
        if (!uri) continue;

        // Successful chunk — reset failure counter
        failCountRef.current = 0;

        setPassiveState('transcribing');
        const transcript = await transcribeURI(uri);

        const lower = transcript.toLowerCase();
        const wakeMatch = lower.match(/\b(aria|area|ari|hey)\b/);
        if (wakeMatch) {
          const ariaIdx = lower.indexOf(wakeMatch[1]);
          const rest      = lower.slice(ariaIdx + wakeMatch[1].length).replace(/^[,.\s]+/, '').trim();
          const wordCount = rest.split(/\s+/).filter(Boolean).length;

          setPassiveState('activated');
          flashBorder();
          setIsAriaVisible(true);
          setDebugLog(`WAKE WORD detected! Command: "${rest || '(none yet)'}"`);

          loopRef.current = false;

          // Always say "Yes?" immediately — Siri-style acknowledgement
          await speak("Yes?");
          audioReadyRef.current = false;

          if (wordCount >= 2) {
            // Full command was in the same utterance: "Aria, log my water"
            await executeCommand(rest);
          } else {
            // Bare "Aria" — open 4 s command capture window
            await initAudioSession();
            let uri2 = null;
            try {
              await forceKillRecorder();
              const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
              activeRecRef.current = recording;
              setDebugLog('Listening for command…');
              await new Promise(r => setTimeout(r, COMMAND_DURATION_MS));
              await recording.stopAndUnloadAsync();
              activeRecRef.current = null;
              uri2 = recording.getURI() ?? null;
            } catch (e2) {
              setDebugLog(`Follow-up record error: ${e2.message}`);
            }

            if (uri2) {
              const cmdTranscript = await transcribeURI(uri2);
              if (cmdTranscript) await executeCommand(cmdTranscript);
              else               await speak("I didn't catch that — try again.");
            }
          }

          // Auto-hide Aria after 7 s
          setTimeout(() => setIsAriaVisible(false), 7000);

          if (!mutedRef.current) {
            audioReadyRef.current = false;
            loopRef.current = true;
          }
        }

      } catch (e) {
        console.warn('[AriaVoice] loop error:', e.message);
        failCountRef.current += 1;

        // Always release the hardware on any error
        await forceKillRecorder();
        audioReadyRef.current = false;

        if (failCountRef.current >= HARDWARE_BUSY_LIMIT) {
          setDebugLog('HARDWARE BUSY — Restarting Audio Engine…');
          setPassiveState('error');

          // Full neutral reset — lets iOS fully release the codec
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS:         false,
              playsInSilentModeIOS:       false,
              interruptionModeIOS:        InterruptionModeIOS.DoNotMix,
              shouldDuckAndroid:          false,
              interruptionModeAndroid:    InterruptionModeAndroid.DoNotMix,
              playThroughEarpieceAndroid: false,
              staysActiveInBackground:    false,
            });
          } catch (_) {}

          failCountRef.current = 0;
          await new Promise(r => setTimeout(r, HARDWARE_RESET_MS));
        } else {
          setDebugLog(`Loop error (${failCountRef.current}/${HARDWARE_BUSY_LIMIT}): ${e.message} — retry in 2s`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (loopRef.current && !pausedRef.current && !mutedRef.current) {
        await new Promise(r => setTimeout(r, CHUNK_GAP_MS));
      }
    }

    setPassiveState('idle');
    setDebugLog('Loop stopped');
  }, [executeCommand, flashBorder, initAudioSession, forceKillRecorder, showAria]);

  // ── Public API ────────────────────────────────────────────────────────────────
  const startPassive = useCallback(async () => {
    if (loopRef.current) return;
    if (mutedRef.current) return;

    setPassiveState('initializing');
    setDebugLog('Requesting mic permission…');

    const { granted } = await Audio.requestPermissionsAsync();
    setPermGranted(granted);
    if (!granted) {
      setPassiveState('no_permission');
      setDebugLog('Mic permission DENIED');
      return;
    }

    setDebugLog('Permission granted ✓ — starting loop');
    loopRef.current   = true;
    pausedRef.current = false;
    runPassiveLoop();
  }, [runPassiveLoop]);

  const stopPassive = useCallback(async () => {
    loopRef.current   = false;
    pausedRef.current = false;
    await stopCurrentRecording();
    Speech.stop();
    setPassiveState('idle');
    setDebugLog('Stopped');
  }, []);

  const pausePassive = useCallback(async () => {
    pausedRef.current = true;
    await stopCurrentRecording();
    setPassiveState('paused');
    setDebugLog('Paused (conflict avoidance)');
  }, []);

  const resumePassive = useCallback(() => {
    if (loopRef.current && !mutedRef.current) {
      pausedRef.current = false;
      setDebugLog('Resuming…');
    }
  }, []);

  const setMutedState = useCallback(async (muted) => {
    mutedRef.current = muted;
    setIsMuted(muted);
    await AsyncStorage.setItem(MUTE_KEY, String(muted));
    if (muted) {
      loopRef.current = false;
      await stopCurrentRecording();
      Speech.stop();
      setPassiveState('muted');
      setDebugLog('Muted by user');
    } else {
      setDebugLog('Unmuted — restarting loop');
      loopRef.current   = true;
      pausedRef.current = false;
      runPassiveLoop();
    }
  }, [runPassiveLoop]);

  // ── Shake-to-wake (force manual trigger if passive loop is blocked) ─────────
  useEffect(() => {
    const SHAKE_THRESHOLD = 2.6;  // g-force — hard enough to not trigger on steps
    const SHAKE_COOLDOWN_MS = 3000;
    let lastShake = 0;

    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (mag < SHAKE_THRESHOLD) return;
      const now = Date.now();
      if (now - lastShake < SHAKE_COOLDOWN_MS) return;
      lastShake = now;

      // Show Aria immediately
      showAria();
      Speech.speak("Yes?", { language: 'en-US', pitch: 1.1, rate: 1.0 });
      hideAriaAfter(ARIA_AUTOHIDE_MS);

      // If the passive loop died, restart it
      if (!loopRef.current && !mutedRef.current) {
        audioReadyRef.current = false;
        startPassive();
      }
    });
    return () => sub.remove();
  }, [showAria, hideAriaAfter, startPassive]);

  // ── AppState — auto-pause in background ───────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const isActive  = nextState === 'active';
      appStateRef.current = nextState;

      if (wasActive && !isActive && loopRef.current && !pausedRef.current) {
        await pausePassive();
      } else if (!wasActive && isActive && loopRef.current && !mutedRef.current) {
        audioReadyRef.current = false;
        resumePassive();
      }
    });
    return () => sub.remove();
  }, [pausePassive, resumePassive]);

  // ── Auto-start on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!mutedRef.current) startPassive();
    }, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(hideTimerRef.current);
      stopPassive();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────────
  const value = {
    passiveState,
    isMuted,
    permGranted,
    lastTranscript,
    debugLog,
    isAriaVisible,
    pulseAnim,
    borderAnim,
    borderScale,
    siriGlow,
    earDotScale,
    flashBorder,
    showAria,
    hideAria,
    hideAriaAfter,
    startPassive,
    stopPassive,
    pausePassive,
    resumePassive,
    setMutedState,
    executeCommand,
  };

  return (
    <AriaVoiceContext.Provider value={value}>
      {children}
    </AriaVoiceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAriaVoice() {
  const ctx = useContext(AriaVoiceContext);
  if (!ctx) throw new Error('useAriaVoice must be used inside <AriaVoiceProvider>');
  return ctx;
}

// ─── Debug overlay (DEV only) ─────────────────────────────────────────────────
export function AriaDebugOverlay() {
  const { passiveState, lastTranscript, debugLog, isAriaVisible } = useAriaVoice();
  if (!DEBUG_OVERLAY) return null;

  const stateColor =
    passiveState === 'listening'    ? '#C6FF33' :
    passiveState === 'transcribing' ? '#FFC832' :
    passiveState === 'activated'    ? '#FFFFFF' :
    passiveState === 'speaking'     ? '#9B7FFF' :
    passiveState === 'error'        ? '#FF6464' :
    passiveState === 'no_permission'? '#FF6464' :
    passiveState === 'muted'        ? '#FF8C00' :
    '#8B82AD';

  return (
    <View style={dbg.wrap} pointerEvents="none">
      <View style={dbg.row}>
        <View style={[dbg.dot, { backgroundColor: stateColor }]} />
        <Text style={[dbg.state, { color: stateColor }]}>
          {passiveState.toUpperCase()}
        </Text>
        {isAriaVisible && (
          <Text style={[dbg.state, { color: '#C6FF33', marginLeft: 6 }]}>VISIBLE</Text>
        )}
      </View>
      <Text style={dbg.line} numberOfLines={2}>{debugLog}</Text>
      {lastTranscript ? (
        <Text style={dbg.transcript} numberOfLines={2}>
          🗣 "{lastTranscript}"
        </Text>
      ) : null}
    </View>
  );
}

const dbg = StyleSheet.create({
  wrap: {
    position:        'absolute',
    top:             50,
    left:            10,
    right:           10,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius:    10,
    padding:         10,
    zIndex:          99999,
    borderWidth:     1,
    borderColor:     'rgba(198,255,51,0.3)',
  },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  state:      { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  line:       { color: '#C8BFEE', fontSize: 10, lineHeight: 14 },
  transcript: { color: '#C6FF33', fontSize: 10, marginTop: 4, lineHeight: 14 },
});

// ─── Screen border flash ──────────────────────────────────────────────────────
export function AriaScreenBorder() {
  const { borderAnim, borderScale } = useAriaVoice();
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        borderStyles.frame,
        { opacity: borderAnim, transform: [{ scale: borderScale }] },
      ]}
    />
  );
}

const BORDER = 3;
const borderStyles = StyleSheet.create({
  frame: {
    position:      'absolute',
    top:           0, left: 0,
    width:         SW, height: SH,
    borderWidth:   BORDER,
    borderColor:   '#C6FF33',
    borderRadius:  0,
    zIndex:        9998,
    shadowColor:   '#C6FF33',
    shadowOpacity: 0.85,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 0 },
  },
});

// ─── Siri-style bottom glow ───────────────────────────────────────────────────
/**
 * AriaSiriGlow — a pulsing neon-lime gradient bar at the bottom of the screen.
 * Appears only when Aria has been awakened (isAriaVisible === true).
 * Mount once in App.js alongside AriaScreenBorder.
 */
export function AriaSiriGlow() {
  const { siriGlow, isAriaVisible } = useAriaVoice();

  const speakPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isAriaVisible) { speakPulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(speakPulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
      Animated.timing(speakPulse, { toValue: 0.85, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isAriaVisible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        glowStyles.bar,
        {
          opacity:   siriGlow,
          transform: [{ scaleX: speakPulse }],
        },
      ]}
    />
  );
}

const glowStyles = StyleSheet.create({
  bar: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          4,
    backgroundColor: '#C6FF33',
    shadowColor:     '#C6FF33',
    shadowOpacity:   1,
    shadowRadius:    24,
    shadowOffset:    { width: 0, height: -6 },
    elevation:       12,
    zIndex:          9997,
  },
});

// ─── Ear indicator ────────────────────────────────────────────────────────────
/**
 * AriaEarDot — tiny pulsing neon-lime dot visible ONLY when Aria is listening.
 * Place in the status-bar area (top of App.js).
 */
export function AriaEarDot() {
  const { passiveState, earDotScale, showAria, hideAriaAfter } = useAriaVoice();

  // Show dot whenever the loop is alive (not just while recording a chunk)
  const isActive = ['listening', 'transcribing', 'activated', 'speaking', 'initializing'].includes(passiveState);
  if (!isActive) return null;

  // Dot is bright lime while listening; dimmer during transcribing/speaking
  const dotOpacity = passiveState === 'listening' ? 1 : 0.45;
  const dotColor   = passiveState === 'speaking'  ? '#9B7FFF' :
                     passiveState === 'transcribing' ? '#FFC832' : '#C6FF33';

  const handleManualWake = () => {
    showAria();
    Speech.speak("Yes?", { language: 'en-US', pitch: 1.1, rate: 1.0 });
    hideAriaAfter(7000);
  };

  return (
    <TouchableOpacity
      onPress={handleManualWake}
      activeOpacity={0.7}
      style={earStyles.hitArea}
    >
      <Animated.View
        style={[
          earStyles.dot,
          {
            opacity:          dotOpacity,
            backgroundColor:  dotColor,
            shadowColor:      dotColor,
            transform:        [{ scale: passiveState === 'listening' ? earDotScale : 1 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const earStyles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    top:      6,
    right:    6,
    width:    32,
    height:   32,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:   99998,
  },
  dot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#C6FF33',
    shadowColor:     '#C6FF33',
    shadowOpacity:   1,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 0 },
    zIndex:          99998,
  },
});

// ─── Floating orb ─────────────────────────────────────────────────────────────
export function AriaVoiceOrb({ style }) {
  const { passiveState, isMuted, pulseAnim, resumePassive, startPassive, setMutedState } = useAriaVoice();

  const handlePress = () => {
    if (isMuted)                                                  setMutedState(false);
    else if (passiveState === 'paused')                           resumePassive();
    else if (passiveState === 'idle'   ||
             passiveState === 'error'  ||
             passiveState === 'no_permission')                    startPassive();
  };

  const isListening    = passiveState === 'listening';
  const isTranscribing = passiveState === 'transcribing';
  const isActivated    = passiveState === 'activated';
  const isSpeaking     = passiveState === 'speaking';

  const orbBg = isMuted
    ? 'rgba(255,80,80,0.10)'
    : isListening || isActivated
    ? 'rgba(198,255,51,0.15)'
    : isTranscribing
    ? 'rgba(255,200,50,0.15)'
    : isSpeaking
    ? 'rgba(130,80,255,0.18)'
    : 'rgba(255,255,255,0.05)';

  const orbBorder = isMuted
    ? 'rgba(255,80,80,0.45)'
    : isListening || isActivated
    ? 'rgba(198,255,51,0.65)'
    : isTranscribing
    ? 'rgba(255,200,50,0.55)'
    : isSpeaking
    ? 'rgba(130,80,255,0.65)'
    : 'rgba(255,255,255,0.18)';

  const iconColor = isMuted
    ? '#FF6464'
    : isListening || isActivated
    ? '#C6FF33'
    : isTranscribing
    ? '#FFC832'
    : isSpeaking
    ? '#9B7FFF'
    : '#555';

  const iconName =
    passiveState === 'no_permission' ? 'mic-off' :
    isMuted                          ? 'mic-off-outline' :
    isSpeaking                       ? 'volume-high-outline' :
    (passiveState === 'paused' ||
     passiveState === 'idle'   ||
     passiveState === 'error')       ? 'mic-outline' :
    'mic';

  return (
    <TouchableOpacity
      style={[orbStyles.orb, { backgroundColor: orbBg, borderColor: orbBorder }, style]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {isListening && (
        <Animated.View style={[orbStyles.pulse, { transform: [{ scale: pulseAnim }] }]} />
      )}
      <Ionicons name={iconName} size={17} color={iconColor} />
    </TouchableOpacity>
  );
}

const orbStyles = StyleSheet.create({
  orb: {
    position:       'absolute',
    bottom:         90,
    left:           16,
    width:          40,
    height:         40,
    borderRadius:   20,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         999,
  },
  pulse: {
    position:        'absolute',
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(198,255,51,0.14)',
  },
});
