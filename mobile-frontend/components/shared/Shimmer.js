/**
 * components/shared/Shimmer.js
 * Skeleton loading components.
 *
 * Usage:
 *   <Shimmer width={120} height={20} radius={8} />   — bare block
 *   <Shimmer.Card rows={3} />                         — card with N rows
 */
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const BASE = "#1E1A35";
const SHINE = "#2A2550";

// ── Single shimmer block ──────────────────────────────────────
function ShimmerBlock({ width = "100%", height = 16, radius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: SHINE,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Shimmer.Card ──────────────────────────────────────────────
function ShimmerCard({ rows = 3, style }) {
  const widths = ["60%", "90%", "75%", "85%", "50%", "80%"];

  return (
    <View style={[s.card, style]}>
      {/* Header line */}
      <ShimmerBlock width="45%" height={14} radius={7} style={{ marginBottom: 12 }} />
      {/* Row lines */}
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerBlock
          key={i}
          width={widths[i % widths.length]}
          height={11}
          radius={6}
          style={{ marginBottom: i < rows - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

ShimmerBlock.Card = ShimmerCard;

export default ShimmerBlock;

const s = StyleSheet.create({
  card: {
    backgroundColor: BASE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E1A35",
  },
});
