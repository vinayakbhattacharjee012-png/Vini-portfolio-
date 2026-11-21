/* 1000 generated themes. Each palette is built from a seeded colour formula and checked for readable contrast. */
(function () {
  "use strict";
  var root = document.documentElement;
  var COUNT = 1000, PER_PAGE = 40;
  var FAMILIES = [
    { name: "Obsidian", mode: "dark",  hue: [178, 200], sat: [70, 95] },
    { name: "Aurora",   mode: "dark",  hue: [140, 200], sat: [55, 90] },
    { name: "Ember",    mode: "dark",  hue: [8, 35],    sat: [70, 98] },
    { name: "Synth",    mode: "dark",  hue: [265, 320], sat: [65, 95] },
    { name: "Abyss",    mode: "dark",  hue: [212, 246], sat: [55, 90] },
    { name: "Glacier",  mode: "light", hue: [188, 215], sat: [45, 80] },
    { name: "Moss",     mode: "light", hue: [78, 122],  sat: [30, 60] },
    { name: "Sakura",   mode: "light", hue: [325, 352], sat: [40, 75] },
    { name: "Desert",   mode: "light", hue: [22, 46],   sat: [40, 75] },
    { name: "Mono",     mode: "light", hue: [0, 360],   sat: [0, 14] }
  ];
  var VARS = ["--bg", "--surface", "--surface-2", "--ink", "--muted", "--line", "--star", "--nebula", "--danger", "--star-soft", "--nav-bg", "--glow"];

  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hsl(h, s, l) { // returns [r,g,b] 0..255
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function hex(rgb) { return "#" + rgb.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); }
  function lum(rgb) { var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function rgbOf(h, s, l) { return hsl(h, s, l); }

  // Build theme i (0..999) deterministically.
  function build(i) {
    var fam = FAMILIES[Math.floor(i / 100)], v = i % 100, R = mulberry(i * 2654435761 + 0x9e3779b9);
    var h = fam.hue[0] + R() * (fam.hue[1] - fam.hue[0]);
    var s = fam.sat[0] + R() * (fam.sat[1] - fam.sat[0]);
    var dark = fam.mode === "dark";
    var bgL = dark ? 3 + R() * 9 : 93 + R() * 6;
    var bgS = fam.name === "Mono" ? 0 : Math.min(40, s * 0.35);
    var bg = hsl(h, bgS, bgL);
    var surfL = dark ? bgL + 3 + R() * 2.5 : bgL - 1 - R() * 2.5;
    var surface = hsl(h, bgS, surfL);
    var surface2 = hsl(h, bgS, dark ? surfL + 4 + R() * 3 : surfL - 3 - R() * 3);
    var inkL = dark ? 92 + R() * 5 : 8 + R() * 8;
    var ink = hsl(h, bgS * 0.4, inkL);
    var mutedL = dark ? 62 + R() * 8 : 40 + R() * 8, muted = hsl(h, bgS * 0.5, mutedL);
    var guard = 0;
    while (ratio(muted, surface2) < 4.6 && guard++ < 40) { mutedL += dark ? 1 : -1; muted = hsl(h, bgS * 0.5, mutedL); }
    var accH = h, accL = dark ? 62 + R() * 10 : 38 + R() * 10, acc = hsl(accH, s, accL);
    guard = 0;
    while (ratio(acc, bg) < 3.2 && guard++ < 40) { accL += dark ? 1 : -1; acc = hsl(accH, s, accL); }
    var nebH = (h + 34 + R() * 26) % 360, neb = hsl(nebH, s * 0.9, dark ? 62 + R() * 8 : 36 + R() * 8);
    guard = 0;
    while (ratio(neb, bg) < 3.2 && guard++ < 40) { neb = hsl(nebH, s * 0.9, dark ? (lum(neb) < 0.5 ? 74 : 70) : 30); if (guard > 30) break; }
    var line = hsl(h, bgS * 0.5, dark ? bgL + 9 + R() * 4 : bgL - 8 - R() * 4);
    var danger = hsl(dark ? 0 : 355, 75, dark ? 66 : 42);
    var t = {
      name: fam.name + " " + ("00" + (v + 1)).slice(-3), family: fam.name, mode: fam.mode, index: i + 1,
      bg: hex(bg), surface: hex(surface), surface2: hex(surface2), ink: hex(ink), muted: hex(muted), line: hex(line),
      star: hex(acc), nebula: hex(neb), danger: hex(danger),
      starSoft: "rgba(" + acc.join(",") + ",0.13)", navBg: "rgba(" + bg.join(",") + ",0.86)",
      glow: dark ? "0 10px 30px rgba(0,0,0,.35)" : "0 10px 30px rgba(16,20,42,.08)"
    };
    t.checks = { ink: ratio(hsl(0, 0, 0), bg) > 0 && ratio(ink, bg) >= 7, muted: ratio(muted, surface2) >= 4.5, accent: ratio(acc, bg) >= 3.2 };
    return t;
  }
  var cache = {};
  function theme(i) { return cache[i] || (cache[i] = build(i)); }

  function apply(i) {
    var t = theme(i);
    var map = { "--bg": t.bg, "--surface": t.surface, "--surface-2": t.surface2, "--ink": t.ink, "--muted": t.muted, "--line": t.line,
      "--star": t.star, "--nebula": t.nebula, "--danger": t.danger, "--star-soft": t.starSoft, "--nav-bg": t.navBg, "--glow": t.glow };
    VARS.forEach(function (k) { root.style.removeProperty(k); });
    Object.keys(map).forEach(function (k) { root.style.setProperty(k, map[k]); });
    root.style.colorScheme = t.mode;
    root.setAttribute("data-theme", "custom");
    try { localStorage.setItem("themeCustom", String(i)); } catch (e) {}
    try { localStorage.setItem("theme", "custom"); } catch (e) {}
    return t;
  }
  function clear() {
    VARS.forEach(function (k) { root.style.removeProperty(k); });
    root.style.colorScheme = "";
    try { localStorage.removeItem("themeCustom"); } catch (e) {}
  }
  function current() { try { var n = parseInt(localStorage.getItem("themeCustom"), 10); return n >= 0 && n < COUNT ? n : null; } catch (e) { return null; } }

  // Choosing light, dark or black from the existing switcher drops the custom palette.
  new MutationObserver(function () {
    var v = root.getAttribute("data-theme");
    if (v !== "custom") clear();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // Restore the saved theme before first paint.
  var saved = current();
  if (saved !== null) apply(saved);

  // ---------- picker ----------
  var css = ".tp{position:fixed;inset:0;margin:0;padding:0;border:0;background:transparent;color:inherit;max-width:none;max-height:none;width:100vw;height:100dvh;z-index:40}" +
    ".tp::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}" +
    ".tp-in{position:absolute;right:0;top:0;bottom:0;width:min(560px,100vw);background:#0b0c11;color:#e8ecf4;border-left:1px solid #1d2230;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;font:400 14px/1.5 Inter,system-ui,sans-serif}" +
    ".tp-head,.tp-ctl,.tp-foot{padding:12px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #1d2230}" +
    ".tp-foot{border-top:1px solid #1d2230;border-bottom:0;justify-content:space-between}" +
    ".tp h2{font:600 1.05rem 'Space Grotesk',system-ui,sans-serif;margin:0;flex:1}" +
    ".tp button{font:600 .8rem 'JetBrains Mono',ui-monospace,monospace;color:#e8ecf4;background:#141823;border:1px solid #2a3142;border-radius:9px;padding:8px 12px;cursor:pointer;min-height:36px}" +
    ".tp button:hover{border-color:#06b6d4}.tp button:focus-visible,.tp input:focus-visible{outline:2px solid #06b6d4;outline-offset:2px}" +
    ".tp input{flex:1;min-width:140px;font:500 .9rem 'JetBrains Mono',ui-monospace,monospace;color:#e8ecf4;background:#06070a;border:1px solid #2a3142;border-radius:9px;padding:9px 11px;min-height:38px}" +
    ".tp-grid{overflow:auto;padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));grid-auto-rows:max-content;gap:10px;align-content:start}" +
    ".tp-card{text-align:left;padding:8px;border-radius:12px;border:1px solid #2a3142;background:#0c0e14;color:#e8ecf4;cursor:pointer;height:auto}" +
    ".tp-card[aria-pressed=true]{border-color:#8b5cf6;box-shadow:0 0 0 2px rgba(139,92,246,.4)}" +
    ".tp-sw{display:flex;height:34px;border-radius:7px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}.tp-sw i{flex:1}" +
    ".tp-card b{display:block;margin-top:6px;font:600 .78rem 'JetBrains Mono',ui-monospace,monospace}.tp-card span{font-size:.7rem;color:#9aa7b8}" +
    ".tp-status{color:#9aa7b8;font:500 .78rem 'JetBrains Mono',ui-monospace,monospace;margin-right:auto}" +
    "@media (max-width:560px){.tp-in{width:100vw}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var dlg, grid, input, status, pageLbl, page = 0, list = [], active = null;
  function ensure() {
    if (dlg) return;
    dlg = document.createElement("dialog"); dlg.className = "tp"; dlg.setAttribute("aria-labelledby", "tpTitle");
    dlg.innerHTML = '<div class="tp-in"><div class="tp-head"><h2 id="tpTitle">Themes · 1000 generated</h2><button type="button" data-x aria-label="Close themes">Close</button></div>' +
      '<div class="tp-ctl"><input type="search" id="tpQ" placeholder="Number 1-1000 or family" aria-label="Search themes" autocomplete="off" spellcheck="false" />' +
      '<button type="button" data-shuffle>Random</button><button type="button" data-reset>Default</button></div>' +
      '<div class="tp-grid" id="tpGrid" role="list" aria-label="Themes"></div>' +
      '<div class="tp-foot"><span class="tp-status" id="tpStatus" aria-live="polite"></span><button type="button" data-prev>Prev</button><span id="tpPage" class="tp-status"></span><button type="button" data-next>Next</button></div></div>';
    document.body.appendChild(dlg);
    grid = dlg.querySelector("#tpGrid"); input = dlg.querySelector("#tpQ"); status = dlg.querySelector("#tpStatus"); pageLbl = dlg.querySelector("#tpPage");
    dlg.querySelector("[data-x]").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.querySelector("[data-prev]").addEventListener("click", function () { page = Math.max(0, page - 1); draw(); });
    dlg.querySelector("[data-next]").addEventListener("click", function () { page = Math.min(Math.ceil(list.length / PER_PAGE) - 1, page + 1); draw(); });
    dlg.querySelector("[data-shuffle]").addEventListener("click", function () { pick(Math.floor(Math.random() * COUNT)); });
    dlg.querySelector("[data-reset]").addEventListener("click", function () { clear(); active = null; status.textContent = "Default theme restored"; draw(); });
    input.addEventListener("input", function () { filter(); page = 0; draw(); });
    dlg.addEventListener("close", function () { if (document.body) document.body.style.overflow = ""; });
  }
  function filter() {
    var q = input.value.trim().toLowerCase(), all = [];
    for (var i = 0; i < COUNT; i++) all.push(i);
    if (!q) { list = all; return; }
    if (/^\d+$/.test(q)) { var n = parseInt(q, 10); list = n >= 1 && n <= COUNT ? [n - 1] : []; return; }
    list = all.filter(function (i) { var t = theme(i); return t.name.toLowerCase().indexOf(q) >= 0 || t.mode.indexOf(q) >= 0; });
  }
  function draw() {
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    var start = page * PER_PAGE, slice = list.slice(start, start + PER_PAGE);
    grid.innerHTML = "";
    slice.forEach(function (i) {
      var t = theme(i), b = document.createElement("button");
      b.type = "button"; b.className = "tp-card"; b.setAttribute("role", "listitem");
      b.setAttribute("aria-pressed", String(active === i)); b.setAttribute("aria-label", t.name + ", " + t.mode + " theme");
      b.innerHTML = '<div class="tp-sw"><i style="background:' + t.bg + '"></i><i style="background:' + t.surface2 + '"></i><i style="background:' + t.ink + '"></i><i style="background:' + t.star + '"></i><i style="background:' + t.nebula + '"></i></div><b></b><span>' + t.mode + " · #" + t.index + "</span>";
      b.querySelector("b").textContent = t.name;
      b.addEventListener("click", function () { pick(i); });
      grid.appendChild(b);
    });
    if (!slice.length) grid.innerHTML = '<p style="color:#9aa7b8">No theme matches. Try a number from 1 to 1000 or a family name.</p>';
    pageLbl.textContent = (page + 1) + " / " + pages;
  }
  function pick(i) {
    active = i; apply(i);
    var t = theme(i);
    if (dlg) { status.textContent = "Applied " + t.name + " · checked for contrast"; draw(); }
  }
  function open(opener) {
    ensure(); filter(); page = 0;
    if (saved !== null || current() !== null) active = current();
    input.value = ""; filter(); draw();
    dlg._opener = opener || document.activeElement;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(function () { input.focus(); }, 30);
    return true;
  }

  // Stats for tests and the palette
  window.__themes = { count: COUNT, theme: theme, apply: pick, clear: function () { clear(); active = null; }, current: current, open: open, families: FAMILIES.map(function (f) { return f.name; }) };

  // Entry points: palette, terminal and footer button
  var CM = window.__cmds = window.__cmds || [];
  CM.push({ t: "Themes (1000+)", d: "Browse and apply 1000 generated colour themes", k: "theme themes colour color palette random", run: function () { open(); } });
  var fb = document.getElementById("themesBtn");
  if (fb) fb.addEventListener("click", function () { open(fb); });
  document.addEventListener("DOMContentLoaded", function () {
    ["themesBtn", "themesNavBtn", "themesHeroBtn"].forEach(function (id) {
      var b = document.getElementById(id); if (b && !b._bound) { b._bound = 1; b.addEventListener("click", function () { open(b); }); }
    });
  });
})();
