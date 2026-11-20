import { useEffect, useRef, useState } from "react";

export function useMediaQuery(q) {
  const [on, setOn] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), fn = () => setOn(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [q]);
  return on;
}

// One-shot: true once the element has entered the viewport, then the observer disconnects.
export function useInView(opts = { rootMargin: "0px 0px -10% 0px" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, opts);
    io.observe(el);
    return () => io.disconnect();
  }, [seen]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, seen];
}

// Live visibility (for pausing loops when off screen).
export function useVisible(ref) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return vis;
}

export function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Keeps Tab inside the overlay, focuses it on open and gives focus back on close.
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current, before = document.activeElement;
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && (n.offsetParent !== null || n === document.activeElement));
    (el.querySelector("[data-autofocus]") || items()[0] || el).focus({ preventScroll: true });
    function onKey(e) {
      if (e.key !== "Tab" || e.target.closest("[data-tab-local]")) return; // inputs that use Tab themselves
      const list = items();
      if (!list.length) return e.preventDefault();
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); if (before && before.focus) before.focus({ preventScroll: true }); };
  }, [ref, active]);
}

// Card tilt + border spotlight that follow the pointer (fine pointers only, off when motion is reduced).
export function usePointerFx(reduced) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    function move(e) {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
        el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
      });
    }
    function leave() { cancelAnimationFrame(raf); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [reduced]);
  return ref;
}

// Pulls an element a few pixels toward the cursor.
export function useMagnetic(reduced, strength = 0.25) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    function move(e) {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    }
    function leave() { el.style.transform = ""; }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [reduced, strength]);
  return ref;
}

// Counts from 0 to `to` once `start` is true.
export function useCountUp(to, start, reduced, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) return setV(to);
    let raf, t0;
    const step = (t) => {
      t0 ??= t;
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, start, reduced, ms]);
  return v;
}
