import { useEffect, useRef, useState } from "react";

export function useMediaQuery(q) {
  const [on, setOn] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), fn = () => setOn(m.matches);
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, [q]);
  return on;
}

// Live presence of an attribute on <html> (the site's Modes set data-theme, data-calm, data-view).
export function useHtmlAttr(name) {
  const [on, setOn] = useState(() => document.documentElement.hasAttribute(name));
  useEffect(() => {
    const r = document.documentElement, mo = new MutationObserver(() => setOn(r.hasAttribute(name)));
    mo.observe(r, { attributes: true, attributeFilter: [name] });
    return () => mo.disconnect();
  }, [name]);
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

export function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// The focused element, looking inside shadow roots (document.activeElement stops at the host).
export function deepActive() {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Keeps Tab inside the overlay, focuses it on open and gives focus back on close.
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current, before = deepActive();
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && n.offsetParent !== null);
    (el.querySelector("[data-autofocus]") || items()[0] || el).focus({ preventScroll: true });
    function onKey(e) {
      if (e.key !== "Tab") return;
      const list = items(), now = el.getRootNode().activeElement;
      if (!list.length) return e.preventDefault();
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && now === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && now === last) { e.preventDefault(); first.focus(); }
    }
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); before?.focus?.({ preventScroll: true }); };
  }, [ref, active]);
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
