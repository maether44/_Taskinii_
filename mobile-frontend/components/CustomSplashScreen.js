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
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");

export default function CustomSplashScreen({ onDone }) {
  const mascotY       = useRef(new Animated.Value(-80)).current;
  const mascotScale   = useRef(new Animated.Value(0.7)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardY         = useRef(new Animated.Value(14)).current;
  const glowPulse     = useRef(new Animated.Value(1)).current;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    // Glow breathes
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.12, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 1.0,  duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Mascot drops in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(mascotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(mascotY,     { toValue: 0, friction: 5, tension: 70, useNativeDriver: true }),
        Animated.spring(mascotScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]).start();
    }, 100);

    // Card slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 1000);

    // Progress bar
    setTimeout(() => {
      const DURATION = 2800;
      let startTime = null;
      let rafId;
      function animate(ts) {
        if (!startTime) startTime = ts;
        const t = Math.min((ts - startTime) / DURATION, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setPct(Math.round(ease * 100));
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

      {/* ── Purple atmospheric glow ABOVE logo ── */}
      <Animated.View style={[s.glowTop, { transform: [{ scale: glowPulse }] }]} />

      {/* ── Lime atmospheric glow BELOW logo ── */}
      <Animated.View style={[s.glowBottom, { transform: [{ scale: glowPulse }] }]} />

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

        {/* Card */}
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

          {/* Purple → lime gradient bar */}
          <View style={s.barTrack}>
            <View style={[s.barFillWrap, { width: `${pct}%` }]}>
              <LinearGradient
                colors={["#6c3fd4", "#c8ff1e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.barGradient}
              />
            </View>
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

  // Purple halo — sits above/behind the logo
  glowTop: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "transparent",
    top: H * 0.18,
    left: W * 0.5 - 170,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 80,
    elevation: 0,
  },

  // Lime halo — sits below the logo, above the card
  glowBottom: {
    position: "absolute",
    width: 260,
    height: 60,
    borderRadius: 130,
    backgroundColor: "transparent",
    top: H * 0.52,
    left: W * 0.5 - 130,
    shadowColor: "#c8ff1e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 0,
  },

  scene: {
    zIndex: 10,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 28,
  },

  mascotWrap: { marginBottom: 40 },
  mascotImg:  { width: 264, height: 264 },

  card: {
    width: "100%",
    backgroundColor: "#16112a",
    borderWidth: 1,
    borderColor: "rgba(108,63,212,0.22)",
    borderRadius: 22,
    padding: 20,
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
  headLeft: { flexDirection: "row", alignItems: "center" },
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
  barFillWrap: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  barGradient: { flex: 1 },

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