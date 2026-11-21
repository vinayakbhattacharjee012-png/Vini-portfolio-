import { useEffect, useRef, useState } from "react";
import { useApp } from "../../lib/app";

// Konami code / `sudo hack` → a harmless scanline "diagnostic sweep" across the screen.
export function Sweep() {
  const { sweep } = useApp();
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOn(true);
    const t = setTimeout(() => setOn(false), 1800);
    return () => clearTimeout(t);
  }, [sweep]);
  if (!on) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-c1/25 to-transparent" style={{ animation: "sweep 1.6s var(--ease) both" }} />
      <div className="anim-pop absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-c1/40 bg-panel px-4 py-2 font-mono text-xs text-c1">DIAGNOSTIC SWEEP · ALL SYSTEMS NOMINAL</div>
    </div>
  );
}
