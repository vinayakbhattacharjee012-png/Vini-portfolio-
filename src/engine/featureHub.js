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
    open: function (q) { return hub.core().then(function (FM) { FM.open(q); }); }
  };
  function route() { var h = location.hash; if (h === "#/earth-core") hub.page("earth"); else if (h === "#/cosmos") hub.page("cosmos"); }
  window.addEventListener("hashchange", route); route();
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) { e.preventDefault(); hub.open(); }
  });
  var cm = window.__cmds = window.__cmds || [];
  cm.push({ t: "Feature Matrix Explorer", d: "Search and launch all 2,000 features (Ctrl+Shift+F)", k: "feature matrix explorer registry search launch all features", run: function () { hub.open(); } });
  cm.push({ t: "Go to Earth core", d: "Cutaway Earth, drill probe, seismic waves", k: "earth core crust mantle seismic planet", run: function () { location.hash = "#/earth-core"; } });
  cm.push({ t: "Go to Cosmos", d: "Magnetosphere, solar wind, satellite orbits", k: "cosmos orbit satellite magnetosphere solar wind space", run: function () { location.hash = "#/cosmos"; } });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-fm-open]"); if (b) { e.preventDefault(); hub.open(); } });
  // Warm the registries when idle (skipped on Lite/save-data) and whenever the terminal is first used.
  function warm() { hub.core().catch(function () {}); }
  var weak = root.classList.contains("lite") || (navigator.connection && navigator.connection.saveData);
  if (!weak) (window.requestIdleCallback || function (f) { setTimeout(f, 2500); })(warm, { timeout: 6000 });
  var t = document.getElementById("tele"); if (t) t.addEventListener("click", warm, { once: true });
  window.addEventListener("keydown", function (e) { if (e.key === "`") warm(); }, { once: true });
})();
