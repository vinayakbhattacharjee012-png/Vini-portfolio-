/* Feature runner: executes any registry entry by type (act, calc, info, code, scn, term, vis, ach, log, sim). Static, no network. */
(function () {
  "use strict";
  var FM = window.FM = window.FM || {}, root = document.documentElement;
  var REGS = [window.FR1000, window.FR2000].filter(Boolean);
  FM.engines = []; FM.list = []; FM.by = {};
  REGS.forEach(function (r) { FM.engines = FM.engines.concat(r.engines); FM.list = FM.list.concat(r.list); });
  FM.list.forEach(function (x) { FM.by[x.id] = x; });
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n, d) { if (typeof n !== "number" || !isFinite(n)) return String(n); var a = Math.abs(n); if (a !== 0 && (a >= 1e9 || a < 1e-3)) return n.toExponential(3); return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 4 : d }); }
  function toast(m) { var t = document.getElementById("toast"); if (!t) return; t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function copy(text, label) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast((label || "Text") + " copied"); }, function () { toast("Copy failed. Select the text instead."); }); else toast("Copy failed. Select the text instead."); }
  function sfx(n) { if (window.SFX && SFX[n]) SFX[n](); }
  FM.esc = esc; FM.fmt = fmt; FM.toast = toast; FM.copy = copy;

  /* ---------- stats + achievements (Engine 10 / R10) ---------- */
  var S = { runs: 0, ids: {}, flags: {}, unlocked: {} };
  try { S = Object.assign(S, JSON.parse(localStorage.getItem("fm.stats") || "{}")); } catch (e) {}
  function save() { try { localStorage.setItem("fm.stats", JSON.stringify(S)); } catch (e) {} }
  function engRuns(eid, r) { var n = 0; Object.keys(S.ids).forEach(function (id) { var f = FM.by[id]; if (f && f.e === eid && (!r || f.r === r)) n += S.ids[id]; }); return n; }
  function regRuns(r) { var n = 0, u = 0; Object.keys(S.ids).forEach(function (id) { var f = FM.by[id]; if (f && f.r === r) { n += S.ids[id]; u++; } }); return [n, u]; }
  function passes(t) {
    var k = t[0];
    if (k === "runs") return S.runs >= t[1];
    if (k === "uniq") return Object.keys(S.ids).length >= t[1];
    if (k === "eng") return engRuns(t[1], t[3]) >= t[2];
    if (k === "r1") return regRuns(1)[0] >= t[1]; if (k === "r2") return regRuns(2)[0] >= t[1];
    if (k === "u1") return regRuns(1)[1] >= t[1]; if (k === "u2") return regRuns(2)[1] >= t[1];
    if (k === "flag") return !!S.flags[t[1]];
    if (k === "ach") return Object.keys(S.unlocked).length >= t[1];
    return false;
  }
  function evaluate() {
    FM.list.forEach(function (f) { if (f.t !== "ach" || S.unlocked[f.id]) return; if (passes(f.p.test)) { S.unlocked[f.id] = Date.now(); sfx("ok"); toast("Milestone: " + f.n); } });
    save(); window.__fm = { runs: S.runs, unlocked: Object.keys(S.unlocked).length, total: FM.list.length };
  }
  FM.flag = function (name) { if (!S.flags[name]) { S.flags[name] = Date.now(); evaluate(); } };
  FM.record = function (f) { S.runs++; S.ids[f.id] = (S.ids[f.id] || 0) + 1; evaluate(); };
  FM.stats = function () { return { runs: S.runs, unique: Object.keys(S.ids).length, unlocked: Object.keys(S.unlocked).length, unlockedIds: S.unlocked, flags: S.flags }; };
  window.addEventListener("cosmos:event", function (e) { FM.flag("ev:" + e.detail); });
  function routeFlag() { var m = /^#\/([a-z-]+)$/.exec(location.hash); if (m) FM.flag("route:" + m[1]); }
  window.addEventListener("hashchange", routeFlag); routeFlag();
  var kc = [], KON = "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a";
  document.addEventListener("keydown", function (e) { kc.push(e.key); kc = kc.slice(-10); if (kc.join(",") === KON) FM.flag("konami"); });
  document.addEventListener("click", function (e) {
    var id = e.target.id || (e.target.closest && e.target.closest("[id]") || {}).id;
    if (id === "w2Gen") FM.flag("pass"); if (id === "themesNavBtn" || id === "themesBtn" || id === "themesHeroBtn") FM.flag("themes");
    if (e.target.closest && e.target.closest(".w2-pill button")) FM.flag("persona"); if (id === "w2Sfx") FM.flag("sfx"); if (id === "perfBtn") FM.flag("lite");
  });
  var so = document.getElementById("search"); if (so && window.MutationObserver) new MutationObserver(function () { if (!so.hidden) FM.flag("palette"); }).observe(so, { attributes: true, attributeFilter: ["hidden"] });
  var vi = document.getElementById("vtIn"); if (vi) vi.addEventListener("keydown", function (e) { if (e.key === "Enter" && vi.value.trim()) FM.flag("terminal"); }, true);

  /* ---------- helpers ---------- */
  function rows(ui, list) { var d = document.createElement("div"); d.className = "fm-out"; d.innerHTML = list.map(function (r) { return "<div><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>"; }).join(""); ui.appendChild(d); return d; }
  function btn(ui, label, fn, alt) { var b = document.createElement("button"); b.type = "button"; b.className = "w2-go" + (alt ? " alt" : ""); b.style.marginTop = "10px"; b.style.marginRight = "6px"; b.textContent = label; b.addEventListener("click", fn); ui.appendChild(b); return b; }
  function hex2rgb(h) { h = String(h).replace("#", "").trim(); if (h.length === 3) h = h.replace(/./g, "$&$&"); if (!/^[0-9a-f]{6}$/i.test(h)) return null; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function lum(c) { var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function rgb2hsl(c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; }
  function toHex(c) { return "#" + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  var G = 6.6743e-11;

  /* ---------- calculators ---------- */
  var BODIES = FM.BODIES = { sun: [132712440018, 695700, "Sun"], mercury: [22031.78, 2439.7, "Mercury"], venus: [324858.59, 6051.8, "Venus"], earth: [398600.4418, 6371, "Earth"], moon: [4902.8, 1737.4, "Moon"], mars: [42828.37, 3389.5, "Mars"], jupiter: [126686534, 69911, "Jupiter"], saturn: [37931187, 58232, "Saturn"], uranus: [5793939, 25362, "Uranus"], neptune: [6836529, 24622, "Neptune"] };
  function orb(b, alt) { var B = BODIES[b], r = B[1] + alt, v = Math.sqrt(B[0] / r); return { r: r, v: v, T: 2 * Math.PI * r / v, esc: Math.sqrt(2 * B[0] / r), g: B[0] / (r * r) * 1000 }; }
  function dur(s) { return s < 120 ? fmt(s, 1) + " s" : s < 7200 ? fmt(s / 60, 1) + " min" : s < 172800 ? fmt(s / 3600, 2) + " h" : fmt(s / 86400, 2) + " d"; }
  var CALCS = FM.CALCS = {
    conv: { in: [["x", "Value", 1]], fn: function (v, p) { var o = v.x * p.a + (p.b || 0); return [[p.from + " → " + p.to, fmt(o, 6) + " " + p.to], ["Formula", "x × " + p.a + (p.b ? " + " + p.b : "")]]; } },
    maxhr: { in: [["age", "Age (years)", 30], ["rest", "Resting HR (bpm)", 60]], fn: function (v, p) { var m = p.m === "fox" ? 220 - v.age : p.m === "tanaka" ? 208 - 0.7 * v.age : 220 - v.age, out = [["Max HR (" + p.m + ")", Math.round(m) + " bpm"]]; [[50, 60], [60, 70], [70, 80], [80, 90], [90, 100]].forEach(function (z, i) { var lo = p.m === "karvonen" ? (m - v.rest) * z[0] / 100 + +v.rest : m * z[0] / 100, hi = p.m === "karvonen" ? (m - v.rest) * z[1] / 100 + +v.rest : m * z[1] / 100; out.push(["Zone " + (i + 1) + " (" + z[0] + "–" + z[1] + "%)", Math.round(lo) + "–" + Math.round(hi) + " bpm"]); }); return out; } },
    pace: { in: [["km", "Distance (km)", 5], ["min", "Time (min)", 28]], fn: function (v) { var pc = v.min / v.km; return [["Pace", Math.floor(pc) + ":" + String(Math.round((pc % 1) * 60)).padStart(2, "0") + " min/km"], ["Speed", fmt(v.km / (v.min / 60), 2) + " km/h"], ["Pace per mile", fmt(pc * 1.609344, 2) + " min/mi"]]; } },
    hydr: { in: [["kg", "Body weight (kg)", 70], ["act", "Activity (min)", 30]], fn: function (v) { var ml = 35 * v.kg + 12 * v.act; return [["Rule-of-thumb intake", fmt(ml, 0) + " ml/day"], ["Glasses (250 ml)", fmt(ml / 250, 1)], ["Note", "General guide, not medical advice"]]; } },
    sleep: { in: [["h", "Slept (h)", 6.5], ["t", "Target (h)", 8]], fn: function (v) { var d = v.t - v.h; return [["Debt tonight", d > 0 ? fmt(d, 1) + " h" : "none"], ["Debt over 7 nights", d > 0 ? fmt(d * 7, 1) + " h" : "none"], ["Note", "Check-in helper, not a diagnosis"]]; } },
    steps: { in: [["s", "Steps", 8000], ["cm", "Stride (cm)", 75]], fn: function (v) { return [["Distance", fmt(v.s * v.cm / 100000, 2) + " km"], ["Rough energy", fmt(v.s * 0.04, 0) + " kcal"]]; } },
    mets: { in: [["met", "MET value", 7], ["kg", "Weight (kg)", 70], ["min", "Minutes", 30]], fn: function (v) { return [["Energy", fmt(v.met * 3.5 * v.kg / 200 * v.min, 0) + " kcal"]]; } },
    ratio: { in: [["a", "A", 12], ["b", "B", 18], ["c", "C / rate", 5]], fn: function (v, p) {
      var a = +v.a, b = +v.b, c = +v.c, g;
      if (p.m === "simplify") { g = gcd(Math.round(a), Math.round(b)) || 1; return [["Ratio", a / g + " : " + b / g], ["A per B", fmt(a / b, 4)]]; }
      if (p.m === "tax") return [["Tax", fmt(a * c / 100, 2)], ["Total", fmt(a * (1 + c / 100), 2)]];
      if (p.m === "margin") return [["Profit", fmt(b - a, 2)], ["Margin", fmt((b - a) / b * 100, 1) + "%"], ["Markup", fmt((b - a) / a * 100, 1) + "%"]];
      if (p.m === "chain") return [["After 3 swaps", fmt(a * b * c, 2)]];
      if (p.m === "split") { var t = a + b + c; return [["Share A", fmt(a / t * 100, 1) + "%"], ["Share B", fmt(b / t * 100, 1) + "%"], ["Share C", fmt(c / t * 100, 1) + "%"]]; }
      return [["Received", fmt(a * b * (1 - c / 100), 2)], ["Fee", fmt(a * b * c / 100, 2)]];
    } },
    tbucket: { in: [["cap", "Capacity", 20], ["rate", "Refill / s", 5], ["cost", "Cost / request", 1]], fn: function (v) { return [["Burst", Math.floor(v.cap / v.cost) + " requests"], ["Sustained", fmt(v.rate / v.cost, 2) + " req/s"], ["Full refill", fmt(v.cap / v.rate, 1) + " s"]]; } },
    window: { in: [["lim", "Limit", 100], ["sec", "Window (s)", 60]], fn: function (v) { return [["Average", fmt(v.lim / v.sec, 3) + " req/s"], ["Min gap", fmt(v.sec / v.lim * 1000, 0) + " ms"], ["Per hour", fmt(v.lim * 3600 / v.sec, 0)]]; } },
    backoff: { in: [["base", "Base (ms)", 200], ["f", "Factor", 2], ["n", "Tries", 6]], fn: function (v) { var o = [], t = 0, i; for (i = 0; i < Math.min(12, v.n); i++) { var d = v.base * Math.pow(v.f, i); t += d; o.push(["Retry " + (i + 1), fmt(d, 0) + " ms"]); } o.push(["Total wait", fmt(t / 1000, 2) + " s"]); return o; } },
    mm1: { in: [["l", "Arrival λ /s", 8], ["m", "Service μ /s", 10]], fn: function (v) { var r = v.l / v.m; if (r >= 1) return [["Utilisation", fmt(r * 100, 0) + "%"], ["Verdict", "Unstable: queue grows without bound"]]; return [["Utilisation", fmt(r * 100, 1) + "%"], ["Avg in system", fmt(r / (1 - r), 2)], ["Avg wait", fmt(1000 / (v.m - v.l), 1) + " ms"]]; } },
    regex: { in: [["re", "Pattern", ""], ["tx", "Text", ""]], fn: function (v) { try { var re = new RegExp(v.re, "g"), m = String(v.tx).match(re) || []; return [["Valid pattern", "yes"], ["Matches", m.length], ["First", m[0] == null ? "none" : m[0]]]; } catch (e) { return [["Valid pattern", "no"], ["Error", e.message]]; } } },
    json: { in: [["tx", "JSON", '{"ok": true}']], fn: function (v) { try { var o = JSON.parse(v.tx); return [["Valid", "yes"], ["Type", Array.isArray(o) ? "array" : typeof o], ["Top-level keys", o && typeof o === "object" ? Object.keys(o).length : 0]]; } catch (e) { return [["Valid", "no"], ["Error", e.message]]; } } },
    b64: { in: [["tx", "Text", "hello"]], fn: function (v, p) { try { return [[p.m === "enc" ? "Base64" : "Decoded", p.m === "enc" ? btoa(unescape(encodeURIComponent(v.tx))) : decodeURIComponent(escape(atob(v.tx)))]]; } catch (e) { return [["Error", "not valid input"]]; } } },
    url: { in: [["u", "URL", "https://example.com:8080/a/b?x=1&y=2#top"]], fn: function (v) { try { var u = new URL(v.u); return [["Host", u.hostname], ["Port", u.port || "default"], ["Path", u.pathname], ["Params", Array.from(u.searchParams.keys()).length], ["Hash", u.hash || "none"]]; } catch (e) { return [["Error", "not a valid absolute URL"]]; } } },
    jwt: { in: [["t", "Token (decoded locally, not verified)", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vIiwiZXhwIjoxNzAwMDAwMDAwfQ.sig"]], fn: function (v) { try { var p = v.t.split("."), d = function (s) { return JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/"))); }; var h = d(p[0]), b = d(p[1]); return [["Header", JSON.stringify(h)], ["Payload", JSON.stringify(b)], ["Expires", b.exp ? new Date(b.exp * 1000).toISOString() : "none"], ["Signature", "NOT verified here"]]; } catch (e) { return [["Error", "not a JWT-shaped token"]]; } } },
    contrast: { in: [["fg", "Foreground", "#06b6d4"], ["bg", "Background", "#06070a"]], fn: function (v) { var a = hex2rgb(v.fg), b = hex2rgb(v.bg); if (!a || !b) return [["Error", "use hex like #06b6d4"]]; var l1 = lum(a), l2 = lum(b), r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); return [["Ratio", fmt(r, 2) + ":1"], ["AA normal (4.5)", r >= 4.5 ? "pass" : "fail"], ["AA large (3)", r >= 3 ? "pass" : "fail"], ["AAA normal (7)", r >= 7 ? "pass" : "fail"]]; } },
    hexrgb: { in: [["h", "Hex", "#8b5cf6"]], fn: function (v) { var c = hex2rgb(v.h); if (!c) return [["Error", "use hex like #8b5cf6"]]; var h = rgb2hsl(c); return [["RGB", c.join(", ")], ["HSL", h[0] + "°, " + h[1] + "%, " + h[2] + "%"], ["Luminance", fmt(lum(c), 4)]]; } },
    mix: { in: [["a", "Colour A", "#06b6d4"], ["b", "Colour B", "#8b5cf6"], ["t", "Mix %", 50]], fn: function (v) { var a = hex2rgb(v.a), b = hex2rgb(v.b); if (!a || !b) return [["Error", "use hex colours"]]; var t = v.t / 100; return [["Result", toHex(a.map(function (x, i) { return x + (b[i] - x) * t; }))]]; } },
    shade: { in: [["h", "Hex", "#06b6d4"], ["p", "Percent", 20]], fn: function (v, p) { var c = hex2rgb(v.h); if (!c) return [["Error", "use hex colours"]]; var k = (p.m === "lighten" ? 1 : -1) * v.p / 100; return [["Result", toHex(c.map(function (x) { return k > 0 ? x + (255 - x) * k : x * (1 + k); }))]]; } },
    text: { in: [["tx", "Text", "The quick brown fox jumps over the lazy dog"]], fn: function (v, p) {
      var t = String(v.tx), m = p.m;
      if (m === "wc") return [["Words", (t.trim().match(/\S+/g) || []).length], ["Characters", t.length], ["Lines", t.split("\n").length]];
      if (m === "slug") return [["Slug", t.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-")]];
      if (m === "upper") return [["Upper", t.toUpperCase()]]; if (m === "lower") return [["Lower", t.toLowerCase()]];
      if (m === "title") return [["Title", t.replace(/\w\S*/g, function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); })]];
      if (m === "camel") return [["camelCase", t.toLowerCase().replace(/[^a-z0-9]+(.)/g, function (_, c) { return c.toUpperCase(); })]];
      if (m === "snake") return [["snake_case", t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")]];
      if (m === "rev") return [["Reversed", t.split("").reverse().join("")]];
      if (m === "sort") return [["Sorted lines", t.split("\n").sort().join(" | ")]];
      if (m === "uniq") return [["Unique lines", Array.from(new Set(t.split("\n"))).join(" | ")]];
      if (m === "hash") { var h = 5381, i; for (i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return [["djb2", h.toString(16)]]; }
      if (m === "fnv") { var x = 2166136261, j; for (j = 0; j < t.length; j++) { x ^= t.charCodeAt(j); x = Math.imul(x, 16777619) >>> 0; } return [["FNV-1a", x.toString(16)]]; }
      return [["Bytes (UTF-8)", new TextEncoder().encode(t).length]];
    } },
    orb: { in: [["alt", "Altitude (km)", 400], ["alt2", "Target altitude (km)", 35786]], fn: function (v, p) {
      var B = BODIES[p.b], o = orb(p.b, +v.alt), q = p.q;
      if (q === "vc") return [["Circular velocity", fmt(o.v, 3) + " km/s"], ["Radius", fmt(o.r, 0) + " km"]];
      if (q === "T") return [["Period", dur(o.T)], ["Orbits per Earth day", fmt(86400 / o.T, 3)]];
      if (q === "ve") return [["Escape velocity", fmt(o.esc, 3) + " km/s"]];
      if (q === "g") return [["Gravity", fmt(o.g, 3) + " m/s²"]];
      if (q === "E") return [["Specific energy", fmt(-B[0] / (2 * o.r), 3) + " km²/s²"]];
      if (q === "w") return [["Angular rate", fmt(o.v / o.r * 1000, 4) + " mrad/s"], ["Degrees per minute", fmt(o.v / o.r * 180 / Math.PI * 60, 3)]];
      var r1 = o.r, r2 = B[1] + +v.alt2, a = (r1 + r2) / 2, v1 = Math.sqrt(B[0] / r1), v2 = Math.sqrt(B[0] / r2), dv1 = Math.abs(Math.sqrt(B[0] * (2 / r1 - 1 / a)) - v1), dv2 = Math.abs(v2 - Math.sqrt(B[0] * (2 / r2 - 1 / a)));
      if (q === "hoh") return [["Δv burn 1", fmt(dv1, 3) + " km/s"], ["Δv burn 2", fmt(dv2, 3) + " km/s"], ["Total Δv", fmt(dv1 + dv2, 3) + " km/s"]];
      if (q === "tt") return [["Transfer time", dur(Math.PI * Math.sqrt(a * a * a / B[0]))]];
      if (q === "dve") return [["Escape Δv from this orbit", fmt(o.esc - o.v, 3) + " km/s"]];
      return [["Ground-track shift / orbit", fmt(360 * o.T / 86164.1, 2) + "° (Earth rotation)"]];
    } },
    sw: { in: [["v", "Wind speed (km/s)", 400], ["n", "Density (/cm³)", 5], ["bz", "Bz (nT)", 0]], fn: function (v) {
      var pd = 1.6726e-6 * v.n * v.v * v.v, r0 = (10.22 + 1.29 * Math.tanh(0.184 * (+v.bz + 8.14))) * Math.pow(pd, -1 / 6.6), ey = v.v * Math.max(0, -v.bz) * 1e-3, cls = ey > 15 ? "severe (heuristic)" : ey > 8 ? "strong" : ey > 3 ? "moderate" : ey > 0.5 ? "minor" : "quiet";
      return [["Dynamic pressure", fmt(pd, 2) + " nPa"], ["Magnetopause", fmt(r0, 1) + " Re (" + fmt(r0 * 6371, 0) + " km)"], ["GEO (6.6 Re)", r0 < 6.6 ? "exposed to solar wind" : "inside the magnetosphere"], ["Southward E-field", fmt(ey, 1) + " mV/m"], ["Storm potential", cls]];
    } },
    cons: { in: [["alt", "Altitude (km)", 550], ["inc", "Inclination (°)", 53], ["pl", "Planes", 24], ["pp", "Sats / plane", 22], ["el", "Min elevation (°)", 25]], fn: function (v) {
      var R = 6371, r = R + +v.alt, T = 2 * Math.PI * Math.sqrt(r * r * r / 398600.4418), e = v.el * Math.PI / 180, lam = Math.acos(R * Math.cos(e) / r) - e, cap = (1 - Math.cos(lam)) / 2;
      var ss = Math.pow(r / 12352, 3.5) <= 1 ? Math.acos(-Math.pow(r / 12352, 3.5)) * 180 / Math.PI : null;
      return [["Satellites", v.pl * v.pp], ["Period", dur(T)], ["Speed", fmt(Math.sqrt(398600.4418 / r), 2) + " km/s"], ["Footprint radius", fmt(lam * R, 0) + " km"], ["Footprint of Earth", fmt(cap * 100, 2) + "%"], ["Sun-sync inclination", ss ? fmt(ss, 1) + "° at this altitude" : "n/a"]];
    } },
    astro: { in: [["x", "Value", 1]], fn: function (v, p) {
      var x = +v.x, k = p.k;
      if (k === "ly") return [["Light-years", fmt(x)], ["Parsecs", fmt(x / 3.26156)], ["AU", fmt(x * 63241.077)], ["km", fmt(x * 9.4607e12)]];
      if (k === "pc") return [["Parsecs", fmt(x)], ["Light-years", fmt(x * 3.26156)], ["AU", fmt(x * 206264.806)]];
      if (k === "au") return [["AU", fmt(x)], ["km", fmt(x * 1.495978707e8)], ["Light time", dur(x * 499.004784)]];
      if (k === "lt") return [["Light travel time", dur(x * 1e3 / 299792458 * 1e3)], ["for km", fmt(x)]];
      if (k === "z") { var b = Math.pow(1 + x, 2), vv = (b - 1) / (b + 1); return [["Relativistic v", fmt(vv * 299792.458, 1) + " km/s (" + fmt(vv, 4) + " c)"], ["Small-z v = cz", fmt(x * 299792.458, 1) + " km/s"]]; }
      if (k === "mag") return [["Flux ratio", fmt(Math.pow(10, 0.4 * x), 3) + "×"], ["Δ magnitudes", fmt(x)]];
      if (k === "plx") return [["Distance", fmt(1 / x, 3) + " pc"], ["Light-years", fmt(3.26156 / x, 2)], ["Input", "parallax in arcseconds"]];
      if (k === "kep") return [["Period", fmt(Math.sqrt(x * x * x), 4) + " years"], ["Input", "semi-major axis in AU around a 1 Msun star"]];
      if (k === "sch") return [["Schwarzschild radius", fmt(2.953 * x, 3) + " km"], ["Input", "mass in solar masses"]];
      if (k === "hub") return [["Distance", fmt(x / 70, 2) + " Mpc"], ["Light-years", fmt(x / 70 * 3.26156e6, 0)], ["Input", "recession velocity km/s, H0 = 70"]];
      if (k === "wien") return [["Peak wavelength", fmt(2.898e6 / x, 1) + " nm"], ["Input", "temperature in kelvin"]];
      return [["Angular size", fmt(x, 3)]];
    } },
    rocket: { in: [["isp", "Isp (s)", 350], ["m0", "Wet mass (t)", 100], ["mf", "Dry mass (t)", 10]], fn: function (v) { var dv = v.isp * 9.80665 * Math.log(v.m0 / v.mf) / 1000; return [["Δv", fmt(dv, 3) + " km/s"], ["Mass ratio", fmt(v.m0 / v.mf, 2)], ["Propellant fraction", fmt((1 - v.mf / v.m0) * 100, 1) + "%"], ["vs LEO need (~9.4 km/s)", dv >= 9.4 ? "enough" : "short by " + fmt(9.4 - dv, 2) + " km/s"]]; } }
  };
  FM.calcOut = function (c, vals, p) { return CALCS[c].fn(vals, p || {}); };

  function runCalc(f, ui) {
    var def = CALCS[f.p.c], vals = {}, inputs = f.p.v || {}, box = document.createElement("div"), out = document.createElement("div");
    def.in.forEach(function (i) {
      var v = inputs[i[0]] != null ? inputs[i[0]] : i[2], long = typeof v === "string" && v.length > 24, id = "fm-" + f.id + "-" + i[0];
      vals[i[0]] = v; box.insertAdjacentHTML("beforeend", "<label for='" + id + "'>" + esc(i[1]) + "</label>" + (long ? "<textarea rows='3' id='" + id + "'>" + esc(v) + "</textarea>" : "<input id='" + id + "' value='" + esc(v) + "' " + (typeof v === "number" ? "type='number' step='any'" : "") + ">"));
    });
    function go() { def.in.forEach(function (i) { var e = box.querySelector("[id='fm-" + f.id + "-" + i[0] + "']"); vals[i[0]] = e.type === "number" ? parseFloat(e.value) : e.value; }); out.innerHTML = ""; var r; try { r = def.fn(vals, f.p); } catch (e) { r = [["Error", e.message]]; } rows(out, r); }
    box.addEventListener("input", go); ui.appendChild(box); ui.appendChild(out); go();
    if (f.p.apply) btn(ui, f.p.apply[0], function () { applyPage(f.p.apply[1], f.p.apply[2]); });
  }

  /* ---------- guardrail scenario engine (Engine 03) ---------- */
  function norm(s) { return String(s).replace(/[​-‏⁠﻿]/g, "").toLowerCase().replace(/[0]/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t").replace(/(\w)[\s.\-_*]+(?=\w([\s.\-_*]|$))/g, "$1").replace(/\s+/g, " "); }
  function luhn(d) { var s = 0, a = 0, i; d = d.replace(/\D/g, ""); if (d.length < 13 || d.length > 19) return false; for (i = d.length - 1; i >= 0; i--) { var n = +d[i]; if (a) { n *= 2; if (n > 9) n -= 9; } s += n; a = !a; } return s % 10 === 0; }
  var RULES = {
    pii: [["Email address", /[\w.+-]+@[\w-]+\.[a-z]{2,}/i], ["Phone number", /\+?\d[\d\s().-]{8,}\d/], ["SSN-style number", /\b\d{3}-\d{2}-\d{4}\b/], ["Card number (Luhn)", null, function (t) { return (t.match(/\d[\d -]{11,22}\d/g) || []).some(luhn); }]],
    injection: [["Override phrase", /(ignore|disregard|forget|override)\W+(all\W+|any\W+|the\W+)?(previous|prior|above|earlier|your)\W+(instructions|rules|prompt|guidelines)/], ["System prompt probe", /(reveal|show|print|repeat|leak)\W+.{0,20}(system\W+prompt|instructions|hidden\W+prompt)/], ["Role reassignment", /(you\W+are\W+now|act\W+as\W+if|from\W+now\W+on\W+you)/]],
    jailbreak: [["Persona jailbreak", /(do\W+anything\W+now|\bdan\b|developer\W+mode|jailbroken)/], ["No-rules framing", /(no\W+(restrictions|rules|filters|limits)|without\W+(any\W+)?(rules|restrictions|filters))/], ["Fiction wrapper", /(hypothetically|in\W+a\W+story|pretend)\W+.{0,60}(bypass|ignore|no\W+rules|illegal|weapon)/]],
    escalation: [["Admin grant", /(grant|give|assign|make)\W+(me\W+)?(admin|administrator|owner|root)/], ["Privilege command", /(sudo|chmod\W+777|permissions?\W*=\W*8|role\W*=\W*admin)/], ["Bypass auth", /(bypass|skip|disable)\W+(auth|login|verification|2fa|permission)/]],
    phishing: [["Punycode host", /xn--/], ["Lookalike keyword", /(free\W+nitro|nitro\W+gift|steam\W+gift|verify\W+your\W+account)/], ["Credential-in-URL", /https?:\/\/[^\s/]*@/], ["Shortener", /(bit\.ly|tinyurl|cutt\.ly|t\.co)\//]],
    spam: [["Mass mention", null, function (t) { return (t.match(/@\w+/g) || []).length >= 5 || /@everyone|@here/.test(t); }], ["Invite spam", /(discord\.gg|discord\.com\/invite)\//], ["Repetition", null, function (t) { var w = t.split(/\s+/), u = new Set(w); return w.length >= 8 && u.size / w.length < 0.35; }], ["Shouting", null, function (t, raw) { var L = raw.replace(/[^A-Za-z]/g, ""); return L.length > 15 && L.replace(/[^A-Z]/g, "").length / L.length > 0.8; }]],
    secrets: [["API key prefix", /\b(sk|pk|rk)[-_][a-z0-9]{16,}/i], ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}/], ["AWS key id", /\bAKIA[0-9A-Z]{16}\b/], ["Discord token shape", /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/], ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ["Key=value secret", /(api[_-]?key|secret|token|passwd|password)\s*[=:]\s*\S{8,}/i]],
    medical: [["Diagnosis request", /(diagnose|what\W+(illness|disease)\W+do\W+i)/], ["Dosage request", /(dosage|how\W+much\W+(mg|ibuprofen|paracetamol|insulin)|overdose)/], ["Stop medication", /(stop|quit)\W+taking\W+(my\W+)?(medication|meds|pills)/], ["Crisis language", /(kill\W+myself|end\W+my\W+life|self\W*harm)/]]
  };
  FM.scenario = function (cat, payload, ev) {
    var steps = [], blocked = false;
    if (cat === "raid" || cat === "nuke") {
      var e = ev, ok;
      if (cat === "raid") { var rate = e.joins / e.sec, young = e.young; ok = [["Join rate", fmt(rate, 2) + "/s", rate >= 0.8], ["Accounts under 7 days", Math.round(young * 100) + "%", young >= 0.6 && e.joins >= 5], ["Identical avatars", Math.round(e.same * 100) + "%", e.same >= 0.5 && e.joins >= 4]]; }
      else ok = [["Channel deletes", e.ch + " in " + e.sec + "s", e.ch >= 3], ["Bans", e.bans + " in " + e.sec + "s", e.bans >= 5], ["Role deletes", e.roles + " in " + e.sec + "s", e.roles >= 2], ["Executor is bot with admin", e.admin ? "yes" : "no", e.admin && (e.ch + e.bans + e.roles) >= 2]];
      ok.forEach(function (r) { steps.push([r[0] + ": " + r[1], r[2] ? "TRIPPED" : "ok", r[2]]); if (r[2]) blocked = true; });
      return { blocked: blocked, steps: steps, action: blocked ? (cat === "raid" ? "Lockdown: verification raised, new joins held, mods pinged" : "Revoke executor perms, restore from audit log, alert owner") : "Within normal limits", norm: "" };
    }
    var raw = String(payload), n = norm(raw), rules = RULES[cat] || [], hits = [];
    steps.push(["L1 normalise (leet, zero-width, spacing)", n === raw.toLowerCase() ? "no change" : "changed", false]);
    rules.forEach(function (r) { var m = r[1] ? (r[1].test(n) || r[1].test(raw)) : r[2](n, raw); if (m) hits.push(r[0]); steps.push(["L2 rule: " + r[0], m ? "HIT" : "clear", m]); });
    blocked = hits.length > 0;
    var action = !blocked ? "Allowed through. If this was an attack, the ruleset has a gap." : cat === "medical" ? "Escalate: safe-completion with disclaimer and clinician pointer (no diagnosis)" : cat === "pii" || cat === "secrets" ? "Redact, do not store or echo" : "Block and log";
    steps.push(["L3 decision", blocked ? "BLOCK / ROUTE" : "ALLOW", blocked]);
    return { blocked: blocked, steps: steps, action: action, norm: n };
  };
  var TEL = { n: 0, b: 0 };
  try { TEL = Object.assign(TEL, JSON.parse(localStorage.getItem("fm.tel") || "{}")); } catch (e) {}
  function runScn(f, ui) {
    var p = f.p, isEv = p.cat === "raid" || p.cat === "nuke";
    ui.insertAdjacentHTML("beforeend", isEv ? "<label>Event stream</label><pre>" + esc(JSON.stringify(p.ev)) + "</pre>" : "<label for='fm-sc'>Payload (editable)</label><textarea id='fm-sc' rows='3'>" + esc(p.payload) + "</textarea>");
    var out = document.createElement("div"), tel = document.createElement("div"); tel.className = "meta";
    function go() {
      var r = FM.scenario(p.cat, isEv ? "" : $("#fm-sc", ui).value, p.ev); out.innerHTML = "";
      rows(out, r.steps.map(function (s) { return [s[0], s[1]]; }));
      out.insertAdjacentHTML("beforeend", "<div class='fm-v " + (r.blocked ? "ok" : "bad") + "'>" + (r.blocked ? "Blocked / routed. " : "Passed through. ") + esc(r.action) + "</div>");
    }
    btn(ui, "Run vector", function () { go(); TEL.n++; TEL.b += FM.scenario(p.cat, isEv ? "" : $("#fm-sc", ui).value, p.ev).blocked ? 1 : 0; try { localStorage.setItem("fm.tel", JSON.stringify(TEL)); } catch (e) {} tel.textContent = "Session telemetry: " + TEL.b + " blocked of " + TEL.n + " vectors run"; });
    ui.appendChild(out); ui.appendChild(tel); tel.textContent = "Session telemetry: " + TEL.b + " blocked of " + TEL.n + " vectors run";
    ui.insertAdjacentHTML("beforeend", "<p class='meta'>Demo ruleset in your browser. Obfuscated variants show where simple rules leak, which is why real systems layer more checks.</p>");
  }

  /* ---------- code / info / log / ach / term / vis / sim ---------- */
  function graph(nodes, edges) {
    var w = 560, h = 70 + Math.ceil(nodes.length / 4) * 0, n = nodes.length, gap = Math.min(150, (w - 60) / Math.max(1, n - 1)), s = '<svg class="fm-svg" viewBox="0 0 ' + w + " 110\" role=\"img\" aria-label=\"Topology: " + esc(nodes.join(", ")) + '"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#8b5cf6"/></marker></defs>';
    var pos = nodes.map(function (_, i) { return [30 + i * gap, i % 2 ? 72 : 36]; });
    (edges || nodes.slice(1).map(function (_, i) { return [i, i + 1]; })).forEach(function (e) { s += '<line x1="' + pos[e[0]][0] + '" y1="' + pos[e[0]][1] + '" x2="' + pos[e[1]][0] + '" y2="' + pos[e[1]][1] + '" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#ar)"/>'; });
    nodes.forEach(function (t, i) { s += '<rect x="' + (pos[i][0] - 34) + '" y="' + (pos[i][1] - 14) + '" width="68" height="28" rx="8" fill="#0c0e14" stroke="#06b6d4"/><text x="' + pos[i][0] + '" y="' + (pos[i][1] + 4) + '" fill="#e8f7fb" font-size="9.5" text-anchor="middle" font-family="monospace">' + esc(t.slice(0, 11)) + "</text>"; });
    return s + "</svg>";
  }
  function runCode(f, ui) { if (f.p.nodes) ui.insertAdjacentHTML("beforeend", graph(f.p.nodes, f.p.edges)); ui.insertAdjacentHTML("beforeend", "<pre tabindex='0'>" + esc(f.p.code) + "</pre>"); btn(ui, "Copy code", function () { copy(f.p.code, f.n); FM.flag("copy"); }); if (f.p.note) ui.insertAdjacentHTML("beforeend", "<p class='meta'>" + esc(f.p.note) + "</p>"); }
  function runInfo(f, ui) {
    if (f.p.text) ui.insertAdjacentHTML("beforeend", "<p>" + esc(f.p.text) + "</p>");
    var r = typeof f.p.rows === "function" ? f.p.rows() : f.p.rows; if (r) rows(ui, r);
    if (f.p.apply) btn(ui, f.p.apply[0], function () { applyPage(f.p.apply[1], f.p.apply[2]); });
    if (f.p.note) ui.insertAdjacentHTML("beforeend", "<p class='meta'>" + esc(f.p.note) + "</p>");
  }
  function runLog(f, ui) { var p = f.p; rows(ui, [["Kind", p.kind], ["Date", p.date], p.hash ? ["Commit", p.hash] : ["Source", "illustrative model, not a real commit"]].concat((p.metrics || []).map(function (m) { return [m[0], m[1]]; }))); if (p.body) ui.insertAdjacentHTML("beforeend", "<p>" + esc(p.body) + "</p>"); }
  function runAch(f, ui) {
    var done = !!S.unlocked[f.id], t = f.p.test;
    rows(ui, [["Status", done ? "Unlocked " + new Date(S.unlocked[f.id]).toLocaleDateString() : "Locked"], ["Goal", f.p.goal], ["Total milestones", Object.keys(S.unlocked).length + " / " + FM.list.filter(function (x) { return x.t === "ach"; }).length]]);
    ui.insertAdjacentHTML("beforeend", "<p class='meta'>Progress is stored only in this browser (localStorage).</p>");
    ["recruiter", "ai", "community"].forEach(function (r) { btn(ui, "Dossier: " + r, function () { FM.dossier(r); }, true); });
  }
  function runTerm(f, ui) {
    var c = FM.cmds && FM.cmds[f.p.cmd];
    rows(ui, [["Command", f.p.cmd + (f.p.usage ? " " + f.p.usage : "")], ["What it does", f.p.desc]]);
    ui.insertAdjacentHTML("beforeend", "<p class='meta'>Flags: --json, --copy. Pipes: | upper, lower, count, head N, tail N, grep X, sort, uniq, copy.</p>");
    var out = document.createElement("pre"); out.textContent = ""; ui.appendChild(out);
    btn(ui, "Run here", function () { out.textContent = c ? c.fn(f.p.args || "") : "terminal engine not ready"; });
    btn(ui, "Run in dev console", function () { FM.runInTerminal(f.p.cmd + (f.p.args ? " " + f.p.args : "")); }, true);
  }
  function runVis(f, ui) { var p = f.p; FM.applyVisual(p.cat, p.i, p.set); rows(ui, [["Category", p.catName], ["Preset", f.n], ["Active now", JSON.stringify(FM.visState())]]); btn(ui, "Reset all visuals", function () { FM.resetVisual(); toast("Visual presets reset"); }, true); ui.insertAdjacentHTML("beforeend", "<p class='meta'>Presets combine (one per category) and persist in localStorage.</p>"); }
  function applyPage(page, args) {
    window.FeatureHub.page(page === "earth" ? "earth" : "cosmos").then(function () {
      if (page === "earth") { var E = window.__earth; location.hash = "#/earth-core"; setTimeout(function () { if (args.quake) E.setQuake(args.quake); if (args.drill != null) E.setDrill(args.drill); if (args.plume) E.setPlume(args.plume); if (args.pol != null) E.setPolarity(args.pol); if (args.explode != null) E.setExplode(args.explode); if (args.trueScale != null) E.setTrueScale(args.trueScale); }, 250); }
      else { location.hash = "#/cosmos"; setTimeout(function () { window.__cosmos.set(args || {}); }, 250); }
      FM.flag("applied:" + page);
    });
  }
  FM.applyPage = applyPage;

  /* ---------- visual presets (Engine 09 / R8): CSS-variable driven, combinable, persisted ---------- */
  var VS = {}; try { VS = JSON.parse(localStorage.getItem("fm.vis") || "{}") || {}; } catch (e) { VS = {}; }
  FM.visState = function () { return Object.assign({}, VS); };
  FM.applyVisual = function (cat, i, set) {
    VS[cat] = i; try { localStorage.setItem("fm.vis", JSON.stringify(VS)); } catch (e) {}
    var st = root.style; Object.keys(set).forEach(function (k) { if (k.slice(0, 2) === "--") st.setProperty(k, set[k]); });
    if (set.fs) st.fontSize = set.fs;
    ["scan", "grid"].forEach(function (k) { if (set[k] != null) root.classList.toggle("fx-" + k, !!set[k]); });
  };
  FM.resetVisual = function () { VS = {}; try { localStorage.removeItem("fm.vis"); } catch (e) {} root.removeAttribute("style"); Array.prototype.slice.call(root.classList).forEach(function (c) { if (/^fx-/.test(c)) root.classList.remove(c); }); };
  FM.restoreVisual = function () { var s = VS; VS = {}; Object.keys(s).forEach(function (cat) { var f = FM.list.filter(function (x) { return x.t === "vis" && x.p.cat === cat && x.p.i === s[cat]; })[0]; if (f) FM.applyVisual(cat, s[cat], f.p.set); }); };

  /* ---------- actions (Engine 01) ---------- */
  var EGGS = [["hue-rotate(", "deg)"], ["invert(", "%)"], ["saturate(", ")"], ["sepia(", ")"], ["contrast(", ")"], ["blur(", "px)"], ["brightness(", ")"], ["grayscale(", ")"]];
  var ACTS = FM.ACTS = {
    route: function (x) { location.hash = x; return "Opened " + x; },
    section: function (x) { location.hash = "#" + x; return "Jumped to #" + x; },
    persona: function (x) { var b = $(".w2-pill [data-p=" + x + "]"); if (b) b.click(); return "Persona: " + x; },
    filter: function (x) { location.hash = "#ai"; var b = $("#ptabs [data-f=" + x + "]"); if (b) b.click(); return "Project filter: " + x; },
    theme: function (x) { var b = $(".themes [data-set=" + x + "]"); if (b) b.click(); return "Theme: " + x; },
    sim: function (x) { if (window.__fx) window.__fx.openSim(x); return "Simulation: " + x; },
    arch: function (x) { if (window.__fx) window.__fx.openArch(x); return "Architecture map: " + x; },
    dialog: function (x) { var m = { terminal: function () { window.__fx && window.__fx.openTerminal(); }, palette: function () { var b = $("#searchBtn"); b && b.click(); }, themes: function () { var b = $("#themesNavBtn"); b && b.click(); }, resume: function () { var b = $("[data-open=resume]"); b && b.click(); }, keys: function () { var b = $("[data-keys]"); b && b.click(); }, holo: function () { var b = $(".holo-fab") || $("[data-open=holo]"); b && b.click(); } }; if (m[x]) m[x](); return "Opened " + x; },
    perf: function (x) { if (window.__perf) window.__perf.set(x); return "Performance: " + x; },
    sfx: function (x) { if (window.SFX) SFX.set(x === "on"); return "SFX " + x; },
    copy: function (x) { var t = { email: ($("#ct-mail") || {}).textContent, discord: ($("#ct-discord") || {}).textContent, url: location.href.split("#")[0], pitch: "Vini: builder, community founder, creator. Health AI and Discord bots." }[x] || x; copy(t, x); return "Copied: " + t; },
    snippet: function (x) { copy(x, "Snippet"); return x; },
    diag: function (x) { return DIAG[x](); },
    egg: function (x) { var i = +x, e = EGGS[i % EGGS.length], v = [90, 100, 3, 1, 2, 1.5, 1.8, 1][i % EGGS.length] * (1 + Math.floor(i / EGGS.length) * 0.4), h = document.body; if (root.classList.contains("lite") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "Effect skipped (Lite or reduced motion)"; h.style.transition = "filter .4s"; h.style.filter = e[0] + (e[0].indexOf("hue") === 0 ? 40 + (i * 37) % 300 : v) + e[1]; setTimeout(function () { h.style.filter = ""; }, 2400); FM.flag("egg:" + (i % 8)); return "Effect " + e[0].replace("(", "") + " for 2.4 s"; },
    msg: function (x) { toast(x); return x; },
    fm: function () { return "Explorer is open"; }
  };
  var DIAG = {
    viewport: function () { return innerWidth + "×" + innerHeight + " @" + (devicePixelRatio || 1) + "x"; }, memory: function () { return navigator.deviceMemory ? navigator.deviceMemory + " GB (rounded)" : "not reported"; },
    cores: function () { return (navigator.hardwareConcurrency || "?") + " logical cores"; }, lang: function () { return navigator.language; }, tz: function () { return Intl.DateTimeFormat().resolvedOptions().timeZone; },
    online: function () { return navigator.onLine ? "online" : "offline"; }, perf: function () { return "perf mode: " + (root.getAttribute("data-perf") || "auto") + (root.classList.contains("lite") ? " (Lite on)" : ""); },
    storage: function () { try { return "localStorage keys: " + localStorage.length; } catch (e) { return "blocked"; } }, motion: function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced motion" : "full motion"; },
    fps: function () { return "run the terminal command inspect-fps for a live 1.5 s sample"; }
  };
  FM.DIAG = DIAG;
  function runAct(f, ui) { var msg; try { msg = ACTS[f.p.a](f.p.x, ui); } catch (e) { msg = "Could not run: " + e.message; } rows(ui, [["Result", msg]]); if (f.p.a === "diag" || f.p.a === "copy") ui.insertAdjacentHTML("beforeend", "<p class='meta'>Runs locally in your browser.</p>"); }

  var TYPES = { act: runAct, calc: runCalc, info: runInfo, code: runCode, scn: runScn, term: runTerm, vis: runVis, ach: runAch, log: runLog, sim: runInfo };
  FM.validate = function () { var n = 0, bad = []; FM.list.forEach(function (f) { var ok = TYPES[f.t] && f.p && (f.t !== "calc" || CALCS[f.p.c]) && (f.t !== "act" || ACTS[f.p.a]) && (f.t !== "scn" || RULES[f.p.cat] || f.p.cat === "raid" || f.p.cat === "nuke"); if (ok) n++; else bad.push(f.id); }); return { active: n, total: FM.list.length, bad: bad }; };
  FM.run = function (f, ui) { ui.innerHTML = "<h3>" + esc(f.n) + "</h3><div class='meta'>" + f.id + " · " + esc(FM.engineName(f)) + "</div>" + (f.d ? "<p>" + esc(f.d) + "</p>" : ""); var box = document.createElement("div"); ui.appendChild(box); (TYPES[f.t] || function (a, b) { b.textContent = "Unknown type"; })(f, box); FM.record(f); };
  FM.engineName = function (f) { var e = FM.engines.filter(function (x) { return x.r === f.r && x.id === f.e; })[0]; return e ? "R" + f.r + " · E" + String(f.e).padStart(2, "0") + " " + e.n : f.e; };
  window.addEventListener("storage", function () { }); setTimeout(function () { FM.restoreVisual(); evaluate(); }, 0);
})();
