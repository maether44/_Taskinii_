import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { calcMacroTargets, normalizeGoal } from '../lib/calculations';
import { AVATAR_BUCKET, buildAvatarPath, cacheAvatarLocally, getLocalAvatarForUser, saveLocalAvatarForUser } from '../lib/avatar';

const C = {
  bg:'#0F0B1E', card:'#161230', border:'#1E1A35',
  purple:'#7C5CFC', lime:'#C8F135', accent:'#9D85F5',
  text:'#FFFFFF', sub:'#6B5F8A', green:'#34C759', orange:'#FF9500',
};

const GOAL_LABELS = {
  lose_fat:     'Lose Fat 🔥',
  fat_loss:     'Lose Fat 🔥',
  gain_muscle:  'Build Muscle 💪',
  muscle_gain:  'Build Muscle 💪',
  maintain:     'Stay Fit ⚖️',
  gain_weight:  'Gain Weight 🍽️',
  build_habits: 'Build Habits 🧠',
};

const ACTIVITY_LABELS = {
  sedentary:   'Sedentary',
  light:       'Lightly Active',
  moderate:    'Moderately Active',
  active:      'Very Active',
  very_active: 'Athlete',
};

const ACTIVITY_MULT = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

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
    "Welcome to BodyQ! Start your fitness journey today.",
    "Great start! Keep up the momentum.",
    "You're building habits! Consistency is key.",
    "Halfway there! Your body is transforming.",
    "Amazing progress! You're a fitness enthusiast now.",
    "Elite level! You're inspiring others.",
    "Legend status! You've mastered the game.",
  ];
  return messages[Math.min(level - 1, messages.length - 1)] || "Keep pushing your limits!";
}

function calcAgeFromISO(isoDate) {
  if (!isoDate) return null;
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const passed = today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return passed ? age : age - 1;
}

function calcBMRDirect(gender, weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return 0;
  return Math.round(
    gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5
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

export default function Profile({ navigate, replayTour }) {
  const { signOut, user: authUser, profileAvatarUri, setProfileAvatarUri } = useAuth();
  const [profile, setProfile] = useState(null);
  const [calorieTarget, setCalorieTarget] = useState(null);
  const [proteinTarget, setProteinTarget] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifWater,   setNotifWater  ] = useState(true);
  const [xpInfo, setXpInfo] = useState({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
  const [achievements, setAchievements] = useState([]);
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [notifMeal,    setNotifMeal   ] = useState(false);
  const [editForm, setEditForm] = useState({
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
          .select('full_name, date_of_birth, gender, height_cm, weight_kg, goal, activity_level, target_weight_kg, avatar_url')
          .eq('id', authUser.id)
          .single(),
      ]);

      let prof = profileResult?.data;

      if (profileResult?.error && /avatar_url/i.test(profileResult.error.message || '')) {
        const { data: fallbackProf, error: fallbackError } = await supabase
          .from('profiles')
          .select('full_name, date_of_birth, gender, height_cm, weight_kg, goal, activity_level, target_weight_kg, xp_current, level')
          .eq('id', authUser.id)
          .single();

        if (fallbackError) throw fallbackError;
        prof = fallbackProf;
      } else if (profileResult?.error) {
        throw profileResult.error;
      }

      setProfile(prof ? {
        ...prof,
        goal: normalizeGoal(prof.goal),
        avatar_path: prof.avatar_url || null,
        avatar_url: localAvatarUri || profileAvatarUri || null,
      } : null);
      if (cal) {
        setCalorieTarget(cal.daily_calories);
        setProteinTarget(cal.protein_target);
      }

      // Load XP info
      try {
        const { data: xpData, error: xpError } = await supabase.rpc('get_user_level_info', { p_user_id: authUser.id });
        if (!xpError && xpData) {
          setXpInfo(xpData);
        } else {
          setXpInfo({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
        }
      } catch (e) {
        console.error('XP load error:', e);
        setXpInfo({ level: 1, xp_current: 0, xp_total: 0, xp_needed: 100 });
      }

      // Load achievements
      try {
        const { data: achData, error: achError } = await supabase.rpc('get_all_achievements', { p_user_id: authUser.id });
        if (!achError && achData?.achievements) {
          setAchievements(achData.achievements);
        } else {
          setAchievements([]);
        }
      } catch (e) {
        console.error('Achievements load error:', e);
        setAchievements([]);
      }

    } catch (error) {
      console.error('Profile screen load error:', error);
      Alert.alert('Profile load issue', 'We could not load your latest profile details right now.');
    } finally {
      setLoadingProfile(false);
    }
  }, [authUser?.id, profileAvatarUri]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(useCallback(() => {
    if (!authUser?.id) return;
    loadProfileData();
  }, [authUser?.id, loadProfileData]));

  if (loadingProfile) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  const name         = profile?.full_name || authUser?.user_metadata?.full_name || 'User';
  const email        = authUser?.email || '';
  const age          = calcAgeFromISO(profile?.date_of_birth);
  const gender       = profile?.gender || 'male';
  const heightCm     = profile?.height_cm;
  const weightKg     = profile?.weight_kg;
  const goalWeightKg = profile?.target_weight_kg;
  const activityLevel= profile?.activity_level || 'moderate';
  const goal         = normalizeGoal(profile?.goal) || 'maintain';

  const bmr      = calcBMRDirect(gender, weightKg, heightCm, age);
  const tdee     = bmr ? Math.round(bmr * (ACTIVITY_MULT[activityLevel] || 1.55)) : 0;
  const calTarget = calorieTarget || (
    goal === 'lose_fat'
      ? tdee - 400
      : goal === 'gain_muscle'
        ? tdee + 200
        : goal === 'gain_weight'
          ? tdee + 400
          : tdee
  );
  const protein  = proteinTarget || (weightKg ? Math.round(weightKg * 2) : 0);

  const bmiVal    = heightCm && weightKg ? (weightKg / ((heightCm / 100) ** 2)).toFixed(1) : null;
  const bmiNum    = bmiVal ? parseFloat(bmiVal) : null;
  const bmiStatus = !bmiNum ? '—' : bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
  const bmiColor  = bmiNum >= 18.5 && bmiNum < 25 ? C.green : C.orange;
  const goalNote  = goal === 'lose_fat'
    ? '400 kcal deficit for steady fat loss (~0.4 kg/week)'
    : goal === 'gain_muscle'
    ? '200 kcal surplus for lean muscle building'
    : 'Maintenance calories — staying fit and healthy';

  const goalDescription = goal === 'gain_weight'
    ? '400 kcal surplus to support healthy weight gain'
    : goalNote;
  const avatarUri = profile?.avatar_url || null;

  const openEditModal = () => {
    setEditForm({
      gender: gender || 'male',
      height_cm: heightCm ? String(heightCm) : '',
      weight_kg: weightKg ? String(weightKg) : '',
      target_weight_kg: goalWeightKg ? String(goalWeightKg) : '',
      goal: goal || 'maintain',
      activity_level: activityLevel || 'moderate',
    });
    setEditVisible(true);
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfileChanges = async () => {
    if (!authUser?.id) return;

    const nextGoal = normalizeGoal(editForm.goal) || 'maintain';
    const nextHeight = parseFloat(editForm.height_cm);
    const nextWeight = parseFloat(editForm.weight_kg);
    const nextTargetWeight = editForm.target_weight_kg ? parseFloat(editForm.target_weight_kg) : null;
    const nextAge = calcAgeFromISO(profile?.date_of_birth);

    if (!nextHeight || !nextWeight) {
      Alert.alert('Missing info', 'Height and weight are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
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
      const nextTdee = nextBmr ? Math.round(nextBmr * (ACTIVITY_MULT[editForm.activity_level] || 1.55)) : 0;
      const nextCalories = nextGoal === 'lose_fat'
        ? nextTdee - 400
        : nextGoal === 'gain_muscle'
          ? nextTdee + 200
          : nextGoal === 'gain_weight'
            ? nextTdee + 400
            : nextTdee;
      const macros = calcMacroTargets(nextCalories, nextGoal);
      const nextProtein = Math.round(nextWeight * 2);

      const { error: targetsError } = await supabase
        .from('calorie_targets')
        .insert({
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
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const pickProfilePhoto = async () => {
    if (!authUser?.id || uploadingPhoto) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile picture.');
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
        // Fallback: read the file manually
        base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64}`;
      const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = buildAvatarPath(authUser.id, extension);

      await saveLocalAvatarForUser(authUser.id, dataUri);
      setProfileAvatarUri(dataUri);

      setProfile((prev) => ({ ...prev, avatar_url: dataUri, avatar_path: path }));

      // Convert base64 to blob for upload
      const response = await fetch(dataUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase
        .storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, {
          contentType: asset.mimeType || 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: path,
          updated_at: new Date().toISOString(),
        })
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

        <View style={s.header}><Text style={s.title}>Profile</Text></View>

        <View style={s.profileCard}>
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
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{name}</Text>
            <Text style={s.profileEmail}>{email}</Text>
            <View style={s.goalChip}>
              <Text style={s.goalChipTxt}>{GOAL_LABELS[goal] || goal}</Text>
            </View>
            <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.8}>
              <Text style={s.changePhotoTxt}>{uploadingPhoto ? 'Uploading photo...' : 'Change profile photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.xpRow}>
            <View>
              <Text style={s.cardLabel}>LEVEL {xpInfo.level}</Text>
              <Text style={s.xpCount}>{xpInfo.xp_current} / {xpInfo.xp_needed} XP</Text>
            </View>
            <Text style={s.xpEmoji}>⭐</Text>
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${(xpInfo.xp_current / xpInfo.xp_needed) * 100}%` }]} />
          </View>
          <Text style={s.xpNext}>{xpInfo.xp_needed - xpInfo.xp_current} XP to Level {xpInfo.level + 1}</Text>
          <Text style={s.encouragement}>{getEncouragement(xpInfo.level)}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>BODY STATS</Text>
          <Row label="Age"           value={age ? `${age} years` : null} />
          <Row label="Gender"        value={gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : gender} />
          <Row label="Height"        value={heightCm ? `${heightCm} cm` : null} />
          <Row label="Weight"        value={weightKg ? `${weightKg} kg` : null} />
          <Row label="Target Weight" value={goalWeightKg ? `${goalWeightKg} kg` : null} color={C.lime} />
          <Row label="BMI"           value={bmiVal ? `${bmiVal} (${bmiStatus})` : null} color={bmiColor} />
          <Row label="Activity"      value={ACTIVITY_LABELS[activityLevel] || activityLevel} />
          <TouchableOpacity style={s.editBtn} onPress={openEditModal}>
            <Text style={s.editBtnTxt}>Edit Body Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>YOUR TARGETS</Text>
          <Row label="BMR (base metabolism)" value={bmr ? `${bmr} kcal` : null} />
          <Row label="TDEE (maintenance)"    value={tdee ? `${tdee} kcal` : null} />
          <Row label="Daily calorie target"  value={calTarget ? `${calTarget} kcal` : null} color={C.lime} />
          <Row label="Protein goal"          value={protein ? `${protein}g` : null} color={C.accent} />
          <Row label="Water target"          value="2.5L / day" color="#0A84FF" />
          <View style={s.targetNote}>
            <Text style={s.targetNoteTxt}>{goalDescription}</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>ACHIEVEMENTS</Text>
            <Text style={s.cardSub}>{achievements.filter(a => a.earned).length}/{achievements.length} earned</Text>
          </View>
          <View style={s.badgesGrid}>
            {(showAllAchievements ? achievements : achievements.slice(0, 6)).map(a => (
              <View key={a.id} style={[s.badge, !a.earned && s.badgeLocked]}>
                <Text style={s.badgeIcon}>{a.earned ? a.icon : '🔒'}</Text>
                <Text style={[s.badgeLabel, !a.earned && { opacity:0.4 }]}>{a.name}</Text>
                <Text style={[s.badgeXP, !a.earned && { opacity:0.4 }]}>+{a.xp_reward} XP</Text>
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

        <View style={s.card}>
          <Text style={s.cardLabel}>NOTIFICATIONS</Text>
          {[
            { label:'Workout Reminders',  value:notifWorkout, set:setNotifWorkout },
            { label:'Water Reminders',    value:notifWater,   set:setNotifWater   },
            { label:'Meal Log Reminders', value:notifMeal,    set:setNotifMeal    },
          ].map((n, i) => (
            <View key={i} style={[s.settingRow, i < 2 && s.settingRowBorder]}>
              <Text style={s.settingLabel}>{n.label}</Text>
              <Switch
                value={n.value}
                onValueChange={n.set}
                trackColor={{ false:C.border, true:C.purple+'80' }}
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

        <View style={{ height:28 }} />
      </ScrollView>

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
                    <Text style={s.modalTitle}>Edit Profile</Text>

                    <Text style={s.modalLabel}>Goal</Text>
                    <View style={s.chipWrap}>
                      {EDITABLE_GOALS.map((option) => (
                        <Pressable
                          key={option.id}
                          style={[
                            s.chip,
                            editForm.goal === option.id && s.chipActive,
                          ]}
                          onPress={() => updateEditField('goal', option.id)}
                        >
                          <Text style={[
                            s.chipText,
                            editForm.goal === option.id && s.chipTextActive,
                          ]}>
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
                          style={[
                            s.chip,
                            editForm.gender === option && s.chipActive,
                          ]}
                          onPress={() => updateEditField('gender', option)}
                        >
                          <Text style={[
                            s.chipText,
                            editForm.gender === option && s.chipTextActive,
                          ]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={s.modalLabel}>Height (cm)</Text>
                    <TextInput
                      style={s.modalInput}
                      value={editForm.height_cm}
                      onChangeText={(value) => updateEditField('height_cm', value)}
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
                      onChangeText={(value) => updateEditField('weight_kg', value)}
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
                      onChangeText={(value) => updateEditField('target_weight_kg', value)}
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
                          style={[
                            s.chip,
                            editForm.activity_level === id && s.chipActive,
                          ]}
                          onPress={() => updateEditField('activity_level', id)}
                        >
                          <Text style={[
                            s.chipText,
                            editForm.activity_level === id && s.chipTextActive,
                          ]}>
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

      {/* Achievement Popup */}
      <Modal
        visible={!!achievementPopup}
        transparent={true}
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
              <Pressable
                style={s.popupBtn}
                onPress={() => setAchievementPopup(null)}
              >
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
  root:   { flex:1, backgroundColor:C.bg },
  scroll: { paddingHorizontal:16, paddingTop:52, paddingBottom:20 },
  header: { marginBottom:20 },
  title:  { color:C.text, fontSize:26, fontWeight:'800', letterSpacing:-0.5 },
  profileCard:  { backgroundColor:C.card, borderRadius:20, padding:18, marginBottom:14, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:16 },
  avatarWrap:   { position:'relative', alignItems:'center' },
  avatarCircle: { width:92, height:92, borderRadius:46, backgroundColor:C.purple, alignItems:'center', justifyContent:'center', borderWidth:3, borderColor:C.accent, overflow:'hidden' },
  avatarImage:  { width:'100%', height:'100%' },
  avatarText:   { color:'#fff', fontSize:38, fontWeight:'900' },
  avatarOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(15,11,30,0.58)', alignItems:'center', justifyContent:'center' },
  avatarEditBadge:{ position:'absolute', bottom:-6, backgroundColor:C.lime, borderRadius:999, paddingHorizontal:10, paddingVertical:4, borderWidth:2, borderColor:C.card },
  avatarEditBadgeTxt:{ color:'#161230', fontSize:11, fontWeight:'800' },
  profileInfo:  { flex:1 },
  profileName:  { color:C.text, fontSize:20, fontWeight:'800' },
  profileEmail: { color:C.sub, fontSize:13, marginTop:2 },
  goalChip:     { alignSelf:'flex-start', backgroundColor:C.purple+'25', borderRadius:10, paddingHorizontal:10, paddingVertical:4, marginTop:8, borderWidth:1, borderColor:C.purple+'50' },
  goalChipTxt:  { color:C.accent, fontSize:11, fontWeight:'700' },
  changePhotoTxt:{ color:C.lime, fontSize:12, fontWeight:'700', marginTop:10 },
  card:         { backgroundColor:C.card, borderRadius:20, padding:18, marginBottom:14, borderWidth:1, borderColor:C.border },
  cardLabel:    { color:C.sub, fontSize:10, fontWeight:'800', letterSpacing:1.2, marginBottom:14 },
  cardTitleRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  cardSub:      { color:C.sub, fontSize:12 },
  xpRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 },
  xpCount:   { color:C.text, fontSize:16, fontWeight:'700', marginTop:4 },
  xpEmoji:   { fontSize:28 },
  xpBarBg:   { height:8, backgroundColor:C.border, borderRadius:4, overflow:'hidden', marginBottom:8 },
  xpBarFill: { height:8, backgroundColor:C.lime, borderRadius:4 },
  xpNext:    { color:C.sub, fontSize:11 },
  encouragement: { color:C.accent, fontSize:12, fontWeight:'600', marginTop:8, textAlign:'center' },
  statRow:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border },
  statLabel: { color:C.sub, fontSize:13 },
  statValue: { color:C.text, fontSize:13, fontWeight:'600' },
  editBtn:   { backgroundColor:C.purple, borderRadius:12, paddingVertical:13, alignItems:'center', marginTop:14 },
  editBtnTxt:{ color:'#fff', fontSize:14, fontWeight:'700' },
  targetNote:    { backgroundColor:C.purple+'12', borderRadius:12, padding:12, marginTop:12, borderWidth:1, borderColor:C.purple+'30' },
  targetNoteTxt: { color:C.accent, fontSize:12, lineHeight:18 },
  prRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12 },
  prRowBorder:{ borderBottomWidth:1, borderBottomColor:C.border },
  prExercise: { color:C.text, fontSize:13, fontWeight:'600' },
  prRight:    { alignItems:'flex-end' },
  prValue:    { color:C.lime, fontSize:14, fontWeight:'800' },
  prDate:     { color:C.sub, fontSize:10, marginTop:2 },
  badgesGrid: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  badge:      { alignItems:'center', gap:4, backgroundColor:C.border, borderRadius:14, paddingVertical:12, paddingHorizontal:10, width:'30%', borderWidth:1, borderColor:C.purple+'40' },
  badgeLocked:{ borderColor:C.border, opacity:0.5 },
  badgeIcon:  { fontSize:22 },
  badgeLabel: { color:C.sub, fontSize:9, fontWeight:'600', textAlign:'center' },
  badgeXP:    { color:C.lime, fontSize:9, fontWeight:'700' },
  seeMoreBtn: { alignSelf:'center', backgroundColor:C.purple+'20', borderRadius:12, paddingVertical:8, paddingHorizontal:16, marginTop:12, borderWidth:1, borderColor:C.purple+'40' },
  seeMoreTxt: { color:C.accent, fontSize:12, fontWeight:'700' },
  popupOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' },
  popupContainer: { position:'relative', alignItems:'center' },
  popupGlow: { position:'absolute', width:300, height:300, borderRadius:150, backgroundColor:C.lime, opacity:0.3, top:-50 },
  popupContent: { backgroundColor:C.card, borderRadius:20, padding:24, alignItems:'center', borderWidth:2, borderColor:C.lime, minWidth:280 },
  popupIcon: { fontSize:48, marginBottom:16 },
  popupTitle: { color:C.lime, fontSize:18, fontWeight:'800', marginBottom:8 },
  popupName: { color:C.text, fontSize:20, fontWeight:'700', textAlign:'center', marginBottom:8 },
  popupDesc: { color:C.sub, fontSize:14, textAlign:'center', marginBottom:16, lineHeight:20 },
  popupXP: { color:C.lime, fontSize:16, fontWeight:'800', marginBottom:20 },
  popupBtn: { backgroundColor:C.lime, borderRadius:12, paddingVertical:12, paddingHorizontal:24 },
  popupBtnText: { color:C.card, fontSize:16, fontWeight:'700' },
  settingRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:14 },
  settingRowBorder: { borderBottomWidth:1, borderBottomColor:C.border },
  settingLabel:     { color:C.text, fontSize:14 },
  tourBtn:    { backgroundColor:C.purple, borderRadius:14, padding:16, marginBottom:10, alignItems:'center' },
  tourBtnTxt: { color:'#fff', fontWeight:'800', fontSize:15 },
  signOutBtn: { backgroundColor:C.card, borderRadius:16, paddingVertical:16, alignItems:'center', borderWidth:1, borderColor:C.border, marginTop:6 },
  signOutTxt: { color:'#FF3B30', fontSize:14, fontWeight:'700' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  modalKeyboardWrap: { justifyContent:'flex-end' },
  modalCard: { backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, paddingTop:10, paddingHorizontal:20, paddingBottom:20, maxHeight:'88%', borderTopWidth:1, borderColor:C.border },
  modalHandle: { alignSelf:'center', width:44, height:5, borderRadius:999, backgroundColor:C.sub, opacity:0.45, marginBottom:14 },
  modalScrollContent: { paddingBottom:12 },
  modalTitle: { color:C.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  modalLabel: { color:C.sub, fontSize:13, fontWeight:'700', marginBottom:8, marginTop:8 },
  modalInput: { backgroundColor:C.bg, color:C.text, borderWidth:1, borderColor:C.border, borderRadius:14, paddingHorizontal:14, paddingVertical:12, fontSize:15 },
  chipWrap: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:6 },
  chip: { backgroundColor:C.bg, borderWidth:1, borderColor:C.border, borderRadius:999, paddingHorizontal:12, paddingVertical:9 },
  chipActive: { backgroundColor:C.purple+'20', borderColor:C.purple },
  chipText: { color:C.sub, fontSize:13, fontWeight:'600' },
  chipTextActive: { color:C.text },
  modalActions: { flexDirection:'row', gap:10, marginTop:20 },
  modalBtn: { flex:1, borderRadius:14, paddingVertical:14, alignItems:'center' },
  modalBtnPrimary: { backgroundColor:C.purple },
  modalBtnSecondary: { backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
  modalBtnPrimaryText: { color:'#fff', fontSize:15, fontWeight:'800' },
  modalBtnSecondaryText: { color:C.text, fontSize:15, fontWeight:'700' },
  modalBtnDisabled: { opacity:0.7 },
});
