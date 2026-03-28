import { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  THEMES,
  STEPS,
  GOALS,
  EXPERIENCE,
  DAYS,
  DURATIONS,
  TIMES,
  EQUIPMENT,
  FOCUS,
  INJURIES,
  SLEEP,
  STRESS,
  DIET,
  ACTIVITY,
} from "../constants/onBoardingData";
import { bmiStatus } from "../lib/calculations";
import { useOnboarding } from "../hooks/useOnboarding";
import { useAuth } from "../context/AuthContext";
import SelectCard from "../components/onBoarding/SelectCard";
import PillButton from "../components/onBoarding/PillButton";
import FieldInput from "../components/onBoarding/FieldInput";

export default function OnBoardingGoal({ onComplete }) {
  const [isDark, setIsDark] = useState(true);
  const T = THEMES[isDark ? "dark" : "light"];

  const ob = useOnboarding();
  const { markOnboardingComplete } = useAuth();

  const progressWidth = ob.progressWidth;

  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={[s.progressTrack, { backgroundColor: T.border }]}>
          <Animated.View
            style={[
              s.progressFill,
              { width: progressWidth, backgroundColor: T.purple },
            ]}
          />
        </View>
        {ob.step < 6 && (
          <TouchableOpacity
            onPress={() => ob.skipStep(markOnboardingComplete)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.skipTxt, { color: T.muted }]}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            s.themeBtn,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
          onPress={() => setIsDark((d) => !d)}
        >
          <Text style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      {/* Step pill */}
      <View style={s.stepPillRow}>
        <View
          style={[
            s.stepPill,
            { backgroundColor: T.purple + "18", borderColor: T.purple + "30" },
          ]}
        >
          <Text style={s.stepPillEmoji}>{STEPS[ob.step].emoji}</Text>
          <Text style={[s.stepPillTxt, { color: T.purple }]}>
            {ob.step + 1}/{STEPS.length} — {STEPS[ob.step].label}
          </Text>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: ob.fade }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 0: GOAL ── */}
        {ob.step === 0 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>
              {"What's your"}
              {"\n"}main goal?
            </Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              This shapes everything — your workouts, nutrition and how Yara
              coaches you.
            </Text>
            <View style={s.cardList}>
              {GOALS.map((g) => (
                <SelectCard
                  key={g.id}
                  emoji={g.emoji}
                  title={g.title}
                  sub={g.sub}
                  selected={ob.goal === g.id}
                  onPress={() => ob.setGoal(g.id)}
                  T={T}
                />
              ))}
            </View>
          </>
        )}

        {/* ── STEP 1: BODY ── */}
        {ob.step === 1 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>
              A bit about{"\n"}yourself
            </Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              This lets Yara calculate your exact calorie and macro targets.
            </Text>
            <Text style={[s.label, { color: T.sub }]}>Gender</Text>
            <View style={s.rowWrap}>
              {["Male", "Female", "Other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    s.genderBtn,
                    {
                      backgroundColor: T.card,
                      borderColor:
                        ob.gender === g.toLowerCase() ? T.purple : T.border,
                    },
                    ob.gender === g.toLowerCase() && {
                      backgroundColor: T.purple + "14",
                    },
                  ]}
                  onPress={() => ob.setGender(g.toLowerCase())}
                >
                  <Text
                    style={[
                      s.genderTxt,
                      {
                        color: ob.gender === g.toLowerCase() ? T.purple : T.sub,
                      },
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginBottom: 16 }}></View>
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="Height"
                  value={ob.height}
                  onChange={ob.setHeight}
                  placeholder="175"
                  unit="cm"
                  T={T}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="Date of Birth"
                  value={ob.dob}
                  onChange={ob.setDob}
                  placeholder="DD/MM/YYYY"
                  T={T}
                  isDate
                />
              </View>
            </View>
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="Current weight"
                  value={ob.weight}
                  onChange={ob.setWeight}
                  placeholder="75"
                  unit="kg"
                  T={T}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="Target weight"
                  value={ob.targetW}
                  onChange={ob.setTargetW}
                  placeholder="68"
                  unit="kg"
                  T={T}
                  optional
                />
              </View>
            </View>
            {ob.bmi && (
              <View
                style={[
                  s.bmiRow,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
              >
                <View>
                  <Text style={[s.bmiLabel, { color: T.sub }]}>Your BMI</Text>
                  <Text
                    style={[
                      s.bmiVal,
                      {
                        color:
                          ob.bmi < 25 && ob.bmi >= 18.5 ? T.green : T.orange,
                      },
                    ]}
                  >
                    {ob.bmi}
                  </Text>
                </View>
                <Text style={[s.bmiStatus, { color: T.sub }]}>
                  {bmiStatus(ob.bmi)}
                </Text>
              </View>
            )}
            <Text style={[s.label, { color: T.sub, marginTop: 20 }]}>
              Daily activity level{" "}
              <Text style={{ color: T.muted, fontWeight: "400" }}>
                (outside gym)
              </Text>
            </Text>
            <View style={s.cardList}>
              {ACTIVITY.map((a) => (
                <SelectCard
                  key={a.id}
                  title={a.label}
                  selected={ob.activity === a.id}
                  onPress={() => ob.setActivity(a.id)}
                  T={T}
                />
              ))}
            </View>
          </>
        )}

        {/* ── STEP 2: EXPERIENCE ── */}
        {ob.step === 2 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>
              Training{"\n"}experience
            </Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              Yara adjusts exercise complexity, volume and progression based on
              where you are.
            </Text>
            <View style={s.cardList}>
              {EXPERIENCE.map((e) => (
                <SelectCard
                  key={e.id}
                  emoji={e.emoji}
                  title={e.title}
                  sub={e.sub}
                  selected={ob.experience === e.id}
                  onPress={() => ob.setExperience(e.id)}
                  T={T}
                />
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 28 }]}>
              Any injuries or limitations?
            </Text>
            <Text style={[s.hint, { color: T.sub }]}>
              Yara will automatically swap exercises to keep you safe.
            </Text>
            <View style={s.pillWrap}>
              {INJURIES.map((inj) => (
                <PillButton
                  key={inj.id}
                  label={inj.label}
                  selected={ob.injuries.includes(inj.id)}
                  onPress={() => ob.toggleInjury(inj.id)}
                  color={inj.id === "none" ? T.green : T.orange}
                  T={T}
                />
              ))}
            </View>
          </>
        )}

        {/* ── STEP 3: SCHEDULE ── */}
        {ob.step === 3 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>Your schedule</Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              Yara builds around your real life — not an ideal version of it.
            </Text>
            <Text style={[s.label, { color: T.sub }]}>Days per week</Text>
            <View style={s.dayRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    s.dayBtn,
                    {
                      backgroundColor: T.card,
                      borderColor: ob.days === d ? T.purple : T.border,
                    },
                    ob.days === d && { backgroundColor: T.purple },
                  ]}
                  onPress={() => ob.setDays(d)}
                >
                  <Text
                    style={[
                      s.dayNum,
                      { color: ob.days === d ? "#fff" : T.sub },
                    ]}
                  >
                    {d}
                  </Text>
                  <Text
                    style={[
                      s.dayLbl,
                      {
                        color:
                          ob.days === d ? "rgba(255,255,255,0.7)" : T.muted,
                      },
                    ]}
                  >
                    days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 22 }]}>
              Session length
            </Text>
            <View style={s.pillWrap}>
              {DURATIONS.map((d) => (
                <PillButton
                  key={d.v}
                  label={d.label}
                  selected={ob.duration === d.v}
                  onPress={() => ob.setDuration(d.v)}
                  T={T}
                />
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 22 }]}>
              Preferred workout time
            </Text>
            <View style={s.timeRow}>
              {TIMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    s.timeBtn,
                    {
                      backgroundColor: T.card,
                      borderColor: ob.timeOfDay === t.id ? T.purple : T.border,
                    },
                    ob.timeOfDay === t.id && {
                      backgroundColor: T.purple + "14",
                      borderColor: T.purple,
                    },
                  ]}
                  onPress={() => ob.setTimeOfDay(t.id)}
                >
                  <Text style={s.timeEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      s.timeTxt,
                      { color: ob.timeOfDay === t.id ? T.purple : T.sub },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── STEP 4: EQUIPMENT ── */}
        {ob.step === 4 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>
              Equipment{"\n"}& focus
            </Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              Yara will only give you exercises you can actually do with what
              you have.
            </Text>
            <View style={s.cardList}>
              {EQUIPMENT.map((e) => (
                <SelectCard
                  key={e.id}
                  emoji={e.emoji}
                  title={e.title}
                  sub={e.sub}
                  selected={ob.equipment === e.id}
                  onPress={() => ob.setEquipment(e.id)}
                  T={T}
                />
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 28 }]}>
              Priority muscle groups{" "}
              <Text style={{ color: T.muted, fontWeight: "400" }}>
                (pick up to 3)
              </Text>
            </Text>
            <Text style={[s.hint, { color: T.sub }]}>
              Yara will give these areas extra attention each week.
            </Text>
            <View style={s.pillWrap}>
              {FOCUS.map((f) => (
                <PillButton
                  key={f.id}
                  label={f.label}
                  selected={ob.focus.includes(f.id)}
                  onPress={() => ob.toggleFocus(f.id)}
                  T={T}
                />
              ))}
            </View>
          </>
        )}

        {/* ── STEP 5: LIFESTYLE ── */}
        {ob.step === 5 && (
          <>
            <Text style={[s.h1, { color: T.text }]}>
              {"Recovery &"}
              {"\n"}lifestyle
            </Text>
            <Text style={[s.bodyTxt, { color: T.sub }]}>
              Recovery is where progress actually happens. Yara takes this
              seriously.
            </Text>
            <Text style={[s.label, { color: T.sub }]}>
              How much do you sleep?
            </Text>
            <View style={s.pillWrap}>
              {SLEEP.map((sl) => (
                <PillButton
                  key={sl.id}
                  label={sl.label}
                  selected={ob.sleep === sl.id}
                  onPress={() => ob.setSleep(sl.id)}
                  color={sl.color}
                  T={T}
                />
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 22 }]}>
              Stress level day-to-day
            </Text>
            <View style={s.stressRow}>
              {STRESS.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    s.stressBtn,
                    {
                      backgroundColor: T.card,
                      borderColor: ob.stress === st.id ? T.purple : T.border,
                    },
                    ob.stress === st.id && {
                      backgroundColor: T.purple + "14",
                      borderColor: T.purple,
                    },
                  ]}
                  onPress={() => ob.setStress(st.id)}
                >
                  <Text style={s.stressEmoji}>{st.emoji}</Text>
                  <Text
                    style={[
                      s.stressTxt,
                      { color: ob.stress === st.id ? T.purple : T.sub },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.label, { color: T.sub, marginTop: 22 }]}>
              Diet preference
            </Text>
            <View style={s.pillWrap}>
              {DIET.map((d) => (
                <PillButton
                  key={d.id}
                  label={d.label}
                  selected={ob.diet === d.id}
                  onPress={() => ob.setDiet(d.id)}
                  T={T}
                />
              ))}
            </View>
          </>
        )}

        {/* ── STEP 6: AI PLAN ── */}
        {ob.step === 6 && (
          <>
            <View style={[s.yaraCard, { backgroundColor: T.purple }]}>
              <View style={s.yaraTop}>
                <View style={s.yaraAvatar}>
                  <Text style={{ fontSize: 28 }}>👩‍⚕️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.yaraName}>Yara</Text>
                  <Text style={s.yaraRole}>Your Personal Coach</Text>
                </View>
                <View style={s.yaraBadge}>
                  <Text style={s.yaraBadgeTxt}>AI ✦</Text>
                </View>
              </View>
              <Text style={s.yaraMsg}>
                {ob.loading && !ob.savingProfile
                  ? "I'm analysing everything you shared and building your personalised plan... 🧠"
                  : ob.aiPlan
                    ? ob.aiPlan.intro
                    : ob.loadError
                      ? "Something went wrong generating your plan. Tap retry below."
                      : "I've looked at everything you shared. Here's your personalised plan!"}
              </Text>
            </View>

            {ob.loading && !ob.savingProfile && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.border,
                    alignItems: "center",
                    padding: 40,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={T.purple} />
                <Text
                  style={[
                    s.bodyTxt,
                    { color: T.sub, textAlign: "center", marginTop: 16 },
                  ]}
                >
                  Yara is building your plan{"\n"}based on your answers...
                </Text>
              </View>
            )}

            {ob.loadError && !ob.loading && !ob.savingProfile && (
              <TouchableOpacity
                style={[s.cta, { backgroundColor: T.orange, marginTop: 0 }]}
                onPress={ob.retryPlan}
              >
                <Text style={s.ctaTxt}>🔄 Retry Plan Generation</Text>
              </TouchableOpacity>
            )}

            {ob.aiPlan && !ob.loading && (
              <>
                {ob.calTarget > 0 && (
                  <View
                    style={[
                      s.card,
                      { backgroundColor: T.card, borderColor: T.border },
                    ]}
                  >
                    <Text style={[s.sectionLabel, { color: T.sub }]}>
                      Daily Nutrition Targets
                    </Text>
                    <View style={s.targetsRow}>
                      <View
                        style={[
                          s.targetBox,
                          {
                            backgroundColor: T.purple + "14",
                            borderColor: T.purple + "30",
                          },
                        ]}
                      >
                        <Text style={[s.targetBig, { color: T.purple }]}>
                          {ob.calTarget}
                        </Text>
                        <Text style={[s.targetUnit, { color: T.sub }]}>
                          kcal / day
                        </Text>
                        <Text style={[s.targetLbl, { color: T.muted }]}>
                          Calorie Target
                        </Text>
                      </View>
                      <View
                        style={[
                          s.targetBox,
                          {
                            backgroundColor: T.green + "14",
                            borderColor: T.green + "30",
                          },
                        ]}
                      >
                        <Text style={[s.targetBig, { color: T.green }]}>
                          {ob.protein}g
                        </Text>
                        <Text style={[s.targetUnit, { color: T.sub }]}>
                          protein / day
                        </Text>
                        <Text style={[s.targetLbl, { color: T.muted }]}>
                          Protein Goal
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        s.calNoteBox,
                        { backgroundColor: T.pill, borderColor: T.border },
                      ]}
                    >
                      <Text style={[s.calNoteTxt, { color: T.sub }]}>
                        {ob.aiPlan.nutritionNote}
                      </Text>
                    </View>
                  </View>
                )}

                <View
                  style={[
                    s.card,
                    { backgroundColor: T.card, borderColor: T.border },
                  ]}
                >
                  <Text style={[s.sectionLabel, { color: T.sub }]}>
                    Your {ob.days}-Day AI Training Split
                  </Text>
                  {ob.aiPlan.days?.map((day, i) => (
                    <View
                      key={i}
                      style={[
                        s.planDayWrap,
                        i < (ob.aiPlan.days?.length ?? 0) - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: T.border,
                        },
                      ]}
                    >
                      <View style={s.planDayRow}>
                        <View
                          style={[s.planDayNum, { backgroundColor: T.purple }]}
                        >
                          <Text style={s.planDayNumTxt}>Day {i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.planDayName, { color: T.text }]}>
                            {day.name}
                          </Text>
                          <Text style={[s.planDayMeta, { color: T.sub }]}>
                            {day.focus} · {ob.duration} min
                          </Text>
                        </View>
                      </View>
                      {day.exercises?.map((ex, j) => (
                        <View key={j} style={s.exRow}>
                          <View
                            style={[
                              s.exDot,
                              { backgroundColor: T.purple + "40" },
                            ]}
                          />
                          <Text style={[s.exName, { color: T.text }]}>
                            {ex.name}
                          </Text>
                          <Text style={[s.exSets, { color: T.purple }]}>
                            {ex.sets}×{ex.reps}
                          </Text>
                          <Text style={[s.exRest, { color: T.muted }]}>
                            {ex.rest}
                          </Text>
                        </View>
                      ))}
                      <View
                        style={[
                          s.coachTipBox,
                          {
                            backgroundColor: T.purple + "10",
                            borderColor: T.purple + "30",
                          },
                        ]}
                      >
                        <Text style={[s.coachTipTxt, { color: T.purpleLight }]}>
                          💬 {day.coachTip}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    s.card,
                    { backgroundColor: T.card, borderColor: T.border },
                  ]}
                >
                  <Text style={[s.sectionLabel, { color: T.sub }]}>
                    Yara's Notes for You
                  </Text>
                  {[
                    { icon: "🌙", note: ob.aiPlan.recoveryNote },
                    { icon: "🔥", note: ob.aiPlan.motivationNote },
                  ].map((n, i) => (
                    <View
                      key={i}
                      style={[
                        s.noteRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: T.border,
                        },
                      ]}
                    >
                      <Text style={s.noteIcon}>{n.icon}</Text>
                      <Text style={[s.noteTxt, { color: T.text }]}>
                        {n.note}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Navigation */}
        {!(ob.step === 6 && (ob.loading || ob.savingProfile)) && (
          <TouchableOpacity
            style={[
              s.cta,
              {
                backgroundColor:
                  ob.canGo && !(ob.step === 6 && !ob.aiPlan && !ob.loadError)
                    ? T.purple
                    : T.muted,
              },
            ]}
            onPress={() => ob.goNext(markOnboardingComplete)}
            disabled={
              !ob.canGo || (ob.step === 6 && !ob.aiPlan && !ob.loadError)
            }
            activeOpacity={0.82}
          >
            <Text style={s.ctaTxt}>
              {ob.step === 6
                ? "Start Training with Yara 🚀"
                : ob.step === 5
                  ? "Generate My Plan ✨"
                  : "Continue"}
            </Text>
          </TouchableOpacity>
        )}

        {ob.step === 6 && ob.savingProfile && (
          <View
            style={[
              s.card,
              {
                backgroundColor: T.card,
                borderColor: T.border,
                alignItems: "center",
                padding: 30,
                marginTop: 24,
              },
            ]}
          >
            <ActivityIndicator size="large" color={T.purple} />
            <Text
              style={[
                s.bodyTxt,
                { color: T.sub, textAlign: "center", marginTop: 16 },
              ]}
            >
              Saving your profile...
            </Text>
          </View>
        )}

        {ob.step === 6 &&
          ob.loadError &&
          ob.aiPlan &&
          !ob.loading &&
          !ob.savingProfile && (
            <View>
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.orange + "14",
                    borderColor: T.orange + "30",
                    marginTop: 24,
                  },
                ]}
              >
                <Text
                  style={[s.bodyTxt, { color: T.text, textAlign: "center" }]}
                >
                  ⚠️ {ob.loadError}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.cta, { backgroundColor: T.orange, marginTop: 12 }]}
                onPress={() => ob.goNext(markOnboardingComplete)}
              >
                <Text style={s.ctaTxt}>🔄 Retry Save</Text>
              </TouchableOpacity>
            </View>
          )}

        {ob.step > 0 && ob.step !== 6 && (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => ob.animateTo(ob.step - 1)}
          >
            <Text style={[s.backTxt, { color: T.sub }]}>← Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 12,
    gap: 14,
  },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepPillRow: { paddingHorizontal: 22, marginBottom: 18 },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 7,
    borderWidth: 1,
  },
  stepPillEmoji: { fontSize: 14 },
  stepPillTxt: { fontSize: 13, fontWeight: "700" },
  h1: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  bodyTxt: { fontSize: 15, lineHeight: 23, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: -6, marginBottom: 12 },
  cardList: { gap: 10 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 4 },
  rowWrap: { flexDirection: "row", gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  genderTxt: { fontSize: 14, fontWeight: "700" },
  twoCol: { flexDirection: "row", gap: 12 },
  bmiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  bmiLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bmiVal: { fontSize: 28, fontWeight: "900" },
  bmiStatus: { fontSize: 13 },
  dayRow: { flexDirection: "row", gap: 9 },
  dayBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  dayNum: { fontSize: 22, fontWeight: "900" },
  dayLbl: { fontSize: 9, fontWeight: "600", marginTop: 2 },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  timeBtn: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  timeEmoji: { fontSize: 18 },
  timeTxt: { fontSize: 13, fontWeight: "600" },
  stressRow: { flexDirection: "row", gap: 9 },
  stressBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
  },
  stressEmoji: { fontSize: 22 },
  stressTxt: { fontSize: 12, fontWeight: "700" },
  yaraCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  yaraTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  yaraAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  yaraName: { color: "#fff", fontSize: 17, fontWeight: "800" },
  yaraRole: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  yaraBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  yaraBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  yaraMsg: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 22 },
  card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  targetsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  targetBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  targetBig: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  targetUnit: { fontSize: 11, marginTop: 2 },
  targetLbl: { fontSize: 10, marginTop: 6, fontWeight: "600" },
  calNoteBox: { borderRadius: 12, padding: 12, borderWidth: 1 },
  calNoteTxt: { fontSize: 12, lineHeight: 18 },
  planDayWrap: { paddingVertical: 14 },
  planDayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  planDayNum: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  planDayNumTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  planDayName: { fontSize: 14, fontWeight: "700" },
  planDayMeta: { fontSize: 11, marginTop: 2 },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    marginBottom: 6,
  },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { flex: 1, fontSize: 12 },
  exSets: { fontSize: 11, fontWeight: "700" },
  exRest: { fontSize: 10, marginLeft: 4 },
  coachTipBox: { borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1 },
  coachTipTxt: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
  },
  noteIcon: { fontSize: 20, marginTop: 1 },
  noteTxt: { flex: 1, fontSize: 13, lineHeight: 20 },
  cta: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
  },
  ctaTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  backBtn: { alignItems: "center", paddingVertical: 14 },
  backTxt: { fontSize: 14 },
  skipTxt: { fontSize: 13, fontWeight: "500" },
});
