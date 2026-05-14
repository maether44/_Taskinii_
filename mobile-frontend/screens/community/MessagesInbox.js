import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ensureThread, listThreads } from '../../services/dmService';
import { getProfile } from '../../services/profileService';
import { searchProfilesByName } from '../../services/inboxService';
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
  const [me, setMe] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchAnchorLayout, setSearchAnchorLayout] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        if (!user?.id) return;

        try {
          const profile = await getProfile(user.id);
          if (profile?.full_name) {
            setMe(profile.full_name);
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error);
        }
      };

      fetchProfile();
    }, [user?.id]),
  );

  const loadThreads = useCallback(async () => {
    if (!user?.id) {
      setThreads([]);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const matches = await searchProfilesByName(trimmedQuery, 6);
        // console.log('[Search] Matches found:', matches?.length, matches);

        if (!matches || !matches.length) {
          if (active) {
            setSearchResults([]);
            setSearching(false);
          }
          return;
        }

        const avatarCache = new Map();
        const filtered = (matches || []).filter(
          (profile) => profile?.id && profile.id !== user?.id,
        );
        console.log('[Search] Filtered matches:', filtered.length);

        const hydrated = await Promise.allSettled(
          filtered.map(async (profile) => {
            try {
              const key = profile?.avatar_url || '';
              if (!key) {
                return { ...profile, avatarUri: null };
              }

              if (avatarCache.has(key)) {
                return { ...profile, avatarUri: avatarCache.get(key) };
              }

              const resolved = await resolveDmAvatarUri(key);
              avatarCache.set(key, resolved);
              return { ...profile, avatarUri: resolved };
            } catch (err) {
              console.error('[Search] Error hydrating profile:', profile.id, err);
              return { ...profile, avatarUri: null };
            }
          }),
        );

        const results = hydrated
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);

        console.log('[Search] Hydrated results:', results.length);

        if (active) {
          setSearchResults(results);
        }
      } catch (error) {
        if (active) {
          console.error('[Search] Search error:', error);
          setSearchResults([]);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, user?.id]);

  const openProfileThread = useCallback(
    async (profile) => {
      if (!user?.id || !profile?.id) return;

      try {
        const thread = await ensureThread(user.id, {
          id: profile.id,
          name: profile.full_name,
          handle: `@${
            String(profile.full_name || 'user')
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_ ]/g, '')
              .replace(/\s+/g, '_') || 'user'
          }`,
          avatarUri: profile.avatarUri || profile.avatar_url || null,
        });

        setSearchQuery('');
        setSearchResults([]);
        navigation.navigate('DMThread', {
          threadId: thread.id,
          peerName: thread.peerName,
          peerHandle: thread.peerHandle,
          peerAvatarUri: thread.peerAvatarUri || null,
        });
      } catch (error) {
        Alert.alert('DM unavailable', error?.message || 'Could not open this conversation.');
      }
    },
    [navigation, user?.id],
  );

  // useEffect(() => {
  //   loadDisplayName();
  // }, [loadDisplayName]);

  // useEffect(() => {
  //   const unsubscribe = on(AppEvents.PROFILE_UPDATED, (payload) => {
  //     if (!payload?.userId || payload.userId === user?.id) {
  //       loadDisplayName();
  //     }
  //   });

  //   return unsubscribe;
  // }, [loadDisplayName, user?.id]);

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

        try {
          const thread = await ensureThread(user.id, openPeer);

          navigation.setParams?.({ openPeer: undefined });
          navigation.navigate('DMThread', {
            threadId: thread.id,
            peerName: thread.peerName,
            peerHandle: thread.peerHandle,
            peerAvatarUri: thread.peerAvatarUri || null,
          });
        } catch (error) {
          navigation.setParams?.({ openPeer: undefined });
          Alert.alert('DM unavailable', error?.message || 'Could not open this conversation.');
        }
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

  const renderSuggestion = ({ item }) => (
    <Pressable style={styles.suggestionCard} onPress={() => openProfileThread(item)}>
      <AvatarSeed label={item.full_name} uri={item.avatarUri} />

      <View style={styles.suggestionBody}>
        <Text style={styles.suggestionName}>{item.full_name}</Text>
        <Text style={styles.suggestionHint}>Tap to start a DM</Text>
      </View>

      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#C8F135" />
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

      {/* <View style={styles.meCard}>
        <Text style={styles.meTitle}>Logged in as</Text>
        <Text style={styles.meName}>{me}</Text>
      </View> */}

      <View
        style={styles.searchCard}
        onLayout={(event) => setSearchAnchorLayout(event.nativeEvent.layout)}
      >
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#8E85AE" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search profiles by name"
            placeholderTextColor="#70688E"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {searching ? <Text style={styles.searchMeta}>Searching...</Text> : null}
      </View>

      {searchQuery.trim() && searchAnchorLayout ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.dropdownPortal,
            {
              top: searchAnchorLayout.y + searchAnchorLayout.height + 8,
              left: searchAnchorLayout.x,
              width: searchAnchorLayout.width,
            },
          ]}
        >
          <View style={styles.dropdownShell}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSuggestion}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews
              contentContainerStyle={
                searchResults.length ? styles.dropdownContent : styles.dropdownEmpty
              }
              ListHeaderComponent={<Text style={styles.suggestionsTitle}>Suggestions</Text>}
              ListEmptyComponent={
                <Text style={styles.emptySuggestions}>No matching profiles found.</Text>
              }
            />
          </View>
        </View>
      ) : null}

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
  searchCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 12,
    marginBottom: 10,
    position: 'relative',
    zIndex: 10,
    elevation: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  searchInput: { flex: 1, color: '#F3F1FB', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  searchMeta: { color: '#8E85AE', fontSize: 11, marginTop: 8, fontWeight: '600' },
  dropdownPortal: {
    position: 'absolute',
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  dropdownShell: {
    maxHeight: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D3462',
    backgroundColor: '#1C1633',
    overflow: 'hidden',
    zIndex: 999,
  },
  dropdownContent: { padding: 10, gap: 8 },
  dropdownEmpty: { padding: 10 },
  suggestionsTitle: { color: '#C8F135', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,  },
  suggestionBody: { flex: 1 },
  suggestionName: { color: '#F3F1FB', fontSize: 14, fontWeight: '800' },
  suggestionHint: { color: '#8E85AE', fontSize: 11, marginTop: 2 },
  emptySuggestions: { color: '#8E85AE', fontSize: 12 },
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
