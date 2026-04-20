import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppEvents, on } from '../lib/eventBus';

// How long the card stays visible before auto-dismissing
const AUTO_DISMISS_MS = 4000;

export default function CelebrationOverlay() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const timerRef = useRef(null);

  // Push to queue whenever events fire
  useEffect(() => {
    const unsubAch = on(AppEvents.ACHIEVEMENT_AWARDED, ({ awarded }) => {
      if (!awarded?.length) return;
      const cards = awarded.map((a) => ({
        type: 'achievement',
        icon: a.icon || a.achievement_id || 'trophy-outline',
        name: a.name || a.achievement || 'Achievement Unlocked',
        description: a.description || '',
        xp: a.xp_reward ?? 0,
      }));
      setQueue((q) => [...q, ...cards]);
    });

    const unsubStreak = on(AppEvents.STREAK_MILESTONE, ({ days, xp }) => {
      setQueue((q) => [
        ...q,
        {
          type: 'streak',
          days,
          xp: xp ?? 0,
        },
      ]);
    });

    return () => { unsubAch(); unsubStreak(); };
  }, []);

  // Pop next item from queue when idle
  useEffect(() => {
    if (current === null && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
    }
  }, [queue, current]);

  // Animate in/out when current changes
  useEffect(() => {
    if (current === null) return;

    opacity.setValue(0);
    scale.setValue(0.82);

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [current]);

  function dismiss() {
    clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 200, useNativeDriver: true }),
    ]).start(() => setCurrent(null));
  }

  if (current === null) return null;

  const isStreak = current.type === 'streak';

  return (
    <Pressable style={s.backdrop} onPress={dismiss}>
      <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
        {/* Top label */}
        <View style={[s.labelRow, isStreak && s.labelRowStreak]}>
          <Ionicons
            name={isStreak ? 'flame' : 'trophy'}
            size={13}
            color={isStreak ? '#FF9500' : '#C8F135'}
          />
          <Text style={[s.labelTxt, isStreak && { color: '#FF9500' }]}>
            {isStreak ? 'STREAK MILESTONE' : 'ACHIEVEMENT UNLOCKED'}
          </Text>
        </View>

        {/* Icon circle */}
        <View style={[s.iconCircle, isStreak && s.iconCircleStreak]}>
          {isStreak ? (
            <Text style={s.streakNum}>{current.days}</Text>
          ) : (
            <Ionicons
              name={current.icon || 'trophy-outline'}
              size={38}
              color="#7C5CFC"
            />
          )}
        </View>

        {isStreak ? (
          <>
            <Text style={s.mainTitle}>
              {current.days}-Day Streak!
            </Text>
            <Text style={s.subTxt}>
              {streakMessage(current.days)}
            </Text>
          </>
        ) : (
          <>
            <Text style={s.mainTitle}>{current.name}</Text>
            {current.description ? (
              <Text style={s.subTxt}>{current.description}</Text>
            ) : null}
          </>
        )}

        {/* XP pill */}
        {current.xp > 0 && (
          <View style={s.xpPill}>
            <Ionicons name="flash" size={12} color="#0F0B1E" />
            <Text style={s.xpTxt}>+{current.xp} XP</Text>
          </View>
        )}

        <Text style={s.dismissHint}>Tap anywhere to dismiss</Text>
      </Animated.View>
    </Pressable>
  );
}

function streakMessage(days) {
  if (days >= 30) return "One full month of showing up. That's elite.";
  if (days >= 14) return "Two weeks straight. Your consistency is building something real.";
  if (days >= 7) return "A full week without missing a day. Keep going!";
  if (days >= 3) return "Three days in a row — momentum is building!";
  return "You're on a roll. Don't stop now!";
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    width: '82%',
    backgroundColor: '#1A1535',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#2D2850',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C8F13520',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  labelRowStreak: { backgroundColor: '#FF950020' },
  labelTxt: {
    color: '#C8F135',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C5CFC18',
    borderWidth: 2,
    borderColor: '#7C5CFC50',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  iconCircleStreak: {
    backgroundColor: '#FF950018',
    borderColor: '#FF950050',
  },
  streakNum: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF9500',
    letterSpacing: -1,
  },
  mainTitle: {
    color: '#F4F0FF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subTxt: {
    color: '#8B82AD',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C8F135',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  xpTxt: {
    color: '#0F0B1E',
    fontSize: 14,
    fontWeight: '900',
  },
  dismissHint: {
    color: '#3D3560',
    fontSize: 11,
    marginTop: 4,
  },
});
