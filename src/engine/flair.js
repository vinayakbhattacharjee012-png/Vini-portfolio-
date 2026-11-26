/* Pointer flair: 3D tilt + spotlight on cards, magnetic call-to-action buttons, and section
   headings that decode into place the first time they appear.
   Uses the individual `rotate` / `translate` properties so it composes with the scroll animations
   (which animate `transform`). Mouse/trackpad only; off on Lite and reduced motion. No loops. */
(function () {
  "use strict";
  var root = document.documentElement;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function off() { return reduce || root.classList.contains("lite"); }

  // One style write per frame, however fast pointer events arrive.
  var pending = new Map(), raf = 0;
  function write(el, fn) { pending.set(el, fn); if (!raf) raf = requestAnimationFrame(function () { raf = 0; pending.forEach(function (f) { f(); }); pending.clear(); }); }

  if (fine) {
    root.classList.add("flair-on");
    document.querySelectorAll(".card:not(.holo), .tcard, .sk-card").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (off()) return;
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        write(el, function () {
          el.style.rotate = (0.5 - y).toFixed(3) + " " + (x - 0.5).toFixed(3) + " 0 " + (Math.hypot(x - 0.5, y - 0.5) * 9).toFixed(2) + "deg";
          el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        });
      }, { passive: true });
      el.addEventListener("pointerleave", function () { write(el, function () { el.style.rotate = ""; el.style.removeProperty("--mx"); el.style.removeProperty("--my"); }); }, { passive: true });
    });

    document.querySelectorAll(".cta").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (off()) return;
        var r = el.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height;
        write(el, function () { el.style.translate = (dx * 10).toFixed(1) + "px " + (dy * 8).toFixed(1) + "px"; });
      }, { passive: true });
      el.addEventListener("pointerleave", function () { write(el, function () { el.style.translate = ""; }); }, { passive: true });
    });
  }

  // Headings decode once. Only plain-text h2s, so links and markup inside headings are never touched.
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";
  function decode(h) {
    var final = h.textContent, start = performance.now(), dur = 650;
    h.setAttribute("aria-label", final);
    (function tick(now) {
      var t = Math.min(1, (now - start) / dur), shown = Math.floor(final.length * t), out = final.slice(0, shown);
      for (var i = shown; i < final.length; i++) out += final[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      h.textContent = out;
      if (t < 1) requestAnimationFrame(tick); else { h.textContent = final; h.removeAttribute("aria-label"); }
    })(start);
  }
  if (!off() && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); if (!off()) decode(e.target); } });
    }, { threshold: 0.6 });
    document.querySelectorAll("main h2").forEach(function (h) { if (!h.children.length && h.textContent.trim()) io.observe(h); });
  }
})();
