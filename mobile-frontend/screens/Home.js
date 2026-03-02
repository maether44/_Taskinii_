// screens/Home.js — with registerTourRef added to each spotlighted element
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MacroBar from "../components/MacroBar";
import RingProgress from "../components/RingProgress";
import { registerTourRef } from "../components/tourRefs";
import {
  CALORIE_TARGET,
  MACROS,
  RECOVERY,
  TODAY,
  USER,
  WATER_TARGET_ML,
  WEEK,
} from "../data/mockUser";

import { supabase } from "../services/supabase";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",
  text: "#FFFFFF",
  sub: "#6B5F8A",
  green: "#34C759",
  orange: "#FF9500",
  red: "#FF3B30",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home({ navigation }) {
  const [waterMl, setWaterMl] = useState(TODAY.water.ml);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [userName, setUserName] = useState("");
  const [animTrigger, setAnimTrigger] = useState(0);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setAnimTrigger((prev) => prev + 1);
    }, []),
  );

  useEffect(() => {
    async function fetchUserName() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile username:", error);
        }

        const metadataName =
          user.user_metadata?.full_name || user.user_metadata?.username;
        const resolvedName = data?.username || metadataName || USER.name;
        setUserName(resolvedName);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }

    fetchUserName();
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const calEaten = TODAY.calories.eaten;
  const calBurned = TODAY.calories.burned + (workoutDone ? 320 : 0);
  const calRemaining = Math.max(CALORIE_TARGET - calEaten + calBurned, 0);
  const calPct = Math.min(calEaten / CALORIE_TARGET, 1);
  const waterPct = Math.min(waterMl / WATER_TARGET_ML, 1);
  const waterGlasses = Math.round(waterMl / 250);

  const recoveryColor =
    RECOVERY.score >= 67 ? C.green : RECOVERY.score >= 34 ? C.orange : C.red;

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.name}>{userName || "User"} 👋</Text>
          </View>
          <TouchableOpacity
            style={s.avatar}
            onPress={() => navigation.navigate("Profile")}
          >
            <Text style={s.avatarText}>
              {(userName?.[0] || "U").toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.date}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {/* ── CALORIES — spotlight: home_calories ── */}
        <View
          ref={(r) => registerTourRef("home_calories", r)}
          collapsable={false}
          style={s.card}
        >
          <Text style={s.cardLabel}>CALORIES</Text>
          <View style={s.calorieRow}>
            <RingProgress
              size={120}
              stroke={10}
              progress={calPct}
              color={C.lime}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={s.ringNum}>{calEaten}</Text>
                <Text style={s.ringLbl}>eaten</Text>
              </View>
            </RingProgress>
            <View style={s.calSide}>
              <View style={s.calStat}>
                <Text style={s.calStatNum}>{CALORIE_TARGET}</Text>
                <Text style={s.calStatLbl}>🎯 goal</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text style={s.calStatNum}>{calBurned}</Text>
                <Text style={s.calStatLbl}>🔥 burned</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text
                  style={[
                    s.calStatNum,
                    { color: calRemaining > 0 ? C.lime : C.red },
                  ]}
                >
                  {calRemaining}
                </Text>
                <Text style={s.calStatLbl}>remaining</Text>
              </View>
            </View>
          </View>
          <View style={s.macros}>
            <MacroBar
              label="Protein"
              eaten={TODAY.protein.eaten}
              goal={MACROS.protein}
              color={C.purple}
              trigger={animTrigger}
            />
            <MacroBar
              label="Carbs"
              eaten={TODAY.carbs.eaten}
              goal={MACROS.carbs}
              color={C.accent}
              trigger={animTrigger}
            />
            <MacroBar
              label="Fat"
              eaten={TODAY.fat.eaten}
              goal={MACROS.fat}
              color={C.lime}
              trigger={animTrigger}
            />
          </View>
          <TouchableOpacity
            style={s.logMealBtn}
            onPress={() =>
              navigation.navigate("MealLogger", {
                mealSlot: { label: "Lunch", icon: "☀️" },
              })
            }
          >
            <Text style={s.logMealTxt}>+ Log a Meal</Text>
          </TouchableOpacity>
        </View>

        {/* ── TODAY'S WORKOUT — spotlight: home_workout ── */}
        <View
          ref={(r) => registerTourRef("home_workout", r)}
          collapsable={false}
          style={s.card}
        >
          <Text style={s.cardLabel}>{"TODAY'S WORKOUT"}</Text>
          <View style={s.workoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.workoutName}>Upper Body Strength</Text>
              <Text style={s.workoutMeta}>
                45 min · 5 exercises · ~380 kcal
              </Text>
              {workoutDone && (
                <View style={s.workoutDonePill}>
                  <Text style={s.workoutDoneTxt}>✓ Completed</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[s.startBtn, workoutDone && s.startBtnDone]}
              onPress={() => {
                if (!workoutDone)
                  navigation.navigate("WorkoutActive", {
                    workout: {
                      name: "Upper Body Strength",
                      estimatedCalories: 380,
                      exercises: [
                        { id: "bench_press", sets: 3, reps: 10, restSec: 90 },
                        { id: "row", sets: 3, reps: 12, restSec: 60 },
                        { id: "ohp", sets: 3, reps: 10, restSec: 60 },
                        { id: "bicep_curl", sets: 3, reps: 15, restSec: 45 },
                        { id: "tricep_push", sets: 3, reps: 15, restSec: 45 },
                      ],
                    },
                  });
              }}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnTxt}>{workoutDone ? "✓" : "▶"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── WATER + STEPS + SLEEP — spotlight: home_water ── */}
        <View
          ref={(r) => registerTourRef("home_water", r)}
          collapsable={false}
          style={s.threeRow}
        >
          {/* Water */}
          <View style={[s.smallCard, { flex: 1.1 }]}>
            <Text style={s.smallCardLabel}>💧 Water</Text>
            <Text style={s.smallCardNum}>{(waterMl / 1000).toFixed(1)}</Text>
            <Text style={s.smallCardUnit}>L</Text>
            <View style={s.smallBarBg}>
              <View
                style={[
                  s.smallBarFill,
                  { width: `${waterPct * 100}%`, backgroundColor: "#0A84FF" },
                ]}
              />
            </View>
            <Text style={s.smallCardSub}>
              {waterGlasses}/{Math.round(WATER_TARGET_ML / 250)} glasses
            </Text>
            <TouchableOpacity
              style={s.addWaterBtn}
              onPress={() =>
                setWaterMl((p) => Math.min(p + 250, WATER_TARGET_ML))
              }
            >
              <Text style={s.addWaterTxt}>+ 250ml</Text>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View style={[s.smallCard, { flex: 1 }]}>
            <Text style={s.smallCardLabel}>👟 Steps</Text>
            <Text style={s.smallCardNum}>
              {(TODAY.steps.count / 1000).toFixed(1)}k
            </Text>
            <View style={s.smallBarBg}>
              <View
                style={[
                  s.smallBarFill,
                  {
                    width: `${Math.min(TODAY.steps.count / TODAY.steps.goal, 1) * 100}%`,
                    backgroundColor: C.accent,
                  },
                ]}
              />
            </View>
            <Text style={s.smallCardSub}>
              goal {(TODAY.steps.goal / 1000).toFixed(0)}k
            </Text>
          </View>

          {/* Sleep */}
          <View style={[s.smallCard, { flex: 1 }]}>
            <Text style={s.smallCardLabel}>🌙 Sleep</Text>
            <Text style={s.smallCardNum}>{TODAY.sleep.hours}</Text>
            <Text style={s.smallCardUnit}>hrs</Text>
            <View style={s.smallBarBg}>
              <View
                style={[
                  s.smallBarFill,
                  {
                    width: `${Math.min(TODAY.sleep.hours / 8, 1) * 100}%`,
                    backgroundColor: C.purple,
                  },
                ]}
              />
            </View>
            <TouchableOpacity
              style={s.addWaterBtn}
              onPress={() => navigation.navigate("SleepLog")}
            >
              <Text style={s.addWaterTxt}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RECOVERY — spotlight: home_recovery ── */}
        <View
          ref={(r) => registerTourRef("home_recovery", r)}
          collapsable={false}
          style={s.card}
        >
          <Text style={s.cardLabel}>RECOVERY</Text>
          <View style={s.recoveryRow}>
            <RingProgress
              size={80}
              stroke={7}
              progress={RECOVERY.score / 100}
              color={recoveryColor}
            >
              <Text style={[s.recoveryScore, { color: recoveryColor }]}>
                {RECOVERY.score}
              </Text>
            </RingProgress>
            <View style={s.recoveryStats}>
              {[
                { l: "HRV", v: `${RECOVERY.hrv} ms` },
                { l: "Resting HR", v: `${RECOVERY.restingHR} bpm` },
                { l: "Readiness", v: RECOVERY.readiness },
              ].map((r, i) => (
                <View key={i} style={s.recoveryStatRow}>
                  <Text style={s.recoveryStatL}>{r.l}</Text>
                  <Text style={s.recoveryStatV}>{r.v}</Text>
                </View>
              ))}
            </View>
          </View>
          <View
            style={[
              s.recoveryBadge,
              {
                backgroundColor: recoveryColor + "18",
                borderColor: recoveryColor + "40",
              },
            ]}
          >
            <Text style={[s.recoveryBadgeTxt, { color: recoveryColor }]}>
              {RECOVERY.score >= 67
                ? "✅ Well recovered — push hard today"
                : RECOVERY.score >= 34
                  ? "⚠️ Moderate — keep intensity medium"
                  : "🛑 Low recovery — consider rest today"}
            </Text>
          </View>
        </View>

        {/* ── THIS WEEK — spotlight: home_week ── */}
        <View
          ref={(r) => registerTourRef("home_week", r)}
          collapsable={false}
          style={s.card}
        >
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>THIS WEEK</Text>
            <Text style={s.cardSub}>
              {WEEK.workouts.filter(Boolean).length}/7 workouts
            </Text>
          </View>
          <View style={s.weekRow}>
            {DAYS.map((d, i) => {
              const done = WEEK.workouts[i];
              const today = i === todayIdx;
              const future = i > todayIdx;
              return (
                <View key={i} style={s.weekCol}>
                  <Text style={[s.weekDayLbl, today && { color: C.lime }]}>
                    {d}
                  </Text>
                  <View
                    style={[
                      s.weekDot,
                      done && s.weekDotDone,
                      today && s.weekDotToday,
                      future && { opacity: 0.3 },
                    ]}
                  >
                    {done && <Text style={s.weekCheck}>✓</Text>}
                    {today && !done && (
                      <Text style={{ color: C.lime, fontSize: 18 }}>•</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 28 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  greeting: { color: C.sub, fontSize: 14 },
  name: { color: C.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.accent,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  date: { color: C.sub, fontSize: 12, marginBottom: 20 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLabel: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardSub: { color: C.sub, fontSize: 12 },

  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 18,
  },
  ringNum: {
    color: C.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
  },
  ringLbl: { color: C.sub, fontSize: 11, marginTop: 1 },
  calSide: { flex: 1, gap: 10 },
  calStat: {},
  calStatNum: { color: C.text, fontSize: 18, fontWeight: "800" },
  calStatLbl: { color: C.sub, fontSize: 11 },
  calDivider: { height: 1, backgroundColor: C.border },
  macros: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },

  logMealBtn: {
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  logMealTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  workoutRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  workoutName: { color: C.text, fontSize: 16, fontWeight: "700" },
  workoutMeta: { color: C.sub, fontSize: 12, marginTop: 4 },
  workoutDonePill: {
    alignSelf: "flex-start",
    backgroundColor: "#34C75920",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#34C75940",
  },
  workoutDoneTxt: { color: "#34C759", fontSize: 12, fontWeight: "700" },
  startBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnDone: { backgroundColor: "#34C759" },
  startBtnTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },

  threeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  smallCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    gap: 3,
  },
  smallCardLabel: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  smallCardNum: { color: C.text, fontSize: 22, fontWeight: "900" },
  smallCardUnit: { color: C.sub, fontSize: 11 },
  smallCardSub: { color: C.sub, fontSize: 10 },
  smallBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 4,
  },
  smallBarFill: { height: 4, borderRadius: 2 },
  addWaterBtn: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  addWaterTxt: { color: C.accent, fontSize: 11, fontWeight: "700" },

  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 14,
  },
  recoveryScore: { fontSize: 20, fontWeight: "900" },
  recoveryStats: { flex: 1, gap: 8 },
  recoveryStatRow: { flexDirection: "row", justifyContent: "space-between" },
  recoveryStatL: { color: C.sub, fontSize: 12 },
  recoveryStatV: { color: C.text, fontSize: 13, fontWeight: "600" },
  recoveryBadge: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  recoveryBadgeTxt: { fontSize: 12, fontWeight: "600", lineHeight: 18 },

  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekCol: { alignItems: "center", gap: 5 },
  weekDayLbl: { color: C.sub, fontSize: 10, fontWeight: "600" },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  weekDotDone: { backgroundColor: C.purple },
  weekDotToday: { borderColor: C.lime },
  weekCheck: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
