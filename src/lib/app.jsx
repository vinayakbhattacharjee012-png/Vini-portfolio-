import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "./hooks";
import { copyText } from "./utils";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export const ACCENTS = {
  dual: { label: "Dual Holo", c1: "#06b6d4", c2: "#8b5cf6" },
  cyan: { label: "Pure Cyan Overload", c1: "#06b6d4", c2: "#22d3ee" },
  violet: { label: "Cyber Violet", c1: "#8b5cf6", c2: "#c084fc" },
  emerald: { label: "Stealth Emerald", c1: "#10b981", c2: "#34d399" },
};

const KEY = "vini:prefs";
const DEFAULTS = { accent: "dual", reduced: false, grid: 35 };
function loadPrefs() {
  try {
    const p = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    if (!ACCENTS[p.accent]) p.accent = DEFAULTS.accent;
    p.grid = Math.min(100, Math.max(0, Number(p.grid) || 0));
    p.reduced = !!p.reduced;
    return p;
  } catch { return DEFAULTS; }
}

function favicon({ c1, c2 }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#06070a"/><path d="M14 16h10l8 22 8-22h10L36 50h-8z" fill="url(#g)"/><circle cx="32" cy="12" r="3" fill="${c1}"/></svg>`;
  let link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  if (link) link.href = "data:image/svg+xml," + encodeURIComponent(svg);
}

// Overlays deep-link through the hash: #/build/<id>, #/telemetry/<tab>, #/console, #/palette.
function parseHash() {
  const [, kind, arg] = location.hash.match(/^#\/([a-z]+)(?:\/([\w-]+))?/) || [];
  if (kind === "build" && arg) return { name: "project", id: arg };
  if (kind === "telemetry") return { name: "telemetry", tab: arg || "apex" };
  if (kind === "console" || kind === "palette" || kind === "settings" || kind === "qr") return { name: kind };
  return null;
}
function hashFor(o) {
  if (!o) return "";
  if (o.name === "project") return `#/build/${o.id}`;
  if (o.name === "telemetry") return `#/telemetry/${o.tab || "apex"}`;
  if (["console", "palette", "settings", "qr"].includes(o.name)) return `#/${o.name}`;
  return "";
}

export function AppProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [overlay, setOverlay] = useState(parseHash);
  const [toastState, setToast] = useState(null);
  const sysReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const reduced = prefs.reduced || sysReduced;
  const timer = useRef();

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.accent = prefs.accent;
    r.dataset.motion = prefs.reduced ? "reduced" : "full";
    r.style.setProperty("--grid", String(prefs.grid / 100));
    favicon(ACCENTS[prefs.accent]);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode: prefs just don't persist */ }
  }, [prefs]);

  // Keep the address bar in sync so any open overlay can be shared or refreshed.
  useEffect(() => {
    const want = hashFor(overlay), base = location.pathname + location.search;
    const isOverlayHash = /^#\//.test(location.hash);
    if (want && location.hash !== want) history.replaceState(null, "", base + want);
    else if (!want && isOverlayHash) history.replaceState(null, "", base);
  }, [overlay]);
  useEffect(() => {
    const fn = () => { const o = parseHash(); if (o) setOverlay(o); };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);

  const setPref = useCallback((k, v) => setPrefs((p) => ({ ...p, [k]: v })), []);
  const toast = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  const open = useCallback((name, payload = {}) => setOverlay({ name, ...payload }), []);
  const close = useCallback(() => setOverlay(null), []);
  const copy = useCallback(async (text, label) => { toast((await copyText(text)) ? `${label} copied to clipboard` : `${label}: ${text}`); }, [toast]);
  const [sweep, setSweep] = useState(0); // easter-egg diagnostic sweep counter

  const value = useMemo(() => ({ prefs, setPref, reduced, overlay, open, close, toast, toastState, copy, sweep, setSweep }),
    [prefs, setPref, reduced, overlay, open, close, toast, toastState, copy, sweep]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
