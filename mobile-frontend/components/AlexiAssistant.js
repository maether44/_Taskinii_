/**
 * YaraAssistant.js
 * Floating AI coach — uses callYaraCoach from groqAPI (Groq/Llama).
 * Schedule: detects weekly plan requests, shows preview card, navigates to ScheduleScreen.
 */
import {
  Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform,
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
import { useProfile } from '../hooks/useProfile';
import { useToday } from '../context/TodayContext';
import { callYaraCoach } from '../lib/groqAPI';
import { log, error as logError } from '../lib/logger';
import { scheduleStore } from '../store/scheduleStore';

const SIDEBAR_W   = 272;
const STORAGE_KEY = '@yara_conversations';
const MAX_CONVS   = 50;
const IS_WIDE     = Dimensions.get('window').width > 600;

const SUGGESTIONS = [
  "What should I eat today?",
  "How do I push through low motivation?",
  "Am I training enough?",
  "Best pre-workout meal?",
  "How do I recover faster?",
];

const SCHEDULE_KEYWORDS = [
  'weekly schedule', 'weekly plan', 'week plan', 'my schedule',
  'workout plan', 'meal plan', 'weekly routine', 'plan my week',
  'generate schedule', 'create schedule', 'make me a plan',
  'full plan', 'training plan', 'give me a plan',
];

const isScheduleRequest = (text) =>
  SCHEDULE_KEYWORDS.some(k => text.toLowerCase().includes(k));

// Injected into the user message for schedule requests
// groqAPI will use response_format: json_object so no need for strict formatting instructions
const SCHEDULE_USER_SUFFIX = `

Generate my full 7-day weekly plan as JSON with this structure:
{
  "response": "friendly 1-2 sentence intro",
  "schedule": {
    "days": [
      {
        "day": "Monday",
        "is_rest": false,
        "workout_type": "Push",
        "note": "Focus on chest and shoulders",
        "exercises": [
          { "name": "Bench Press", "sets": 4, "reps": "8-10", "muscle": "Chest", "rest": "90s" }
        ],
        "meals": [
          { "type": "Breakfast", "foods": ["Oats", "2 eggs"], "calories": 420 },
          { "type": "Lunch", "foods": ["Chicken", "Rice"], "calories": 580 },
          { "type": "Dinner", "foods": ["Salmon", "Broccoli"], "calories": 520 },
          { "type": "Snack", "foods": ["Greek yogurt"], "calories": 200 }
        ],
        "sleep_target": 8,
        "steps_target": 9000,
        "water_target": 2500
      }
    ]
  }
}
Include all 7 days. Include 2 rest days (is_rest: true, empty exercises array).
Tailor to my profile. Vary sleep/steps/water by workout intensity.`;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmtTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDate = (iso) => {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const WORKOUT_COLOR_MAP = {
  push: '#7B61FF', pull: '#FF6B6B', legs: '#C6FF33',
  upper: '#61D4FF', lower: '#FFB347', full: '#FF61D4', cardio: '#61FFD4',
};
const getWorkoutColor = (type = '') => {
  const t = type.toLowerCase();
  for (const [k, v] of Object.entries(WORKOUT_COLOR_MAP)) {
    if (t.includes(k)) return v;
  }
  return '#7B61FF';
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Schedule Preview Card ────────────────────────────────────────────────────
function SchedulePreviewCard({ schedule, onView }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  const days = schedule?.days ?? [];
  return (
    <Animated.View style={[spc.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={spc.header}>
        <Text style={spc.emoji}>📅</Text>
        <View style={{ flex: 1 }}>
          <Text style={spc.title}>Your Weekly Plan</Text>
          <Text style={spc.sub}>Tap to view full schedule</Text>
        </View>
        <View style={spc.aiBadge}><Text style={spc.aiBadgeTxt}>✦ AI</Text></View>
      </View>
      <View style={spc.strip}>
        {days.slice(0, 7).map((d, i) => {
          const color = d.is_rest ? '#2D2850' : getWorkoutColor(d.workout_type);
          return (
            <View key={i} style={spc.dayChip}>
              <View style={[spc.dayDot, { backgroundColor: color }]} />
              <Text style={spc.dayLabel}>{DAY_LABELS[i]}</Text>
              <Text style={[spc.dayType, { color: d.is_rest ? '#4A4268' : color }]} numberOfLines={1}>
                {d.is_rest ? 'Rest' : (d.workout_type?.split(' ')[0] || '—')}
              </Text>
            </View>
          );
        })}
      </View>
      {days[0] && (
        <View style={spc.targets}>
          <View style={spc.targetChip}>
            <Text style={spc.targetIcon}>💤</Text>
            <Text style={spc.targetTxt}>{days[0].sleep_target ?? 8}h</Text>
          </View>
          <View style={spc.targetChip}>
            <Text style={spc.targetIcon}>👟</Text>
            <Text style={spc.targetTxt}>{((days[0].steps_target ?? 8000) / 1000).toFixed(0)}k steps</Text>
          </View>
          <View style={spc.targetChip}>
            <Text style={spc.targetIcon}>💧</Text>
            <Text style={spc.targetTxt}>{days[0].water_target ?? 2000}ml</Text>
          </View>
        </View>
      )}
      <TouchableOpacity style={spc.viewBtn} onPress={onView} activeOpacity={0.85}>
        <Text style={spc.viewBtnTxt}>View Full Schedule →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Typing Dots ──────────────────────────────────────────────────────────────
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

const makeConv = (greeting) => ({
  id: uid(),
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  messages: [{ from: 'yara', text: greeting, time: fmtTime() }],
});

const getGreeting = (profile, name) => profile
  ? `Hey ${name}! I'm Yara, your personal coach inside BodyQ. I already know your profile — goal, targets, all of it. What's on your mind today?`
  : "Hey! I'm Yara — your personal coach. Ask me anything about training, nutrition, or recovery.";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YaraAssistant({ onOpenSchedule }) {
  const { profile, name, userId, goals } = useProfile();
  const { sleepHours, sleepQuality, muscleFatigue } = useToday();
  const insets = useSafeAreaInsets();

  const [open,          setOpen]          = useState(false);
  const [input,         setInput]         = useState('');
  const [typing,        setTyping]        = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId,  setActiveConvId]  = useState(null);

  const apiHistoryRef = useRef({});

  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [listenState,   setListenState]   = useState('idle');
  const [voiceError,    setVoiceError]    = useState(null);
  const recordingRef     = useRef(null);
  const recordTimeoutRef = useRef(null);
  const voiceLoopRef     = useRef(false);
  const limePulse        = useRef(new Animated.Value(1)).current;
  const speakVibrate     = useRef(new Animated.Value(1)).current;

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages   = activeConv?.messages ?? [];

  const slideY      = useRef(new Animated.Value(500)).current;
  const fadeBack    = useRef(new Animated.Value(0)).current;
  const sidebarX    = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const sidebarFade = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef(null);
  const fabScale    = useRef(new Animated.Value(1)).current;
  const bobAnim     = useRef(new Animated.Value(0)).current;

  const persist = async (convs) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs)); }
    catch (e) { logError('YaraAssistant: persist error', e); }
  };

  const setAndPersist = (updater) => {
    setConversations(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          setConversations(saved);
          setActiveConvId(saved[0].id);
          return;
        }
      }
      const conv = makeConv(getGreeting(null, 'there'));
      setConversations([conv]);
      setActiveConvId(conv.id);
      persist([conv]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(bobAnim, { toValue: -10, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bobAnim, { toValue: 0,   duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    breathe.start(); bob.start();
    return () => { breathe.stop(); bob.stop(); };
  }, []);

  const glowOpacityOuter = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [0.18, 0.42] });
  const glowOpacityMid   = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [0.28, 0.60] });
  const glowScaleOuter   = fabScale.interpolate({ inputRange: [1, 1.08], outputRange: [1, 1.18] });

  useEffect(() => {
    if (listenState === 'listening') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(limePulse, { toValue: 1.35, duration: 500, useNativeDriver: true }),
        Animated.timing(limePulse, { toValue: 1.00, duration: 500, useNativeDriver: true }),
      ]));
      loop.start(); return () => loop.stop();
    } else { limePulse.setValue(1); }
  }, [listenState]);

  useEffect(() => {
    if (listenState === 'speaking') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(speakVibrate, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(speakVibrate, { toValue: 0.96, duration: 120, useNativeDriver: true }),
      ]));
      loop.start(); return () => loop.stop();
    } else { speakVibrate.setValue(1); }
  }, [listenState]);

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
      language: 'en-US', pitch: 1.15, rate: 1.0,
      onDone:    () => { setListenState('idle'); onDone?.(); },
      onStopped: () => setListenState('idle'),
      onError:   () => setListenState('idle'),
    });
  };

  const startListening = async () => {
    setVoiceError(null);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, playsInSilentModeIOS: true,
        shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
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
      recordTimeoutRef.current = setTimeout(() => stopAndTranscribe(), 8000);
    } catch (e) {
      logError('[Yara voice] startListening error:', e.message);
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
      setVoiceError('Voice transcription not configured.');
      setListenState('idle');
    } catch (e) {
      logError('[Yara voice] transcribe error:', e.message);
      setVoiceError('Could not understand. Try again.');
      setListenState('idle');
    }
  };

  const toggleHandsFree = async () => {
    const next = !handsFreeMode;
    setHandsFreeMode(next);
    voiceLoopRef.current = next;
    if (next) startListening();
    else { await stopRecordingClean(); Speech.stop(); setListenState('idle'); }
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

  const scrollToBottom = (animated = true) =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100);

  const newChat = () => {
    const conv = makeConv(getGreeting(profile, name));
    setAndPersist(prev => [conv, ...prev].slice(0, MAX_CONVS));
    setActiveConvId(conv.id);
    apiHistoryRef.current[conv.id] = [];
    if (!IS_WIDE) closeSidebar();
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

  // ── Send ──────────────────────────────────────────────────────
  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

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

    const history = apiHistoryRef.current[activeConvId] ?? [];
    const isSchedule = isScheduleRequest(msg);

    // For schedule: append the JSON structure hint to the user message
    // and pass scheduleMode=true so groqAPI uses json_object + 70b model
    const queryForApi = isSchedule ? msg + SCHEDULE_USER_SUFFIX : msg;
    const historyToSend = [...history, { role: 'user', content: queryForApi }];

    try {
      // ✅ Pass isSchedule as 4th arg — groqAPI handles model/tokens/json_object
      const reply = await callYaraCoach(historyToSend, profile, goals, isSchedule);

      // Save to history using original message
      apiHistoryRef.current[activeConvId] = [
        ...history,
        { role: 'user',      content: msg   },
        { role: 'assistant', content: reply },
      ];

      // Parse schedule from reply
      if (isSchedule) {
        try {
          // response_format: json_object guarantees valid JSON — just parse it
          const parsed = JSON.parse(reply);
          if (parsed?.schedule?.days) {
await scheduleStore.set({ ...parsed.schedule, generated_at: new Date().toISOString() });            const responseText = parsed.response || "Here's your weekly plan!";
            setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
              ...c,
              messages: [...c.messages, {
                from: 'yara',
                text: responseText,
                time: fmtTime(),
                schedule: parsed.schedule,
              }],
            }));
            setTyping(false);
            scrollToBottom(true);
            return;
          }
        } catch (_) {
          // If json_object still somehow fails, fall through to normal reply
        }
      }

      // Normal text reply
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, { from: 'yara', text: reply, time: fmtTime() }],
      }));

    } catch (err) {
      logError('Yara error:', err.message);
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, { from: 'yara', text: "Connection issue — try again!", time: fmtTime() }],
      }));
    } finally {
      setTyping(false);
    }
    scrollToBottom(true);
  };

  // ── Sidebar ───────────────────────────────────────────────────
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
          {conversations.length > 0
            ? <Text style={s.historyHint}>Tap a past chat to reopen it.</Text>
            : <Text style={s.historyHint}>No saved conversations yet.</Text>
          }
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
        </ScrollView>
      </View>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────
  function renderChat() {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.header}>
          {!IS_WIDE && (
            <TouchableOpacity style={s.historyBtn} onPress={openSidebar} activeOpacity={0.7}>
              <View style={s.hamburgerIcon}>
                <View style={s.hLine} /><View style={s.hLine} /><View style={s.hLine} />
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
          <TouchableOpacity
            style={[s.handsFreeBtn, handsFreeMode && s.handsFreeBtnOn]}
            onPress={toggleHandsFree}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14 }}>🎙</Text>
            <Text style={[s.handsFreeTxt, handsFreeMode && { color: '#000' }]}>
              {handsFreeMode ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={closeChat}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent} showsVerticalScrollIndicator={false}>
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
                {m.from === 'yara' && m.schedule && (
                  <SchedulePreviewCard
                    schedule={m.schedule}
                    onView={() => { closeChat(); onOpenSchedule?.(); }}
                  />
                )}
                <Text style={[s.msgTime, m.from === 'user' && { textAlign: 'right' }]}>{m.time}</Text>
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
          <TouchableOpacity
            style={[s.micBtn, listenState === 'listening' && s.micBtnActive]}
            onPress={() => { if (listenState === 'listening') stopAndTranscribe(); else startListening(); }}
            disabled={listenState === 'processing' || listenState === 'speaking' || typing}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{listenState === 'listening' ? '⏹' : '🎙'}</Text>
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
          <Animated.View style={[s.glowOuter, {
            opacity: listenState === 'listening'
              ? limePulse.interpolate({ inputRange: [1, 1.35], outputRange: [0.5, 0.9] })
              : glowOpacityOuter,
            transform: [{ scale: listenState === 'listening' ? limePulse : glowScaleOuter }],
            backgroundColor: listenState === 'listening' ? 'rgba(198,255,51,0.3)' : undefined,
          }]} />
          <Animated.View style={[s.glowMid, { opacity: glowOpacityMid }]} />
          <View style={s.glowCore} />
          <TouchableOpacity style={s.mascotTouch} onPress={openChat} activeOpacity={0.88}>
            <Animated.View style={[s.mascotClip, { transform: [{ scale: listenState === 'speaking' ? speakVibrate : 1 }] }]}>
              <Image source={require('../assets/yara_spirit.png')} style={s.mascotImg} resizeMode="cover" />
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kavWrap}>
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
  backdrop:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', zIndex: 95 },
  kavWrap:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  sheet:      { flex: 1, backgroundColor: '#18152A', borderWidth: 1, borderColor: '#2D2850', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 28 },
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
  sidebarOverlay:      { position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 20 },
  sidebarBackdrop:     { backgroundColor: 'rgba(0,0,0,0.52)', zIndex: 19 },
  chatDivider:         { width: 1, backgroundColor: '#2D2850' },
  historyHint:         { color: '#8B82AD', fontSize: 12, marginHorizontal: 16, marginBottom: 10, lineHeight: 16 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  historyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 2, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14, backgroundColor: '#1D1736', borderWidth: 1, borderColor: '#2D2850' },
  historyBtnTxt:    { color: '#F4F0FF', fontSize: 11, fontWeight: '700' },
  hamburgerIcon:    { flexDirection: 'column', justifyContent: 'space-between', height: 16 },
  hLine:            { width: 18, height: 2, borderRadius: 1, backgroundColor: '#8B82AD' },
  headerAvatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnlineDot:  { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B8F566', borderWidth: 2, borderColor: '#18152A' },
  headerName:       { color: '#F4F0FF', fontSize: 16, fontWeight: '800' },
  headerSub:        { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  closeBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  closeTxt:         { color: '#8B82AD', fontSize: 15 },
  handsFreeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2D2850', borderWidth: 1, borderColor: '#3D3560', marginRight: 6 },
  handsFreeBtnOn:   { backgroundColor: '#C6FF33', borderColor: '#C6FF33' },
  handsFreeTxt:     { color: '#8B82AD', fontSize: 10, fontWeight: '800' },
  micBtn:           { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center', marginRight: 4, borderWidth: 1, borderColor: '#3D3560' },
  micBtnActive:     { backgroundColor: 'rgba(198,255,51,0.2)', borderColor: '#C6FF33' },
  voiceErrorBar:    { backgroundColor: 'rgba(255,80,80,0.12)', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,80,80,0.2)' },
  voiceErrorTxt:    { color: '#FF6464', fontSize: 11, textAlign: 'center' },
  messages:         { flex: 1 },
  messagesContent:  { padding: 16, gap: 12 },
  msgRow:           { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:       { flexDirection: 'row-reverse' },
  msgAvatar:        { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bubble:           { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleYara:       { backgroundColor: '#201C35', borderBottomLeftRadius: 4 },
  bubbleUser:       { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  bubbleTxt:        { fontSize: 14, lineHeight: 21 },
  bubbleTxtYara:    { color: '#E8E3FF' },
  bubbleTxtUser:    { color: '#ffffff' },
  msgTime:          { color: '#4A4268', fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  dot:              { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B82AD' },
  suggestScroll:    { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  suggestRow:       { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestChip:      { backgroundColor: '#201C35', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2D2850' },
  suggestTxt:       { color: '#8B82AD', fontSize: 12, fontWeight: '600' },
  inputBar:         { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#2D2850' },
  input:            { flex: 1, backgroundColor: '#0E0C15', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#F4F0FF', fontSize: 14, lineHeight: 20, maxHeight: 100, borderWidth: 1, borderColor: '#2D2850' },
  sendBtn:          { width: 42, height: 42, borderRadius: 21, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:       { opacity: 0.32 },
  sendTxt:          { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
});

const spc = StyleSheet.create({
  card:       { backgroundColor: '#1A1630', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7B61FF33', gap: 12, marginTop: 4, marginLeft: 38 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji:      { fontSize: 22 },
  title:      { color: '#F4F0FF', fontSize: 14, fontWeight: '800' },
  sub:        { color: '#8B82AD', fontSize: 11, marginTop: 1 },
  aiBadge:    { backgroundColor: '#7B61FF22', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: '#7B61FF55' },
  aiBadgeTxt: { color: '#7B61FF', fontSize: 10, fontWeight: '800' },
  strip:      { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip:    { alignItems: 'center', gap: 3, flex: 1 },
  dayDot:     { width: 8, height: 8, borderRadius: 4 },
  dayLabel:   { color: '#8B82AD', fontSize: 9, fontWeight: '700' },
  dayType:    { fontSize: 8, fontWeight: '600', textAlign: 'center' },
  targets:    { flexDirection: 'row', gap: 8 },
  targetChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#12102A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#2D2850' },
  targetIcon: { fontSize: 13 },
  targetTxt:  { color: '#8B82AD', fontSize: 11, fontWeight: '600' },
  viewBtn:    { backgroundColor: '#7B61FF', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  viewBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
