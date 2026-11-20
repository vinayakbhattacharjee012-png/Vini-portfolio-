import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sections, site, contact } from "../../data/portfolioData";
import { useApp } from "../../lib/app";
import { useInterval } from "../../lib/hooks";
import { istTime, scrollToId } from "../../lib/utils";
import { Drawer } from "../ui/Overlay";
import { Emblem, Gauge, Gear, Menu, Search, Terminal } from "../ui/Icons";

const LINKS = sections.filter((s) => s.id !== "home");

// Which section is in the middle of the viewport (scroll-spy).
export function useActiveSection() {
  const [active, setActive] = useState("home");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 1000);
  return (
    <span className="num hidden items-center gap-2 text-[11px] text-zinc-400 xl:inline-flex" aria-label="Developer clock">
      <span><span className="text-zinc-600">IST</span> {istTime(now, contact.timezone)}</span>
      <span className="text-zinc-700">/</span>
      <span><span className="text-zinc-600">UTC</span> {istTime(now, "UTC")}</span>
    </span>
  );
}

export function StatusPill({ className = "" }) {
  return (
    <span className={`items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-1 font-mono text-[10px] tracking-wider text-emerald-300 ${className}`}>
      <span className="dot dot-live !bg-emerald-400 ![box-shadow:0_0_10px_#34d399]" aria-hidden="true" />{site.status}
    </span>
  );
}

export function Navbar() {
  const { open, overlay, close, reduced } = useApp();
  const active = useActiveSection();
  const linksRef = useRef(null);
  const [bar, setBar] = useState({ x: 0, w: 0, on: false });

  // Glide the highlight bar under the active link (transform only).
  useLayoutEffect(() => {
    const a = linksRef.current?.querySelector(`[data-id="${active}"]`);
    if (!a) return setBar((b) => ({ ...b, on: false }));
    setBar({ x: a.offsetLeft, w: a.offsetWidth, on: true });
  }, [active]);

  const go = (id) => (e) => { e.preventDefault(); close(); scrollToId(id, reduced); history.replaceState(null, "", "#" + id); };
  const iconBtn = "grid size-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-c1/50 hover:text-white active:scale-[.98]";

  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3">
      <nav aria-label="Primary" className="glass mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-2xl px-3 sm:px-4">
        <a href="#home" onClick={go("home")} className="flex items-center gap-2 rounded-lg font-semibold text-zinc-100" aria-label="Vini, back to top">
          <Emblem size={30} /><span className="hidden sm:inline">Vini</span>
        </a>
        <StatusPill className="ml-1 hidden lg:inline-flex" />
        <div ref={linksRef} className="relative ml-auto hidden md:flex">
          {LINKS.map((s) => (
            <a key={s.id} data-id={s.id} href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id ? "true" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${active === s.id ? "text-white" : "text-zinc-400 hover:text-zinc-100"}`}>{s.label}</a>
          ))}
          <span aria-hidden="true" className="absolute -bottom-[9px] left-0 h-px w-[100px] origin-left bg-gradient-to-r from-c1 to-c2 shadow-[0_0_12px_var(--c1)] transition-[transform,opacity] duration-300 ease-out-expo"
            style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w / 100})`, opacity: bar.on ? 1 : 0 }} />
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <Clock />
          <button type="button" className={`${iconBtn} hidden sm:grid`} onClick={() => open("palette")} aria-label="Command palette (Ctrl+K)" title="Command palette · Ctrl K"><Search size={16} /></button>
          <button type="button" className={iconBtn} onClick={() => open("telemetry", { tab: "apex" })} aria-label="Command Center telemetry (Alt+T)" title="Command Center · Alt T"><Gauge size={16} /></button>
          <button type="button" className={`${iconBtn} hidden sm:grid`} onClick={() => open("console")} aria-label="Dev console (backtick)" title="Dev console · `"><Terminal size={16} /></button>
          <button type="button" className={iconBtn} onClick={() => open("settings")} aria-label="HUD settings" title="HUD settings"><Gear size={16} /></button>
          <button type="button" className={`${iconBtn} md:hidden`} onClick={() => open("menu")} aria-label="Open menu" aria-expanded={overlay?.name === "menu"}><Menu size={16} /></button>
        </div>
      </nav>
      {overlay?.name === "menu" && (
        <Drawer label="Menu" title="Navigate" onClose={close}>
          <div className="space-y-6 p-5">
            <StatusPill className="inline-flex" />
            <ul className="grid gap-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={go(s.id)} className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-base ${active === s.id ? "border-c1/40 bg-c1/[.06] text-white" : "border-white/[.06] text-zinc-300"}`}>
                    {s.label}<span className="num text-xs text-zinc-600">{s.key}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn min-h-12" onClick={() => open("palette")}><Search size={16} />Search</button>
              <button type="button" className="btn min-h-12" onClick={() => open("console")}><Terminal size={16} />Console</button>
            </div>
          </div>
        </Drawer>
      )}
    </header>
  );
}
