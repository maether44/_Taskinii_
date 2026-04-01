/**
 * screens/Nutrition.js
 * Fully connected to Supabase via useNutrition hook.
 * Includes food scanner button.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import MacroBar from '../components/shared/MacroBar';
import RingProgress from '../components/shared/RingProgress';

import { useNutrition } from '../hooks/useNutrition';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️'  },
  { id: 'lunch',     label: 'Lunch',     icon: '🌤️' },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙'  },
  { id: 'snacks',    label: 'Snacks',    icon: '🍎'  },
];

const C = {
  bg:     '#0F0B1E',
  card:   '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime:   '#C8F135',
  accent: '#9D85F5',
  text:   '#FFFFFF',
  sub:    '#6B5F8A',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
};

export default function Nutrition({ navigation }) {
  const navigate = navigation.navigate.bind(navigation);
  const [tab, setTab] = useState('today');

  const {
    loading,
    goals,
    eaten, protein, carbs, fat, waterMl,
    caloriesBurned,
    mealsBySlot,
    logWater,
    refresh,
  } = useNutrition();

  // Dynamic budget: base goal + calories burned from workouts today
  const adjustedGoal = goals.calorie_target + (caloriesBurned || 0);
  const calRemaining = Math.max(adjustedGoal - eaten, 0);
  const calPct       = Math.min(eaten / adjustedGoal, 1);
  const over         = eaten > adjustedGoal;
  const waterPct     = Math.min(waterMl / goals.water_target_ml, 1);
  const waterGlasses = Math.round(waterMl / 250);
  const waterGoalG   = Math.round(goals.water_target_ml / 250);

  const logMeal = (slotId) => {
    navigate && navigate('MealLogger', {
      mealSlot: MEAL_SLOTS.find(m => m.id === slotId) || { label: slotId, icon: '🍽️', id: slotId },
      onSaved: refresh,
    });
  };

  // Refresh data when returning from FoodScanner
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const openScanner = () => {
    navigate && navigate('FoodScanner', {
      currentCalories: eaten,
      currentProtein:  protein,
      currentCarbs:    carbs,
      currentFat:      fat,
      goalCalories:    goals.calorie_target,
      goalProtein:     goals.protein_target,
      goalCarbs:       goals.carbs_target,
      goalFat:         goals.fat_target,
    });
  };

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={{ color: C.sub, marginTop: 12, fontSize: 13 }}>Loading your nutrition…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Nutrition</Text>
            <Text style={s.date}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          {/* Refresh button */}
          <TouchableOpacity onPress={refresh} style={s.refreshBtn}>
            <Ionicons name="refresh-outline" size={18} color={C.sub} />
          </TouchableOpacity>
        </View>

        {/* ── SCAN FOOD BUTTON ────────────────────────────────────────────── */}
        <TouchableOpacity onPress={openScanner} activeOpacity={0.85} style={s.scanBtnWrap}>
          <LinearGradient
            colors={['#7C5CFC', '#9D85F5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.scanBtn}
          >
            <Ionicons name="barcode-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.scanBtnTitle}>Scan Food</Text>
              <Text style={s.scanBtnSub}>Barcode or AI photo recognition</Text>
            </View>
            <View style={s.scanBtnBadge}>
              <Text style={s.scanBtnBadgeTxt}>AI</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Tab ────────────────────────────────────────────────────────── */}
        <View style={s.tabRow}>
          {['today', 'week'].map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && s.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t === 'today' ? 'Today' : 'This Week'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── CALORIE SUMMARY ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>CALORIES</Text>

          {/* Workout bonus banner */}
          {caloriesBurned > 0 && (
            <View style={s.workoutBanner}>
              <Ionicons name="flame" size={13} color={C.lime} />
              <Text style={s.workoutBannerTxt}>
                Workout added +{caloriesBurned} kcal to your budget today
              </Text>
            </View>
          )}

          <View style={s.calRow}>
            <RingProgress size={100} stroke={9} progress={calPct} color={over ? C.red : C.lime}>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.ringNum}>{eaten}</Text>
                <Text style={s.ringLbl}>eaten</Text>
              </View>
            </RingProgress>
            <View style={s.calStats}>
              <View style={s.calStat}>
                <Text style={s.calStatVal}>{adjustedGoal}</Text>
                <Text style={s.calStatLbl}>Budget</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text style={[s.calStatVal, { color: over ? C.red : C.lime }]}>
                  {over ? `+${eaten - adjustedGoal}` : calRemaining}
                </Text>
                <Text style={s.calStatLbl}>{over ? 'Over' : 'Left'}</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text style={[s.calStatVal, { color: C.green }]}>
                  {Math.round(calPct * 100)}%
                </Text>
                <Text style={s.calStatLbl}>Done</Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.calBar}>
            <View style={[s.calBarFill, {
              width: `${calPct * 100}%`,
              backgroundColor: over ? C.red : C.lime,
            }]} />
          </View>
        </View>

        {/* ── MACROS ──────────────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>MACROS</Text>
          <MacroBar label="Protein" eaten={protein} goal={goals.protein_target} color={C.purple} />
          <MacroBar label="Carbs"   eaten={carbs}   goal={goals.carbs_target}   color={C.accent} />
          <MacroBar label="Fat"     eaten={fat}      goal={goals.fat_target}     color={C.lime}   />
          <View style={s.macroHints}>
            <Text style={s.macroHint}>
              💡 Protein goal: {goals.protein_target}g/day for muscle retention
            </Text>
          </View>
        </View>

        {/* ── MEALS ───────────────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>MEALS</Text>
            <TouchableOpacity onPress={openScanner} style={s.scanMiniBtn}>
              <Ionicons name="scan-outline" size={14} color={C.purple} />
              <Text style={s.scanMiniTxt}>Scan</Text>
            </TouchableOpacity>
          </View>

          {MEAL_SLOTS.map(slot => {
            const m = mealsBySlot[slot.id] || { logged: false, cal: 0, items: [] };
            return (
              <View key={slot.id} style={s.mealRow}>
                <View style={s.mealLeft}>
                  <Text style={s.mealIcon}>{slot.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mealName}>{slot.label}</Text>
                    {m.logged
                      ? <Text style={s.mealItems} numberOfLines={1}>{m.items.join(' · ')}</Text>
                      : <Text style={s.mealEmpty}>Not logged yet</Text>
                    }
                  </View>
                </View>
                <View style={s.mealRight}>
                  {m.logged && (
                    <Text style={s.mealCal}>{m.cal} kcal</Text>
                  )}
                  <TouchableOpacity
                    style={[s.mealBtn, m.logged && s.mealBtnLogged]}
                    onPress={() => logMeal(slot.id)}
                  >
                    <Text style={[s.mealBtnTxt, m.logged && s.mealBtnTxtLogged]}>
                      {m.logged ? 'Edit' : '+ Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── WATER ───────────────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>WATER</Text>
            <Text style={s.cardSub}>{waterGlasses}/{waterGoalG} glasses</Text>
          </View>

          <View style={s.waterDisplay}>
            <Text style={s.waterNum}>{(waterMl / 1000).toFixed(1)}</Text>
            <Text style={s.waterUnit}>L</Text>
            <Text style={s.waterGoal}>of {(goals.water_target_ml / 1000).toFixed(1)}L goal</Text>
          </View>

          <View style={s.waterBarBg}>
            <View style={[s.waterBarFill, { width: `${waterPct * 100}%` }]} />
          </View>

          <View style={s.waterDots}>
            {Array.from({ length: waterGoalG }).map((_, i) => (
              <View key={i} style={[s.waterDot, i < waterGlasses && s.waterDotFilled]} />
            ))}
          </View>

          <View style={s.waterBtns}>
            {[250, 500, 750].map(ml => (
              <TouchableOpacity
                key={ml}
                style={s.waterAddBtn}
                onPress={() => logWater(ml)}
              >
                <Text style={s.waterAddTxt}>+{ml}ml</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.waterAddBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3030' }]}
              onPress={() => logWater(-250)}
            >
              <Text style={[s.waterAddTxt, { color: C.red }]}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  date:       { color: C.sub, fontSize: 13, marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

  // Scan button
  scanBtnWrap: { marginBottom: 16, borderRadius: 18, overflow: 'hidden' },
  scanBtn:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 18 },
  scanBtnTitle:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  scanBtnSub:  { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  scanBtnBadge:{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  scanBtnBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Tabs
  tabRow:      { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  tab:         { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabActive:   { backgroundColor: C.purple },
  tabTxt:      { color: C.sub, fontSize: 13, fontWeight: '600' },
  tabTxtActive:{ color: '#fff', fontWeight: '700' },

  // Cards
  card:        { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardLabel:   { color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 14 },
  cardTitleRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardSub:     { color: C.sub, fontSize: 12 },

  // Calories
  calRow:      { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringNum:     { color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  ringLbl:     { color: C.sub, fontSize: 11, marginTop: 1 },
  calStats:    { flex: 1, gap: 10 },
  calStat:     {},
  calStatVal:  { color: C.text, fontSize: 18, fontWeight: '800' },
  calStatLbl:  { color: C.sub, fontSize: 11 },
  calDivider:  { height: 1, backgroundColor: C.border },
  calBar:          { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden', marginTop: 16 },
  workoutBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200,241,53,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  workoutBannerTxt:{ color: C.lime, fontSize: 11, fontWeight: '700', flex: 1 },
  calBarFill:  { height: 6, borderRadius: 3 },

  // Macros
  macroHints:  { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  macroHint:   { color: C.sub, fontSize: 12, lineHeight: 18 },

  // Meals
  scanMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.purple + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.purple + '40' },
  scanMiniTxt: { color: C.purple, fontSize: 12, fontWeight: '700' },
  mealRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  mealLeft:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, marginRight: 10 },
  mealIcon:    { fontSize: 22, marginTop: 2 },
  mealName:    { color: C.text, fontSize: 14, fontWeight: '700' },
  mealItems:   { color: C.sub, fontSize: 11, marginTop: 2, lineHeight: 16 },
  mealEmpty:   { color: C.border, fontSize: 11, marginTop: 2 },
  mealRight:   { alignItems: 'flex-end', gap: 5 },
  mealCal:     { color: C.accent, fontSize: 13, fontWeight: '700' },
  mealBtn:     { backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  mealBtnLogged:    { backgroundColor: C.border },
  mealBtnTxt:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  mealBtnTxtLogged: { color: C.sub },

  // Water
  waterDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 14 },
  waterNum:     { color: C.text, fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  waterUnit:    { color: C.sub, fontSize: 22, fontWeight: '600' },
  waterGoal:    { color: C.sub, fontSize: 13, alignSelf: 'flex-end', marginBottom: 8 },
  waterBarBg:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  waterBarFill: { height: 8, backgroundColor: '#0A84FF', borderRadius: 4 },
  waterDots:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 },
  waterDot:     { width: 16, height: 16, borderRadius: 8, backgroundColor: C.border },
  waterDotFilled: { backgroundColor: '#0A84FF' },
  waterBtns:    { flexDirection: 'row', gap: 8 },
  waterAddBtn:  { flex: 1, backgroundColor: '#0A84FF18', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#0A84FF35' },
  waterAddTxt:  { color: '#0A84FF', fontSize: 13, fontWeight: '700' },
});