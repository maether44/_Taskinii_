import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text,
  StatusBar, Animated, Platform, Dimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';
import { Camera } from 'expo-camera';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { saveWorkoutSession } from '../../services/workoutService';
import { supabase } from '../../lib/supabase';

const { height: SH } = Dimensions.get('window');

// ── Yara encouragement phrases ─────────────────────────────────
const REP_PHRASES = [
  'Nice work!', 'Power up!', 'Keep going!', 'Strong!',
  'You got it!', 'One more!', 'Beast mode!', 'Perfect!',
];

// ── Yara breathing tips (every 3 reps) ────────────────────────
const BREATHING_TIPS = [
  'Breathe out on the way up',
  'Keep your core tight',
  'Drive through your heels',
  'Control the descent',
  'Chest up, shoulders back',
  'Full range of motion',
];

// ── Exercise → muscles targeted (for fatigue tracking) ─────────
const EXERCISE_MUSCLES = {
  squat:         [{ name: 'Quads', inc: 25 }, { name: 'Glutes', inc: 20 }, { name: 'Hamstrings', inc: 15 }],
  pushup:        [{ name: 'Chest', inc: 25 }, { name: 'Triceps', inc: 20 }, { name: 'Shoulders', inc: 15 }],
  bicepCurl:     [{ name: 'Biceps', inc: 30 }, { name: 'Forearms', inc: 15 }],
  shoulderPress: [{ name: 'Shoulders', inc: 30 }, { name: 'Triceps', inc: 20 }],
  deadlift:      [{ name: 'Hamstrings', inc: 25 }, { name: 'Glutes', inc: 20 }, { name: 'Back', inc: 25 }],
  lunge:         [{ name: 'Quads', inc: 25 }, { name: 'Glutes', inc: 20 }, { name: 'Hamstrings', inc: 10 }],
  plank:         [{ name: 'Core', inc: 25 }, { name: 'Shoulders', inc: 10 }],
};

// ── Canvas skeleton demo (Hologram Guide, Electric Violet glow) ─
const SKELETON_DEMO_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#060412;overflow:hidden}canvas{display:block;width:100%;height:100%}</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight}
resize();window.addEventListener('resize',resize);
const P={
  squat:{
    up:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.20],rSho:[.62,.20],lElb:[.34,.34],rElb:[.66,.34],lWri:[.36,.48],rWri:[.64,.48],lHip:[.42,.50],rHip:[.58,.50],lKne:[.40,.68],rKne:[.60,.68],lAnk:[.40,.88],rAnk:[.60,.88]},
    down:{head:[.50,.18],neck:[.50,.26],lSho:[.37,.30],rSho:[.63,.30],lElb:[.28,.42],rElb:[.72,.42],lWri:[.28,.55],rWri:[.72,.55],lHip:[.42,.58],rHip:[.58,.58],lKne:[.36,.74],rKne:[.64,.74],lAnk:[.38,.88],rAnk:[.62,.88]}
  },
  pushup:{
    up:{head:[.50,.28],neck:[.50,.34],lSho:[.36,.36],rSho:[.64,.36],lElb:[.24,.44],rElb:[.76,.44],lWri:[.22,.58],rWri:[.78,.58],lHip:[.43,.52],rHip:[.57,.52],lKne:[.44,.66],rKne:[.56,.66],lAnk:[.44,.78],rAnk:[.56,.78]},
    down:{head:[.50,.40],neck:[.50,.46],lSho:[.37,.48],rSho:[.63,.48],lElb:[.30,.56],rElb:[.70,.56],lWri:[.26,.66],rWri:[.74,.66],lHip:[.43,.58],rHip:[.57,.58],lKne:[.44,.70],rKne:[.56,.70],lAnk:[.44,.82],rAnk:[.56,.82]}
  },
  bicepCurl:{
    up:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.21],rSho:[.62,.21],lElb:[.36,.37],rElb:[.64,.37],lWri:[.36,.54],rWri:[.64,.54],lHip:[.42,.52],rHip:[.58,.52],lKne:[.40,.70],rKne:[.60,.70],lAnk:[.40,.88],rAnk:[.60,.88]},
    down:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.21],rSho:[.62,.21],lElb:[.36,.37],rElb:[.64,.37],lWri:[.33,.26],rWri:[.67,.26],lHip:[.42,.52],rHip:[.58,.52],lKne:[.40,.70],rKne:[.60,.70],lAnk:[.40,.88],rAnk:[.60,.88]}
  },
  shoulderPress:{
    up:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.21],rSho:[.62,.21],lElb:[.28,.10],rElb:[.72,.10],lWri:[.28,.02],rWri:[.72,.02],lHip:[.42,.52],rHip:[.58,.52],lKne:[.40,.70],rKne:[.60,.70],lAnk:[.40,.88],rAnk:[.60,.88]},
    down:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.21],rSho:[.62,.21],lElb:[.24,.26],rElb:[.76,.26],lWri:[.30,.24],rWri:[.70,.24],lHip:[.42,.52],rHip:[.58,.52],lKne:[.40,.70],rKne:[.60,.70],lAnk:[.40,.88],rAnk:[.60,.88]}
  },
  deadlift:{
    up:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.20],rSho:[.62,.20],lElb:[.36,.34],rElb:[.64,.34],lWri:[.38,.48],rWri:[.62,.48],lHip:[.42,.50],rHip:[.58,.50],lKne:[.40,.68],rKne:[.60,.68],lAnk:[.40,.88],rAnk:[.60,.88]},
    down:{head:[.50,.35],neck:[.50,.42],lSho:[.35,.44],rSho:[.65,.44],lElb:[.35,.54],rElb:[.65,.54],lWri:[.38,.65],rWri:[.62,.65],lHip:[.42,.62],rHip:[.58,.62],lKne:[.40,.74],rKne:[.60,.74],lAnk:[.40,.88],rAnk:[.60,.88]}
  },
  lunge:{
    up:{head:[.50,.08],neck:[.50,.16],lSho:[.38,.20],rSho:[.62,.20],lElb:[.34,.34],rElb:[.66,.34],lWri:[.36,.48],rWri:[.64,.48],lHip:[.42,.50],rHip:[.58,.50],lKne:[.40,.68],rKne:[.60,.68],lAnk:[.40,.88],rAnk:[.60,.88]},
    down:{head:[.48,.14],neck:[.48,.22],lSho:[.36,.26],rSho:[.60,.26],lElb:[.32,.40],rElb:[.62,.40],lWri:[.34,.54],rWri:[.64,.54],lHip:[.40,.54],rHip:[.56,.54],lKne:[.34,.70],rKne:[.62,.66],lAnk:[.30,.82],rAnk:[.68,.86]}
  },
  plank:{
    up:{head:[.50,.28],neck:[.50,.34],lSho:[.37,.37],rSho:[.63,.37],lElb:[.31,.50],rElb:[.69,.50],lWri:[.28,.60],rWri:[.72,.60],lHip:[.43,.52],rHip:[.57,.52],lKne:[.44,.66],rKne:[.56,.66],lAnk:[.44,.78],rAnk:[.56,.78]},
    down:{head:[.50,.29],neck:[.50,.35],lSho:[.37,.38],rSho:[.63,.38],lElb:[.30,.49],rElb:[.70,.49],lWri:[.27,.58],rWri:[.73,.58],lHip:[.43,.53],rHip:[.57,.53],lKne:[.44,.67],rKne:[.56,.67],lAnk:[.44,.79],rAnk:[.56,.79]}
  }
};
const CONN=[['head','neck'],['neck','lSho'],['neck','rSho'],['lSho','lElb'],['lElb','lWri'],['rSho','rElb'],['rElb','rWri'],['neck','lHip'],['neck','rHip'],['lHip','rHip'],['lHip','lKne'],['lKne','lAnk'],['rHip','rKne'],['rKne','rAnk']];
let key='squat',t=0,dir=1;
const SPD=0.014;
function lerp(a,b,t){return a+(b-a)*t}
function pose(){const p=P[key]||P.squat,u=p.up,d=p.down,r={};for(const k in u)r[k]=[lerp(u[k][0],d[k][0],t),lerp(u[k][1],d[k][1],t)];return r}
let glowT=0;
function draw(){
  const W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.7);
  bg.addColorStop(0,'#0D0820');bg.addColorStop(1,'#060412');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  glowT+=0.04;
  const gPulse=0.18+Math.sin(glowT)*0.07;
  const p=pose();
  function px(j){return[p[j][0]*W,p[j][1]*H]}
  ctx.lineCap='round';
  for(const[a,b]of CONN){
    if(!p[a]||!p[b])continue;
    const[x1,y1]=px(a),[x2,y2]=px(b);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=\`rgba(124,92,252,\${gPulse})\`;ctx.lineWidth=18;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=\`rgba(124,92,252,\${0.55+Math.sin(glowT)*0.15})\`;ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle='rgba(180,160,255,0.9)';ctx.lineWidth=1.5;ctx.stroke();
  }
  for(const k in p){
    if(k==='head')continue;
    const[x,y]=px(k);
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle='#00E5FF';ctx.shadowColor='#00E5FF';ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
  }
  if(p.head){
    const[hx,hy]=px('head');
    ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);
    ctx.fillStyle='rgba(200,241,53,0.08)';ctx.strokeStyle=\`rgba(200,241,53,\${0.7+Math.sin(glowT)*0.3})\`;
    ctx.lineWidth=2;ctx.shadowColor='#C8F135';ctx.shadowBlur=14;
    ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  }
}
function tick(){t+=dir*SPD;if(t>=1){t=1;dir=-1}if(t<=0){t=0;dir=1}draw();requestAnimationFrame(tick)}
window.setExercise=function(k){key=k;t=0;dir=1};
tick();
<\/script>
</body>
</html>`;

// ── Helpers ─────────────────────────────────────────────────────
function resolveHtmlKey(name) {
  const k = name.trim().toLowerCase();
  if (k.includes('push') || k.includes('bench')) return 'pushup';
  if (k.includes('squat'))                        return 'squat';
  if (k.includes('curl'))                         return 'bicepCurl';
  if (k.includes('press'))                        return 'shoulderPress';
  if (k.includes('deadlift') || k.includes('rdl')) return 'deadlift';
  if (k.includes('lunge'))                        return 'lunge';
  if (k.includes('plank'))                        return 'plank';
  return null;
}


function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
export default function WorkoutActive({ route, navigation }) {
  const { user } = useAuth();
  const rawKey      = route.params?.exerciseKey || route.params?.exerciseName || 'squat';
  const htmlKey     = resolveHtmlKey(rawKey);
  const displayName = rawKey.replace(/_/g, ' ').toUpperCase();

  // ── Refs ────────────────────────────────────────────────────
  const webViewRef        = useRef(null);
  const demoWebViewRef    = useRef(null);
  const startTimeRef      = useRef(Date.now());
  const formScoreSum      = useRef(0);
  const formScoreCount    = useRef(0);
  const isMountedRef      = useRef(true);
  const pulseLoopActive   = useRef(false);
  const timerIntervalRef  = useRef(null);
  const lastSpeechTimeRef = useRef(0);
  const lastCueRef        = useRef('');
  const repTimestampsRef  = useRef([]);
  const tapCountRef       = useRef(0);
  const tapTimerRef       = useRef(null);

  // ── Animated values ─────────────────────────────────────────
  const countScaleAnim   = useRef(new Animated.Value(0.3)).current;
  const countOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowOpacityAnim  = useRef(new Animated.Value(0)).current;
  const syncScaleAnim    = useRef(new Animated.Value(0)).current;
  // Mic pulse indicator
  const micPulseAnim = useRef(new Animated.Value(1)).current;

  // ── Reanimated shared values ─────────────────────────────────
  const guideProg   = useSharedValue(0);  // 0=hidden 1=shown
  const cameraAlpha = useSharedValue(0);  // 0=invisible 1=visible

  const guideCardStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(guideProg.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(guideProg.value, [0, 1], [0.82, 1]) }],
  }));

  const guideBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(guideProg.value, [0, 1], [0, 0.78]),
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    opacity: cameraAlpha.value,
  }));

  // ── State ───────────────────────────────────────────────────
  const [hasPermission,   setHasPermission]  = useState(null);
  const [htmlContent,     setHtmlContent]    = useState(null);
  const [cue,             setCue]            = useState('Get ready…');
  const [repCount,        setRepCount]       = useState(0);
  const [formScore,       setFormScore]      = useState(0);
  const [isCountingDown,  setIsCountingDown] = useState(true);
  const [countStep,       setCountStep]      = useState(null);
  const [timerSecs,       setTimerSecs]      = useState(0);
  const [timerRunning,    setTimerRunning]   = useState(false);
  const [inSync,          setInSync]         = useState(false);
  const [guideVisible,    setGuideVisible]   = useState(false);
  // Once true, keeps the guide WebView mounted for instant re-show
  const [guideEverShown,  setGuideEverShown] = useState(false);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      isMountedRef.current    = false;
      pulseLoopActive.current = false;
      clearInterval(timerIntervalRef.current);
      clearTimeout(tapTimerRef.current);
      Speech.stop().catch(() => {});
    };
  }, []);

  // ── Hide tab bar ────────────────────────────────────────────
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => navigation.getParent()?.setOptions({
      tabBarStyle: { backgroundColor: '#0F0B1E', borderTopColor: '#1E1A35', height: 85, paddingBottom: 20 },
    });
  }, [navigation]);

  // ── Camera permission + HTML preload ────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      try {
        const asset = Asset.fromModule(require('../../assets/ai_coach.html'));
        await asset.downloadAsync();
        const res  = await fetch(asset.localUri || asset.uri);
        const text = await res.text();
        setHtmlContent(text);
      } catch (err) {
        console.error('[BodyQ] HTML Load Error:', err);
      }
    })();
  }, []);

  // ── Live timer ──────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) setTimerSecs(s => s + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  // ── Electric Violet screen glow on perfect form ─────────────
  useEffect(() => {
    Animated.timing(glowOpacityAnim, {
      toValue:  formScore === 100 ? 1 : 0,
      duration: formScore === 100 ? 500 : 200,
      useNativeDriver: true,
    }).start();
  }, [formScore, glowOpacityAnim]);

  // ── Mic pulse loop ──────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(micPulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [micPulseAnim]);

  // ── Yara's voice ─────────────────────────────────────────────
  const speakYara = useCallback((text) => {
    const now = Date.now();
    if (now - lastSpeechTimeRef.current < 2800) return;
    lastSpeechTimeRef.current = now;
    Speech.stop().catch(() => {});
    Speech.speak(text, { language: 'en-US', pitch: 1.1, rate: 0.88 });
  }, []);

  // ── IN SYNC detection ────────────────────────────────────────
  const updateSync = useCallback((count) => {
    const ts = repTimestampsRef.current;
    if (ts.length < 2 || count < 3) { setInSync(false); return; }
    const intervals = [];
    for (let i = 1; i < ts.length; i++) intervals.push(ts[i] - ts[i - 1]);
    const avg      = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((s, t) => s + Math.abs(t - avg), 0) / intervals.length;
    const consistent = avg > 800 && avg < 8000 && (variance / avg) < 0.35;
    if (consistent !== inSync) {
      setInSync(consistent);
      Animated.spring(syncScaleAnim, {
        toValue: consistent ? 1 : 0, tension: 220, friction: 7, useNativeDriver: true,
      }).start();
    }
  }, [inSync, syncScaleAnim]);

  // ── Floating Guide show / hide ────────────────────────────────
  const showGuide = useCallback(() => {
    setGuideEverShown(true);
    setGuideVisible(true);
    guideProg.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.9 });
    if (htmlKey) {
      setTimeout(() => {
        demoWebViewRef.current?.injectJavaScript(
          `window.setExercise && window.setExercise('${htmlKey}'); true;`
        );
      }, 350);
    }
  }, [guideProg, htmlKey]);

  const hideGuide = useCallback(() => {
    guideProg.value = withSpring(0, { damping: 20, stiffness: 260 });
    setTimeout(() => setGuideVisible(false), 320);
  }, [guideProg]);

  // ── Cinematic 3-2-1 countdown ─────────────────────────────
  const startCountdown = useCallback(() => {
    const steps = [3, 2, 1, 'GO!'];
    let i = 0;

    const runPulse = () => {
      if (!pulseLoopActive.current || !isMountedRef.current) return;
      Animated.sequence([
        Animated.timing(countScaleAnim, { toValue: 1.12, duration: 260, useNativeDriver: true }),
        Animated.timing(countScaleAnim, { toValue: 1.00, duration: 260, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) runPulse(); });
    };

    const showStep = () => {
      if (!isMountedRef.current) return;
      if (i >= steps.length) {
        setIsCountingDown(false);
        setCountStep(null);
        webViewRef.current?.injectJavaScript('window.startCamera && window.startCamera(); true;');
        startTimeRef.current = Date.now();
        setTimerRunning(true);
        // Smooth fade-in instead of abrupt opacity flip
        cameraAlpha.value = withSpring(1, { damping: 22, stiffness: 120 });
        setTimeout(() => speakYara('Follow the hologram. Match the tempo.'), 600);
        return;
      }
      const val = steps[i];
      setCountStep(val);
      pulseLoopActive.current = false;
      countScaleAnim.setValue(0.25);
      countOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(countScaleAnim, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }),
        Animated.timing(countOpacityAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        pulseLoopActive.current = true;
        runPulse();
        const hold = val === 'GO!' ? 800 : 700;
        setTimeout(() => {
          if (!isMountedRef.current) return;
          pulseLoopActive.current = false;
          Animated.timing(countOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
            .start(() => { i++; showStep(); });
        }, hold);
      });
    };

    showStep();
  }, [countScaleAnim, countOpacityAnim, speakYara]);

  useEffect(() => { startCountdown(); }, [startCountdown]);

  // ── WebView message bridge ──────────────────────────────────
  const onMessage = useCallback((e) => {
    const data = e.nativeEvent.data;

    if (data === 'AI_READY') {
      if (htmlKey) {
        webViewRef.current?.injectJavaScript(
          `window.applyExerciseChange && window.applyExerciseChange('${htmlKey}'); true;`
        );
      }
      webViewRef.current?.injectJavaScript('window.startAI && window.startAI(); true;');
      setTimeout(() => speakYara("I'm watching your form. Begin when you are ready."), 400);
      return;
    }

    try {
      const msg = JSON.parse(data);

      if (msg.type === 'cue') {
        setCue(msg.text);
        if (msg.formScore !== undefined) {
          setFormScore(msg.formScore);
          formScoreSum.current   += msg.formScore;
          formScoreCount.current += 1;
        }
        const isBadForm = msg.text && !msg.text.includes('Great form') && !msg.text.includes('Detecting');
        if (isBadForm && msg.text !== lastCueRef.current) {
          lastCueRef.current = msg.text;
          speakYara(msg.text);
        }
      }

      if (msg.type === 'REP_COUNTED') {
        setRepCount(msg.count);
        repTimestampsRef.current = [...repTimestampsRef.current.slice(-4), Date.now()];
        updateSync(msg.count);
        if (msg.count % 3 === 0) {
          speakYara(BREATHING_TIPS[Math.floor(msg.count / 3 - 1) % BREATHING_TIPS.length]);
        } else {
          speakYara(REP_PHRASES[(msg.count - 1) % REP_PHRASES.length]);
        }
      }

      if (msg.type === 'CALIBRATED') {
        speakYara('Body detected. Calibration complete.');
      }

      if (msg.type === 'SYNC_STATUS') {
        const s = !!msg.inSync;
        setInSync(s);
        Animated.spring(syncScaleAnim, {
          toValue: s ? 1 : 0, tension: 220, friction: 7, useNativeDriver: true,
        }).start();
      }

      if (msg.type === 'SESSION_COMPLETE') {
        const elapsed      = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const avgFormScore = formScoreCount.current > 0
          ? Math.round(formScoreSum.current / formScoreCount.current)
          : (msg.score ?? 0);
        const calories = Math.max(1, msg.reps * 5);

        setTimerRunning(false);
        Speech.stop().catch(() => {});
        speakYara(msg.reps > 0 ? `Session complete! ${msg.reps} reps. Incredible work!` : 'Session saved. Great effort!');

        (async () => {
          let sessionId = null;
          if (user?.id) {
            sessionId = await saveWorkoutSession({
              userId:         user.id,
              exerciseKey:    htmlKey ?? rawKey,
              exerciseName:   msg.exercise || displayName,
              reps:           msg.reps,
              postureScore:   avgFormScore,
              caloriesBurned: calories,
            });

            try {
              const TODAY = new Date().toISOString().split('T')[0];
              const { data: existing } = await supabase
                .from('daily_activity')
                .select('id, calories_burned')
                .eq('user_id', user.id)
                .eq('date', TODAY)
                .maybeSingle();

              const newTotal = (existing?.calories_burned || 0) + calories;
              if (existing) {
                await supabase.from('daily_activity').update({ calories_burned: newTotal }).eq('id', existing.id);
              } else {
                await supabase.from('daily_activity').insert({ user_id: user.id, date: TODAY, calories_burned: newTotal });
              }
            } catch (e) {
              console.error('[BodyQ] daily_activity:', e.message);
            }

            // ── Update muscle fatigue ───────────────────────────
            const muscles = EXERCISE_MUSCLES[htmlKey] || [];
            if (muscles.length > 0) {
              try {
                const { data: currentRows } = await supabase
                  .from('muscle_fatigue')
                  .select('muscle_name, fatigue_pct')
                  .eq('user_id', user.id)
                  .in('muscle_name', muscles.map(m => m.name));

                const currentMap = {};
                (currentRows || []).forEach(r => { currentMap[r.muscle_name] = r.fatigue_pct; });

                const upserts = muscles.map(m => ({
                  user_id:      user.id,
                  muscle_name:  m.name,
                  fatigue_pct:  Math.min(100, (currentMap[m.name] || 0) + m.inc),
                  last_updated: new Date().toISOString(),
                }));

                await supabase
                  .from('muscle_fatigue')
                  .upsert(upserts, { onConflict: 'user_id,muscle_name' });
              } catch (e) {
                console.error('[BodyQ] muscle_fatigue:', e.message);
              }
            }
          }

          navigation.replace('WorkoutSummary', {
            exerciseName: displayName,
            repCount:     msg.reps,
            formScore:    avgFormScore,
            elapsed,
            sessionId,
          });
        })();
      }
    } catch (_) {}
  }, [navigation, displayName, htmlKey, rawKey, user, speakYara, updateSync, syncScaleAnim]);

  const handleFinish = useCallback(() => {
    webViewRef.current?.injectJavaScript('if (window.getSessionState) window.getSessionState(); true;');
  }, []);

  // ── Double-tap camera area → finish ──────────────────────────
  const handleDoubleTap = useCallback(() => {
    if (isCountingDown) return;
    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 400);
    } else if (tapCountRef.current >= 2) {
      clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      speakYara('Finishing session.');
      setTimeout(() => {
        webViewRef.current?.injectJavaScript('if (window.getSessionState) window.getSessionState(); true;');
      }, 800);
    }
  }, [isCountingDown, speakYara]);

  // ── Unsupported / No permission screens ────────────────────
  if (htmlKey === null) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar hidden />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
        <Text style={s.errorTitle}>AI Tracking Unavailable</Text>
        <Text style={s.errorSub}>This exercise isn't supported yet.</Text>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar hidden />
        <Text style={s.errorTitle}>Camera Permission Denied</Text>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* ══ FULL-SCREEN AI CAMERA ══════════════════════════════ */}
      {htmlContent && (
        <Reanimated.View style={[StyleSheet.absoluteFillObject, cameraStyle]}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent, baseUrl: 'https://localhost' }}
            style={StyleSheet.absoluteFillObject}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState={false}
            onPermissionRequest={e => e.grant(e.resources)}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            onMessage={onMessage}
          />
        </Reanimated.View>
      )}

      {/* ── Double-tap invisible overlay (large gesture finish) ─ */}
      {!isCountingDown && (
        <TouchableOpacity
          activeOpacity={1}
          style={s.doubleTapZone}
          onPress={handleDoubleTap}
        />
      )}

      {/* ══ HUD LAYER (all glass, absolutePositioned) ══════════ */}
      {!isCountingDown && (
        <>
          {/* Top-left: Live AI tag + exercise name + timer */}
          <BlurView intensity={30} tint="dark" style={s.liveTag}>
            <View style={s.liveDot} />
            <Text style={s.liveLabel}>{displayName}</Text>
            <Text style={s.liveTimer}>{formatTimer(timerSecs)}</Text>
          </BlurView>

          {/* Top-right: Neon Lime mic button → shows hologram guide */}
          <TouchableOpacity
            style={s.micGuideBtn}
            onPress={() => {
              showGuide();
              speakYara('Watch the hologram for the correct form.');
            }}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: micPulseAnim }] }}>
              <Ionicons name="mic" size={18} color="#000" />
            </Animated.View>
          </TouchableOpacity>

          {/* Center-top: Rep bubble (Lime) + Form bubble (Violet) */}
          <View style={s.centerStats} pointerEvents="none">
            {/* Rep counter — Neon Lime */}
            <BlurView intensity={55} tint="dark" style={s.statBubble}>
              <Text style={[s.statBigNum, { color: '#C8F135' }]}>{repCount}</Text>
              <Text style={s.statLbl}>REPS</Text>
            </BlurView>

            <View style={s.statGap} />

            {/* Form score — Electric Violet */}
            <BlurView intensity={55} tint="dark" style={s.statBubble}>
              <Text style={[s.statBigNum, { color: '#7C5CFC' }]}>{formScore}</Text>
              <Text style={s.statLbl}>FORM %</Text>
            </BlurView>
          </View>

          {/* Bottom-left: Yara coach indicator */}
          <BlurView intensity={20} tint="dark" style={s.micTag}>
            <Ionicons name="volume-high-outline" size={10} color="rgba(200,241,53,0.8)" />
            <Text style={s.micLabel}>YARA COACH</Text>
          </BlurView>
        </>
      )}

      {/* ══ HOLOGRAM GUIDE MODAL ════════════════════════════════ */}
      {guideEverShown && (
        <>
          {/* Tap-outside backdrop */}
          <Reanimated.View
            pointerEvents={guideVisible ? 'auto' : 'none'}
            style={[s.guideBackdrop, guideBackdropStyle]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={hideGuide} activeOpacity={1} />
          </Reanimated.View>

          {/* Modal card */}
          <Reanimated.View
            pointerEvents={guideVisible ? 'box-none' : 'none'}
            style={[s.guideCard, guideCardStyle]}
          >
            {/* Glassmorphism base — intensity 90 for rich frost effect */}
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />

            {/* Top gradient accent bar */}
            <View style={s.guideAccentBar} />

            <View style={s.guideCardInner}>

              {/* ── Header ─────────────────────────────────── */}
              <View style={s.guideHeader}>
                <View style={s.guideHeaderLeft}>
                  <View style={s.guidePulseDot} />
                  <View>
                    <Text style={s.guideSuperLabel}>FORM GUIDE</Text>
                    <Text style={s.guideExName} numberOfLines={1}>{displayName}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={hideGuide} style={s.guideCloseBtn}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>

              {/* ── Skeleton animation ─────────────────────── */}
              <View style={s.guideWebViewWrap}>
                {/* Corner glow accents */}
                <View style={[s.cornerAccent, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }]} />
                <View style={[s.cornerAccent, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }]} />
                <View style={[s.cornerAccent, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
                <View style={[s.cornerAccent, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }]} />

                <WebView
                  ref={demoWebViewRef}
                  originWhitelist={['*']}
                  source={{ html: SKELETON_DEMO_HTML }}
                  style={StyleSheet.absoluteFillObject}
                  scrollEnabled={false}
                  bounces={false}
                  javaScriptEnabled
                  onLoad={() => {
                    if (htmlKey) {
                      demoWebViewRef.current?.injectJavaScript(
                        `window.setExercise && window.setExercise('${htmlKey}'); true;`
                      );
                    }
                  }}
                />
              </View>

              {/* ── Footer tips ────────────────────────────── */}
              <View style={s.guideFooter}>
                <View style={s.guideTipRow}>
                  <Ionicons name="sync-outline" size={12} color="#C8F135" />
                  <Text style={s.guideTipText}>Match the skeleton's tempo and depth</Text>
                </View>
                <Text style={s.guideVoiceHint}>Say "close" or tap outside to dismiss</Text>
              </View>
            </View>

            {/* Electric Violet border glow */}
            <View style={s.guideBorder} pointerEvents="none" />
          </Reanimated.View>
        </>
      )}

      {/* ══ BOTTOM ROW: Cue pill + Finish button ═══════════════ */}
      {!isCountingDown && (
        <View style={s.bottomRow}>
          <BlurView intensity={40} tint="dark" style={s.cuePill}>
            <Ionicons name="sparkles" size={11} color="#C8F135" style={{ marginRight: 6 }} />
            <Text style={s.cueText} numberOfLines={1}>{cue}</Text>
          </BlurView>
          <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
            <Ionicons name="checkmark" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      {/* ══ PERFECT FORM — SCREEN EDGE GLOW ════════════════════ */}
      <Animated.View
        pointerEvents="none"
        style={[s.screenGlow, { opacity: glowOpacityAnim }]}
      />

      {/* ══ CINEMATIC COUNTDOWN OVERLAY ═══════════════════════ */}
      {isCountingDown && (
        <View style={s.countdownOverlay}>
          <Text style={s.countdownExercise}>{displayName}</Text>

          {countStep !== null && (
            <Animated.Text
              style={[
                s.countdownNum,
                countStep === 'GO!' && s.countdownGo,
                { opacity: countOpacityAnim, transform: [{ scale: countScaleAnim }] },
              ]}
            >
              {countStep}
            </Animated.Text>
          )}

          <Text style={s.countdownHint}>Step back for full-body tracking.</Text>

          <TouchableOpacity style={s.skipBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.3)" />
            <Text style={s.skipTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0B1E' },

  // ── Double-tap zone ─────────────────────────────────────────
  doubleTapZone: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 100,
    zIndex: 20,
  },

  // ── Top-left: Live AI tag + exercise name + timer ──────────
  liveTag: {
    position: 'absolute', top: 52, left: 16,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, overflow: 'hidden',
    paddingHorizontal: 12, paddingVertical: 7,
    zIndex: 40,
  },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8F135', marginRight: 7, shadowColor: '#C8F135', shadowOpacity: 1, shadowRadius: 5 },
  liveLabel: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  liveTimer: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginLeft: 10, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

  // ── Top-right: Neon Lime mic button ──────────────────────────
  micGuideBtn: {
    position: 'absolute', top: 48, right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#C8F135',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8F135', shadowOpacity: 0.55, shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 40,
  },

  // ── Center-top: Two separate glass bubbles ───────────────────
  centerStats: {
    position: 'absolute', top: 108, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    opacity: 0.72,
    zIndex: 40,
  },
  statBubble: {
    alignItems: 'center',
    borderRadius: 20, overflow: 'hidden',
    paddingHorizontal: 22, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statGap:    { width: 12 },
  statBigNum: { fontSize: 34, fontWeight: '900', lineHeight: 36 },
  statLbl:    { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },

  // ── Mic voice indicator (bottom-left, above bottom row) ─────
  micTag: {
    position: 'absolute', bottom: 110, left: 16,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, overflow: 'hidden',
    paddingHorizontal: 8, paddingVertical: 5,
    zIndex: 40,
  },
  micLabel: { color: 'rgba(124,92,252,0.7)', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginLeft: 4 },

  // ── Hologram Guide: backdrop + modal card ───────────────────
  guideBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 55,
  },
  guideCard: {
    position: 'absolute',
    top: SH * 0.1,
    left: 24, right: 24,
    height: SH * 0.72,
    borderRadius: 28,
    overflow: 'hidden',
    zIndex: 60,
  },
  guideAccentBar: {
    height: 3,
    backgroundColor: '#7C5CFC',
    shadowColor: '#7C5CFC', shadowOpacity: 1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  guideCardInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  guideHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  guideHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  guidePulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#7C5CFC',
    shadowColor: '#7C5CFC', shadowOpacity: 1, shadowRadius: 8,
  },
  guideSuperLabel: {
    color: 'rgba(124,92,252,0.8)', fontSize: 9,
    fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
  },
  guideExName: {
    color: '#FFF', fontSize: 18, fontWeight: '900',
    letterSpacing: 0.5, marginTop: 2,
  },
  guideCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  guideWebViewWrap: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#060412',
    borderWidth: 1, borderColor: 'rgba(124,92,252,0.25)',
  },
  cornerAccent: {
    position: 'absolute', width: 16, height: 16,
    borderColor: '#C8F135', zIndex: 2,
  },
  guideFooter: {
    marginTop: 14, gap: 6,
  },
  guideTipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  guideTipText: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600',
  },
  guideVoiceHint: {
    color: 'rgba(124,92,252,0.6)', fontSize: 10,
    fontWeight: '700', letterSpacing: 0.3,
  },
  guideBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(200,241,53,0.55)',
  },

  // ── Bottom row: Cue pill + Finish button ─────────────────────
  bottomRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8,
    gap: 10, zIndex: 40,
  },
  cuePill: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  cueText: { color: '#FFF', fontSize: 12, fontWeight: '700', flex: 1 },
  finishBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#C8F135',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8F135', shadowOpacity: 0.6, shadowRadius: 14,
    flexShrink: 0,
  },

  // ── Screen edge glow (perfect form) ─────────────────────────
  screenGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: '#7C5CFC',
    borderRadius: 0,
    shadowColor: '#7C5CFC', shadowOpacity: 1, shadowRadius: 30,
    zIndex: 30, pointerEvents: 'none',
  },

  // ── Countdown overlay ────────────────────────────────────────
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  countdownExercise: {
    color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900',
    letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32,
  },
  countdownNum: {
    fontSize: 160, fontWeight: '900', color: '#C8F135',
    lineHeight: 168, letterSpacing: -8,
    textShadowColor: 'rgba(200,241,53,0.5)', textShadowRadius: 60,
    textShadowOffset: { width: 0, height: 0 },
  },
  countdownGo: { fontSize: 80, letterSpacing: 12, lineHeight: 88 },
  countdownHint: {
    color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600',
    letterSpacing: 0.5, marginTop: 40,
  },
  skipBtn: {
    position: 'absolute', bottom: 56,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  skipTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },

  // ── Fallback screens ─────────────────────────────────────────
  errorTitle:   { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  errorSub:     { color: '#6B5F8A', fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  backLink:     { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#C8F135' },
  backLinkTxt:  { color: '#C8F135', fontWeight: '700' },
});
