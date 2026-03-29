import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, StyleSheet,
  TouchableOpacity, View, Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SIZE      = 78;   // mascot image size
const GLOW_MID  = SIZE + 16;
const GLOW_OUT  = SIZE + 36;

// Drawn fallback — shown if PNG is missing/empty
function YaraFallback() {
  return (
    <View style={styles.fallback}>
      {/* Outer flame ring */}
      <View style={styles.flameRing} />
      {/* Face */}
      <View style={styles.faceOuter}>
        <View style={styles.faceInner}>
          {/* Eyes */}
          <View style={styles.eyeRow}>
            <View style={styles.eye}><View style={styles.pupil} /></View>
            <View style={styles.eye}><View style={styles.pupil} /></View>
          </View>
          {/* Mouth */}
          <View style={styles.mouth} />
        </View>
      </View>
    </View>
  );
}

export default function YaraToggle() {
  const navigation = useNavigation();
  const [imgError, setImgError] = useState(false);

  // ── Animation values ────────────────────────────────────────
  const bobAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Vertical bob — smooth sine-like float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Breathing scale — subtle inhale / exhale
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── Glow pulses in sync with the breathing ──────────────────
  const glowOpacityOuter = scaleAnim.interpolate({
    inputRange: [1, 1.08],
    outputRange: [0.18, 0.42],
  });
  const glowOpacityMid = scaleAnim.interpolate({
    inputRange: [1, 1.08],
    outputRange: [0.28, 0.60],
  });
  const glowScaleOuter = scaleAnim.interpolate({
    inputRange: [1, 1.08],
    outputRange: [1, 1.18],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [
            { translateY: bobAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* ── Outer glow halo ────────────────────────────────── */}
      <Animated.View
        style={[
          styles.glowOuter,
          {
            opacity: glowOpacityOuter,
            transform: [{ scale: glowScaleOuter }],
          },
        ]}
      />

      {/* ── Inner glow halo ────────────────────────────────── */}
      <Animated.View
        style={[styles.glowMid, { opacity: glowOpacityMid }]}
      />

      {/* ── Core glow (always-on dim ring) ─────────────────── */}
      <View style={styles.glowCore} />

      {/* ── Mascot image + tap ─────────────────────────────── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('YaraAssistant')}
        activeOpacity={0.85}
        style={styles.touchable}
      >
        {imgError ? (
          <YaraFallback />
        ) : (
          <View style={styles.imageClip}>
            <Image
              source={require('../assets/yara_spirit.png')}
              style={styles.mascot}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 104,
    right: 18,
    width:  GLOW_OUT,
    height: GLOW_OUT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },

  // Three-layer glow stack — all centred on the same point
  glowOuter: {
    position: 'absolute',
    width:  GLOW_OUT,
    height: GLOW_OUT,
    borderRadius: GLOW_OUT / 2,
    backgroundColor: 'rgba(200,241,53,0.08)',
    // iOS shadow gives the actual bloom on light surfaces
    shadowColor: '#C8F135',
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  glowMid: {
    position: 'absolute',
    width:  GLOW_MID,
    height: GLOW_MID,
    borderRadius: GLOW_MID / 2,
    backgroundColor: 'rgba(200,241,53,0.14)',
    shadowColor: '#C8F135',
    shadowOpacity: 0.85,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  glowCore: {
    position: 'absolute',
    width:  SIZE + 4,
    height: SIZE + 4,
    borderRadius: (SIZE + 4) / 2,
    backgroundColor: 'rgba(200,241,53,0.20)',
    shadowColor: '#C8F135',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  touchable: {
    width:  SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageClip: {
    width:        SIZE,
    height:       SIZE,
    borderRadius: SIZE / 2,
    overflow:     'hidden',
  },
  mascot: {
    width:  SIZE,
    height: SIZE,
  },

  // ── Drawn fallback (shown when PNG is missing) ──────────────
  fallback: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  flameRing: {
    position: 'absolute',
    width: SIZE, height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(124,92,252,0.55)',
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  faceOuter: {
    width: SIZE * 0.68, height: SIZE * 0.68,
    borderRadius: SIZE * 0.34,
    backgroundColor: '#C8F135',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8F135', shadowOpacity: 0.8, shadowRadius: 12,
  },
  faceInner: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  eyeRow: {
    flexDirection: 'row', gap: 8,
  },
  eye: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pupil: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#1a1a1a',
  },
  mouth: {
    width: 10, height: 5,
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    backgroundColor: '#3d8c00',
  },
});
