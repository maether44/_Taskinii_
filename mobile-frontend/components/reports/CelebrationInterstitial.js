/**
 * Full-screen Duolingo-style celebration interstitial.
 * Intercepts the user when a streak milestone is reached.
 * Two actions: "Claim Report" or "Skip for now".
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MILESTONE_META = {
  weekly:    { emoji: '🔥', title: '7-Day Streak!',    sub: 'Weekly Report Unlocked',    color: '#CDF27E', streak: 7 },
  monthly:   { emoji: '⭐', title: '30-Day Streak!',   sub: 'Monthly Report Unlocked',   color: '#FF9500', streak: 30 },
  quarterly: { emoji: '🏆', title: '90-Day Streak!',   sub: 'Quarterly Report Unlocked', color: '#A38DF2', streak: 90 },
  biannual:  { emoji: '💎', title: '180-Day Streak!',  sub: '6-Month Report Unlocked',   color: '#6F4BF2', streak: 180 },
  yearly:    { emoji: '👑', title: '365-Day Streak!',  sub: 'Yearly Report Unlocked',    color: '#7C5CFC', streak: 365 },
};

function ConfettiDot({ delay, startX, color }) {
  const fall = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fall, {
          toValue: SCREEN_H + 40,
          duration: 2800 + Math.random() * 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 3000,
          delay: 1500,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sway, { toValue: 15, duration: 400, useNativeDriver: true }),
            Animated.timing(sway, { toValue: -15, duration: 400, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[
      st.confetti,
      {
        left: startX,
        backgroundColor: color,
        transform: [{ translateY: fall }, { translateX: sway }],
        opacity,
      },
    ]} />
  );
}

const CONFETTI_COLORS = ['#CDF27E', '#6F4BF2', '#FF9500', '#A38DF2', '#7C5CFC', '#FF6464', '#34C759'];

export default function CelebrationInterstitial({ visible, milestone, onClaim, onSkip }) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  const meta = milestone ? MILESTONE_META[milestone.milestone_type] : null;

  useEffect(() => {
    if (visible && meta) {
      scaleAnim.setValue(0.3);
      fadeAnim.setValue(0);
      emojiScale.setValue(0);
      btnFade.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.spring(emojiScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(btnFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, meta]);

  if (!meta) return null;

  const confettiDots = Array.from({ length: 30 }).map((_, i) => (
    <ConfettiDot
      key={i}
      delay={i * 80}
      startX={Math.random() * SCREEN_W}
      color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
    />
  ));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={st.backdrop}>
        {/* Confetti layer */}
        <View style={st.confettiLayer}>{confettiDots}</View>

        <Animated.View style={[st.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Glowing ring */}
          <View style={[st.glowRing, { borderColor: meta.color }]}>
            <Animated.Text style={[st.emoji, { transform: [{ scale: emojiScale }] }]}>
              {meta.emoji}
            </Animated.Text>
          </View>

          <Text style={st.title}>{meta.title}</Text>
          <Text style={[st.sub, { color: meta.color }]}>{meta.sub}</Text>

          <View style={st.streakBadge}>
            <Text style={st.streakText}>{meta.streak} days of consistency</Text>
          </View>

          <Text style={st.desc}>
            Your dedication has earned you a personalized{'\n'}
            performance report from Yara.
          </Text>

          <Animated.View style={[st.btnGroup, { opacity: btnFade }]}>
            <TouchableOpacity
              style={[st.claimBtn, { backgroundColor: meta.color }]}
              onPress={onClaim}
              activeOpacity={0.8}
            >
              <Text style={st.claimText}>Claim Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.skipBtn} onPress={onSkip} activeOpacity={0.7}>
              <Text style={st.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 11, 30, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -20,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    width: SCREEN_W - 48,
    backgroundColor: '#1A1432',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#3D2F7A',
  },
  glowRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(111, 75, 242, 0.15)',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  streakBadge: {
    backgroundColor: 'rgba(111, 75, 242, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#6F4BF2',
    marginBottom: 16,
  },
  streakText: {
    color: '#A38DF2',
    fontSize: 12,
    fontWeight: '700',
  },
  desc: {
    color: '#7A6AAA',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  btnGroup: {
    width: '100%',
    gap: 12,
  },
  claimBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimText: {
    color: '#0F0B1E',
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: '#7A6AAA',
    fontSize: 13,
    fontWeight: '600',
  },
});
