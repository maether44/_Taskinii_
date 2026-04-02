import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";

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
};

const GOAL_LABELS = {
  lose_fat: "Lose Fat 🔥",
  fat_loss: "Lose Fat 🔥",
  gain_muscle: "Build Muscle 💪",
  muscle_gain: "Build Muscle 💪",
  maintain: "Stay Fit ⚖️",
  gain_weight: "Gain Weight 🍽️",
  build_habits: "Build Habits 🧠",
};

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Very Active",
  very_active: "Athlete",
};

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const XP = { level: 7, current: 340, goal: 500 };
const BADGES = [
  {
    id: "first_workout",
    icon: "💪",
    label: "First Workout",
    xp: 50,
    earned: true,
  },
  {
    id: "week_streak",
    icon: "🔥",
    label: "7-Day Streak",
    xp: 100,
    earned: true,
  },
  { id: "hydrated", icon: "💧", label: "Stay Hydrated", xp: 30, earned: true },
  { id: "early_bird", icon: "🌅", label: "Early Bird", xp: 50, earned: false },
  { id: "iron_will", icon: "🏋️", label: "Iron Will", xp: 200, earned: false },
  {
    id: "clean_eater",
    icon: "🥗",
    label: "Clean Eater",
    xp: 75,
    earned: false,
  },
];
const PERSONAL_RECORDS = [
  { exercise: "Bench Press", weight: "80 kg", date: "2 weeks ago" },
  { exercise: "Squat", weight: "100 kg", date: "1 week ago" },
  { exercise: "Deadlift", weight: "120 kg", date: "3 days ago" },
];

function calcAgeFromISO(isoDate) {
  if (!isoDate) return null;
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const passed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  return passed ? age : age - 1;
}

function calcBMRDirect(gender, weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return 0;
  return Math.round(
    gender === "female"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5,
  );
}

function Row({ label, value, color }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color && { color }]}>{value ?? "—"}</Text>
    </View>
  );
}

export default function Profile({ navigate, replayTour }) {
  const { signOut, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [calorieTarget, setCalorieTarget] = useState(null);
  const [proteinTarget, setProteinTarget] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifWater, setNotifWater] = useState(true);
  const [notifMeal, setNotifMeal] = useState(false);

  const handleSendNotification = async () => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Notifications disabled",
          "Please allow notifications to send a test notification.",
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "BodyQ",
          body: "Your notification setup is working ",
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn("Failed to send test notification:", error);
      Alert.alert("Error", "Could not send test notification right now.");
    }
  };

  useEffect(() => {
    if (!authUser?.id) return;
    (async () => {
      try {
        const [{ data: prof }, { data: cal }] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "full_name, date_of_birth, gender, height_cm, weight_kg, goal, activity_level, target_weight_kg",
            )
            .eq("id", authUser.id)
            .single(),
          supabase
            .from("calorie_targets")
            .select("daily_calories, protein_target")
            .eq("user_id", authUser.id)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        setProfile(prof);
        if (cal) {
          setCalorieTarget(cal.daily_calories);
          setProteinTarget(cal.protein_target);
        }
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [authUser?.id]);

  if (loadingProfile) {
    return (
      <View
        style={[s.root, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  const name =
    profile?.full_name || authUser?.user_metadata?.full_name || "User";
  const email = authUser?.email || "";
  const age = calcAgeFromISO(profile?.date_of_birth);
  const gender = profile?.gender || "male";
  const heightCm = profile?.height_cm;
  const weightKg = profile?.weight_kg;
  const goalWeightKg = profile?.target_weight_kg;
  const activityLevel = profile?.activity_level || "moderate";
  const goal = profile?.goal || "maintain";

  const bmr = calcBMRDirect(gender, weightKg, heightCm, age);
  const tdee = bmr
    ? Math.round(bmr * (ACTIVITY_MULT[activityLevel] || 1.55))
    : 0;
  const calTarget =
    calorieTarget ||
    (goal === "lose_fat" || goal === "fat_loss"
      ? tdee - 400
      : goal === "gain_muscle"
        ? tdee + 200
        : tdee);
  const protein = proteinTarget || (weightKg ? Math.round(weightKg * 2) : 0);

  const bmiVal =
    heightCm && weightKg ? (weightKg / (heightCm / 100) ** 2).toFixed(1) : null;
  const bmiNum = bmiVal ? parseFloat(bmiVal) : null;
  const bmiStatus = !bmiNum
    ? "—"
    : bmiNum < 18.5
      ? "Underweight"
      : bmiNum < 25
        ? "Normal"
        : bmiNum < 30
          ? "Overweight"
          : "Obese";
  const bmiColor = bmiNum >= 18.5 && bmiNum < 25 ? C.green : C.orange;
  const goalNote =
    goal === "lose_fat" || goal === "fat_loss"
      ? "400 kcal deficit for steady fat loss (~0.4 kg/week)"
      : goal === "gain_muscle" || goal === "muscle_gain"
        ? "200 kcal surplus for lean muscle building"
        : "Maintenance calories — staying fit and healthy";

  const earnedBadges = BADGES.filter((b) => b.earned);
  const xpPct = XP.current / XP.goal;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
        </View>

        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{name[0]?.toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{name}</Text>
            <Text style={s.profileEmail}>{email}</Text>
            <View style={s.goalChip}>
              <Text style={s.goalChipTxt}>{GOAL_LABELS[goal] || goal}</Text>
            </View>
          </View>
        </View>

        {/* THIS IS TO TEST NOTIFICATIONS */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.tourBtn}
            onPress={handleSendNotification}
          >
            <Text style={s.tourBtnTxt}>Send test notification!</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.xpRow}>
            <View>
              <Text style={s.cardLabel}>LEVEL {XP.level}</Text>
              <Text style={s.xpCount}>
                {XP.current} / {XP.goal} XP
              </Text>
            </View>
            <Text style={s.xpEmoji}>⭐</Text>
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${xpPct * 100}%` }]} />
          </View>
          <Text style={s.xpNext}>
            {XP.goal - XP.current} XP to Level {XP.level + 1}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>BODY STATS</Text>
          <Row label="Age" value={age ? `${age} years` : null} />
          <Row
            label="Gender"
            value={
              gender === "male"
                ? "Male"
                : gender === "female"
                  ? "Female"
                  : gender
            }
          />
          <Row label="Height" value={heightCm ? `${heightCm} cm` : null} />
          <Row label="Weight" value={weightKg ? `${weightKg} kg` : null} />
          <Row
            label="Target Weight"
            value={goalWeightKg ? `${goalWeightKg} kg` : null}
            color={C.lime}
          />
          <Row
            label="BMI"
            value={bmiVal ? `${bmiVal} (${bmiStatus})` : null}
            color={bmiColor}
          />
          <Row
            label="Activity"
            value={ACTIVITY_LABELS[activityLevel] || activityLevel}
          />
          <TouchableOpacity style={s.editBtn}>
            <Text style={s.editBtnTxt}>Edit Body Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>YOUR TARGETS</Text>
          <Row
            label="BMR (base metabolism)"
            value={bmr ? `${bmr} kcal` : null}
          />
          <Row
            label="TDEE (maintenance)"
            value={tdee ? `${tdee} kcal` : null}
          />
          <Row
            label="Daily calorie target"
            value={calTarget ? `${calTarget} kcal` : null}
            color={C.lime}
          />
          <Row
            label="Protein goal"
            value={protein ? `${protein}g` : null}
            color={C.accent}
          />
          <Row label="Water target" value="2.5L / day" color="#0A84FF" />
          <View style={s.targetNote}>
            <Text style={s.targetNoteTxt}>{goalNote}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>PERSONAL RECORDS</Text>
          {PERSONAL_RECORDS.map((pr, i) => (
            <View
              key={i}
              style={[
                s.prRow,
                i < PERSONAL_RECORDS.length - 1 && s.prRowBorder,
              ]}
            >
              <Text style={s.prExercise}>{pr.exercise}</Text>
              <View style={s.prRight}>
                <Text style={s.prValue}>{pr.weight}</Text>
                <Text style={s.prDate}>{pr.date}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>ACHIEVEMENTS</Text>
            <Text style={s.cardSub}>
              {earnedBadges.length}/{BADGES.length} earned
            </Text>
          </View>
          <View style={s.badgesGrid}>
            {BADGES.map((b) => (
              <View key={b.id} style={[s.badge, !b.earned && s.badgeLocked]}>
                <Text style={s.badgeIcon}>{b.earned ? b.icon : "🔒"}</Text>
                <Text style={[s.badgeLabel, !b.earned && { opacity: 0.4 }]}>
                  {b.label}
                </Text>
                <Text style={[s.badgeXP, !b.earned && { opacity: 0.4 }]}>
                  +{b.xp} XP
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>NOTIFICATIONS</Text>
          {[
            {
              label: "Workout Reminders",
              value: notifWorkout,
              set: setNotifWorkout,
            },
            { label: "Water Reminders", value: notifWater, set: setNotifWater },
            {
              label: "Meal Log Reminders",
              value: notifMeal,
              set: setNotifMeal,
            },
          ].map((n, i) => (
            <View key={i} style={[s.settingRow, i < 2 && s.settingRowBorder]}>
              <Text style={s.settingLabel}>{n.label}</Text>
              <Switch
                value={n.value}
                onValueChange={n.set}
                trackColor={{ false: C.border, true: C.purple + "80" }}
                thumbColor={n.value ? C.purple : C.sub}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.tourBtn} onPress={replayTour}>
          <Text style={s.tourBtnTxt}>🗺️ Replay App Tour</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },
  header: { marginBottom: 20 },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.accent,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "900" },
  profileInfo: { flex: 1 },
  profileName: { color: C.text, fontSize: 20, fontWeight: "800" },
  profileEmail: { color: C.sub, fontSize: 13, marginTop: 2 },
  goalChip: {
    alignSelf: "flex-start",
    backgroundColor: C.purple + "25",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.purple + "50",
  },
  goalChipTxt: { color: C.accent, fontSize: 11, fontWeight: "700" },
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
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  xpCount: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 4 },
  xpEmoji: { fontSize: 28 },
  xpBarBg: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  xpBarFill: { height: 8, backgroundColor: C.lime, borderRadius: 4 },
  xpNext: { color: C.sub, fontSize: 11 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statLabel: { color: C.sub, fontSize: 13 },
  statValue: { color: C.text, fontSize: 13, fontWeight: "600" },
  editBtn: {
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  editBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  targetNote: {
    backgroundColor: C.purple + "12",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.purple + "30",
  },
  targetNoteTxt: { color: C.accent, fontSize: 12, lineHeight: 18 },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  prRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  prExercise: { color: C.text, fontSize: 13, fontWeight: "600" },
  prRight: { alignItems: "flex-end" },
  prValue: { color: C.lime, fontSize: 14, fontWeight: "800" },
  prDate: { color: C.sub, fontSize: 10, marginTop: 2 },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: {
    alignItems: "center",
    gap: 4,
    backgroundColor: C.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: "30%",
    borderWidth: 1,
    borderColor: C.purple + "40",
  },
  badgeLocked: { borderColor: C.border, opacity: 0.5 },
  badgeIcon: { fontSize: 22 },
  badgeLabel: {
    color: C.sub,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
  badgeXP: { color: C.lime, fontSize: 9, fontWeight: "700" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { color: C.text, fontSize: 14 },
  tourBtn: {
    backgroundColor: C.purple,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
  },
  tourBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  signOutBtn: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 6,
  },
  signOutTxt: { color: "#FF3B30", fontSize: 14, fontWeight: "700" },
});
