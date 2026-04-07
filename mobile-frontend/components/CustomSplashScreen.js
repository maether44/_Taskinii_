import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

const { width: W, height: H } = Dimensions.get("window");

export default function CustomSplashScreen({ onDone }) {
  // Mascot
  const mascotY       = useRef(new Animated.Value(-80)).current;
  const mascotScale   = useRef(new Animated.Value(0.7)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;

  // Shadow under mascot
  const shadowScaleX  = useRef(new Animated.Value(0.3)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;

  // Card
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(14)).current;

  // Glow pulse
  const glowScale = useRef(new Animated.Value(1)).current;

  // Progress
  const [pct, setPct] = useState(0);

  useEffect(() => {
    // Purple glow breathes
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // t=100ms: mascot drops and bounces in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(mascotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(mascotY,     { toValue: 0, friction: 5, tension: 70, useNativeDriver: true }),
        Animated.spring(mascotScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        Animated.timing(shadowOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
        Animated.spring(shadowScaleX,  { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 100);

    // t=1000ms: card slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 1000);

    // t=1200ms: progress bar animates
    setTimeout(() => {
      const DURATION = 2800;
      let startTime = null;
      let rafId;

      function animate(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const t = Math.min(elapsed / DURATION, 1);
        // ease out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        const p = Math.round(ease * 100);
        setPct(p);

        if (t < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setPct(100);
          setTimeout(() => onDone?.(), 600);
        }
      }

      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    }, 1200);
  }, []);

  return (
    <View style={s.root}>
      {/* Purple glow top */}
      <Animated.View style={[s.glowPurple, { transform: [{ scale: glowScale }] }]} />
      {/* Lime glow bottom */}
      <Animated.View style={[s.glowLime, { transform: [{ scale: glowScale }] }]} />

      <View style={s.scene}>

        {/* Mascot */}
        <Animated.View style={[s.mascotWrap, {
          opacity: mascotOpacity,
          transform: [{ translateY: mascotY }, { scale: mascotScale }],
        }]}>
          <Image
            source={require("../assets/BodyQ_Logo.png")}
            style={s.mascotImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Lime ground shadow */}
        <Animated.View style={[s.groundShadow, {
          opacity: shadowOpacity,
          transform: [{ scaleX: shadowScaleX }],
        }]} />

        {/* Card — just header + bar */}
        <Animated.View style={[s.card, {
          opacity: cardOpacity,
          transform: [{ translateY: cardY }],
        }]}>
          <View style={s.cardHead}>
            <View style={s.headLeft}>
              <View style={s.pulseDot} />
              <Text style={s.cardLabel}>Starting up</Text>
            </View>
            <View style={s.pctPill}>
              <Text style={s.pctText}>{pct}%</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
        </Animated.View>

      </View>

      <Text style={s.version}>BodyQ · v2.0.0</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: W,
    height: H,
    backgroundColor: "#0b0916",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowPurple: {
    position: "absolute",
    width: 300, height: 300, borderRadius: 150,
    top: H * 0.05, left: W * 0.5 - 150,
    shadowColor: "#6c3fd4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 90,
  },
  glowLime: {
    position: "absolute",
    width: 200, height: 200, borderRadius: 100,
    bottom: -30, left: W * 0.5 - 100,
    shadowColor: "#c8ff1e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 60,
  },
  scene: {
    zIndex: 10,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 28,
  },
  mascotWrap: { marginBottom: 2 },
  mascotImg:  { width: 270, height: 270 },
  groundShadow: {
    width: 140, height: 14, borderRadius: 999,
    backgroundColor: "rgba(200,255,30,0.18)",
    marginTop: -6, marginBottom: 32,
  },

  // Card
  card: {
    width: "100%",
    backgroundColor: "#16112a",
    borderWidth: 1,
    borderColor: "rgba(108,63,212,0.22)",
    borderRadius: 22,
    padding: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseDot: {
    width: 7, height: 7, borderRadius: 999,
    backgroundColor: "#c8ff1e",
    marginRight: 8,
    shadowColor: "#c8ff1e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6,
  },
  cardLabel: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.22)",
  },
  pctPill: {
    backgroundColor: "rgba(200,255,30,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,255,30,0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    minWidth: 52,
    alignItems: "center",
  },
  pctText: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
    color: "#c8ff1e",
    fontWeight: "800",
  },
  barTrack: {
    height: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#c8ff1e",
    shadowColor: "#c8ff1e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  version: {
    position: "absolute",
    bottom: 20,
    fontFamily: "Outfit-Regular",
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.07)",
    textTransform: "uppercase",
  },
});