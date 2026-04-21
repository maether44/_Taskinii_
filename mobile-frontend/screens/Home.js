import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useDashboard } from '../hooks/useDashboard';
import { useShakySteps } from '../hooks/useShakySteps';
import WaterTracker from '../components/home/WaterTracker'; // Your interactive cup component
import { COLORS } from '../constants/colors';
import { FS } from '../constants/typography';
import { supabase } from '../lib/supabase';
import { AlexiEvents } from '../context/AlexiVoiceContext';

// ─── Level 5 Bento Components ───────────────────────────────────────────────

const BentoCard = ({ children, style, delay = 0 }) => (
  <Animated.View 
    entering={FadeInDown.delay(delay).springify().damping(15)}
    style={[styles.cardBase, style]}
  >
    {children}
  </Animated.View>
);

export default function Home({ navigation }) {
  const { isLoading, error, user, stats, logWater, logSleep, refresh, yaraInsight, muscleFatigue } = useDashboard();
  const { steps: liveSteps } = useShakySteps(user?.id);
  const totalSteps = (stats?.steps || 0) + liveSteps;
  const [displayCal, setDisplayCal] = useState(0);
  const [lastSession, setLastSession] = useState(null);

  // ── Alexi voice updates — refresh dashboard instantly when voice logs data ────
  useEffect(() => {
    const off = AlexiEvents.on('dataUpdated', () => refresh());
    return off;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      (async () => {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) return;
        const { data } = await supabase
          .from('workout_sessions')
          .select('notes, calories_burned, started_at')
          .eq('user_id', u.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setLastSession(data ?? null);
      })();
    }, [refresh])
  );

  // Count-up effect for calories — only runs once data is ready
  useEffect(() => {
    if (isLoading || error || !stats) return;
    let start = 0;
    const end = stats.calories.remaining;
    const increment = end / (1000 / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplayCal(Math.floor(end)); clearInterval(timer); }
      else { setDisplayCal(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [isLoading, error, stats?.calories?.remaining]);

  if (error) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={{ color: COLORS.error, marginBottom: 12 }}>Error: {error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnTxt}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !stats) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.lime} size="large" />
        <Text style={{ color: COLORS.sub, marginTop: 10 }}>Loading BodyQ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* 1. TOP HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey {user.name} 👋</Text>
            <Text style={styles.subGreeting}>Let's hit your {user.goal?.replace('_', ' ')} goal.</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarTxt}>{user.name?.charAt(0)}</Text>
          </Pressable>
        </View>
        

        {/* 2. YARA AI INSIGHT (Glow Card) */}
        <BentoCard delay={100}>
          <LinearGradient
            colors={['#7C5CFC', '#4A2FC8']}
            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
            style={styles.aiCard}
          >
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>YARA COACH</Text>
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.aiText}>"{yaraInsight}"</Text>
          </LinearGradient>
        </BentoCard>

        {/* 3. NUTRITION BENTO GRID */}
        <View style={styles.bentoGrid}>
          {/* Main Calorie Block */}
          <BentoCard style={styles.mainCalorieCard} delay={200}>
            <Text style={styles.cardLabel}>CALORIES LEFT</Text>
            <Text style={styles.bigCal}>{displayCal}</Text>
            <View style={styles.calRow}>
               <Text style={styles.calSub}>Eaten: {stats.calories.eaten}</Text>
               <View style={styles.dividerV} />
               <Text style={styles.calSub}>Goal: {stats.calories.target}</Text>
            </View>
            {stats.calories.burned > 0 && (
              <Text style={styles.calBurned}>🔥 Burned: {stats.calories.burned} kcal</Text>
            )}
            <Pressable 
              style={styles.logBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('FoodScanner', {
                  currentCalories: stats.calories.eaten,
                  currentProtein: stats.macros.protein.current,
                  currentCarbs: stats.macros.carbs.current,
                  currentFat: stats.macros.fat.current || 0,
                  goalCalories: stats.calories.target,
                  goalProtein: stats.macros.protein.target,
                  goalCarbs: stats.macros.carbs.target,
                  goalFat: stats.macros.fat.target || 0,
                });
              }}
            >
              <Text style={styles.logBtnTxt}>+ Log Meal</Text>
            </Pressable>
          </BentoCard>

          {/* Macro Block (Right side) */}
          <View style={styles.macroColumn}>
            <BentoCard style={styles.macroSmallCard} delay={300}>
              <Text style={[styles.macroLabel, {color: COLORS.lime}]}>PROTEIN</Text>
              <Text style={styles.macroVal}>{stats.macros.protein.current} / {stats.macros.protein.target}g</Text>
              <View style={styles.barContainer}><View style={[styles.barFill, {width: `${(stats.macros.protein.current / stats.macros.protein.target) * 100}%`, backgroundColor: COLORS.lime}]} /></View>
            </BentoCard>
            
            <BentoCard style={styles.macroSmallCard} delay={400}>
              <Text style={[styles.macroLabel, {color: '#378ADD'}]}>CARBS</Text>
              <Text style={styles.macroVal}>{stats.macros.carbs.current}g</Text>
              <View style={styles.barContainer}><View style={[styles.barFill, {width: `${(stats.macros.carbs.current / stats.macros.carbs.target) * 100}%`, backgroundColor: '#378ADD'}]} /></View>
            </BentoCard>
          </View>
        </View>

        {/* 4. ACTIVITY ROW (Steps & Sleep) */}
        <View style={styles.twoColumn}>
          <BentoCard style={styles.halfCard} delay={500}>
            <Text style={styles.cardLabel}>👟 STEPS</Text>
            <Text style={styles.statNum}>{totalSteps.toLocaleString()}</Text>
            <View style={styles.miniBarBg}>
              <View style={[styles.miniBarFill, { width: `${Math.min((totalSteps / 10000) * 100, 100)}%`, backgroundColor: COLORS.lime }]} />
            </View>
            <Text style={styles.smallSub}>goal 10,000</Text>
          </BentoCard>

          <BentoCard style={styles.halfCard} delay={600}>
            <Text style={styles.cardLabel}>🌙 SLEEP</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.statNum}>{stats.sleep || 0}</Text>
              <Text style={styles.statUnit}> hrs</Text>
            </View>
            <Pressable
              style={styles.miniAdd}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                logSleep((stats.sleep || 0) + 0.5);
              }}
            >
              <Text style={styles.miniAddTxt}>+ 30m</Text>
            </Pressable>
          </BentoCard>
        </View>

        {/* 5. MUSCLE FATIGUE ROW */}
        {muscleFatigue.length > 0 && (
          <BentoCard delay={650}>
            <Text style={styles.cardLabel}>MUSCLE FATIGUE</Text>
            {muscleFatigue.slice(0, 3).map((m) => (
              <View key={m.muscle_name} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{m.muscle_name}</Text>
                  <Text style={{ color: m.fatigue_pct >= 70 ? '#FF9500' : '#C8F135', fontSize: 12, fontWeight: '800' }}>{m.fatigue_pct}%</Text>
                </View>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: `${m.fatigue_pct}%`, backgroundColor: m.fatigue_pct >= 70 ? '#FF9500' : '#C8F135' }]} />
                </View>
              </View>
            ))}
          </BentoCard>
        )}

        {/* 6. LAST SESSION / GO TRAIN */}
        <BentoCard delay={700} style={styles.workoutCard}>
          <View style={styles.workoutContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>
                {lastSession ? 'LAST SESSION' : 'READY TO TRAIN?'}
              </Text>
              {lastSession ? (
                <>
                  <Text style={styles.workoutTitle} numberOfLines={1}>
                    {lastSession.notes?.split(' · ')[0] || 'Workout'}
                  </Text>
                  <Text style={styles.workoutSub}>
                    {lastSession.notes?.split(' · ').slice(1).join(' · ') || ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.workoutTitle}>Start a Workout</Text>
                  <Text style={styles.workoutSub}>No sessions yet today</Text>
                </>
              )}
            </View>
            <Pressable
              style={styles.playBtn}
              onPress={() => navigation.navigate('Training')}
            >
              <Ionicons name="play" size={24} color="#000" />
            </Pressable>
          </View>
        </BentoCard>

        {/* Full Water Tracking Cups (The part you specifically wanted) */}
        <View style={{marginTop: 20}}>
            <WaterTracker 
                waterMl={stats.water.current} 
                waterGoalMl={stats.water.target} 
                logWater={logWater} 
            />
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0B1E' },
  scroll: { paddingHorizontal: 16, paddingTop: 60 },
<<<<<<< HEAD
  loadingRoot: { flex: 1, backgroundColor: '#0F0B1E', justifyContent: 'center', alignItems: 'center' },
  retryBtn:    { backgroundColor: '#7C5CFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 8 },
  retryBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  subGreeting: { color: '#6B5F8A', fontSize: 14, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center', borderWeight: 2, borderColor: '#C8F135' },
  avatarTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
=======
  loadingRoot: {
    flex: 1,
    backgroundColor: '#0F0B1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryBtnTxt: { color: '#FFF', fontSize: FS.btnPrimary, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { color: '#FFF', fontSize: FS.screenTitle, fontWeight: '900' },
  subGreeting: { color: '#6B5F8A', fontSize: FS.body, marginTop: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C5CFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWeight: 2,
    borderColor: '#C8F135',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 22 },
  avatarTxt: { color: '#FFF', fontSize: FS.cardTitle, fontWeight: 'bold' },
>>>>>>> backup/recovered-2026-04-19

  cardBase: { backgroundColor: '#161230', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1E1A35', marginBottom: 12 },
  
  aiCard: { borderRadius: 24, padding: 20 },
<<<<<<< HEAD
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8F135', shadowColor: '#C8F135', shadowRadius: 10, shadowOpacity: 1 },
  aiText: { color: '#FFF', fontSize: 15, lineHeight: 22, fontWeight: '500' },
=======
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiTitle: { color: 'rgba(255,255,255,0.6)', fontSize: FS.label, fontWeight: '900', letterSpacing: 1 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8F135',
    shadowColor: '#C8F135',
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  aiText: { color: '#FFF', fontSize: FS.bodyLarge, lineHeight: 22, fontWeight: '500' },
>>>>>>> backup/recovered-2026-04-19

  bentoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  mainCalorieCard: { flex: 1.2, marginBottom: 0, justifyContent: 'center' },
  macroColumn: { flex: 1, gap: 12 },
  macroSmallCard: { marginBottom: 0, padding: 15 },
<<<<<<< HEAD
  
  cardLabel: { color: '#6B5F8A', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  bigCal: { color: '#C8F135', fontSize: 42, fontWeight: '900', marginVertical: 4 },
  calRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calBurned: { color: '#C8F135', fontSize: 11, fontWeight: '800', marginTop: 6 },
  calSub: { color: '#6B5F8A', fontSize: 11 },
  dividerV: { width: 1, height: 10, backgroundColor: '#1E1A35' },
  
  logBtn: { backgroundColor: '#7C5CFC', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 15 },
  logBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  macroLabel: { fontSize: 9, fontWeight: '900', marginBottom: 4 },
  macroVal: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  barContainer: { height: 4, backgroundColor: '#0F0B1E', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
=======

  cardLabel: {
    color: '#6B5F8A',
    fontSize: FS.label,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  bigCal: { color: '#C8F135', fontSize: FS.hero, fontWeight: '900', marginVertical: 4 },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calBurned: { color: '#C8F135', fontSize: FS.sub, fontWeight: '800', marginTop: 6 },
  calSub: { color: '#6B5F8A', fontSize: FS.sub },
  dividerV: { width: 1, height: 10, backgroundColor: '#1E1A35' },

  logBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  logBtnTxt: { color: '#FFF', fontSize: FS.body, fontWeight: '700' },

  macroLabel: { fontSize: 9, fontWeight: '900', marginBottom: 4 },
  macroVal: { color: '#FFF', fontSize: FS.bodyLarge, fontWeight: '700' },
  barContainer: {
    height: 4,
    backgroundColor: '#0F0B1E',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
>>>>>>> backup/recovered-2026-04-19
  barFill: { height: '100%', borderRadius: 2 },

  twoColumn: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, alignItems: 'center' },
<<<<<<< HEAD
  statNum: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  statUnit: { color: '#6B5F8A', fontSize: 12, fontWeight: '500' },
  miniAdd:    { backgroundColor: '#1E1A35', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  miniAddTxt: { color: '#C8F135', fontSize: 11, fontWeight: '700' },
  miniBarBg:  { width: '100%', height: 4, backgroundColor: '#1E1A35', borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  miniBarFill:{ height: 4, borderRadius: 2 },
  smallSub:   { color: '#6B5F8A', fontSize: 10, marginTop: 5 },

  workoutCard: { padding: 15 },
  workoutContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  workoutSub: { color: '#6B5F8A', fontSize: 13, marginTop: 4 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#C8F135', alignItems: 'center', justifyContent: 'center' }
});
=======
  statNum: { color: '#FFF', fontSize: FS.sectionTitle, fontWeight: '900' },
  statUnit: { color: '#6B5F8A', fontSize: FS.btnSecondary, fontWeight: '500' },
  miniAdd: {
    backgroundColor: '#1E1A35',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  miniAddTxt: { color: '#C8F135', fontSize: FS.sub, fontWeight: '700' },
  miniBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E1A35',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  miniBarFill: { height: 4, borderRadius: 2 },
  smallSub: { color: '#6B5F8A', fontSize: FS.badge, marginTop: 5 },

  workoutCard: { padding: 15 },
  workoutContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutTitle: { color: '#FFF', fontSize: FS.cardTitle, fontWeight: '800' },
  workoutSub: { color: '#6B5F8A', fontSize: FS.body, marginTop: 4 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
>>>>>>> backup/recovered-2026-04-19
