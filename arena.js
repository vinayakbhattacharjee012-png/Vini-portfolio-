/* Loading arena: a 2.4s holographic duel on first visit, then out of the way. */
(function () {
  "use strict";
  var root = document.documentElement;
  var loader = document.getElementById("loader");
  if (!loader) { root.classList.remove("loading"); return; }

  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var DUR = 2400, CYAN = "#06b6d4", VIOLET = "#8b5cf6";
  var seen = false;
  try { seen = sessionStorage.getItem("arenaSeen") === "1"; } catch (e) {}

  var cv = document.getElementById("arenaCanvas"), ctx = cv.getContext("2d");
  var bar = document.getElementById("arenaBar"), pct = document.getElementById("arenaPct");
  var sndBtn = document.getElementById("arenaSound"), skipBtn = document.getElementById("arenaSkip");
  var slices = loader.querySelectorAll(".arena-slice");

  var W = 0, H = 0, DPR = 1, raf = 0, t0 = 0, pausedAt = 0;
  var loaded = document.readyState === "complete", finished = true, skipping = false;
  var parts = [], trails = { a: [], b: [] }, shake = { t: -1e9, amp: 0 }, hits = { a: 0, b: 0 };
  var ev = {};
  var ac = null, soundOn = false;
  try { soundOn = localStorage.getItem("arenaSound") === "on"; } catch (e) {}

  function done() {
    root.classList.remove("loading");
    loader.classList.add("done");
  }
  function end() {
    if (finished) return;
    finished = true; cancelAnimationFrame(raf); raf = 0;
    try { sessionStorage.setItem("arenaSeen", "1"); } catch (e) {}
    cv.style.transform = "";
    loader.classList.add("exit");
    setTimeout(done, 380);
  }

  // Repeat visits and reduced motion get a short fade, not the duel.
  if (reduce || seen) {
    loader.classList.add("quick");
    setTimeout(done, reduce ? 150 : 350);
    window.__arenaReplay = function () { loader.classList.remove("done"); skipBtn.hidden = false; replayFromQuick(); };
    return;
  }

  // ---------- sound: synthesised, muted by default ----------
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function noise(dur, freq, gain) {
    if (!soundOn) return;
    var a = audio(); if (!a) return;
    var n = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = n; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  function clash() { noise(0.18, 2400, 0.35); }
  function whoosh() { noise(0.35, 700, 0.18); }
  function setSound(on) {
    soundOn = on;
    try { localStorage.setItem("arenaSound", on ? "on" : "off"); } catch (e) {}
    sndBtn.textContent = "[SOUND: " + (on ? "ON" : "OFF") + "]";
    sndBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) audio();
  }
  sndBtn.addEventListener("click", function () { setSound(!soundOn); });
  setSound(soundOn);

  // ---------- drawing helpers ----------
  function size() {
    var r = loader.getBoundingClientRect();
    W = r.width || innerWidth; H = r.height || innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); }
  function seg(p, a, b) { return ease((p - a) / (b - a)); }
  function floorY() { return H * 0.74; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); }
  function line(a, b, w, col) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); }

  // A fighter is a skeleton of joints; `o` carries this frame's pose adjustments.
  function pose(x, dir, o) {
    var s = Math.min(W, H) * 0.22, fy = floorY();
    var hipY = fy - s * 0.9 + (o.lift || 0), top = hipY - s * 0.85, headR = s * 0.13;
    var lean = (o.lean || 0) * dir;
    var hip = [x, hipY], shoulder = [x + lean * s * 0.15, top + s * 0.12];
    return {
      head: [x + lean * s * 0.2, top - headR * 0.4], headR: headR, shoulder: shoulder, hip: hip,
      legA: o.legA || [x - dir * s * 0.18, fy], legB: o.legB || [x + dir * s * 0.18, fy],
      hand: o.hand || [x + dir * s * 0.45, shoulder[1] + s * 0.1], s: s, dir: dir, angle: o.angle || 0
    };
  }
  function drawFighter(p, col, weapon) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var glow = "rgba(" + rgb(col) + ",.35)";
    [[p.hip, p.legA], [p.hip, p.legB], [p.hip, p.shoulder], [p.shoulder, p.hand]].forEach(function (l) {
      line(l[0], l[1], 4, glow); line(l[0], l[1], 1.6, col);
    });
    ctx.beginPath(); ctx.arc(p.head[0], p.head[1], p.headR, 0, Math.PI * 2); ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke();
    var len = p.s * (weapon === "katana" ? 0.9 : 0.35), ang = p.angle + (p.dir > 0 ? 0 : Math.PI);
    var tip = [p.hand[0] + Math.cos(ang) * len, p.hand[1] + Math.sin(ang) * len];
    line(p.hand, tip, 6, "rgba(" + rgb(col) + ",.25)"); line(p.hand, tip, 1.8, "#eafcff");
    ctx.restore();
  }
  function spark(x, y, col, n) {
    for (var i = 0; i < n && parts.length < 160; i++) {
      var a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1, col: Math.random() < .5 ? col : "#eafcff" });
    }
  }
  function drawGrid(p) {
    var fy = floorY(), vx = W / 2, vy = fy - H * 0.35, a = 0.10 + 0.08 * p;
    ctx.save(); ctx.strokeStyle = "rgba(6,182,212," + a.toFixed(3) + ")"; ctx.lineWidth = 1;
    for (var i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + i * W * 0.18, H); ctx.stroke(); }
    var off = (performance.now() * 0.00004) % 1;
    for (var k = 0; k < 8; k++) { var y = fy + (H - fy) * Math.pow((k + off) / 8, 1.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }
  function drawHP(x, y, w, v, col, mirror) {
    var segs = 20, gap = 3, sw = (w - gap * (segs - 1)) / segs;
    for (var i = 0; i < segs; i++) {
      var on = (i + 1) / segs <= v + 0.0001;
      var sx = mirror ? x + w - (i + 1) * sw - i * gap : x + i * (sw + gap);
      ctx.fillStyle = on ? col : "rgba(255,255,255,.08)";
      ctx.shadowColor = col; ctx.shadowBlur = on ? 8 : 0;
      ctx.fillRect(sx, y, sw, 8);
    }
    ctx.shadowBlur = 0;
  }

  // ---------- frame: the choreography, driven by progress 0..1 ----------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var p = skipping ? 1 : Math.min(1, (now - t0) / DUR);
    if (!loaded && p >= 1) p = 0.999;                 // hold the last beat until the page has loaded
    bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    pct.textContent = String(Math.round(p * 100));
    ctx.clearRect(0, 0, W, H);

    var ax = W * (0.05 + 0.40 * seg(p, 0, 0.35)), bx = W * (0.95 - 0.40 * seg(p, 0, 0.35));
    if (p >= 0.35) { ax = W * 0.45; bx = W * 0.55; }
    var a = { angle: -0.6 }, b = { angle: 0.6 };

    if (p >= 0.35 && p < 0.70) {                     // 3-hit exchange
      var sweep = seg(p, 0.40, 0.46), flip = seg(p, 0.52, 0.62), wave = seg(p, 0.64, 0.70);
      a.legA = [ax - W * 0.02 - W * 0.09 * sweep, floorY() + H * 0.02 * sweep];   // low sweep
      a.lift = -H * 0.22 * Math.sin(Math.PI * flip);                             // aerial flip
      a.angle = -0.6 + Math.PI * 2 * flip;
      b.lean = -0.5 * wave;
      ax -= W * 0.02 * wave; bx += W * 0.06 * wave;                              // energy-wave parry
    }
    if (p >= 0.70) {                                 // finisher
      var raise = seg(p, 0.70, 0.80), slash = seg(p, 0.80, 0.86);
      a.angle = -1.2 + 2.7 * slash - 0.5 * (1 - raise);
      a.hand = [ax + W * 0.04, floorY() - H * 0.28 - H * 0.1 * (1 - raise)];
      bx += W * 0.25 * seg(p, 0.84, 0.92);
    }
    var fa = pose(ax, 1, a), fb = pose(bx, -1, b);
    trails.a.unshift([fa.head[0], fa.head[1]]); trails.b.unshift([fb.head[0], fb.head[1]]);
    if (trails.a.length > 7) trails.a.pop(); if (trails.b.length > 7) trails.b.pop();

    drawGrid(p);
    [[trails.a, CYAN], [trails.b, VIOLET]].forEach(function (tr) {
      tr[0].forEach(function (pt, i) {
        ctx.beginPath(); ctx.arc(pt[0], pt[1], fa.headR * (1 - i / 9), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + rgb(tr[1]) + "," + (0.18 * (1 - i / 8)).toFixed(3) + ")"; ctx.fill();
      });
    });

    if (!ev.clash && p >= 0.35) { ev.clash = 1; spark(W * 0.5, floorY() - H * 0.3, "#eafcff", 60); shake = { t: now, amp: 3 }; clash(); }
    if (!ev.h1 && p >= 0.42) { ev.h1 = 1; hits.b++; spark(bx, floorY() - H * 0.1, CYAN, 26); clash(); }
    if (!ev.h2 && p >= 0.55) { ev.h2 = 1; hits.b++; spark(bx, floorY() - H * 0.3, CYAN, 30); clash(); whoosh(); }
    if (!ev.h3 && p >= 0.66) { ev.h3 = 1; hits.a++; spark(ax, floorY() - H * 0.25, VIOLET, 28); whoosh(); shake = { t: now, amp: 4 }; }
    if (!ev.fin && p >= 0.82) { ev.fin = 1; spark(W * 0.6, floorY() - H * 0.3, CYAN, 80); clash(); shake = { t: now, amp: 3 }; }

    drawFighter(fb, VIOLET, "daggers");
    drawFighter(fa, CYAN, "katana");

    if (p >= 0.80 && p < 0.9) {                      // horizontal light-slash
      var s = seg(p, 0.80, 0.86);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(6,182,212," + (0.9 * (1 - seg(p, 0.86, 0.9))).toFixed(3) + ")";
      ctx.lineWidth = 3; ctx.shadowColor = CYAN; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W * s, H * 0.5); ctx.stroke(); ctx.restore();
    }

    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.x += q.vx / 60; q.y += q.vy / 60; q.vy += 5; q.life -= 0.025;
      if (q.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = q.life; ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;

    var hpA = 1 - 0.18 * hits.a, hpB = 1 - 0.2 * hits.b - (p >= 0.84 ? 0.5 * seg(p, 0.84, 0.92) : 0);
    drawHP(W * 0.06, 18, W * 0.38, Math.max(0, hpA), CYAN, false);
    drawHP(W * 0.56, 18, W * 0.38, Math.max(0, hpB), VIOLET, true);

    var sh = shake.amp * Math.max(0, 1 - (now - shake.t) / 160);
    cv.style.transform = sh > 0.05 ? "translate(" + ((Math.random() - .5) * sh * 2).toFixed(2) + "px," + ((Math.random() - .5) * sh * 2).toFixed(2) + "px)" : "";

    if (p >= 0.9) {                                  // the screen splits and parts
      var sp = seg(p, 0.9, 1);
      loader.classList.add("split");
      slices[0].style.transform = "translateY(" + (-sp * 100).toFixed(2) + "%)";
      slices[1].style.transform = "translateY(" + (sp * 100).toFixed(2) + "%)";
    }
    if (p >= 1 && loaded) end();
  }

  // ---------- control ----------
  function reset() {
    parts = []; hits = { a: 0, b: 0 }; trails = { a: [], b: [] }; ev = {};
    loader.classList.remove("split", "exit", "done", "quick");
    slices[0].style.transform = "translateY(0)"; slices[1].style.transform = "translateY(0)";
  }
  function start(fromSkip) {
    reset(); finished = false; skipping = !!fromSkip;
    if (!fromSkip) size();
    t0 = performance.now(); raf = requestAnimationFrame(frame);
  }
  function skip() {
    if (finished) return;
    skipping = true; loaded = true;
  }
  function replay() {
    if (!finished) return;                             // already playing
    loaded = true; start(false);
  }
  function replayFromQuick() {
    if (!finished) return;
    loaded = true; start(false);
  }

  skipBtn.addEventListener("click", skip);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !finished && loader.isConnected) skip();
  });
  window.addEventListener("resize", function () { if (!finished) size(); }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (finished) return;
    if (document.hidden) { pausedAt = performance.now(); cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { t0 += performance.now() - pausedAt; raf = requestAnimationFrame(frame); }
  });
  if (!loaded) window.addEventListener("load", function () { loaded = true; });

  window.__arenaReplay = replay;
  start(false);
})();
