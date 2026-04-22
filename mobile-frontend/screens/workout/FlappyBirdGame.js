import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';

const GAME_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; user-select:none; -webkit-user-select:none; }
    html,body { width:100vw; height:100vh; overflow:hidden; background:#70c5ff; font-family:sans-serif; }
    #c { position:absolute; inset:0; width:100%; height:100%; }
    #scoreHud {
      position:absolute; top:16px; left:50%; transform:translateX(-50%);
      color:#fff; font-size:54px; font-weight:900;
      text-shadow:0 3px 0 rgba(0,0,0,0.28); pointer-events:none; z-index:10; letter-spacing:-1px;
    }
    #armHud {
      position:absolute; top:14px; left:12px;
      display:flex; flex-direction:column; gap:7px; z-index:20; pointer-events:none;
    }
    .hr {
      display:flex; align-items:center; gap:7px; max-width:190px;
      border-radius:999px; padding:5px 9px;
      background:rgba(15,12,28,0.52); border:1px solid rgba(255,255,255,0.18); backdrop-filter:blur(6px);
    }
    .hl { min-width:40px; color:#fff; font-size:10px; font-weight:800; letter-spacing:0.5px; }
    .hb { flex:1; height:7px; border-radius:999px; background:rgba(255,255,255,0.15); overflow:hidden; }
    .hf { width:0%; height:100%; border-radius:999px; background:#fff; transition:width .1s linear; }
    .hp { min-width:24px; color:#fff; font-size:10px; font-weight:700; text-align:right; }
    #camCard {
      position:absolute; top:12px; right:12px;
      width:30vw; max-width:130px; min-width:100px; aspect-ratio:3/4;
      border-radius:14px; overflow:hidden; background:#120d26;
      border:2px solid rgba(255,255,255,0.7); box-shadow:0 8px 18px rgba(0,0,0,0.3); z-index:20;
    }
    #vid { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:block; }
    #sk  { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
    #camPh {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      text-align:center; color:rgba(255,255,255,0.82); background:rgba(18,13,38,0.88);
      font-size:11px; line-height:1.4; padding:10px;
    }
    #toast {
      position:absolute; left:50%; bottom:140px; transform:translateX(-50%);
      padding:8px 14px; border-radius:999px;
      background:rgba(14,11,26,0.78); border:1px solid rgba(255,255,255,0.18);
      color:#fff; font-size:11px; font-weight:600; text-align:center;
      z-index:15; pointer-events:none; backdrop-filter:blur(6px); white-space:nowrap; max-width:88vw;
    }
    #loader {
      position:absolute; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:12px; z-index:50; background:#70c5ff;
    }
    .spin {
      width:40px; height:40px; border-radius:50%;
      border:4px solid rgba(255,255,255,0.35); border-top-color:#fff; animation:rot .85s linear infinite;
    }
    @keyframes rot { to { transform:rotate(360deg); } }
    #lTitle { color:#1a3c5c; font-size:17px; font-weight:900; }
    #lSub   { max-width:230px; color:#2a5280; font-size:11px; text-align:center; line-height:1.45; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <div id="scoreHud">0</div>

  <div id="armHud">
    <div class="hr">
      <div class="hl">LEFT</div>
      <div class="hb"><div class="hf" id="lF"></div></div>
      <div class="hp" id="lP">0%</div>
    </div>
    <div class="hr">
      <div class="hl">RIGHT</div>
      <div class="hb"><div class="hf" id="rF"></div></div>
      <div class="hp" id="rP">0%</div>
    </div>
  </div>

  <div id="camCard">
    <video id="vid" playsinline muted autoplay></video>
    <canvas id="sk"></canvas>
    <div id="camPh">Starting camera…<br>Stand back so shoulders and wrists are visible.</div>
  </div>

  <div id="toast">Raise arm to start — lower &amp; re-raise for each flap</div>

  <div id="loader">
    <div class="spin"></div>
    <div id="lTitle">Loading Flappy Arms</div>
    <div id="lSub">Loading sprites &amp; pose model…<br>Raise arm to flap. Lower it and raise again for the next flap.</div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <script>
  (function () {
    'use strict';

    /* ── element refs ── */
    var canvas   = document.getElementById('c');
    var ctx      = canvas.getContext('2d');
    var scoreEl  = document.getElementById('scoreHud');
    var toastEl  = document.getElementById('toast');
    var loaderEl = document.getElementById('loader');
    var camCard  = document.getElementById('camCard');
    var vid      = document.getElementById('vid');
    var sk       = document.getElementById('sk');
    var skx      = sk.getContext('2d');
    var camPh    = document.getElementById('camPh');
    var lF = document.getElementById('lF'), rF = document.getElementById('rF');
    var lP = document.getElementById('lP'), rP = document.getElementById('rP');

    function W() { return canvas.width; }
    function H() { return canvas.height; }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      sk.width  = camCard.clientWidth  || 110;
      sk.height = camCard.clientHeight || 147;
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── sprite loading ── */
    var CDN = 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/assets/';
    var IMG  = {};
    var SRCS = {
      bg:   CDN + 'background-day.png',
      base: CDN + 'base.png',
      go:   CDN + 'gameover.png',
      b0:   CDN + 'yellowbird-upflap.png',
      b1:   CDN + 'yellowbird-midflap.png',
      b2:   CDN + 'yellowbird-downflap.png',
      pipe: CDN + 'pipe-green.png',
    };
    var loadedCount = 0;
    var totalSprites = Object.keys(SRCS).length;

    Object.keys(SRCS).forEach(function (k) {
      var img = new Image();
      img.onload = img.onerror = function () {
        loadedCount++;
        if (loadedCount === totalSprites) onSpritesReady();
      };
      img.src = SRCS[k];
      IMG[k] = img;
    });

    // Timeout: start even if sprites fail (use fallback shapes)
    setTimeout(function () {
      if (loadedCount < totalSprites) {
        loadedCount = totalSprites;
        onSpritesReady();
      }
    }, 5000);

    /* ── game constants — EASY difficulty ── */
    var BASE_H     = 112;
    var PIPE_W     = 64;
    var PIPE_GAP   = 240;   // very wide — easy
    var PIPE_SPEED = 1.5;   // slow
    var PIPE_SPAWN = 2800;  // ms between pipes
    var GRAVITY    = 0.28;  // gentle
    var FLAP_VEL   = -8.2;  // strong enough to feel good
    var BIRD_R     = 15;    // collision radius
    var BIRD_W     = 36;
    var BIRD_H     = 26;

    /* ── game state ── */
    var state     = 'idle';
    var score     = 0;
    var best      = 0;
    var pipes     = [];
    var pipeTimer = 0;
    var lastTs    = 0;
    var bgX       = 0;
    var baseX     = 0;
    var bird      = { x: 0, y: 0, vy: 0, frame: 1, ft: 0 };
    // Edge-trigger arm state
    var armWasUp  = false;
    var leftStr   = 0;
    var rightStr  = 0;

    function resetBird() {
      bird.x  = W() * 0.22;
      bird.y  = H() * 0.42;
      bird.vy = 0;
      bird.frame = 1;
      bird.ft = 0;
    }

    function resetGame() {
      state     = 'idle';
      score     = 0;
      pipes     = [];
      pipeTimer = 0;
      lastTs    = 0;
      bgX       = 0;
      baseX     = 0;
      resetBird();
      scoreEl.textContent = '0';
      setToast('Raise arm to start — lower & re-raise for each flap');
    }

    resetGame();

    function setToast(t) { toastEl.textContent = t; }

    /* ── flap (called on edge-trigger) ── */
    function doFlap() {
      if (state === 'dead') {
        resetGame();
        return;
      }
      if (state === 'idle') {
        state = 'playing';
        pipes = [];
        pipeTimer = 0;
        score = 0;
        scoreEl.textContent = '0';
        setToast('Lower arm and raise again for next flap!');
      }
      bird.vy = FLAP_VEL;
    }

    /* ── edge-triggered arm raise ── */
    function onArm(lS, rS) {
      leftStr  = lS;
      rightStr = rS;
      var combined = Math.max(lS, rS);
      // Arm down → ready for next flap
      if (combined < 0.08) armWasUp = false;
      // Arm just raised → fire ONE flap, mark as up
      if (combined > 0.22 && !armWasUp) {
        armWasUp = true;
        doFlap();
      }
      // HUD
      var lp = Math.round(lS * 100);
      var rp = Math.round(rS * 100);
      lF.style.width = lp + '%';
      rF.style.width = rp + '%';
      lF.style.backgroundColor = lp > 55 ? '#c8f135' : lp > 20 ? '#ffe46b' : '#fff';
      rF.style.backgroundColor = rp > 55 ? '#c8f135' : rp > 20 ? '#ffe46b' : '#fff';
      lP.textContent = lp + '%';
      rP.textContent = rp + '%';
    }

    /* ── pipe helpers ── */
    function spawnPipe() {
      var ceiling = 80;
      var floor   = H() - BASE_H - PIPE_GAP - 60;
      var top = ceiling + Math.random() * Math.max(floor - ceiling, 30);
      pipes.push({ x: W() + 30, top: top, passed: false });
    }

    /* ── collision ── */
    function collides() {
      if (bird.y - BIRD_R < 0)           return true;
      if (bird.y + BIRD_R > H() - BASE_H) return true;
      for (var i = 0; i < pipes.length; i++) {
        var p = pipes[i];
        var inX = bird.x + BIRD_R - 6 > p.x && bird.x - BIRD_R + 6 < p.x + PIPE_W;
        if (!inX) continue;
        if (bird.y - BIRD_R + 4 < p.top || bird.y + BIRD_R - 4 > p.top + PIPE_GAP) return true;
      }
      return false;
    }

    /* ── update ── */
    function update(dt) {
      // Bird animation frame
      bird.ft += dt;
      if (bird.ft > 110) { bird.ft = 0; bird.frame = (bird.frame + 1) % 3; }

      if (state === 'idle') {
        bird.y = H() * 0.42 + Math.sin(Date.now() / 320) * 9;
        return;
      }
      if (state !== 'playing') return;

      bird.vy += GRAVITY * (dt / 16);
      bird.y  += bird.vy  * (dt / 16);

      bgX   -= PIPE_SPEED * 0.35 * (dt / 16);
      baseX -= PIPE_SPEED        * (dt / 16);

      pipeTimer += dt;
      if (pipeTimer >= PIPE_SPAWN) { spawnPipe(); pipeTimer = 0; }

      for (var i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED * (dt / 16);
        if (!pipes[i].passed && pipes[i].x + PIPE_W < bird.x) {
          pipes[i].passed = true;
          score++;
          best = Math.max(best, score);
          scoreEl.textContent = String(score);
        }
        if (pipes[i].x + PIPE_W < -80) pipes.splice(i, 1);
      }

      if (collides()) {
        state = 'dead';
        setToast('Score: ' + score + '  Best: ' + best + '  — raise arm to retry');
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'gameOver', score: score, best: best })
          );
        } catch (e) {}
      }
    }

    /* ── draw helpers ── */
    function ok(img) { return img && img.complete && img.naturalWidth > 0; }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawBg() {
      if (ok(IMG.bg)) {
        var gameH  = H() - BASE_H;
        var scale  = gameH / IMG.bg.naturalHeight;
        var bw     = IMG.bg.naturalWidth * scale;
        var off    = bgX % bw;
        if (off > 0) off -= bw;
        for (var x = off; x < W() + bw; x += bw) ctx.drawImage(IMG.bg, x, 0, bw, gameH);
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, H() - BASE_H);
        g.addColorStop(0, '#70c5ff'); g.addColorStop(1, '#c8e8ff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W(), H() - BASE_H);
      }
    }

    function drawBase() {
      if (ok(IMG.base)) {
        var scale = BASE_H / IMG.base.naturalHeight;
        var bw    = IMG.base.naturalWidth * scale;
        var off   = baseX % bw;
        if (off > 0) off -= bw;
        for (var x = off; x < W() + bw; x += bw) ctx.drawImage(IMG.base, x, H() - BASE_H, bw, BASE_H);
      } else {
        ctx.fillStyle = '#ded895'; ctx.fillRect(0, H() - BASE_H, W(), BASE_H);
        ctx.fillStyle = '#8fd14f'; ctx.fillRect(0, H() - BASE_H, W(), 16);
      }
    }

    function drawPipes() {
      for (var i = 0; i < pipes.length; i++) {
        var p   = pipes[i];
        var gt  = p.top;
        var gb  = p.top + PIPE_GAP;
        var bot = H() - BASE_H - gb;

        if (ok(IMG.pipe)) {
          // Top pipe — flip vertically so cap faces down toward the gap
          ctx.save();
          ctx.translate(p.x, gt);
          ctx.scale(1, -1);
          ctx.drawImage(IMG.pipe, 0, 0, PIPE_W, gt);
          ctx.restore();
          // Bottom pipe — cap naturally faces up
          if (bot > 0) ctx.drawImage(IMG.pipe, p.x, gb, PIPE_W, bot);
        } else {
          ctx.fillStyle = '#7fd54c';
          ctx.fillRect(p.x, 0, PIPE_W, gt);
          if (bot > 0) ctx.fillRect(p.x, gb, PIPE_W, bot);
          ctx.fillStyle = '#91e95a';
          ctx.fillRect(p.x - 4, gt - 28, PIPE_W + 8, 28);
          ctx.fillRect(p.x - 4, gb, PIPE_W + 8, 28);
        }
      }
    }

    function drawBird() {
      var bk  = ['b0', 'b1', 'b2'][bird.frame];
      var rot = Math.max(-0.5, Math.min(1.25, bird.vy * 0.07));
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(rot);
      if (ok(IMG[bk])) {
        ctx.drawImage(IMG[bk], -BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
        ctx.fillStyle = '#ffe14f';
        ctx.fill();
        ctx.fillStyle = '#ff9734';
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(20, -3); ctx.lineTo(10, 4); ctx.fill();
      }
      ctx.restore();
    }

    function drawOverlay() {
      var bw = Math.min(260, W() - 40);
      var bh = 148;
      var bx = (W() - bw) / 2;
      var by = H() * 0.5 - bh / 2;

      ctx.fillStyle = 'rgba(18,14,32,0.8)';
      roundRect(bx, by, bw, bh, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.4;
      roundRect(bx, by, bw, bh, 22);
      ctx.stroke();

      if (state === 'dead' && ok(IMG.go)) {
        var gScale = Math.min((bw - 40) / IMG.go.naturalWidth, 1.6);
        var gw = IMG.go.naturalWidth * gScale;
        var gh = IMG.go.naturalHeight * gScale;
        ctx.drawImage(IMG.go, (W() - gw) / 2, by + 18, gw, gh);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif';
        ctx.fillText('Score: ' + score + '   Best: ' + best, W() / 2, by + gh + 34);
        ctx.fillStyle = '#c8f135'; ctx.font = '800 12px sans-serif';
        ctx.fillText('↑ RAISE ARM TO RETRY ↑', W() / 2, by + gh + 56);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff'; ctx.font = '900 21px sans-serif';
        ctx.fillText('FLAPPY ARMS', W() / 2, by + 40);
        ctx.fillStyle = '#ffe987'; ctx.font = '700 14px sans-serif';
        ctx.fillText('Raise arm to start', W() / 2, by + 66);
        ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.font = '600 11px sans-serif';
        ctx.fillText('Lower arm + raise again for each flap', W() / 2, by + 90);
        ctx.fillStyle = '#c8f135'; ctx.font = '900 12px sans-serif';
        ctx.fillText('↑ RAISE ARM ↑', W() / 2, by + 118);
      }
    }

    /* ── game loop ── */
    function frame(ts) {
      if (!lastTs) lastTs = ts;
      var dt = Math.min(ts - lastTs, 50);
      lastTs = ts;
      update(dt);
      ctx.clearRect(0, 0, W(), H());
      drawBg();
      drawPipes();
      drawBase();
      drawBird();
      if (state === 'idle' || state === 'dead') drawOverlay();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ── skeleton on camera feed ── */
    var CONN = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24]];
    var JTS  = [0,11,12,13,14,15,16,23,24];

    function drawSkel(lm) {
      skx.clearRect(0, 0, sk.width, sk.height);
      function vis(pt) { return pt && (pt.visibility === undefined || pt.visibility > 0.35); }
      function sx(pt) { return (1 - pt.x) * sk.width; }
      function sy(pt) { return pt.y * sk.height; }
      CONN.forEach(function (c) {
        var a = lm[c[0]], b = lm[c[1]];
        if (!vis(a) || !vis(b)) return;
        var isL = c[0] === 11 || c[0] === 13 || c[1] === 13 || c[1] === 15;
        var isR = c[0] === 12 || c[0] === 14 || c[1] === 14 || c[1] === 16;
        skx.strokeStyle = isL
          ? (leftStr > 0.22 ? '#c8f135' : 'rgba(255,255,255,0.55)')
          : isR
            ? (rightStr > 0.22 ? '#c8f135' : 'rgba(255,255,255,0.55)')
            : 'rgba(255,255,255,0.3)';
        skx.lineWidth = 2;
        skx.beginPath(); skx.moveTo(sx(a), sy(a)); skx.lineTo(sx(b), sy(b)); skx.stroke();
      });
      JTS.forEach(function (idx) {
        var pt = lm[idx];
        if (!vis(pt)) return;
        var hi = (idx === 15 && leftStr > 0.22) || (idx === 16 && rightStr > 0.22);
        skx.beginPath(); skx.arc(sx(pt), sy(pt), hi ? 6 : 4, 0, Math.PI * 2);
        skx.fillStyle = hi ? '#c8f135' : '#fff'; skx.fill();
      });
    }

    /* ── ready coordination ── */
    var spritesOk = false;
    var poseOk    = false;

    function checkReady() {
      if (spritesOk && poseOk) loaderEl.style.display = 'none';
    }

    function onSpritesReady() { spritesOk = true; checkReady(); }

    /* ── wait for MediaPipe then start camera ── */
    function waitForPose(cb, n) {
      if (typeof Pose !== 'undefined') { cb(); return; }
      if ((n || 0) > 120) {
        loaderEl.style.display = 'none';
        camPh.innerHTML = 'Pose model failed.<br>Check connection and reopen.';
        return;
      }
      setTimeout(function () { waitForPose(cb, (n || 0) + 1); }, 150);
    }

    waitForPose(function () {
      var pose = new Pose({
        locateFile: function (f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + f; }
      });
      pose.setOptions({
        modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false,
        minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      pose.onResults(function (res) {
        if (!res.poseLandmarks) return;
        var lm = res.poseLandmarks;
        var ls = lm[11], rs = lm[12], lw = lm[15], rw = lm[16];
        function vis(pt, thr) { return pt && (pt.visibility === undefined || pt.visibility > thr); }
        var lVis = vis(ls, 0.4) && vis(lw, 0.3);
        var rVis = vis(rs, 0.4) && vis(rw, 0.3);
        var lS = lVis ? Math.max(0, Math.min(1, (ls.y - lw.y) * 5.0)) : 0;
        var rS = rVis ? Math.max(0, Math.min(1, (rs.y - rw.y) * 5.0)) : 0;
        onArm(lS, rS);
        drawSkel(lm);
      });

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      .then(function (stream) {
        vid.srcObject = stream;
        return vid.play();
      })
      .then(function () {
        camPh.style.display = 'none';
        poseOk = true;
        checkReady();
        (function loop() {
          if (vid.readyState >= 2) pose.send({ image: vid }).catch(function () {});
          requestAnimationFrame(loop);
        })();
      })
      .catch(function (err) {
        loaderEl.style.display = 'none';
        camPh.innerHTML = 'Camera denied.<br>Enable permission and reopen.';
        console.warn('[FlappyArms] camera:', err && (err.message || err));
      });
    });
  })();
  </script>
</body>
</html>`;

export default function FlappyBirdGame({ navigation }) {
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [, requestPermission] = useCameraPermissions();

  useEffect(() => {
    let mounted = true;
    requestPermission()
      .then(() => { if (mounted) setReady(true); })
      .catch(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [requestPermission]);

  const onMessage = useCallback((e) => {
    try {
      const { type, score, best } = JSON.parse(e.nativeEvent.data);
      if (type === 'gameOver') console.log('[FlappyArms] score:', score, 'best:', best);
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
          onPermissionRequest={(request) => request.grant(request.resources)}
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
  root:    { flex: 1, backgroundColor: '#0F0B1E' },
  web:     { flex: 1, backgroundColor: '#0F0B1E' },
  wait:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  waitTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  back: {
    position: 'absolute', left: 14, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(12,8,26,0.88)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)',
  },
  backTxt: { color: '#C8F135', fontSize: 13, fontWeight: '700' },
});
