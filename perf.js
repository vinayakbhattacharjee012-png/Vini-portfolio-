/* Performance mode: Auto switches to Lite on phones, slow devices and low frame rates. */
(function () {
  "use strict";
  var root = document.documentElement, btn = document.getElementById("perfBtn");
  var mode = root.getAttribute("data-perf") || "auto";
  function label() {
    var lite = root.classList.contains("lite");
    if (btn) btn.textContent = "Performance: " + (mode === "auto" ? (lite ? "Auto (Lite)" : "Auto") : mode === "lite" ? "Lite" : "Full");
  }
  function toast(m) { var t = document.getElementById("toast"); if (!t) return; t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 3200); }
  function set(m, reload) {
    try { localStorage.setItem("perf", m); } catch (e) {}
    mode = m; root.setAttribute("data-perf", m);
    if (m === "lite") { root.classList.add("lite"); label(); toast("Lite mode on: fewer animations for smoother scrolling"); }
    else if (reload !== false) { label(); toast("Reloading with " + (m === "full" ? "full effects" : "auto mode") + "…"); setTimeout(function () { location.reload(); }, 450); }
  }
  function cycle() { set(mode === "auto" ? "lite" : mode === "lite" ? "full" : "auto"); }
  if (btn) btn.addEventListener("click", cycle);
  label();

  // Auto mode: if the page runs below ~40 fps shortly after loading, switch to Lite without asking.
  if (mode === "auto" && !root.classList.contains("lite") && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var samples = [], last = 0, started = 0;
    function tick(t) {
      if (document.hidden) { last = 0; return requestAnimationFrame(tick); }
      if (root.classList.contains("loading")) { last = 0; return requestAnimationFrame(tick); }
      if (!started) started = t;
      if (last) samples.push(t - last);
      last = t;
      if (t - started < 2500) return requestAnimationFrame(tick);
      samples.sort(function (a, b) { return a - b; });
      var median = samples[Math.floor(samples.length / 2)] || 16;
      if (samples.length > 30 && 1000 / median < 40) { root.classList.add("lite"); label(); toast("Switched to Lite mode for smoother scrolling. Change it in the footer."); }
    }
    setTimeout(function () { requestAnimationFrame(tick); }, 1500);
  }

  window.__perf = { set: set, cycle: cycle, mode: function () { return mode; } };
  var CM = window.__cmds = window.__cmds || [];
  CM.push({ t: "Performance mode", d: "Switch between Auto, Lite and Full effects", k: "performance lite fast lag smooth animation speed", run: cycle });
  var fx = window.__fx;
  if (fx && fx.cmds && fx.print) {
    fx.cmds.perf = fx.cmds.lite = function (a) { if (a === "lite" || a === "full" || a === "auto") set(a); else { cycle(); } fx.print("g", "performance: " + mode); };
    var oh = fx.cmds.help; fx.cmds.help = function (a) { oh(a); fx.print("o", "  perf [lite|full|auto]   change performance mode"); };
  }
})();
