import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  deleteThreadIfEmpty,
  getThreadMessages,
  markThreadRead,
  sendThreadMessage,
} from '../../services/dmService';
import { supabase } from '../../lib/supabase';
import { AVATAR_BUCKET } from '../../lib/avatar';

async function resolveDmAvatarUri(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|file:\/\/|data:image\/)/i.test(trimmed)) return trimmed;

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(trimmed);
  if (publicData?.publicUrl) {
    return `${publicData.publicUrl}${publicData.publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(trimmed, 60 * 60 * 24 * 30);
  if (error) return null;
  return data?.signedUrl || null;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function DMThread({ navigation, route }) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const {
    threadId,
    peerName = 'Direct Message',
    peerHandle = '@user',
    peerAvatarUri = null,
  } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [resolvedPeerAvatarUri, setResolvedPeerAvatarUri] = useState(null);
  const flatListRef = React.useRef(null);
  const initialScrollDoneRef = React.useRef(false);

  const title = useMemo(() => `${peerName}`, [peerName]);

  const scrollToLatest = useCallback((animated = false) => {
    if (!flatListRef.current) return;

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!ownerId || !threadId) return;
    const rows = await getThreadMessages(ownerId, threadId);
    setMessages(rows);
    await markThreadRead(ownerId, threadId);
  }, [ownerId, threadId]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages]),
  );

  useEffect(() => {
    let alive = true;

    const hydratePeerAvatar = async () => {
      const resolved = await resolveDmAvatarUri(peerAvatarUri);
      if (alive) setResolvedPeerAvatarUri(resolved);
    };

    hydratePeerAvatar();
    return () => {
      alive = false;
    };
  }, [peerAvatarUri]);

  useEffect(() => {
    return () => {
      deleteThreadIfEmpty(ownerId, threadId);
    };
  }, [ownerId, threadId]);

  // Keep view pinned to latest message as messages are loaded/updated.
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        scrollToLatest(false);
      });
      return () => interactionTask.cancel();
    }
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (!threadId || !ownerId) return;

    const channel = supabase
      .channel(`dm-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${threadId}`,
        },
        () => {
          loadMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, ownerId, loadMessages]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !ownerId || !threadId) return;
    await sendThreadMessage(ownerId, threadId, trimmed);
    setText('');
    await loadMessages();
  };

  const renderMessage = ({ item }) => {
    const mine = item.sender === 'me';
    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowThem]}>
        {!mine &&
          (resolvedPeerAvatarUri ? (
            <Image
              source={{ uri: resolvedPeerAvatarUri }}
              style={styles.msgPeerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.msgPeerAvatarFallback}>
              <Text style={styles.msgPeerAvatarTxt}>
                {peerName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          ))}
        <View style={[styles.msgBubble, mine ? styles.msgMine : styles.msgThem]}>
          <Text style={[styles.msgText, mine ? styles.msgTextMine : styles.msgTextThem]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, mine ? styles.msgTimeMine : styles.msgTimeThem]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerMid}>
          {resolvedPeerAvatarUri ? (
            <Image
              source={{ uri: resolvedPeerAvatarUri }}
              style={styles.headerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarTxt}>
                {peerName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.handle}>{peerHandle}</Text>
        </View>
        <View style={styles.backBtnGhost} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hi.</Text>}
        onContentSizeChange={() => {
          if (!messages.length) return;

          if (!initialScrollDoneRef.current) {
            scrollToLatest(false);
            initialScrollDoneRef.current = true;
            return;
          }

          scrollToLatest(true);
        }}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#8E85AE"
          style={styles.input}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={onSend}>
          <Ionicons name="send" size={16} color="#130E25" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0B1E', paddingTop: 52 },
  header: {
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: { width: 36, height: 36 },
  headerMid: { alignItems: 'center' },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2346',
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarTxt: { color: '#130E25', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  handle: { color: '#9188AF', fontSize: 12, marginTop: 2 },
  messagesList: { paddingHorizontal: 12, paddingBottom: 14 },
  empty: { color: '#9188AF', textAlign: 'center', marginTop: 28 },
  msgRow: { marginBottom: 10, flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start', alignItems: 'flex-end', gap: 6 },
  msgPeerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2346',
  },
  msgPeerAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgPeerAvatarTxt: { color: '#130E25', fontSize: 10, fontWeight: '900' },
  msgBubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  msgMine: { backgroundColor: '#C8F135', borderBottomRightRadius: 6 },
  msgThem: { backgroundColor: '#1C1633', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMine: { color: '#130E25' },
  msgTextThem: { color: '#F2F0FA' },
  msgTime: { marginTop: 4, fontSize: 10, fontWeight: '700' },
  msgTimeMine: { color: '#2D244A', textAlign: 'right' },
  msgTimeThem: { color: '#8E85AE' },
  composer: {
    borderTopWidth: 1,
    borderTopColor: '#241E3F',
    backgroundColor: '#120F22',
    padding: 10,
    paddingBottom: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    color: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
