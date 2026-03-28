/**
 * src/components/ai-assistant/YaraAssistant.js
 * Floating AI coach — reads real user profile from Supabase via useProfile.
 * AI backend: Groq (llama-3.1-8b-instant)
 */
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { registerTourRef } from '../tour/tourRefs';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../config/supabase';
const { width: W } = Dimensions.get('window');

// ─── System prompt built from real Supabase profile ───────────────────────────
function buildSystem(profile, targets) {
  const base = `You are Yara, a warm and direct personal fitness coach inside the BodyQ app.

Your voice:
- Conversational, human, coach-like. No AI stiffness.
- Short paragraphs. Plain language. Like a coach texting back.
- Never say "Great question!", "Certainly!", or "As an AI..."
- Confident. Honest. Caring but no-fluff.

Your expertise: fitness programming, progressive overload, nutrition, macros,
sports performance, recovery, sleep, motivation, mindset.

Rules:
- Keep replies to 2–4 short paragraphs unless a plan is requested.
- NEVER ask the user for info already in their profile below.
- Always reference their profile when giving advice.
- Never give dangerous medical advice. Refer to a physio for serious pain.`;

  if (!profile) return base;

  const goalMap = {
    lose_fat: 'lose body fat', gain_muscle: 'build muscle',
    gain_weight: 'gain weight', maintain: 'maintain fitness',
    build_habits: 'build healthy habits',
  };
  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : 'unknown';

  return base + `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE — memorise this, never ask for it again:
• Name: ${profile.full_name || 'User'}
• Goal: ${goalMap[profile.goal] || profile.goal || 'unknown'}
• Gender: ${profile.gender || 'unknown'} | Age: ${age} | Height: ${profile.height_cm || '?'}cm | Weight: ${profile.weight_kg || '?'}kg
• Activity level: ${profile.activity_level || 'moderate'}
• Daily calorie target: ${targets?.daily_calories || '?'} kcal
• Protein / Carbs / Fat targets: ${targets?.protein_target || '?'}g / ${targets?.carbs_target || '?'}g / ${targets?.fat_target || '?'}g
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this to give precise, personalised advice every time.`;
}

async function callGroq(history, profile, targets) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      messages: [
        { role: 'system', content: buildSystem(profile, targets) },
        ...history,
      ],
    },
  });
  if (error) throw error;
  return data?.response ?? "I'm having trouble connecting. Try again in a moment.";
}

const SUGGESTIONS = [
  "What should I eat today?",
  "How do I push through low motivation?",
  "Am I training enough?",
  "Best pre-workout meal?",
  "How do I recover faster?",
];

const fmtTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
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
      {dots.map((d, i) => (
        <Animated.View key={i} style={[s.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YaraAssistant() {
  // Pull real profile from Supabase
  const { profile, targets, name } = useProfile();

  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);
  const [messages, setMessages] = useState([]);

  // Set greeting once profile loads
  const greetingSet = useRef(false);
  useEffect(() => {
    if (greetingSet.current) return;
    greetingSet.current = true;
    const greeting = profile
      ? `Hey ${name}! I'm Yara, your personal coach inside BodyQ. I already know your profile — goal, targets, all of it. What's on your mind today?`
      : "Hey! I'm Yara — your personal coach. Ask me anything about training, nutrition, or recovery.";
    setMessages([{ from: 'yara', text: greeting, time: fmtTime() }]);
  }, [profile]);

  const apiHistory = useRef([]);
  const slideY     = useRef(new Animated.Value(500)).current;
  const fadeBack   = useRef(new Animated.Value(0)).current;
  const scrollRef  = useRef(null);
  const fabScale   = useRef(new Animated.Value(1)).current;

  // FAB pulse
  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.07, duration: 1500, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1,    duration: 1500, useNativeDriver: true }),
    ]));
    p.start();
    return () => p.stop();
  }, []);

  const openChat = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(slideY,   { toValue: 0,   tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 1,   duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeChat = () => {
    Animated.parallel([
      Animated.timing(slideY,   { toValue: 500, duration: 230, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;
    setInput('');
    setTyping(true);
    const userMsg = { from: 'user', text: msg, time: fmtTime() };
    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    apiHistory.current = [...apiHistory.current, { role: 'user', content: msg }];
    try {
      const reply = await callGroq(apiHistory.current, profile, targets);
      apiHistory.current = [...apiHistory.current, { role: 'assistant', content: reply }];
      setMessages(prev => [...prev, { from: 'yara', text: reply, time: fmtTime() }]);
    } catch (err) {
      console.error('Yara error:', err);
      apiHistory.current = apiHistory.current.slice(0, -1);
      setMessages(prev => [...prev, { from: 'yara', text: "Connection issue — try again!", time: fmtTime() }]);
    } finally {
      setTyping(false);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <>
      {/* ── FAB ── */}
      {!open && (
        <Animated.View
          ref={r => registerTourRef('yara_fab', r)}
          collapsable={false}
          style={[s.fabWrap, { transform: [{ scale: fabScale }] }]}
        >
          <TouchableOpacity style={s.fab} onPress={openChat} activeOpacity={0.88}>
            <View style={s.fabAvatar}><Text style={{ fontSize: 20 }}>👩‍⚕️</Text></View>
            <View>
              <Text style={s.fabName}>Yara</Text>
              <View style={s.fabOnlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.fabOnlineTxt}>Online</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Backdrop ── */}
      {open && (
        <Animated.View style={[s.backdrop, { opacity: fadeBack }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeChat} />
        </Animated.View>
      )}

      {/* ── Chat Sheet ── */}
      {open && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kavWrap}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>

            {/* Header */}
            <View style={s.header}>
              <View style={s.headerAvatarWrap}>
                <Text style={{ fontSize: 24 }}>👩‍⚕️</Text>
                <View style={s.headerOnlineDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.headerName}>Yara</Text>
                <Text style={s.headerSub}>
                  {profile ? `Knows your profile ✓` : 'Personal Coach'}
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={closeChat}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={s.messages}
              contentContainerStyle={s.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m, i) => (
                <View key={i} style={[s.msgRow, m.from === 'user' && s.msgRowUser]}>
                  {m.from === 'yara' && (
                    <View style={s.msgAvatar}>
                      <Text style={{ fontSize: 14 }}>👩‍⚕️</Text>
                    </View>
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

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.suggestScroll}
              >
                <View style={s.suggestRow}>
                  {SUGGESTIONS.map((sg, i) => (
                    <TouchableOpacity key={i} style={s.suggestChip} onPress={() => send(sg)}>
                      <Text style={s.suggestTxt}>{sg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Input bar */}
            <View style={s.inputBar}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Yara anything..."
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

          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  // FAB
  fabWrap:      { position: 'absolute', bottom: 90, right: 16, zIndex: 90 },
  fab:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#7B61FF', borderRadius: 30, paddingRight: 18, paddingLeft: 6, paddingVertical: 8, shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 12 },
  fabAvatar:    { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  fabName:      { color: '#fff', fontSize: 14, fontWeight: '800' },
  fabOnlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#B8F566' },
  fabOnlineTxt: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '600' },

  // Backdrop
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', zIndex: 95 },

  // Sheet
  kavWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  sheet:   { backgroundColor: '#18152A', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#2D2850', maxHeight: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 28 },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  headerAvatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnlineDot:  { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B8F566', borderWidth: 2, borderColor: '#18152A' },
  headerName:       { color: '#F4F0FF', fontSize: 16, fontWeight: '800' },
  headerSub:        { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  closeBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  closeTxt:         { color: '#8B82AD', fontSize: 15 },

  // Messages
  messages:        { maxHeight: 330 },
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

  // Suggestions
  suggestScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  suggestRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestChip:   { backgroundColor: '#201C35', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2D2850' },
  suggestTxt:    { color: '#8B82AD', fontSize: 12, fontWeight: '600' },

  // Input
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#2D2850' },
  input:    { flex: 1, backgroundColor: '#0E0C15', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#F4F0FF', fontSize: 14, lineHeight: 20, maxHeight: 100, borderWidth: 1, borderColor: '#2D2850' },
  sendBtn:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.32 },
  sendTxt:  { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
});