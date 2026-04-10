/**
 * YaraAssistant.js
 * Floating AI coach with Claude-style conversation history sidebar.
 * Sidebar: persistent on wide screens (>600px), slide-in overlay on mobile.
 * Storage: AsyncStorage — conversations persist across sessions.
 */
import {
  ActivityIndicator, Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { registerTourRef } from './onBoarding/tourRefs';
import { useNutrition } from '../hooks/useNutrition';
import { useProfile } from '../hooks/useProfile';
import { useToday } from '../context/TodayContext';
import { invokeEdgePublic, supabase } from '../config/supabase';
import { DEFAULT_TARGETS } from '../constants/targets';

const SIDEBAR_W      = 272;
const STORAGE_KEY    = '@yara_conversations';
const MAX_CONVS      = 50;
const IS_WIDE        = Dimensions.get('window').width > 600;

const SUGGESTIONS = [
  "What should I eat today?",
  "How do I push through low motivation?",
  "Am I training enough?",
  "Best pre-workout meal?",
  "How do I recover faster?",
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const fmtTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const fmtDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

async function getFunctionErrorDetail(error) {
  if (!error) return '';
  if (error?.context) {
    try {
      const payload = await error.context.json();
      return payload?.reason || payload?.error || payload?.message || '';
    } catch {
      try {
        return await error.context.text();
      } catch {
        return '';
      }
    }
  }
  return error?.message || '';
}

async function invokeYara(body) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body });
    if (error) {
      const detail = await getFunctionErrorDetail(error);
      throw new Error(detail || error.message);
    }
    if (!data) throw new Error('Empty response from assistant');
    return data;
  } catch (error) {
    const message = error?.message || '';
    if (/invalid jwt/i.test(message) || /non-2xx/i.test(message)) {
      return invokeEdgePublic('ai-assistant', body);
    }
    throw error;
  }
}

function buildClientTodayContext({
  profile, goals, eaten, protein, carbs, fat,
  waterMl, caloriesBurned, mealSections,
  sleepHours, sleepQuality, muscleFatigue,
}) {
  const recentMeals = (mealSections || [])
    .filter((meal) => meal.logged)
    .map((meal) => ({
      meal_type: meal.id,
      foods: meal.items.map((item) => item.name).join(', '),
      calories: meal.totals?.calories ?? 0,
    }));

  const fatigueList = (muscleFatigue || []).map((m) => ({
    muscle: m.muscle_name,
    pct: m.fatigue_pct,
  }));

  return {
    profile: profile ? {
      full_name: profile.full_name,
      goal: profile.goal,
      activity_level: profile.activity_level,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      gender: profile.gender,
      assistant_tone: profile.assistant_tone,
      experience: profile.experience,
      equipment: profile.equipment,
      diet_pref: profile.diet_pref,
      sleep_quality: profile.sleep_quality,
      stress_level: profile.stress_level,
    } : null,
    today: {
      date: new Date().toISOString().slice(0, 10),
      calories_eaten: eaten || 0,
      calorie_target: goals?.calorie_target || DEFAULT_TARGETS.calorie_target,
      protein_eaten: protein || 0,
      protein_target: goals?.protein_target || DEFAULT_TARGETS.protein_target,
      carbs_eaten: carbs || 0,
      carbs_target: goals?.carbs_target || DEFAULT_TARGETS.carbs_target,
      fat_eaten: fat || 0,
      fat_target: goals?.fat_target || DEFAULT_TARGETS.fat_target,
      water_ml: waterMl || 0,
      water_target_ml: goals?.water_target_ml || DEFAULT_TARGETS.water_target_ml,
      calories_burned: caloriesBurned || 0,
      sleep_hours: sleepHours ?? null,
      sleep_quality: sleepQuality ?? null,
      muscle_fatigue: fatigueList,
      meals: recentMeals,
    },
  };
}

// Greeting is used in three places — single source of truth
const getGreeting = (profile, name) => profile
  ? `Hey ${name}! I'm Yara, your personal coach inside BodyQ. I already know your profile — goal, targets, all of it. What's on your mind today?`
  : "Hey! I'm Yara — your personal coach. Ask me anything about training, nutrition, or recovery.";

const makeConv = (greeting) => ({
  id: uid(),
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  messages: [{ from: 'yara', text: greeting, time: fmtTime() }],
});

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anims = [d0, d1, d2].map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -5, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0,  duration: 280, useNativeDriver: true }),
        Animated.delay(500),
      ]))
    );
    Animated.parallel(anims).start();
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 2 }}>
      {[d0, d1, d2].map((d, i) => (
        <Animated.View key={i} style={[s.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YaraAssistant() {
  const { profile, name, userId } = useProfile();
  const { goals, eaten, protein, carbs, fat, waterMl, caloriesBurned, mealSections } = useNutrition();
  const { sleepHours, sleepQuality, muscleFatigue } = useToday();
  const insets = useSafeAreaInsets();

  const [open,        setOpen]        = useState(false);
  const [input,       setInput]       = useState('');
  const [typing,      setTyping]      = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations,  setConversations]  = useState([]);
  const [activeConvId,   setActiveConvId]   = useState(null);

  // ── Voice / Hands-Free mode ──────────────────────────────────
  // listenState: 'idle' | 'listening' | 'processing' | 'speaking'
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [listenState,   setListenState]   = useState('idle');
  const [voiceError,    setVoiceError]    = useState(null);
  const recordingRef     = useRef(null);
  const recordTimeoutRef = useRef(null);
  const voiceLoopRef     = useRef(false); // true while hands-free loop is active

  // Lime pulse for listening state
  const limePulse = useRef(new Animated.Value(1)).current;
  // Speak vibrate for speaking state
  const speakVibrate = useRef(new Animated.Value(1)).current;

  // ── User Insights (sidebar panel) ─────────────────────────────────────────
  // Stores the 4 AI-generated profile insight cards fetched from user_insights.
  const [userInsights,       setUserInsights]       = useState([]);
  const [insightsLoading,    setInsightsLoading]    = useState(false);
  const [insightsRefreshing, setInsightsRefreshing] = useState(false);
  const clientContext = buildClientTodayContext({
    profile,
    goals,
    eaten,
    protein,
    carbs,
    fat,
    waterMl,
    caloriesBurned,
    mealSections,
    sleepHours,
    sleepQuality,
    muscleFatigue,
  });

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages   = activeConv?.messages ?? [];

  const slideY      = useRef(new Animated.Value(500)).current;
  const fadeBack    = useRef(new Animated.Value(0)).current;
  const sidebarX    = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const sidebarFade = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef(null);
  const fabScale    = useRef(new Animated.Value(1)).current;
  const bobAnim     = useRef(new Animated.Value(0)).current;

  // Persist to AsyncStorage — errors logged, never silently lost
  const persist = async (convs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (e) {
      console.error('YaraAssistant: failed to persist conversations', e);
    }
  };

  // Update state and persist atomically
  const setAndPersist = (updater) => {
    setConversations(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  };

  // ── Fetch user insights from Supabase ────────────────────────────────────
  // Reads the latest 4 rows from user_insights for the logged-in user.
  // Called on mount (once userId resolves) and after a successful refresh.
  const fetchUserInsights = async (uid) => {
    if (!uid) return;
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_insights')
        .select('insight_type, message, icon, color')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(4);
      if (!error && data) setUserInsights(data);
    } catch (e) {
      console.error('YaraAssistant: fetchUserInsights error', e);
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── Refresh insights for the current user ────────────────────────────────
  // Calls the generate-user-insights Edge Function for this user, which
  // replaces their existing rows and returns the fresh cards directly so
  // we can update state without a second round-trip.
  const refreshInsights = async () => {
    if (!userId || insightsRefreshing) return;
    setInsightsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-user-insights', {
        body: { userId },
      });
      if (error) {
        // Silently fail - insights function may not be deployed
        console.log('Insights unavailable - this is optional');
        return;
      }
      if (data?.insights?.length) setUserInsights(data.insights);
    } catch (e) {
      // Silently fail - insights are optional
      console.log('YaraAssistant: refreshInsights unavailable (optional feature)');
    } finally {
      setInsightsRefreshing(false);
    }
  };

  // ── Admin: refresh insights for ALL users ────────────────────────────────
  // Only rendered when profile.is_admin === true.  Requires ADMIN_SECRET to
  // be set as a Supabase secret (Settings → Edge Functions → Secrets).
  const refreshAllInsights = async () => {
    if (insightsRefreshing) return;
    const adminKey = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? '';
    setInsightsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-user-insights', {
        body: { all: true, adminKey },
      });
      if (error) {
        console.log('Admin bulk insights unavailable (optional feature)');
        return;
      }
      console.log('Admin bulk refresh result:', data);
      // Reload the current user's own insights after the bulk run
      await fetchUserInsights(userId);
    } catch (e) {
      console.log('YaraAssistant: refreshAllInsights unavailable (optional feature)');
    } finally {
      setInsightsRefreshing(false);
    }
  };

  // Fetch insights once the userId becomes available (resolves after profile loads)
  useEffect(() => {
    if (userId) fetchUserInsights(userId);
  }, [userId]);

  // Load saved conversations once on mount; create greeting conv if none exist
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length > 0) {
            setConversations(saved);
            setActiveConvId(saved[0].id);
            return;
          }
        }
        // No history — bootstrap with greeting (profile not yet loaded at this point)
        const conv = makeConv(getGreeting(null, 'there'));
        setConversations([conv]);
        setActiveConvId(conv.id);
        persist([conv]);
      })
      .catch(() => {});
  }, []);

  // FAB breathe + bob
  useEffect(() => {
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(bobAnim, { toValue: -10, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bobAnim, { toValue: 0,   duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    breathe.start();
    bob.start();
    return () => { breathe.stop(); bob.stop(); };
  }, []);

  const glowOpacityOuter = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [0.18, 0.42] });
  const glowOpacityMid   = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [0.28, 0.60] });
  const glowScaleOuter   = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [1, 1.18] });

  // Listening glow — rapid lime pulse
  useEffect(() => {
    if (listenState === 'listening') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(limePulse, { toValue: 1.35, duration: 500, useNativeDriver: true }),
        Animated.timing(limePulse, { toValue: 1.00, duration: 500, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      limePulse.setValue(1);
    }
  }, [listenState]);

  // Speaking vibrate — quick micro-scale on mascot
  useEffect(() => {
    if (listenState === 'speaking') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(speakVibrate, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(speakVibrate, { toValue: 0.96, duration: 120, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      speakVibrate.setValue(1);
    }
  }, [listenState]);

  // ── Voice helpers ─────────────────────────────────────────────

  const stopRecordingClean = async () => {
    clearTimeout(recordTimeoutRef.current);
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) await recordingRef.current.stopAndUnloadAsync();
      } catch (_) {}
      recordingRef.current = null;
    }
  };

  const speakResponse = (text, onDone) => {
    setListenState('speaking');
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch:    1.15,
      rate:     1.0,
      onDone:   () => {
        setListenState('idle');
        onDone?.();
      },
      onStopped: () => setListenState('idle'),
      onError:   () => setListenState('idle'),
    });
  };

  const handleActionCommand = async (commandJson) => {
    try {
      const cmd = JSON.parse(commandJson);
      if (!userId) return;
      const TODAY = new Date().toISOString().split('T')[0];
      if (cmd.action === 'log_water') {
        const ml = cmd.amount ?? 250;
        const { data: ex } = await supabase.from('daily_activity').select('id, water_ml').eq('user_id', userId).eq('date', TODAY).maybeSingle();
        const newMl = (ex?.water_ml ?? 0) + ml;
        if (ex) await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', ex.id);
        else     await supabase.from('daily_activity').insert({ user_id: userId, date: TODAY, water_ml: newMl });
      }
      if (cmd.action === 'log_sleep') {
        const hrs = cmd.hours ?? 7;
        await supabase.from('daily_activity').upsert({ user_id: userId, date: TODAY, sleep_hours: hrs }, { onConflict: 'user_id,date' });
      }
    } catch (e) {
      console.error('[Yara voice] action command error:', e.message);
    }
  };

  const startListening = async () => {
    setVoiceError(null);
    try {
      // Set audio mode for recording with ducking
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:            true,
        playsInSilentModeIOS:          true,
        shouldDuckAndroid:             true,
        playThroughEarpieceAndroid:    false,
        staysActiveInBackground:       false,
      });
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setVoiceError('Microphone permission denied.'); return; }

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: { extension: '.m4a', outputFormat: 2, audioEncoder: 3, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
        ios:     { extension: '.m4a', outputFormat: 'aac ', audioQuality: 127, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
        web:     {},
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setListenState('listening');

      // Auto-stop after 8 seconds
      recordTimeoutRef.current = setTimeout(() => stopAndTranscribe(), 8000);
    } catch (e) {
      console.error('[Yara voice] startListening error:', e.message);
      setVoiceError('Could not start microphone.');
      setListenState('idle');
    }
  };

  const stopAndTranscribe = async () => {
    clearTimeout(recordTimeoutRef.current);
    if (listenState !== 'listening' || !recordingRef.current) return;
    setListenState('processing');

    try {
      const rec = recordingRef.current;
      recordingRef.current = null;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error('No audio file');

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

      // Transcribe via Groq Whisper (through our edge function)
      const sttData = await invokeYara({ audioBase64: base64, mimeType: 'audio/m4a' });
      const transcript = sttData?.transcript?.trim();
      if (!transcript) throw new Error('No transcript');

      // Show transcript and send
      setInput(transcript);
      await sendVoice(transcript);
    } catch (e) {
      console.error('[Yara voice] transcribe error:', e.message);
      setVoiceError('Could not understand. Try again.');
      setListenState('idle');
      if (voiceLoopRef.current) setTimeout(startListening, 1200);
    }
  };

  const sendVoice = async (transcript) => {
    if (!transcript || !userId) { setListenState('idle'); return; }
    setTyping(true);
    setInput('');

    setAndPersist(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        title:    c.title === 'New conversation' ? transcript.slice(0, 42) : c.title,
        messages: [...c.messages, { from: 'user', text: transcript, time: fmtTime() }],
      };
    }));

    try {
      let data = await invokeYara({ userId, query: transcript, voiceMode: true, clientContext });
      if (!data?.response) data = await invokeYara({ query: transcript, voiceMode: true, clientContext });
      if (!data?.response) throw new Error('Empty response');

      // Strip any COMMAND JSON from the spoken text
      const commandMatch = data.response.match(/COMMAND:(\{.*\})/);
      const spokenText   = data.response.replace(/COMMAND:\{.*\}/, '').trim();

      if (commandMatch) await handleActionCommand(commandMatch[1]);

      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c, messages: [...c.messages, { from: 'yara', text: spokenText, time: fmtTime() }],
      }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      speakResponse(spokenText, () => {
        // Auto-restart loop if hands-free is still on
        if (voiceLoopRef.current) setTimeout(startListening, 600);
      });
    } catch (e) {
      console.error('[Yara voice] sendVoice error:', e.message);
      setListenState('idle');
      if (voiceLoopRef.current) setTimeout(startListening, 1200);
    } finally {
      setTyping(false);
    }
  };

  const toggleHandsFree = async () => {
    const next = !handsFreeMode;
    setHandsFreeMode(next);
    voiceLoopRef.current = next;
    if (next) {
      startListening();
    } else {
      await stopRecordingClean();
      Speech.stop();
      setListenState('idle');
    }
  };

  const openChat = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(slideY,   { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeChat = () => {
    if (sidebarOpen) closeSidebar();
    // Stop mic + speech when closing
    voiceLoopRef.current = false;
    setHandsFreeMode(false);
    setListenState('idle');
    stopRecordingClean();
    Speech.stop();
    Animated.parallel([
      Animated.timing(slideY,   { toValue: 500, duration: 230, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(sidebarX,    { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      Animated.timing(sidebarFade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(sidebarX,    { toValue: -SIDEBAR_W, duration: 220, useNativeDriver: true }),
      Animated.timing(sidebarFade, { toValue: 0,          duration: 180, useNativeDriver: true }),
    ]).start(() => setSidebarOpen(false));
  };

  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100);
  };

  const newChat = () => {
    const conv = makeConv(getGreeting(profile, name));
    // Cap at MAX_CONVS to prevent unbounded growth
    setAndPersist(prev => [conv, ...prev].slice(0, MAX_CONVS));
    setActiveConvId(conv.id);
    if (!IS_WIDE) openSidebar();
    scrollToBottom(false);
  };

  const loadConversation = (id) => {
    setActiveConvId(id);
    if (!IS_WIDE) closeSidebar();
    scrollToBottom(false);
  };

  useEffect(() => {
    if (!open || !activeConvId) return;
    scrollToBottom(true);
  }, [open, activeConvId, messages.length]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

    if (!userId) {
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, {
          from: 'yara',
          text: "Still loading your profile — give it a second and try again!",
          time: fmtTime(),
        }],
      }));
      return;
    }

    setInput('');
    setTyping(true);

    setAndPersist(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        title: c.title === 'New conversation' ? msg.slice(0, 42) : c.title,
        messages: [...c.messages, { from: 'user', text: msg, time: fmtTime() }],
      };
    }));

    try {
      let data = await invokeYara({ userId, query: msg, clientContext });
      if (!data?.response) data = await invokeYara({ query: msg, clientContext });

      if (!data?.response) throw new Error('Empty response from assistant');

      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, { from: 'yara', text: data.response, time: fmtTime() }],
      }));
    } catch (err) {
      console.error('Yara error:', err.message);
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, { from: 'yara', text: "Connection issue — try again!", time: fmtTime() }],
      }));
    } finally {
      setTyping(false);
    }
    scrollToBottom(true);
  };

  function renderSidebar() {
    return (
      <View style={[s.sidebar, { flex: 1, paddingTop: insets.top }]}> 
        <View style={s.sidebarHead}>
          <View style={s.sidebarBrand}>
            <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
            <Text style={s.sidebarBrandTxt}>Yara</Text>
          </View>
          <View style={s.sidebarHeadRight}>
            {!IS_WIDE && (
              <TouchableOpacity style={s.hideHistoryBtn} onPress={closeSidebar} activeOpacity={0.8}>
                <Text style={s.hideHistoryTxt}>Hide</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.newChatBtn} onPress={newChat} activeOpacity={0.8}>
              <Text style={s.newChatTxt}>＋ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
          <Text style={s.sidebarSectionLabel}>CONVERSATIONS</Text>
          {conversations.length > 0 && (
            <Text style={s.historyHint}>Tap a past chat below to reopen it.</Text>
          )}
          {conversations.length === 0 && (
            <Text style={s.historyHint}>No saved conversations yet — start a new chat to save one.</Text>
          )}
          {conversations.map(conv => (
            <TouchableOpacity
              key={conv.id}
              style={[s.convItem, conv.id === activeConvId && s.convItemActive]}
              onPress={() => loadConversation(conv.id)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.convTitle, conv.id === activeConvId && s.convTitleActive]} numberOfLines={1} ellipsizeMode="tail">
                  {conv.title}
                </Text>
                <Text style={s.convDate}>{fmtDate(conv.createdAt)}</Text>
              </View>
                </TouchableOpacity>
          ))}

          {/* Admin bulk-refresh button — only visible to admin users */}
          {profile?.is_admin === true && (
            <TouchableOpacity
              style={[s.adminRefreshBtn, insightsRefreshing && { opacity: 0.5 }]}
              onPress={refreshAllInsights}
              disabled={insightsRefreshing}
              activeOpacity={0.8}
            >
              <Text style={s.adminRefreshTxt}>
                {insightsRefreshing ? 'Running…' : '⚡ Refresh All Users'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  function renderChat() {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.header}>
          {!IS_WIDE && (
            <TouchableOpacity style={s.historyBtn} onPress={openSidebar} activeOpacity={0.7}>
              <View style={s.hamburgerIcon}>
                <View style={s.hLine} />
                <View style={s.hLine} />
                <View style={s.hLine} />
              </View>
              <Text style={s.historyBtnTxt}>
                History{conversations.length > 1 ? ` (${conversations.length})` : ''}
              </Text>
            </TouchableOpacity>
          )}
          <View style={s.headerAvatarWrap}>
            <Text style={{ fontSize: 24 }}>👩‍⚕️</Text>
            <View style={s.headerOnlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName}>Yara</Text>
            <Text style={s.headerSub}>
              {listenState === 'listening'  ? '🎙 Listening…'   :
               listenState === 'processing' ? '⚙ Thinking…'     :
               listenState === 'speaking'   ? '🔊 Speaking…'    :
               profile ? 'Knows your profile ✓' : 'Personal Coach'}
            </Text>
          </View>
          {/* Hands-Free toggle */}
          <TouchableOpacity
            style={[s.handsFreeBtn, handsFreeMode && s.handsFreeBtnOn]}
            onPress={toggleHandsFree}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14 }}>{handsFreeMode ? '🎙' : '🎙'}</Text>
            <Text style={[s.handsFreeTxt, handsFreeMode && { color: '#000' }]}>
              {handsFreeMode ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={closeChat}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => (
            <View key={i} style={[s.msgRow, m.from === 'user' && s.msgRowUser]}>
              {m.from === 'yara' && (
                <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>
              )}
              <View style={{ maxWidth: '75%' }}>
                <View style={[s.bubble, m.from === 'user' ? s.bubbleUser : s.bubbleYara]}>
                  <Text style={[s.bubbleTxt, m.from === 'user' ? s.bubbleTxtUser : s.bubbleTxtYara]}>
                    {m.text}
                  </Text>
                </View>
                <Text style={[s.msgTime, m.from === 'user' && { textAlign: 'right' }]}>
                  {m.time}
                </Text>
              </View>
            </View>
          ))}
          {typing && (
            <View style={s.msgRow}>
              <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>
              <View style={[s.bubble, s.bubbleYara, { paddingVertical: 12 }]}>
                <TypingDots />
              </View>
            </View>
          )}
        </ScrollView>

        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestScroll}>
            <View style={s.suggestRow}>
              {SUGGESTIONS.map((sg, i) => (
                <TouchableOpacity key={i} style={s.suggestChip} onPress={() => send(sg)}>
                  <Text style={s.suggestTxt}>{sg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {voiceError && (
          <View style={s.voiceErrorBar}>
            <Text style={s.voiceErrorTxt}>{voiceError}</Text>
          </View>
        )}
        <View style={[s.inputBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
          {/* Manual mic button — always available */}
          <TouchableOpacity
            style={[s.micBtn, listenState === 'listening' && s.micBtnActive]}
            onPress={() => {
              if (listenState === 'listening') stopAndTranscribe();
              else startListening();
            }}
            disabled={listenState === 'processing' || listenState === 'speaking' || typing}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>
              {listenState === 'listening' ? '⏹' : '🎙'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Yara anything…"
            placeholderTextColor="#8B82AD"
            returnKeyType="send"
            onSubmitEditing={() => send()}
            multiline
            maxLength={400}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || typing) && s.sendBtnOff]}
            onPress={() => send()}
            disabled={!input.trim() || typing}
          >
            <Text style={s.sendTxt}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {!open && (
        <Animated.View
          ref={r => registerTourRef('yara_fab', r)}
          collapsable={false}
          style={[s.fabWrap, { transform: [{ translateY: bobAnim }, { scale: fabScale }] }]}
        >
          {/* Outer glow halo — lime when listening */}
          <Animated.View style={[s.glowOuter, {
            opacity: listenState === 'listening' ? limePulse.interpolate({ inputRange: [1, 1.35], outputRange: [0.5, 0.9] }) : glowOpacityOuter,
            transform: [{ scale: listenState === 'listening' ? limePulse : glowScaleOuter }],
            backgroundColor: listenState === 'listening' ? 'rgba(198,255,51,0.3)' : undefined,
          }]} />
          {/* Mid glow halo */}
          <Animated.View style={[s.glowMid, { opacity: glowOpacityMid }]} />
          {/* Core glow */}
          <View style={s.glowCore} />
          {/* Mascot image — vibrates when speaking */}
          <TouchableOpacity style={s.mascotTouch} onPress={openChat} activeOpacity={0.88}>
            <Animated.View style={[s.mascotClip, { transform: [{ scale: listenState === 'speaking' ? speakVibrate : 1 }] }]}>
              <Image
                source={require('../assets/yara_spirit.png')}
                style={s.mascotImg}
                resizeMode="cover"
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {open && (
        <Animated.View style={[s.backdrop, { opacity: fadeBack }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeChat} />
        </Animated.View>
      )}

      {open && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kavWrap}
        >
          <Animated.View style={[s.sheet, { paddingTop: insets.top, transform: [{ translateY: slideY }] }]}>
            {IS_WIDE ? (
              <View style={{ flex: 1, flexDirection: 'row' }}>
                {renderSidebar()}
                <View style={s.chatDivider} />
                {renderChat()}
              </View>
            ) : (
              <>
                {renderChat()}
                {sidebarOpen && (
                  <>
                    <Animated.View style={[StyleSheet.absoluteFill, s.sidebarBackdrop, { opacity: sidebarFade }]}>
                      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSidebar} activeOpacity={1} />
                    </Animated.View>
                    <Animated.View style={[s.sidebarOverlay, { transform: [{ translateX: sidebarX }] }]}>
                      {renderSidebar()}
                    </Animated.View>
                  </>
                )}
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  fabWrap:    { position: 'absolute', bottom: 90, right: 20, zIndex: 9999, width: 114, height: 114, alignItems: 'center', justifyContent: 'center' },
  glowOuter:  { position: 'absolute', width: 114, height: 114, borderRadius: 57, backgroundColor: 'rgba(200,241,53,0.08)', shadowColor: '#C8F135', shadowOpacity: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } },
  glowMid:    { position: 'absolute', width: 94,  height: 94,  borderRadius: 47, backgroundColor: 'rgba(200,241,53,0.14)', shadowColor: '#C8F135', shadowOpacity: 0.85, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  glowCore:   { position: 'absolute', width: 82,  height: 82,  borderRadius: 41, backgroundColor: 'rgba(200,241,53,0.20)', shadowColor: '#C8F135', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  mascotTouch:{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  mascotClip: { width: 78, height: 78, borderRadius: 39, overflow: 'hidden' },
  mascotImg:  { width: 78, height: 78 },

  backdrop:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', zIndex: 95 },
  kavWrap:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  sheet:     { flex: 1, backgroundColor: '#18152A', borderWidth: 1, borderColor: '#2D2850', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 28 },

  sidebar:             { flex: 1, width: SIDEBAR_W, backgroundColor: '#12102A', borderRightWidth: 1, borderRightColor: '#2D2850' },
  sidebarHead:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  sidebarBrand:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidebarBrandTxt:     { color: '#F4F0FF', fontSize: 15, fontWeight: '800' },
  sidebarHeadRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hideHistoryBtn:      { backgroundColor: '#2D2850', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  hideHistoryTxt:      { color: '#8B82AD', fontSize: 12, fontWeight: '700' },
  newChatBtn:          { backgroundColor: '#7B61FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  newChatTxt:          { color: '#fff', fontSize: 12, fontWeight: '700' },
  sidebarSectionLabel: { color: '#3D3560', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  convItem:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginHorizontal: 8, marginBottom: 2 },
  convItemActive:      { backgroundColor: '#7B61FF1A', borderWidth: 1, borderColor: '#7B61FF30' },
  convTitle:           { color: '#8B82AD', fontSize: 13, fontWeight: '500', marginBottom: 2 },
  convTitleActive:     { color: '#E8E3FF', fontWeight: '600' },
  convDate:            { color: '#3D3560', fontSize: 10 },
  convDeleteBtn:       { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1A35' },
  convDeleteTxt:       { color: '#4A4268', fontSize: 9, fontWeight: '700' },
  sidebarOverlay:      { position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 20 },
  sidebarBackdrop:     { backgroundColor: 'rgba(0,0,0,0.52)', zIndex: 19 },
  chatDivider:         { width: 1, backgroundColor: '#2D2850' },

  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  historyBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginRight: 2, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14, backgroundColor: '#1D1736', borderWidth: 1, borderColor: '#2D2850' },
  historyBtnTxt:    { color: '#F4F0FF', fontSize: 11, fontWeight: '700' },
  hamburgerIcon:    { flexDirection: 'column', justifyContent: 'space-between', height: 16 },
  hLine:            { width: 18, height: 2, borderRadius: 1, backgroundColor: '#8B82AD' },
  headerAvatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnlineDot:  { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B8F566', borderWidth: 2, borderColor: '#18152A' },
  headerName:       { color: '#F4F0FF', fontSize: 16, fontWeight: '800' },
  headerSub:        { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  closeBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  closeTxt:         { color: '#8B82AD', fontSize: 15 },

  // Hands-free toggle
  handsFreeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2D2850', borderWidth: 1, borderColor: '#3D3560', marginRight: 6 },
  handsFreeBtnOn: { backgroundColor: '#C6FF33', borderColor: '#C6FF33' },
  handsFreeTxt:   { color: '#8B82AD', fontSize: 10, fontWeight: '800' },

  // Manual mic button in input bar
  micBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center', marginRight: 4, borderWidth: 1, borderColor: '#3D3560' },
  micBtnActive: { backgroundColor: 'rgba(198,255,51,0.2)', borderColor: '#C6FF33' },

  // Voice error banner
  voiceErrorBar: { backgroundColor: 'rgba(255,80,80,0.12)', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,80,80,0.2)' },
  voiceErrorTxt: { color: '#FF6464', fontSize: 11, textAlign: 'center' },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:      { flexDirection: 'row-reverse' },
  msgAvatar:       { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleYara:      { backgroundColor: '#201C35', borderBottomLeftRadius: 4 },
  bubbleUser:      { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  bubbleTxt:       { fontSize: 14, lineHeight: 21 },
  bubbleTxtYara:   { color: '#E8E3FF' },
  bubbleTxtUser:   { color: '#ffffff' },
  msgTime:         { color: '#4A4268', fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  dot:             { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B82AD' },

  suggestScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  suggestRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestChip:   { backgroundColor: '#201C35', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2D2850' },
  suggestTxt:    { color: '#8B82AD', fontSize: 12, fontWeight: '600' },

  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#2D2850' },
  input:      { flex: 1, backgroundColor: '#0E0C15', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#F4F0FF', fontSize: 14, lineHeight: 20, maxHeight: 100, borderWidth: 1, borderColor: '#2D2850' },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.32 },
  sendTxt:    { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },

  // ── My Insights sidebar panel ─────────────────────────────────────────────
  insightsDivider:     { height: 1, backgroundColor: '#2D2850', marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  insightsSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, paddingLeft: 0 },
  insightsRefreshBtn:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#1E1A35' },
  insightsRefreshTxt:  { color: '#8B82AD', fontSize: 10, fontWeight: '700' },

  // Individual insight card — dark bg, coloured left border, purple border
  insightCard:     { marginHorizontal: 8, marginBottom: 6, padding: 10, borderRadius: 10, backgroundColor: '#12102A', borderLeftWidth: 3, borderWidth: 1, borderColor: '#2D2850' },
  insightCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  insightCardIcon: { fontSize: 14 },
  insightCardType: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  insightCardMsg:  { color: '#C8BFEE', fontSize: 12, lineHeight: 17 },

  // Empty state card
  insightsEmptyCard:     { marginHorizontal: 8, marginTop: 4, padding: 14, borderRadius: 10, backgroundColor: '#12102A', borderWidth: 1, borderColor: '#2D2850', alignItems: 'center' },
  insightsEmptyTitle:    { color: '#8B82AD', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  insightsEmptySubtitle: { color: '#3D3560', fontSize: 11, textAlign: 'center', lineHeight: 16 },

  // Admin bulk-refresh button — only rendered for is_admin users
  adminRefreshBtn: { marginHorizontal: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#7B61FF1A', borderWidth: 1, borderColor: '#7B61FF30', alignItems: 'center' },
  adminRefreshTxt: { color: '#7B61FF', fontSize: 12, fontWeight: '700' },
  historyHint:      { color: '#8B82AD', fontSize: 12, marginHorizontal: 16, marginBottom: 10, lineHeight: 16 },
});
