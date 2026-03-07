import { useEffect, useRef } from 'react';
import { registerTourRef }   from './onBoarding/tourRefs';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useYaraChat } from '../hooks/useYaraChat';

const SUGGESTIONS = [
  "What should I eat today?",
  "How do I push through low motivation?",
  "Am I training enough?",
  "What's the best pre-workout meal?",
  "How do I recover faster?",
];

// ── TYPING DOTS ───────────────────────────────────────────────────────────────
function TypingDots() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(dot, { toValue: -4, duration: 300, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
      Animated.delay(400),
    ]));
    Animated.parallel([anim(d1, 0), anim(d2, 150), anim(d3, 300)]).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 2 }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function YaraAssistant({ userProfile }) {
  const { messages, input, setInput, typing, open, setOpen, send } = useYaraChat(userProfile);

  const slideY   = useRef(new Animated.Value(400)).current;
  const fadeBack = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);

  // FAB pulse animation
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1,    duration: 1400, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  const openChat = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(slideY,   { toValue: 0,   tension: 70, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 1,   duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeChat = () => {
    Animated.parallel([
      Animated.timing(slideY,   { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeBack, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const handleSend = async (text) => {
    await send(text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <>
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
              <View style={s.fabOnline}>
                <View style={s.onlineDot} />
                <Text style={s.fabOnlineTxt}>Online</Text>
              </View>
            </View>
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
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>

            {/* Header */}
            <View style={s.header}>
              <View style={s.headerAvatar}>
                <Text style={{ fontSize: 24 }}>👩‍⚕️</Text>
                <View style={s.headerOnline} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.headerName}>Yara</Text>
                <Text style={s.headerSub}>
                  {userProfile ? `Your Coach · Knows your profile ✓` : 'Personal Coach · Always here'}
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
                <View key={i} style={[s.msgGroup, m.from === 'user' && s.msgGroupUser]}>
                  {m.from === 'yara' && (
                    <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>
                  )}
                  <View style={{ maxWidth: '75%' }}>
                    <View style={[s.bubble, m.from === 'user' ? s.bubbleUser : s.bubbleYara]}>
                      <Text style={[s.bubbleTxt, m.from === 'user' ? s.bubbleTxtUser : s.bubbleTxtYara]}>
                        {m.text}
                      </Text>
                    </View>
                    {!!m.time && (
                      <Text style={[s.msgTime, m.from === 'user' && { textAlign: 'right' }]}>{m.time}</Text>
                    )}
                  </View>
                </View>
              ))}
              {typing && (
                <View style={s.msgGroup}>
                  <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>
                  <View style={[s.bubble, s.bubbleYara, s.typingBubble]}><TypingDots /></View>
                </View>
              )}
            </ScrollView>

            {/* Suggestions — only on first message */}
            {messages.length <= 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestScroll}>
                <View style={s.suggestRow}>
                  {SUGGESTIONS.map((sg, i) => (
                    <TouchableOpacity key={i} style={s.suggestChip} onPress={() => handleSend(sg)}>
                      <Text style={s.suggestTxt}>{sg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Input */}
            <View style={s.inputBar}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Yara anything..."
                placeholderTextColor="#8B82AD"
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!input.trim() || typing) && s.sendBtnOff]}
                onPress={() => handleSend()}
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
  fabWrap:      { position: 'absolute', bottom: 90, right: 16, zIndex: 90 },
  fab:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#7B61FF', borderRadius: 30, paddingRight: 18, paddingLeft: 6, paddingVertical: 8, shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  fabAvatar:    { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  fabName:      { color: '#fff', fontSize: 14, fontWeight: '800' },
  fabOnline:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#B8F566' },
  fabOnlineTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  backdrop:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 95 },
  kavWrap:      { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  sheet:        { backgroundColor: '#18152A', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#2D2850', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  headerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnline: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B8F566', borderWidth: 2, borderColor: '#18152A' },
  headerName:   { color: '#F4F0FF', fontSize: 16, fontWeight: '800' },
  headerSub:    { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  closeTxt:     { color: '#8B82AD', fontSize: 15 },
  messages:         { maxHeight: 320 },
  messagesContent:  { padding: 16, gap: 12 },
  msgGroup:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgGroupUser: { flexDirection: 'row-reverse' },
  msgAvatar:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleYara:   { backgroundColor: '#201C35', borderBottomLeftRadius: 4 },
  bubbleUser:   { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  bubbleTxt:    { fontSize: 14, lineHeight: 21 },
  bubbleTxtYara:{ color: '#E8E3FF' },
  bubbleTxtUser:{ color: '#ffffff' },
  msgTime:      { color: '#4A4268', fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  typingBubble: { paddingVertical: 12 },
  typingDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B82AD' },
  suggestScroll:{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  suggestRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestChip:  { backgroundColor: '#201C35', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2D2850' },
  suggestTxt:   { color: '#8B82AD', fontSize: 12, fontWeight: '600' },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#2D2850' },
  input:        { flex: 1, backgroundColor: '#0E0C15', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#F4F0FF', fontSize: 14, lineHeight: 20, maxHeight: 100, borderWidth: 1, borderColor: '#2D2850' },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:   { opacity: 0.35 },
  sendTxt:      { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
});