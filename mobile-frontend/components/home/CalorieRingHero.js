/**
 * components/home/CalorieRingHero.js
 *
 * Animated SVG calorie ring with greeting + macro pills.
 * Colors: only values already present in Home.js (C object) and
 * src/theme/tokens.ts macro colours.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

// ─── Ring geometry ───────────────────────────────────────────────────────────
const RING_SIZE = 200;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2; // 93
const CIRCUMF = 2 * Math.PI * RADIUS; // ≈ 584.34
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;

// ─── Colors — taken verbatim from Home.js C object + tokens.ts macros ───────
const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#6B5F8A',
  // macro — from src/theme/tokens.ts (user-specified)
  protein: '#FF6B35',
  carbs: '#378ADD',
  fat: '#EF9F27',
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Greeting helper ─────────────────────────────────────────────────────────
function greetingFor(name) {
  const h = new Date().getHours();
  const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${period}${name ? `, ${name}` : ''}`;
}

// ─── MacroPill ───────────────────────────────────────────────────────────────
function MacroPill({ label, eaten, goal, color }) {
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  return (
    <View style={p.pill}>
      <View style={p.pillTop}>
        <View style={[p.dot, { backgroundColor: color }]} />
        <Text style={p.pillLabel}>{label}</Text>
      </View>
      <Text style={p.pillValues}>
        <Text style={[p.pillEaten, { color }]}>{eaten}</Text>
        <Text style={p.pillGoal}>/{goal}g</Text>
      </Text>
      <View style={p.barBg}>
        <View style={[p.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── CalorieRingHero ─────────────────────────────────────────────────────────
export default function CalorieRingHero({
  calorieGoal = 2000,
  caloriesEaten = 0,
  protein = { eaten: 0, goal: 150 },
  carbs = { eaten: 0, goal: 250 },
  fat = { eaten: 0, goal: 65 },
  name = '',
  loading = false,
}) {
  const pct = calorieGoal > 0 ? Math.min(caloriesEaten / calorieGoal, 1) : 0;
  const calRemaining = Math.max(calorieGoal - caloriesEaten, 0);
  const targetOffset = CIRCUMF * (1 - pct);

  const offset = useSharedValue(CIRCUMF); // start fully empty

  useEffect(() => {
    if (!loading) {
      offset.value = withTiming(targetOffset, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [loading, targetOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  // ── Skeleton while loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.greetingPlaceholder} />
        <View style={s.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke={C.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
          </Svg>
          <View style={s.center}>
            <View style={s.numPlaceholder} />
            <View style={s.lblPlaceholder} />
          </View>
        </View>
        <View style={s.pillsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[p.pill, { opacity: 0.35 }]}>
              <View style={p.pillTop}>
                <View style={[p.dot, { backgroundColor: C.border }]} />
                <View
                  style={{ width: 38, height: 8, borderRadius: 4, backgroundColor: C.border }}
                />
              </View>
              <View
                style={{
                  width: 52,
                  height: 10,
                  borderRadius: 4,
                  backgroundColor: C.border,
                  marginTop: 4,
                }}
              />
              <View style={[p.barBg, { marginTop: 6 }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Greeting */}
      <Text style={s.greeting}>{greetingFor(name)} 👋</Text>

      {/* Animated ring */}
      <View style={s.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke={C.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress — rotated so arc starts at 12 o'clock */}
          <G rotation="-90" origin={`${CX}, ${CY}`}>
            <AnimatedCircle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke={C.lime}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMF}
              strokeLinecap="round"
              animatedProps={animatedProps}
            />
          </G>
        </Svg>

        {/* Center label */}
        <View style={s.center}>
          <Text style={s.calNum}>{calRemaining}</Text>
          <Text style={s.calLbl}>kcal left</Text>
        </View>
      </View>

      {/* Macro pills */}
      <View style={s.pillsRow}>
        <MacroPill label="Protein" eaten={protein.eaten} goal={protein.goal} color={C.protein} />
        <MacroPill label="Carbs" eaten={carbs.eaten} goal={carbs.goal} color={C.carbs} />
        <MacroPill label="Fat" eaten={fat.eaten} goal={fat.goal} color={C.fat} />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  greeting: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  greetingPlaceholder: {
    width: 180,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.border,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },

  // Ring
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  calNum: {
    color: C.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 50,
  },
  calLbl: {
    color: C.sub,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  numPlaceholder: {
    width: 80,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.border,
  },
  lblPlaceholder: {
    width: 56,
    height: 12,
    borderRadius: 4,
    backgroundColor: C.border,
    marginTop: 6,
  },

  // Pills row
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});

const p = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillLabel: {
    color: C.sub,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pillValues: {
    marginBottom: 6,
  },
  pillEaten: {
    fontSize: 16,
    fontWeight: '800',
  },
  pillGoal: {
    color: C.sub,
    fontSize: 11,
    fontWeight: '500',
  },
  barBg: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
});
