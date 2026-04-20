/**
 * AlexiVoiceContext.js — Siri-Clone Architecture
 *
 * Passive loop records 3-second chunks continuously, transcribes every chunk,
 * and wakes on the fuzzy wake word "Alexi / Alex / Lexi". No silence gate —
 * every chunk is sent to Whisper so Alexi is never deaf.
 *
 * CRASH FIX: REC_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY
 *   Do NOT spread this or add custom properties. Accessing
 *   Audio.AndroidOutputFormat / Audio.IOSOutputFormat via spread is undefined
 *   in some SDK 54 builds and causes "Cannot read property 'prototype' of
 *   undefined". The plain preset is pre-resolved and always safe.
 *
 * Hardware safety:
 *   ONE Audio.Recording lives in _rec. stopAnyRecording() calls
 *   stopAndUnloadAsync() then waits a mandatory 500ms for iOS AVAudioSession
 *   to fully release the mic hardware before the next createAsync call.
 *
 * Three-layer command resolution:
 *   L1 — phonetic snap  : fix Whisper hallucinations (≤ 3 words)
 *   L2 — local regex    : navigation + logging — no network call
 *   L3 — LLM fallback   : complex queries (llama-3.1-8b-instant, ≤ 100 tok)
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  Alert, Animated, AppState, Dimensions, Image,
  StyleSheet, Text, TouchableOpacity, View,
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

// ─── Audio modes ───────────────────────────────────────────────────────────────
// DoNotMix during recording  → mic gets a clean signal, no bleed.
// allowsRecordingIOS: false during playback → forces TTS to main speaker
//   even when the phone is on Silent / Vibrate (exactly like Siri).
const RECORDING_MODE = {
  allowsRecordingIOS:         true,
  playsInSilentModeIOS:       true,
  interruptionModeIOS:        InterruptionModeIOS.DoNotMix,
  shouldDuckAndroid:          false,
  interruptionModeAndroid:    InterruptionModeAndroid.DoNotMix,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground:    false,
};

const PLAYBACK_MODE = {
  allowsRecordingIOS:         false,   // KEY: main speaker even on Silent
  playsInSilentModeIOS:       true,
  interruptionModeIOS:        InterruptionModeIOS.DuckOthers,
  shouldDuckAndroid:          true,
  interruptionModeAndroid:    InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground:    false,
};

// CRITICAL — plain preset, no spread, no custom properties.
// Any spread that touches Audio.AndroidOutputFormat causes a prototype crash.
const REC_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;

// ─── Constants ────────────────────────────────────────────────────────────────
const CHUNK_MS          = 3000;   // passive loop recording window
const CMD_LISTEN_MS     = 5000;   // command window after bare "Alexi"
const ALEXI_AUTOHIDE_MS = 7000;
const MIN_VISIBLE_MS    = 4000;
const MUTE_KEY          = '@alexi_muted';
const DEBUG_OVERLAY     = false;

// Fuzzy wake word — includes Whisper hallucination variants:
//   "election" = Whisper hears "Alexi" as "Election"
//   "i legacy" = Whisper hears "Alexi" as "I legacy" / "I Lexi"
//   "a lexi"   = split transcription artefact
const WAKE_RE       = /\b(alexi|alexie|alexey|alexy|alexis|alex|lexi|lex|alexa|election|a lexi)\b|i legacy|i lexi/i;
const WAKE_SPLIT_RE = /\b(alexi|alexie|alexey|alexy|alexis|alex|lexi|lex|alexa|election)\b|i legacy|i lexi/i;

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Hardware singleton ────────────────────────────────────────────────────────
// ONE Audio.Recording exists at a time, tracked here at module level.
let _rec = null;

async function stopAnyRecording() {
  const r = _rec;
  _rec = null;
  if (r) {
    try { await r.stopAndUnloadAsync(); } catch (_) {}
    // Mandatory 500ms gap — iOS AVAudioSession needs time to release the mic.
    await new Promise(res => setTimeout(res, 500));
  }
}

// ─── Confirm chime ─────────────────────────────────────────────────────────────
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

// ─── Cross-screen event bus ────────────────────────────────────────────────────
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

// ─── L1: Phonetic snap ────────────────────────────────────────────────────────
// Fixes short (≤ 3-word) Whisper hallucinations before command parsing.
const NAV_SNAP = [
  { screen: 'Profile',     words: ['profile','profiles','account','settings','video','video file','for file','pro file'] },
  { screen: 'Fuel',        words: ['fuel','food','nutrition','full','few','feel','fell'] },
  { screen: 'Insights',    words: ['insights','insight','inside','incite','in sites'] },
  { screen: 'Train',       words: ['train','training','workout','workouts','exercise','trim','trend'] },
  { screen: 'Home',        words: ['home','home screen','homes'] },
  { screen: 'PostureAI',   words: ['posture','form check','check form','posture check'] },
  { screen: 'FoodScanner', words: ['scan','scanner','barcode','scan food','scan this','take a photo'] },
  { screen: 'MealLogger',  words: ['log meal','add food','meal logger','food log','add a meal'] },
  { screen: 'SleepLog',    words: ['sleep log','log sleep','sleep tracker'] },
];

function snapShortTranscript(text) {
  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length > 3) return text;
  const joined = words.join(' ');
  for (const { screen, words: targets } of NAV_SNAP) {
    if (targets.some(w => joined.includes(w))) return screen.toLowerCase();
  }
  return text;
}

function applyHallucMap(text) {
  const tl = text.toLowerCase().trim();
  const MAP = {
    'video file': 'profile', 'video': 'profile', 'for file': 'profile', 'pro file': 'profile',
    'fell': 'fuel', 'full': 'fuel', 'feel': 'fuel',
    'trains': 'train', 'incite': 'insights', 'in sites': 'insights', 'inside': 'insights',
  };
  const wc = tl.split(/\s+/).filter(Boolean).length;
  if (wc <= 3 && MAP[tl]) return MAP[tl];
  if (tl.includes('video') || tl.includes('file') || tl.startsWith('pro ')) return 'profile';
  return text;
}

// ─── L2: Command parser ────────────────────────────────────────────────────────
// APP_MAP keys must match the actual screen names used in navigate().
// ROOT screens: navigate(screen) directly from the root Stack.
// TAB screens:  navigate('MainApp', { screen }) — inside the NavBar tab navigator.
// TRAIN screens: navigate('MainApp', { screen:'Train', params:{ screen } }) — nested.
const APP_MAP = {
  // Tab screens inside MainApp
  Home:          ['home', 'dashboard', 'main', 'summary', 'overview', 'start page', 'go home', 'home screen'],
  Fuel:          ['fuel', 'nutrition', 'meals', 'macros', 'eating', 'diet', 'food page', 'nutrition page'],
  Train:         ['train', 'training', 'workout page', 'exercise page', 'gym page', 'library', 'moves'],
  Insights:      ['insights', 'stats', 'analytics', 'progress', 'charts', 'data', 'history', 'trends', 'performance'],
  Profile:       ['profile', 'account', 'settings', 'my info', 'targets'],
  // Root Stack screens
  FoodScanner:   ['scan', 'scanner', 'barcode', 'scan food', 'scan this', 'take a photo', 'take photo', 'food scanner', 'camera scan'],
  MealLogger:    ['log meal', 'add food', 'meal logger', 'food log', 'log a meal', 'add a meal', 'add meal'],
  SleepLog:      ['sleep log', 'log sleep', 'sleep tracker', 'sleep entry', 'log my sleep'],
  // Nested inside Train tab stack
  WorkoutActive: ['active workout', 'start workout', 'begin workout', "let's go", 'start a workout', 'start training', 'begin training'],
  PostureAI:     ['posture', 'posture check', 'posture ai', 'check form', 'check my form', 'form check'],
};

// resolveNavigation — maps a logical screen name to { screen, params } for navigationRef.
// The app has three levels:
//   Root stack (App.js)  → MainApp, MealLogger, FoodScanner, SleepLog, WorkoutSummary
//   Tab navigator        → Home, Fuel, Train, Insights, Profile  (inside MainApp)
//   Train stack          → WorkoutActive, PostureAI, ExerciseList (inside Train tab)
function resolveNavigation(screen, extraParams) {
  const ROOT_SCREENS  = ['FoodScanner', 'MealLogger', 'FoodDetail', 'SleepLog', 'WorkoutSummary'];
  const TAB_SCREENS   = ['Home', 'Fuel', 'Train', 'Insights', 'Profile'];
  const TRAIN_SCREENS = ['WorkoutActive', 'PostureAI', 'ExerciseList', 'ExerciseInfo', 'FlappyBirdGame'];

  if (ROOT_SCREENS.includes(screen)) {
    return { screen, params: extraParams || undefined };
  }
  if (TAB_SCREENS.includes(screen)) {
    return { screen: 'MainApp', params: { screen } };
  }
  if (TRAIN_SCREENS.includes(screen)) {
    return {
      screen: 'MainApp',
      params: { screen: 'Train', params: { screen, ...(extraParams ? { params: extraParams } : {}) } },
    };
  }
  // Unknown screen — try direct navigate and let React Navigation handle it
  console.warn('[Alexi] resolveNavigation: unknown screen', screen);
  return { screen, params: extraParams || undefined };
}

function parseCommand(text) {
  const t = text.toLowerCase().trim();
  if (!t) return { type: 'AI_QUERY', query: text };

  // ── Go back / close ────────────────────────────────────────────────────────
  if (/\b(go back|go backwards?|back|close|dismiss|cancel|exit screen)\b/i.test(t))
    return { type: 'GO_BACK' };

  // ── Utility ────────────────────────────────────────────────────────────────
  if (/show.*move|instructions?|form (guide|check|tip)|how to do (this|it)|help( me)?$/.test(t))
    return { type: 'SHOW_INSTRUCTIONS' };
  if (/how many steps|steps today|my steps|step count/.test(t))
    return { type: 'SPEAK_STEPS' };
  if (/how am i doing|my stats|daily summary|check status|status/.test(t))
    return { type: 'CHECK_STATUS' };
  if (/stop listening|go to sleep|mute|silence|be quiet|stop alexi/.test(t))
    return { type: 'MUTE' };

  // ── Logging ────────────────────────────────────────────────────────────────
  if (/\b(log|add|drank|had water|drink water)\b.*\b(water|ml|oz)\b|\badd water\b|\bdrank\b/i.test(t)) {
    const m = t.match(/(\d+)\s*(ml|milliliter|oz)/);
    return { type: 'LOG_WATER', amount: m ? parseInt(m[1]) : 250 };
  }
  if (/log sleep|i slept|slept \d|(\d+) hours? sleep/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_SLEEP', hours: m ? parseFloat(m[1]) : 7 };
  }
  if (/i weigh|my weight (is|was)|weigh(ing|s)? \d/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_WEIGHT', weight_kg: m ? parseFloat(m[1]) : null };
  }
  if (/body fat|fat percentage|fat percent/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: 'LOG_METRIC', body_fat: m ? parseFloat(m[1]) : null };
  }
  if (/log (my )?food|i ate|i had|i just ate|log.*meal|log.*(breakfast|lunch|dinner|snack)/.test(t)) {
    const calM  = t.match(/(\d+)\s*(kcal|cal(?:orie)?s?)/);
    const proM  = t.match(/(\d+)\s*g?\s*protein/);
    const carbM = t.match(/(\d+)\s*g?\s*carb/);
    const fatM  = t.match(/(\d+)\s*g?\s*fat/);
    if (!calM && !proM && !carbM && !fatM) return { type: 'AI_QUERY', query: text };
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

  // ── Exercise intent — "let's do squats", "start push-ups", "do deadlifts" ──
  // Fires BEFORE generic nav so "do training" doesn't get swallowed here.
  const exMatch = t.match(
    /\b(?:let'?s?\s+do|do\s+some|start\s+(?:a\s+|some\s+)?|begin\s+(?:a\s+)?)\s*([a-z][a-z -]{1,24}?)(?:\s+(?:exercise|workout|session|sets?|reps?))?\s*[!.?]?\s*$/i,
  );
  if (exMatch) {
    const ex = exMatch[1].trim();
    // Don't intercept pure navigation words like "training", "workout page"
    const isNavAlias = Object.values(APP_MAP).flat().some(a => a === ex);
    if (!isNavAlias) {
      console.log('[Alexi] Exercise intent detected:', ex);
      return { type: 'NAVIGATE', screen: 'WorkoutActive', params: { exercise: ex } };
    }
  }

  // ── Navigation: intent verb first (highest priority) ───────────────────────
  const NAV_INTENT = /\b(go to|open|show me|navigate to|take me to|switch to|bring up|display)\b/i;
  if (NAV_INTENT.test(t)) {
    for (const [screen, aliases] of Object.entries(APP_MAP)) {
      if (aliases.some(a => t.includes(a))) return { type: 'NAVIGATE', screen };
    }
  }

  // ── Navigation: bare alias fallback ────────────────────────────────────────
  for (const [screen, aliases] of Object.entries(APP_MAP)) {
    const esc = aliases.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (new RegExp(`\\b(${esc.join('|')})\\b`, 'i').test(t))
      return { type: 'NAVIGATE', screen };
  }

  // ── Long-form question → open chat ─────────────────────────────────────────
  if (/\b(explain|how does|what is|why does|tell me about)\b/i.test(t))
    return { type: 'OPEN_CHAT', query: text };

  return { type: 'AI_QUERY', query: text };
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AlexiVoiceContext = createContext(null);

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AlexiVoiceProvider({ children }) {
  const [passiveState,   setPassiveState]   = useState('idle');
  const [isMuted,        setIsMuted]        = useState(false);
  const [permGranted,    setPermGranted]    = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [debugLog,       setDebugLog]       = useState('Ready');
  const [isAlexiVisible, setIsAlexiVisible] = useState(false);
  const [responseText,   setResponseText]   = useState('');

  const mutedRef          = useRef(false);
  const isMountedRef      = useRef(true);
  const userNameRef       = useRef(null);
  const hideTimerRef      = useRef(null);
  const isAlexiVisibleRef = useRef(false);
  const loopRef           = useRef(false);
  const loopGenRef        = useRef(0);
  const pausedRef         = useRef(false);
  const appStateRef       = useRef(AppState.currentState);

  // ── Animations ──────────────────────────────────────────────────────────────
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const borderAnim  = useRef(new Animated.Value(0)).current;
  const borderScale = useRef(new Animated.Value(1.04)).current;
  const siriGlow    = useRef(new Animated.Value(0)).current;
  const earDotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { isAlexiVisibleRef.current = isAlexiVisible; }, [isAlexiVisible]);

  useEffect(() => {
    Animated.timing(siriGlow, {
      toValue: isAlexiVisible ? 1 : 0,
      duration: 380, useNativeDriver: true,
    }).start();
  }, [isAlexiVisible]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [passiveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const flashBorder = useCallback(() => {
    borderAnim.setValue(0); borderScale.setValue(1.04);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility helpers ───────────────────────────────────────────────────────
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

  // ── Mute persistence ─────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then(val => {
      const m = val === 'true';
      mutedRef.current = m;
      setIsMuted(m);
    });
  }, []);

  // ── Fetch user first name ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: p } = await supabase
          .from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle();
        const first = (p?.first_name || p?.full_name || '').split(' ')[0].trim();
        if (first) userNameRef.current = first;
      } catch (_) {}
    })();
  }, []);

  // ── speak() ──────────────────────────────────────────────────────────────────
  // Sets PLAYBACK_MODE (allowsRecordingIOS: false) before TTS so the voice
  // routes to the main speaker even if the phone is on Silent Mode.
  const speak = (text) => new Promise(async (resolve) => {
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      await new Promise(r => setTimeout(r, 500));
      try { await Audio.setAudioModeAsync(RECORDING_MODE); } catch (_) {}
      setPassiveState('listening');
      resolve();
    };
    const guard = setTimeout(finish, 8000);
    try {
      Speech.stop();
      await stopAnyRecording();
      setPassiveState('speaking');
      setResponseText(text);
      try { await Audio.setAudioModeAsync(PLAYBACK_MODE); } catch (_) {}
      Speech.speak(text, {
        language: 'en-US', pitch: 1.0, rate: 1.0,
        onDone:    () => { clearTimeout(guard); finish(); },
        onStopped: () => { clearTimeout(guard); finish(); },
        onError:   () => { clearTimeout(guard); finish(); },
      });
    } catch (_) { clearTimeout(guard); finish(); }
  });

  // ── transcribeURI ─────────────────────────────────────────────────────────────
  const transcribeURI = useCallback(async (uri) => {
    setDebugLog('Transcribing…');
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      console.log('[Alexi] Sending Base64 to Edge Function... size:', base64.length);
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { audioBase64: base64, mimeType: 'audio/m4a', userName: userNameRef.current ?? undefined },
      });
      console.log('[Alexi] Edge Function Raw Response:', JSON.stringify(data), error?.message ?? 'no error');
      if (error) {
        console.error('[Alexi] Edge Function error:', error.message);
        setDebugLog(`STT error: ${error.message}`);
        return '';
      }
      const t = (data?.transcript ?? '').trim();
      setLastTranscript(t);
      setDebugLog(`Heard: "${t || '(silence)'}"`);
      return t;
    } catch (e) {
      console.error('[Alexi] transcribeURI crash:', e?.message);
      setDebugLog(`Transcribe crash: ${e?.message}`);
      return '';
    }
  }, []);

  // ── executeCommand ────────────────────────────────────────────────────────────
  const executeCommand = useCallback(async (commandText) => {
    if (!commandText?.trim()) return;
    const cmd = parseCommand(commandText);
    setDebugLog(`CMD: ${cmd.type}`);
    AlexiEvents.emit('command', cmd);

    switch (cmd.type) {
      case 'SHOW_INSTRUCTIONS':
        await speak('Showing you the form now.');
        hideAlexiAfter();
        break;

      case 'SPEAK_STEPS': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const { data: act } = await supabase.from('daily_activity').select('steps')
            .eq('user_id', user.id).eq('date', TODAY).maybeSingle();
          const s = act?.steps ?? 0;
          await speak(s > 8000
            ? `Amazing! ${s.toLocaleString()} steps today!`
            : s > 4000
            ? `${s.toLocaleString()} steps — keep moving!`
            : `${s.toLocaleString()} steps so far. Let's get those numbers up!`);
        } catch (_) { await speak("I couldn't get your step count."); }
        hideAlexiAfter();
        break;
      }

      case 'CHECK_STATUS': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const [{ data: act }, { data: xp }] = await Promise.all([
            supabase.from('daily_activity').select('steps, water_ml, sleep_hours')
              .eq('user_id', user.id).eq('date', TODAY).maybeSingle(),
            supabase.from('xp_log').select('amount').eq('user_id', user.id)
              .gte('earned_at', new Date(Date.now() - 7 * 86400000).toISOString()),
          ]);
          const steps  = act?.steps ?? 0;
          const water  = act?.water_ml ?? 0;
          const sleep  = act?.sleep_hours ?? 0;
          const weekXP = (xp ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
          await speak(
            `Today: ${steps.toLocaleString()} steps, ${water}ml water` +
            (sleep > 0 ? `, ${sleep}h sleep` : '') +
            `. This week ${weekXP} XP. Keep it up!`,
          );
        } catch (_) { await speak("I couldn't pull your stats."); }
        hideAlexiAfter();
        break;
      }

      case 'MUTE':
        await speak("I'll go quiet. Tap my icon whenever you need me.");
        hideAlexi();
        mutedRef.current = true;
        setIsMuted(true);
        await AsyncStorage.setItem(MUTE_KEY, 'true');
        break;

      case 'GO_BACK':
        await speak('Going back.');
        AlexiEvents.emit('go_back');
        hideAlexiAfter(2000);
        break;

      case 'NAVIGATE': {
        const labels = {
          Home: 'the home screen', Profile: 'your profile', Fuel: 'nutrition',
          Insights: 'your insights', Train: 'your training plan',
          WorkoutActive: 'your workout', PostureAI: 'posture check',
          FoodScanner: 'the food scanner', MealLogger: 'the meal logger',
          SleepLog: 'sleep log',
        };
        const exercise = cmd.params?.exercise;
        const label    = labels[cmd.screen] ?? cmd.screen.toLowerCase();
        const phrase   = exercise ? `Let's do ${exercise}. Starting your workout.` : `Opening ${label}.`;
        await speak(phrase);
        const navArgs = resolveNavigation(cmd.screen, cmd.params);
        console.log('[Alexi] Emitting navigate:', JSON.stringify(navArgs));
        AlexiEvents.emit('navigate', navArgs);
        hideAlexiAfter(3000);
        break;
      }

      case 'LOG_WATER': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const TODAY = new Date().toISOString().split('T')[0];
          const { data: ex } = await supabase.from('daily_activity').select('id, water_ml')
            .eq('user_id', user.id).eq('date', TODAY).maybeSingle();
          const newMl = (ex?.water_ml ?? 0) + cmd.amount;
          if (ex) await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', ex.id);
          else    await supabase.from('daily_activity').insert({ user_id: user.id, date: TODAY, water_ml: newMl });
          AlexiEvents.emit('dataUpdated', { type: 'water', value: newMl });
          playConfirmSound();
          const n = userNameRef.current;
          await speak(`Logged ${cmd.amount}ml${n ? `, ${n}` : ''}! ${newMl}ml total today.`);
        } catch (_) { await speak("Sorry, I couldn't log your water."); }
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
          await speak(`Logged ${cmd.hours} hours of sleep. Rest is where gains happen!`);
        } catch (_) { await speak("Sorry, I couldn't log your sleep."); }
        hideAlexiAfter();
        break;
      }

      case 'LOG_WEIGHT': {
        if (!cmd.weight_kg) { await speak("I didn't catch your weight. Try again."); hideAlexiAfter(); break; }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          await supabase.from('body_metrics').insert({
            user_id: user.id, weight_kg: cmd.weight_kg, logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit('dataUpdated', { type: 'weight', value: cmd.weight_kg });
          playConfirmSound();
          await speak(`Logged ${cmd.weight_kg} kilograms.`);
        } catch (_) { await speak("Sorry, I couldn't log your weight."); }
        hideAlexiAfter();
        break;
      }

      case 'LOG_METRIC': {
        if (!cmd.body_fat) { await speak("I didn't catch the value. Try again."); hideAlexiAfter(); break; }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          await supabase.from('body_metrics').insert({
            user_id: user.id, body_fat_pct: cmd.body_fat, logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit('dataUpdated', { type: 'body_fat', value: cmd.body_fat });
          playConfirmSound();
          await speak(`Logged ${cmd.body_fat} percent body fat. Keep tracking!`);
        } catch (_) { await speak("Sorry, I couldn't log that."); }
        hideAlexiAfter();
        break;
      }

      case 'LOG_FOOD': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { await speak("I couldn't find your account."); break; }
          const NOW_TS = new Date().toISOString();
          let foodId = null;
          const { data: existing } = await supabase.from('foods').select('id')
            .ilike('name', cmd.name).maybeSingle();
          if (existing) {
            foodId = existing.id;
          } else {
            const { data: nf } = await supabase.from('foods').insert({
              name: cmd.name, calories_per_100g: cmd.calories ?? 0,
              protein_per_100g: cmd.protein_g ?? 0, carbs_per_100g: cmd.carbs_g ?? 0,
              fat_per_100g: cmd.fat_g ?? 0, source: 'alexi_voice',
            }).select('id').single();
            foodId = nf?.id ?? null;
          }
          if (foodId) {
            await supabase.from('food_logs').insert({
              user_id: user.id, food_id: foodId,
              consumed_at: NOW_TS, meal_type: cmd.meal_type ?? 'snack', quantity_grams: 100,
            });
          }
          AlexiEvents.emit('dataUpdated', { type: 'food', name: cmd.name, calories: cmd.calories ?? 0 });
          playConfirmSound();
          await speak(`Logged ${cmd.name}${cmd.calories ? ` — ${cmd.calories} kcal` : ''}. Nice work!`);
        } catch (_) { await speak("Sorry, I couldn't log that food."); }
        hideAlexiAfter();
        break;
      }

      case 'OPEN_CHAT':
        await speak('On it.');
        AlexiEvents.emit('open_chat', { query: cmd.query });
        break;

      case 'AI_QUERY': {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const uid = user?.id ?? null;
          const { data: ai, error: aiErr } = await supabase.functions.invoke('ai-assistant', {
            body: { query: cmd.query, voiceMode: true, userId: uid },
          });
          if (aiErr || !ai?.response) {
            await speak("I couldn't reach my brain. Try again.");
            hideAlexiAfter();
            break;
          }
          if (ai.navigateTo) {
            AlexiEvents.emit('navigate', { screen: ai.navigateTo });
            await speak(`Opening ${ai.navigateTo.toLowerCase()}.`);
            hideAlexiAfter(3000);
            break;
          }
          if (ai.executed?.length > 0) {
            AlexiEvents.emit('dataUpdated', { executed: ai.executed });
            playConfirmSound();
          }
          await speak(ai.response);
          hideAlexiAfter(3000);
        } catch (_) {
          await speak('Something went wrong. Try again.');
          hideAlexiAfter();
        }
        break;
      }

      default:
        hideAlexiAfter();
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── runPassiveLoop — the "Siri Ear" ──────────────────────────────────────────
  // Records 3-second chunks, sends EVERY chunk to Whisper (no silence gate —
  // that was the deaf bug), wakes on fuzzy wake word, executes commands.
  const runPassiveLoop = useCallback(async () => {
    console.log('[Alexi] Loop function called');
    const myGen = ++loopGenRef.current;
    const alive = () => loopGenRef.current === myGen && isMountedRef.current && !mutedRef.current;

    // ── Permission check ──────────────────────────────────────────────────────
    let perm = await Audio.getPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (perm.status !== 'granted') {
      perm = await Audio.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      setPermGranted(perm.status === 'granted');
      if (perm.status !== 'granted') {
        setPassiveState('no_permission');
        setDebugLog('Microphone permission denied');
        Alert.alert(
          'Microphone Required',
          'Enable microphone access in Settings → BodyQ → Microphone.',
          [{ text: 'OK' }],
        );
        return;
      }
    } else {
      setPermGranted(true);
    }

    console.log('[Alexi] Permission status:', perm.status);
    await new Promise(r => setTimeout(r, 800));
    if (!alive()) return;

    setPassiveState('listening');
    setDebugLog('Listening…');
    console.log('[Alexi] Starting while loop. Muted:', mutedRef.current);

    while (alive()) {
      // ── Paused (app backgrounded) ───────────────────────────────────────────
      if (pausedRef.current) {
        setPassiveState('paused');
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      let uri = null;

      try {
        // ── Set mic audio session ─────────────────────────────────────────────
        try { await Audio.setAudioModeAsync(RECORDING_MODE); } catch (_) {}

        // ── Start recording ───────────────────────────────────────────────────
        console.log('[Alexi] Attempting to start hardware...');
        const { recording } = await Audio.Recording.createAsync(REC_OPTIONS);
        _rec = recording;

        // ── Hold for 3 seconds ────────────────────────────────────────────────
        await new Promise(r => setTimeout(r, CHUNK_MS));
        if (!alive()) { await stopAnyRecording(); break; }

        // ── Stop and retrieve URI ─────────────────────────────────────────────
        _rec = null;
        try {
          await recording.stopAndUnloadAsync();
          await new Promise(r => setTimeout(r, 500)); // mandatory iOS hardware gap
          uri = recording.getURI();
        } catch (_) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

      } catch (e) {
        // Any mic error → clean up + 3s before retry (avoids error spam)
        console.error('[Alexi] passive loop error:', e?.message);
        await stopAnyRecording();
        setPassiveState('listening');
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      if (!uri) continue;

      // ── Transcribe every chunk (no silence gate) ──────────────────────────
      setPassiveState('transcribing');
      // transcribeURI never throws — returns '' on any error so the loop retries
      const raw = await transcribeURI(uri);

      if (!raw) { setPassiveState('listening'); continue; }

      console.log('[Alexi] Heard:', raw);

      // ── L1: hallucination fix ─────────────────────────────────────────────
      const fixed = applyHallucMap(raw);

      // ── Wake-word check (fuzzy) ───────────────────────────────────────────
      const hasWake = WAKE_RE.test(fixed);
      if (!hasWake && !isAlexiVisibleRef.current) {
        setPassiveState('listening');
        continue;
      }

      // ── WAKE — haptic + Siri orb fires immediately ────────────────────────
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      flashBorder();
      showAlexi();
      setPassiveState('capturing');
      const wakeTimestamp = Date.now();

      const ensureMinVisible = async () => {
        const elapsed = Date.now() - wakeTimestamp;
        if (elapsed < MIN_VISIBLE_MS)
          await new Promise(r => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      };

      // ── Extract inline command (text after wake word) ─────────────────────
      const wakeMatch = fixed.match(WAKE_SPLIT_RE);
      const cmdRaw = wakeMatch
        ? fixed.split(WAKE_SPLIT_RE).pop().replace(/^[,.\s!?]+/, '').trim()
        : fixed;
      const cmdText = snapShortTranscript(cmdRaw);

      if (cmdText && cmdText.split(/\s+/).filter(Boolean).length >= 2) {
        // Inline: "Alexi, go to training" — execute immediately
        console.log('[Alexi] Inline command:', cmdText);
        await executeCommand(cmdText);
        await ensureMinVisible();
        hideAlexiAfter(ALEXI_AUTOHIDE_MS);
        setPassiveState('listening');
        continue;
      }

      // ── Bare "Alexi" — open 5-second command window ───────────────────────
      await speak('Yes?');
      if (!alive()) break;

      setPassiveState('capturing');

      let cmdUri = null;
      try {
        try { await Audio.setAudioModeAsync(RECORDING_MODE); } catch (_) {}
        const { recording: cmdRec } = await Audio.Recording.createAsync(REC_OPTIONS);
        _rec = cmdRec;
        await new Promise(r => setTimeout(r, CMD_LISTEN_MS));
        if (!alive()) { await stopAnyRecording(); break; }
        _rec = null;
        await cmdRec.stopAndUnloadAsync();
        await new Promise(r => setTimeout(r, 500));
        cmdUri = cmdRec.getURI();
      } catch (e) {
        console.error('[Alexi] command window error:', e?.message);
        await stopAnyRecording();
        await new Promise(r => setTimeout(r, 3000));
      }

      if (cmdUri) {
        setPassiveState('transcribing');
        let cmdTx = '';
        try { cmdTx = await transcribeURI(cmdUri); } catch (_) {}
        if (cmdTx) {
          const fixedCmd = applyHallucMap(cmdTx);
          const snapped  = snapShortTranscript(fixedCmd);
          console.log('[Alexi] Command window:', snapped);
          await executeCommand(snapped);
        }
      }

      await ensureMinVisible();
      hideAlexiAfter(ALEXI_AUTOHIDE_MS);
      setPassiveState('listening');
    }

    await stopAnyRecording();
    setIsAlexiVisible(false);
    setPassiveState('idle');
  }, [executeCommand, flashBorder, showAlexi, hideAlexi, hideAlexiAfter, transcribeURI]);

  // ── wakeAlexi — tap / long-press trigger ─────────────────────────────────────
  const wakeAlexi = useCallback(async () => {
    if (mutedRef.current) return;

    loopGenRef.current++; // invalidate passive loop iteration
    await stopAnyRecording();

    let perm = await Audio.getPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (perm.status !== 'granted') {
      perm = await Audio.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (perm.status !== 'granted') {
        Alert.alert('Microphone Required', 'Enable microphone access in Settings → BodyQ → Microphone.');
        if (loopRef.current) runPassiveLoop();
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flashBorder();
    showAlexi();
    setPassiveState('capturing');
    setDebugLog('Listening…');

    let uri = null;
    try {
      await Audio.setAudioModeAsync(RECORDING_MODE);
      const { recording } = await Audio.Recording.createAsync(REC_OPTIONS);
      _rec = recording;
      await new Promise(r => setTimeout(r, CMD_LISTEN_MS));
      _rec = null;
      await recording.stopAndUnloadAsync();
      await new Promise(r => setTimeout(r, 500));
      uri = recording.getURI();
    } catch (e) {
      console.error('[Alexi] wakeAlexi mic failed:', e?.message);
      await stopAnyRecording();
      setPassiveState('idle');
      hideAlexiAfter(1000);
      if (loopRef.current) runPassiveLoop();
      return;
    }

    if (!uri) {
      setPassiveState('idle');
      hideAlexiAfter(1000);
      if (loopRef.current) runPassiveLoop();
      return;
    }

    setPassiveState('transcribing');
    let raw = '';
    try { raw = await transcribeURI(uri); }
    catch (_) {
      setPassiveState('idle');
      hideAlexiAfter(1000);
      if (loopRef.current) runPassiveLoop();
      return;
    }

    if (!raw) {
      setPassiveState('idle');
      hideAlexiAfter(1000);
      if (loopRef.current) runPassiveLoop();
      return;
    }

    console.log('[Alexi] wakeAlexi heard:', raw);

    const fixed  = applyHallucMap(raw);
    const wm     = fixed.match(WAKE_SPLIT_RE);
    const cmdRaw = wm
      ? fixed.split(WAKE_SPLIT_RE).pop().replace(/^[,.\s!?]+/, '').trim()
      : fixed;
    const cmdText = snapShortTranscript(cmdRaw) || snapShortTranscript(fixed);

    if (cmdText) {
      console.log('[Alexi] wakeAlexi command:', cmdText);
      await executeCommand(cmdText);
    } else {
      setPassiveState('idle');
      hideAlexiAfter(1000);
    }

    if (loopRef.current && !mutedRef.current && isMountedRef.current) {
      runPassiveLoop();
    }
  }, [executeCommand, flashBorder, showAlexi, hideAlexiAfter, transcribeURI, runPassiveLoop]);

  // ── Public loop controls ──────────────────────────────────────────────────────
  const startPassive = useCallback(async () => {
    if (mutedRef.current) return;
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
    setPassiveState('idle');
    setDebugLog('Stopped');
  }, []);

  const pausePassive = useCallback(async () => {
    pausedRef.current = true;
    await stopAnyRecording();
    setPassiveState('paused');
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
      setPassiveState('muted');
      setDebugLog('Muted');
    } else {
      setDebugLog('Unmuted — starting listener');
      loopRef.current   = true;
      pausedRef.current = false;
      runPassiveLoop();
    }
  }, [runPassiveLoop]);

  // ── AppState — pause on background, resume on foreground ─────────────────────
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

  // ── Auto-start after onboarding ───────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    const t = setTimeout(async () => {
      console.log('[Alexi] Auto-start check. Muted:', mutedRef.current, 'Mounted:', isMountedRef.current);
      if (mutedRef.current) return;
      if (!isMountedRef.current) return;
      // Onboarding gate bypassed for diagnostics
      loopRef.current = true;
      console.log('[Alexi] Calling startPassive()');
      startPassive();
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
    passiveState, isMuted, permGranted, lastTranscript, responseText, debugLog, isAlexiVisible,
    pulseAnim, borderAnim, borderScale, siriGlow, earDotScale,
    flashBorder, showAlexi, hideAlexi, hideAlexiAfter,
    wakeAlexi,
    talkToAlexi:   wakeAlexi,   // alias for AlexiAssistant.js backward-compat
    startPassive, stopPassive, pausePassive, resumePassive,
    setMutedState, executeCommand,
  };

  return <AlexiVoiceContext.Provider value={value}>{children}</AlexiVoiceContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAlexiVoice() {
  const ctx = useContext(AlexiVoiceContext);
  if (!ctx) throw new Error('useAlexiVoice must be used inside <AlexiVoiceProvider>');
  return ctx;
}

// ─── AlexiDebugOverlay ────────────────────────────────────────────────────────
export function AlexiDebugOverlay() {
  const { passiveState, lastTranscript, debugLog, isAlexiVisible } = useAlexiVoice();
  if (!DEBUG_OVERLAY) return null;
  const color =
    passiveState === 'listening'    ? '#4488FF' :
    passiveState === 'capturing'    ? '#C6FF33' :
    passiveState === 'transcribing' ? '#FFC832' :
    passiveState === 'speaking'     ? '#9B7FFF' :
    passiveState === 'no_permission'? '#FF6464' :
    passiveState === 'muted'        ? '#FF8C00' : '#8B82AD';
  return (
    <View style={dbgStyles.wrap} pointerEvents="none">
      <View style={dbgStyles.row}>
        <View style={[dbgStyles.dot, { backgroundColor: color }]} />
        <Text style={[dbgStyles.state, { color }]}>{passiveState.toUpperCase()}</Text>
        {isAlexiVisible && <Text style={[dbgStyles.state, { color: '#C6FF33', marginLeft: 6 }]}>VISIBLE</Text>}
      </View>
      <Text style={dbgStyles.line} numberOfLines={2}>{debugLog}</Text>
      {!!lastTranscript && <Text style={dbgStyles.transcript} numberOfLines={2}>"{lastTranscript}"</Text>}
    </View>
  );
}
const dbgStyles = StyleSheet.create({
  wrap:       { position: 'absolute', top: 50, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 10, padding: 10, zIndex: 99999, borderWidth: 1, borderColor: 'rgba(198,255,51,0.3)' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  state:      { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  line:       { color: '#C8BFEE', fontSize: 10, lineHeight: 14 },
  transcript: { color: '#C6FF33', fontSize: 10, marginTop: 4, lineHeight: 14 },
});

// ─── AlexiScreenBorder ────────────────────────────────────────────────────────
export function AlexiScreenBorder() {
  const { borderAnim, borderScale } = useAlexiVoice();
  return (
    <Animated.View
      pointerEvents="none"
      style={[bdrStyles.frame, { opacity: borderAnim, transform: [{ scale: borderScale }] }]}
    />
  );
}
const bdrStyles = StyleSheet.create({
  frame: {
    position: 'absolute', top: 0, left: 0, width: SW, height: SH,
    borderWidth: 3, borderColor: '#C6FF33', zIndex: 9998,
    shadowColor: '#C6FF33', shadowOpacity: 0.85, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
});

// ─── AlexiSiriGlow ────────────────────────────────────────────────────────────
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
  }, [isAlexiVisible]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      pointerEvents="none"
      style={[glwStyles.bar, { opacity: siriGlow, transform: [{ scaleX: speakPulse }] }]}
    />
  );
}
const glwStyles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
    backgroundColor: '#C6FF33', shadowColor: '#C6FF33',
    shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: -6 },
    elevation: 12, zIndex: 9997,
  },
});

// ─── AlexiEarDot ──────────────────────────────────────────────────────────────
export function AlexiEarDot() {
  const { passiveState, earDotScale, wakeAlexi } = useAlexiVoice();
  const isActive = ['listening', 'capturing', 'transcribing', 'speaking'].includes(passiveState);
  if (!isActive) return null;
  const color =
    passiveState === 'speaking'     ? '#9B7FFF' :
    passiveState === 'transcribing' ? '#FFC832' :
    passiveState === 'listening'    ? '#4488FF' : '#C6FF33';
  return (
    <TouchableOpacity onPress={wakeAlexi} activeOpacity={0.7} style={earStyles.hitArea}>
      <Animated.View style={[earStyles.dot, {
        backgroundColor: color, shadowColor: color,
        transform: [{ scale: passiveState === 'listening' ? earDotScale : 1 }],
      }]} />
    </TouchableOpacity>
  );
}
const earStyles = StyleSheet.create({
  hitArea: { position: 'absolute', top: 6, right: 6, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', zIndex: 99998 },
  dot:     { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
});

// ─── AlexiVoiceOrb ────────────────────────────────────────────────────────────
export function AlexiVoiceOrb({ style }) {
  const { passiveState, isMuted, pulseAnim, wakeAlexi, startPassive, setMutedState } = useAlexiVoice();
  const isListening    = passiveState === 'listening';
  const isCapturing    = passiveState === 'capturing';
  const isTranscribing = passiveState === 'transcribing';
  const isSpeaking     = passiveState === 'speaking';
  const isOff          = ['idle', 'paused', 'muted', 'no_permission', 'error'].includes(passiveState);

  const orbBg     = isMuted ? 'rgba(255,80,80,0.10)' : (isListening || isCapturing) ? 'rgba(198,255,51,0.15)' : isTranscribing ? 'rgba(255,200,50,0.15)' : isSpeaking ? 'rgba(130,80,255,0.18)' : 'rgba(255,255,255,0.05)';
  const orbBorder = isMuted ? 'rgba(255,80,80,0.45)' : (isListening || isCapturing) ? 'rgba(198,255,51,0.65)' : isTranscribing ? 'rgba(255,200,50,0.55)' : isSpeaking ? 'rgba(130,80,255,0.65)' : 'rgba(255,255,255,0.18)';
  const iconColor = isMuted ? '#FF6464' : (isListening || isCapturing) ? '#C6FF33' : isTranscribing ? '#FFC832' : isSpeaking ? '#9B7FFF' : '#555';
  const iconName  = isMuted ? 'mic-off-outline' : isSpeaking ? 'volume-high-outline' : isOff ? 'mic-outline' : 'mic';

  const handlePress = () => {
    if (isMuted)   setMutedState(false);
    else if (isOff) startPassive();
    else            wakeAlexi();
  };

  return (
    <TouchableOpacity
      style={[orbStyles.orb, { backgroundColor: orbBg, borderColor: orbBorder }, style]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {isListening && <Animated.View style={[orbStyles.pulse, { transform: [{ scale: pulseAnim }] }]} />}
      <Ionicons name={iconName} size={17} color={iconColor} />
    </TouchableOpacity>
  );
}
const orbStyles = StyleSheet.create({
  orb:   { position: 'absolute', bottom: 90, left: 16, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(198,255,51,0.14)' },
});

// ─── AlexiCompanion ───────────────────────────────────────────────────────────
export function AlexiCompanion() {
  const { passiveState, responseText, setMutedState, isMuted, wakeAlexi } = useAlexiVoice();

  const isOrb      = ['capturing', 'transcribing'].includes(passiveState);
  const isListening = passiveState === 'listening';
  const isSpeaking  = passiveState === 'speaking';

  const avatarSc  = useSharedValue(1);
  const rot1      = useSharedValue(0);
  const rot2      = useSharedValue(0);
  const rot3      = useSharedValue(0);
  const sc1       = useSharedValue(1);
  const sc2       = useSharedValue(1);
  const sc3       = useSharedValue(1);
  const glowBgOp  = useSharedValue(0);
  const listenSc  = useSharedValue(1);
  const listenOp  = useSharedValue(0);
  const speakOp   = useSharedValue(0);
  const speakSc   = useSharedValue(1);
  const bubbleOp  = useSharedValue(0);
  const successOp = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(avatarSc); avatarSc.value = withTiming(1, { duration: 200 });
    cancelAnimation(rot1); rot1.value = 0;
    cancelAnimation(rot2); rot2.value = 0;
    cancelAnimation(rot3); rot3.value = 0;
    cancelAnimation(sc1); sc1.value = 1;
    cancelAnimation(sc2); sc2.value = 1;
    cancelAnimation(sc3); sc3.value = 1;
    cancelAnimation(glowBgOp); glowBgOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(listenSc); listenSc.value = 1;
    cancelAnimation(listenOp); listenOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(speakOp);  speakOp.value  = withTiming(0, { duration: 250 });
    cancelAnimation(speakSc);  speakSc.value  = 1;

    if (isListening) {
      listenOp.value = withRepeat(withSequence(withTiming(0.22, { duration: 1400 }), withTiming(0.00, { duration: 1400 })), -1, false);
      listenSc.value = withRepeat(withSequence(withTiming(1.55, { duration: 1400 }), withTiming(1.00, { duration: 1400 })), -1, false);
    } else if (isOrb) {
      rot1.value = withRepeat(withTiming( 360, { duration: 2400, easing: Easing.linear }), -1, false);
      rot2.value = withRepeat(withTiming(-360, { duration: 3800, easing: Easing.linear }), -1, false);
      rot3.value = withRepeat(withTiming( 360, { duration: 6000, easing: Easing.linear }), -1, false);
      sc1.value  = withRepeat(withSequence(withTiming(1.09, { duration: 700  }), withTiming(1.00, { duration: 700  })), -1, false);
      sc2.value  = withDelay(233, withRepeat(withSequence(withTiming(1.07, { duration: 1050 }), withTiming(1.00, { duration: 1050 })), -1, false));
      sc3.value  = withDelay(466, withRepeat(withSequence(withTiming(1.05, { duration: 1400 }), withTiming(1.00, { duration: 1400 })), -1, false));
      glowBgOp.value = withRepeat(withSequence(withTiming(0.28, { duration: 1200 }), withTiming(0.08, { duration: 1200 })), -1, false);
      avatarSc.value = withRepeat(withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1.00, { duration: 1200 })), -1, false);
    } else if (isSpeaking) {
      speakOp.value  = withRepeat(withSequence(withTiming(0.80, { duration: 500 }), withTiming(0.22, { duration: 500 })), -1, false);
      speakSc.value  = withRepeat(withSequence(withTiming(1.50, { duration: 500 }), withTiming(1.10, { duration: 500 })), -1, false);
      avatarSc.value = withRepeat(withSequence(withTiming(1.08, { duration: 500 }), withTiming(0.97, { duration: 500 })), -1, false);
    }
  }, [passiveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const bubbleTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(bubbleTimerRef.current);
    if (isSpeaking) {
      bubbleOp.value = withTiming(1, { duration: 180 });
      bubbleTimerRef.current = setTimeout(() => { bubbleOp.value = withTiming(0, { duration: 400 }); }, 4000);
    } else {
      bubbleOp.value = withTiming(0, { duration: 300 });
    }
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const off = AlexiEvents.on('dataUpdated', () => {
      cancelAnimation(successOp);
      successOp.value = withSequence(withTiming(1, { duration: 10 }), withTiming(0, { duration: 850 }));
    });
    return off;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listenStyle  = useAnimatedStyle(() => ({ opacity: listenOp.value, transform: [{ scale: listenSc.value }] }));
  const ring1Style   = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot1.value}deg` }, { scale: sc1.value }] }));
  const ring2Style   = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot2.value}deg` }, { scale: sc2.value }] }));
  const ring3Style   = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot3.value}deg` }, { scale: sc3.value }] }));
  const glowBgStyle  = useAnimatedStyle(() => ({ opacity: glowBgOp.value }));
  const speakStyle   = useAnimatedStyle(() => ({ opacity: speakOp.value, transform: [{ scale: speakSc.value }] }));
  const avatarStyle  = useAnimatedStyle(() => ({ transform: [{ scale: avatarSc.value }] }));
  const bubbleStyle  = useAnimatedStyle(() => ({ opacity: bubbleOp.value }));
  const successStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  return (
    <View pointerEvents="box-none" style={cStyles.container}>

      {isSpeaking && !!responseText && (
        <RAnimated.View pointerEvents="none" style={[cStyles.bubble, bubbleStyle]}>
          <Text style={cStyles.bubbleText} numberOfLines={3}>{responseText}</Text>
          <View style={cStyles.bubbleTail} />
        </RAnimated.View>
      )}

      {isListening && (
        <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.listenRing, listenStyle]} />
      )}

      {isOrb && (
        <>
          <RAnimated.View pointerEvents="none" style={[cStyles.glowBg, glowBgStyle]} />
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc1, ring1Style]} />
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc2, ring2Style]} />
          <RAnimated.View pointerEvents="none" style={[cStyles.arcBase, cStyles.arc3, ring3Style]} />
        </>
      )}

      {isSpeaking && <RAnimated.View pointerEvents="none" style={[cStyles.speakGlow, speakStyle]} />}
      <RAnimated.View pointerEvents="none" style={[cStyles.successRing, successStyle]} />

      <TouchableOpacity
        onPress={() => isMuted ? setMutedState(false) : AlexiEvents.emit('open_chat', { query: null })}
        onLongPress={wakeAlexi}
        activeOpacity={0.85}
        delayLongPress={400}
      >
        <RAnimated.View style={[cStyles.avatarWrap, avatarStyle]}>
          <Image source={require('../assets/yara_spirit.png')} style={cStyles.avatar} resizeMode="cover" />
        </RAnimated.View>
      </TouchableOpacity>

    </View>
  );
}

const AV = 64;
const cStyles = StyleSheet.create({
  container:  { position: 'absolute', bottom: 92, right: 16, width: AV + 4, zIndex: 99985, alignItems: 'center', justifyContent: 'center' },
  bubble:     { position: 'absolute', bottom: AV + 18, right: 0, width: 184, backgroundColor: 'rgba(15,11,30,0.97)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(198,241,53,0.22)', paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#C6FF33', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 12 },
  bubbleText: { color: '#E8E3FF', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  bubbleTail: { position: 'absolute', bottom: -7, right: 26, width: 13, height: 13, backgroundColor: 'rgba(15,11,30,0.97)', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(198,241,53,0.22)', transform: [{ rotate: '45deg' }] },
  glowBg:     { position: 'absolute', width: AV * 1.35, height: AV * 1.35, borderRadius: AV * 0.675, backgroundColor: '#39FF14', shadowColor: '#39FF14', shadowOpacity: 1, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
  listenRing: { width: AV * 1.78, height: AV * 1.78, borderWidth: 1, borderColor: '#C6FF33', shadowColor: '#C6FF33', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  arcBase:    { position: 'absolute', borderRadius: 1000 },
  arc1:       { width: AV * 1.12, height: AV * 1.12, borderTopWidth: 2.5, borderRightWidth: 2.5, borderBottomWidth: 0, borderLeftWidth: 0.5, borderTopColor: '#39FF14', borderRightColor: '#39FF14', borderBottomColor: 'transparent', borderLeftColor: 'rgba(57,255,20,0.25)', shadowColor: '#39FF14', shadowOpacity: 0.85, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  arc2:       { width: AV * 1.42, height: AV * 1.42, borderTopWidth: 1.5, borderRightWidth: 0, borderBottomWidth: 1.5, borderLeftWidth: 0.5, borderTopColor: '#00E5FF', borderRightColor: 'transparent', borderBottomColor: '#00E5FF', borderLeftColor: 'rgba(0,229,255,0.3)', shadowColor: '#00E5FF', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  arc3:       { width: AV * 1.78, height: AV * 1.78, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 0, borderLeftWidth: 0, borderTopColor: '#C6FF33', borderRightColor: 'rgba(198,255,51,0.5)', borderBottomColor: 'transparent', borderLeftColor: 'transparent', shadowColor: '#C6FF33', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  speakGlow:  { position: 'absolute', width: AV * 1.4, height: AV * 1.4, borderRadius: AV * 0.7, backgroundColor: '#9B7FFF', shadowColor: '#9B7FFF', shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  successRing:{ position: 'absolute', width: AV + 14, height: AV + 14, borderRadius: (AV + 14) / 2, borderWidth: 2, borderColor: '#C6FF33', backgroundColor: 'transparent' },
  avatarWrap: { width: AV, height: AV, borderRadius: AV / 2, overflow: 'hidden' },
  avatar:     { width: AV, height: AV, borderRadius: AV / 2 },
});
