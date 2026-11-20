import { useEffect, useRef } from "react";

// Neural-mesh particles that lean toward the cursor. Pauses off screen, in background tabs
// and when motion is reduced (one still frame is drawn instead).
export default function NeuralMesh({ reduced }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d"), host = cv.parentElement;
    let w = 0, h = 0, nodes = [], raf = 0, visible = true, ptr = null, col = { a: "#06b6d4", b: "#8b5cf6" }, rt;
    const readCols = () => {
      const cs = getComputedStyle(document.documentElement);
      col = { a: cs.getPropertyValue("--c1").trim() || col.a, b: cs.getPropertyValue("--c2").trim() || col.b };
    };
    function size() {
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(w < 640 ? 40 : 85, (w * h) / 15000));
      nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.3 + 0.5, a: Math.random() < 0.55 }));
    }
    function frame(move) {
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        if (move) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          if (ptr) { const dx = ptr.x - p.x, dy = ptr.y - p.y, d = Math.hypot(dx, dy); if (d < 170 && d > 1) { p.x += (dx / d) * 0.35; p.y += (dy / d) * 0.35; } }
        }
      }
      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d2 > 13000) continue;
          ctx.globalAlpha = (1 - d2 / 13000) * 0.32;
          ctx.strokeStyle = a.a ? col.a : col.b;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const p of nodes) { ctx.globalAlpha = 0.85; ctx.fillStyle = p.a ? col.a : col.b; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    function loop() { raf = 0; if (!visible || document.hidden || reduced) return; frame(true); raf = requestAnimationFrame(loop); }
    function start() { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop); }

    readCols(); size(); frame(false); start();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(cv);
    const mo = new MutationObserver(() => { readCols(); if (!raf) frame(false); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent"] });
    const onMove = (e) => { const r = cv.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { ptr = null; };
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { size(); frame(false); }, 150); };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", start);
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(rt); io.disconnect(); mo.disconnect();
      host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", start); removeEventListener("resize", onResize);
    };
  }, [reduced]);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_80%_70%_at_60%_40%,#000_30%,transparent_80%)]" />;
}
