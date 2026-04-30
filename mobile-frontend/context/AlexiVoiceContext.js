/**
 * AlexiVoiceContext.js — Text-Only Chat Assistant
 *
 * Provides the Alexi chat assistant context: show/hide panel, execute text
 * commands, navigate screens, log data. No microphone or voice I/O.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALEXI_AUTOHIDE_MS = 7000;
const MIN_VISIBLE_MS = 4000;
const MUTE_KEY = "@alexi_muted";
const DEBUG_OVERLAY = false;

const { width: SW, height: SH } = Dimensions.get("window");

function playConfirmSound() {} // no-op — voice removed

// ─── Cross-screen event bus ────────────────────────────────────────────────────
export const AlexiEvents = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== fn);
    };
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => fn(data));
  },
};

// ─── L1: Phonetic snap ────────────────────────────────────────────────────────
// Fixes short (≤ 3-word) Whisper hallucinations before command parsing.
const NAV_SNAP = [
  {
    screen: "Profile",
    words: [
      "profile",
      "profiles",
      "account",
      "settings",
      "video",
      "video file",
      "for file",
      "pro file",
    ],
  },
  { screen: "Fuel", words: ["fuel", "food", "nutrition", "full", "few", "feel", "fell"] },
  { screen: "Insights", words: ["insights", "insight", "inside", "incite", "in sites"] },
  {
    screen: "Train",
    words: ["train", "training", "workout", "workouts", "exercise", "trim", "trend"],
  },
  { screen: "Home", words: ["home", "home screen", "homes"] },
  { screen: "PostureAI", words: ["posture", "form check", "check form", "posture check"] },
  {
    screen: "FoodScanner",
    words: ["scan", "scanner", "barcode", "scan food", "scan this", "take a photo"],
  },
  {
    screen: "MealLogger",
    words: ["log meal", "add food", "meal logger", "food log", "add a meal"],
  },
  { screen: "SleepLog", words: ["sleep log", "log sleep", "sleep tracker"] },
];

function snapShortTranscript(text) {
  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length > 3) return text;
  const joined = words.join(" ");
  for (const { screen, words: targets } of NAV_SNAP) {
    if (targets.some((w) => joined.includes(w))) return screen.toLowerCase();
  }
  return text;
}

function applyHallucMap(text) {
  const tl = text.toLowerCase().trim();
  const MAP = {
    "video file": "profile",
    video: "profile",
    "for file": "profile",
    "pro file": "profile",
    fell: "fuel",
    full: "fuel",
    feel: "fuel",
    trains: "train",
    incite: "insights",
    "in sites": "insights",
    inside: "insights",
  };
  const wc = tl.split(/\s+/).filter(Boolean).length;
  if (wc <= 3 && MAP[tl]) return MAP[tl];
  if (tl.includes("video") || tl.includes("file") || tl.startsWith("pro ")) return "profile";
  return text;
}

// ─── L2: Command parser ────────────────────────────────────────────────────────
// APP_MAP keys must match the actual screen names used in navigate().
// ROOT screens: navigate(screen) directly from the root Stack.
// TAB screens:  navigate('MainApp', { screen }) — inside the NavBar tab navigator.
// TRAIN screens: navigate('MainApp', { screen:'Train', params:{ screen } }) — nested.
const APP_MAP = {
  // Tab screens inside MainApp
  Home: [
    "home",
    "dashboard",
    "main",
    "summary",
    "overview",
    "start page",
    "go home",
    "home screen",
  ],
  Fuel: ["fuel", "nutrition", "meals", "macros", "eating", "diet", "food page", "nutrition page"],
  Train: ["train", "training", "workout page", "exercise page", "gym page", "library", "moves"],
  Insights: [
    "insights",
    "stats",
    "analytics",
    "progress",
    "charts",
    "data",
    "history",
    "trends",
    "performance",
  ],
  Profile: ["profile", "account", "settings", "my info", "targets"],
  // Root Stack screens
  FoodScanner: [
    "scan",
    "scanner",
    "barcode",
    "scan food",
    "scan this",
    "take a photo",
    "take photo",
    "food scanner",
    "camera scan",
  ],
  MealLogger: [
    "log meal",
    "add food",
    "meal logger",
    "food log",
    "log a meal",
    "add a meal",
    "add meal",
  ],
  SleepLog: ["sleep log", "log sleep", "sleep tracker", "sleep entry", "log my sleep"],
  // Nested inside Train tab stack
  WorkoutActive: [
    "active workout",
    "start workout",
    "begin workout",
    "let's go",
    "start a workout",
    "start training",
    "begin training",
  ],
  PostureAI: [
    "posture",
    "posture check",
    "posture ai",
    "check form",
    "check my form",
    "form check",
  ],
};

// resolveNavigation — maps a logical screen name to { screen, params } for navigationRef.
// The app has three levels:
//   Root stack (App.js)  → MainApp, MealLogger, FoodScanner, SleepLog, WorkoutSummary
//   Tab navigator        → Home, Fuel, Train, Insights, Profile  (inside MainApp)
//   Train stack          → WorkoutActive, PostureAI, ExerciseList (inside Train tab)
function resolveNavigation(screen, extraParams) {
  const ROOT_SCREENS = ["FoodScanner", "MealLogger", "FoodDetail", "SleepLog", "WorkoutSummary"];
  const TAB_SCREENS = ["Home", "Fuel", "Train", "Insights", "Profile"];
  const TRAIN_SCREENS = [
    "WorkoutActive",
    "PostureAI",
    "ExerciseList",
    "ExerciseInfo",
    "FlappyBirdGame",
  ];

  if (ROOT_SCREENS.includes(screen)) {
    return { screen, params: extraParams || undefined };
  }
  if (TAB_SCREENS.includes(screen)) {
    return { screen: "MainApp", params: { screen } };
  }
  if (TRAIN_SCREENS.includes(screen)) {
    return {
      screen: "MainApp",
      params: {
        screen: "Train",
        params: { screen, ...(extraParams ? { params: extraParams } : {}) },
      },
    };
  }
  // Unknown screen — try direct navigate and let React Navigation handle it
  console.warn("[Alexi] resolveNavigation: unknown screen", screen);
  return { screen, params: extraParams || undefined };
}

function parseCommand(text) {
  const t = text.toLowerCase().trim();
  if (!t) return { type: "AI_QUERY", query: text };

  // ── Go back / close ────────────────────────────────────────────────────────
  if (/\b(go back|go backwards?|back|close|dismiss|cancel|exit screen)\b/i.test(t))
    return { type: "GO_BACK" };

  // ── Utility ────────────────────────────────────────────────────────────────
  if (/show.*move|instructions?|form (guide|check|tip)|how to do (this|it)|help( me)?$/.test(t))
    return { type: "SHOW_INSTRUCTIONS" };
  if (/how many steps|steps today|my steps|step count/.test(t)) return { type: "SPEAK_STEPS" };
  if (/how am i doing|my stats|daily summary|check status|status/.test(t))
    return { type: "CHECK_STATUS" };
  if (/stop listening|go to sleep|mute|silence|be quiet|stop alexi/.test(t))
    return { type: "MUTE" };

  // ── Logging ────────────────────────────────────────────────────────────────
  if (
    /\b(log|add|drank|had water|drink water)\b.*\b(water|ml|oz)\b|\badd water\b|\bdrank\b/i.test(t)
  ) {
    const m = t.match(/(\d+)\s*(ml|milliliter|oz)/);
    return { type: "LOG_WATER", amount: m ? parseInt(m[1]) : 250 };
  }
  if (/log sleep|i slept|slept \d|(\d+) hours? sleep/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: "LOG_SLEEP", hours: m ? parseFloat(m[1]) : 7 };
  }
  if (/i weigh|my weight (is|was)|weigh(ing|s)? \d/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: "LOG_WEIGHT", weight_kg: m ? parseFloat(m[1]) : null };
  }
  if (/body fat|fat percentage|fat percent/.test(t)) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return { type: "LOG_METRIC", body_fat: m ? parseFloat(m[1]) : null };
  }
  if (
    /log (my )?food|i ate|i had|i just ate|log.*meal|log.*(breakfast|lunch|dinner|snack)/.test(t)
  ) {
    const calM = t.match(/(\d+)\s*(kcal|cal(?:orie)?s?)/);
    const proM = t.match(/(\d+)\s*g?\s*protein/);
    const carbM = t.match(/(\d+)\s*g?\s*carb/);
    const fatM = t.match(/(\d+)\s*g?\s*fat/);
    if (!calM && !proM && !carbM && !fatM) return { type: "AI_QUERY", query: text };
    const mealM = t.match(/\b(breakfast|lunch|dinner|snack)\b/);
    const nameM = t.match(
      /(?:ate|had|eat|log(?:ged)?)\s+(?:a |some |my )?([a-z ]+?)(?:\s*[-–,]|\s+\d|\s*$)/,
    );
    return {
      type: "LOG_FOOD",
      name: nameM?.[1]?.trim() || "food",
      calories: calM ? parseInt(calM[1]) : 0,
      protein_g: proM ? parseInt(proM[1]) : 0,
      carbs_g: carbM ? parseInt(carbM[1]) : 0,
      fat_g: fatM ? parseInt(fatM[1]) : 0,
      meal_type: mealM?.[1] ?? "snack",
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
    const isNavAlias = Object.values(APP_MAP)
      .flat()
      .some((a) => a === ex);
    if (!isNavAlias) {
      console.log("[Alexi] Exercise intent detected:", ex);
      return { type: "NAVIGATE", screen: "WorkoutActive", params: { exercise: ex } };
    }
  }

  // ── Navigation: intent verb first (highest priority) ───────────────────────
  const NAV_INTENT = /\b(go to|open|show me|navigate to|take me to|switch to|bring up|display)\b/i;
  if (NAV_INTENT.test(t)) {
    for (const [screen, aliases] of Object.entries(APP_MAP)) {
      if (aliases.some((a) => t.includes(a))) return { type: "NAVIGATE", screen };
    }
  }

  // ── Navigation: bare alias fallback ────────────────────────────────────────
  for (const [screen, aliases] of Object.entries(APP_MAP)) {
    const esc = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (new RegExp(`\\b(${esc.join("|")})\\b`, "i").test(t)) return { type: "NAVIGATE", screen };
  }

  // ── Long-form question → open chat ─────────────────────────────────────────
  if (/\b(explain|how does|what is|why does|tell me about)\b/i.test(t))
    return { type: "OPEN_CHAT", query: text };

  return { type: "AI_QUERY", query: text };
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AlexiVoiceContext = createContext(null);

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AlexiVoiceProvider({ children }) {
  const [passiveState, setPassiveState] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const permGranted = false; // voice removed — no mic permission needed
  const [lastTranscript, setLastTranscript] = useState("");
  const [debugLog, setDebugLog] = useState("Ready");
  const [isAlexiVisible, setIsAlexiVisible] = useState(false);
  const [responseText, setResponseText] = useState("");

  const mutedRef = useRef(false);
  const isMountedRef = useRef(true);
  const userNameRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isAlexiVisibleRef = useRef(false);
  const loopRef = useRef(false);
  const loopGenRef = useRef(0);
  const pausedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // ── Animations ──────────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const borderScale = useRef(new Animated.Value(1.04)).current;
  const siriGlow = useRef(new Animated.Value(0)).current;
  const earDotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isAlexiVisibleRef.current = isAlexiVisible;
  }, [isAlexiVisible]);

  useEffect(() => {
    Animated.timing(siriGlow, {
      toValue: isAlexiVisible ? 1 : 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [isAlexiVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (passiveState === "capturing") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.45, duration: 850, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 850, useNativeDriver: true }),
        ]),
      );
      const earLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(earDotScale, { toValue: 1.6, duration: 600, useNativeDriver: true }),
          Animated.timing(earDotScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      earLoop.start();
      return () => {
        loop.stop();
        earLoop.stop();
      };
    }
    pulseAnim.setValue(1);
    earDotScale.setValue(1);
  }, [passiveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const flashBorder = useCallback(() => {
    borderAnim.setValue(0);
    borderScale.setValue(1.04);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(borderAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 0.55, duration: 180, useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 0.85, duration: 140, useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(borderScale, { toValue: 1.0, duration: 220, useNativeDriver: true }),
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
    AsyncStorage.getItem(MUTE_KEY).then((val) => {
      const m = val === "true";
      mutedRef.current = m;
      setIsMuted(m);
    });
  }, []);

  // ── Fetch user first name ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, first_name")
          .eq("id", user.id)
          .maybeSingle();
        const first = (p?.first_name || p?.full_name || "").split(" ")[0].trim();
        if (first) userNameRef.current = first;
      } catch (_) {}
    })();
  }, []);

  // ── speak() — text-only, no TTS ──────────────────────────────────────────────
  const speak = useCallback((text) => {
    setResponseText(text);
    return Promise.resolve();
  }, []);

  // ── executeCommand ────────────────────────────────────────────────────────────
  const executeCommand = useCallback(async (commandText) => {
    if (!commandText?.trim()) return;
    const cmd = parseCommand(commandText);
    setDebugLog(`CMD: ${cmd.type}`);
    AlexiEvents.emit("command", cmd);

    switch (cmd.type) {
      case "SHOW_INSTRUCTIONS":
        await speak("Showing you the form now.");
        hideAlexiAfter();
        break;

      case "SPEAK_STEPS": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          const TODAY = new Date().toISOString().split("T")[0];
          const { data: act } = await supabase
            .from("daily_activity")
            .select("steps")
            .eq("user_id", user.id)
            .eq("date", TODAY)
            .maybeSingle();
          const s = act?.steps ?? 0;
          await speak(
            s > 8000
              ? `Amazing! ${s.toLocaleString()} steps today!`
              : s > 4000
                ? `${s.toLocaleString()} steps — keep moving!`
                : `${s.toLocaleString()} steps so far. Let's get those numbers up!`,
          );
        } catch (_) {
          await speak("I couldn't get your step count.");
        }
        hideAlexiAfter();
        break;
      }

      case "CHECK_STATUS": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          const TODAY = new Date().toISOString().split("T")[0];
          const [{ data: act }, { data: xp }] = await Promise.all([
            supabase
              .from("daily_activity")
              .select("steps, water_ml, sleep_hours")
              .eq("user_id", user.id)
              .eq("date", TODAY)
              .maybeSingle(),
            supabase
              .from("xp_log")
              .select("amount")
              .eq("user_id", user.id)
              .gte("earned_at", new Date(Date.now() - 7 * 86400000).toISOString()),
          ]);
          const steps = act?.steps ?? 0;
          const water = act?.water_ml ?? 0;
          const sleep = act?.sleep_hours ?? 0;
          const weekXP = (xp ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
          await speak(
            `Today: ${steps.toLocaleString()} steps, ${water}ml water` +
              (sleep > 0 ? `, ${sleep}h sleep` : "") +
              `. This week ${weekXP} XP. Keep it up!`,
          );
        } catch (_) {
          await speak("I couldn't pull your stats.");
        }
        hideAlexiAfter();
        break;
      }

      case "MUTE":
        await speak("I'll go quiet. Tap my icon whenever you need me.");
        hideAlexi();
        mutedRef.current = true;
        setIsMuted(true);
        await AsyncStorage.setItem(MUTE_KEY, "true");
        break;

      case "GO_BACK":
        await speak("Going back.");
        AlexiEvents.emit("go_back");
        hideAlexiAfter(2000);
        break;

      case "NAVIGATE": {
        const labels = {
          Home: "the home screen",
          Profile: "your profile",
          Fuel: "nutrition",
          Insights: "your insights",
          Train: "your training plan",
          WorkoutActive: "your workout",
          PostureAI: "posture check",
          FoodScanner: "the food scanner",
          MealLogger: "the meal logger",
          SleepLog: "sleep log",
        };
        const exercise = cmd.params?.exercise;
        const label = labels[cmd.screen] ?? cmd.screen.toLowerCase();
        const phrase = exercise
          ? `Let's do ${exercise}. Starting your workout.`
          : `Opening ${label}.`;
        await speak(phrase);
        const navArgs = resolveNavigation(cmd.screen, cmd.params);
        console.log("[Alexi] Emitting navigate:", JSON.stringify(navArgs));
        AlexiEvents.emit("navigate", navArgs);
        hideAlexiAfter(3000);
        break;
      }

      case "LOG_WATER": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          const TODAY = new Date().toISOString().split("T")[0];
          const { data: ex } = await supabase
            .from("daily_activity")
            .select("id, water_ml")
            .eq("user_id", user.id)
            .eq("date", TODAY)
            .maybeSingle();
          const newMl = (ex?.water_ml ?? 0) + cmd.amount;
          if (ex) await supabase.from("daily_activity").update({ water_ml: newMl }).eq("id", ex.id);
          else
            await supabase
              .from("daily_activity")
              .insert({ user_id: user.id, date: TODAY, water_ml: newMl });
          AlexiEvents.emit("dataUpdated", { type: "water", value: newMl });
          playConfirmSound();
          const n = userNameRef.current;
          await speak(`Logged ${cmd.amount}ml${n ? `, ${n}` : ""}! ${newMl}ml total today.`);
        } catch (_) {
          await speak("Sorry, I couldn't log your water.");
        }
        hideAlexiAfter();
        break;
      }

      case "LOG_SLEEP": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          const TODAY = new Date().toISOString().split("T")[0];
          await supabase
            .from("daily_activity")
            .upsert(
              { user_id: user.id, date: TODAY, sleep_hours: cmd.hours },
              { onConflict: "user_id,date" },
            );
          AlexiEvents.emit("dataUpdated", { type: "sleep", value: cmd.hours });
          playConfirmSound();
          await speak(`Logged ${cmd.hours} hours of sleep. Rest is where gains happen!`);
        } catch (_) {
          await speak("Sorry, I couldn't log your sleep.");
        }
        hideAlexiAfter();
        break;
      }

      case "LOG_WEIGHT": {
        if (!cmd.weight_kg) {
          await speak("I didn't catch your weight. Try again.");
          hideAlexiAfter();
          break;
        }
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          await supabase.from("body_metrics").insert({
            user_id: user.id,
            weight_kg: cmd.weight_kg,
            logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit("dataUpdated", { type: "weight", value: cmd.weight_kg });
          playConfirmSound();
          await speak(`Logged ${cmd.weight_kg} kilograms.`);
        } catch (_) {
          await speak("Sorry, I couldn't log your weight.");
        }
        hideAlexiAfter();
        break;
      }

      case "LOG_METRIC": {
        if (!cmd.body_fat) {
          await speak("I didn't catch the value. Try again.");
          hideAlexiAfter();
          break;
        }
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          await supabase.from("body_metrics").insert({
            user_id: user.id,
            body_fat_pct: cmd.body_fat,
            logged_at: new Date().toISOString(),
          });
          AlexiEvents.emit("dataUpdated", { type: "body_fat", value: cmd.body_fat });
          playConfirmSound();
          await speak(`Logged ${cmd.body_fat} percent body fat. Keep tracking!`);
        } catch (_) {
          await speak("Sorry, I couldn't log that.");
        }
        hideAlexiAfter();
        break;
      }

      case "LOG_FOOD": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            await speak("I couldn't find your account.");
            break;
          }
          const NOW_TS = new Date().toISOString();
          let foodId = null;
          const { data: existing } = await supabase
            .from("foods")
            .select("id")
            .ilike("name", cmd.name)
            .maybeSingle();
          if (existing) {
            foodId = existing.id;
          } else {
            const { data: nf } = await supabase
              .from("foods")
              .insert({
                name: cmd.name,
                calories_per_100g: cmd.calories ?? 0,
                protein_per_100g: cmd.protein_g ?? 0,
                carbs_per_100g: cmd.carbs_g ?? 0,
                fat_per_100g: cmd.fat_g ?? 0,
                source: "alexi_voice",
              })
              .select("id")
              .single();
            foodId = nf?.id ?? null;
          }
          if (foodId) {
            await supabase.from("food_logs").insert({
              user_id: user.id,
              food_id: foodId,
              consumed_at: NOW_TS,
              meal_type: cmd.meal_type ?? "snack",
              quantity_grams: 100,
            });
          }
          AlexiEvents.emit("dataUpdated", {
            type: "food",
            name: cmd.name,
            calories: cmd.calories ?? 0,
          });
          playConfirmSound();
          await speak(
            `Logged ${cmd.name}${cmd.calories ? ` — ${cmd.calories} kcal` : ""}. Nice work!`,
          );
        } catch (_) {
          await speak("Sorry, I couldn't log that food.");
        }
        hideAlexiAfter();
        break;
      }

      case "OPEN_CHAT":
        await speak("On it.");
        AlexiEvents.emit("open_chat", { query: cmd.query });
        break;

      case "AI_QUERY": {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const uid = user?.id ?? null;
          const { data: ai, error: aiErr } = await supabase.functions.invoke("ai-assistant", {
            body: { query: cmd.query, voiceMode: true, userId: uid },
          });
          if (aiErr || !ai?.response) {
            await speak("I couldn't reach my brain. Try again.");
            hideAlexiAfter();
            break;
          }
          if (ai.navigateTo) {
            AlexiEvents.emit("navigate", { screen: ai.navigateTo });
            await speak(`Opening ${ai.navigateTo.toLowerCase()}.`);
            hideAlexiAfter(3000);
            break;
          }
          if (ai.executed?.length > 0) {
            AlexiEvents.emit("dataUpdated", { executed: ai.executed });
            playConfirmSound();
          }
          await speak(ai.response);
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

  // ── wakeAlexi — tap trigger: open the chat panel ─────────────────────────────
  const wakeAlexi = useCallback(() => {
    if (mutedRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flashBorder();
    showAlexi();
    AlexiEvents.emit("open_chat", { query: null });
  }, [flashBorder, showAlexi]);

  // ── Public controls (no-ops — voice removed) ─────────────────────────────────
  const startPassive  = useCallback(() => {}, []);
  const stopPassive   = useCallback(() => {}, []);
  const pausePassive  = useCallback(() => {}, []);
  const resumePassive = useCallback(() => {}, []);

  const setMutedState = useCallback(async (muted) => {
    mutedRef.current = muted;
    setIsMuted(muted);
    await AsyncStorage.setItem(MUTE_KEY, String(muted));
    setPassiveState(muted ? "muted" : "idle");
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(hideTimerRef.current);
    };
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
    wakeAlexi,
    talkToAlexi: wakeAlexi, // alias for AlexiAssistant.js backward-compat
    startPassive,
    stopPassive,
    pausePassive,
    resumePassive,
    setMutedState,
    executeCommand,
    speakYara: speak,
  };

  return <AlexiVoiceContext.Provider value={value}>{children}</AlexiVoiceContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAlexiVoice() {
  const ctx = useContext(AlexiVoiceContext);
  if (!ctx) throw new Error("useAlexiVoice must be used inside <AlexiVoiceProvider>");
  return ctx;
}

// ─── AlexiDebugOverlay ────────────────────────────────────────────────────────
export function AlexiDebugOverlay() {
  const { passiveState, lastTranscript, debugLog, isAlexiVisible } = useAlexiVoice();
  if (!DEBUG_OVERLAY) return null;
  const color =
    passiveState === "listening"
      ? "#4488FF"
      : passiveState === "capturing"
        ? "#C6FF33"
        : passiveState === "transcribing"
          ? "#FFC832"
          : passiveState === "speaking"
            ? "#9B7FFF"
            : passiveState === "no_permission"
              ? "#FF6464"
              : passiveState === "muted"
                ? "#FF8C00"
                : "#8B82AD";
  return (
    <View style={dbgStyles.wrap} pointerEvents="none">
      <View style={dbgStyles.row}>
        <View style={[dbgStyles.dot, { backgroundColor: color }]} />
        <Text style={[dbgStyles.state, { color }]}>{passiveState.toUpperCase()}</Text>
        {isAlexiVisible && (
          <Text style={[dbgStyles.state, { color: "#C6FF33", marginLeft: 6 }]}>VISIBLE</Text>
        )}
      </View>
      <Text style={dbgStyles.line} numberOfLines={2}>
        {debugLog}
      </Text>
      {!!lastTranscript && (
        <Text style={dbgStyles.transcript} numberOfLines={2}>
          "{lastTranscript}"
        </Text>
      )}
    </View>
  );
}
const dbgStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 10,
    padding: 10,
    zIndex: 99999,
    borderWidth: 1,
    borderColor: "rgba(198,255,51,0.3)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  state: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  line: { color: "#C8BFEE", fontSize: 10, lineHeight: 14 },
  transcript: { color: "#C6FF33", fontSize: 10, marginTop: 4, lineHeight: 14 },
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
    position: "absolute",
    top: 0,
    left: 0,
    width: SW,
    height: SH,
    borderWidth: 3,
    borderColor: "#C6FF33",
    zIndex: 9998,
    shadowColor: "#C6FF33",
    shadowOpacity: 0.85,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
});

// ─── AlexiSiriGlow ────────────────────────────────────────────────────────────
export function AlexiSiriGlow() {
  const { siriGlow, isAlexiVisible } = useAlexiVoice();
  const speakPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isAlexiVisible) {
      speakPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(speakPulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(speakPulse, { toValue: 0.85, duration: 600, useNativeDriver: true }),
      ]),
    );
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#C6FF33",
    shadowColor: "#C6FF33",
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
    zIndex: 9997,
  },
});

// ─── AlexiEarDot ──────────────────────────────────────────────────────────────
export function AlexiEarDot() {
  // Voice removed — ear dot never shown
  return null;
  const color =
    passiveState === "speaking"
      ? "#9B7FFF"
      : passiveState === "transcribing"
        ? "#FFC832"
        : passiveState === "listening"
          ? "#4488FF"
          : "#C6FF33";
  return (
    <TouchableOpacity onPress={wakeAlexi} activeOpacity={0.7} style={earStyles.hitArea}>
      <Animated.View
        style={[
          earStyles.dot,
          {
            backgroundColor: color,
            shadowColor: color,
            transform: [{ scale: passiveState === "listening" ? earDotScale : 1 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}
const earStyles = StyleSheet.create({
  hitArea: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99998,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

// ─── AlexiVoiceOrb ────────────────────────────────────────────────────────────
export function AlexiVoiceOrb({ style }) {
  const { isMuted, setMutedState } = useAlexiVoice();

  const orbBg     = isMuted ? "rgba(255,80,80,0.10)" : "rgba(198,255,51,0.12)";
  const orbBorder = isMuted ? "rgba(255,80,80,0.45)" : "rgba(198,255,51,0.55)";
  const iconColor = isMuted ? "#FF6464" : "#C6FF33";

  const handlePress = () => {
    if (isMuted) setMutedState(false);
    else AlexiEvents.emit("open_chat", { query: null });
  };

  return (
    <TouchableOpacity
      style={[orbStyles.orb, { backgroundColor: orbBg, borderColor: orbBorder }, style]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Ionicons name={isMuted ? "chatbubble-ellipses-outline" : "chatbubble-ellipses"} size={17} color={iconColor} />
    </TouchableOpacity>
  );
}
const orbStyles = StyleSheet.create({
  orb: {
    position: "absolute",
    bottom: 90,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  pulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(198,255,51,0.14)",
  },
});

// ─── AlexiCompanion ───────────────────────────────────────────────────────────
export function AlexiCompanion() {
  const { passiveState, responseText, setMutedState, isMuted, wakeAlexi } = useAlexiVoice();

  const isOrb = ["capturing", "transcribing"].includes(passiveState);
  const isListening = passiveState === "listening";
  const isSpeaking = passiveState === "speaking";

  const avatarSc = useSharedValue(1);
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);
  const sc1 = useSharedValue(1);
  const sc2 = useSharedValue(1);
  const sc3 = useSharedValue(1);
  const glowBgOp = useSharedValue(0);
  const listenSc = useSharedValue(1);
  const listenOp = useSharedValue(0);
  const speakOp = useSharedValue(0);
  const speakSc = useSharedValue(1);
  const bubbleOp = useSharedValue(0);
  const successOp = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(avatarSc);
    avatarSc.value = withTiming(1, { duration: 200 });
    cancelAnimation(rot1);
    rot1.value = 0;
    cancelAnimation(rot2);
    rot2.value = 0;
    cancelAnimation(rot3);
    rot3.value = 0;
    cancelAnimation(sc1);
    sc1.value = 1;
    cancelAnimation(sc2);
    sc2.value = 1;
    cancelAnimation(sc3);
    sc3.value = 1;
    cancelAnimation(glowBgOp);
    glowBgOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(listenSc);
    listenSc.value = 1;
    cancelAnimation(listenOp);
    listenOp.value = withTiming(0, { duration: 300 });
    cancelAnimation(speakOp);
    speakOp.value = withTiming(0, { duration: 250 });
    cancelAnimation(speakSc);
    speakSc.value = 1;

    if (isListening) {
      listenOp.value = withRepeat(
        withSequence(withTiming(0.22, { duration: 1400 }), withTiming(0.0, { duration: 1400 })),
        -1,
        false,
      );
      listenSc.value = withRepeat(
        withSequence(withTiming(1.55, { duration: 1400 }), withTiming(1.0, { duration: 1400 })),
        -1,
        false,
      );
    } else if (isOrb) {
      rot1.value = withRepeat(
        withTiming(360, { duration: 2400, easing: Easing.linear }),
        -1,
        false,
      );
      rot2.value = withRepeat(
        withTiming(-360, { duration: 3800, easing: Easing.linear }),
        -1,
        false,
      );
      rot3.value = withRepeat(
        withTiming(360, { duration: 6000, easing: Easing.linear }),
        -1,
        false,
      );
      sc1.value = withRepeat(
        withSequence(withTiming(1.09, { duration: 700 }), withTiming(1.0, { duration: 700 })),
        -1,
        false,
      );
      sc2.value = withDelay(
        233,
        withRepeat(
          withSequence(withTiming(1.07, { duration: 1050 }), withTiming(1.0, { duration: 1050 })),
          -1,
          false,
        ),
      );
      sc3.value = withDelay(
        466,
        withRepeat(
          withSequence(withTiming(1.05, { duration: 1400 }), withTiming(1.0, { duration: 1400 })),
          -1,
          false,
        ),
      );
      glowBgOp.value = withRepeat(
        withSequence(withTiming(0.28, { duration: 1200 }), withTiming(0.08, { duration: 1200 })),
        -1,
        false,
      );
      avatarSc.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1.0, { duration: 1200 })),
        -1,
        false,
      );
    } else if (isSpeaking) {
      speakOp.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 500 }), withTiming(0.22, { duration: 500 })),
        -1,
        false,
      );
      speakSc.value = withRepeat(
        withSequence(withTiming(1.5, { duration: 500 }), withTiming(1.1, { duration: 500 })),
        -1,
        false,
      );
      avatarSc.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 500 }), withTiming(0.97, { duration: 500 })),
        -1,
        false,
      );
    }
  }, [passiveState]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    const off = AlexiEvents.on("dataUpdated", () => {
      cancelAnimation(successOp);
      successOp.value = withSequence(
        withTiming(1, { duration: 10 }),
        withTiming(0, { duration: 850 }),
      );
    });
    return off;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listenStyle = useAnimatedStyle(() => ({
    opacity: listenOp.value,
    transform: [{ scale: listenSc.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot1.value}deg` }, { scale: sc1.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot2.value}deg` }, { scale: sc2.value }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot3.value}deg` }, { scale: sc3.value }],
  }));
  const glowBgStyle = useAnimatedStyle(() => ({ opacity: glowBgOp.value }));
  const speakStyle = useAnimatedStyle(() => ({
    opacity: speakOp.value,
    transform: [{ scale: speakSc.value }],
  }));
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarSc.value }] }));
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: bubbleOp.value }));
  const successStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  return (
    <View pointerEvents="box-none" style={cStyles.container}>
      {isSpeaking && !!responseText && (
        <RAnimated.View pointerEvents="none" style={[cStyles.bubble, bubbleStyle]}>
          <Text style={cStyles.bubbleText} numberOfLines={3}>
            {responseText}
          </Text>
          <View style={cStyles.bubbleTail} />
        </RAnimated.View>
      )}

      {isListening && (
        <RAnimated.View
          pointerEvents="none"
          style={[cStyles.arcBase, cStyles.listenRing, listenStyle]}
        />
      )}

      {isOrb && (
        <>
          <RAnimated.View pointerEvents="none" style={[cStyles.glowBg, glowBgStyle]} />
          <RAnimated.View
            pointerEvents="none"
            style={[cStyles.arcBase, cStyles.arc1, ring1Style]}
          />
          <RAnimated.View
            pointerEvents="none"
            style={[cStyles.arcBase, cStyles.arc2, ring2Style]}
          />
          <RAnimated.View
            pointerEvents="none"
            style={[cStyles.arcBase, cStyles.arc3, ring3Style]}
          />
        </>
      )}

      {isSpeaking && (
        <RAnimated.View pointerEvents="none" style={[cStyles.speakGlow, speakStyle]} />
      )}
      <RAnimated.View pointerEvents="none" style={[cStyles.successRing, successStyle]} />

      <TouchableOpacity
        onPress={() =>
          isMuted ? setMutedState(false) : AlexiEvents.emit("open_chat", { query: null })
        }
        onLongPress={wakeAlexi}
        activeOpacity={0.85}
        delayLongPress={400}
      >
        <RAnimated.View style={[cStyles.avatarWrap, avatarStyle]}>
          <Image
            source={require("../assets/alexi_avatar.png")}
            style={cStyles.avatar}
            resizeMode="cover"
          />
        </RAnimated.View>
      </TouchableOpacity>
    </View>
  );
}

const AV = 64;
const cStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 92,
    right: 16,
    width: AV + 4,
    zIndex: 99985,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    bottom: AV + 18,
    right: 0,
    width: 184,
    backgroundColor: "rgba(15,11,30,0.97)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(198,241,53,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#C6FF33",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  bubbleText: { color: "#E8E3FF", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  bubbleTail: {
    position: "absolute",
    bottom: -7,
    right: 26,
    width: 13,
    height: 13,
    backgroundColor: "rgba(15,11,30,0.97)",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(198,241,53,0.22)",
    transform: [{ rotate: "45deg" }],
  },
  glowBg: {
    position: "absolute",
    width: AV * 1.35,
    height: AV * 1.35,
    borderRadius: AV * 0.675,
    backgroundColor: "#39FF14",
    shadowColor: "#39FF14",
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  listenRing: {
    width: AV * 1.78,
    height: AV * 1.78,
    borderWidth: 1,
    borderColor: "#C6FF33",
    shadowColor: "#C6FF33",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  arcBase: { position: "absolute", borderRadius: 1000 },
  arc1: {
    width: AV * 1.12,
    height: AV * 1.12,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 0,
    borderLeftWidth: 0.5,
    borderTopColor: "#39FF14",
    borderRightColor: "#39FF14",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(57,255,20,0.25)",
    shadowColor: "#39FF14",
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  arc2: {
    width: AV * 1.42,
    height: AV * 1.42,
    borderTopWidth: 1.5,
    borderRightWidth: 0,
    borderBottomWidth: 1.5,
    borderLeftWidth: 0.5,
    borderTopColor: "#00E5FF",
    borderRightColor: "transparent",
    borderBottomColor: "#00E5FF",
    borderLeftColor: "rgba(0,229,255,0.3)",
    shadowColor: "#00E5FF",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  arc3: {
    width: AV * 1.78,
    height: AV * 1.78,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#C6FF33",
    borderRightColor: "rgba(198,255,51,0.5)",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    shadowColor: "#C6FF33",
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  speakGlow: {
    position: "absolute",
    width: AV * 1.4,
    height: AV * 1.4,
    borderRadius: AV * 0.7,
    backgroundColor: "#9B7FFF",
    shadowColor: "#9B7FFF",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  successRing: {
    position: "absolute",
    width: AV + 14,
    height: AV + 14,
    borderRadius: (AV + 14) / 2,
    borderWidth: 2,
    borderColor: "#C6FF33",
    backgroundColor: "transparent",
  },
  avatarWrap: { width: AV, height: AV, borderRadius: AV / 2, overflow: "hidden" },
  avatar: { width: AV, height: AV, borderRadius: AV / 2 },
});
