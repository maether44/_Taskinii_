import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { normalizeGoal } from '../lib/calculations';
import { resolveAvatarUrl } from '../lib/avatar';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#6B5F8A',
  green: '#34C759',
};

const GOAL_LABELS = {
  lose_fat: 'Lose Fat 🔥',
  fat_loss: 'Lose Fat 🔥',
  gain_muscle: 'Build Muscle 💪',
  muscle_gain: 'Build Muscle 💪',
  maintain: 'Stay Fit ⚖️',
  gain_weight: 'Gain Weight 🍽️',
  build_habits: 'Build Habits 🧠',
};

export default function FriendProfile({ route, navigation }) {
  const friendId = route?.params?.friendId;
  const [profile, setProfile] = useState(null);
  const [xpInfo, setXpInfo] = useState({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
  const [achievements, setAchievements] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [resolvedAvatarUri, setResolvedAvatarUri] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFriendProfile = useCallback(async () => {
    if (!friendId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch profile
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('full_name, bio, city, country, goal, avatar_url, login_streak, longest_streak')
        .eq('id', friendId)
        .single();

      if (profError) throw profError;

      setProfile({
        ...prof,
        goal: normalizeGoal(prof.goal),
      });

      resolveAvatarUrl(prof.avatar_url).then(setResolvedAvatarUri).catch(() => {});

      // Fetch XP/level info
      try {
        const { data: xpData, error: xpError } = await supabase.rpc('get_user_level_info', {
          p_user_id: friendId,
        });
        setXpInfo(
          !xpError && xpData ? xpData : { level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 },
        );
      } catch {
        setXpInfo({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
      }

      // Fetch achievements
      try {
        const { data: achData, error: achError } = await supabase.rpc('get_all_achievements', {
          p_user_id: friendId,
        });
        setAchievements(!achError && achData?.achievements ? achData.achievements : []);
      } catch {
        setAchievements([]);
      }

      // Set streak data
      setStreak({
        current: prof?.login_streak || 0,
        longest: prof?.longest_streak || 0,
      });
    } catch (error) {
      console.error('Failed to load friend profile:', error);
      Alert.alert('Error', 'Could not load friend profile.');
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    loadFriendProfile();
  }, [loadFriendProfile]);

  useFocusEffect(
    useCallback(() => {
      loadFriendProfile();
    }, [loadFriendProfile]),
  );

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.lime} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backBtnGhost} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>Could not load profile</Text>
        </View>
      </View>
    );
  }

  const name = profile?.full_name || 'Friend';
  const goal = profile?.goal || 'maintain';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backBtnGhost} />
        </View>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {resolvedAvatarUri ? (
              <Image source={{ uri: resolvedAvatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>
            {profile?.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}
            {profile?.city || profile?.country ? (
              <Text style={styles.profileLocation}>
                📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            <View style={styles.goalChip}>
              <Text style={styles.goalChipTxt}>{GOAL_LABELS[goal] || goal}</Text>
            </View>
          </View>
        </View>

        {/* ── XP card ── */}
        <View style={styles.card}>
          <View style={styles.xpRow}>
            <View>
              <Text style={styles.cardLabel}>LEVEL {xpInfo.level}</Text>
              <Text style={styles.xpCount}>
                {xpInfo.xp_current} / {xpInfo.xp_needed} XP
              </Text>
            </View>
            <Text style={styles.xpEmoji}>⭐</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${(xpInfo.xp_current / xpInfo.xp_needed) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.xpNext}>
            {xpInfo.xp_needed - xpInfo.xp_current} XP to Level {xpInfo.level + 1}
          </Text>
        </View>

        {/* ── Streaks card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>STREAKS</Text>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>{streak.current} days</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Text style={styles.streakIcon}>🏆</Text>
              <Text style={styles.streakLabel}>Longest Streak</Text>
              <Text style={styles.streakValue}>{streak.longest} days</Text>
            </View>
          </View>
        </View>

        {/* ── Achievements card ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardLabel}>ACHIEVEMENTS</Text>
            <Text style={styles.cardSub}>
              {achievements.filter((a) => a.earned).length}/{achievements.length} earned
            </Text>
          </View>
          <View style={styles.badgesGrid}>
            {achievements.slice(0, 6).map((a) => (
              <View key={a.id} style={[styles.badge, !a.earned && styles.badgeLocked]}>
                <Text style={styles.badgeIcon}>{a.earned ? a.icon : '🔒'}</Text>
                <Text style={[styles.badgeLabel, !a.earned && { opacity: 0.4 }]}>{a.name}</Text>
                <Text style={[styles.badgeXP, !a.earned && { opacity: 0.4 }]}>
                  +{a.xp_reward} XP
                </Text>
              </View>
            ))}
          </View>
          {achievements.length > 6 && (
            <Text style={styles.moreAchievements}>
              +{achievements.length - 6} more achievement{achievements.length - 6 !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 52 },
  scroll: { paddingBottom: 20 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  headerTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: C.sub, fontSize: 14 },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    padding: 18,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80 },
  avatarText: { fontSize: 32, fontWeight: '700', color: C.lime },
  profileInfo: { alignItems: 'center' },
  profileName: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileBio: { color: C.sub, fontSize: 13, marginBottom: 8, fontStyle: 'italic' },
  profileLocation: { color: C.sub, fontSize: 12, marginBottom: 8 },
  goalChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.purple + '40',
    borderWidth: 1,
    borderColor: C.purple,
  },
  goalChipTxt: { color: C.lime, fontWeight: '700', fontSize: 12 },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    padding: 16,
  },
  cardLabel: { color: C.lime, fontSize: 11, fontWeight: '700', marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSub: { color: C.sub, fontSize: 12 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpCount: { color: C.text, fontSize: 16, fontWeight: '700' },
  xpEmoji: { fontSize: 28 },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: { height: 8, backgroundColor: C.lime },
  xpNext: { color: C.sub, fontSize: 12 },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakItem: { flex: 1, alignItems: 'center' },
  streakDivider: {
    width: 1,
    height: 60,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },
  streakIcon: { fontSize: 28, marginBottom: 6 },
  streakLabel: { color: C.sub, fontSize: 12, marginBottom: 4 },
  streakValue: { color: C.lime, fontSize: 18, fontWeight: '800' },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badge: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.border + '40',
    borderWidth: 1,
    borderColor: C.border,
  },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: { fontSize: 24, marginBottom: 4 },
  badgeLabel: {
    color: C.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeXP: { color: C.lime, fontSize: 10, fontWeight: '600' },
  moreAchievements: { color: C.sub, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
