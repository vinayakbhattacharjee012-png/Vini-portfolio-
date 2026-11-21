/* Tiny always-loaded hub: lazy-loads pages and the feature registries so first paint stays light. Exposes window.FeatureHub. */
(function () {
  "use strict";
  var cache = {}, root = document.documentElement;
  function load(src) {
    if (cache[src]) return cache[src];
    return (cache[src] = new Promise(function (ok, fail) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { delete cache[src]; fail(new Error("load " + src)); }; document.head.appendChild(s); }));
  }
  function seq(list) { return list.reduce(function (p, s) { return p.then(function () { return load(s); }); }, Promise.resolve()); }
  var PAGES = { earth: ["src/engine/earthModel.js", "src/pages/EarthCorePage.js"], cosmos: ["src/pages/CosmosPage.js"] };
  var CORE = ["src/engine/earthModel.js", "src/data/commits.js", "src/data/featureRegistry1000.js", "src/data/featureRegistry2000.js", "src/engine/featureRunner.js", "src/engine/featureExplorer.js"];
  var hub = window.FeatureHub = {
    load: load,
    page: function (k) { return seq(PAGES[k]); },
    core: function () { return seq(CORE).then(function () { if (window.FM.terminal) window.FM.terminal(); return window.FM; }); },
    open: function (q, eng) { return hub.core().then(function (FM) { FM.open(q, eng); }); }
  };
  // Registry engines live inside their own pages too: Lab, Arena, Vault and Logs get an inline browser, mounted on first visit.
  var MOUNTS = { "#/lab": ["1-2", "Widget library", "100 small tools: unit converters, heart-rate zones, rate limiters, validators, colour checks and more."], "#/arena": ["1-3", "Test vectors", "100 guardrail and bot-defence scenarios. Run one and see which layer catches it."], "#/vault": ["1-4", "Blueprint library", "100 code patterns with a small diagram each. Search, then copy."], "#/logs": ["1-6", "Build log", "Real commits from this repo, plus technique notes. Filter and open any entry."] };
  function mounts() { var m = MOUNTS[location.hash]; if (!m) return; var view = document.querySelector('.view[data-view="' + location.hash.slice(2) + '"] .wrap'); if (view && !view.querySelector(".fm-mini")) hub.core().then(function (FM) { FM.mount(view, [m[0]], m[1], m[2]); }).catch(function () {}); }
  window.addEventListener("hashchange", mounts); mounts();
  // Skills: a button under the skills grid opens the explorer on the 100 skill and concept nodes.
  (function () { var g = document.getElementById("skGrid"); if (!g || !g.parentNode) return; var b = document.createElement("button"); b.type = "button"; b.className = "cta sk-more"; b.textContent = "Browse the 100 skill and concept nodes"; b.addEventListener("click", function () { hub.open("", "1-5"); }); g.parentNode.appendChild(b); })();
  function route() {
    var h = location.hash, m = /^#\/f\/(R[12]-E\d\d-\d{3})$/i.exec(h);
    if (m) { hub.core().then(function (FM) { FM.openId(m[1]); }); return; }
    if (h === "#/earth-core") hub.page("earth"); else if (h === "#/cosmos") hub.page("cosmos");
  }
  window.addEventListener("hashchange", route); route();
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) { e.preventDefault(); hub.open(); }
  });
  var cm = window.__cmds = window.__cmds || [];
  cm.push({ t: "Feature Matrix Explorer", d: "Search and launch all 2,000 features (Ctrl+Shift+F)", k: "feature matrix explorer registry search launch all features", run: function () { hub.open(); } });
  cm.push({ t: "Go to Earth core", d: "Cutaway Earth, drill probe, seismic waves", k: "earth core crust mantle seismic planet", run: function () { location.hash = "#/earth-core"; } });
  var JN = window.JOURNEY_NAMES = ["Creator", "Moderation", "Bots", "Security", "Testing", "Leadership", "Now"];
  window.openJourney = function (i) { try { sessionStorage.setItem("ecStage", i); } catch (e) {} if (location.hash === "#/earth-core") window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = "#/earth-core"; };
  JN.forEach(function (n, i) { cm.push({ t: "Journey stage " + (i + 1) + ": " + n, d: "Drill to this stage of my journey", k: "journey earth core stage drill " + n.toLowerCase(), run: function () { window.openJourney(i); } }); });
  cm.push({ t: "Go to Cosmos", d: "Magnetosphere, solar wind, satellite orbits", k: "cosmos orbit satellite magnetosphere solar wind space", run: function () { location.hash = "#/cosmos"; } });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-fm-open]"); if (b) { e.preventDefault(); hub.open(); } });
  // Warm the registries when idle (skipped on Lite/save-data) and whenever the terminal is first used.
  function warm() { hub.core().catch(function () {}); }
  var weak = root.classList.contains("lite") || (navigator.connection && navigator.connection.saveData);
  // No idle preload: the registries build only when you open the explorer or the terminal (keeps load free of long tasks).
  var t = document.getElementById("tele"); if (t) t.addEventListener("click", warm, { once: true });
  window.addEventListener("keydown", function (e) { if (e.key === "`") warm(); }, { once: true });
})();
