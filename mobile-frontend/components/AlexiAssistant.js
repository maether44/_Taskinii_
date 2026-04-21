/**
 * AlexiAssistant.js
 * Floating AI coach with Claude-style conversation history sidebar.
 * Sidebar: persistent on wide screens (>600px), slide-in overlay on mobile.
 * Storage: AsyncStorage — conversations persist across sessions.
 * Voice: integrates with AlexiVoiceContext for pause/resume of global passive loop.
 */
import {
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { useAlexiVoice, AlexiEvents } from '../context/AlexiVoiceContext';

const SIDEBAR_W   = 272;
const STORAGE_KEY = '@alexi_conversations';
const MAX_CONVS   = 50;
const IS_WIDE     = Dimensions.get('window').width > 600;

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
  const d   = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getGreeting = (profile, name) => profile
  ? `Hey ${name}! I'm Alexi, your personal AI coach inside BodyQ. I already know your profile — goal, targets, all of it. What's on your mind today?`
  : "Hey! I'm Alexi — your personal AI coach. Ask me anything about training, nutrition, or recovery.";

const makeConv = (greeting) => ({
  id: uid(),
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  messages: [{ from: 'alexi', text: greeting, time: fmtTime() }],
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
export default function AlexiAssistant() {
  const { profile, name, userId } = useProfile();
  const insets  = useSafeAreaInsets();
  const { resumePassive, hideAlexi } = useAlexiVoice();

  const [open,          setOpen]          = useState(false);
  const [input,         setInput]         = useState('');
  const [typing,        setTyping]        = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId,  setActiveConvId]  = useState(null);

  // ── Sidebar insights ────────────────────────────────────────────────────────
  const [userInsights,       setUserInsights]       = useState([]);
  const [insightsLoading,    setInsightsLoading]    = useState(false);
  const [insightsRefreshing, setInsightsRefreshing] = useState(false);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages   = activeConv?.messages ?? [];

  const slideY      = useRef(new Animated.Value(500)).current;
  const fadeBack    = useRef(new Animated.Value(0)).current;
  const sidebarX    = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const sidebarFade = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef(null);
  // sendRef: always points at the latest send() so the AlexiEvents listener
  // can call send() without a stale closure.
  const sendRef     = useRef(null);

  // ── Persistence helpers ──────────────────────────────────────────────────────
  const persist = async (convs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (e) {
      console.error('AlexiAssistant: persist error', e);
    }
  };

  const setAndPersist = (updater) => {
    setConversations(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  };

  // ── Insights ─────────────────────────────────────────────────────────────────
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
      console.error('AlexiAssistant: fetchUserInsights error', e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const refreshInsights = async () => {
    if (!userId || insightsRefreshing) return;
    setInsightsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-user-insights', {
        body: { userId },
      });
      if (error) throw error;
      if (data?.insights?.length) setUserInsights(data.insights);
    } catch (e) {
      console.error('AlexiAssistant: refreshInsights error', e);
    } finally {
      setInsightsRefreshing(false);
    }
  };

  const refreshAllInsights = async () => {
    if (insightsRefreshing) return;
    const adminKey = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? '';
    setInsightsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-user-insights', {
        body: { all: true, adminKey },
      });
      if (error) throw error;
      console.log('Admin bulk refresh result:', data);
      await fetchUserInsights(userId);
    } catch (e) {
      console.error('AlexiAssistant: refreshAllInsights error', e);
    } finally {
      setInsightsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) fetchUserInsights(userId);
  }, [userId]);

  // ── Load saved conversations ──────────────────────────────────────────────────
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
        const conv = makeConv(getGreeting(null, 'there'));
        setConversations([conv]);
        setActiveConvId(conv.id);
        persist([conv]);
      })
      .catch(() => {});
  }, []);

  // ── Keep sendRef current so the AlexiEvents listener never captures a stale send ──
  useEffect(() => { sendRef.current = send; });

  // ── Listen for voice "open_chat" — slide up chat + auto-send the query ───────
  useEffect(() => {
    const off = AlexiEvents.on('open_chat', ({ query }) => {
      setOpen(true);
      Animated.parallel([
        Animated.spring(slideY,   { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(fadeBack, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (query) {
        // Wait for sheet to finish opening before sending
        setTimeout(() => sendRef.current?.(query), 650);
      }
    });
    return off;
  }, []);

  // ── Chat open / close ────────────────────────────────────────────────────────
  const closeChat = () => {
    if (sidebarOpen) closeSidebar();
    resumePassive();
    hideAlexi(); // dismiss mascot FAB when sheet closes
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

  const newChat = () => {
    const conv = makeConv(getGreeting(profile, name));
    setAndPersist(prev => [conv, ...prev].slice(0, MAX_CONVS));
    setActiveConvId(conv.id);
    if (!IS_WIDE) closeSidebar();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  };

  const loadConversation = (id) => {
    setActiveConvId(id);
    if (!IS_WIDE) closeSidebar();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  };

  const deleteConversation = (id) => {
    const next = conversations.filter(c => c.id !== id);
    if (next.length === 0) {
      const fresh = makeConv(getGreeting(profile, name));
      setConversations([fresh]);
      setActiveConvId(fresh.id);
      persist([fresh]);
    } else {
      setConversations(next);
      if (id === activeConvId) setActiveConvId(next[0].id);
      persist(next);
    }
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

    if (!userId) {
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, {
          from: 'alexi',
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
        title:    c.title === 'New conversation' ? msg.slice(0, 42) : c.title,
        messages: [...c.messages, { from: 'user', text: msg, time: fmtTime() }],
      };
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { userId, query: msg },
      });

      if (error) {
        let reason = error.message;
        try {
          const body = await error.context?.json?.();
          if (body?.error) reason = body.error;
        } catch {}
        throw new Error(reason);
      }

      if (!data?.response) throw new Error('Empty response from assistant');

      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, { from: 'alexi', text: data.response, time: fmtTime() }],
      }));
    } catch (err) {
      console.error('Alexi error:', err.message);
      setAndPersist(prev => prev.map(c => c.id !== activeConvId ? c : {
        ...c,
        messages: [...c.messages, {
          from: 'alexi',
          text: "Connection issue — try again!",
          time: fmtTime(),
        }],
      }));
    } finally {
      setTyping(false);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  function renderSidebar() {
    return (
      <View style={[s.sidebar, { paddingTop: insets.top }]}>
        <View style={s.sidebarHead}>
          <View style={s.sidebarBrand}>
            <Text style={{ fontSize: 18 }}>🤖</Text>
            <Text style={s.sidebarBrandTxt}>Alexi</Text>
          </View>
          <TouchableOpacity style={s.newChatBtn} onPress={newChat} activeOpacity={0.8}>
            <Text style={s.newChatTxt}>＋ New</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={s.sidebarSectionLabel}>CONVERSATIONS</Text>
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
              <TouchableOpacity
                style={s.convDeleteBtn}
                onPress={() => deleteConversation(conv.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.convDeleteTxt}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <View style={s.insightsDivider} />

          <View style={s.insightsSectionHead}>
            <Text style={s.sidebarSectionLabel}>MY INSIGHTS</Text>
            <TouchableOpacity
              style={s.insightsRefreshBtn}
              onPress={refreshInsights}
              disabled={insightsRefreshing || insightsLoading}
              activeOpacity={0.7}
            >
              {insightsRefreshing
                ? <ActivityIndicator size={10} color="#8B82AD" />
                : <Text style={s.insightsRefreshTxt}>↻ Refresh</Text>
              }
            </TouchableOpacity>
          </View>

          {insightsLoading && (
            <View style={{ paddingHorizontal: 8, gap: 6 }}>
              {[1, 2].map(i => (
                <View key={i} style={[s.insightCard, { borderLeftColor: '#3D2F7A' }]}>
                  <View style={{ width: '60%', height: 10, borderRadius: 4, backgroundColor: '#2D2850', marginBottom: 6 }} />
                  <View style={{ width: '90%', height: 8,  borderRadius: 4, backgroundColor: '#2D2850' }} />
                </View>
              ))}
            </View>
          )}

          {!insightsLoading && userInsights.length === 0 && (
            <TouchableOpacity style={s.insightsEmptyCard} onPress={refreshInsights} activeOpacity={0.8}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>✨</Text>
              <Text style={s.insightsEmptyTitle}>No insights yet</Text>
              <Text style={s.insightsEmptySubtitle}>Tap to generate your personalised profile insights</Text>
            </TouchableOpacity>
          )}

          {!insightsLoading && userInsights.map((ins, i) => (
            <View key={i} style={[s.insightCard, { borderLeftColor: ins.color }]}>
              <View style={s.insightCardHead}>
                <Text style={s.insightCardIcon}>{ins.icon}</Text>
                <Text style={[s.insightCardType, { color: ins.color }]}>{ins.insight_type}</Text>
              </View>
              <Text style={s.insightCardMsg} numberOfLines={4}>{ins.message}</Text>
            </View>
          ))}

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
            <TouchableOpacity style={s.hamburger} onPress={openSidebar} activeOpacity={0.7}>
              <View style={s.hLine} />
              <View style={s.hLine} />
              <View style={s.hLine} />
            </TouchableOpacity>
          )}
          <View style={s.headerAvatarWrap}>
            <Text style={{ fontSize: 24 }}>🤖</Text>
            <View style={s.headerOnlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName}>Alexi · Your AI Coach</Text>
            <Text style={s.headerSub}>
              {profile ? 'Knows your profile ✓' : 'Personal AI Coach'}
            </Text>
          </View>
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
              {m.from === 'alexi' && (
                <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              )}
              <View style={{ maxWidth: '75%' }}>
                <View style={[s.bubble, m.from === 'user' ? s.bubbleUser : s.bubbleAlexi]}>
                  <Text style={[s.bubbleTxt, m.from === 'user' ? s.bubbleTxtUser : s.bubbleTxtAlexi]}>
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
              <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              <View style={[s.bubble, s.bubbleAlexi, { paddingVertical: 12 }]}>
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

        <View style={[s.inputBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Alexi anything..."
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

  // ── Sheet only (FAB removed — AlexiCompanion is the single tap-to-chat trigger) ──
  return (
    <>
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
  backdrop:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', zIndex: 95 },
  kavWrap:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  sheet:     { flex: 1, backgroundColor: '#18152A', borderWidth: 1, borderColor: '#2D2850', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 28 },

  sidebar:             { width: SIDEBAR_W, backgroundColor: '#12102A', borderRightWidth: 1, borderRightColor: '#2D2850' },
  sidebarHead:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2D2850' },
  sidebarBrand:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidebarBrandTxt:     { color: '#F4F0FF', fontSize: 15, fontWeight: '800' },
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
  hamburger:        { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', gap: 5, marginRight: 2 },
  hLine:            { width: 18, height: 2, borderRadius: 1, backgroundColor: '#8B82AD' },
  headerAvatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnlineDot:  { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B8F566', borderWidth: 2, borderColor: '#18152A' },
  headerName:       { color: '#F4F0FF', fontSize: 16, fontWeight: '800' },
  headerSub:        { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  closeBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  closeTxt:         { color: '#8B82AD', fontSize: 15 },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:      { flexDirection: 'row-reverse' },
  msgAvatar:       { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAlexi:     { backgroundColor: '#201C35', borderBottomLeftRadius: 4 },
  bubbleUser:      { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  bubbleTxt:       { fontSize: 14, lineHeight: 21 },
  bubbleTxtAlexi:  { color: '#E8E3FF' },
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

  insightsDivider:     { height: 1, backgroundColor: '#2D2850', marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  insightsSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, paddingLeft: 0 },
  insightsRefreshBtn:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#1E1A35' },
  insightsRefreshTxt:  { color: '#8B82AD', fontSize: 10, fontWeight: '700' },
  insightCard:         { marginHorizontal: 8, marginBottom: 6, padding: 10, borderRadius: 10, backgroundColor: '#12102A', borderLeftWidth: 3, borderWidth: 1, borderColor: '#2D2850' },
  insightCardHead:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  insightCardIcon:     { fontSize: 14 },
  insightCardType:     { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  insightCardMsg:      { color: '#C8BFEE', fontSize: 12, lineHeight: 17 },
  insightsEmptyCard:     { marginHorizontal: 8, marginTop: 4, padding: 14, borderRadius: 10, backgroundColor: '#12102A', borderWidth: 1, borderColor: '#2D2850', alignItems: 'center' },
  insightsEmptyTitle:    { color: '#8B82AD', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  insightsEmptySubtitle: { color: '#3D3560', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  adminRefreshBtn:       { marginHorizontal: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#7B61FF1A', borderWidth: 1, borderColor: '#7B61FF30', alignItems: 'center' },
  adminRefreshTxt:       { color: '#7B61FF', fontSize: 12, fontWeight: '700' },
});
