/**
 * mobile-frontend/screens/InsightDetail.js
 *
 * Friendly + analytical AI coach style
 * Data-driven but human, encouraging, and clear
 */

import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FS } from '../constants/typography';

export default function InsightDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { insight } = route.params;

  const data = insight?.data || {};

  const getDetailedExplanation = () => {
    const tag = insight.tag;

    switch (tag) {

      case 'Performance': {
        const intensity = data.avgIntensity ?? 6;
        const trend = data.trend ?? 'stable';

        let message = "";

        if (intensity >= 7) {
          message = `
I’m seeing that you’re training at a pretty high intensity right now 💪

That’s great for progress — your body is definitely getting a strong stimulus.

What this means:
You’re in a zone where gains are very possible, as long as you recover properly 🧠

What I’d suggest:
Keep this intensity, but don’t be afraid to slightly reduce volume if you start feeling drained. Recovery will decide your results here 🔥
          `;
        } else {
          message = `
Your training intensity is currently moderate 🙂

This is actually a really solid place to build consistency from.

What this means:
You’re not under-training, but you still have room to push a bit more for faster progress 💡

What I’d suggest:
Try increasing weight or effort slightly in your next sessions — even a small bump will help you progress faster 💪✨
          `;
        }

        return message;
      }

      case 'Recovery': {
        const sleep = data.avgSleep ?? 6.5;
        const fatigue = data.fatigue ?? 'medium';

        if (sleep < 6.5) {
          return `
I’m noticing your sleep has been a bit low lately 😴

What this means:
Your body is probably not fully recovering between sessions, which can slow progress even if you’re training hard.

What I’d suggest:
Try pushing your sleep closer to 7–8 hours. Even +45 minutes can make a big difference in energy and results 🧠✨

Also, keep intense workouts slightly lighter until your sleep improves 💪
          `;
        }

        return `
Your recovery looks pretty solid right now 😌

What this means:
Your body is adapting well and you’re in a good position to keep progressing steadily.

What I’d suggest:
Keep your sleep consistent and add light movement (like walking or stretching) on rest days 🚶‍♂️

If fatigue ever increases, don’t ignore it — small adjustments keep progress smooth 🔥
        `;
      }

      case 'Nutrition': {
        const protein = data.protein ?? 0;
        const calories = data.calories ?? 2000;

        if (protein < 100) {
          return `
Your protein intake looks a bit low for your goals 🍗

What this means:
Your recovery and muscle growth might be slower than your training effort deserves.

What I’d suggest:
Try adding more protein sources like eggs, chicken, yogurt, or tuna. Even small increases daily will stack up over time 💪✨
          `;
        }

        return `
Your nutrition looks pretty balanced overall 🍽️

What this means:
You’re giving your body the fuel it needs to recover and perform well.

What I’d suggest:
Keep your protein consistent and try timing meals closer to workouts for even better recovery 🔥

You’re doing better than you think — this consistency matters a lot 💪
        `;
      }

      case 'Optimization': {
        return `
Your daily habits are actually in a really good place right now 😄

What this means:
You’ve already built a solid routine — now we’re talking about small upgrades, not big changes.

What I’d suggest:
Try simple things like walking after meals 🚶‍♂️
Drink water early in the morning 💧
And give yourself a bit of screen-free time before sleep 📵

These tiny habits compound way more than people expect ✨
        `;
      }

      case 'Prediction': {
        const adherence = data.adherence ?? 80;

        if (adherence > 85) {
          return `
You’re on a really strong consistency path right now 🔥

What this means:
If you keep this up, your results will definitely show — your habits are aligned with your goals.

What I’d suggest:
Stay steady. Don’t overthink or constantly change things — consistency is your advantage right now 💪✨
          `;
        }

        return `
You’re doing okay, but consistency is what will unlock faster progress 🧠

What this means:
You’re putting in effort, but the gaps in consistency are slowing results a bit.

What I’d suggest:
Try to reduce missed sessions and keep your weekly routine tighter. Even 1–2 more consistent weeks will make a noticeable difference 🔥
        `;
      }

      default:
        return `
I looked at your data for this insight 💡

You’re building patterns that are worth tracking closely.

Keep logging consistently — the more data I have, the more accurate and personal my feedback becomes ✨
        `;
    }
  };

  return (
    <View style={st.root}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>{insight.title}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        <View style={[st.insightBanner, { borderLeftColor: insight.color }]}>
          <Text style={st.insightIcon}>{insight.icon}</Text>
          <View style={st.insightMeta}>
            <Text style={[st.insightTag, { color: insight.color }]}>
              {insight.tag}
            </Text>
            <Text style={st.insightTitle}>{insight.title}</Text>
          </View>
        </View>

        <View style={st.card}>
          <Text style={st.insightSummary}>{insight.text}</Text>
        </View>

        <View style={st.card}>
          <Text style={st.detailedText}>
            {getDetailedExplanation()}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241C40' },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1432',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: { flex: 1, alignItems: 'center' },

  headerTitle: {
    color: '#fff',
    fontSize: FS.btnPrimary,
    fontWeight: '700',
  },

  insightBanner: {
    backgroundColor: '#1A1432',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3D2F7A',
    borderLeftWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  insightIcon: { fontSize: 34 },

  insightMeta: { flex: 1 },

  insightTag: {
    fontSize: FS.label,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },

  insightTitle: {
    color: '#fff',
    fontSize: FS.screenTitle,
    fontWeight: '800',
  },

  card: {
    backgroundColor: '#1A1432',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3D2F7A',
  },

  insightSummary: {
    color: '#fff',
    fontSize: FS.body,
    lineHeight: 22,
    fontWeight: '500',
  },

  detailedText: {
    color: '#C8BFEE',
    fontSize: FS.body,
    lineHeight: 22,
  },
});