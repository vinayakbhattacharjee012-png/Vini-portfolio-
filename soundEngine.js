/* Zero-asset UI sound: Web Audio synth. Muted by default, opt in with the navbar [SFX] button. Exposes window.SFX. */
(function () {
  var KEY = "sfx", ac = null, on = false, lastTick = 0;
  try { on = localStorage.getItem(KEY) === "on"; } catch (e) {}

  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  // One enveloped oscillator: short, quiet, never clips.
  function tone(freq, dur, type, vol, slideTo) {
    if (!on) return; var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, freq, vol) {
    if (!on) return; var a = ctx(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0), i;
    for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = freq; g.gain.value = vol || 0.08;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }

  var SFX = {
    get on() { return on; },
    tick: function () { var n = performance.now(); if (n - lastTick < 70) return; lastTick = n; tone(1900, 0.03, "square", 0.012); },
    blip: function () { tone(880 + Math.random() * 120, 0.05, "square", 0.02); },
    ok: function () { tone(660, 0.09, "triangle", 0.05); setTimeout(function () { tone(990, 0.12, "triangle", 0.05); }, 80); },
    clash: function () { noise(0.16, 2400, 0.12); tone(180, 0.14, "sawtooth", 0.05, 70); },
    set: function (v) {
      on = !!v; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
      if (on) { ctx(); tone(740, 0.08, "triangle", 0.05); }
      document.dispatchEvent(new CustomEvent("sfx:change", { detail: on }));
    },
    toggle: function () { SFX.set(!on); }
  };
  window.SFX = SFX;
  document.addEventListener("visibilitychange", function () { if (!ac) return; document.hidden ? ac.suspend() : (on && ac.resume()); }); // no audio work in background tabs

  // Hover ticks on interactive things; one delegated listener, only when on.
  document.addEventListener("mouseover", function (e) {
    if (!on) return; var t = e.target && e.target.closest && e.target.closest("a,button,.card,.sk-card,[role=tab]");
    if (t && !t.contains(e.relatedTarget)) SFX.tick();
  }, { passive: true });
  document.addEventListener("keydown", function (e) { if (on && e.target && e.target.id === "vtIn" && e.key.length === 1) SFX.blip(); }, true);
})();
