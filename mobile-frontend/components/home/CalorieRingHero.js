/**
 * components/home/CalorieRingHero.js
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
const RING_SIZE    = 160; // Further reduced for small screen fit
const STROKE_WIDTH = 14;
const RADIUS       = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMF      = 2 * Math.PI * RADIUS;
const CX           = RING_SIZE / 2;
const CY           = RING_SIZE / 2;

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0F0B1E',
  card:    '#161230',
  border:  '#1E1A35',
  purple:  '#7C5CFC',
  lime:    '#C8F135',
  accent:  '#9D85F5',
  text:    '#FFFFFF',
  sub:     '#6B5F8A',
  protein: '#FF6B35',
  carbs:   '#378ADD',
  fat:     '#EF9F27',
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
  calorieGoal  = 2000,
  caloriesEaten = 0,
  protein       = { eaten: 0, goal: 150 },
  carbs         = { eaten: 0, goal: 250 },
  fat           = { eaten: 0, goal: 65 },
  name          = '',
  loading       = false,
}) {
  const pct          = calorieGoal > 0 ? Math.min(caloriesEaten / calorieGoal, 1) : 0;
  const calRemaining = Math.max(calorieGoal - caloriesEaten, 0);
  const targetOffset = CIRCUMF * (1 - pct);

  const offset = useSharedValue(CIRCUMF);

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

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.greetingPlaceholder} />
        <View style={s.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CX} cy={CY} r={RADIUS}
              stroke={C.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
          </Svg>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Text style={s.greeting}>{greetingFor(name)} 👋</Text>

      <View style={s.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={CX} cy={CY} r={RADIUS}
            stroke={C.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <G rotation="-90" origin={`${CX}, ${CY}`}>
            <AnimatedCircle
              cx={CX} cy={CY} r={RADIUS}
              stroke={C.lime}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMF}
              strokeLinecap="round"
              animatedProps={animatedProps}
            />
          </G>
        </Svg>

        <View style={s.center}>
          <Text style={s.calNum}>{calRemaining}</Text>
          <Text style={s.calLbl}>kcal left</Text>
        </View>
      </View>

      <View style={s.pillsRow}>
        <MacroPill label="Protein" eaten={protein.eaten} goal={protein.goal} color={C.protein} />
        <MacroPill label="Carbs"   eaten={carbs.eaten}   goal={carbs.goal}   color={C.carbs}   />
        <MacroPill label="Fat"     eaten={fat.eaten}     goal={fat.goal}     color={C.fat}     />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    width: '100%',            // ✅ important (was missing effect)
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },

  greeting: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },

  greetingPlaceholder: {
    width: 180,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.border,
    marginBottom: 20,
  },

  // 👇 THIS is the real fix
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,

    alignSelf: 'center',       // Properly center horizontally - no overflow
    maxWidth: '100%',          // Prevent ever going outside container bounds

    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },

  center: {
    position: 'absolute',
    alignItems: 'center',
  },

  calNum: {
    color: C.text,
    fontSize: 40, // Slightly reduced for perfect fit
    fontWeight: '900',
  },

  calLbl: {
    color: C.sub,
    fontSize: 13,
    marginTop: 2,
  },

  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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