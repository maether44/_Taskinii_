import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ style }) {
  const { isDark, toggleTheme, colors } = useTheme();
  const slide = useRef(new Animated.Value(isDark ? 0 : 1)).current;
  const rotate = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: isDark ? 0 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
      Animated.timing(rotate, { toValue: isDark ? 0 : 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  const knobTranslate = slide.interpolate({ inputRange: [0, 1], outputRange: [2, 24] });
  const iconSpin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  const trackBg = isDark ? "rgba(124,92,252,0.25)" : "rgba(124,92,252,0.15)";
  const knobBg = isDark ? "#7C5CFC" : "#F5A623";

  return (
    <Pressable
      onPress={toggleTheme}
      style={[styles.track, { backgroundColor: trackBg, borderColor: colors.borderMid }, style]}
      accessibilityRole="switch"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Moon (left) */}
      <Ionicons
        name="moon"
        size={11}
        color={isDark ? "#C8F135" : colors.borderMid}
        style={styles.leftIcon}
      />
      {/* Sun (right) */}
      <Ionicons
        name="sunny"
        size={12}
        color={isDark ? colors.borderMid : "#F5A623"}
        style={styles.rightIcon}
      />
      {/* Animated knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: knobBg,
            transform: [{ translateX: knobTranslate }, { rotate: iconSpin }],
          },
        ]}
      >
        <Ionicons name={isDark ? "moon" : "sunny"} size={10} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  leftIcon: { position: "absolute", left: 6 },
  rightIcon: { position: "absolute", right: 5 },
  knob: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    left: 0,
  },
});
