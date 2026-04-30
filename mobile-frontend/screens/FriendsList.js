import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFriendsForUser } from '../services/friendInviteService';
import { resolveAvatarUrl } from '../lib/avatar';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  text: '#FFFFFF',
  sub: '#6B5F8A',
};

export default function FriendsList({ navigation }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFriends = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const friendsList = await getFriendsForUser(user.id);
      const resolved = await Promise.all(
        (friendsList || []).map(async (f) => ({
          ...f,
          avatar_url: (await resolveAvatarUrl(f.avatar_url).catch(() => null)) || f.avatar_url,
        })),
      );
      setFriends(resolved);
    } catch (error) {
      console.error('Failed to load friends:', error);
      Alert.alert('Error', 'Could not load your friends list.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends]),
  );

  function AvatarSeed({ label, uri }) {
    return (
      <View style={styles.friendAvatar}>
        {uri ? (
          <Image source={{ uri }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarText}>{label?.charAt(0)?.toUpperCase() || '?'}</Text>
        )}
      </View>
    );
  }

  const renderFriendCard = ({ item }) => (
    <Pressable
      style={styles.friendCard}
      onPress={() => navigation.navigate('FriendProfile', { friendId: item.id })}
    >
      <AvatarSeed label={item.full_name} uri={item.avatar_url} />

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.full_name || 'Friend'}</Text>
        {item.bio ? <Text style={styles.friendBio}>{item.bio}</Text> : null}
        {item.goal ? <Text style={styles.friendGoal}>Goal: {item.goal}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color={C.sub} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.lime} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.backBtnGhost} />
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySub}>
            Send invites from your profile to start building your friend list
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: { width: 36, height: 36 },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.lime,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  friendBio: {
    color: C.sub,
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  friendGoal: {
    color: C.lime,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    color: C.sub,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
