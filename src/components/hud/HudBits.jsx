import { useEffect, useRef, useState } from "react";
import { sections } from "../../data/portfolioData";
import { useApp } from "../../lib/app";
import { useMagnetic } from "../../lib/hooks";
import { ArrowUp } from "../ui/Icons";

// Shared scroll ratio, read once per frame.
function useScroll() {
  const [s, setS] = useState({ y: 0, p: 0 });
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setS({ y: scrollY, p: max > 0 ? scrollY / max : 0 });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return s;
}

export function ScrollProgress() {
  const { p } = useScroll();
  return <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-c1 via-c2 to-c1 shadow-[0_0_10px_var(--c1)]" style={{ transform: `scaleX(${p})` }} />;
}

export function BackToTop() {
  const { y } = useScroll();
  const { reduced } = useApp();
  const ref = useMagnetic(reduced, 0.3);
  const show = y > 400;
  return (
    <div className={`fixed bottom-5 right-4 z-30 transition-[opacity,transform] duration-300 ease-out-expo sm:right-6 ${show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
      <button ref={ref} type="button" tabIndex={show ? 0 : -1} aria-hidden={!show} onClick={() => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
        className="group glass grid size-12 place-items-center rounded-full border-c1/30 text-c1 shadow-[0_0_24px_-6px_var(--c1)] transition-[transform,border-color] duration-200 ease-out-expo hover:border-c1/70 active:scale-[.98]" aria-label="Back to top">
        <ArrowUp size={18} />
        <span aria-hidden="true" className="absolute -bottom-1 h-2 w-3 rounded-full bg-c2/60 blur-[3px] transition-opacity group-hover:opacity-100 opacity-40" />
      </button>
    </div>
  );
}

// Corner telemetry: which module you're in and how far down the page you are.
export function CornerHud({ active }) {
  const { p } = useScroll();
  const label = (sections.find((s) => s.id === active) || sections[0]).label.toLowerCase();
  return (
    <div aria-hidden="true" className="num pointer-events-none fixed bottom-5 left-4 z-30 hidden rounded-full border border-white/[.07] bg-obsidian/70 px-3 py-1.5 text-[11px] text-zinc-500 backdrop-blur-md sm:block">
      <span className="text-zinc-600">~/vini/</span><span className="text-c1">{label}</span>
      <span className="mx-2 text-zinc-700">│</span>{String(Math.round(p * 100)).padStart(3, " ")}%
    </div>
  );
}

// Konami code → harmless "diagnostic sweep" scanline across the screen.
export function DiagnosticSweep() {
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
      <div className="anim-pop absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-c1/40 bg-obsidian/80 px-4 py-2 font-mono text-xs text-c1">DIAGNOSTIC SWEEP · ALL SYSTEMS NOMINAL</div>
    </div>
  );
}
