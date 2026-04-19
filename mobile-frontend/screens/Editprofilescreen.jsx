import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  Platform, KeyboardAvoidingView, Keyboard,
  TouchableWithoutFeedback, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppEvents, emit } from '../lib/eventBus';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const C = {
  bg: '#0F0B1E', card: '#161230', border: '#1E1A35',
  purple: '#7C5CFC', lime: '#C8F135', accent: '#9D85F5',
  text: '#FFFFFF', sub: '#6B5F8A', red: '#FF3B30',
  green: '#34C759', orange: '#FF9500',
};

const COUNTRIES = [
  'Afghanistan','Algeria','Argentina','Australia','Austria','Belgium','Brazil',
  'Canada','Chile','China','Colombia','Croatia','Czech Republic','Denmark',
  'Egypt','Ethiopia','Finland','France','Germany','Ghana','Greece','Hungary',
  'India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Japan','Jordan',
  'Kenya','Kuwait','Lebanon','Libya','Malaysia','Mexico','Morocco','Netherlands',
  'New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia',
  'Singapore','South Africa','South Korea','Spain','Sudan','Sweden','Switzerland',
  'Syria','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','UK','Ukraine',
  'USA','Venezuela','Vietnam','Yemen','Zimbabwe',
];

function SectionHeader({ title }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function Field({ label, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [bio,      setBio]      = useState('');
  const [city,     setCity]     = useState('');
  const [country,  setCountry]  = useState('');
  const [dob,      setDob]      = useState(null);

  // Password fields
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw,       setShowNewPw]       = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);

  // Pickers
  const [countrySearch,     setCountrySearch]     = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showDatePicker,    setShowDatePicker]    = useState(false);

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  useEffect(() => {
    if (!authUser?.id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, bio, city, country, date_of_birth')
          .eq('id', authUser.id)
          .single();
        if (error) throw error;
        if (data) {
          setFullName(data.full_name || '');
          setBio(data.bio || '');
          setCity(data.city || '');
          setCountry(data.country || '');
          setDob(data.date_of_birth ? new Date(data.date_of_birth) : null);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser?.id]);

  const save = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }

    // Validate password if filled
    if (newPassword) {
      if (newPassword.length < 6) {
        Alert.alert('Too short', 'Password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Mismatch', 'Passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:     fullName.trim(),
          bio:           bio.trim() || null,
          city:          city.trim() || null,
          country:       country || null,
          date_of_birth: dob ? dob.toISOString().split('T')[0] : null,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', authUser.id);
      if (error) throw error;

      // Save password if provided
      if (newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
      }

      emit(AppEvents.PROFILE_UPDATED, { userId: authUser.id });
      Alert.alert('Saved ✓', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDob(selected);
  };

  const formatDob = (date) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={C.bg} size="small" />
            : <Text style={s.saveBtnTxt}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Personal Info ── */}
          <SectionHeader title="PERSONAL INFO" />
          <View style={s.card}>

            <Field label="Display Name">
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={C.sub}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <View style={s.divider} />

            <Field label="Email">
              <Text style={[s.input, { color: C.sub }]}>{authUser?.email || '—'}</Text>
            </Field>

            <View style={s.divider} />

            <Field label="Bio">
              <TextInput
                style={[s.input, s.inputMultiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the community about yourself..."
                placeholderTextColor={C.sub}
                multiline
                numberOfLines={3}
                maxLength={160}
                returnKeyType="done"
                blurOnSubmit
              />
              <Text style={s.charCount}>{bio.length}/160</Text>
            </Field>

            <View style={s.divider} />

            <Field label="Date of Birth">
              <TouchableOpacity
                style={s.selectRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.selectRowTxt, !dob && { color: C.sub }]}>
                  {formatDob(dob)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={C.sub} />
              </TouchableOpacity>
            </Field>

            {showDatePicker && Platform.OS === 'ios' && (
              <View style={s.datePickerWrap}>
                <DateTimePicker
                  value={dob || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                  themeVariant="dark"
                />
                <TouchableOpacity style={s.datePickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={s.datePickerDoneTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dob || new Date(2000, 0, 1)}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            )}
          </View>

          {/* ── Location ── */}
          <SectionHeader title="LOCATION" />
          <View style={s.card}>

            <Field label="City">
              <TextInput
                style={s.input}
                value={city}
                onChangeText={setCity}
                placeholder="Your city"
                placeholderTextColor={C.sub}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <View style={s.divider} />

            <Field label="Country">
              <TouchableOpacity
                style={s.selectRow}
                onPress={() => { setCountrySearch(''); setShowCountryPicker(true); }}
                activeOpacity={0.8}
              >
                <Text style={[s.selectRowTxt, !country && { color: C.sub }]}>
                  {country || 'Select country'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={C.sub} />
              </TouchableOpacity>
            </Field>
          </View>

          {/* ── Security ── */}
          <SectionHeader title="SECURITY" />
          <View style={s.card}>

            <Field label="New Password">
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={C.sub}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowNewPw(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.sub} />
                </TouchableOpacity>
              </View>
            </Field>

            <View style={s.divider} />

            <Field label="Confirm Password">
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor={C.sub}
                  secureTextEntry={!showConfirmPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  blurOnSubmit
                />
                <TouchableOpacity onPress={() => setShowConfirmPw(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.sub} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && (
                <Text style={[s.pwHint, { color: newPassword === confirmPassword ? C.green : C.orange }]}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              )}
            </Field>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Country Picker Overlay ── */}
      {showCountryPicker && (
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={s.pickerSearchWrap}>
              <Ionicons name="search" size={16} color={C.sub} style={{ marginRight: 8 }} />
              <TextInput
                style={s.pickerSearch}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search..."
                placeholderTextColor={C.sub}
                autoFocus
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredCountries.map((c) => (
                <Pressable
                  key={c}
                  style={[s.pickerItem, country === c && s.pickerItemActive]}
                  onPress={() => { setCountry(c); setShowCountryPicker(false); }}
                >
                  <Text style={[s.pickerItemTxt, country === c && { color: C.lime }]}>{c}</Text>
                  {country === c && <Ionicons name="checkmark" size={16} color={C.lime} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  saveBtn:     { backgroundColor: C.lime, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 60, alignItems: 'center' },
  saveBtnTxt:  { color: C.bg, fontSize: 14, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  sectionHeader: {
    color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
    marginTop: 24, marginBottom: 10, fontFamily: 'Outfit-Bold',
    paddingHorizontal: 4,
  },

  card:    { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: C.border },

  fieldWrap:      { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel:     { color: C.sub, fontSize: 11, fontWeight: '700', marginBottom: 6, fontFamily: 'Outfit-Medium', letterSpacing: 0.5 },
  input:          { color: C.text, fontSize: 15, fontFamily: 'Outfit-Regular', paddingVertical: 0 },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top', lineHeight: 22 },
  charCount:      { color: C.sub, fontSize: 11, textAlign: 'right', marginTop: 4, fontFamily: 'Outfit-Regular' },

  selectRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectRowTxt: { color: C.text, fontSize: 15, fontFamily: 'Outfit-Regular', flex: 1 },

  datePickerWrap:    { paddingHorizontal: 16, paddingBottom: 8 },
  datePickerDone:    { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  datePickerDoneTxt: { color: C.lime, fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  // Password row with eye toggle
  pwRow:  { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 4, marginLeft: 8 },
  pwHint: { fontSize: 11, marginTop: 6, fontFamily: 'Outfit-Regular' },

  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  pickerCard:    { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '75%', borderTopWidth: 1, borderColor: C.border },
  pickerHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  pickerTitle:      { color: C.text, fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  pickerSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  pickerSearch:     { flex: 1, color: C.text, fontSize: 14, fontFamily: 'Outfit-Regular' },
  pickerItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerItemActive: { backgroundColor: C.purple + '15' },
  pickerItemTxt:    { color: C.text, fontSize: 15, fontFamily: 'Outfit-Regular' },
});