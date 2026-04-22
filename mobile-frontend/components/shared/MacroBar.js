import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

/**
 * MacroBar
 * Props:
 *   label    string  — e.g. "Protein"
 *   eaten    number  — grams consumed
 *   goal     number  — grams target
 *   color    string  — bar fill color
 *   showGoal bool    — show "x / y g" (default true)
 *   trigger  any     — when this changes, animation replays
 */
export default function MacroBar({ label, eaten, goal, color, showGoal = true, trigger }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.min(eaten / (goal || 1), 1);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct, trigger]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const over = eaten > goal;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showGoal && (
          <Text style={[styles.value, over && styles.valueOver]}>
            <Text style={{ color }}>{eaten}g</Text>
            <Text style={styles.valueSub}> / {goal}g</Text>
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width, backgroundColor: over ? '#FF6B6B' : color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: { color: '#9D85F5', fontSize: 12, fontWeight: '600' },
  value: { fontSize: 12, fontWeight: '700', color: '#fff' },
  valueOver: { color: '#FF6B6B' },
  valueSub: { color: '#6B5F8A', fontWeight: '400' },
  track: {
    height: 6,
    backgroundColor: '#251E42',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3 },
});
