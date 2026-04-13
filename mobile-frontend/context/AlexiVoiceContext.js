/**
 * AlexiVoiceContext.js
 *
 * Global voice engine for BodyQ — stable expo-av singleton pattern.
 *
 * ─── Recording architecture ───────────────────────────────────────────────────
 *  ONE Audio.Recording instance lives in the module-level _rec variable.
 *  stopAnyRecording() — stops _rec if present, always waits 400 ms gap.
 *  speak()            — calls stopAnyRecording(), switches to PLAYBACK mode, TTS.
 *
 * ─── Passive loop ────────────────────────────────────────────────────────────
 *  Record 3 s → transcribe → check for wake word →
 *   • no "alexi" → loop
 *   • "alexi" + command inline → executeCommand()
 *   • bare "alexi"             → speak("Yes?") → record CMD_LISTEN_MS → execute
 *
 * ─── Press-to-talk (fallback) ────────────────────────────────────────────────
 *  talkToAlexi() — kills passive loop, records CMD_LISTEN_MS, executes, restarts.
 *  Exposed in context so AlexiAssistant can call it on long-press.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  Alert, Animated, AppState, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import RAnimated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withDelay, withSequence,
  Easing, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { supabase } from '../lib/supabase';

// ─── Audio modes ──────────────────────────────────────────────────────────────
const RECORDING_MODE = {
  allowsRecordingIOS:         true,
  playsInSilentModeIOS:       true,
  interruptionModeIOS:        InterruptionModeIOS.MixWithOthers,
  shouldDuckAndroid:          true,
  interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground:    true,
};

// ─── Recording options ────────────────────────────────────────────────────────
// Use the built-in HIGH_QUALITY preset — safest choice across all expo-av
// versions and both platforms. Custom enum constants (AndroidOutputFormat etc.)
// vary between SDK versions and can silently produce undefined values that cause
// prepareToRecordAsync to fail immediately, creating a tight spam loop.
const REC_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;

// ─── Timing constants ─────────────────────────────────────────────────────────
const CMD_LISTEN_MS         = 5000;  // command capture duration after wake word
const ALEXI_AUTOHIDE_MS     = 7000;
const MIN_VISIBLE_MS        = 5000;  // mascot stays visible at least this long once shown
const SILENCE_HIDE_CHUNKS   = 2;     // hide mascot after this many silent chunks (6 s)
const MUTE_KEY          = '@alexi_muted';
const MIN_CONFIDENCE    = 0.4;
const DEBUG_OVERLAY     = false;

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Module-level recorder reference ─────────────────────────────────────────
// Single global reference to the active Audio.Recording.
// stopAnyRecording() always waits 400 ms after stop so iOS AVAudioSession has
// time to release the hardware before the next createAsync / setAudioModeAsync.
let _rec = null;

async function stopAnyRecording() {
  const r = _rec;
  _rec = null;
  if (r) {
    try { await r.stopAndUnloadAsync(); } catch (_) {}
    await new Promise(res => setTimeout(res, 500));
  }
}

// ─── Confirmation chime ───────────────────────────────────────────────────────
const CONFIRM_TONE_B64 =
  'UklGRlQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTAAAAA' +
  'AAAAAAP//AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAA';

async function playConfirmSound() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${CONFIRM_TONE_B64}` },
      { volume: 0.18, shouldPlay: true },
    );
    sound.setOnPlaybackStatusUpdate(s => {
      if (s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch (_) {}
}

// ─── Cross-screen event bus ───────────────────────────────────────────────────
export const AlexiEvents = {
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

// ─── Short-transcript snap ────────────────────────────────────────────────────
// When Whisper returns ≤ 3 words, phonetic noise ("video", "profile a", etc.)
// is snapped to the nearest known navigation target before any further processing.
// This catches the classic "Profile" → "Video file" hallucination.
const NAV_SNAP = [
  { screen: 'Profile',     words: ['profile','profiles','account','settings','video','video file','for file','pro file'] },
  { screen: 'Fuel',        words: ['fuel','food','nutrition','full','few','feel','fell'] },
  { screen: 'Insights',    words: ['insights','insight','inside','incite','in sites'] },
  { screen: 'Train',       words: ['train','training','workout','workouts','exercise','trim','trend'] },
  { screen: 'Home',        words: ['home','home screen','homes'] },
];

function snapShortTranscript(text) {
  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length > 3) return text;  // only snap very short utterances
  const joined = words.join(' ');
  for (const { screen, words: targets } of NAV_SNAP) {
    if (targets.some(w => joined.includes(w))) {
      return screen.toLowerCase();  // return the canonical screen name as the command
    }
  }
  return text;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AlexiVoiceContext = createContext(null);

// ─── Command parser ───────────────────────────────────────────────────────────
function parseCommand(text) {
  const t = text.toLowerCase().trim();

  if (/show (me |me how to |how to )?move|instructions?|form (guide|check|tip|help)|how to do (this|it|the exercise)|help( me)?$/.test(t))
    return { type: 'SHOW_INSTRUCTIONS' };

  // ── Navigation — hard-coded keyword map, bypasses AI entirely ────────────
  // Each entry: word-boundary test on `t` so substrings don't false-match.
  // Ordering matters: more specific patterns before broad ones.

  // WorkoutActive (must come before Train)
  if (/start (a |the )?workout|begin (a |my )?workout|let('?s| us) work(out| out)/.test(t))
    return { type: 'NAVIGATE', screen: 'WorkoutActive' };

  // Home
  if (/\b(home|dashboard|main)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Home' };

  // Profile — includes 'video' / 'file' (common Whisper hallucinations for "Profile")
  if (/\b(profile|account|settings|video|file)\b/.test(t) ||
      /^pro\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Profile' };

  // Fuel — 'eat' word-boundary safe; 'fell'/'full' are Whisper phonetics for "fuel"
  if (/\b(fuel|nutrition|food|meals?|eating|eat|diet|fell|macros?|calories)\b/.test(t) ||
      /go to (fuel|nutrition|food)|open (fuel|nutrition|food)|what.*eat/i.test(t))
    return { type: 'NAVIGATE', screen: 'Fuel' };

  // Insights — 'stats', 'progress', 'analysis' all route here
  if (/\b(insights?|analytics?|analysis|stats?|progress|my data)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Insights' };

  // Train — standalone 'work' word-boundary matches "work" but not "workout" (caught above)
  if (/\b(train|training|workout|workouts|exercise|gym|lift|work)\b/.test(t))
    return { type: 'NAVIGATE', screen: 'Train' };

  // Data logging
  if (/how am i doing|my stats|daily summary|today.?s (progress|summary)|check in/.test(t))
    return { type: 'SPEAK_SUMMARY' };

  if (/log (my |my water |water)|add water|drank( water)?|had water|drink water/.test(t)) {
    const mlMatch = t.match(/(\d+)\s*(ml|milliliter)/);
    return { type: 'LOG_WATER', amount: mlMatch ? parseInt(mlMatch[1]) : 250 };
  }

  if (/log sleep|i slept|slept \d|(\d+) hours? sleep/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_SLEEP', hours: m ? parseFloat(m[1]) : 7 };
  }

  if (/i weigh|my weight (is|was)|weigh(ing|s)? (\d)/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_WEIGHT', weight_kg: m ? parseFloat(m[1]) : null };
  }

  if (/body fat|fat percentage|fat percent|fat is (\d)/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_METRIC', body_fat: m ? parseFloat(m[1]) : null };
  }

  if (/log (my )?food|i ate|i had|i just ate|log (a |some |my )?meal|log (my )?(breakfast|lunch|dinner|snack)/.test(t)) {
    const calM  = t.match(/(\d+)\s*(kcal|cal(?:orie)?s?)/);
    const proM  = t.match(/(\d+)\s*g?\s*protein/);
    const carbM = t.match(/(\d+)\s*g?\s*carb/);
    const fatM  = t.match(/(\d+)\s*g?\s*fat/);
    const mealM = t.match(/\b(breakfast|lunch|dinner|snack)\b/);
    const nameM = t.match(/(?:ate|had|eat|log(?:ged)?)\s+(?:a |some |my )?([a-z ]+?)(?:\s*[-–,]|\s+\d|\s*$)/);
    return {
      type:      'LOG_FOOD',
      name:      nameM?.[1]?.trim() || 'food',
      calories:  calM  ? parseInt(calM[1])  : 0,
      protein_g: proM  ? parseInt(proM[1])  : 0,
      carbs_g:   carbM ? parseInt(carbM[1]) : 0,
      fat_g:     fatM  ? parseInt(fatM[1])  : 0,
      meal_type: mealM?.[1] ?? 'snack',
    };
  }

  if (/how many steps|steps today|my steps|step count/.test(t))
    return { type: 'SPEAK_STEPS' };

  if (/how am i doing|my stats|daily summary|today.?s (progress|summary)|check in|status/.test(t))
    return { type: 'CHECK_STATUS' };

  if (t.includes('fat') || t.includes('lose') || t.includes('loose') || t.includes('weight loss'))
    return { type: 'FAT_LOSS' };

  if (/stop listening|go to sleep|mute|silence|be quiet|stop alexi/.test(t))
    return { type: 'MUTE' };

  if (/\b(explain|how does|what is|why does|tell me about|describe in detail|give me a (full|detailed))\b/i.test(t))
    return { type: 'OPEN_CHAT', query: text };

  return { type: 'AI_QUERY', query: text };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AlexiVoiceProvider({ children }) {
  const [passiveState,   setPassiveState]   = useState('idle');
  const [isMuted,        setIsMuted]        = useState(false);
  const [permGranted,    setPermGranted]    = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [debugLog,       setDebugLog]       = useState('Initializing…');
  const [isAlexiVisible, setIsAlexiVisible] = useState(false);
  const [responseText,   setResponseText]   = useState('');

  const loopRef           = useRef(false);
  const loopGenRef        = useRef(0);
  const pausedRef         = useRef(false);
  const mutedRef          = useRef(false);
  const userNameRef       = useRef(null);
  const appStateRef       = useRef(AppState.currentState);
  const hideTimerRef      = useRef(null);
  const isMountedRef      = useRef(true);
  const isAlexiVisibleRef = useRef(false);

  const logState = (s) => { setPassiveState(s); };

  // ── Animations ────────────────────────────────────────────────────────────
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const borderAnim  = useRef(new Animated.Value(0)).current;
  const borderScale = useRef(new Animated.Value(1.04)).current;
  const siriGlow    = useRef(new Animated.Value(0)).current;
  const earDotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { isAlexiVisibleRef.current = isAlexiVisible; }, [isAlexiVisible]);

  useEffect(() => {
    if (passiveState === 'capturing') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim,   { toValue: 1.45, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim,   { toValue: 1.0,  duration: 850, useNativeDriver: true }),
      ]));
      const earLoop = Animated.loop(Animated.sequence([
        Animated.timing(earDotScale, { toValue: 1.6, duration: 600, useNativeDriver: true }),
        Animated.timing(earDotScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]));
      loop.start(); earLoop.start();
      return () => { loop.stop(); earLoop.stop(); };
    }
    pulseAnim.setValue(1);
    earDotScale.setValue(1);
  }, [passiveState]);

  useEffect(() => {
    Animated.timing(siriGlow, {
      toValue: isAlexiVisible ? 1 : 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [isAlexiVisible]);

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

  // ── Visibility helpers ────────────────────────────────────────────────────
  const showAlexi = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setIsAlexiVisible(true);
  }, []);

  const hideAlexi = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setIsAlexiVisible(false);
  }, []);

  const hideAlexiAfter = useCallback((ms = ALEXI_AUTOHIDE_MS) => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setIsAlexiVisible(false), ms);
  }, []);

  // ── Mute pref ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then(val => {
      const muted = val === 'true';
      mutedRef.current = muted;
      setIsMuted(muted);
    });
  }, []);

  // ── User first name ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle();
        const raw   = profile?.first_name || profile?.full_name || '';
        const first = raw.split(' ')[0].trim();
        if (first) userNameRef.current = first;
      } catch (_) {}
    })();
  }, []);

  // ── speak() ───────────────────────────────────────────────────────────────
  // a) Stop the mic (with 400 ms gap so hardware releases)
  // b) Switch session to playback — allowsRecordingIOS:false routes TTS to
  //    the speaker; playsInSilentModeIOS:true works in Silent/Vibrate mode;
  //    interruptionModeIOS:1 (DoNotMix) is the most aggressive speaker override.
  // c) Speak, then restore RECORDING_MODE before returning so the loop can
  //    start the next recording chunk immediately.
  const speak = (text) => new Promise(async (resolve) => {
    try {
      Speech.stop();
      await stopAnyRecording();   // stop mic + 400 ms hardware release gap
      logState('speaking');
      setResponseText(text);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:         false,
          playsInSilentModeIOS:       true,
          staysActiveInBackground:    true,
          interruptionModeIOS:        1,
          shouldDuckAndroid:          true,
          interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        });
      } catch (_) {}

      const done = async () => {
        await new Promise(r => setTimeout(r, 500));
        try { await Audio.setAudioModeAsync(RECORDING_MODE); } catch (_) {}
        logState('idle');
        resolve();
      };

      Speech.speak(text, {
        language: 'en-US', pitch: 1.0, rate: 1.0,
        onDone:    done,
        onStopped: done,
        onError:   () => done(),
      });
    } catch (_) {
      resolve();
    }
  });

  // ── transcribeURI ─────────────────────────────────────────────────────────
  const transcribeURI = async (uri) => {
    setDebugLog('Transcribing…');
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    } catch (e) {
      throw new Error(`File read failed: ${e.message}`);
    }

    let data, error;
    try {
      ({ data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          audioBase64:   base64,
          mimeType:      'audio/m4a',
          minConfidence: MIN_CONFIDENCE,
          userName:      userNameRef.current ?? undefined,
        },
      }));
    } catch (netErr) {
      throw new Error(`Network error: ${netErr.message}`);
    }

    if (error) throw new Error(`Supabase error: ${error.message}`);

    const transcript = (data?.transcript ?? '').trim();
    setLastTranscript(transcript);
    setDebugLog(`Heard: "${transcript || '(silence)'}" `);
    return transcript;
  };

  // ── executeCommand ────────────────────────────────────────────────────────
  const executeCommand = useCallback(async (commandText) => {
    if (!commandText?.trim()) return;
    const cmd = parseCommand(commandText);
    setDebugLog(`CMD: ${cmd.type}`);
    AlexiEvents.emit('command', cmd);

    switch (cmd.type) {

      case 'SHOW_INSTRUCTIONS':
        await speak('Showing you the form now.');
        hideAlexiAfter(ALEXI_AUTOHIDE_MS);
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
        } catch (_) {
          await speak("I couldn't pull your stats right now.");
        }
        hideAlexiAfter();
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
          else    await supabase.from('daily_activity').insert({ user_id: user.id, date: TODAY, water_ml: newMl });
          AlexiEvents.emit('dataUpdated', { type: 'water', value: newMl });
          playConfirmSound();
          const name = userNameRef.current;
          await speak(`Logged ${cmd.amount} millilitres of water for you${name ? `, ${name}` : ''}! That's ${newMl} millilitres total today. Keep it up!`);
        } catch (_) {
          await speak("Sorry, I couldn't log your water right now.");
        }
        hideAlexiAfter();
        break;
      }

      case 'LOG_SLEEP': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          await supabase.from('daily_activity')
            .upsert({ user_id: user.id, date: TODAY, sleep_hours: cmd.hours }, { onConflict: 'user_id,date' });
          AlexiEvents.emit('dataUpdated', { type: 'sleep', value: cmd.hours });
          playConfirmSound();
          const name = userNameRef.current;
          await speak(`Logged ${cmd.hours} hours of sleep${name ? ` for you, ${name}` : ''}. Rest is where the gains happen!`);
        } catch (_) {
          await speak("Sorry, I couldn't log your sleep.");
        }
        hideAlexiAfter();
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
        } catch (_) {
          await speak("I couldn't get your step count right now.");
        }
        hideAlexiAfter();
        break;
      }

      case 'MUTE':
        await speak("I'll go quiet. Tap my icon whenever you need me.");
        hideAlexi();
        await setMutedState(true);
        break;

      case 'NAVIGATE': {
        const labels = {
          Home: 'home', Profile: 'your profile', Fuel: 'nutrition',
          Insights: 'your insights', Train: 'training', WorkoutActive: 'your workout',
        };
        await speak(`Opening ${labels[cmd.screen] ?? cmd.screen}.`);
        AlexiEvents.emit('navigate', { screen: cmd.screen });
        hideAlexiAfter(3000);
        break;
      }

      case 'LOG_WEIGHT': {
        if (!cmd.weight_kg) { await speak("I didn't catch your weight. Try again."); hideAlexiAfter(); break; }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          await supabase.from('body_metrics').insert({
            user_id: user.id, weight_kg: cmd.weight_kg,
            logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit('dataUpdated', { type: 'weight', value: cmd.weight_kg });
          playConfirmSound();
          const name = userNameRef.current;
          await speak(`Got it${name ? `, ${name}` : ''} — logged your weight at ${cmd.weight_kg} kilograms.`);
        } catch (_) {
          await speak("Sorry, I couldn't log your weight right now.");
        }
        hideAlexiAfter();
        break;
      }

      case 'LOG_METRIC': {
        if (!cmd.body_fat) { await speak("I didn't catch the value. Try again."); hideAlexiAfter(); break; }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          await supabase.from('body_metrics').insert({
            user_id: user.id, body_fat_pct: cmd.body_fat,
            logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit('dataUpdated', { type: 'body_fat', value: cmd.body_fat });
          playConfirmSound();
          const name = userNameRef.current;
          await speak(`Logged your body fat at ${cmd.body_fat} percent${name ? `, ${name}` : ''}. Keep tracking!`);
        } catch (_) {
          await speak("Sorry, I couldn't log that right now.");
        }
        hideAlexiAfter();
        break;
      }

      case 'LOG_FOOD': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const NOW_TS = new Date().toISOString();
          let foodId = null;
          const { data: existing } = await supabase
            .from('foods').select('id').ilike('name', cmd.name).maybeSingle();
          if (existing) {
            foodId = existing.id;
          } else {
            const { data: newFood } = await supabase.from('foods').insert({
              name: cmd.name,
              calories_per_100g: cmd.calories ?? 0,
              protein_per_100g:  cmd.protein_g ?? 0,
              carbs_per_100g:    cmd.carbs_g ?? 0,
              fat_per_100g:      cmd.fat_g ?? 0,
              source: 'alexi_voice',
            }).select('id').single();
            foodId = newFood?.id ?? null;
          }
          if (foodId) {
            await supabase.from('food_logs').insert({
              user_id:        user.id,
              food_id:        foodId,
              consumed_at:    NOW_TS,
              meal_type:      cmd.meal_type ?? 'snack',
              quantity_grams: 100,
            });
          }
          AlexiEvents.emit('dataUpdated', { type: 'food', name: cmd.name, calories: cmd.calories ?? 0, protein: cmd.protein_g ?? 0 });
          playConfirmSound();
          const name     = userNameRef.current;
          const kcalStr  = cmd.calories  ? ` — ${cmd.calories} calories`  : '';
          const proStr   = cmd.protein_g ? `, ${cmd.protein_g}g protein`  : '';
          await speak(`Logged ${cmd.name}${kcalStr}${proStr}${name ? `. Nice work, ${name}` : '. Nice'}.`);
        } catch (_) {
          await speak("Sorry, I couldn't log that food.");
        }
        hideAlexiAfter();
        break;
      }

      case 'CHECK_STATUS': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const [{ data: act }, { data: xpRows }] = await Promise.all([
            supabase.from('daily_activity').select('steps, water_ml, sleep_hours')
              .eq('user_id', user.id).eq('date', TODAY).maybeSingle(),
            supabase.from('xp_log').select('amount')
              .eq('user_id', user.id)
              .gte('earned_at', new Date(Date.now() - 7 * 86400000).toISOString()),
          ]);
          const steps  = act?.steps       ?? 0;
          const water  = act?.water_ml    ?? 0;
          const sleep  = act?.sleep_hours ?? 0;
          const weekXP = (xpRows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
          await speak(
            `Today: ${steps.toLocaleString()} steps, ${water}ml water` +
            (sleep > 0 ? `, ${sleep}h sleep` : '') +
            `. This week you earned ${weekXP} XP. Keep it up!`
          );
        } catch (_) {
          await speak("I couldn't pull your stats right now.");
        }
        hideAlexiAfter();
        break;
      }

      case 'FAT_LOSS':
        await speak("To lose fat, focus on a calorie deficit, high protein intake, and consistent training. Want me to open your training plan?");
        hideAlexiAfter();
        break;

      case 'OPEN_CHAT':
        await speak("On it.");
        AlexiEvents.emit('open_chat', { query: cmd.query });
        break;

      case 'AI_QUERY': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const uid = user?.id ?? null;
          const { data: aiData, error: aiErr } = await supabase.functions.invoke('ai-assistant', {
            body: { query: cmd.query, voiceMode: true, userId: uid },
          });
          if (aiErr || !aiData?.response) {
            await speak("I couldn't reach my brain. Check your connection and try again.");
            hideAlexiAfter();
            break;
          }
          if (aiData.navigateTo) {
            AlexiEvents.emit('navigate', { screen: aiData.navigateTo });
            await speak(`Opening ${aiData.navigateTo.toLowerCase()}.`);
            hideAlexiAfter(3000);
            break;
          }
          if (aiData.executed?.length > 0) {
            AlexiEvents.emit('dataUpdated', { executed: aiData.executed });
            playConfirmSound();
          }
          await speak(aiData.response);
          hideAlexiAfter(3000);
        } catch (_) {
          await speak("Something went wrong. Try again.");
          hideAlexiAfter();
        }
        break;
      }

      default:
        hideAlexiAfter();
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Passive listening loop ────────────────────────────────────────────────
  // Simple 3-second chunking loop:
  //   start recording → wait 3 s → stop + 500 ms gap → transcribe → process → repeat
  // No busy-flag blocking. The 400 ms gap after stopAndUnloadAsync is the only
  // protection needed against iOS AVAudioSession hardware conflicts.
  const runPassiveLoop = useCallback(async () => {
    const myGen = ++loopGenRef.current;
    const alive = () => loopGenRef.current === myGen && isMountedRef.current;

    // Permissions check
    let perm = { status: 'undetermined' };
    try { perm = await Audio.getPermissionsAsync(); } catch (_) {}
    if (perm.status !== 'granted') {
      const req = await Audio.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      setPermGranted(req.status === 'granted');
      if (req.status !== 'granted') {
        logState('no_permission');
        setDebugLog('Microphone permission denied');
        Alert.alert(
          'Microphone Required',
          'Enable microphone access for Alexi in Settings → BodyQ → Microphone.',
          [{ text: 'OK' }],
        );
        return;
      }
    } else {
      setPermGranted(true);
    }

    // Brief gap so any previous session fully releases hardware
    await new Promise(r => setTimeout(r, 800));
    if (!alive()) return;

    logState('listening');

    let silentChunks = 0;

    while (alive() && !mutedRef.current) {
      // Paused spin
      if (pausedRef.current) {
        logState('paused');
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // ── 1. Start a fresh 3-second recording chunk ────────────────────────
      console.log('[Alexi] Recording Chunk...');
      logState('listening');

      let rec;
      try {
        await Audio.setAudioModeAsync(RECORDING_MODE);
        // createAsync is the most reliable API — handles prepare + start atomically
        const { recording } = await Audio.Recording.createAsync(REC_OPTIONS);
        _rec = recording;
        rec  = recording;
      } catch (e) {
        _rec = null;
        // Mandatory delay before retry — prevents tight spam loop on hardware error
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // ── 2. Record for exactly 3 seconds ──────────────────────────────────
      await new Promise(res => setTimeout(res, 3000));
      if (!alive()) { await stopAnyRecording(); break; }

      // ── 3. Stop + mandatory 500 ms hardware release gap ──────────────────
      _rec = null;
      let uri;
      try {
        await rec.stopAndUnloadAsync();
        await new Promise(res => setTimeout(res, 500));
        uri = rec.getURI();
      } catch (_) {
        await new Promise(res => setTimeout(res, 500));
        continue;
      }
      if (!uri) continue;

      // ── 4. Transcribe ─────────────────────────────────────────────────────
      console.log('[Alexi] Transcribing...');
      logState('transcribing');
      let transcript = '';
      try { transcript = await transcribeURI(uri); }
      catch (_) { logState('listening'); continue; }

      // ── 5. Fuzzy snap — fix common Whisper hallucinations ─────────────────
      // Applied BEFORE wake-word check so nav-snaps work even without wake word.
      if (transcript) {
        const tl = transcript.toLowerCase();
        if (tl.includes('video') || tl.includes('file') || tl.startsWith('pro')) {
          transcript = 'Profile';
        } else if (tl.includes('fell') || (tl.includes('fuel') && tl.length < 8)) {
          transcript = 'Fuel';
        }
      }

      console.log('[Alexi] Heard:', transcript || '(silence)');

      // ── 5. Empty / junk → keep orbit spinning, never flash-hide ──────────
      const lower     = transcript?.toLowerCase().trim() ?? '';
      const snapped   = lower ? snapShortTranscript(lower) : lower;
      const isNavSnap = snapped !== lower;
      const hasWake   = /\b(alexi|alexie|alexey|alexy|lex)\b/i.test(lower);
      const wordCount = lower.split(/\s+/).filter(Boolean).length;

      if (!lower || (wordCount <= 2 && !isNavSnap && !hasWake)) {
        // Silence: count chunks and hide only after prolonged silence
        if (isAlexiVisibleRef.current) {
          silentChunks++;
          if (silentChunks >= SILENCE_HIDE_CHUNKS) {
            hideAlexi();
            silentChunks = 0;
          }
        }
        logState('listening');
        continue;
      }
      silentChunks = 0;

      // ── 6. Wake word / nav-snap check ─────────────────────────────────────
      const wakeMatch = lower.match(/\b(alexi|alexie|alexey|alexy|lex)\b/i);
      if (!wakeMatch && !isNavSnap && !isAlexiVisibleRef.current) {
        logState('listening');
        continue;
      }

      // ── 7. Wake! — haptic + show mascot ───────────────────────────────────
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      flashBorder();
      setIsAlexiVisible(true);
      logState('activated');
      const wakeTimestamp = Date.now();

      const ensureMinVisible = async () => {
        const elapsed = Date.now() - wakeTimestamp;
        if (elapsed < MIN_VISIBLE_MS) await new Promise(r => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      };

      // Nav-snap without wake word → execute immediately
      if (isNavSnap && !hasWake) {
        console.log('[Alexi] Action: Navigate', snapped);
        await executeCommand(snapped);
        await ensureMinVisible();
        hideAlexiAfter(ALEXI_AUTOHIDE_MS);
        logState('listening');
        continue;
      }

      const rawCommand = wakeMatch
        ? lower.slice(lower.indexOf(wakeMatch[1]) + wakeMatch[1].length).replace(/^[,.\s!?]+/, '').trim()
        : lower;
      const commandText = snapShortTranscript(rawCommand);

      if (commandText.split(/\s+/).filter(Boolean).length >= 2) {
        // Inline command: "Alexi, go to fuel"
        console.log('[Alexi] Action:', commandText);
        await executeCommand(commandText);
      } else {
        // Bare "Alexi" — ask then record command window
        await speak('Yes?');
        if (!alive()) break;

        logState('capturing');

        // Record CMD_LISTEN_MS window for the follow-up command
        let cmdRec;
        try {
          await Audio.setAudioModeAsync(RECORDING_MODE);
          const { recording: cr } = await Audio.Recording.createAsync(REC_OPTIONS);
          _rec = cr;
          cmdRec = cr;
        } catch (_) { await ensureMinVisible(); hideAlexiAfter(); continue; }

        await new Promise(r => setTimeout(r, CMD_LISTEN_MS));
        if (!alive()) { await stopAnyRecording(); break; }

        _rec = null;
        let cmdUri;
        try {
          await cmdRec.stopAndUnloadAsync();
          await new Promise(res => setTimeout(res, 500));
          cmdUri = cmdRec.getURI();
        } catch (_) {}

        if (cmdUri) {
          logState('transcribing');
          const rawCmdTx = await transcribeURI(cmdUri).catch(() => '');
          const cmdTx    = snapShortTranscript(rawCmdTx);
          if (cmdTx) {
            console.log('[Alexi] Action:', cmdTx);
            await executeCommand(cmdTx);
          }
        }
      }

      await ensureMinVisible();
      hideAlexiAfter(ALEXI_AUTOHIDE_MS);
      logState('listening');
    }

    await stopAnyRecording();
    setIsAlexiVisible(false);
    logState('idle');
  }, [executeCommand, flashBorder, hideAlexiAfter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────────────────
  const startPassive = useCallback(async () => {
    if (mutedRef.current) return;
    loopGenRef.current++;   // invalidate any running loop generation
    // runPassiveLoop's startup gap handles any leftover hardware state
    loopRef.current   = true;
    pausedRef.current = false;
    runPassiveLoop();
  }, [runPassiveLoop]);

  const stopPassive = useCallback(async () => {
    loopRef.current = false;
    loopGenRef.current++;
    await stopAnyRecording();
    Speech.stop();
    setIsAlexiVisible(false);
    logState('idle');
    setDebugLog('Stopped');
  }, []);

  const pausePassive = useCallback(async () => {
    pausedRef.current = true;
    await stopAnyRecording();
    logState('paused');
    setDebugLog('Paused');
  }, []);

  const resumePassive = useCallback(() => {
    if (!mutedRef.current) {
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
      loopGenRef.current++;
      await stopAnyRecording();
      Speech.stop();
      logState('muted');
      setDebugLog('Muted by user');
    } else {
      setDebugLog('Unmuted — starting listener');
      loopRef.current   = true;
      pausedRef.current = false;
      runPassiveLoop();
    }
  }, [runPassiveLoop]);

  // ── Press-to-talk (fallback) ───────────────────────────────────────────────
  // Called by AlexiAssistant on long-press. Kills passive loop, records one
  // CMD_LISTEN_MS window, executes the result, then restarts passive loop.
  const talkToAlexi = useCallback(async () => {
    if (mutedRef.current) return;
    loopGenRef.current++;   // stop passive loop
    await stopAnyRecording();

    showAlexi();
    await speak("I'm listening…");

    logState('capturing');

    try {
      await Audio.setAudioModeAsync(RECORDING_MODE);
      const { recording: rec } = await Audio.Recording.createAsync(REC_OPTIONS);
      _rec = rec;

      await new Promise(r => setTimeout(r, CMD_LISTEN_MS));

      _rec = null;
      let uri;
      try {
        await rec.stopAndUnloadAsync();
        await new Promise(res => setTimeout(res, 500));
        uri = rec.getURI();
      } catch (_) {}

      if (uri) {
        logState('transcribing');
        const tx = await transcribeURI(uri).catch(() => '');
        console.log('[Alexi] Heard:', tx || '(silence)');
        if (tx) {
          const lower     = tx.toLowerCase().trim();
          const wakeMatch = lower.match(/\b(alexi|alexie|alexey|alexy|lex)\b/i);
          const cmdText   = snapShortTranscript(wakeMatch
            ? lower.slice(lower.indexOf(wakeMatch[1]) + wakeMatch[1].length).replace(/^[,.\s!?]+/, '').trim()
            : lower);
          if (cmdText) {
            console.log('[Alexi] Action:', cmdText);
            await executeCommand(cmdText);
          }
        }
      }
    } catch (_) {}

    hideAlexiAfter(ALEXI_AUTOHIDE_MS);

    // Restart passive loop
    if (!mutedRef.current && isMountedRef.current) {
      loopRef.current   = true;
      pausedRef.current = false;
      runPassiveLoop();
    }
  }, [executeCommand, showAlexi, hideAlexiAfter, runPassiveLoop]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Profile gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabase
          .from('profiles').select('onboarded').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        if (profile?.onboarded !== true && loopRef.current) stopPassive();
      } catch (_) {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [stopPassive]);

  // ── AppState — auto-pause in background ───────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const isActive  = nextState === 'active';
      appStateRef.current = nextState;
      if (wasActive && !isActive && loopRef.current && !pausedRef.current) {
        await pausePassive();
      } else if (!wasActive && isActive && loopRef.current && !mutedRef.current) {
        resumePassive();
      }
    });
    return () => sub.remove();
  }, [pausePassive, resumePassive]);

  // ── Auto-start on mount ───────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    const t = setTimeout(async () => {
      if (mutedRef.current) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMountedRef.current) return;
        const { data: profile } = await supabase
          .from('profiles').select('onboarded').eq('id', user.id).maybeSingle();
        if (profile?.onboarded !== true) return;
      } catch (_) {}
      if (isMountedRef.current && !mutedRef.current) startPassive();
    }, 1500);
    return () => {
      isMountedRef.current = false;
      clearTimeout(t);
      clearTimeout(hideTimerRef.current);
      loopRef.current = false;
      loopGenRef.current++;
      stopAnyRecording();
      Speech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    passiveState,
    isMuted,
    permGranted,
    lastTranscript,
    responseText,
    debugLog,
    isAlexiVisible,
    pulseAnim,
    borderAnim,
    borderScale,
    siriGlow,
    earDotScale,
    flashBorder,
    showAlexi,
    hideAlexi,
    hideAlexiAfter,
    startPassive,
    stopPassive,
    pausePassive,
    resumePassive,
    setMutedState,
    executeCommand,
    talkToAlexi,
  };

  return (
    <AlexiVoiceContext.Provider value={value}>
      {children}
    </AlexiVoiceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAlexiVoice() {
  const ctx = useContext(AlexiVoiceContext);
  if (!ctx) throw new Error('useAlexiVoice must be used inside <AlexiVoiceProvider>');
  return ctx;
}

// ─── Debug overlay ────────────────────────────────────────────────────────────
export function AlexiDebugOverlay() {
  const { passiveState, lastTranscript, debugLog, isAlexiVisible } = useAlexiVoice();
  if (!DEBUG_OVERLAY) return null;

  const stateColor =
    passiveState === 'listening'    ? '#4488FF' :
    passiveState === 'capturing'    ? '#C6FF33' :
    passiveState === 'transcribing' ? '#FFC832' :
    passiveState === 'activated'    ? '#FFFFFF' :
    passiveState === 'speaking'     ? '#9B7FFF' :
    passiveState === 'error'        ? '#FF6464' :
    passiveState === 'no_permission'? '#FF6464' :
    passiveState === 'muted'        ? '#FF8C00' :
    '#8B82AD';

  return (
    <View style={dbgStyles.wrap} pointerEvents="none">
      <View style={dbgStyles.row}>
        <View style={[dbgStyles.dot, { backgroundColor: stateColor }]} />
        <Text style={[dbgStyles.state, { color: stateColor }]}>
          {passiveState.toUpperCase()}
        </Text>
        {isAlexiVisible && (
          <Text style={[dbgStyles.state, { color: '#C6FF33', marginLeft: 6 }]}>VISIBLE</Text>
        )}
      </View>
      <Text style={dbgStyles.line} numberOfLines={2}>{debugLog}</Text>
      {lastTranscript ? (
        <Text style={dbgStyles.transcript} numberOfLines={2}>
          🗣 "{lastTranscript}"
        </Text>
      ) : null}
    </View>
  );
}

const dbgStyles = StyleSheet.create({
  wrap: {
    position:         'absolute',
    top:              50,
    left:             10,
    right:            10,
    backgroundColor:  'rgba(0,0,0,0.78)',
    borderRadius:     10,
    padding:          10,
    zIndex:           99999,
    borderWidth:      1,
    borderColor:      'rgba(198,255,51,0.3)',
  },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  state:      { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  line:       { color: '#C8BFEE', fontSize: 10, lineHeight: 14 },
  transcript: { color: '#C6FF33', fontSize: 10, marginTop: 4, lineHeight: 14 },
});

// ─── Screen border flash ──────────────────────────────────────────────────────
export function AlexiScreenBorder() {
  const { borderAnim, borderScale } = useAlexiVoice();
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

const borderStyles = StyleSheet.create({
  frame: {
    position:      'absolute',
    top:           0, left: 0,
    width:         SW, height: SH,
    borderWidth:   3,
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
export function AlexiSiriGlow() {
  const { siriGlow, isAlexiVisible } = useAlexiVoice();

  const speakPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isAlexiVisible) { speakPulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(speakPulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
      Animated.timing(speakPulse, { toValue: 0.85, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isAlexiVisible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        glowStyles.bar,
        { opacity: siriGlow, transform: [{ scaleX: speakPulse }] },
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
export function AlexiEarDot() {
  const { passiveState, earDotScale, showAlexi, hideAlexiAfter } = useAlexiVoice();

  const isActive = ['listening', 'capturing', 'transcribing', 'activated', 'speaking'].includes(passiveState);
  if (!isActive) return null;

  const dotOpacity = (passiveState === 'capturing' || passiveState === 'listening') ? 1 : 0.45;
  const dotColor   =
    passiveState === 'speaking'     ? '#9B7FFF' :
    passiveState === 'transcribing' ? '#FFC832' :
    passiveState === 'listening'    ? '#4488FF' : '#C6FF33';

  const handleManualWake = () => {
    showAlexi();
    Speech.speak("Yes?", { language: 'en-US', pitch: 1.15, rate: 0.95 });
    hideAlexiAfter(7000);
  };

  return (
    <TouchableOpacity onPress={handleManualWake} activeOpacity={0.7} style={earStyles.hitArea}>
      <Animated.View
        style={[
          earStyles.dot,
          {
            opacity:         dotOpacity,
            backgroundColor: dotColor,
            shadowColor:     dotColor,
            transform:       [{ scale: passiveState === 'listening' ? earDotScale : 1 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const earStyles = StyleSheet.create({
  hitArea: {
    position:       'absolute',
    top:            6,
    right:          6,
    width:          32,
    height:         32,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         99998,
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
export function AlexiVoiceOrb({ style }) {
  const { passiveState, isMuted, pulseAnim, resumePassive, startPassive, setMutedState } = useAlexiVoice();

  const handlePress = () => {
    if (isMuted)                                                setMutedState(false);
    else if (passiveState === 'paused')                         resumePassive();
    else if (passiveState === 'idle'   ||
             passiveState === 'error'  ||
             passiveState === 'no_permission')                  startPassive();
  };

  const isListening    = passiveState === 'listening';
  const isTranscribing = passiveState === 'transcribing';
  const isActivated    = passiveState === 'activated';
  const isSpeaking     = passiveState === 'speaking';

  const orbBg =
    isMuted             ? 'rgba(255,80,80,0.10)'   :
    isListening || isActivated ? 'rgba(198,255,51,0.15)' :
    isTranscribing      ? 'rgba(255,200,50,0.15)'  :
    isSpeaking          ? 'rgba(130,80,255,0.18)'  :
    'rgba(255,255,255,0.05)';

  const orbBorder =
    isMuted             ? 'rgba(255,80,80,0.45)'   :
    isListening || isActivated ? 'rgba(198,255,51,0.65)' :
    isTranscribing      ? 'rgba(255,200,50,0.55)'  :
    isSpeaking          ? 'rgba(130,80,255,0.65)'  :
    'rgba(255,255,255,0.18)';

  const iconColor =
    isMuted        ? '#FF6464' :
    isListening || isActivated ? '#C6FF33' :
    isTranscribing ? '#FFC832' :
    isSpeaking     ? '#9B7FFF' :
    '#555';

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

// ─── Alexi Companion — persistent floating mascot ────────────────────────────
// States → visuals:
//   idle / listening   → static avatar, no rings, no text
//   activated/capturing→ Siri orb: 3 rotating arcs + breathing + green glow bg
//   transcribing       → same orb (still processing)
//   speaking           → purple glow pulse + speech bubble
export function AlexiCompanion() {
  const { passiveState, responseText, setMutedState, isMuted, talkToAlexi } = useAlexiVoice();

  // isOrb = full Siri orb (wake word / transcribing)
  // isListening = subtle outer pulse (passive mic is live)
  // isSpeaking  = purple glow + speech bubble
  // idle/muted  = completely static
  const isOrb       = ['activated', 'capturing', 'transcribing'].includes(passiveState);
  const isListening = passiveState === 'listening';
  const isSpeaking  = passiveState === 'speaking';

  // ── Shared animation values ──────────────────────────────────────────────
  const avatarSc  = useSharedValue(1);
  // Full-orb arc rotation (activated / capturing / transcribing)
  const rot1      = useSharedValue(0);
  const rot2      = useSharedValue(0);
  const rot3      = useSharedValue(0);
  const sc1       = useSharedValue(1);
  const sc2       = useSharedValue(1);
  const sc3       = useSharedValue(1);
  const glowBgOp  = useSharedValue(0);
  // Listening heartbeat — single outer ring, very subtle
  const listenSc  = useSharedValue(1);
  const listenOp  = useSharedValue(0);
  // Speaking glow
  const speakOp   = useSharedValue(0);
  const speakSc   = useSharedValue(1);
  // Speech bubble + success flash
  const bubbleOp  = useSharedValue(0);
  const successOp = useSharedValue(0);

  useEffect(() => {
    // ── Reset everything ───────────────────────────────────────────────────
    cancelAnimation(avatarSc); avatarSc.value = withTiming(1, { duration: 200 });
    cancelAnimation(rot1);     rot1.value = 0;
    cancelAnimation(rot2);     rot2.value = 0;
    cancelAnimation(rot3);     rot3.value = 0;
    cancelAnimation(sc1);      sc1.value = 1;
    cancelAnimation(sc2);      sc2.value = 1;
    cancelAnimation(sc3);      sc3.value = 1;
    cancelAnimation(glowBgOp); glowBgOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(listenSc); listenSc.value = 1;
    cancelAnimation(listenOp); listenOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(speakOp);  speakOp.value  = withTiming(0, { duration: 250 });
    cancelAnimation(speakSc);  speakSc.value  = 1;

    if (isListening) {
      // ── Heartbeat: single outer ring expands and fades slowly ─────────
      // Opacity 0→0.22→0, scale 1→1.55→1 — very subtle, shows mic is alive.
      listenOp.value = withRepeat(withSequence(
        withTiming(0.22, { duration: 1400 }),
        withTiming(0.00, { duration: 1400 }),
      ), -1, false);
      listenSc.value = withRepeat(withSequence(
        withTiming(1.55, { duration: 1400 }),
        withTiming(1.00, { duration: 1400 }),
      ), -1, false);

    } else if (isOrb) {
      // ── Siri orb: 3 arcs rotating at distinct speeds ──────────────────
      rot1.value = withRepeat(withTiming( 360, { duration: 2400, easing: Easing.linear }), -1, false);
      rot2.value = withRepeat(withTiming(-360, { duration: 3800, easing: Easing.linear }), -1, false);
      rot3.value = withRepeat(withTiming( 360, { duration: 6000, easing: Easing.linear }), -1, false);

      // Staggered breathing — wave across all 3 rings
      sc1.value = withRepeat(withSequence(
        withTiming(1.09, { duration:  700 }),
        withTiming(1.00, { duration:  700 }),
      ), -1, false);
      sc2.value = withDelay(233, withRepeat(withSequence(
        withTiming(1.07, { duration: 1050 }),
        withTiming(1.00, { duration: 1050 }),
      ), -1, false));
      sc3.value = withDelay(466, withRepeat(withSequence(
        withTiming(1.05, { duration: 1400 }),
        withTiming(1.00, { duration: 1400 }),
      ), -1, false));

      glowBgOp.value = withRepeat(withSequence(
        withTiming(0.28, { duration: 1200 }),
        withTiming(0.08, { duration: 1200 }),
      ), -1, false);

      avatarSc.value = withRepeat(withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1.00, { duration: 1200 }),
      ), -1, false);

    } else if (isSpeaking) {
      // ── Purple glow pulse ─────────────────────────────────────────────
      speakOp.value = withRepeat(withSequence(
        withTiming(0.80, { duration: 500 }),
        withTiming(0.22, { duration: 500 }),
      ), -1, false);
      speakSc.value = withRepeat(withSequence(
        withTiming(1.50, { duration: 500 }),
        withTiming(1.10, { duration: 500 }),
      ), -1, false);
      avatarSc.value = withRepeat(withSequence(
        withTiming(1.08, { duration: 500 }),
        withTiming(0.97, { duration: 500 }),
      ), -1, false);
    }
    // idle / muted / error → completely static
  }, [passiveState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speech bubble: only shown while Alexi is actually speaking ───────────
  const bubbleTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(bubbleTimerRef.current);
    if (isSpeaking) {
      bubbleOp.value = withTiming(1, { duration: 180 });
      bubbleTimerRef.current = setTimeout(() => {
        bubbleOp.value = withTiming(0, { duration: 400 });
      }, 4000);
    } else {
      bubbleOp.value = withTiming(0, { duration: 300 });
    }
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Success flash on data logged ─────────────────────────────────────────
  useEffect(() => {
    const off = AlexiEvents.on('dataUpdated', () => {
      cancelAnimation(successOp);
      successOp.value = withSequence(
        withTiming(1, { duration:  10 }),
        withTiming(0, { duration: 850 }),
      );
    });
    return off;
  }, []);

  // ── Animated styles ───────────────────────────────────────────────────────
  const listenStyle  = useAnimatedStyle(() => ({
    opacity:   listenOp.value,
    transform: [{ scale: listenSc.value }],
  }));
  const ring1Style  = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot1.value}deg` }, { scale: sc1.value }],
  }));
  const ring2Style  = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot2.value}deg` }, { scale: sc2.value }],
  }));
  const ring3Style  = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot3.value}deg` }, { scale: sc3.value }],
  }));
  const glowBgStyle  = useAnimatedStyle(() => ({ opacity: glowBgOp.value }));
  const speakStyle   = useAnimatedStyle(() => ({
    opacity:   speakOp.value,
    transform: [{ scale: speakSc.value }],
  }));
  const avatarStyle  = useAnimatedStyle(() => ({ transform: [{ scale: avatarSc.value }] }));
  const bubbleStyle  = useAnimatedStyle(() => ({ opacity: bubbleOp.value }));
  const successStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  const handleTap = useCallback(() => {
    if (isMuted) setMutedState(false);
    else AlexiEvents.emit('open_chat', { query: null });
  }, [isMuted, setMutedState]);

  const handleLongPress = useCallback(() => { talkToAlexi(); }, [talkToAlexi]);

  return (
    <View pointerEvents="box-none" style={cStyles.container}>

      {/* Speech bubble — only while Alexi is speaking */}
      {isSpeaking && !!responseText && (
        <RAnimated.View pointerEvents="none" style={[cStyles.bubble, bubbleStyle]}>
          <Text style={cStyles.bubbleText} numberOfLines={3}>{responseText}</Text>
          <View style={cStyles.bubbleTail} />
        </RAnimated.View>
      )}

      {/* Listening heartbeat — single outer ring, very subtle, shows mic is live */}
      {isListening && (
        <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.listenRing, listenStyle]} />
      )}

      {/* Siri orb layer — activated / capturing / transcribing only */}
      {isOrb && (
        <>
          {/* Soft green radial glow behind the avatar */}
          <RAnimated.View pointerEvents="none" style={[cStyles.glowBg, glowBgStyle]} />

          {/* Arc 1 — neon green (#39FF14), fastest clockwise */}
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc1, ring1Style]} />

          {/* Arc 2 — cyan (#00E5FF), counter-clockwise */}
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc2, ring2Style]} />

          {/* Arc 3 — lime (#C6FF33), slowest clockwise */}
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc3, ring3Style]} />
        </>
      )}

      {/* Purple glow while speaking */}
      {isSpeaking && (
        <RAnimated.View pointerEvents="none" style={[cStyles.speakGlow, speakStyle]} />
      )}

      {/* Success ring flash (data logged) */}
      <RAnimated.View pointerEvents="none" style={[cStyles.successRing, successStyle]} />

      {/* Mascot — tap to open chat, long-press for voice command */}
      <TouchableOpacity
        onPress={handleTap}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
        delayLongPress={400}
      >
        <RAnimated.View style={[cStyles.avatarWrap, avatarStyle]}>
          <Image
            source={require('../assets/yara_spirit.png')}
            style={cStyles.avatar}
            resizeMode="cover"
          />
        </RAnimated.View>
      </TouchableOpacity>

    </View>
  );
}

// ─── AlexiCompanion styles ────────────────────────────────────────────────────
const AV = 64;   // avatar diameter
const cStyles = StyleSheet.create({
  container: {
    position:       'absolute',
    bottom:         92,
    right:          16,
    // Wide enough so rings don't clip; overflow is visible by default in RN
    width:          AV + 4,
    zIndex:         99985,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Speech bubble ───────────────────────────────────────────────────────
  bubble: {
    position:          'absolute',
    bottom:            AV + 18,
    right:             0,
    width:             184,
    backgroundColor:   'rgba(15,11,30,0.97)',
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       'rgba(198,241,53,0.22)',
    paddingHorizontal: 12,
    paddingVertical:   10,
    shadowColor:       '#C6FF33',
    shadowOpacity:     0.15,
    shadowRadius:      10,
    shadowOffset:      { width: 0, height: -2 },
    elevation:         12,
  },
  bubbleText: { color: '#E8E3FF', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  bubbleTail: {
    position:          'absolute',
    bottom:            -7,
    right:             26,
    width:             13,
    height:            13,
    backgroundColor:   'rgba(15,11,30,0.97)',
    borderRightWidth:  1,
    borderBottomWidth: 1,
    borderColor:       'rgba(198,241,53,0.22)',
    transform:         [{ rotate: '45deg' }],
  },

  // ── Siri orb rings ──────────────────────────────────────────────────────
  // Soft green radial glow behind the avatar
  glowBg: {
    position:        'absolute',
    width:           AV * 1.35,
    height:          AV * 1.35,
    borderRadius:    AV * 0.675,
    backgroundColor: '#39FF14',
    shadowColor:     '#39FF14',
    shadowOpacity:   1,
    shadowRadius:    22,
    shadowOffset:    { width: 0, height: 0 },
  },

  // Listening heartbeat ring — single lime outer ring, expands + fades slowly
  listenRing: {
    width:        AV * 1.78,
    height:       AV * 1.78,
    borderWidth:  1,
    borderColor:  '#C6FF33',
    shadowColor:  '#C6FF33',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  // Shared base for all three arc rings
  arcBase: {
    position:     'absolute',
    borderRadius: 1000,
  },

  // Arc 1: neon green, tight around avatar, asymmetric border = visible rotation
  arc1: {
    width:             AV * 1.12,
    height:            AV * 1.12,
    borderTopWidth:    2.5,
    borderRightWidth:  2.5,
    borderBottomWidth: 0,
    borderLeftWidth:   0.5,
    borderTopColor:    '#39FF14',
    borderRightColor:  '#39FF14',
    borderBottomColor: 'transparent',
    borderLeftColor:   'rgba(57,255,20,0.25)',
    shadowColor:       '#39FF14',
    shadowOpacity:     0.85,
    shadowRadius:      8,
    shadowOffset:      { width: 0, height: 0 },
    elevation:         4,
  },

  // Arc 2: cyan, medium ring, counter-rotation makes it feel multi-layered
  arc2: {
    width:             AV * 1.42,
    height:            AV * 1.42,
    borderTopWidth:    1.5,
    borderRightWidth:  0,
    borderBottomWidth: 1.5,
    borderLeftWidth:   0.5,
    borderTopColor:    '#00E5FF',
    borderRightColor:  'transparent',
    borderBottomColor: '#00E5FF',
    borderLeftColor:   'rgba(0,229,255,0.3)',
    shadowColor:       '#00E5FF',
    shadowOpacity:     0.7,
    shadowRadius:      10,
    shadowOffset:      { width: 0, height: 0 },
    elevation:         3,
  },

  // Arc 3: lime, outermost ring, slowest — anchors the whole orb
  arc3: {
    width:             AV * 1.78,
    height:            AV * 1.78,
    borderTopWidth:    1,
    borderRightWidth:  1,
    borderBottomWidth: 0,
    borderLeftWidth:   0,
    borderTopColor:    '#C6FF33',
    borderRightColor:  'rgba(198,255,51,0.5)',
    borderBottomColor: 'transparent',
    borderLeftColor:   'transparent',
    shadowColor:       '#C6FF33',
    shadowOpacity:     0.55,
    shadowRadius:      14,
    shadowOffset:      { width: 0, height: 0 },
    elevation:         2,
  },

  // ── Speaking glow ────────────────────────────────────────────────────────
  speakGlow: {
    position:        'absolute',
    width:           AV * 1.4,
    height:          AV * 1.4,
    borderRadius:    AV * 0.7,
    backgroundColor: '#9B7FFF',
    shadowColor:     '#9B7FFF',
    shadowOpacity:   0.9,
    shadowRadius:    18,
    shadowOffset:    { width: 0, height: 0 },
  },

  // ── Success ring flash ────────────────────────────────────────────────────
  successRing: {
    position:        'absolute',
    width:           AV + 14,
    height:          AV + 14,
    borderRadius:    (AV + 14) / 2,
    borderWidth:     2,
    borderColor:     '#C6FF33',
    backgroundColor: 'transparent',
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarWrap: {
    width:        AV,
    height:       AV,
    borderRadius: AV / 2,
    overflow:     'hidden',
  },
  avatar: {
    width:        AV,
    height:       AV,
    borderRadius: AV / 2,
  },
});
