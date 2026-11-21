/* #/earth-core: cutaway Earth, drill probe, seismic wave simulator. Canvas 2D, no network. Exposes window.__earth. */
(function () {
  "use strict";
  var M = window.EarthModel, R = M.R, host = document.getElementById("ec-root");
  if (!host || host.dataset.ready) return; host.dataset.ready = "1";
  var root = document.documentElement, reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function lite() { return root.classList.contains("lite"); }
  function f(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function ev(name) { try { window.dispatchEvent(new CustomEvent("cosmos:event", { detail: name })); } catch (e) {} }

  host.innerHTML =
    '<div class="ec-grid"><div class="ec-stage"><canvas id="ecCv" width="720" height="560" role="img" aria-label="Rotating holographic Earth with a quarter cutaway showing crust, mantle, outer core and inner core"></canvas>' +
    '<p class="ec-hint" id="ecHint">Click the crust to trigger an earthquake. Click any layer to inspect it.</p></div>' +
    '<div class="ec-side">' +
    '<div class="ec-card ec-journey" id="ecJ"><h2>My journey, drilled</h2><p class="ec-note" style="margin-top:0">Each depth is a layer of the work on this site. The order follows how the stack builds on itself. It is not a timeline.</p>' +
    '<ol class="ec-steps" id="ecJs" aria-label="Journey stages"></ol><div id="ecJb" aria-live="polite"></div>' +
    '<div class="ec-row"><button type="button" class="w2-go alt" id="ecJp">← Back</button><button type="button" class="w2-go" id="ecJn">Drill deeper →</button><button type="button" class="w2-go alt" id="ecJa">Play</button><button type="button" class="w2-go alt" id="ecJc">Save card</button></div></div>' +
    '<div class="ec-card"><h2>Exploded view</h2><input type="range" id="ecEx" min="0" max="100" value="0" aria-label="Exploded view percent"/><output id="ecExV">0%</output>' +
    '<div class="ec-row"><button type="button" class="w2-go alt" id="ecScale" aria-pressed="false">Scale: visual</button><button type="button" class="w2-go alt" id="ecReset">Reset</button></div></div>' +
    '<div class="ec-card"><h2>Deep-core drill probe</h2><input type="range" id="ecDr" min="0" max="6371" value="0" aria-label="Drill depth in kilometres"/>' +
    '<div class="ec-row"><button type="button" class="w2-go" id="ecAuto">Auto-drill</button><b id="ecDepth">0 km</b></div>' +
    '<dl class="ec-dl" id="ecProbe" aria-live="polite"></dl></div>' +
    '<div class="ec-card"><h2>Seismic wave simulator</h2><label class="lbl" for="ecMag">Magnitude <b id="ecMagV">7.5</b></label><input type="range" id="ecMag" min="50" max="95" value="75"/>' +
    '<label class="lbl" for="ecQd">Focal depth <b id="ecQdV">10 km</b></label><input type="range" id="ecQd" min="0" max="700" value="10"/>' +
    '<div class="ec-row"><button type="button" class="w2-go alt" id="ecQuake">Quake at random</button><button type="button" class="w2-go alt" id="ecClear">Clear</button></div>' +
    '<p class="ec-key"><i class="p"></i>P-wave (compression) <i class="s"></i>S-wave (shear)</p><p class="ec-note" id="ecQnote">No event yet.</p></div>' +
    '<div class="ec-card" id="ecInsp" aria-live="polite"><h2>Layer inspector</h2><div class="ec-row" id="ecLb"></div><div id="ecInspBody"><p class="ec-note">Pick a layer.</p></div></div>' +
    '<a class="w2-go ec-orbit" href="#/cosmos">Zoom out to orbit →</a></div></div>';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $("ecCv"), c = cv.getContext("2d"), W = 720, H = 560, cx = W / 2, cy = H / 2 + 6, RP = 168;
  var st = { ex: 0, exT: 0, trueScale: false, depth: 0, auto: 0, hover: -1, q: null, qt: 0, plume: null, pol: 1, polT: 1, mag: 7.5, qd: 10, t0: performance.now() };

  /* geometry */
  var VF = [[1, 0.9], [0.9, 0.55], [0.55, 0.22], [0.22, 0]], TF = [[1, (R - 70) / R], [(R - 70) / R, 3481 / R], [3481 / R, 1221 / R], [1221 / R, 0]];
  function fr() { return st.trueScale ? TF : VF; }
  function band(k, ex) { var g = ex * 26, s = (3 - k) * g, F = fr()[k]; return { ro: F[0] * RP + s, ri: F[1] * RP + s }; }
  function rOfDepth(d, ex) { // km depth -> px radius on layer k
    var k = M.layerOf(d), i = M.LAYERS.indexOf(k), L = M.LAYERS[i], b = band(i, ex), t = (d - L.from) / (L.to - L.from);
    return b.ro + (b.ri - b.ro) * t;
  }
  function layerAtR(r) { for (var k = 0; k < 4; k++) { var b = band(k, st.ex); if (r <= b.ro && r >= b.ri) return k; } return -1; }

  /* seismic ray tracing through the layered velocity model (Snell in a sphere: p = r sin(i) / v) */
  function vel(r, w) { var a = M.at(R - r); return w === "P" ? a.vp : a.vs; }
  function trace(d0, deg, w) {
    var r = R - d0, v0 = vel(r, w); if (v0 < 0.1) return null;
    var p = r * Math.sin(deg * Math.PI / 180) / v0, th = 0, t = 0, dr = 20, pts = [[0, d0, 0]], ended = "surface";
    while (r > 60) {
      var v = vel(r, w); if (w === "S" && v < 0.1) { ended = "core"; break; }
      var s = p * v / r; if (s >= 1) break;
      var tn = Math.tan(Math.asin(s)), dth = dr * tn / r, ds = Math.sqrt(dr * dr + Math.pow(r * dth, 2));
      th += dth; t += ds / v; r -= dr; pts.push([th, R - r, t]);
    }
    if (ended === "core") return { pts: pts, end: "core", delta: th * 180 / Math.PI };
    var n = pts.length, tot = pts[n - 1][2], tt = pts[n - 1][0], out = pts.slice();
    for (var i = n - 2; i >= 0; i--) out.push([2 * tt - pts[i][0], pts[i][1], 2 * tot - pts[i][2]]);
    return { pts: out, end: "surface", delta: 2 * tt * 180 / Math.PI };
  }
  function quake(angDeg, mag, depth) {
    var a = angDeg * Math.PI / 180, rays = [], i, stopped = 0, nS = 0, P = [];
    for (i = 4; i <= 86; i += 5) { var rp = trace(depth, i, "P"); if (rp) rays.push({ w: "P", r: rp }); var rs = trace(depth, i, "S"); if (rs) { nS++; if (rs.end === "core") stopped++; rays.push({ w: "S", r: rs }); } }
    rays.forEach(function (x) { if (x.w === "P" && x.r.end === "surface") P.push(x.r.delta); });
    st.q = { a: a, mag: mag, depth: depth, rays: rays, stopped: stopped, nS: nS }; st.qt = 0; st.t0 = performance.now();
    var E = Math.pow(10, 1.5 * mag + 4.8);
    $("ecQnote").textContent = "M" + mag.toFixed(1) + " at " + depth + " km. Radiated energy about " + E.toExponential(1) + " J. " + stopped + " of " + nS + " S-rays stopped at the liquid outer core. Shadow zones: S beyond 104°, P between 104° and 140°.";
    $("ecHint").textContent = "Waves running. Amber arc: P shadow zone. Violet arc: S shadow zone.";
    ev("quake"); wake();
  }

  /* drawing */
  function ring(ro, ri, a0, a1, col, al) {
    c.beginPath(); c.arc(cx, cy, ro, a0, a1); c.arc(cx, cy, Math.max(0, ri), a1, a0, true); c.closePath(); c.globalAlpha = al; c.fillStyle = col; c.fill(); c.globalAlpha = 1;
  }
  function frame(now) {
    var t = (now - st.t0) / 1000, L = lite(), ex = st.ex, i, k;
    c.clearRect(0, 0, W, H);
    var tp = performance.now() / 1000 * (reduce ? 0 : 1);
    // dipole field lines (outer core dynamo)
    c.lineWidth = 1; c.setLineDash([6, 8]); c.lineDashOffset = -tp * 14;
    [1.45, 1.75, 2.1].forEach(function (Lv, n) {
      c.strokeStyle = n % 2 ? "rgba(139,92,246," + (0.55 * Math.abs(st.pol)) + ")" : "rgba(6,182,212," + (0.55 * Math.abs(st.pol)) + ")";
      [-1, 1].forEach(function (sg) {
        c.beginPath(); var on = false;
        for (var a = 0.05; a < Math.PI - 0.04; a += 0.05) { var r = Lv * RP * Math.sin(a) * Math.sin(a); if (r < RP * 0.99) { on = false; continue; } var x = cx + sg * r * Math.sin(a), y = cy - r * Math.cos(a) * st.pol; if (!on) { c.moveTo(x, y); on = true; } else c.lineTo(x, y); }
        c.stroke();
      });
    });
    c.setLineDash([]);
    // translucent full shells
    for (k = 0; k < 4; k++) { var b = band(k, ex); ring(b.ro, b.ri, 0, 6.2832, M.LAYERS[k].col, st.hover === k ? 0.3 : 0.12); c.strokeStyle = "rgba(232,247,251,.18)"; c.beginPath(); c.arc(cx, cy, b.ro, 0, 6.2832); c.stroke(); }
    // surface hologram grid (outside the cutaway quadrant)
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.moveTo(cx, cy); c.lineTo(cx, cy - 400); c.lineTo(cx + 400, cy - 400); c.lineTo(cx + 400, cy); c.closePath(); c.clip("evenodd");
    var Rs = band(0, ex).ro, phi = tp * 0.25; c.strokeStyle = "rgba(6,182,212,.28)";
    for (i = 0; i < 12; i++) {
      var lon = i * Math.PI / 6 + phi; if (Math.cos(lon) <= 0) continue; c.beginPath();
      for (var la = -90; la <= 90; la += 10) { var lr = la * Math.PI / 180, x = cx + Rs * Math.cos(lr) * Math.sin(lon), y = cy - Rs * Math.sin(lr); la === -90 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
    }
    for (var lt = -60; lt <= 60; lt += 30) { var ly = cy - Rs * Math.sin(lt * Math.PI / 180), hw = Rs * Math.cos(lt * Math.PI / 180); c.beginPath(); c.moveTo(cx - hw, ly); c.lineTo(cx + hw, ly); c.stroke(); }
    c.restore();
    // bright cutaway quadrant (top right)
    c.save(); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 400); c.lineTo(cx + 400, cy - 400); c.lineTo(cx + 400, cy); c.closePath(); c.clip();
    var A0 = -Math.PI / 2, A1 = 0, grad;
    for (k = 0; k < 4; k++) {
      var bb = band(k, ex); grad = c.createRadialGradient(cx, cy, bb.ri, cx, cy, bb.ro);
      var col = M.LAYERS[k].col; grad.addColorStop(0, col); grad.addColorStop(1, k === 3 ? "#e8f7fb" : col);
      c.globalAlpha = st.hover === k ? 0.95 : 0.72; c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, bb.ro, A0, A1); c.arc(cx, cy, Math.max(0, bb.ri), A1, A0, true); c.closePath(); c.fill(); c.globalAlpha = 1;
    }
    // mantle convection cells
    var m = band(1, ex), mid = (m.ro + m.ri) / 2, half = (m.ro - m.ri) / 2 - 3;
    c.lineWidth = 1.4; c.setLineDash([5, 6]); c.lineDashOffset = -tp * 22; c.strokeStyle = "rgba(255,255,255,.55)";
    [-72, -46, -20].forEach(function (ad, n) { var a = ad * Math.PI / 180, ox = cx + mid * Math.cos(a), oy = cy + mid * Math.sin(a); c.beginPath(); c.ellipse(ox, oy, Math.max(6, half * 0.7), Math.max(6, half), a + 1.5708, 0, 6.2832); c.stroke(); });
    // outer core dynamo swirl
    var o = band(2, ex); c.strokeStyle = "rgba(255,230,180,.7)";
    for (i = 0; i < 4; i++) { var rr = o.ri + (o.ro - o.ri) * (i + 1) / 5; c.lineDashOffset = (i % 2 ? 1 : -1) * tp * 26; c.beginPath(); c.arc(cx, cy, rr, A0, A1); c.stroke(); }
    c.setLineDash([]);
    // inner core lattice
    var ic = band(3, ex); c.save(); c.beginPath(); c.arc(cx, cy, ic.ro, A0, A1); c.lineTo(cx, cy); c.clip(); c.strokeStyle = "rgba(6,7,10,.35)"; c.lineWidth = 1;
    for (i = -8; i < 9; i++) { c.beginPath(); c.moveTo(cx + i * 9 + Math.sin(tp * 0.3) * 4, cy - 90); c.lineTo(cx + i * 9 + 40 + Math.sin(tp * 0.3) * 4, cy + 20); c.stroke(); c.beginPath(); c.moveTo(cx + i * 9, cy - 90); c.lineTo(cx + i * 9 - 40, cy + 20); c.stroke(); }
    c.restore();
    // plume preset
    if (st.plume) {
      var pa = st.plume.ang * Math.PI / 180, r0 = band(1, ex).ri, r1 = band(0, ex).ro; c.strokeStyle = "#fbbf24"; c.lineWidth = 3; c.beginPath();
      for (i = 0; i <= 24; i++) { var u = i / 24, rr2 = r0 + (r1 - r0) * u, w = Math.sin(u * 9 + tp * 3) * 5 * (1 - u * 0.4); c.lineTo(cx + rr2 * Math.cos(pa) - w * Math.sin(pa), cy + rr2 * Math.sin(pa) + w * Math.cos(pa)); } c.stroke();
    }
    // cut edges + drill probe
    c.strokeStyle = "rgba(6,182,212,.9)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - band(0, ex).ro); c.moveTo(cx, cy); c.lineTo(cx + band(0, ex).ro, cy); c.stroke();
    var dy = rOfDepth(st.depth, ex); c.strokeStyle = "#e8f7fb"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, cy - band(0, ex).ro); c.lineTo(cx, cy - dy); c.stroke();
    c.fillStyle = "#06070a"; c.strokeStyle = "#e8f7fb"; c.beginPath(); c.arc(cx, cy - dy, 5, 0, 6.2832); c.fill(); c.stroke();
    // journey stage markers along the drill axis
    c.font = '700 10px ui-monospace, Menlo, monospace'; c.textAlign = "center";
    JOURNEY.forEach(function (j, n) { var jy = cy - rOfDepth(j.d, ex), on = n === st.stage; c.fillStyle = on ? "#e8f7fb" : "rgba(6,7,10,.85)"; c.strokeStyle = on ? "#06070a" : "#e8f7fb"; var jx = cx + (n % 2 ? 14 : 28); c.beginPath(); c.arc(jx, jy, 8, 0, 6.2832); c.fill(); c.stroke(); c.fillStyle = on ? "#06070a" : "#e8f7fb"; c.fillText(n + 1, jx, jy + 3.5); });
    c.textAlign = "left"; c.restore();
    // Kola borehole (12 km) on the crust at -50 degrees
    var ka = -50 * Math.PI / 180, ro0 = band(0, ex).ro, kr = rOfDepth(12, ex); c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + ro0 * Math.cos(ka), cy + ro0 * Math.sin(ka)); c.lineTo(cx + kr * Math.cos(ka), cy + kr * Math.sin(ka)); c.stroke();
    c.fillStyle = "#e8f7fb"; c.font = '600 11px ui-monospace, Menlo, monospace'; c.fillText("Kola 12 km", cx + (ro0 + 8) * Math.cos(ka), cy + (ro0 + 8) * Math.sin(ka) - 2);
    // labels
    c.font = '600 11px ui-monospace, Menlo, monospace'; c.fillStyle = "#06070a";
    for (k = 0; k < 4; k++) { var lb = band(k, ex), lr2 = (lb.ro + lb.ri) / 2, la2 = -Math.PI / 4; if (lr2 > 14) c.fillText(M.LAYERS[k].name, cx + lr2 * Math.cos(la2) - 20, cy + lr2 * Math.sin(la2) + 4); }
    // seismic waves
    var q = st.q;
    if (q) {
      var speed = reduce ? 1e6 : 170, tt = (now - st.t0) / 1000 * speed, alive = false, sg, base = function (d) { return rOfDepth(d, 0); };
      var Rb = base(0); var sx = cx + Rb * Math.cos(q.a), sy = cy + Rb * Math.sin(q.a), pulse = (tt % 220) / 220;
      c.strokeStyle = "rgba(251,191,36," + (1 - pulse) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 6 + pulse * (14 + (q.mag - 5) * 6), 0, 6.2832); c.stroke();
      [1, -1].forEach(function (sgn) {
        q.rays.forEach(function (ry) {
          var pts = ry.r.pts, n = pts.length, j = 0; c.beginPath(); c.lineWidth = ry.w === "P" ? 1.3 : 1.1; c.strokeStyle = ry.w === "P" ? "rgba(6,182,212,.85)" : "rgba(139,92,246,.9)"; c.setLineDash(ry.w === "S" ? [4, 3] : []);
          while (j < n && pts[j][2] <= tt) { var pr = base(pts[j][1]), an = q.a + sgn * pts[j][0]; j === 0 ? c.moveTo(cx + pr * Math.cos(an), cy + pr * Math.sin(an)) : c.lineTo(cx + pr * Math.cos(an), cy + pr * Math.sin(an)); j++; }
          c.stroke(); if (j < n) alive = true;
          if (j > 0 && j < n) { var hr = base(pts[j - 1][1]), ha = q.a + sgn * pts[j - 1][0]; c.fillStyle = ry.w === "P" ? "#06b6d4" : "#8b5cf6"; c.beginPath(); c.arc(cx + hr * Math.cos(ha), cy + hr * Math.sin(ha), 2.2, 0, 6.2832); c.fill(); }
        });
        c.setLineDash([]); var rr3 = Rb + 10;
        c.lineWidth = 6; c.strokeStyle = "rgba(139,92,246,.55)"; c.beginPath(); c.arc(cx, cy, rr3 + 7, q.a + sgn * 1.8157, q.a + sgn * Math.PI, sgn < 0); c.stroke();
        c.strokeStyle = "rgba(251,191,36,.85)"; c.beginPath(); c.arc(cx, cy, rr3, q.a + sgn * 1.8151, q.a + sgn * 2.4435, sgn < 0); c.stroke();
      });
      if (!alive && tt > 2000) { /* leave the final frame; shadow zones stay on screen */ }
    }
  }

  /* loop: runs only while the route is visible, the tab is visible and the canvas is on screen */
  var raf = 0, last = 0, vis = true, onRoute = false;
  function tick(now) {
    raf = 0; if (!onRoute || document.hidden || !vis) return;
    var gap = lite() ? 1000 / 24 : 1000 / 50;
    if (now - last >= gap) { last = now; update(now); frame(now); if (reduce) return; }
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && onRoute && !document.hidden && vis) raf = requestAnimationFrame(tick); }
  function update(now) {
    st.ex = reduce ? st.exT : st.ex + (st.exT - st.ex) * 0.18; if (Math.abs(st.exT - st.ex) < 0.002) st.ex = st.exT;
    st.pol += (st.polT - st.pol) * 0.04;
    if (st.target != null) { var df = st.target - st.depth; st.depth = reduce || Math.abs(df) < 8 ? st.target : st.depth + df * 0.12; if (st.depth === st.target) st.target = null; paintProbe(); $("ecDr").value = st.depth; }
    if (st.auto) { st.depth += 28 * st.auto; if (st.depth >= R) { st.depth = R; st.auto = 0; $("ecAuto").textContent = "Auto-drill"; } paintProbe(); $("ecDr").value = st.depth; }
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; wake(); }).observe(cv);
  function sync() { onRoute = location.hash === "#/earth-core"; if (onRoute) { ev("earth"); wake(); } }
  window.addEventListener("hashchange", sync); document.addEventListener("visibilitychange", wake); sync();

  /* UI */
  function paintProbe() {
    var a = M.at(st.depth); $("ecDepth").textContent = f(st.depth) + " km";
    $("ecProbe").innerHTML = "<dt>Layer</dt><dd>" + a.layer.name + "</dd><dt>Temperature</dt><dd>" + f(a.T) + " °C</dd><dt>Pressure</dt><dd>" + f(a.P, 1) + " GPa</dd><dt>Density</dt><dd>" + f(a.rho, 2) + " g/cm³</dd><dt>State</dt><dd>" + a.state + "</dd><dt>Vp / Vs</dt><dd>" + f(a.vp, 1) + " / " + (a.vs ? f(a.vs, 1) : "none") + " km/s</dd>";
  }
  function inspect(k, quiet) {
    var L = M.LAYERS[k], lo = Infinity, hi = -Infinity, vp0 = 99, vp1 = 0, vs1 = 0, T0 = 1e9, T1 = 0, r0 = 99, r1 = 0, d;
    for (d = L.from; d <= L.to; d += 10) { var a = M.at(d + (d === L.to ? -0.01 : 0.01)); vp0 = Math.min(vp0, a.vp); vp1 = Math.max(vp1, a.vp); vs1 = Math.max(vs1, a.vs); T0 = Math.min(T0, a.T); T1 = Math.max(T1, a.T); r0 = Math.min(r0, a.rho); r1 = Math.max(r1, a.rho); }
    $("ecInspBody").innerHTML = '<h3 style="color:' + L.col + '">' + L.name + "</h3><dl class='ec-dl'><dt>Depth</dt><dd>" + f(L.from) + "–" + f(L.to) + " km (" + f(L.to - L.from) + " km thick)</dd><dt>Volume share</dt><dd>" + f(M.volShare(L) * 100, 1) + "% of Earth</dd><dt>P-wave speed</dt><dd>" + f(vp0, 1) + "–" + f(vp1, 1) + " km/s</dd><dt>S-wave speed</dt><dd>" + (vs1 ? "up to " + f(vs1, 1) + " km/s" : "0 (liquid, S-waves stop)") + "</dd><dt>Temperature</dt><dd>" + f(T0) + "–" + f(T1) + " °C</dd><dt>Density</dt><dd>" + f(r0, 1) + "–" + f(r1, 1) + " g/cm³</dd><dt>State</dt><dd>" + L.state + "</dd><dt>Composition</dt><dd>" + L.mineral + "</dd></dl><p class='ec-note'>" + L.note + (k === 1 ? " Mantle plus crust is about 84% of Earth's volume." : "") + "</p>";
    if (!quiet) ev("inspect");
  }
  $("ecLb").innerHTML = M.LAYERS.map(function (L, k) { return '<button type="button" class="w2-go alt" data-k="' + k + '">' + L.name + "</button>"; }).join("");
  $("ecLb").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) inspect(+b.dataset.k); });
  $("ecEx").addEventListener("input", function (e) { st.exT = e.target.value / 100; $("ecExV").textContent = e.target.value + "%"; wake(); if (+e.target.value > 0) ev("explode"); });
  $("ecScale").addEventListener("click", function () { st.trueScale = !st.trueScale; this.textContent = "Scale: " + (st.trueScale ? "true" : "visual"); this.setAttribute("aria-pressed", st.trueScale); wake(); });
  $("ecDr").addEventListener("input", function (e) { st.depth = +e.target.value; st.auto = 0; paintProbe(); wake(); if (st.depth > 5100) ev("drill-core"); });
  $("ecAuto").addEventListener("click", function () { if (st.auto) { st.auto = 0; this.textContent = "Auto-drill"; } else { if (st.depth >= R) st.depth = 0; st.auto = 1; this.textContent = "Pause"; ev("drill"); wake(); } });
  $("ecMag").addEventListener("input", function (e) { st.mag = e.target.value / 10; $("ecMagV").textContent = st.mag.toFixed(1); });
  $("ecQd").addEventListener("input", function (e) { st.qd = +e.target.value; $("ecQdV").textContent = st.qd + " km"; });
  $("ecQuake").addEventListener("click", function () { quake(-180 + Math.random() * 360, st.mag, st.qd); });
  $("ecClear").addEventListener("click", function () { st.q = null; $("ecQnote").textContent = "No event yet."; wake(); });
  $("ecReset").addEventListener("click", function () { st.exT = 0; st.trueScale = false; st.depth = 0; st.q = null; st.plume = null; st.polT = 1; $("ecEx").value = 0; $("ecExV").textContent = "0%"; $("ecScale").textContent = "Scale: visual"; $("ecDr").value = 0; paintProbe(); wake(); });
  function pos(e) { var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width - cx, y = (e.clientY - r.top) * H / r.height - cy; return { r: Math.sqrt(x * x + y * y), a: Math.atan2(y, x) * 180 / Math.PI }; }
  cv.addEventListener("pointermove", function (e) { var p = pos(e), k = layerAtR(p.r); if (k !== st.hover) { st.hover = k; wake(); } });
  cv.addEventListener("click", function (e) {
    var p = pos(e), k = layerAtR(p.r); if (k < 0) return;
    if (k === 0) { quake(p.a, st.mag, st.qd); } inspect(k);
  });
  /* My journey: copy comes from the Experience, About and Testing sections of this site. No dates are claimed. */
  var JOURNEY = [
    { d: 0, t: "Creator", w: "Surface", p: "Away from the keyboard I cut European football highlight edits to soundtracks I make myself." },
    { d: 35, t: "Moderation", w: "Crust", p: "Junior moderator in a Roblox community server of 90,000 members, and Head Administrator who owned Galaxy network hubs." },
    { d: 900, t: "Bots", w: "Upper mantle", p: "Bot developer: Nova 3.0 Ultimate with verification views, leveling, anti-spam and AFK tracking, live in communities." },
    { d: 2600, t: "Security", w: "Lower mantle", p: "Server security architect: a layered defence of anti-nuke, automod and containment, with ownership kept in a separate Vault Account." },
    { d: 4000, t: "Testing", w: "Outer core", p: "Every bot meets the same attacks in a private sandbox first: floods, mass joins, channel deletes, bad links, permission checks and false positives. Only a pass goes live." },
    { d: 5400, t: "Leadership", w: "Inner core", p: "Founder and director of the Galaxy network: five community brands with 1.5k to 2k members. Governance, mergers and treaties." },
    { d: 6371, t: "Now", w: "Centre", p: "Designing Polo, a health AI app with clinical safety guardrails, while keeping Nova and the communities running." }
  ];
  st.stage = 0; var jTimer = 0;
  $("ecJs").innerHTML = JOURNEY.map(function (j, i) { return '<li><button type="button" data-i="' + i + '"><i>' + (i + 1) + "</i>" + j.t + "</button></li>"; }).join("");
  function stage(i, quiet) {
    st.stage = Math.max(0, Math.min(JOURNEY.length - 1, i)); var j = JOURNEY[st.stage]; st.target = j.d; st.auto = 0; $("ecAuto").textContent = "Auto-drill";
    var a = M.at(j.d); Array.prototype.forEach.call($("ecJs").querySelectorAll("button"), function (b, n) { b.setAttribute("aria-current", n === st.stage ? "step" : "false"); });
    $("ecJb").innerHTML = "<h3>" + (st.stage + 1) + ". " + j.t + ' <span class="ec-note">· ' + j.w + " · " + f(j.d) + " km · " + f(a.T) + " °C</span></h3><p>" + j.p + "</p>";
    $("ecJn").disabled = st.stage === JOURNEY.length - 1; $("ecJp").disabled = st.stage === 0;
    if (!quiet) ev("journey"); wake();
  }
  function stopPlay() { clearInterval(jTimer); jTimer = 0; $("ecJa").textContent = "Play"; }
  $("ecJs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { stopPlay(); stage(+b.dataset.i); } });
  $("ecJn").addEventListener("click", function () { stopPlay(); stage(st.stage + 1); }); $("ecJp").addEventListener("click", function () { stopPlay(); stage(st.stage - 1); });
  $("ecJa").addEventListener("click", function () { if (jTimer) { stopPlay(); return; } if (st.stage >= JOURNEY.length - 1) stage(0); $("ecJa").textContent = "Pause"; jTimer = setInterval(function () { if (st.stage >= JOURNEY.length - 1 || document.hidden || !onRoute) { stopPlay(); return; } stage(st.stage + 1); }, 5200); });
  window.addEventListener("hashchange", function () { if (location.hash !== "#/earth-core") stopPlay(); });
  stage(0, true);
  // deep links from the home page and the palette pass the stage through sessionStorage
  function stored() { try { var v = sessionStorage.getItem("ecStage"); if (v != null) { sessionStorage.removeItem("ecStage"); stopPlay(); stage(+v); } } catch (e) {} }
  stored(); window.addEventListener("hashchange", function () { if (location.hash === "#/earth-core") stored(); });
  $("ecJ").addEventListener("keydown", function (e) {
    var k = e.key; if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "ArrowDown" && k !== "ArrowUp") return;
    if (e.target.tagName === "INPUT") return; e.preventDefault(); stopPlay(); stage(st.stage + (k === "ArrowRight" || k === "ArrowDown" ? 1 : -1));
    var cur = $("ecJs").querySelector("[aria-current=step]"); if (cur) cur.focus();
  });
  // shareable PNG of the whole journey (canvas, no network)
  $("ecJc").addEventListener("click", function () {
    var cc = document.createElement("canvas"); cc.width = 1000; cc.height = 640; var x = cc.getContext("2d"), g = x.createLinearGradient(0, 0, 1000, 640);
    x.fillStyle = "#06070a"; x.fillRect(0, 0, 1000, 640); g.addColorStop(0, "rgba(6,182,212,.35)"); g.addColorStop(1, "rgba(139,92,246,.35)"); x.fillStyle = g; x.fillRect(0, 0, 1000, 640);
    x.fillStyle = "#e8f7fb"; x.font = '700 40px "Space Grotesk", system-ui, sans-serif'; x.fillText("Vini: surface to core", 50, 80);
    x.fillStyle = "#9aa7b8"; x.font = '500 16px ui-monospace, Menlo, monospace'; x.fillText("A journey drilled through seven layers · simplified PREM-style model", 50, 112);
    JOURNEY.forEach(function (j, i) {
      var y = 160 + i * 62, a = M.at(j.d), L = a.layer;
      x.fillStyle = L.col; x.fillRect(50, y - 22, 6, 44); x.fillStyle = "#e8f7fb"; x.font = '700 24px system-ui, sans-serif'; x.fillText((i + 1) + ". " + j.t, 76, y - 2);
      x.fillStyle = "#9aa7b8"; x.font = '500 15px ui-monospace, Menlo, monospace'; x.fillText(j.w + " · " + f(j.d) + " km · " + f(a.T) + " °C · " + f(a.P, 1) + " GPa", 76, y + 20);
    });
    x.fillStyle = "#4b5567"; x.font = '500 13px ui-monospace, Menlo, monospace'; x.fillText("vini-portfolio.onrender.com/#/earth-core", 50, 618);
    cc.toBlob(function (b) { if (!b) return; var a = document.createElement("a"), u = URL.createObjectURL(b); a.href = u; a.download = "vini-journey-card.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000); ev("journey-card"); }, "image/png");
  });
  paintProbe(); inspect(0, true);

  window.__earth = {
    open: function () { location.hash = "#/earth-core"; },
    setQuake: function (o) { quake(o.angle == null ? -45 : o.angle, o.mag || 7.5, o.depth == null ? 10 : o.depth); },
    setDrill: function (d) { st.depth = Math.max(0, Math.min(R, d)); $("ecDr").value = st.depth; paintProbe(); wake(); },
    setExplode: function (p) { st.exT = p; $("ecEx").value = p * 100; $("ecExV").textContent = Math.round(p * 100) + "%"; wake(); },
    setPlume: function (o) { st.plume = o; wake(); }, setPolarity: function (v) { st.polT = v; wake(); }, setTrueScale: function (b) { st.trueScale = b; $("ecScale").textContent = "Scale: " + (b ? "true" : "visual"); wake(); },
    shadow: function (d0) { var r = [], i; for (i = 4; i <= 86; i += 2) { var x = trace(d0 || 10, i, "P"); if (x && x.end === "surface") r.push(+x.delta.toFixed(1)); } return r; }
  };
  if (onRoute) wake();
})();
