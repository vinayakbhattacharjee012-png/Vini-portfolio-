/* Registry 2 of 2: ten cosmic/planetary engines x 100 features = 1,000 more. Built by factories, lazily. window.FR2000 = { engines, list }. */
(function () {
  "use strict";
  var L = [], ENG = ["Orbital mechanics calculators", "Planet & moon comparators", "Space-weather scenarios", "Satellite constellation presets", "Astronomy utilities", "Rocket delta-v lab", "Cosmic terminal commands", "Cosmic visual presets", "Earth depth probes", "Cosmic achievements"].map(function (n, i) { return { r: 2, id: i + 1, n: n }; });
  var seq = {};
  function mk(e, name, t, p, d, kw) { seq[e] = (seq[e] || 0) + 1; L.push({ id: "R2-E" + String(e).padStart(2, "0") + "-" + String(seq[e]).padStart(3, "0"), r: 2, e: e, n: name, t: t, p: p, d: d || "", k: (name + " " + (kw || "")).toLowerCase() }); }
  function F() { return window.FM; }
  var NAMES = { sun: "Sun", mercury: "Mercury", venus: "Venus", earth: "Earth", moon: "Moon", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune" };
  var BK = Object.keys(NAMES), ALT = { sun: 1e6, mercury: 300, venus: 300, earth: 400, moon: 100, mars: 400, jupiter: 1000, saturn: 1000, uranus: 1000, neptune: 1000 };
  var QN = { vc: "circular velocity", T: "orbital period", ve: "escape velocity", g: "gravity at altitude", E: "orbital energy", w: "angular rate", hoh: "Hohmann transfer Δv", tt: "transfer time", dve: "escape Δv from orbit", shift: "ground-track shift" };

  /* ---- E01: 10 bodies x 10 quantities ---- */
  BK.forEach(function (b) { Object.keys(QN).forEach(function (q) { mk(1, NAMES[b] + ": " + QN[q], "calc", { c: "orb", b: b, q: q, v: { alt: ALT[b], alt2: ALT[b] * 4 + 500 } }, "Keplerian two-body maths for " + NAMES[b] + ". Change the altitude.", "orbital mechanics kepler " + NAMES[b] + " " + QN[q]); }); });

  /* ---- E02: 14 bodies -> 91 pairs + 9 rankings ---- */
  var P = [["Mercury", 3.301e23, 2439.7], ["Venus", 4.867e24, 6051.8], ["Earth", 5.972e24, 6371], ["Moon", 7.342e22, 1737.4], ["Mars", 6.417e23, 3389.5], ["Jupiter", 1.898e27, 69911], ["Saturn", 5.683e26, 58232], ["Uranus", 8.681e25, 25362], ["Neptune", 1.024e26, 24622], ["Pluto", 1.303e22, 1188.3], ["Titan", 1.345e23, 2574.7], ["Europa", 4.8e22, 1560.8], ["Ganymede", 1.482e23, 2634.1], ["Ceres", 9.38e20, 469.7]];
  var G = 6.6743e-11;
  function props(b) { var m = b[1], r = b[2] * 1000; return { m: m, r: b[2], rho: m / (4 / 3 * Math.PI * r * r * r), g: G * m / (r * r), ve: Math.sqrt(2 * G * m / r) / 1000 }; }
  var f2 = function (x, d) { return Number(x).toLocaleString("en-US", { maximumSignificantDigits: d || 4 }); };
  for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) (function (a, b) {
    mk(2, a[0] + " vs " + b[0], "info", { text: "Side-by-side from rounded published values (mass, mean radius).", rows: function () { var A = props(a), B = props(b); return [["Mass ratio", f2(B.m / A.m) + "× (" + b[0] + " / " + a[0] + ")"], ["Radius ratio", f2(B.r / A.r) + "×"], ["Density", f2(A.rho) + " vs " + f2(B.rho) + " kg/m³"], ["Surface gravity", f2(A.g) + " vs " + f2(B.g) + " m/s²"], ["Escape velocity", f2(A.ve) + " vs " + f2(B.ve) + " km/s"]]; } }, "Compare two bodies.", "planet moon compare " + a[0] + " " + b[0]);
  })(P[i], P[j]);
  [["mass", "m", 1], ["radius", "r", 1], ["density", "rho", 1], ["surface gravity", "g", 1], ["escape velocity", "ve", 1], ["mass (smallest first)", "m", -1], ["radius (smallest first)", "r", -1], ["gravity (weakest first)", "g", -1], ["density (lowest first)", "rho", -1]].forEach(function (r) { mk(2, "Ranking by " + r[0], "info", { text: "All 14 bodies sorted.", rows: function () { return P.map(function (b) { return [b[0], props(b)[r[1]]]; }).sort(function (x, y) { return (y[1] - x[1]) * r[2]; }).map(function (x) { return [x[0], f2(x[1])]; }); } }, "Ranking of the bodies.", "ranking planets " + r[0]); });

  /* ---- E03: 100 space-weather presets ---- */
  var WIND = [300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
  var WX = [["quiet", 5, 0], ["gentle south", 5, -5], ["moderate south", 8, -10], ["strong south", 10, -15], ["dense CME", 20, -20], ["extreme CME", 30, -25], ["worst case", 50, -30], ["north IMF", 3, 5], ["strong north", 2, 10], ["dense neutral", 15, 0]];
  WIND.forEach(function (v) { WX.forEach(function (w) { mk(3, "Wind " + v + " km/s, " + w[0], "calc", { c: "sw", v: { v: v, n: w[1], bz: w[2] }, apply: ["Apply to the Cosmos page", "cosmos", { vsw: v, n: w[1], bz: w[2] }] }, "Solar-wind scenario using the Shue (1997) magnetopause model.", "space weather solar wind magnetosphere storm cme"); }); });

  /* ---- E04: 100 constellations ---- */
  var ALTS = [300, 400, 550, 700, 800, 1000, 1200, 8000, 20200, 35786], CF = [[53, 24, 22, 25], [70, 36, 20, 25], [97.6, 6, 11, 20], [87, 36, 49, 25], [55, 6, 4, 5], [30, 8, 6, 10], [0, 1, 3, 5], [98, 12, 12, 15], [45, 10, 10, 15], [63.4, 3, 2, 10]];
  ALTS.forEach(function (a) { CF.forEach(function (c) { var o = { alt: a, inc: c[0], pl: c[1], pp: c[2], el: c[3] }; mk(4, a + " km, " + c[0] + "°, " + c[1] + "×" + c[2], "calc", { c: "cons", v: o, apply: ["Show on the Cosmos page", "cosmos", a < 2500 ? { leoAlt: a, leoN: Math.min(60, c[1] * c[2]) } : { meoAlt: Math.min(a, 35000), meoN: Math.min(36, c[1] * c[2]) }] }, "Shell geometry: period, footprint, coverage.", "satellite constellation leo meo geo shell footprint"); }); });

  /* ---- E05: 10 kinds x 10 values ---- */
  var AS = [["ly", "Light-years", [[1, ""], [4.24, " (Proxima Centauri)"], [8.6, " (Sirius)"], [25, " (Vega)"], [100, ""], [1000, ""], [26000, " (galactic centre, approx.)"], [100000, " (Milky Way width, approx.)"], [2.5e6, " (Andromeda, approx.)"], [1e9, ""]]],
    ["pc", "Parsecs", [[1, ""], [2, ""], [5, ""], [10, ""], [50, ""], [100, ""], [500, ""], [1000, ""], [8000, " (galactic centre, approx.)"], [1e6, ""]]],
    ["au", "AU", [[0.39, " (Mercury)"], [0.72, " (Venus)"], [1, " (Earth)"], [1.52, " (Mars)"], [5.2, " (Jupiter)"], [9.58, " (Saturn)"], [19.2, " (Uranus)"], [30.1, " (Neptune)"], [39.5, " (Pluto, mean)"], [100, ""]]],
    ["lt", "Light time over km", [[384400, " (Moon)"], [35786, " (GEO altitude)"], [400, " (ISS-like)"], [1.496e8, " (Sun)"], [7.78e8, " (Jupiter)"], [4.5e9, " (Neptune)"], [5.9e9, " (Pluto)"], [1e3, ""], [1e5, ""], [1e10, ""]]],
    ["z", "Redshift z", [[0.001, ""], [0.01, ""], [0.1, ""], [0.5, ""], [1, ""], [2, ""], [3, ""], [5, ""], [7, ""], [10, ""]]],
    ["mag", "Magnitude difference", [[1, ""], [2, ""], [2.5, " (100×)"], [5, " (100× flux ratio)"], [7.5, ""], [10, ""], [12.5, ""], [15, ""], [20, ""], [25, ""]]],
    ["plx", "Parallax (arcsec)", [[0.768, " (Proxima, approx.)"], [0.379, " (Sirius, approx.)"], [0.747, " (Alpha Cen, approx.)"], [0.547, " (Barnard's, approx.)"], [0.13, " (Vega, approx.)"], [0.1, ""], [0.05, ""], [0.02, ""], [0.01, ""], [0.001, ""]]],
    ["kep", "Semi-major axis (AU)", [[0.387, " (Mercury)"], [0.723, " (Venus)"], [1, " (Earth)"], [1.524, " (Mars)"], [5.203, " (Jupiter)"], [9.537, " (Saturn)"], [19.19, " (Uranus)"], [30.07, " (Neptune)"], [39.48, " (Pluto)"], [100, ""]]],
    ["sch", "Mass (solar masses)", [[1, ""], [3, ""], [10, ""], [20, ""], [5, ""], [1e6, ""], [4.3e6, " (Sgr A*, approx.)"], [1e9, ""], [6.5e9, " (M87*, approx.)"], [0.5, ""]]],
    ["wien", "Temperature (K)", [[5772, " (Sun surface)"], [3000, " (cool red dwarf)"], [9940, " (Sirius A, approx.)"], [310, " (human body)"], [2.725, " (CMB)"], [2700, " (incandescent lamp)"], [30000, " (hot star)"], [100, ""], [1000, ""], [50000, ""]]]];
  AS.forEach(function (a) { a[2].forEach(function (v) { mk(5, a[1] + ": " + v[0] + v[1], "calc", { c: "astro", k: a[0], v: { x: v[0] } }, "Astronomy conversion.", "astronomy converter " + a[1]); }); });

  /* ---- E06: engines x mass ratios ---- */
  var EN = [["Cold gas", 70], ["Hydrazine monoprop", 230], ["Solid motor", 270], ["Kerolox (sea level)", 300], ["Kerolox (vacuum)", 340], ["Methalox (vacuum)", 380], ["Hydrolox (vacuum)", 450], ["Hall thruster", 1600], ["Gridded ion", 3000], ["Nuclear thermal (test)", 900]];
  EN.forEach(function (e) { [1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30].forEach(function (r) { mk(6, e[0] + ", mass ratio " + r, "calc", { c: "rocket", v: { isp: e[1], m0: r * 10, mf: 10 } }, "Tsiolkovsky rocket equation. Isp values are typical, rounded.", "rocket delta-v tsiolkovsky isp " + e[0]); }); });

  /* ---- E07: 100 cosmic terminal commands ---- */
  var T = []; function cmd(n, d, f, u) { T.push([n, d, f, u]); }
  function lines(rs) { return rs.map(function (r) { return r[0] + ": " + r[1]; }).join("\n"); }
  function num(a, d) { var n = parseFloat(a); return isFinite(n) ? n : d; }
  BK.forEach(function (b) {
    cmd("orbit-" + b, "Circular velocity and radius at an altitude (km)", function (a) { return lines(F().calcOut("orb", { alt: num(a, ALT[b]), alt2: 0 }, { b: b, q: "vc" })); }, "[alt km]");
    cmd("period-" + b, "Orbital period at an altitude (km)", function (a) { return lines(F().calcOut("orb", { alt: num(a, ALT[b]), alt2: 0 }, { b: b, q: "T" })); }, "[alt km]");
    cmd("escape-" + b, "Escape velocity at an altitude (km)", function (a) { return lines(F().calcOut("orb", { alt: num(a, 0), alt2: 0 }, { b: b, q: "ve" })); }, "[alt km]");
    cmd("gravity-" + b, "Gravity at an altitude (km)", function (a) { return lines(F().calcOut("orb", { alt: num(a, 0), alt2: 0 }, { b: b, q: "g" })); }, "[alt km]");
    cmd("hohmann-" + b, "Hohmann transfer Δv between two altitudes", function (a) { var p = (a || "").split(/\s+/); return lines(F().calcOut("orb", { alt: num(p[0], ALT[b]), alt2: num(p[1], ALT[b] * 4 + 500) }, { b: b, q: "hoh" })); }, "[alt1 alt2]");
  });
  [6, 7, 8, 9].forEach(function (m) { cmd("quake-" + m, "Fire a magnitude " + m + " quake on the Earth model", function () { F().applyPage("earth", { quake: { angle: -90 + Math.random() * 180, mag: m, depth: 10 } }); return "M" + m + " event queued on #/earth-core"; }); });
  [["crust", 20], ["mantle", 1500], ["outer", 4000], ["inner", 6000]].forEach(function (d) { cmd("drill-" + d[0], "Drill the probe to the " + d[0], function () { F().applyPage("earth", { drill: d[1] }); return "probe at " + d[1] + " km"; }); });
  [["crust", 20], ["mantle", 1500], ["outer", 4000], ["inner", 6000]].forEach(function (d) { cmd("layer-" + d[0], "Properties at the " + d[0], function () { var a = window.EarthModel.at(d[1]); return a.layer.name + ": " + Math.round(a.T) + " °C, " + a.P.toFixed(1) + " GPa, " + a.rho.toFixed(2) + " g/cm³, " + a.state; }); });
  [["quiet", 300, 4, 2], ["fast", 700, 6, -4], ["cme", 800, 25, -15], ["storm", 900, 35, -25], ["extreme", 1000, 50, -30]].forEach(function (w) { cmd("wind-" + w[0], "Set the solar wind to " + w[0], function () { F().applyPage("cosmos", { vsw: w[1], n: w[2], bz: w[3] }); return "solar wind " + w[1] + " km/s, Bz " + w[3] + " nT"; }); });
  [["north", 8], ["south", -12], ["zero", 0]].forEach(function (b) { cmd("bz-" + b[0], "Set IMF Bz " + b[0], function () { F().applyPage("cosmos", { bz: b[1] }); return "Bz " + b[1] + " nT"; }); });
  [1, 10, 100, 1000, 10000, 100000].forEach(function (w) { cmd("warp-" + w, "Time warp " + w + "×", function () { F().applyPage("cosmos", { warp: w }); return "warp " + w + "×"; }); });
  [300, 550, 800, 1200].forEach(function (a) { cmd("leo-" + a, "Set the LEO ring to " + a + " km", function () { F().applyPage("cosmos", { leoAlt: a }); return lines(F().calcOut("orb", { alt: a, alt2: 0 }, { b: "earth", q: "vc" })); }); });
  [["ly", "Light-years to parsecs, AU, km"], ["pc", "Parsecs to light-years"], ["au", "AU to km and light time"], ["lighttime", "Light time over km"], ["redshift", "Redshift to velocity"], ["magflux", "Magnitude difference to flux ratio"], ["parallax", "Parallax (arcsec) to distance"], ["kepler3", "Orbital period from semi-major axis (AU)"], ["schwarz", "Schwarzschild radius from solar masses"], ["wien", "Peak wavelength from temperature (K)"]].forEach(function (a) { var k = { lighttime: "lt", redshift: "z", magflux: "mag", parallax: "plx", kepler3: "kep", schwarz: "sch" }[a[0]] || a[0]; cmd(a[0], a[1], function (x) { return lines(F().calcOut("astro", { x: num(x, 1) }, { k: k })); }, "[value]"); });
  cmd("rocket", "Δv from isp, wet and dry mass", function (a) { var p = (a || "").split(/\s+/); return lines(F().calcOut("rocket", { isp: num(p[0], 350), m0: num(p[1], 100), mf: num(p[2], 10) }, {})); }, "[isp wet dry]");
  cmd("isp-list", "Typical Isp values", function () { return EN.map(function (e) { return e[0] + ": " + e[1] + " s"; }).join("\n"); });
  cmd("dv-leo", "Rough Δv to reach low Earth orbit", function () { return "about 9.3–10 km/s including losses (approximate)"; }); cmd("dv-moon", "Rough Δv from LEO to lunar orbit", function () { return "about 3.9 km/s (approximate)"; }); cmd("dv-mars", "Rough Δv from LEO to Mars transfer", function () { return "about 3.6 km/s (approximate)"; });
  cmd("cosmos-state", "Current cosmos parameters", function () { return window.__cosmos ? JSON.stringify(window.__cosmos.state()) : "open #/cosmos first"; }); cmd("space-help", "List the cosmic commands", function () { return "orbit-/period-/escape-/gravity-/hohmann-<body>, quake-N, drill-<layer>, layer-<layer>, wind-<kind>, bz-<dir>, warp-N, leo-<km>, ly pc au lighttime redshift magflux parallax kepler3 schwarz wien, rocket"; });
  cmd("earth-state", "Earth model at the surface", function () { var a = window.EarthModel.at(0); return a.layer.name + " " + Math.round(a.T) + " °C"; }); cmd("sun-wind", "Typical solar wind numbers", function () { return "typical 300–800 km/s, 1–10 protons/cm³ near Earth (approximate)"; }); cmd("planets", "List the bodies", function () { return P.map(function (b) { return b[0]; }).join(", "); });
  T.slice(0, 100).forEach(function (c) { mk(7, c[0], "term", { cmd: c[0], desc: c[1], usage: c[3], fn: c[2] }, c[1], "terminal cosmic command space " + c[0]); });
  while (seq[7] < 100) mk(7, "space-noop-" + seq[7], "term", { cmd: "noop", desc: "reserved", fn: function () { return "ok"; } }, "", "");

  /* ---- E08: 100 cosmic visual presets ---- */
  var VP = [
    ["Stage tint", ["#0c1320|#06070a", "#14102a|#06070a", "#0a1f26|#06070a", "#1a0f1e|#06070a", "#102018|#06070a", "#1f1608|#06070a", "#0b0b16|#000", "#10162a|#05060d", "#1b1212|#060606", "#0d1d2e|#050a12"], function (v) { var a = v.split("|"); return { "--ec-bg": "radial-gradient(80% 80% at 50% 45%," + a[0] + "," + a[1] + ")" }; }],
    ["Stage border", ["#1d2433", "#06b6d4", "#8b5cf6", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#f87171", "#e8f7fb", "transparent"], function (v) { return { "--ec-bd": v }; }],
    ["Stage radius", [0, 4, 8, 12, 16, 20, 24, 28, 32, 36], function (v) { return { "--ec-r": v + "px" }; }],
    ["Card text size", [.72, .76, .8, .84, .88, .92, .96, 1, 1.05, 1.1], function (v) { return { "--ec-fs": v + "rem" }; }],
    ["Card opacity", [.5, .6, .7, .8, .9, .95, 1, .85, .75, .65], function (v) { return { "--ec-card": "rgba(12,14,20," + v + ")" }; }],
    ["Stage glow", [0, 8, 14, 20, 26, 32, 40, 48, 56, 64], function (v) { return { "--ec-sh": v ? "0 0 " + v + "px rgba(6,182,212,.25)" : "none" }; }],
    ["Canvas hue", [0, 20, 40, 60, 90, 120, 180, 240, 300, 330], function (v) { return { "--ec-f": v ? "hue-rotate(" + v + "deg)" : "none" }; }],
    ["Card border", ["#1d2433", "#06b6d433", "#8b5cf633", "#06b6d4", "#8b5cf6", "#34d39944", "#fbbf2444", "#f472b644", "#e8f7fb33", "transparent"], function (v) { return { "--ec-cb": v }; }],
    ["Hint colour", ["#9aa7b8", "#06b6d4", "#8b5cf6", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#e8f7fb", "#f87171", "#a3e635"], function (v) { return { "--ec-hint": v }; }],
    ["Heading colour", ["#06b6d4", "#8b5cf6", "#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#e8f7fb", "#f97316"], function (v) { return { "--ec-h": v }; }]
  ];
  VP.forEach(function (c, ci) { c[1].forEach(function (v, i) { mk(8, c[0] + ": " + (typeof v === "string" && v.indexOf("|") > -1 ? "tint " + (i + 1) : v), "vis", { cat: "k" + ci, catName: c[0], i: i, set: c[2](v) }, "Style the Earth core and Cosmos pages. Persists in localStorage.", "cosmic visual preset stage hud " + c[0]); }); });

  /* ---- E09: 100 depth probes ---- */
  for (var d = 0; d < 100; d++) (function (depth) {
    mk(9, "Probe at " + depth.toLocaleString("en-US") + " km", "info", { text: "Values from the simplified PREM-style model used on #/earth-core.", rows: function () { var a = window.EarthModel.at(depth); return [["Layer", a.layer.name], ["Temperature", Math.round(a.T).toLocaleString() + " °C"], ["Pressure", a.P.toFixed(1) + " GPa"], ["Density", a.rho.toFixed(2) + " g/cm³"], ["State", a.state], ["P-wave", a.vp.toFixed(1) + " km/s"], ["S-wave", a.vs ? a.vs.toFixed(1) + " km/s" : "none (liquid)"]]; }, apply: ["Drill to this depth", "earth", { drill: depth }] }, "Depth probe.", "earth depth probe drill temperature pressure " + depth);
  })(Math.round(d * 6371 / 99));

  /* ---- E10: 100 cosmic achievements ---- */
  var AC = [];
  [1, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500].forEach(function (n) { AC.push(["Cosmos: run " + n + " feature" + (n > 1 ? "s" : "") + " from registry 2", ["r2", n], "Run " + n + " registry-2 features"]); });
  [5, 10, 25, 50, 100, 200, 300, 500, 750, 1000].forEach(function (n) { AC.push(["Cosmos: " + n + " distinct registry-2 features", ["u2", n], n + " distinct"]); });
  for (var en = 1; en <= 10; en++) [1, 5, 15].forEach(function (n) { AC.push(["Cosmic engine " + en + ": " + n + " run" + (n > 1 ? "s" : ""), ["eng", en, n, 2], n + " runs in cosmic engine " + en]); });
  [["earth", "Open Earth core"], ["cosmos", "Open Cosmos"], ["quake", "Trigger an earthquake"], ["inspect", "Inspect a layer"], ["explode", "Use the exploded view"], ["drill", "Start the drill probe"], ["drill-core", "Drill into the core"], ["warp", "Change the time warp"], ["wind", "Change the solar wind"], ["bz", "Flip the IMF Bz"]].forEach(function (e) { AC.push([e[1], ["flag", "ev:" + e[0]], e[1]]); });
  AC.push(["Apply a preset to Earth core", ["flag", "applied:earth"], "Use an Apply button for Earth"], ["Apply a preset to Cosmos", ["flag", "applied:cosmos"], "Use an Apply button for Cosmos"]);
  [3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach(function (n) { AC.push(["Cosmic milestones: " + n, ["ach", n], n + " milestones in total"]); });
  for (var k = 1; AC.length < 100; k++) AC.push(["Cosmic explorer " + k, ["r2", 500 + 100 * k], "Run " + (500 + 100 * k) + " registry-2 features"]);
  AC.slice(0, 100).forEach(function (a) { mk(10, a[0], "ach", { test: a[1], goal: a[2] }, "Discovery milestone.", "achievement milestone cosmic"); });

  var cnt = {}; L.forEach(function (f) { cnt[f.e] = (cnt[f.e] || 0) + 1; });
  window.FR2000 = { engines: ENG, list: L, counts: cnt };
})();
