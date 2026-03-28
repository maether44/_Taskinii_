// screens/Profile.js — mock data replaced with static defaults
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const C = {
  bg:'#0F0B1E', card:'#161230', border:'#1E1A35',
  purple:'#7C5CFC', lime:'#C8F135', accent:'#9D85F5',
  text:'#FFFFFF', sub:'#6B5F8A', green:'#34C759', orange:'#FF9500',
};

const USER = { name:'Maether', email:'maether@bodyq.app', age:24, gender:'male', heightCm:178, weightKg:78, goalWeightKg:72, activityLevel:'moderate', goal:'fat_loss' };
const BMR  = 1820;
const TDEE = 2520;
const CALORIE_TARGET = 2100;
const MACROS = { protein:160, carbs:220, fat:65 };
const WATER_TARGET_ML = 2500;
const XP = { level:7, current:340, goal:500 };
const BADGES = [
  { id:'first_workout', icon:'💪', label:'First Workout', xp:50,  earned:true  },
  { id:'week_streak',   icon:'🔥', label:'7-Day Streak',  xp:100, earned:true  },
  { id:'hydrated',      icon:'💧', label:'Stay Hydrated', xp:30,  earned:true  },
  { id:'early_bird',    icon:'🌅', label:'Early Bird',    xp:50,  earned:false },
  { id:'iron_will',     icon:'🏋️', label:'Iron Will',     xp:200, earned:false },
  { id:'clean_eater',   icon:'🥗', label:'Clean Eater',   xp:75,  earned:false },
];
const PERSONAL_RECORDS = [
  { exercise:'Bench Press', weight:'80 kg', unit:'', date:'2 weeks ago' },
  { exercise:'Squat',       weight:'100 kg',unit:'', date:'1 week ago'  },
  { exercise:'Deadlift',    weight:'120 kg',unit:'', date:'3 days ago'  },
];

const GOAL_LABELS     = { fat_loss:'Lose Fat 🔥', muscle_gain:'Build Muscle 💪', maintain:'Stay Fit ⚖️' };
const ACTIVITY_LABELS = { sedentary:'Sedentary', light:'Lightly Active', moderate:'Moderately Active', active:'Very Active', very_active:'Athlete' };

function Row({ label, value, color }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function Profile({ navigate, replayTour }) {
  const { signOut } = useAuth();
  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifWater,   setNotifWater  ] = useState(true);
  const [notifMeal,    setNotifMeal   ] = useState(false);

  const earnedBadges = BADGES.filter(b => b.earned);
  const xpPct  = XP.current / XP.goal;
  const bmi    = (USER.weightKg / ((USER.heightCm / 100) ** 2)).toFixed(1);
  const bmiNum = parseFloat(bmi);
  const bmiStatus = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
  const bmiColor  = bmiNum >= 18.5 && bmiNum < 25 ? C.green : C.orange;
  const goalNote  = USER.goal === 'fat_loss' ? '400 kcal deficit for steady fat loss (~0.4 kg/week)'
    : USER.goal === 'muscle_gain' ? '200 kcal surplus for lean muscle building'
    : 'Maintenance calories — staying fit and healthy';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}><Text style={s.title}>Profile</Text></View>

        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{USER.name[0]}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{USER.name}</Text>
            <Text style={s.profileEmail}>{USER.email}</Text>
            <View style={s.goalChip}>
              <Text style={s.goalChipTxt}>{GOAL_LABELS[USER.goal]}</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.xpRow}>
            <View>
              <Text style={s.cardLabel}>LEVEL {XP.level}</Text>
              <Text style={s.xpCount}>{XP.current} / {XP.goal} XP</Text>
            </View>
            <Text style={s.xpEmoji}>⭐</Text>
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${xpPct * 100}%` }]} />
          </View>
          <Text style={s.xpNext}>{XP.goal - XP.current} XP to Level {XP.level + 1}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>BODY STATS</Text>
          <Row label="Age"           value={`${USER.age} years`} />
          <Row label="Gender"        value={USER.gender === 'male' ? 'Male' : 'Female'} />
          <Row label="Height"        value={`${USER.heightCm} cm`} />
          <Row label="Weight"        value={`${USER.weightKg} kg`} />
          <Row label="Target Weight" value={`${USER.goalWeightKg} kg`} color={C.lime} />
          <Row label="BMI"           value={`${bmi} (${bmiStatus})`} color={bmiColor} />
          <Row label="Activity"      value={ACTIVITY_LABELS[USER.activityLevel]} />
          <TouchableOpacity style={s.editBtn}>
            <Text style={s.editBtnTxt}>Edit Body Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>YOUR TARGETS</Text>
          <Row label="BMR (base metabolism)" value={`${BMR} kcal`} />
          <Row label="TDEE (maintenance)"    value={`${TDEE} kcal`} />
          <Row label="Daily calorie target"  value={`${CALORIE_TARGET} kcal`} color={C.lime} />
          <Row label="Protein goal"          value={`${MACROS.protein}g`} color={C.accent} />
          <Row label="Carbs goal"            value={`${MACROS.carbs}g`} />
          <Row label="Fat goal"              value={`${MACROS.fat}g`} />
          <Row label="Water target"          value={`${(WATER_TARGET_ML/1000).toFixed(1)}L / day`} color="#0A84FF" />
          <View style={s.targetNote}>
            <Text style={s.targetNoteTxt}>{goalNote}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>PERSONAL RECORDS</Text>
          {PERSONAL_RECORDS.map((pr, i) => (
            <View key={i} style={[s.prRow, i < PERSONAL_RECORDS.length-1 && s.prRowBorder]}>
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
            <Text style={s.cardSub}>{earnedBadges.length}/{BADGES.length} earned</Text>
          </View>
          <View style={s.badgesGrid}>
            {BADGES.map(b => (
              <View key={b.id} style={[s.badge, !b.earned && s.badgeLocked]}>
                <Text style={s.badgeIcon}>{b.earned ? b.icon : '🔒'}</Text>
                <Text style={[s.badgeLabel, !b.earned && { opacity:0.4 }]}>{b.label}</Text>
                <Text style={[s.badgeXP,    !b.earned && { opacity:0.4 }]}>+{b.xp} XP</Text>
              </View>
            ))}
          </View>
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
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex:1, backgroundColor:C.bg },
  scroll: { paddingHorizontal:16, paddingTop:52, paddingBottom:20 },
  header: { marginBottom:20 },
  title:  { color:C.text, fontSize:26, fontWeight:'800', letterSpacing:-0.5 },
  profileCard:  { backgroundColor:C.card, borderRadius:20, padding:18, marginBottom:14, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:16 },
  avatarCircle: { width:64, height:64, borderRadius:32, backgroundColor:C.purple, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.accent },
  avatarText:   { color:'#fff', fontSize:28, fontWeight:'900' },
  profileInfo:  { flex:1 },
  profileName:  { color:C.text, fontSize:20, fontWeight:'800' },
  profileEmail: { color:C.sub, fontSize:13, marginTop:2 },
  goalChip:     { alignSelf:'flex-start', backgroundColor:C.purple+'25', borderRadius:10, paddingHorizontal:10, paddingVertical:4, marginTop:8, borderWidth:1, borderColor:C.purple+'50' },
  goalChipTxt:  { color:C.accent, fontSize:11, fontWeight:'700' },
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
  settingRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:14 },
  settingRowBorder: { borderBottomWidth:1, borderBottomColor:C.border },
  settingLabel:     { color:C.text, fontSize:14 },
  tourBtn:    { backgroundColor:C.purple, borderRadius:14, padding:16, marginBottom:10, alignItems:'center' },
  tourBtnTxt: { color:'#fff', fontWeight:'800', fontSize:15 },
  signOutBtn: { backgroundColor:C.card, borderRadius:16, paddingVertical:16, alignItems:'center', borderWidth:1, borderColor:C.border, marginTop:6 },
  signOutTxt: { color:'#FF3B30', fontSize:14, fontWeight:'700' },
});