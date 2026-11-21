/* Background music: a light rock loop synthesized live with Web Audio. No audio files, no samples, no network.
   Off by default (browsers block autoplay with sound). Toggle: the Music button, Alt+Shift+M, Ctrl+K, or `music` in the terminal.
   C - G - Am - F at 100 BPM: soft drums, a steady bass, strummed guitar-ish chords and a small lead line. */
(function () {
  "use strict";
  var BPM = 100, STEP = 60 / BPM / 2;                       // one eighth note
  var ROOT = [48, 43, 45, 41], TYPE = [[0, 4, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]]; // C G Am F
  var SCALE = [72, 74, 76, 79, 81, 84];                      // C major pentatonic, upper octave
  var LEAD = [[2, -1, 3, -1, 4, -1, 3, 2], [3, -1, 2, -1, 1, -1, 2, -1], [4, -1, -1, 3, 2, -1, 1, -1], [0, -1, 1, 2, -1, 2, -1, -1]]; // scale index per step, -1 = rest
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function noiseBuf(ac) { var n = ac.sampleRate * 0.5, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), i, s = 1; for (i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 1073741823) - 1; } return b; }

  // one eighth-note step; ctx and dest are passed in so the same code drives live playback and the offline self-test
  function play(ac, dest, nb, i, t) {
    var s = i % 8, bar = Math.floor(i / 8) % 4, root = ROOT[bar], iv = TYPE[bar], k;
    function env(g, t0, a, d, v) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
    function tone(type, f, t0, dur, v, cut, det) {
      var o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
      lp.type = "lowpass"; lp.frequency.value = cut; env(g, t0, 0.008, dur, v);
      o.connect(lp); lp.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(t0, dur, v, type, f) {
      var src = ac.createBufferSource(), g = ac.createGain(), bf = ac.createBiquadFilter(); src.buffer = nb; bf.type = type; bf.frequency.value = f; env(g, t0, 0.002, dur, v);
      src.connect(bf); bf.connect(g); g.connect(dest); src.start(t0, 0, dur + 0.05);
    }
    // drums: kick on 1, the "and" of 2 and 3; snare on 2 and 4; soft eighth hats
    if (s === 0 || s === 3 || s === 4) { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.004, 0.16, 0.55); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); }
    if (s === 2 || s === 6) { noise(t, 0.16, 0.28, "bandpass", 1900); tone("triangle", 190, t, 0.09, 0.12, 900); }
    noise(t, 0.04, s % 2 ? 0.05 : 0.09, "highpass", 7500);
    // bass: root eighths, octave hop on the last step of each bar
    tone("triangle", hz(root + (s === 7 ? 0 : -12)), t, STEP * 0.95, 0.22, 700);
    // guitar: strummed chord on 1, 2, 3 and 4 (steps 0, 2, 4, 6) with a lazy spread
    if (s % 2 === 0) for (k = 0; k < iv.length + 1; k++) { var m = root + 12 + (iv[k] === undefined ? 12 : iv[k]); tone("sawtooth", hz(m), t + k * 0.014, STEP * 3.2, s === 0 ? 0.05 : 0.036, 2300, -7); tone("sawtooth", hz(m), t + k * 0.014, STEP * 3.2, s === 0 ? 0.05 : 0.036, 2300, 7); }
    // lead: a small phrase every other pass through the progression
    var li = LEAD[bar][s]; if (li >= 0 && Math.floor(i / 32) % 2 === 1) tone("triangle", hz(SCALE[li]), t, STEP * 1.6, 0.11, 3200);
  }

  var ac = null, master = null, nb = null, timer = 0, next = 0, step = 0, on = false;
  function ensure() {
    if (ac) return true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = 0;
    var comp = ac.createDynamicsCompressor(), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
    master.connect(lp); lp.connect(comp); comp.connect(ac.destination); nb = noiseBuf(ac); return true;
  }
  function pump() { while (next < ac.currentTime + 0.3) { play(ac, master, nb, step, next); next += STEP; step++; } }
  function start() {
    if (on || !ensure()) return false; on = true; ac.resume();
    next = ac.currentTime + 0.08; step = 0; pump(); timer = setInterval(pump, 60);
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0.45, ac.currentTime + 1.5); // soft fade-in
    try { localStorage.setItem("music", "on"); } catch (e) {} document.dispatchEvent(new CustomEvent("music:change", { detail: true })); return true;
  }
  function stop() {
    if (!on) return; on = false; clearInterval(timer); timer = 0;
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
    setTimeout(function () { if (!on && ac) ac.suspend(); }, 800);
    try { localStorage.setItem("music", "off"); } catch (e) {} document.dispatchEvent(new CustomEvent("music:change", { detail: false }));
  }
  // no work in background tabs
  document.addEventListener("visibilitychange", function () { if (!ac || !on) return; if (document.hidden) { clearInterval(timer); timer = 0; ac.suspend(); } else { ac.resume(); next = ac.currentTime + 0.05; if (!timer) timer = setInterval(pump, 60); } });
  window.Music = {
    get on() { return on; }, start: start, stop: stop, toggle: function () { on ? stop() : start(); },
    // offline render for tests: returns peak and rms of N seconds of the loop
    selfTest: function (secs) {
      var oc = new OfflineAudioContext(1, 44100 * secs, 44100), m = oc.createGain(); m.gain.value = 0.45; m.connect(oc.destination); var b = noiseBuf(oc), n = Math.ceil(secs / STEP), i;
      for (i = 0; i < n; i++) play(oc, m, b, i, i * STEP);
      return oc.startRendering().then(function (buf) { var d = buf.getChannelData(0), pk = 0, sum = 0, j; for (j = 0; j < d.length; j++) { var a = Math.abs(d[j]); if (a > pk) pk = a; sum += d[j] * d[j]; } return { peak: +pk.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) }; });
    }
  };
})();
