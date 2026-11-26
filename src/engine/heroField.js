/* Hero particle field: dust that assembles into a large "V" around the orbit, scatters from the
   pointer, bursts on click or tap, breathes while idle, and blows apart as you scroll away.
   One Gov loop ("hero-field"), parked when the hero is off screen or another view is open.
   Lite and reduced motion get a static V, drawn once. Colour follows the theme via ACC. */
(function () {
  "use strict";
  var hero = document.querySelector(".hero"), orbit = hero && hero.querySelector(".orbit");
  if (!hero || !orbit || !window.Gov) return;
  var root = document.documentElement, body = document.body;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cv = document.createElement("canvas");
  cv.className = "hero-field"; cv.setAttribute("aria-hidden", "true");
  hero.insertBefore(cv, hero.firstChild);
  var ctx = cv.getContext("2d");

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, P = [], vis = true;
  var mx = -1e4, my = -1e4, scrollP = 0;

  function layout() {
    var hr = hero.getBoundingClientRect(), or = orbit.getBoundingClientRect();
    if (!hr.width || !or.width) return false;
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = hr.width; H = hr.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx = or.left - hr.left + or.width / 2; cy = or.top - hr.top + or.height / 2;
    var S = or.width * 1.3, half = S / 2, thick = S * 0.17, n = W < 700 ? 420 : 900;
    var tl = [cx - half, cy - S * 0.46], tr = [cx + half, cy - S * 0.46], b = [cx, cy + S * 0.5];
    var keep = P.length === n;
    for (var i = 0; i < n; i++) {
      var tx, ty;
      if (i % 7 === 0) { tx = Math.random() * W; ty = Math.random() * H; } // loose dust across the hero
      else {
        var a = i % 2 ? tl : tr, t = Math.random(), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        var off = (Math.random() - 0.5) * thick;
        tx = a[0] + dx * t + (-dy / len) * off; ty = a[1] + dy * t + (dx / len) * off;
      }
      if (keep) { P[i].tx = tx; P[i].ty = ty; }
      else P[i] = { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, tx: tx, ty: ty, ph: Math.random() * 6.28, r: 0.7 + Math.random() * 1.1 };
    }
    P.length = n;
    return true;
  }

  function draw(now, alpha) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(" + (window.ACC ? ACC.s.rgb : "43, 47, 56") + "," + alpha + ")";
    for (var i = 0; i < P.length; i++) { var p = P[i], s = p.r * 2; ctx.fillRect(p.x - p.r, p.y - p.r, s, s); }
  }

  function step(now, dt) {
    var k = dt * 60, spread = 1 + scrollP * 2.4, R = 120, R2 = R * R;
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      var tx = cx + (p.tx - cx) * spread + Math.sin(now * 0.0011 + p.ph) * 2.2;
      var ty = cy + (p.ty - cy) * spread + Math.cos(now * 0.0009 + p.ph) * 2.2;
      p.vx += (tx - p.x) * 0.012 * k; p.vy += (ty - p.y) * 0.012 * k;
      var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) { var d = Math.sqrt(d2), f = (1 - d / R) * 2.4 * k; p.vx += dx / d * f; p.vy += dy / d * f; }
      var damp = Math.pow(0.86, k); p.vx *= damp; p.vy *= damp;
      p.x += p.vx * k; p.y += p.vy * k;
    }
    draw(now, 0.55 * (1 - scrollP * 0.7));
  }

  function settleStatic() { for (var i = 0; i < P.length; i++) { P[i].x = P[i].tx; P[i].y = P[i].ty; } draw(0, 0.45); }
  var still = function () { return reduce || root.classList.contains("lite"); };

  var loop = Gov.loop("hero-field", step, { fps: 40, liteFps: 1, when: function () { return vis && !still() && !body.classList.contains("route-view"); } });

  function start() { if (!layout()) return; if (still()) settleStatic(); else loop.start(); }

  hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
  hero.addEventListener("pointerleave", function () { mx = my = -1e4; }, { passive: true });
  hero.addEventListener("pointerdown", function (e) {
    if (still()) return;
    var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = 0; i < P.length; i++) { var p = P[i], dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1; if (d < 260) { var f = (1 - d / 260) * 26; p.vx += dx / d * f; p.vy += dy / d * f; } }
  }, { passive: true });
  window.addEventListener("scroll", function () { scrollP = Math.min(1, Math.max(0, window.scrollY / (H || 1))); }, { passive: true });

  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }).observe(hero);
  if ("ResizeObserver" in window) { var rt = 0; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(start, 150); }).observe(hero); }
  // Re-tint the static V when the theme or the performance mode changes.
  new MutationObserver(function () { if (still() && P.length) settleStatic(); else if (vis) loop.start(); }).observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  start();
})();
