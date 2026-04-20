import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';

// ─────────────────────────────────────────────────────────────────────────────
// Layout (like the Python version):
//   Top 58% → Large camera feed with MediaPipe skeleton overlay + L/R arm chips
//   Thin divider
//   Bottom 42% → Flappy Bird game canvas
//
// Controls: POSTURE ONLY — no tap during gameplay
//   Raise either arm (wrist above shoulder) → edge-triggered flap
//   Arm indicators (L / R) light up lime when that arm is raised
//   Skeleton drawn on camera feed showing detected joints in real-time
//
// MediaPipe Pose (lite) loaded from CDN → baseUrl ensures non-null origin → CORS OK
// ─────────────────────────────────────────────────────────────────────────────
const GAME_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:100vw; height:100vh; overflow:hidden; background:#0F0B1E; display:flex; flex-direction:column; }

    /* ── Camera section (top 58%) ── */
    #camSection {
      flex: 0 0 58%;
      position: relative;
      background: #080510;
      overflow: hidden;
    }
    #camVideo {
      width:100%; height:100%;
      object-fit:cover;
      transform:scaleX(-1); /* selfie mirror */
      display:block;
    }
    /* Skeleton overlay — same size, not CSS-flipped
       We flip x mathematically when drawing to match the mirrored video */
    #skelCanvas {
      position:absolute; inset:0;
      width:100%; height:100%;
      pointer-events:none;
    }
    /* "Point camera at yourself" placeholder */
    #camPlaceholder {
      position:absolute; inset:0;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:10px;
      color:rgba(255,255,255,0.35); font:13px -apple-system,sans-serif; text-align:center;
    }
    #camPlaceholder svg { opacity:0.3; }
    /* Arm raise indicators */
    #armRow {
      position:absolute; bottom:10px;
      left:0; right:0;
      display:flex; justify-content:center; gap:10px;
    }
    .ap {
      padding:5px 18px; border-radius:20px;
      border:2px solid rgba(255,255,255,0.18);
      background:rgba(0,0,0,0.5);
      color:rgba(255,255,255,0.35);
      font:bold 11px -apple-system,sans-serif;
      letter-spacing:0.8px;
      transition:all 0.08s linear;
    }
    .ap.up {
      border-color:#C8F135;
      background:rgba(200,241,53,0.22);
      color:#C8F135;
    }

    /* ── Divider ── */
    #div { height:2px; background:linear-gradient(90deg,transparent,rgba(200,241,53,0.4),transparent); flex-shrink:0; }

    /* ── Game section (bottom ~42%) ── */
    #gameSection { flex:1; position:relative; overflow:hidden; }
    #gc { position:absolute; inset:0; }
    #gStatus {
      position:absolute; bottom:7px; left:0; right:0;
      text-align:center; color:rgba(255,255,255,0.28);
      font:10px -apple-system,sans-serif; pointer-events:none;
    }

    /* ── Full-screen loader ── */
    #loader {
      position:fixed; inset:0; background:#0F0B1E;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:0; z-index:300;
    }
    .ring { width:44px; height:44px; border:3px solid rgba(200,241,53,0.15); border-top-color:#C8F135; border-radius:50%; animation:spin .85s linear infinite; }
    @keyframes spin{to{transform:rotate(360deg)}}
    #lTitle { color:rgba(255,255,255,0.75); font:bold 16px -apple-system,sans-serif; margin-top:18px; }
    #lSub   { color:rgba(255,255,255,0.3);  font:12px -apple-system,sans-serif; margin-top:7px; }
    #lNote  { color:rgba(200,241,53,0.65);  font:bold 11px -apple-system,sans-serif; margin-top:18px; letter-spacing:0.5px; }
  </style>
</head>
<body>

<!-- ── Camera section ── -->
<div id="camSection">
  <video id="camVideo" playsinline muted autoplay></video>
  <canvas id="skelCanvas"></canvas>
  <div id="camPlaceholder">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    <span id="camMsg">Starting camera…</span>
  </div>
  <div id="armRow">
    <div class="ap" id="armL">LEFT ARM ↑</div>
    <div class="ap" id="armR">RIGHT ARM ↑</div>
  </div>
</div>

<div id="div"></div>

<!-- ── Game section ── -->
<div id="gameSection">
  <canvas id="gc"></canvas>
  <div id="gStatus">Loading pose model…</div>
</div>

<!-- ── Full-screen loading overlay ── -->
<div id="loader">
  <div class="ring"></div>
  <div id="lTitle">Loading MediaPipe Pose…</div>
  <div id="lSub">Downloads ~3 MB · cached after first run</div>
  <div id="lNote">RAISE YOUR ARM TO FLAP THE BIRD</div>
</div>

<!-- MediaPipe Pose (lite model) from jsDelivr CDN -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

<script>
(function(){
'use strict';

// ── Game canvas setup ─────────────────────────────────────────────────────
var gs  = document.getElementById('gameSection');
var gc  = document.getElementById('gc');
var gx  = gc.getContext('2d');
// Size canvas to the section dimensions after layout settles
gc.width  = gs.offsetWidth  || window.innerWidth;
gc.height = gs.offsetHeight || Math.round(window.innerHeight * 0.41);
var GW = gc.width, GH = gc.height;

// ── Skeleton canvas ───────────────────────────────────────────────────────
var sc   = document.getElementById('skelCanvas');
var sx   = sc.getContext('2d');
var cs   = document.getElementById('camSection');
sc.width  = cs.offsetWidth  || window.innerWidth;
sc.height = cs.offsetHeight || Math.round(window.innerHeight * 0.58);

// ── Game constants ────────────────────────────────────────────────────────
var GRAV  = 0.42;
var FLAPV = -8.6;
var PW    = 58;
var GAP   = Math.max(138, GH * 0.38);
var SPD   = 2.6;
var IVMS  = 1750;
var BR    = 16;

// ── Game state ────────────────────────────────────────────────────────────
var state = 'idle', bird, pipes, score, best, lastPipeTs;

function mkBird(){ return { x:GW*0.25, y:GH*0.5, vy:0 }; }
function resetGame(){ bird=mkBird(); pipes=[]; score=0; lastPipeTs=0; state='idle'; }
resetGame();
best = 0;

// ── Posture-only flap ─────────────────────────────────────────────────────
function doFlap(){
  if(state==='dead'){ resetGame(); return; }
  if(state==='idle') state='playing';
  bird.vy = FLAPV;
}

// ── Pipes ─────────────────────────────────────────────────────────────────
function spawnPipe(ts){
  pipes.push({ x:GW+10, topH:60+Math.random()*(GH-GAP-120), passed:false });
  lastPipeTs = ts;
}
function hit(){
  if(bird.y-BR<0 || bird.y+BR>GH) return true;
  for(var i=0;i<pipes.length;i++){
    var p=pipes[i];
    if(bird.x+BR>p.x && bird.x-BR<p.x+PW)
      if(bird.y-BR<p.topH || bird.y+BR>p.topH+GAP) return true;
  }
  return false;
}

// ── Draw helpers ──────────────────────────────────────────────────────────
var C={bg:'#0F0B1E',lime:'#C8F135',purple:'#7C5CFC',purpleL:'#9D85F5',white:'#fff',sub:'rgba(255,255,255,0.38)'};

function rrp(c,x,y,w,h,r){
  c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.arcTo(x+w,y,x+w,y+r,r);
  c.lineTo(x+w,y+h-r); c.arcTo(x+w,y+h,x+w-r,y+h,r);
  c.lineTo(x+r,y+h); c.arcTo(x,y+h,x,y+h-r,r);
  c.lineTo(x,y+r); c.arcTo(x,y,x+r,y,r); c.closePath();
}
function frr(c,x,y,w,h,r,col){ rrp(c,x,y,w,h,r); c.fillStyle=col; c.fill(); }
function srr(c,x,y,w,h,r,col,lw){ rrp(c,x,y,w,h,r); c.strokeStyle=col; c.lineWidth=lw||1; c.stroke(); }

var STARS=[];
for(var i=0;i<45;i++) STARS.push({x:Math.random()*GW,y:Math.random()*GH,r:Math.random()*1.3+0.3,a:Math.random()*0.5+0.15});

function drawBg(){
  gx.fillStyle=C.bg; gx.fillRect(0,0,GW,GH);
  for(var i=0;i<STARS.length;i++){
    gx.globalAlpha=STARS[i].a; gx.fillStyle='#fff';
    gx.beginPath(); gx.arc(STARS[i].x,STARS[i].y,STARS[i].r,0,6.283); gx.fill();
  }
  gx.globalAlpha=1;
}

function drawBird(){
  gx.save(); gx.translate(bird.x,bird.y);
  gx.rotate(Math.max(-0.5,Math.min(0.6,bird.vy*0.055)));
  gx.shadowColor=C.lime; gx.shadowBlur=22;
  gx.beginPath(); gx.arc(0,0,BR,0,6.283); gx.fillStyle=C.lime; gx.fill();
  gx.shadowBlur=0;
  gx.beginPath(); gx.arc(4,1,BR*0.45,0,6.283); gx.fillStyle='rgba(0,0,0,0.28)'; gx.fill();
  gx.beginPath(); gx.arc(8,-4,4.5,0,6.283); gx.fillStyle='#fff'; gx.fill();
  gx.beginPath(); gx.arc(9.5,-4,2,0,6.283); gx.fillStyle='#111'; gx.fill();
  gx.restore();
}

function drawPipe(p){
  var ch=22,co=5;
  var g=gx.createLinearGradient(p.x,0,p.x+PW,0); g.addColorStop(0,C.purple); g.addColorStop(1,C.purpleL);
  gx.fillStyle=g; rrp(gx,p.x,0,PW,p.topH-ch+2,[0,0,4,4]); gx.fill();
  frr(gx,p.x-co,p.topH-ch,PW+co*2,ch,8,C.purpleL);
  var by=p.topH+GAP;
  gx.fillStyle=g; rrp(gx,p.x,by+ch-2,PW,GH-by-ch+2,[4,4,0,0]); gx.fill();
  frr(gx,p.x-co,by,PW+co*2,ch,8,C.purpleL);
}

function drawScore(){
  gx.textAlign='center'; gx.shadowColor=C.lime; gx.shadowBlur=16;
  gx.fillStyle=C.white; gx.font='bold 46px -apple-system,sans-serif';
  gx.fillText(score,GW/2,52); gx.shadowBlur=0;
}

function panel(title,tc,body,btn){
  gx.fillStyle='rgba(0,0,0,0.48)'; gx.fillRect(0,0,GW,GH);
  var bx=GW/2-132,by=GH/2-115,bw=264,bh=230;
  frr(gx,bx,by,bw,bh,22,'rgba(12,8,28,0.97)');
  srr(gx,bx,by,bw,bh,22,'rgba(200,241,53,0.32)',1.5);
  gx.textAlign='center';
  gx.fillStyle=tc||C.lime; gx.font='bold 19px -apple-system,sans-serif'; gx.fillText(title,GW/2,by+48);
  gx.fillStyle=C.white; gx.font='bold 44px -apple-system,sans-serif';
  gx.shadowColor=C.lime; gx.shadowBlur=14; gx.fillText(score,GW/2,by+102); gx.shadowBlur=0;
  if(body){ gx.fillStyle=C.sub; gx.font='12px -apple-system,sans-serif'; gx.fillText(body,GW/2,by+126); }
  var bbx=GW/2-80,bby=by+bh-60;
  frr(gx,bbx,bby,160,42,11,'rgba(200,241,53,0.1)');
  srr(gx,bbx,bby,160,42,11,C.lime,1.5);
  gx.fillStyle=C.lime; gx.font='bold 13px -apple-system,sans-serif'; gx.fillText(btn,GW/2,bby+26);
}

// ── Game loop ─────────────────────────────────────────────────────────────
function gameLoop(ts){
  drawBg();
  if(state==='playing'){
    bird.vy+=GRAV; bird.y+=bird.vy;
    if(!lastPipeTs||ts-lastPipeTs>IVMS) spawnPipe(ts);
    pipes=pipes.filter(function(p){return p.x+PW>-20;});
    for(var i=0;i<pipes.length;i++){
      pipes[i].x-=SPD;
      if(!pipes[i].passed&&pipes[i].x+PW<bird.x){pipes[i].passed=true;score++;if(score>best)best=score;}
      drawPipe(pipes[i]);
    }
    drawBird(); drawScore();
    if(hit()){
      state='dead'; if(score>best)best=score;
      try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'gameOver',score:score}));}catch(e){}
    }
  } else if(state==='idle'){
    drawBird();
    panel('BODYQ FLAP',C.lime,'Raise your arm to start!','RAISE ARM ↑');
  } else {
    for(var i=0;i<pipes.length;i++) drawPipe(pipes[i]);
    drawBird(); drawScore();
    panel('GAME OVER','#FF6B6B','BEST  '+best,'RAISE ARM TO RETRY');
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// ── Pose detection + skeleton drawing ────────────────────────────────────
var armL = document.getElementById('armL');
var armR = document.getElementById('armR');
var lUp = false, rUp = false, wasRaised = false;

// Upper body skeleton connections (MediaPipe Pose landmark indices)
// 0=nose 11=l-shoulder 12=r-shoulder 13=l-elbow 14=r-elbow 15=l-wrist 16=r-wrist 23=l-hip 24=r-hip
var CONN = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[0,11],[0,12]];
var JOINTS = [0,11,12,13,14,15,16,23,24];

function drawSkeleton(lm){
  var sw = sc.width, sh = sc.height;
  sx.clearRect(0,0,sw,sh);

  // Map normalized landmark → canvas pixel
  // x is flipped (1-lm.x) to match the CSS-mirrored video display
  function px(l){ return (1-l.x)*sw; }
  function py(l){ return l.y*sh; }
  function ok(l){ return l&&(l.visibility===undefined||l.visibility>0.35); }

  // Draw connections
  for(var i=0;i<CONN.length;i++){
    var a=lm[CONN[i][0]], b=lm[CONN[i][1]];
    if(!ok(a)||!ok(b)) continue;
    // Arm connections: lime when raised, soft lime when not
    var ai=CONN[i][0],bi=CONN[i][1];
    var isLeftConn  = (ai===11||ai===13||bi===13||bi===15);
    var isRightConn = (ai===12||ai===14||bi===14||bi===16);
    if(isLeftConn)       sx.strokeStyle = lUp ? '#C8F135' : 'rgba(200,241,53,0.55)';
    else if(isRightConn) sx.strokeStyle = rUp ? '#C8F135' : 'rgba(200,241,53,0.55)';
    else                 sx.strokeStyle = 'rgba(255,255,255,0.45)';
    sx.lineWidth=2.8;
    sx.beginPath(); sx.moveTo(px(a),py(a)); sx.lineTo(px(b),py(b)); sx.stroke();
  }

  // Draw joints
  for(var j=0;j<JOINTS.length;j++){
    var idx=JOINTS[j], pt=lm[idx];
    if(!ok(pt)) continue;
    var isLA=(idx===11||idx===13||idx===15);
    var isRA=(idx===12||idx===14||idx===16);
    var raised=(isLA&&lUp)||(isRA&&rUp);
    // Outer glow for wrists (15, 16) to make them easy to see
    if(idx===15||idx===16){
      sx.beginPath(); sx.arc(px(pt),py(pt),9,0,6.283);
      sx.fillStyle=raised?'rgba(200,241,53,0.35)':'rgba(0,255,136,0.25)'; sx.fill();
    }
    sx.beginPath(); sx.arc(px(pt),py(pt),5.5,0,6.283);
    sx.fillStyle=raised?'#C8F135':'#00FF88'; sx.fill();
    sx.beginPath(); sx.arc(px(pt),py(pt),5.5,0,6.283);
    sx.strokeStyle='rgba(255,255,255,0.7)'; sx.lineWidth=1.5; sx.stroke();
  }
}

// ── MediaPipe Pose init ───────────────────────────────────────────────────
function waitForPose(cb,tries){
  if(typeof Pose!=='undefined'){ cb(); return; }
  if((tries||0)>120){
    document.getElementById('loader').style.display='none';
    document.getElementById('camMsg').textContent='Could not load pose model. Check your connection.';
    document.getElementById('gStatus').textContent='Pose model failed to load';
    return;
  }
  setTimeout(function(){ waitForPose(cb,(tries||0)+1); }, 150);
}

waitForPose(function(){
  var pose = new Pose({
    locateFile: function(f){ return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/'+f; }
  });

  pose.setOptions({
    modelComplexity:       0,     // lite — fastest on mobile
    smoothLandmarks:       true,
    enableSegmentation:    false,
    minDetectionConfidence:0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults(function(res){
    if(!res.poseLandmarks) return;
    var lm = res.poseLandmarks;

    // ── Arm raise detection (matches Python version RAISE_THRESHOLD=0) ──
    // wrist.y < shoulder.y  →  arm is above shoulder  →  arm raised
    var ls=lm[11], lw=lm[15];   // user's left shoulder & wrist
    var rs=lm[12], rw=lm[16];   // user's right shoulder & wrist

    var lVis=(ls&&(ls.visibility===undefined||ls.visibility>0.4));
    var rVis=(rs&&(rs.visibility===undefined||rs.visibility>0.4));
    var lwVis=(lw&&(lw.visibility===undefined||lw.visibility>0.35));
    var rwVis=(rw&&(rw.visibility===undefined||rw.visibility>0.35));

    lUp = lVis&&lwVis && lw.y < ls.y;
    rUp = rVis&&rwVis && rw.y < rs.y;

    // Update arm indicator chips
    armL.className='ap'+(lUp?' up':'');
    armR.className='ap'+(rUp?' up':'');

    // Edge-triggered flap — identical to Python's raise_triggered logic
    var raisedNow = lUp||rUp;
    if(raisedNow && !wasRaised) doFlap();
    wasRaised = raisedNow;

    // Draw skeleton on camera feed
    drawSkeleton(lm);
  });

  var vid = document.getElementById('camVideo');

  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'user', width:{ideal:640}, height:{ideal:480} }
  })
  .then(function(stream){
    vid.srcObject = stream;
    return vid.play();
  })
  .then(function(){
    // Camera is live — hide placeholder, hide loader, show game status
    document.getElementById('camPlaceholder').style.display = 'none';
    document.getElementById('loader').style.display         = 'none';
    document.getElementById('gStatus').textContent          = 'Raise arm to flap · No tapping';

    // Pose detection loop (runs as fast as hardware allows, MediaPipe throttles internally)
    function detectLoop(){
      if(vid.readyState>=2) pose.send({image:vid}).catch(function(){});
      requestAnimationFrame(detectLoop);
    }
    detectLoop();
  })
  .catch(function(err){
    document.getElementById('loader').style.display='none';
    document.getElementById('camMsg').textContent='Camera access denied. Enable camera permission and reload.';
    document.getElementById('gStatus').textContent='Camera unavailable';
    console.warn('[FlappyBird Pose] camera error:', err.message||err);
  });
});

})();
</script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
export default function FlappyBirdGame({ navigation }) {
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Request camera permission at OS level before WebView loads.
  // This prevents the WebView's getUserMedia call from being silently denied.
  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(() => setReady(true));
  }, []);

  const onMessage = useCallback((e) => {
    try {
      const { type, score } = JSON.parse(e.nativeEvent.data);
      if (type === 'gameOver') console.log('[FlappyBird] score:', score);
    } catch (_) {}
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0B1E" />

      <TouchableOpacity
        style={[s.back, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.75}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={20} color="#C8F135" />
        <Text style={s.backTxt}>Training</Text>
      </TouchableOpacity>

      {!ready ? (
        <View style={s.wait}>
          <ActivityIndicator size="large" color="#C8F135" />
          <Text style={s.waitTxt}>Requesting camera…</Text>
        </View>
      ) : (
        <WebView
          ref={webRef}
          // baseUrl gives the page a non-null origin so CDN CORS / WASM fetch works
          source={{ html: GAME_HTML, baseUrl: 'https://localhost' }}
          style={s.web}
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess
          allowUniversalAccessFromFileURLs
          onMessage={onMessage}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          injectedJavaScriptBeforeContentLoaded="window._rnCamGranted=true;"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#0F0B1E' },
  web:  { flex:1, backgroundColor:'#0F0B1E' },
  wait: { flex:1, alignItems:'center', justifyContent:'center', gap:14 },
  waitTxt: { color:'rgba(255,255,255,0.45)', fontSize:13 },
  back: {
    position:'absolute', left:14, zIndex:20,
    flexDirection:'row', alignItems:'center', gap:4,
    backgroundColor:'rgba(12,8,26,0.88)',
    paddingHorizontal:12, paddingVertical:7,
    borderRadius:20, borderWidth:1, borderColor:'rgba(200,241,53,0.3)',
  },
  backTxt: { color:'#C8F135', fontSize:13, fontWeight:'700' },
});
