import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { categories, projects } from "../../data/portfolioData";
import { useApp } from "../../lib/app";
import { usePointerFx, useVisible } from "../../lib/hooks";
import { Section } from "../ui/Section";
import { Drawer } from "../ui/Overlay";
import { External, Github, Lock, Play, Search, X } from "../ui/Icons";

// Live-looking heart-rate trace for the Apex-Fit spotlight (simulated, pauses off screen).
function Waveform({ reduced }) {
  const box = useRef(null), path = useRef(null);
  const vis = useVisible(box);
  useEffect(() => {
    if (!vis) return;
    let raf, t = 0;
    const draw = () => {
      t += 0.06;
      let d = "";
      for (let x = 0; x <= 120; x++) {
        const k = (x + t * 10) % 30, beat = k < 2 ? -18 : k < 3 ? 22 : k < 4 ? -8 : 0;
        d += `${x ? "L" : "M"}${x * 2.5} ${40 + beat + Math.sin((x + t * 8) / 6) * 3}`;
      }
      path.current.setAttribute("d", d);
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [vis, reduced]);
  return (
    <div ref={box} className="relative overflow-hidden rounded-xl border border-white/[.06] bg-obsidian/70 p-3">
      <div className="num mb-1 flex justify-between text-[10px] text-zinc-500"><span>HR · bpm</span><span className="text-c1">LIVE SIM</span></div>
      <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="h-20 w-full" aria-hidden="true">
        <defs><linearGradient id="wf" x1="0" x2="1"><stop offset="0" stopColor="var(--c2)" stopOpacity=".2" /><stop offset="1" stopColor="var(--c1)" /></linearGradient></defs>
        <path ref={path} fill="none" stroke="url(#wf)" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

const TRIAGE = [
  { q: "Slept 5h, feeling low", out: "Wellness · sleep plan suggested", tone: "text-c1" },
  { q: "Chest pain + short of breath", out: "Red flag · seek emergency care", tone: "text-rose-400" },
  { q: "Hydration routine?", out: "Wellness · routine with reminders", tone: "text-c1" },
];
function TriagePreview() {
  const [i, setI] = useState(0);
  return (
    <div className="rounded-xl border border-white/[.06] bg-obsidian/70 p-3">
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Sample check-ins">
        {TRIAGE.map((t, k) => (
          <button key={t.q} type="button" onClick={() => setI(k)} aria-pressed={i === k}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition active:scale-[.98] ${i === k ? "border-c1/50 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}>{t.q}</button>
        ))}
      </div>
      <p className="num text-[11px] text-zinc-500">intake → guardrails → triage</p>
      <p key={i} className={`anim-fade num mt-1 text-xs ${TRIAGE[i].tone}`} aria-live="polite">{TRIAGE[i].out}</p>
    </div>
  );
}

function ProjectCard({ p, onTech, big }) {
  const { open, reduced } = useApp();
  const fx = usePointerFx(reduced);
  return (
    <article ref={fx} className={`card spot tilt group flex flex-col p-5 sm:p-6 ${big ? "md:col-span-1" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="kicker">{categories.find((c) => c.id === p.category)?.label}</span>
        <span className="num inline-flex items-center gap-1.5 text-[11px] text-zinc-400"><i className={`dot ${p.status === "Live" ? "dot-live" : "opacity-60"}`} aria-hidden="true" />{p.status}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{p.name}</h3>
      <p className="mt-1.5 text-sm text-zinc-400">{p.summary}</p>
      {p.featured === "waveform" && <div className="mt-4"><Waveform reduced={reduced} /></div>}
      {p.featured === "triage" && <div className="mt-4"><TriagePreview /></div>}
      <ul className="num mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500" aria-label="Key metrics">
        {p.metrics.slice(0, 3).map((m) => <li key={m}><span className="text-c1">◆</span> {m}</li>)}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech stack (click to filter)">
        {p.stack.map((s) => <li key={s}><button type="button" onClick={() => onTech(s)} className="chip transition hover:border-c2/50 hover:text-zinc-100 active:scale-[.98]">{s}</button></li>)}
      </ul>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" className="btn h-9 px-3 text-xs" onClick={() => (p.sandbox ? open("telemetry", { tab: p.sandbox }) : open("project", { id: p.id }))}>
          <Play size={14} />{p.sandbox ? "Live simulated sandbox" : "Live topology"}
        </button>
        {p.repo
          ? <a className="btn h-9 px-3 text-xs" href={p.repo} target="_blank" rel="noopener"><Github size={14} />Source repository</a>
          : <a className="btn h-9 px-3 text-xs text-zinc-400" href={`#contact`} onClick={() => window.dispatchEvent(new CustomEvent("vini:ask", { detail: p.name }))} title="This repository is private"><Lock size={14} />Private · ask for access</a>}
        {p.live && <a className="btn h-9 px-3 text-xs" href={p.live} target="_blank" rel="noopener"><External size={14} />Live</a>}
        <button type="button" className="ml-auto text-xs text-c1 underline-offset-4 hover:underline" onClick={() => open("project", { id: p.id })}>Deep dive →</button>
      </div>
    </article>
  );
}

export function Projects() {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const tabs = useRef(null);
  const [pill, setPill] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const b = tabs.current?.querySelector(`[data-cat="${cat}"]`);
    if (b) setPill({ x: b.offsetLeft, w: b.offsetWidth });
  }, [cat]);
  useEffect(() => {
    // A skill card's "show builds" sends its name here.
    const fn = (e) => { setCat("all"); setQ(e.detail); };
    addEventListener("vini:filter-builds", fn);
    return () => removeEventListener("vini:filter-builds", fn);
  }, []);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return projects.filter((p) => (cat === "all" || p.category === cat) &&
      (!k || [p.name, p.summary, ...p.stack, ...p.metrics].join(" ").toLowerCase().includes(k)));
  }, [cat, q]);
  const onTech = (s) => { setCat("all"); setQ(s); };

  return (
    <Section id="builds" n="02" kicker="Flagship builds" title="Projects with proof attached" intro="Each build has a deep dive, and most have a live simulated sandbox you can poke. Click a tech pill to filter by it.">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div ref={tabs} role="tablist" aria-label="Project categories" className="relative flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/[.08] bg-white/[.02] p-1">
          <span aria-hidden="true" className="absolute inset-y-1 left-0 w-[100px] origin-left rounded-full bg-c1/15 ring-1 ring-c1/40 transition-transform duration-300 ease-out-expo"
            style={{ transform: `translateX(${pill.x}px) scaleX(${pill.w / 100})` }} />
          {categories.map((c) => (
            <button key={c.id} data-cat={c.id} role="tab" aria-selected={cat === c.id} type="button" onClick={() => setCat(c.id)}
              className={`relative z-10 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${cat === c.id ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}>{c.label}</button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search builds by name, stack or feature</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by stack or feature…" className="field !rounded-full !py-2 pl-9 pr-9 text-sm" />
          {q && <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:text-white" aria-label="Clear filter"><X size={14} /></button>}
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{list.length} builds shown</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {list.map((p) => <ProjectCard key={p.id} p={p} onTech={onTech} big={!!p.featured} />)}
      </div>
      {list.length === 0 && <p className="mt-10 text-center text-sm text-zinc-500">No builds match “{q}”. <button type="button" className="text-c1 underline" onClick={() => { setQ(""); setCat("all"); }}>Reset filters</button></p>}
    </Section>
  );
}

// Client → Edge → Engine → State with data packets flowing along the links.
function Topology({ nodes }) {
  return (
    <svg viewBox="0 0 640 120" className="w-full" role="img" aria-label={`Data flow: ${nodes.join(" to ")}`}>
      {nodes.map((n, i) => {
        const x = 20 + i * 160;
        return (
          <g key={n}>
            {i < nodes.length - 1 && <line x1={x + 120} y1="60" x2={x + 160} y2="60" stroke="var(--c1)" strokeOpacity=".7" strokeWidth="1.5" className="flow-dash" />}
            <rect x={x} y="30" width="120" height="60" rx="12" fill="#0b0e15" stroke={i === 2 ? "var(--c2)" : "rgb(255 255 255 / .14)"} />
            <text x={x + 60} y="54" textAnchor="middle" fill="#71717a" fontSize="10" fontFamily="var(--font-mono)">{["CLIENT", "EDGE", "ENGINE", "STATE"][i]}</text>
            <text x={x + 60} y="72" textAnchor="middle" fill="#e4e4e7" fontSize="11">{n.length > 18 ? n.slice(0, 17) + "…" : n}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ProjectDrawer({ id }) {
  const { close, open } = useApp();
  const p = projects.find((x) => x.id === id);
  if (!p) return null;
  const steps = [["Problem", p.problem], ["System design", p.design]];
  return (
    <Drawer title={`${p.name} · architecture deep dive`} onClose={close} wide>
      <div className="space-y-8 p-5 sm:p-7">
        <p className="text-zinc-400">{p.summary}</p>
        <div className="card p-4"><p className="kicker mb-3">Topology · live data flow</p><Topology nodes={p.topology} /></div>
        <ol className="grid gap-4">
          {steps.map(([k, v], i) => (
            <li key={k} className="card p-5"><p className="kicker"><span className="text-c1">0{i + 1}</span> / {k}</p><p className="mt-2 text-zinc-300">{v}</p></li>
          ))}
          <li className="card p-5"><p className="kicker"><span className="text-c1">03</span> / Stack</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">{p.stack.map((s) => <li key={s} className="chip">{s}</li>)}</ul></li>
          <li className="card p-5"><p className="kicker"><span className="text-c1">04</span> / Outcomes</p>
            <ul className="mt-3 grid gap-2 text-sm text-zinc-300">{p.outcomes.map((o) => <li key={o} className="flex gap-2"><span className="text-c1">✓</span>{o}</li>)}</ul></li>
        </ol>
        <div className="flex flex-wrap gap-2">
          {p.sandbox && <button type="button" className="btn btn-primary" onClick={() => open("telemetry", { tab: p.sandbox })}><Play size={15} />Open live sandbox</button>}
          {p.repo && <a className="btn" href={p.repo} target="_blank" rel="noopener"><Github size={15} />Source repository</a>}
          {p.live && <a className="btn" href={p.live} target="_blank" rel="noopener"><External size={15} />Open live build</a>}
        </div>
      </div>
    </Drawer>
  );
}
