import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHtmlAttr, useMediaQuery } from "./hooks";
import { copyText } from "./utils";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Overlays deep-link through the hash: #/telemetry/<tab>, #/qr. (The page's own routes use #resume, #sim-…)
function parseHash() {
  const [, kind, arg] = location.hash.match(/^#\/([a-z]+)(?:\/([\w-]+))?/) || [];
  if (kind === "telemetry") return { name: "telemetry", tab: arg || "apex" };
  if (kind === "qr") return { name: "qr" };
  return null;
}
const hashFor = (o) => (!o ? "" : o.name === "telemetry" ? `#/telemetry/${o.tab || "apex"}` : o.name === "qr" ? "#/qr" : "");

export function AppProvider({ children }) {
  const [overlay, setOverlay] = useState(parseHash);
  const [sweep, setSweep] = useState(0); // Konami / sudo hack diagnostic sweep
  // The site's own Calm mode (data-calm) or the OS setting both mean reduced motion.
  const sysReduced = useMediaQuery("(prefers-reduced-motion: reduce)"), calm = useHtmlAttr("data-calm");
  const reduced = sysReduced || calm;
  const timer = useRef();

  useEffect(() => {
    const want = hashFor(overlay), base = location.pathname + location.search;
    if (want && location.hash !== want) history.replaceState(null, "", base + want);
    else if (!want && /^#\//.test(location.hash)) history.replaceState(null, "", base);
  }, [overlay]);
  useEffect(() => {
    const fn = () => { const o = parseHash(); if (o) setOverlay(o); };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);

  // Same toast element and timing the rest of the site uses.
  const toast = useCallback((msg) => {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg; el.classList.add("show");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => el.classList.remove("show"), 2600);
  }, []);
  const open = useCallback((name, payload = {}) => setOverlay({ name, ...payload }), []);
  const close = useCallback(() => setOverlay(null), []);
  const copy = useCallback(async (text, label) => { toast((await copyText(text)) ? `${label} copied` : `${label}: ${text}`); }, [toast]);

  const value = useMemo(() => ({ reduced, overlay, open, close, toast, copy, sweep, setSweep }), [reduced, overlay, open, close, toast, copy, sweep]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
