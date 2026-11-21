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

  /* ---------- Governor: one shared frame loop, one place to cap, gate and measure ----------
     Gov.loop(name, fn(now, dt), { fps, liteFps, when, once }) -> { start(), stop() }
     - one requestAnimationFrame for every registered loop (no stacked loops)
     - each loop has an fps cap (lower on Lite) and a gate: when() false parks it until start() is called again
     - hidden tabs run nothing; Alt+Shift+P (or `perf hud` in the terminal) shows live numbers */
  var loops = [], raf = 0, hud = null, hudT = 0;
  function pump(t) {
    raf = 0; if (document.hidden) return;
    var lite = root.classList.contains("lite"), any = false, i, l;
    for (i = 0; i < loops.length; i++) {
      l = loops[i]; if (!l.on) continue;
      if (!l.when()) { l.on = false; continue; }
      any = true;
      var gap = 1000 / (lite ? l.liteFps : l.fps);
      if (t - l.last >= gap) { var dt = Math.min(0.08, (t - l.last) / 1000); l.last = t; var s = performance.now(); l.fn(t, dt); l.ms += performance.now() - s; l.n++; if (l.once) l.on = false; }
    }
    if (any) raf = requestAnimationFrame(pump);
  }
  function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(pump); }
  document.addEventListener("visibilitychange", kick);
  var Gov = {
    loop: function (name, fn, o) {
      o = o || {}; var l = { name: name, fn: fn, fps: o.fps || 50, liteFps: o.liteFps || 24, when: o.when || function () { return true; }, once: !!o.once, on: false, last: 0, n: 0, ms: 0 };
      loops.push(l);
      return { start: function () { if (!l.on) { l.on = true; l.last = 0; } kick(); }, stop: function () { l.on = false; }, get running() { return l.on; } };
    },
    stats: function () { return loops.map(function (l) { return { name: l.name, on: l.on, calls: l.n, avgMs: l.n ? +(l.ms / l.n).toFixed(2) : 0 }; }); },
    hud: function (on) {
      if (on === undefined) on = !hud;
      if (!on) { if (hud) { hud.remove(); hud = null; clearInterval(hudT); } return; }
      if (hud) return; hud = document.createElement("pre"); hud.setAttribute("aria-hidden", "true");
      hud.style.cssText = "position:fixed;right:8px;top:8px;z-index:200;margin:0;padding:8px 10px;font:600 11px/1.5 ui-monospace,monospace;color:#06b6d4;background:rgba(6,7,10,.88);border:1px solid #1d2433;border-radius:8px;pointer-events:none;white-space:pre";
      document.body.appendChild(hud); var n = 0, t0 = performance.now(), prev = {};
      (function f(t) { n++; if (hud) requestAnimationFrame(f); })(0);
      hudT = setInterval(function () {
        var now = performance.now(), fps = Math.round(n / ((now - t0) / 1000)); n = 0; t0 = now;
        var rows = loops.filter(function (l) { return l.on; }).map(function (l) { var d = l.n - (prev[l.name] || 0); prev[l.name] = l.n; return l.name + " " + d + "/s " + (l.n ? (l.ms / l.n).toFixed(1) : 0) + "ms"; });
        hud.textContent = "fps " + fps + (root.classList.contains("lite") ? "  LITE" : "") + "\nanims " + (document.getAnimations ? document.getAnimations().filter(function (a) { return a.playState === "running"; }).length : "?") + "\nloops " + (rows.length ? "\n " + rows.join("\n ") : "none");
      }, 1000);
    }
  };
  window.Gov = Gov;
  document.addEventListener("keydown", function (e) { if (e.altKey && e.shiftKey && (e.key === "P" || e.key === "p")) { e.preventDefault(); Gov.hud(); } });

  // Auto mode, adaptive: sample frame rate in 3 s windows after load and again after view changes.
  // Two slow windows in a row (median under ~48 fps) drop to Lite. It never climbs back by itself, so it can't flap.
  if (mode === "auto" && !root.classList.contains("lite") && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var slow = 0, win = 0;
    function sample() {
      if (root.classList.contains("lite") || document.hidden || root.classList.contains("loading")) { setTimeout(sample, 4000); return; }
      var s = [], last = 0, t0 = 0;
      requestAnimationFrame(function f(t) {
        if (document.hidden) { setTimeout(sample, 4000); return; }
        if (!t0) t0 = t; if (last) s.push(t - last); last = t;
        if (t - t0 < 3000) return requestAnimationFrame(f);
        s.sort(function (a, b) { return a - b; }); var median = s[Math.floor(s.length / 2)] || 16;
        if (s.length > 30 && 1000 / median < 48) slow++; else slow = 0;
        if (slow >= 2) { root.classList.add("lite"); label(); toast("Switched to Lite mode for smoother scrolling. Change it in the footer."); return; }
        if (++win < 8) setTimeout(sample, slow ? 600 : 6000);
      });
    }
    setTimeout(sample, 1500);
    window.addEventListener("hashchange", function () { win = Math.min(win, 4); });
  }

  window.__perf = { set: set, cycle: cycle, mode: function () { return mode; } };
  var CM = window.__cmds = window.__cmds || [];
  CM.push({ t: "Performance mode", d: "Switch between Auto, Lite and Full effects", k: "performance lite fast lag smooth animation speed", run: cycle });
  var fx = window.__fx;
  if (fx && fx.cmds && fx.print) {
    fx.cmds.perf = fx.cmds.lite = function (a) { if (a === "hud") { Gov.hud(); fx.print("g", "perf hud toggled (Alt+Shift+P)"); return; } if (a === "lite" || a === "full" || a === "auto") set(a); else { cycle(); } fx.print("g", "performance: " + mode); };
    var oh = fx.cmds.help; fx.cmds.help = function (a) { oh(a); fx.print("o", "  perf [lite|full|auto|hud]   change performance mode or show live fps"); };
  }
})();
