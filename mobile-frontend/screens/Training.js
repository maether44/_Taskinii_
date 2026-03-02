import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { USER } from "../data/mockUser";
import {
  EXERCISES,
  WORKOUT_HISTORY,
  WORKOUT_PLANS,
} from "../data/mockWorkouts";

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
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const DIFF_COLOR = { Easy: "#34C759", Moderate: "#FF9500", Hard: "#FF3B30" };

function diffLabel(minutes) {
  if (minutes === 0) return null;
  if (minutes <= 30) return "Easy";
  if (minutes <= 50) return "Moderate";
  return "Hard";
}

export default function Training({ navigation }) {
  const plan = WORKOUT_PLANS[USER.goal] || WORKOUT_PLANS.fat_loss;
  const [selected, setSelected] = useState(todayIdx);

  const todayWorkout = plan.days[todayIdx];
  const selectedWorkout = plan.days[selected];
  const isToday = selected === todayIdx;
  const isRestDay = selectedWorkout.exercises.length === 0;

  const startWorkout = () => {
    navigation.navigate("WorkoutActive", { workout: selectedWorkout });
  };

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Training</Text>
          <View style={s.planChip}>
            <Text style={s.planChipTxt}>{plan.name}</Text>
          </View>
        </View>

        {/* Week day selector */}
        <View style={s.weekRow}>
          {DAYS.map((d, i) => {
            const w = plan.days[i];
            const rest = w.exercises.length === 0;
            const today = i === todayIdx;
            const active = i === selected;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.dayBtn,
                  active && s.dayBtnActive,
                  today && !active && s.dayBtnToday,
                ]}
                onPress={() => setSelected(i)}
              >
                <Text
                  style={[
                    s.dayLabel,
                    active && s.dayLabelActive,
                    today && !active && { color: C.lime },
                  ]}
                >
                  {d}
                </Text>
                <View
                  style={[
                    s.dayDot,
                    rest
                      ? s.dayDotRest
                      : active
                        ? s.dayDotActive
                        : s.dayDotWork,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day workout */}
        <View style={s.card}>
          <View style={s.workoutCardTop}>
            <View>
              <Text style={s.workoutCardDay}>
                {isToday ? "TODAY" : DAYS[selected].toUpperCase()}
              </Text>
              <Text style={s.workoutCardName}>{selectedWorkout.name}</Text>
            </View>
            {!isRestDay && (
              <View style={s.workoutMeta}>
                {[
                  { v: selectedWorkout.estimatedMinutes + " min", icon: "⏱" },
                  {
                    v: selectedWorkout.estimatedCalories + " kcal",
                    icon: "🔥",
                  },
                  {
                    v: selectedWorkout.exercises.length + " exercises",
                    icon: "💪",
                  },
                ].map((m, i) => (
                  <View key={i} style={s.metaPill}>
                    <Text style={s.metaPillTxt}>
                      {m.icon} {m.v}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {isRestDay ? (
            <View style={s.restCard}>
              <Text style={s.restEmoji}>😌</Text>
              <Text style={s.restTitle}>Rest Day</Text>
              <Text style={s.restSub}>
                Recovery is where the gains happen. Take it easy today.
              </Text>
              <View style={s.restTips}>
                {[
                  "Stretch for 10 minutes",
                  "Stay hydrated",
                  "Get 8 hours of sleep",
                  "Light walk is fine",
                ].map((t, i) => (
                  <View key={i} style={s.restTipRow}>
                    <View style={s.restTipDot} />
                    <Text style={s.restTipTxt}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <>
              {/* Exercise list */}
              {selectedWorkout.exercises.map((ex, i) => {
                const info = EXERCISES.find((e) => e.id === ex.id) || {
                  name: ex.id,
                  muscle: "",
                  equipment: "",
                };
                return (
                  <View key={i} style={s.exRow}>
                    <View style={s.exNum}>
                      <Text style={s.exNumTxt}>{i + 1}</Text>
                    </View>
                    <View style={s.exInfo}>
                      <Text style={s.exName}>{info.name}</Text>
                      <Text style={s.exMeta}>
                        {info.muscle} · {info.equipment}
                      </Text>
                    </View>
                    <View style={s.exSets}>
                      {ex.duration ? (
                        <Text style={s.exSetsTxt}>{ex.duration}</Text>
                      ) : (
                        <Text style={s.exSetsTxt}>
                          {ex.sets}×{ex.reps}
                        </Text>
                      )}
                      <Text style={s.exRest}>
                        {ex.restSec > 0 ? `${ex.restSec}s rest` : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {isToday && (
                <TouchableOpacity
                  style={s.startBtn}
                  onPress={startWorkout}
                  activeOpacity={0.85}
                >
                  <Text style={s.startBtnTxt}>▶ Start Workout</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Recent history */}
        <View style={s.card}>
          <Text style={s.cardLabel}>RECENT HISTORY</Text>
          {WORKOUT_HISTORY.map((h, i) => (
            <View
              key={i}
              style={[
                s.histRow,
                i < WORKOUT_HISTORY.length - 1 && s.histRowBorder,
              ]}
            >
              <View
                style={[
                  s.histDot,
                  h.completed ? s.histDotDone : s.histDotMissed,
                ]}
              />
              <View style={s.histInfo}>
                <Text style={s.histName}>{h.name}</Text>
                <Text style={s.histDate}>{h.date}</Text>
              </View>
              {h.completed && (
                <View style={s.histStats}>
                  <Text style={s.histStat}>{h.duration} min</Text>
                  <Text style={s.histStat}>{h.calories} kcal</Text>
                </View>
              )}
              {!h.completed && <Text style={s.histMissed}>Missed</Text>}
            </View>
          ))}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
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
    marginBottom: 20,
  },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  planChip: {
    backgroundColor: C.purple + "25",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.purple + "50",
  },
  planChipTxt: { color: C.accent, fontSize: 11, fontWeight: "700" },

  weekRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  dayBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayBtnActive: { backgroundColor: C.purple, borderColor: C.purple },
  dayBtnToday: { borderColor: C.lime },
  dayLabel: { color: C.sub, fontSize: 10, fontWeight: "700" },
  dayLabelActive: { color: "#fff" },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  dayDotWork: { backgroundColor: C.accent },
  dayDotRest: { backgroundColor: C.border },
  dayDotActive: { backgroundColor: "#fff" },

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
  workoutCardTop: { marginBottom: 16 },
  workoutCardDay: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  workoutCardName: { color: C.text, fontSize: 20, fontWeight: "800" },
  workoutMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillTxt: { color: C.accent, fontSize: 11, fontWeight: "600" },

  restCard: { alignItems: "center", paddingVertical: 20 },
  restEmoji: { fontSize: 48, marginBottom: 12 },
  restTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  restSub: {
    color: C.sub,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  restTips: { width: "100%", gap: 10 },
  restTipRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  restTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.purple,
  },
  restTipTxt: { color: C.sub, fontSize: 13 },

  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  exNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  exNumTxt: { color: C.accent, fontSize: 12, fontWeight: "700" },
  exInfo: { flex: 1 },
  exName: { color: C.text, fontSize: 14, fontWeight: "600" },
  exMeta: { color: C.sub, fontSize: 11, marginTop: 2 },
  exSets: { alignItems: "flex-end" },
  exSetsTxt: { color: C.text, fontSize: 14, fontWeight: "700" },
  exRest: { color: C.sub, fontSize: 10, marginTop: 2 },

  startBtn: {
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  startBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  histRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  histDot: { width: 10, height: 10, borderRadius: 5 },
  histDotDone: { backgroundColor: C.purple },
  histDotMissed: { backgroundColor: C.border },
  histInfo: { flex: 1 },
  histName: { color: C.text, fontSize: 13, fontWeight: "600" },
  histDate: { color: C.sub, fontSize: 11, marginTop: 2 },
  histStats: { alignItems: "flex-end", gap: 3 },
  histStat: { color: C.sub, fontSize: 11 },
  histMissed: { color: "#FF3B30", fontSize: 12, fontWeight: "600" },
});
