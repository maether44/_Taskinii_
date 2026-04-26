import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

/**
 * RingProgress
 * Props:
 *   size       number  — diameter in px (default 80)
 *   stroke     number  — border width (default 8)
 *   progress   number  — 0.0 to 1.0
 *   color      string  — ring color
 *   children   node    — center content
 *   animated   bool    — animate on mount (default true)
 */
export default function RingProgress({
  size = 80,
  stroke = 8,
  progress = 0,
  color = "#7C5CFC",
  children,
  animated = true,
}) {
  const anim = useRef(new Animated.Value(animated ? 0 : progress)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.timing(anim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const pct = animated ? progress : progress;
  const clamp = Math.min(Math.max(pct, 0), 1);

  // Approximate arc using border trick
  const right = clamp > 0.75 ? color : "transparent";
  const bottom = clamp > 0.5 ? color : "transparent";
  const left = clamp > 0.25 ? color : "transparent";

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Track */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: color + "20",
        }}
      />
      {/* Fill arc */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderTopColor: color,
          borderRightColor: right,
          borderBottomColor: bottom,
          borderLeftColor: left,
          transform: [{ rotate: "-90deg" }],
        }}
      />
      {/* Center */}
      {children}
    </View>
  );
}
