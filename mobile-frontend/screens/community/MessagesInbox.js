import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ensureThread, listThreads } from '../../services/dmService';
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

function AvatarSeed({ label, uri }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} resizeMode="cover" />;
  }

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarTxt}>{label?.charAt(0)?.toUpperCase() || '?'}</Text>
    </View>
  );
}

export default function MessagesInbox({ navigation, route }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);

  const me = useMemo(() => {
    const meta = user?.user_metadata || {};
    return meta.full_name || meta.name || user?.email?.split('@')?.[0] || 'You';
  }, [user]);

  const loadThreads = useCallback(async () => {
    if (!user?.id) {
      setThreads([]);
      return;
    }
    const rows = await listThreads(user.id);

    const avatarCache = new Map();
    const hydrated = await Promise.all(
      (rows || []).map(async (thread) => {
        const key = thread?.peerAvatarUri || '';
        if (!key) return thread;

        if (avatarCache.has(key)) {
          return { ...thread, peerAvatarUri: avatarCache.get(key) };
        }

        const resolved = await resolveDmAvatarUri(key);
        avatarCache.set(key, resolved);
        return { ...thread, peerAvatarUri: resolved };
      }),
    );

    setThreads(hydrated);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [loadThreads]),
  );

  useFocusEffect(
    useCallback(() => {
      const maybeOpenPeer = async () => {
        const openPeer = route?.params?.openPeer;
        if (!openPeer || !user?.id) return;

        const thread = await ensureThread(user.id, openPeer, {
          initialPeerMessage: `Hey, this is ${openPeer.name}. Thanks for reaching out.`,
        });

        navigation.setParams?.({ openPeer: undefined });
        navigation.navigate('DMThread', {
          threadId: thread.id,
          peerName: thread.peerName,
          peerHandle: thread.peerHandle,
          peerAvatarUri: thread.peerAvatarUri || null,
        });
      };

      maybeOpenPeer();
    }, [route?.params?.openPeer, user?.id, navigation]),
  );

  const renderThread = ({ item }) => (
    <Pressable
      style={styles.threadCard}
      onPress={() =>
        navigation.navigate('DMThread', {
          threadId: item.id,
          peerName: item.peerName,
          peerHandle: item.peerHandle,
          peerAvatarUri: item.peerAvatarUri || null,
        })
      }
    >
      <AvatarSeed label={item.peerName} uri={item.peerAvatarUri} />

      <View style={styles.threadBody}>
        <View style={styles.threadTop}>
          <Text style={styles.name}>{item.peerName}</Text>
          <Text style={styles.time}>{formatThreadTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.handle}>{item.peerHandle}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage || 'Start a conversation'}
        </Text>
      </View>

      {item.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{item.unreadCount}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#70688E" />
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.backBtnGhost} />
      </View>

      <View style={styles.meCard}>
        <Text style={styles.meTitle}>Logged in as</Text>
        <Text style={styles.meName}>{me}</Text>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={renderThread}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyTxt}>
            No DMs yet. Start by tapping Message on a community post.
          </Text>
        }
      />
    </View>
  );
}

function formatThreadTime(iso) {
  const d = new Date(iso || Date.now());
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  meCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 12,
    marginBottom: 10,
  },
  meTitle: { color: '#8E85AE', fontSize: 11, fontWeight: '700' },
  meName: { color: '#F3F1FB', fontSize: 15, fontWeight: '800', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyTxt: { color: '#8E85AE', textAlign: 'center', marginTop: 40 },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#130E25', fontWeight: '900', fontSize: 16 },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#F2F0FA', fontWeight: '800', fontSize: 14 },
  time: { color: '#9188AF', fontSize: 11, fontWeight: '700' },
  handle: { color: '#8E85AE', fontSize: 11, marginTop: 1 },
  preview: { color: '#CFCBE4', marginTop: 4, fontSize: 12 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: { color: '#130E25', fontSize: 11, fontWeight: '900' },
});
