import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchWorkoutHistory } from '../services/workoutService';
import { Ionicons } from '@expo/vector-icons';

const C = { bg:'#0F0B1E', card:'#161230', border:'#1E1A35', purple:'#7C5CFC', lime:'#C8F135', accent:'#9D85F5', text:'#FFFFFF', sub:'#6B5F8A', green:'#34C759', orange:'#FF9500' };

function formatDate(d){if(!d)return'';const dt=new Date(d);return dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
function formatDuration(s){if(!s.started_at||!s.ended_at)return null;const sec=Math.round((new Date(s.ended_at)-new Date(s.started_at))/1000);if(sec<=0)return null;const m=Math.floor(sec/60),sc=sec%60;return m>0?`${m}m ${sc}s`:`${sc}s`;}
function groupByMonth(sessions){const g={};sessions.forEach(s=>{const d=new Date(s.started_at||s.created_at);const k=d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});if(!g[k])g[k]=[];g[k].push(s);});return g;}
function avgPostureScore(s){const exs=s.workout_exercises||[];const scores=exs.map(e=>e.posture_score).filter(Boolean);if(!scores.length)return null;return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);}
function scoreColor(sc){if(!sc)return C.sub;if(sc>=80)return C.lime;if(sc>=55)return C.orange;return'#FF3B30';}
function totalReps(s){return(s.workout_exercises||[]).reduce((acc,e)=>acc+(e.reps||0),0);}
function sessionTitle(s){const names=(s.workout_exercises||[]).map(e=>e.exercises?.name).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);if(names.length>0)return names.slice(0,2).join(' · ')+(names.length>2?` +${names.length-2}`:'');if(s.notes)return s.notes.split('—')[0].trim();return'Workout Session';}

function SessionCard({session,onPress}){
  const score=avgPostureScore(session),reps=totalReps(session),duration=formatDuration(session),title=sessionTitle(session),exCount=(session.workout_exercises||[]).length;
  return(
    <Pressable style={s.sessionCard} onPress={onPress} android_ripple={{color:C.purple+'20'}}>
      <View style={s.sessionCardLeft}>
        <View style={s.sessionIconWrap}><Text style={{fontSize:20}}>🏋️</Text></View>
        <View style={{flex:1}}>
          <Text style={s.sessionTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.sessionDate}>{formatDate(session.started_at||session.created_at)}</Text>
          <View style={s.sessionMeta}>
            {exCount>0&&<View style={s.metaChip}><Ionicons name="list" size={10} color={C.sub}/><Text style={s.metaChipTxt}>{exCount} exercise{exCount!==1?'s':''}</Text></View>}
            {reps>0&&<View style={s.metaChip}><Ionicons name="repeat" size={10} color={C.sub}/><Text style={s.metaChipTxt}>{reps} reps</Text></View>}
            {duration&&<View style={s.metaChip}><Ionicons name="time-outline" size={10} color={C.sub}/><Text style={s.metaChipTxt}>{duration}</Text></View>}
            {session.calories_burned>0&&<View style={s.metaChip}><Ionicons name="flame" size={10} color={C.orange}/><Text style={[s.metaChipTxt,{color:C.orange}]}>{Math.round(session.calories_burned)} kcal</Text></View>}
          </View>
        </View>
      </View>
      <View style={s.sessionRight}>
        {score!==null&&<View style={s.scoreWrap}><Text style={[s.scoreNum,{color:scoreColor(score)}]}>{score}</Text><Text style={s.scoreLbl}>FORM</Text></View>}
        <Ionicons name="chevron-forward" size={16} color={C.sub} style={{marginTop:score?4:0}}/>
      </View>
    </Pressable>
  );
}

function SessionDetail({session,onClose}){
  if(!session)return null;
  const exercises=session.workout_exercises||[],duration=formatDuration(session),title=sessionTitle(session),score=avgPostureScore(session);
  return(
    <View style={s.detailOverlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}/>
      <View style={s.detailCard}>
        <View style={s.detailHandle}/>
        <View style={s.detailHeader}>
          <View style={{flex:1}}><Text style={s.detailTitle} numberOfLines={2}>{title}</Text><Text style={s.detailDate}>{formatDate(session.started_at||session.created_at)}</Text></View>
          <TouchableOpacity onPress={onClose} style={s.detailClose}><Ionicons name="close" size={20} color={C.text}/></TouchableOpacity>
        </View>
        <View style={s.detailChips}>
          {session.calories_burned>0&&<View style={[s.detailChip,{borderColor:C.orange+'50',backgroundColor:C.orange+'10'}]}><Ionicons name="flame" size={12} color={C.orange}/><Text style={[s.detailChipTxt,{color:C.orange}]}>{Math.round(session.calories_burned)} kcal</Text></View>}
          {duration&&<View style={[s.detailChip,{borderColor:C.purple+'50',backgroundColor:C.purple+'10'}]}><Ionicons name="time-outline" size={12} color={C.accent}/><Text style={[s.detailChipTxt,{color:C.accent}]}>{duration}</Text></View>}
          {score!==null&&<View style={[s.detailChip,{borderColor:C.lime+'50',backgroundColor:C.lime+'10'}]}><Ionicons name="star" size={12} color={C.lime}/><Text style={[s.detailChipTxt,{color:C.lime}]}>{score}% form</Text></View>}
        </View>
        {session.notes?<View style={s.notesWrap}><Text style={s.notesLabel}>NOTES</Text><Text style={s.notesTxt}>{session.notes}</Text></View>:null}
        <ScrollView showsVerticalScrollIndicator={false} style={{flex:1}}>
          {exercises.length===0?<Text style={s.emptyDetail}>No exercise details recorded.</Text>:exercises.map((ex,i)=>{
            const exName=ex.exercises?.name||`Exercise ${i+1}`,muscle=ex.exercises?.muscle_group,exScore=ex.posture_score?Math.round(ex.posture_score):null;
            return(
              <View key={ex.id||i} style={s.exerciseBlock}>
                <View style={s.exerciseBlockHeader}>
                  <View style={{flex:1}}><Text style={s.exerciseName}>{exName}</Text>{muscle&&<Text style={s.exerciseMuscle}>{muscle}</Text>}</View>
                  {exScore!==null&&<Text style={[s.exerciseScore,{color:scoreColor(exScore)}]}>{exScore}%</Text>}
                </View>
                <View style={s.setsTable}>
                  <View style={s.setsTableHeader}>
                    {['Sets','Reps','Weight','Duration'].map(h=><Text key={h} style={s.setsTableHeaderTxt}>{h}</Text>)}
                  </View>
                  <View style={s.setsTableRow}>
                    <Text style={s.setsTableCell}>{ex.sets??'—'}</Text>
                    <Text style={s.setsTableCell}>{ex.reps??'—'}</Text>
                    <Text style={s.setsTableCell}>{ex.weight_kg>0?`${ex.weight_kg}kg`:'—'}</Text>
                    <Text style={s.setsTableCell}>{ex.duration_secs?`${ex.duration_secs}s`:'—'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{height:32}}/>
        </ScrollView>
      </View>
    </View>
  );
}

export default function WorkoutHistoryScreen(){
  const navigation=useNavigation(),{user:authUser}=useAuth();
  const [sessions,setSessions]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[selected,setSelected]=useState(null);

  const load=useCallback(async()=>{
    if(!authUser?.id)return;
    try{const data=await fetchWorkoutHistory(authUser.id);setSessions(data);}
    catch(e){console.error('WorkoutHistory load error:',e);}
    finally{setLoading(false);setRefreshing(false);}
  },[authUser?.id]);

  useFocusEffect(useCallback(()=>{load();},[load]));
  const onRefresh=()=>{setRefreshing(true);load();};
  const grouped=groupByMonth(sessions),months=Object.keys(grouped);
  const totalCalories=sessions.reduce((acc,s)=>acc+(s.calories_burned||0),0);
  const totalRepsAll=sessions.reduce((acc,s)=>acc+totalReps(s),0);

  return(
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={24} color={C.text}/></TouchableOpacity>
        <Text style={s.headerTitle}>Workout History</Text>
        <View style={{width:36}}/>
      </View>
      {loading?<View style={s.centered}><ActivityIndicator color={C.purple} size="large"/></View>
      :sessions.length===0?<View style={s.centered}>
        <Text style={s.emptyIcon}>🏋️</Text>
        <Text style={s.emptyTitle}>No workouts yet</Text>
        <Text style={s.emptySub}>Complete a workout in the Train tab to see your history here.</Text>
        <TouchableOpacity style={s.goTrainBtn} onPress={()=>navigation.navigate('Train')}><Text style={s.goTrainTxt}>Go to Train →</Text></TouchableOpacity>
      </View>
      :<ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple}/>}>
        <View style={s.statsRow}>
          <View style={s.statBox}><Text style={s.statNum}>{sessions.length}</Text><Text style={s.statLbl}>Sessions</Text></View>
          <View style={s.statDivider}/>
          <View style={s.statBox}><Text style={s.statNum}>{totalRepsAll}</Text><Text style={s.statLbl}>Total Reps</Text></View>
          <View style={s.statDivider}/>
          <View style={s.statBox}><Text style={s.statNum}>{Math.round(totalCalories)}</Text><Text style={s.statLbl}>kcal Burned</Text></View>
        </View>
        {months.map(month=>(
          <View key={month}>
            <View style={s.monthHeader}><Text style={s.monthTitle}>{month}</Text><Text style={s.monthCount}>{grouped[month].length} session{grouped[month].length!==1?'s':''}</Text></View>
            <View style={s.monthCard}>
              {grouped[month].map((session,idx)=>(
                <View key={session.id}>
                  <SessionCard session={session} onPress={()=>setSelected(session)}/>
                  {idx<grouped[month].length-1&&<View style={s.cardDivider}/>}
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={{height:40}}/>
      </ScrollView>}
      {selected&&<SessionDetail session={selected} onClose={()=>setSelected(null)}/>}
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},scroll:{paddingHorizontal:16,paddingBottom:32},centered:{flex:1,justifyContent:'center',alignItems:'center',padding:32},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingBottom:16,paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:C.border},
  backBtn:{padding:4},headerTitle:{color:C.text,fontSize:18,fontWeight:'800',fontFamily:'Outfit-Bold'},
  statsRow:{flexDirection:'row',backgroundColor:C.card,borderRadius:20,borderWidth:1,borderColor:C.border,marginTop:20,marginBottom:8,paddingVertical:18},
  statBox:{flex:1,alignItems:'center'},statNum:{color:C.lime,fontSize:22,fontWeight:'800',fontFamily:'Outfit-Bold'},statLbl:{color:C.sub,fontSize:11,marginTop:2,fontFamily:'Outfit-Regular'},statDivider:{width:1,backgroundColor:C.border},
  monthHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:20,marginBottom:10},monthTitle:{color:C.text,fontSize:14,fontWeight:'800',fontFamily:'Outfit-Bold'},monthCount:{color:C.sub,fontSize:12,fontFamily:'Outfit-Regular'},
  monthCard:{backgroundColor:C.card,borderRadius:20,borderWidth:1,borderColor:C.border,overflow:'hidden'},cardDivider:{height:1,backgroundColor:C.border,marginHorizontal:16},
  sessionCard:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14},sessionCardLeft:{flex:1,flexDirection:'row',alignItems:'center',gap:12},
  sessionIconWrap:{width:44,height:44,borderRadius:12,backgroundColor:C.lime+'15',alignItems:'center',justifyContent:'center'},
  sessionTitle:{color:C.text,fontSize:14,fontWeight:'700',fontFamily:'Outfit-Bold',marginBottom:2},sessionDate:{color:C.sub,fontSize:11,fontFamily:'Outfit-Regular',marginBottom:6},
  sessionMeta:{flexDirection:'row',flexWrap:'wrap',gap:6},metaChip:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.border,borderRadius:6,paddingHorizontal:7,paddingVertical:3},metaChipTxt:{color:C.sub,fontSize:10,fontFamily:'Outfit-Regular'},
  sessionRight:{alignItems:'center',gap:2,marginLeft:8},scoreWrap:{alignItems:'center'},scoreNum:{fontSize:16,fontWeight:'800',fontFamily:'Outfit-Bold'},scoreLbl:{color:C.sub,fontSize:8,fontWeight:'700',letterSpacing:0.5},
  emptyIcon:{fontSize:48,marginBottom:16},emptyTitle:{color:C.text,fontSize:18,fontWeight:'800',fontFamily:'Outfit-Bold',marginBottom:8},emptySub:{color:C.sub,fontSize:14,textAlign:'center',fontFamily:'Outfit-Regular',lineHeight:20,marginBottom:20},
  goTrainBtn:{backgroundColor:C.purple,borderRadius:14,paddingHorizontal:24,paddingVertical:12},goTrainTxt:{color:'#fff',fontWeight:'800',fontSize:14,fontFamily:'Outfit-Bold'},
  detailOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  detailCard:{backgroundColor:C.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:10,paddingHorizontal:20,paddingBottom:20,maxHeight:'85%',borderTopWidth:1,borderColor:C.border},
  detailHandle:{alignSelf:'center',width:44,height:5,borderRadius:999,backgroundColor:C.sub,opacity:0.45,marginBottom:16},
  detailHeader:{flexDirection:'row',alignItems:'flex-start',marginBottom:14},detailTitle:{color:C.text,fontSize:18,fontWeight:'800',fontFamily:'Outfit-Bold'},detailDate:{color:C.sub,fontSize:12,marginTop:3,fontFamily:'Outfit-Regular'},detailClose:{padding:4,marginLeft:8},
  detailChips:{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'},detailChip:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderRadius:10,paddingHorizontal:10,paddingVertical:6},detailChipTxt:{fontSize:12,fontWeight:'700',fontFamily:'Outfit-Medium'},
  notesWrap:{backgroundColor:C.bg,borderRadius:12,padding:12,marginBottom:14,borderWidth:1,borderColor:C.border},notesLabel:{color:C.sub,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:4,fontFamily:'Outfit-Bold'},notesTxt:{color:C.text,fontSize:13,fontFamily:'Outfit-Regular',lineHeight:19},
  emptyDetail:{color:C.sub,textAlign:'center',fontFamily:'Outfit-Regular',marginTop:24},
  exerciseBlock:{marginBottom:14,backgroundColor:C.bg,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:C.border},exerciseBlockHeader:{flexDirection:'row',alignItems:'center',padding:12,paddingBottom:8},
  exerciseName:{color:C.accent,fontSize:14,fontWeight:'700',fontFamily:'Outfit-Bold'},exerciseMuscle:{color:C.sub,fontSize:11,marginTop:2,fontFamily:'Outfit-Regular'},exerciseScore:{fontSize:18,fontWeight:'800',fontFamily:'Outfit-Bold'},
  setsTable:{backgroundColor:C.card},setsTableHeader:{flexDirection:'row',paddingVertical:7,paddingHorizontal:12,backgroundColor:C.purple+'20'},setsTableHeaderTxt:{flex:1,color:C.sub,fontSize:10,fontWeight:'700',fontFamily:'Outfit-Bold',textAlign:'center'},
  setsTableRow:{flexDirection:'row',paddingVertical:10,paddingHorizontal:12},setsTableCell:{flex:1,color:C.text,fontSize:13,fontFamily:'Outfit-Regular',textAlign:'center'},
});