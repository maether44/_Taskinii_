import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppEvents, emit, on } from '../lib/eventBus';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Linking,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { error as logError } from '../lib/logger';
import { calcMacroTargets, normalizeGoal } from '../lib/calculations';
import { AVATAR_BUCKET, buildAvatarPath, getLocalAvatarForUser, saveLocalAvatarForUser } from '../lib/avatar';
import { refreshAfterProfileUpdate } from '../services/embeddingService';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#6B5F8A',
  green: '#34C759',
  orange: '#FF9500',
};

const GOAL_LABELS = {
  lose_fat: 'Lose Fat 🔥',
  fat_loss: 'Lose Fat 🔥',
  gain_muscle: 'Build Muscle 💪',
  muscle_gain: 'Build Muscle 💪',
  maintain: 'Stay Fit ⚖️',
  gain_weight: 'Gain Weight 🍽️',
  build_habits: 'Build Habits 🧠',
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  very_active: 'Athlete',
};

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const TIME_TO_HOUR = {
  morning: 7,
  afternoon: 13,
  evening: 18,
  any: 8,
};

const HELP_CENTER_URL = 'https://github.com/maether44/BodyQ#readme';
const REPORT_ISSUE_URL = 'https://github.com/maether44/BodyQ/issues/new';

const NOTIFICATION_PREFS_KEY = 'bodyq_notification_prefs';

const EDITABLE_GOALS = [
  { id: 'lose_fat', label: 'Lose Fat' },
  { id: 'gain_muscle', label: 'Build Muscle' },
  { id: 'gain_weight', label: 'Gain Weight' },
  { id: 'maintain', label: 'Stay Fit' },
  { id: 'build_habits', label: 'Build Habits' },
];

const EDITABLE_GENDERS = ['male', 'female', 'other'];

function getEncouragement(level) {
  const messages = [
    'Welcome to BodyQ! Start your fitness journey today.',
    'Great start! Keep up the momentum.',
    "You're building habits! Consistency is key.",
    'Halfway there! Your body is transforming.',
    "Amazing progress! You're a fitness enthusiast now.",
    "Elite level! You're inspiring others.",
    "Legend status! You've mastered the game.",
  ];
  return messages[Math.min(level - 1, messages.length - 1)] || 'Keep pushing your limits!';
}

function calcAgeFromISO(isoDate) {
  if (!isoDate) return null;
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const passed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return passed ? age : age - 1;
}

function calcBMRDirect(gender, weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return 0;
  return Math.round(
    gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5,
  );
}

function Row({ label, value, color }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color && { color }]}>{value ?? '—'}</Text>
    </View>
  );
}

export default function Profile({ replayTour }) {
  const navigation = useNavigation();
  const { signOut, user: authUser, profileAvatarUri, setProfileAvatarUri } = useAuth();

  const [profile, setProfile] = useState(null);
  const [calorieTarget, setCalorieTarget] = useState(null);
  const [proteinTarget, setProteinTarget] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifWater, setNotifWater] = useState(true);
  const [notifMeal, setNotifMeal] = useState(false);
  const [xpInfo, setXpInfo] = useState({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
  const [achievements, setAchievements] = useState([]);
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    gender: 'male',
    height_cm: '',
    weight_kg: '',
    target_weight_kg: '',
    goal: 'maintain',
    activity_level: 'moderate',
  });

  const loadProfileData = useCallback(async () => {
    if (!authUser?.id) return;
    setLoadingProfile(true);
    try {
      const localAvatarUri = await getLocalAvatarForUser(authUser.id).catch(() => null);
      const [{ data: cal }, profileResult] = await Promise.all([
        supabase
          .from('calorie_targets')
          .select('daily_calories, protein_target')
          .eq('user_id', authUser.id)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select(
            'full_name, bio, city, country, date_of_birth, gender, height_cm, weight_kg, goal, activity_level, target_weight_kg, avatar_url',
          )
          .eq('id', authUser.id)
          .single(),
      ]);

      let prof = profileResult?.data;

      if (profileResult?.error && /avatar_url/i.test(profileResult.error.message || '')) {
        const { data: fallbackProf, error: fallbackError } = await supabase
          .from('profiles')
          .select(
            'full_name, bio, city, country, date_of_birth, gender, height_cm, weight_kg, goal, activity_level, target_weight_kg, xp_current, level',
          )
          .eq('id', authUser.id)
          .single();
        if (fallbackError) throw fallbackError;
        prof = fallbackProf;
      } else if (profileResult?.error) {
        throw profileResult.error;
      }

      setProfile(
        prof
          ? {
              ...prof,
              goal: normalizeGoal(prof.goal),
              avatar_path: prof.avatar_url || null,
              avatar_url: localAvatarUri || profileAvatarUri || null,
            }
          : null,
      );

      if (cal) {
        setCalorieTarget(cal.daily_calories);
        setProteinTarget(cal.protein_target);
      }

      try {
        const { data: xpData, error: xpError } = await supabase.rpc('get_user_level_info', {
          p_user_id: authUser.id,
        });
        setXpInfo(
          !xpError && xpData ? xpData : { level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 },
        );
      } catch {
        setXpInfo({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
      }

      try {
        const { data: achData, error: achError } = await supabase.rpc('get_all_achievements', {
          p_user_id: authUser.id,
        });
        setAchievements(!achError && achData?.achievements ? achData.achievements : []);
      } catch {
        setAchievements([]);
      }
    } catch (error) {
      logError('Profile screen load error:', error);
      Alert.alert('Profile load issue', 'We could not load your latest profile details right now.');
    } finally {
      setLoadingProfile(false);
    }
  }, [authUser?.id, profileAvatarUri]);

  useEffect(() => {
    const loadNotificationPrefs = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        setNotifWorkout(parsed.workout ?? true);
        setNotifWater(parsed.water ?? true);
        setNotifMeal(parsed.meal ?? false);
      } catch {
        // Keep local defaults if storage is unavailable.
      }
    };

    loadNotificationPrefs();
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData]),
  );

  useEffect(() => {
    const unsubs = [
      on(AppEvents.PROFILE_UPDATED, loadProfileData),
      on(AppEvents.XP_AWARDED, loadProfileData),
      on(AppEvents.ACHIEVEMENT_AWARDED, loadProfileData),
      on(AppEvents.STREAK_MILESTONE, loadProfileData),
      on(AppEvents.WORKOUT_COMPLETED, loadProfileData),
      on(AppEvents.TARGETS_UPDATED, loadProfileData),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [loadProfileData]);

  if (loadingProfile) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  const name = profile?.full_name || authUser?.user_metadata?.full_name || 'User';
  const age = calcAgeFromISO(profile?.date_of_birth);
  const gender = profile?.gender || 'male';
  const heightCm = profile?.height_cm;
  const weightKg = profile?.weight_kg;
  const goalWeightKg = profile?.target_weight_kg;
  const activityLevel = profile?.activity_level || 'moderate';
  const goal = normalizeGoal(profile?.goal) || 'maintain';
  const avatarUri = profile?.avatar_url || null;

  const bmr = calcBMRDirect(gender, weightKg, heightCm, age);
  const tdee = bmr ? Math.round(bmr * (ACTIVITY_MULT[activityLevel] || 1.55)) : 0;
  const calTarget =
    calorieTarget ||
    (goal === 'lose_fat'
      ? tdee - 400
      : goal === 'gain_muscle'
        ? tdee + 200
        : goal === 'gain_weight'
          ? tdee + 400
          : tdee);
  const protein = proteinTarget || (weightKg ? Math.round(weightKg * 2) : 0);

  const bmiVal = heightCm && weightKg ? (weightKg / (heightCm / 100) ** 2).toFixed(1) : null;
  const bmiNum = bmiVal ? parseFloat(bmiVal) : null;
  const bmiStatus = !bmiNum
    ? '—'
    : bmiNum < 18.5
      ? 'Underweight'
      : bmiNum < 25
        ? 'Normal'
        : bmiNum < 30
          ? 'Overweight'
          : 'Obese';
  const bmiColor = bmiNum >= 18.5 && bmiNum < 25 ? C.green : C.orange;
  const goalNote =
    goal === 'lose_fat'
      ? '400 kcal deficit for steady fat loss (~0.4 kg/week)'
      : goal === 'gain_muscle'
        ? '200 kcal surplus for lean muscle building'
        : 'Maintenance calories — staying fit and healthy';
  const goalDescription =
    goal === 'gain_weight' ? '400 kcal surplus to support healthy weight gain' : goalNote;

  // ── Edit Body Stats ────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditForm({
      full_name: profile?.full_name || name || '',
      gender: gender || 'male',
      height_cm: heightCm ? String(heightCm) : '',
      weight_kg: weightKg ? String(weightKg) : '',
      target_weight_kg: goalWeightKg ? String(goalWeightKg) : '',
      goal: goal || 'maintain',
      activity_level: activityLevel || 'moderate',
    });
    setEditVisible(true);
  };

  const updateEditField = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const handleWorkoutToggle = async (nextValue) => {
    setNotifWorkout(nextValue);
    try {
      const nextPrefs = { workout: nextValue, water: notifWater, meal: notifMeal };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(nextPrefs));

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log(
          '[ProfileNotifications] Workout toggle changed, but notification permission is not granted.',
        );
        return;
      }

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const workoutScheduled = scheduled.filter(
        (n) => n.identifier === 'workout-time' || n.identifier.startsWith('workout-'),
      );
      await Promise.all(
        workoutScheduled.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
      );

      if (nextValue) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('preferred_workout_time')
          .eq('id', authUser.id)
          .maybeSingle();

        const hour = TIME_TO_HOUR[profileData?.preferred_workout_time] ?? 8;
        const reminderTime = new Date();
        const now = new Date();
        reminderTime.setHours(hour, 0, 0, 0);
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        const workoutBody =
          profileData?.preferred_workout_time === 'any'
            ? "Don't forget to workout!"
            : 'Time to exercise!';

        await Notifications.scheduleNotificationAsync({
          identifier: 'workout-time',
          content: {
            title: 'BodyQ',
            body: workoutBody,
            sound: true,
          },
          trigger: { type: 'date', date: reminderTime },
        });
        console.log(
          `[ProfileNotifications] Workout reminders toggled on. Scheduled reminder for ${reminderTime.toLocaleString()}.`,
        );
        return;
      }

      console.log(
        `[ProfileNotifications] Workout reminders toggled off. Cancelled ${workoutScheduled.length} scheduled reminder(s).`,
      );
    } catch (error) {
      logError('[ProfileNotifications] Failed to cancel workout reminders:', error);
    }
  };

  const handleWaterToggle = async (nextValue) => {
    setNotifWater(nextValue);
    try {
      const nextPrefs = { workout: notifWorkout, water: nextValue, meal: notifMeal };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(nextPrefs));

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log(
          '[ProfileNotifications] Water toggle changed, but notification permission is not granted.',
        );
        return;
      }

      await Notifications.cancelScheduledNotificationAsync('hydration-5pm').catch(() => {});

      if (nextValue) {
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(17, 0, 0, 0);
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        await Notifications.scheduleNotificationAsync({
          identifier: 'hydration-5pm',
          content: {
            title: 'BodyQ',
            body: 'Reminder to drink water! 💧',
            sound: true,
          },
          trigger: { type: 'date', date: reminderTime },
        });
        console.log(
          `[ProfileNotifications] Water reminders toggled on. Scheduled reminder for ${reminderTime.toLocaleString()}.`,
        );
        return;
      }

      console.log(
        '[ProfileNotifications] Water reminders toggled off. Cancelled hydration reminder.',
      );
    } catch (error) {
      logError('[ProfileNotifications] Failed to cancel hydration reminder:', error);
    }
  };

  const handleMealToggle = async (nextValue) => {
    setNotifMeal(nextValue);
    try {
      const nextPrefs = { workout: notifWorkout, water: notifWater, meal: nextValue };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(nextPrefs));
      console.log(`[ProfileNotifications] Meal reminders toggled ${nextValue ? 'on' : 'off'}.`);
    } catch (error) {
      logError('[ProfileNotifications] Failed to update meal preference:', error);
    }
  };

  const saveProfileChanges = async () => {
    if (!authUser?.id) return;
    const nextGoal = normalizeGoal(editForm.goal) || 'maintain';
    const nextHeight = parseFloat(editForm.height_cm);
    const nextWeight = parseFloat(editForm.weight_kg);
    const nextTargetWeight = editForm.target_weight_kg
      ? parseFloat(editForm.target_weight_kg)
      : null;
    const nextAge = calcAgeFromISO(profile?.date_of_birth);
    const nextName = editForm.full_name.trim() || name;

    if (!nextHeight || !nextWeight) {
      Alert.alert('Missing info', 'Height and weight are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: nextName,
          gender: editForm.gender,
          height_cm: nextHeight,
          weight_kg: nextWeight,
          target_weight_kg: nextTargetWeight,
          goal: nextGoal,
          activity_level: editForm.activity_level,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);
      if (profileError) throw profileError;

      const nextBmr = calcBMRDirect(editForm.gender, nextWeight, nextHeight, nextAge);
      const nextTdee = nextBmr
        ? Math.round(nextBmr * (ACTIVITY_MULT[editForm.activity_level] || 1.55))
        : 0;
      const nextCalories =
        nextGoal === 'lose_fat'
          ? nextTdee - 400
          : nextGoal === 'gain_muscle'
            ? nextTdee + 200
            : nextGoal === 'gain_weight'
              ? nextTdee + 400
              : nextTdee;
      const macros = calcMacroTargets(nextCalories, nextGoal);
      const nextProtein = Math.round(nextWeight * 2);

      const { error: targetsError } = await supabase.from('calorie_targets').insert({
        user_id: authUser.id,
        daily_calories: nextCalories,
        protein_target: nextProtein || macros.protein_target,
        carbs_target: macros.carbs_target,
        fat_target: macros.fat_target,
        effective_from: new Date().toISOString().split('T')[0],
      });
      if (targetsError) throw targetsError;

      setProfile((prev) => ({
        ...prev,
        full_name: nextName,
        gender: editForm.gender,
        height_cm: nextHeight,
        weight_kg: nextWeight,
        target_weight_kg: nextTargetWeight,
        goal: nextGoal,
        activity_level: editForm.activity_level,
      }));
      setCalorieTarget(nextCalories);
      setProteinTarget(nextProtein || macros.protein_target);
      setEditVisible(false);
      emit(AppEvents.PROFILE_UPDATED, { userId: authUser.id });
      emit(AppEvents.TARGETS_UPDATED, { userId: authUser.id });
      refreshAfterProfileUpdate(authUser.id);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password Reset ─────────────────────────────────────────────────────────
  const openPwModal = () => {
    setPwForm({ newPassword: '', confirmPassword: '' });
    setPwModalVisible(true);
  };

  const saveNewPassword = async () => {
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      setPwModalVisible(false);
      setPwForm({ newPassword: '', confirmPassword: '' });
      Alert.alert('Done', 'Your password has been updated.');
    } catch (error) {
      Alert.alert('Failed', error?.message || 'Could not update password.');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Photo picker ───────────────────────────────────────────────────────────
  const pickProfilePhoto = async () => {
    if (!authUser?.id || uploadingPhoto) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      let base64 = asset.base64;
      if (!base64) {
        base64 = await FileSystemLegacy.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
      }
      if (!base64 || !String(base64).trim()) {
        throw new Error('Selected image is empty. Please pick another photo.');
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64}`;
      const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = buildAvatarPath(authUser.id, extension);

      await saveLocalAvatarForUser(authUser.id, dataUri);
      setProfileAvatarUri(dataUri);
      setProfile((prev) => ({ ...prev, avatar_url: dataUri, avatar_path: path }));

      const arrayBuffer = decode(base64);
      const bytes = new Uint8Array(arrayBuffer);
      if (!bytes.length) {
        throw new Error('Image bytes are empty after decode. Please pick another photo.');
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, bytes, {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: path, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);
      if (profileError) throw profileError;

      setProfileAvatarUri(dataUri);
      setProfile((prev) => ({ ...prev, avatar_url: dataUri, avatar_path: path }));
      Alert.alert('Photo updated', 'Your profile picture has been changed.');
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Could not update your profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
          <TouchableOpacity
            style={s.headerSettingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* ── Profile card ── */}
        <View style={s.profileCard}>
          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={pickProfilePhoto} activeOpacity={0.85}>
            <View style={s.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{name[0]?.toUpperCase()}</Text>
              )}
              {uploadingPhoto && (
                <View style={s.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
            <View style={s.avatarEditBadge}>
              <Text style={s.avatarEditBadgeTxt}>{uploadingPhoto ? '...' : 'Edit'}</Text>
            </View>
          </TouchableOpacity>

          {/* Info */}
          <View style={s.profileInfo}>
            <View style={s.profileNameRow}>
              <Text style={s.profileName}>{name}</Text>
              <TouchableOpacity
                style={s.editProfileBtn}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.85}
              >
                <Text style={s.editProfileBtnTxt}>Edit profile</Text>
              </TouchableOpacity>
            </View>
            {profile?.bio ? <Text style={s.profileBio}>{profile.bio}</Text> : null}
            {profile?.city || profile?.country ? (
              <Text style={s.profileLocation}>
                📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            <View style={s.goalChip}>
              <Text style={s.goalChipTxt}>{GOAL_LABELS[goal] || goal}</Text>
            </View>
          </View>
        </View>

        {/* ── XP card ── */}
        <View style={s.card}>
          <View style={s.xpRow}>
            <View>
              <Text style={s.cardLabel}>LEVEL {xpInfo.level}</Text>
              <Text style={s.xpCount}>
                {xpInfo.xp_current} / {xpInfo.xp_needed} XP
              </Text>
            </View>
            <Text style={s.xpEmoji}>⭐</Text>
          </View>
          <View style={s.xpBarBg}>
            <View
              style={[s.xpBarFill, { width: `${(xpInfo.xp_current / xpInfo.xp_needed) * 100}%` }]}
            />
          </View>
          <Text style={s.xpNext}>
            {xpInfo.xp_needed - xpInfo.xp_current} XP to Level {xpInfo.level + 1}
          </Text>
          <Text style={s.encouragement}>{getEncouragement(xpInfo.level)}</Text>
        </View>

        {/* ── Workout History button ── */}
        <TouchableOpacity
          style={s.historyBtn}
          onPress={() => navigation.navigate('WorkoutHistory')}
          activeOpacity={0.85}
        >
          <View style={s.historyBtnLeft}>
            <View style={s.historyBtnIcon}>
              <Text style={{ fontSize: 20 }}>🏋️</Text>
            </View>
            <View>
              <Text style={s.historyBtnTitle}>Workout History</Text>
              <Text style={s.historyBtnSub}>View all your past sessions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.sub} />
        </TouchableOpacity>

        {/* ── Body Stats card ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>BODY STATS</Text>
          <Row label="Age" value={age ? `${age} years` : null} />
          <Row
            label="Gender"
            value={gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : gender}
          />
          <Row label="Height" value={heightCm ? `${heightCm} cm` : null} />
          <Row label="Weight" value={weightKg ? `${weightKg} kg` : null} />
          <Row
            label="Target Weight"
            value={goalWeightKg ? `${goalWeightKg} kg` : null}
            color={C.lime}
          />
          <Row label="BMI" value={bmiVal ? `${bmiVal} (${bmiStatus})` : null} color={bmiColor} />
          <Row label="Activity" value={ACTIVITY_LABELS[activityLevel] || activityLevel} />
          <TouchableOpacity style={s.editBtn} onPress={openEditModal}>
            <Text style={s.editBtnTxt}>Edit Body Stats</Text>
          </TouchableOpacity>
        </View>

        {/* ── Targets card ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>YOUR TARGETS</Text>
          <Row label="BMR (base metabolism)" value={bmr ? `${bmr} kcal` : null} />
          <Row label="TDEE (maintenance)" value={tdee ? `${tdee} kcal` : null} />
          <Row
            label="Daily calorie target"
            value={calTarget ? `${calTarget} kcal` : null}
            color={C.lime}
          />
          <Row label="Protein goal" value={protein ? `${protein}g` : null} color={C.accent} />
          <Row label="Water target" value="2.5L / day" color="#0A84FF" />
          <View style={s.targetNote}>
            <Text style={s.targetNoteTxt}>{goalDescription}</Text>
          </View>
        </View>

        {/* ── Achievements card ── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>ACHIEVEMENTS</Text>
            <Text style={s.cardSub}>
              {achievements.filter((a) => a.earned).length}/{achievements.length} earned
            </Text>
          </View>
          <View style={s.badgesGrid}>
            {(showAllAchievements ? achievements : achievements.slice(0, 6)).map((a) => (
              <View key={a.id} style={[s.badge, !a.earned && s.badgeLocked]}>
                <View style={[s.badgeIconWrap, a.earned && s.badgeIconWrapEarned]}>
                  <Ionicons
                    name={a.earned ? (a.icon || 'trophy-outline') : 'lock-closed-outline'}
                    size={22}
                    color={a.earned ? C.purple : C.sub}
                  />
                </View>
                <Text style={[s.badgeLabel, !a.earned && s.badgeLabelLocked]}>{a.name}</Text>
                <Text style={[s.badgeXP, !a.earned && s.badgeXPLocked]}>+{a.xp_reward} XP</Text>
              </View>
            ))}
          </View>
          {achievements.length > 6 && (
            <TouchableOpacity
              style={s.seeMoreBtn}
              onPress={() => setShowAllAchievements(!showAllAchievements)}
              activeOpacity={0.8}
            >
              <Text style={s.seeMoreTxt}>
                {showAllAchievements ? 'Show Less' : `See ${achievements.length - 6} More`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Notifications card ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>NOTIFICATIONS</Text>
          {[
            { label: 'Workout Reminders', value: notifWorkout, set: handleWorkoutToggle },
            { label: 'Water Reminders', value: notifWater, set: handleWaterToggle },
            { label: 'Meal Log Reminders', value: notifMeal, set: handleMealToggle },
          ].map((n, i) => (
            <View key={i} style={[s.settingRow, i < 2 && s.settingRowBorder]}>
              <Text style={s.settingLabel}>{n.label}</Text>
              <Switch
                value={n.value}
                onValueChange={n.set}
                trackColor={{ false: C.border, true: C.purple + '80' }}
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

      {/* ── Edit Body Stats Modal ── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !savingProfile && setEditVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={s.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={s.modalKeyboardWrap}
            >
              <TouchableWithoutFeedback>
                <View style={s.modalCard}>
                  <View style={s.modalHandle} />
                  <ScrollView
                    contentContainerStyle={s.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={s.modalTitle}>Edit Body Stats</Text>

                    <Text style={s.modalLabel}>Goal</Text>
                    <View style={s.chipWrap}>
                      {EDITABLE_GOALS.map((option) => (
                        <Pressable
                          key={option.id}
                          style={[s.chip, editForm.goal === option.id && s.chipActive]}
                          onPress={() => updateEditField('goal', option.id)}
                        >
                          <Text
                            style={[s.chipText, editForm.goal === option.id && s.chipTextActive]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={s.modalLabel}>Gender</Text>
                    <View style={s.chipWrap}>
                      {EDITABLE_GENDERS.map((option) => (
                        <Pressable
                          key={option}
                          style={[s.chip, editForm.gender === option && s.chipActive]}
                          onPress={() => updateEditField('gender', option)}
                        >
                          <Text
                            style={[s.chipText, editForm.gender === option && s.chipTextActive]}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={s.modalLabel}>Height (cm)</Text>
                    <TextInput
                      style={s.modalInput}
                      value={editForm.height_cm}
                      onChangeText={(v) => updateEditField('height_cm', v)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="175"
                      placeholderTextColor={C.sub}
                    />

                    <Text style={s.modalLabel}>Weight (kg)</Text>
                    <TextInput
                      style={s.modalInput}
                      value={editForm.weight_kg}
                      onChangeText={(v) => updateEditField('weight_kg', v)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="75"
                      placeholderTextColor={C.sub}
                    />

                    <Text style={s.modalLabel}>Target Weight (kg)</Text>
                    <TextInput
                      style={s.modalInput}
                      value={editForm.target_weight_kg}
                      onChangeText={(v) => updateEditField('target_weight_kg', v)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="Optional"
                      placeholderTextColor={C.sub}
                    />

                    <Text style={s.modalLabel}>Activity Level</Text>
                    <View style={s.chipWrap}>
                      {Object.entries(ACTIVITY_LABELS).map(([id, label]) => (
                        <Pressable
                          key={id}
                          style={[s.chip, editForm.activity_level === id && s.chipActive]}
                          onPress={() => updateEditField('activity_level', id)}
                        >
                          <Text
                            style={[s.chipText, editForm.activity_level === id && s.chipTextActive]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={s.modalActions}>
                    <Pressable
                      style={[s.modalBtn, s.modalBtnSecondary]}
                      onPress={() => !savingProfile && setEditVisible(false)}
                    >
                      <Text style={s.modalBtnSecondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[s.modalBtn, s.modalBtnPrimary, savingProfile && s.modalBtnDisabled]}
                      onPress={saveProfileChanges}
                      disabled={savingProfile}
                    >
                      <Text style={s.modalBtnPrimaryText}>
                        {savingProfile ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Achievement Popup ── */}
      <Modal
        visible={!!achievementPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setAchievementPopup(null)}
      >
        <View style={s.popupOverlay}>
          <View style={s.popupContainer}>
            <View style={s.popupGlow} />
            <View style={s.popupContent}>
              <Text style={s.popupIcon}>{achievementPopup?.icon}</Text>
              <Text style={s.popupTitle}>Achievement Unlocked!</Text>
              <Text style={s.popupName}>{achievementPopup?.name}</Text>
              <Text style={s.popupDesc}>{achievementPopup?.description}</Text>
              <Text style={s.popupXP}>+{achievementPopup?.xp_reward} XP</Text>
              <Pressable style={s.popupBtn} onPress={() => setAchievementPopup(null)}>
                <Text style={s.popupBtnText}>Awesome!</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSettingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile card
  profileCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarWrap: { position: 'relative', alignItems: 'center' },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.accent,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,11,30,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: C.lime,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: C.card,
  },
  avatarEditBadgeTxt: { color: '#161230', fontSize: 10, fontWeight: '800' },

  profileInfo: { flex: 1 },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profileName: { color: C.text, fontSize: 20, fontWeight: '800', flex: 1 },
  profileBio: { color: C.sub, fontSize: 12, marginTop: 2, lineHeight: 17 },
  profileLocation: { color: C.sub, fontSize: 11, marginTop: 3 },
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.purple + '25',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.purple + '50',
  },
  goalChipTxt: { color: C.accent, fontSize: 11, fontWeight: '700' },

  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.purple + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.purple + '50',
  },
  editProfileBtnTxt: { color: C.accent, fontSize: 11, fontWeight: '700' },

  // History button
  historyBtn: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  historyBtnSub: { color: C.sub, fontSize: 11, marginTop: 2 },

  // Generic card
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
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSub: { color: C.sub, fontSize: 12 },

  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  xpCount: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  xpEmoji: { fontSize: 28 },
  xpBarBg: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: { height: 8, backgroundColor: C.lime, borderRadius: 4 },
  xpNext: { color: C.sub, fontSize: 11 },
  encouragement: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statLabel: { color: C.sub, fontSize: 13 },
  statValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  editBtn: {
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  editBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  targetNote: {
    backgroundColor: C.purple + '12',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.purple + '30',
  },
  targetNoteTxt: { color: C.accent, fontSize: 12, lineHeight: 18 },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '30%',
    borderWidth: 1,
    borderColor: C.purple + '40',
  },
  badgeLocked: { borderColor: C.border, opacity: 0.45 },
  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconWrapEarned: {
    backgroundColor: C.purple + '18',
    borderColor: C.purple + '50',
  },
  badgeLabel: { color: C.sub, fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  badgeLabelLocked: { opacity: 0.5 },
  badgeXP: { color: C.lime, fontSize: 9, fontWeight: '800' },
  badgeXPLocked: { opacity: 0.4 },
  seeMoreBtn: {
    alignSelf: 'center',
    backgroundColor: C.purple + '20',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.purple + '40',
  },
  seeMoreTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },

  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: { position: 'relative', alignItems: 'center' },
  popupGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: C.lime,
    opacity: 0.3,
    top: -50,
  },
  popupContent: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.lime,
    minWidth: 280,
  },
  popupIcon: { fontSize: 48, marginBottom: 16 },
  popupTitle: { color: C.lime, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  popupName: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupDesc: { color: C.sub, fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  popupXP: { color: C.lime, fontSize: 16, fontWeight: '800', marginBottom: 20 },
  popupBtn: {
    backgroundColor: C.lime,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  popupBtnText: { color: C.card, fontSize: 16, fontWeight: '700' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { color: C.text, fontSize: 14 },

  supportBtn: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportBtnSpacing: { marginTop: 10 },
  supportBtnTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  supportBtnSub: { color: C.sub, fontSize: 11, marginTop: 3 },

  changePwBtn: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  changePwTxt: { color: C.accent, fontSize: 14, fontWeight: '700' },

  tourBtn: {
    backgroundColor: C.purple,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  tourBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  signOutBtn: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 6,
  },
  signOutTxt: { color: '#FF3B30', fontSize: 14, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalKeyboardWrap: { justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.sub,
    opacity: 0.45,
    marginBottom: 14,
  },
  modalScrollContent: { paddingBottom: 12 },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalSubtitle: { color: C.sub, fontSize: 13, marginBottom: 16 },
  modalLabel: { color: C.sub, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  modalInput: {
    backgroundColor: C.bg,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: C.purple + '20', borderColor: C.purple },
  chipText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: C.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: C.purple },
  modalBtnSecondary: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  modalBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalBtnSecondaryText: { color: C.text, fontSize: 15, fontWeight: '700' },
  modalBtnDisabled: { opacity: 0.7 },
  pwMatchHint: { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
