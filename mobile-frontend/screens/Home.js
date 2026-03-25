import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useDashboard } from '../hooks/useDashboard';
import { useShakySteps } from '../hooks/useShakySteps';
import WaterTracker from '../components/home/WaterTracker'; // Your interactive cup component
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

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
  const { isLoading, error, user, stats, logWater, logSleep, refresh } = useDashboard();
  const { steps: liveSteps } = useShakySteps(user?.id);
  const totalSteps = (stats?.steps || 0) + liveSteps;
  const [displayCal, setDisplayCal] = useState(0);

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
            <Text style={styles.aiText}>
              "You're doing great! You need 40g more protein to optimize muscle recovery today. Consider a shake."
            </Text>
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
            <Pressable 
              style={styles.logBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('FoodScanner');
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

        {/* 5. WORKOUT (Wide Card) */}
        <BentoCard delay={700} style={styles.workoutCard}>
          <View style={styles.workoutContent}>
             <View>
                <Text style={styles.cardLabel}>TODAY'S PLAN</Text>
                <Text style={styles.workoutTitle}>Upper Body Power</Text>
                <Text style={styles.workoutSub}>45 min · Strength</Text>
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
  loadingRoot: { flex: 1, backgroundColor: '#0F0B1E', justifyContent: 'center', alignItems: 'center' },
  retryBtn:    { backgroundColor: '#7C5CFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 8 },
  retryBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  subGreeting: { color: '#6B5F8A', fontSize: 14, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center', borderWeight: 2, borderColor: '#C8F135' },
  avatarTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  cardBase: { backgroundColor: '#161230', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1E1A35', marginBottom: 12 },
  
  aiCard: { borderRadius: 24, padding: 20 },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8F135', shadowColor: '#C8F135', shadowRadius: 10, shadowOpacity: 1 },
  aiText: { color: '#FFF', fontSize: 15, lineHeight: 22, fontWeight: '500' },

  bentoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  mainCalorieCard: { flex: 1.2, marginBottom: 0, justifyContent: 'center' },
  macroColumn: { flex: 1, gap: 12 },
  macroSmallCard: { marginBottom: 0, padding: 15 },
  
  cardLabel: { color: '#6B5F8A', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  bigCal: { color: '#C8F135', fontSize: 42, fontWeight: '900', marginVertical: 4 },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calSub: { color: '#6B5F8A', fontSize: 11 },
  dividerV: { width: 1, height: 10, backgroundColor: '#1E1A35' },
  
  logBtn: { backgroundColor: '#7C5CFC', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 15 },
  logBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  macroLabel: { fontSize: 9, fontWeight: '900', marginBottom: 4 },
  macroVal: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  barContainer: { height: 4, backgroundColor: '#0F0B1E', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  twoColumn: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, alignItems: 'center' },
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