import { useRef, useState } from "react";
import { Animated } from "react-native";
import { generateAIPlan } from "../lib/groqAPI";
import {
  calcBMR,
  calcTDEE,
  calcCalTarget,
  calcProtein,
  calcBMI,
} from "../lib/calculations";
import { STEPS } from "../constants/onBoardingData";

import {
  getProfile,
  saveOnboardingProfile,
  saveCalorieTargets,
} from "../services/profileService";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { error as logError } from '../lib/logger';

export function useOnboarding() {
  const { user: authUser } = useAuth();
  const [step, setStep] = useState(0);
  const [aiPlan, setAiPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  // Step answers
  const [coachName, setCoachName] = useState("Yara");
  const [goal, setGoal] = useState(null);
  const [gender, setGender] = useState(null);
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetW, setTargetW] = useState("");
  const [activity, setActivity] = useState(null);
  const [experience, setExperience] = useState(null);
  const [injuries, setInjuries] = useState([]);
  const [days, setDays] = useState(null);
  const [duration, setDuration] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [focus, setFocus] = useState([]);
  const [sleep, setSleep] = useState(null);
  const [stress, setStress] = useState(null);
  const [diet, setDiet] = useState(null);

  // Derived calculations
  const bmr = calcBMR({ gender, weight, height, dob }); // ← dob not age
  const tdee = calcTDEE(bmr, activity);
  const calTarget = calcCalTarget(tdee, goal);
  const protein = calcProtein(weight);
  const bmi = calcBMI(weight, height);

  // Multi-select toggles
  const toggleInjury = (id) => {
    if (id === "none") {
      setInjuries(["none"]);
      return;
    }
    setInjuries((p) =>
      p.filter((x) => x !== "none").includes(id)
        ? p.filter((x) => x !== id)
        : [...p.filter((x) => x !== "none"), id],
    );
  };

  const toggleFocus = (id) => {
    setFocus((p) =>
      p.includes(id)
        ? p.filter((x) => x !== id)
        : p.length < 3
          ? [...p, id]
          : p,
    );
  };

  // Per-step validation
  const canGo = [
    !!goal,
    !!(gender && dob && dob.length === 10 && height && weight && activity), // ← dob
    !!experience,
    !!(days && duration && timeOfDay),
    !!equipment,
    !!(sleep && stress && diet),
    !!(coachName && coachName.trim().length > 0 && /^[a-zA-Z0-9 ]+$/.test(coachName.trim())),
    true,
  ][step];

  const animateTo = (next) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(progress, {
        toValue: (next + 1) / STEPS.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const getAnswers = () => ({
    coachName: coachName.trim() || "Yara",
    goal,
    gender,
    dob,
    height,
    weight,
    targetW,
    activity,
    experience, // ← dob
    injuries,
    days,
    duration,
    timeOfDay,
    equipment,
    focus,
    sleep,
    stress,
    diet,
    calTarget,
    protein,
    bmr,
    tdee,
  });

  const retryPlan = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const plan = await generateAIPlan(getAnswers());
      setAiPlan(plan);
    } catch {
      setLoadError("Still having trouble. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = async (onComplete) => {
    if (step === 6) {
      animateTo(7);
      setLoading(true);
      setLoadError(null);
      try {
        const plan = await generateAIPlan(getAnswers());
        setAiPlan(plan);
      } catch (err) {
        logError("AI plan error:", err);
        setLoadError("Could not generate your plan. Tap retry.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < STEPS.length - 1) {
      animateTo(step + 1);
      return;
    }

    // Final step — save everything to Supabase then complete
    setSavingProfile(true);
    setLoadError(null);
    try {
      if (!authUser) {
        throw new Error("No authenticated user found");
      }
      const user = authUser;

      const answers = getAnswers();

      await saveOnboardingProfile(user.id, answers); // → profiles
      await saveCalorieTargets(user.id, answers); // �� calorie_targets

      // Save AI plan to training_plans table if one was generated
      if (aiPlan?.days?.length) {
        await supabase
          .from('training_plans')
          .upsert(
            { user_id: user.id, plan_json: aiPlan, created_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          );
      }

      onComplete?.();
    } catch (err) {
      logError("Failed to save onboarding:", err);
      setLoadError(
        err.message || "Failed to save your profile. Please try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return {
    // Step state
    step,
    animateTo,
    goNext,
    canGo,
    progressWidth,
    // Theme
    fade,
    // Form values & setters
    goal,
    setGoal,
    gender,
    setGender,
    dob,
    setDob,
    height,
    setHeight,
    weight,
    setWeight,
    targetW,
    setTargetW,
    activity,
    setActivity,
    experience,
    setExperience,
    injuries,
    toggleInjury,
    days,
    setDays,
    duration,
    setDuration,
    timeOfDay,
    setTimeOfDay,
    equipment,
    setEquipment,
    focus,
    toggleFocus,
    sleep,
    setSleep,
    stress,
    setStress,
    diet,
    setDiet,
    coachName,
    setCoachName,
    // Derived
    bmi,
    calTarget,
    protein,
    tdee,
    // AI plan
    aiPlan,
    loading,
    savingProfile,
    loadError,
    retryPlan,
  };
}
