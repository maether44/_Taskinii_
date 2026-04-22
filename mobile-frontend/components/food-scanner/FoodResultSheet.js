import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MacroBar from '../shared/MacroBar';
import RingProgress from '../shared/RingProgress';
import StatCard from '../shared/StatCard';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  cardAlt: '#1B1637',
  border: '#241E45',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#8C80B1',
  dim: '#6B5F8A',
  green: '#34C759',
  red: '#FF6B6B',
};

const MEAL_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
];

function goalFitLabel(goalType, { calories, protein, carbs, fat }) {
  const highProtein = protein >= 20;
  const highFat = fat >= 18;
  const highCarb = carbs >= 40;
  const lightMeal = calories < 260;

  if (goalType === 'lose_fat') {
    if (highProtein && !highFat && calories <= 420)
      return 'Lean choice for a cut. This fits well as part of a controlled day.';
    if (highFat || calories > 600)
      return 'Tasty but heavy. Keep the rest of the day lighter if fat loss is your priority.';
    return 'Decent middle ground. Watch portion size and anchor it with protein.';
  }

  if (goalType === 'gain_muscle') {
    if (highProtein && calories >= 350)
      return 'Strong muscle-building option with enough fuel to support training.';
    if (!highProtein) return 'Add more protein to make this more useful for growth and recovery.';
    return 'Good base meal. Add carbs around training if you need more performance fuel.';
  }

  if (highProtein && !highFat) return 'Balanced pick for a solid everyday meal.';
  if (highCarb && !highFat)
    return 'Carb-forward choice that works especially well before or after activity.';
  if (lightMeal)
    return 'Light option. Useful when you want something quick without burning much of your calorie budget.';
  return 'Reasonable overall. The portion you choose will make the biggest difference.';
}

export default function FoodResultSheet({
  result,
  selectedMeal,
  onMealChange,
  quantity,
  onQuantityChange,
  onLog,
  onBack,
  saving = false,
}) {
  const safeResult = result || {};
  const servingSize = Math.max(1, Number(safeResult.servingSize) || 100);
  const quantityValue = Math.max(1, Number(quantity) || servingSize);
  const ratio = quantityValue / servingSize;

  const scaled = useMemo(() => {
    const calories = Math.round((Number(safeResult.calories) || 0) * ratio);
    const protein = Math.round((Number(safeResult.protein) || 0) * ratio * 10) / 10;
    const carbs = Math.round((Number(safeResult.carbs) || 0) * ratio * 10) / 10;
    const fat = Math.round((Number(safeResult.fat) || 0) * ratio * 10) / 10;
    const fiber = Math.round((Number(safeResult.fiber) || 0) * ratio * 10) / 10;
    return { calories, protein, carbs, fat, fiber };
  }, [ratio, safeResult]);

  const {
    name = 'Scanned food',
    brand = '',
    servingUnit = 'g',
    healthScore = 50,
    confidence = 0.8,
    source = 'barcode',
    suggestions = [],
    goalType = 'general_health',
    goalCalories = 2000,
    goalProtein = 150,
    goalCarbs = 250,
    goalFat = 65,
    currentCalories = 0,
    currentProtein = 0,
    currentCarbs = 0,
    currentFat = 0,
  } = safeResult;

  const calAfter = currentCalories + scaled.calories;
  const calProgress = Math.min(calAfter / Math.max(1, goalCalories), 1);
  const scoreColor = healthScore >= 75 ? C.green : healthScore >= 50 ? C.lime : C.red;
  const confidencePct = Math.round(Math.max(0, Math.min(1, confidence || 0)) * 100);
  const mealLabel = MEAL_OPTIONS.find((option) => option.id === selectedMeal)?.label || 'Meal';
  const fitText = goalFitLabel(goalType, scaled);
  const quickQuantities = [
    Math.round(servingSize * 0.5),
    servingSize,
    Math.round(servingSize * 1.5),
    Math.round(servingSize * 2),
  ]
    .map((value) => Math.max(1, Math.round(value)))
    .filter((value, index, array) => array.indexOf(value) === index);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Scanned result</Text>
          <Text style={s.headerSub}>Review it, pick a meal, then log it</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1E1842', '#130F29']} style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.foodName}>{name}</Text>
              {!!brand && <Text style={s.brand}>{brand}</Text>}
              <View style={s.metaRow}>
                <View style={s.metaPill}>
                  <Text style={s.metaTxt}>{source === 'photo_ai' ? 'AI photo' : 'Barcode'}</Text>
                </View>
                <View style={s.metaPill}>
                  <Text style={s.metaTxt}>{confidencePct}% confidence</Text>
                </View>
              </View>
            </View>

            <View style={[s.scoreBadge, { borderColor: scoreColor }]}>
              <Text style={[s.scoreNum, { color: scoreColor }]}>{healthScore}</Text>
              <Text style={s.scoreLabel}>score</Text>
            </View>
          </View>

          <View style={s.heroBottom}>
            <RingProgress
              size={110}
              stroke={10}
              progress={calProgress}
              color={calAfter > goalCalories ? C.red : C.lime}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={s.ringNum}>{scaled.calories}</Text>
                <Text style={s.ringLbl}>kcal</Text>
              </View>
            </RingProgress>

            <View style={s.heroStats}>
              <StatCard
                icon="🍽️"
                label="Logging to"
                value={mealLabel}
                sub="adds as part of this meal"
                color={C.purple}
                style={{ width: '100%' }}
              />
              <StatCard
                icon="🎯"
                label="After this"
                value={`${calAfter}`}
                sub={`of ${goalCalories} kcal`}
                color={calAfter > goalCalories ? C.red : C.lime}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Portion</Text>
          <Text style={s.sectionTitle}>Adjust how much you actually ate</Text>
          <Text style={s.sectionSub}>
            Serving detected: {servingSize}
            {servingUnit}
          </Text>

          <View style={s.portionControl}>
            <TouchableOpacity
              style={s.portionBtn}
              onPress={() => onQuantityChange(Math.max(1, quantityValue - 25))}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </TouchableOpacity>
            <View style={s.portionCenter}>
              <TextInput
                style={s.portionInput}
                value={String(quantityValue)}
                keyboardType="numeric"
                onChangeText={(value) =>
                  onQuantityChange(Math.max(1, Number(value.replace(/[^\d]/g, '')) || 1))
                }
              />
              <Text style={s.portionUnit}>{servingUnit}</Text>
            </View>
            <TouchableOpacity
              style={s.portionBtn}
              onPress={() => onQuantityChange(quantityValue + 25)}
            >
              <Ionicons name="add" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <View style={s.quickRow}>
            {quickQuantities.map((value) => (
              <TouchableOpacity
                key={value}
                style={[s.quickChip, value === quantityValue && s.quickChipActive]}
                onPress={() => onQuantityChange(value)}
              >
                <Text style={[s.quickChipTxt, value === quantityValue && s.quickChipTxtActive]}>
                  {value}
                  {servingUnit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Meal slot</Text>
          <Text style={s.sectionTitle}>Where should this item go today?</Text>
          <View style={s.mealGrid}>
            {MEAL_OPTIONS.map((meal) => {
              const active = selectedMeal === meal.id;
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={[s.mealChip, active && s.mealChipActive]}
                  onPress={() => onMealChange(meal.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={meal.icon} size={16} color={active ? '#101010' : C.accent} />
                  <Text style={[s.mealChipTxt, active && s.mealChipTxtActive]}>{meal.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Nutrition</Text>
          <Text style={s.sectionTitle}>This portion in your day</Text>
          <View style={s.macroWrap}>
            <MacroBar
              label="Protein"
              eaten={currentProtein + scaled.protein}
              goal={goalProtein}
              color={C.purple}
            />
            <MacroBar
              label="Carbs"
              eaten={currentCarbs + scaled.carbs}
              goal={goalCarbs}
              color={C.accent}
            />
            <MacroBar label="Fat" eaten={currentFat + scaled.fat} goal={goalFat} color={C.lime} />
          </View>

          <View style={s.statRow}>
            <StatCard
              icon="💪"
              label="Protein"
              value={`${scaled.protein}g`}
              color={C.purple}
              style={{ flex: 1 }}
            />
            <StatCard
              icon="🌾"
              label="Carbs"
              value={`${scaled.carbs}g`}
              color={C.accent}
              style={{ flex: 1 }}
            />
            <StatCard
              icon="🥑"
              label="Fat"
              value={`${scaled.fat}g`}
              color={C.lime}
              style={{ flex: 1 }}
            />
          </View>
          {scaled.fiber > 0 && (
            <View style={s.fiberRow}>
              <Ionicons name="leaf-outline" size={14} color={C.lime} />
              <Text style={s.fiberTxt}>Fiber: {scaled.fiber}g</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Coach note</Text>
          <Text style={s.sectionTitle}>How it fits your goal</Text>
          <Text style={s.fitText}>{fitText}</Text>
          {!!suggestions?.length && (
            <View style={s.tipList}>
              {suggestions.slice(0, 3).map((tip, index) => (
                <View key={`${tip}-${index}`} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipTxt}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.logBtn, saving && { opacity: 0.7 }]}
          onPress={onLog}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[C.purple, C.accent]} style={s.logGradient}>
            <Ionicons
              name={saving ? 'sync-outline' : 'add-circle-outline'}
              size={19}
              color="#fff"
            />
            <Text style={s.logTxt}>{saving ? 'Saving...' : `Add to ${mealLabel}`}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: C.sub, fontSize: 12, marginTop: 2 },
  scroll: { padding: 18, paddingBottom: 28 },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#31285C',
    padding: 18,
    marginBottom: 14,
  },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  foodName: { color: C.text, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  brand: { color: C.accent, fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  metaPill: {
    backgroundColor: '#231D46',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#382D68',
  },
  metaTxt: { color: C.sub, fontSize: 11, fontWeight: '700' },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 22, fontWeight: '900' },
  scoreLabel: { color: C.sub, fontSize: 10, fontWeight: '700' },
  heroBottom: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 18 },
  ringNum: { color: C.text, fontSize: 20, fontWeight: '900' },
  ringLbl: { color: C.sub, fontSize: 11, marginTop: 1 },
  heroStats: { flex: 1, gap: 10 },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 14,
  },
  sectionLabel: {
    color: C.sub,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  sectionSub: { color: C.dim, fontSize: 13, marginTop: 4 },
  portionControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },
  portionBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 120,
  },
  portionInput: {
    color: C.text,
    fontSize: 34,
    fontWeight: '900',
    minWidth: 80,
    textAlign: 'center',
  },
  portionUnit: { color: C.sub, fontSize: 16, marginLeft: 4 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  quickChipTxt: { color: C.sub, fontSize: 12, fontWeight: '700' },
  quickChipTxtActive: { color: '#fff' },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  mealChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  mealChipActive: { backgroundColor: C.lime, borderColor: C.lime },
  mealChipTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
  mealChipTxtActive: { color: '#101010' },
  macroWrap: { marginTop: 16 },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  fiberRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  fiberTxt: { color: C.lime, fontSize: 13, fontWeight: '700' },
  fitText: { color: C.accent, fontSize: 14, lineHeight: 21, marginTop: 10 },
  tipList: { gap: 10, marginTop: 14 },
  tipRow: { flexDirection: 'row', gap: 10 },
  tipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple, marginTop: 6 },
  tipTxt: { flex: 1, color: C.sub, fontSize: 13, lineHeight: 20 },
  logBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 6 },
  logGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  logTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
