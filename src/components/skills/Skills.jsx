import { useEffect, useRef, useState } from "react";
import { projects, skillTabs, skills, synergies } from "../../data/portfolioData";
import { useApp } from "../../lib/app";
import { scrollToId } from "../../lib/utils";
import { Section } from "../ui/Section";
import { Copy, Grid, Search, Tabs, X } from "../ui/Icons";

const TIER = { Core: 5, Production: 4, Prototyping: 3 };
const TIER_STYLE = { Core: "border-c1/40 text-c1", Production: "border-c2/40 text-c2", Prototyping: "border-white/15 text-zinc-400" };

function SkillCard({ s, dim, selected, onSelect }) {
  const { reduced } = useApp();
  const used = projects.filter((p) => s.projects.includes(p.id));
  const sid = "sk-" + s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <li data-skill={s.name} className={`relative transition-opacity duration-200 ${dim ? "opacity-30" : ""}`}>
      <button type="button" onClick={onSelect} aria-expanded={selected} aria-controls={selected ? sid : undefined}
        className={`group card w-full p-4 text-left transition-[border-color,transform] duration-200 ease-out-expo hover:border-white/20 active:scale-[.98] ${selected ? "!border-c1/50" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-zinc-100">{s.name}</span>
          <span className={`num shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${TIER_STYLE[s.tier]}`}>{s.tier}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{s.use}</p>
        {/* Mastery bar shows on hover/focus only, so the grid stays calm at rest. */}
        <div className="mt-3 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" aria-label={`Mastery ${TIER[s.tier]} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`h-1 flex-1 rounded-full ${i <= TIER[s.tier] ? "bg-gradient-to-r from-c1 to-c2" : "bg-white/10"}`} />)}
        </div>
      </button>
      {selected && (
        <div id={sid} className="anim-pop absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-c1/30 bg-panel p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,.9)]">
          <p className="kicker mb-2">Projects using this skill</p>
          <ul className="grid gap-1 text-sm">{used.map((p) => <li key={p.id} className="text-zinc-200">· {p.name}</li>)}</ul>
          <button type="button" className="mt-3 text-xs text-c1 hover:underline" onClick={() => { window.dispatchEvent(new CustomEvent("vini:filter-builds", { detail: s.name })); scrollToId("builds", reduced); }}>Show these builds →</button>
        </div>
      )}
    </li>
  );
}

export function Skills() {
  const { copy } = useApp();
  const [tab, setTab] = useState(skillTabs[0].id);
  const [view, setView] = useState("tabs");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const tabRefs = useRef([]);
  useEffect(() => {
    // The command palette can jump to a skill.
    const fn = (e) => { const s = skills.find((x) => x.name === e.detail); if (s) { setView("tabs"); setTab(s.tab); setQ(s.name); setSel(s.name); } };
    addEventListener("vini:skill", fn);
    return () => removeEventListener("vini:skill", fn);
  }, []);
  useEffect(() => {
    if (!sel) return;
    const off = (e) => { if (e.target.closest?.("[data-skill]")?.dataset.skill !== sel) setSel(null); };
    const esc = (e) => { if (e.key === "Escape") setSel(null); };
    document.addEventListener("pointerdown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [sel]);

  const k = q.trim().toLowerCase();
  const match = (s) => !k || `${s.name} ${s.use} ${s.tier}`.toLowerCase().includes(k);
  function onTabKey(e, i) {
    const n = skillTabs.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (to == null) return;
    e.preventDefault(); setTab(skillTabs[to].id); tabRefs.current[to]?.focus();
  }
  const grid = (list) => (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s) => <SkillCard key={s.name} s={s} dim={!match(s)} selected={sel === s.name} onSelect={() => setSel(sel === s.name ? null : s.name)} />)}
    </ul>
  );
  const stackJson = () => JSON.stringify(Object.fromEntries(skillTabs.map((t) => [t.label, skills.filter((s) => s.tab === t.id).map(({ name, tier, use }) => ({ name, tier, use }))])), null, 2);

  return (
    <Section id="skills" n="03" kicker="Skills architecture" title="A stack you can scan in seconds" intro="Five areas, three tiers. Click any skill to see the builds that use it.">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-72">
          <span className="sr-only">Highlight skills</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Highlight a skill…" className="field !rounded-full !py-2 pl-9 pr-9 text-sm" />
          {q && <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:text-white" aria-label="Clear highlight"><X size={14} /></button>}
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-white/[.08] p-1" role="group" aria-label="Layout">
            <button type="button" aria-pressed={view === "tabs"} onClick={() => setView("tabs")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "tabs" ? "bg-c1/15 text-white" : "text-zinc-400"}`}><Tabs size={14} />Tabbed</button>
            <button type="button" aria-pressed={view === "matrix"} onClick={() => setView("matrix")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "matrix" ? "bg-c1/15 text-white" : "text-zinc-400"}`}><Grid size={14} />Matrix</button>
          </div>
          <button type="button" className="btn h-9 px-3 text-xs" onClick={() => copy(stackJson(), "Stack JSON")}><Copy size={14} />Copy stack JSON</button>
        </div>
      </div>

      {view === "tabs" ? (
        <div className="mt-6">
          <div role="tablist" aria-label="Skill categories" className="flex gap-1 overflow-x-auto border-b border-white/[.06]">
            {skillTabs.map((t, i) => (
              <button key={t.id} ref={(el) => (tabRefs.current[i] = el)} role="tab" id={`tab-${t.id}`} aria-controls="skill-panel" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1}
                type="button" onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}
                className={`relative -mb-px whitespace-nowrap border-b px-3 py-3 text-sm transition-colors ${tab === t.id ? "border-c1 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}>{t.label}</button>
            ))}
          </div>
          <div id="skill-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-6" key={tab}>
            <div className="anim-fade">{grid(skills.filter((s) => s.tab === tab))}</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {skillTabs.map((t) => <div key={t.id}><p className="kicker mb-3">{t.label}</p>{grid(skills.filter((s) => s.tab === t.id))}</div>)}
        </div>
      )}

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {synergies.map((s) => (
          <div key={s.title} className="card hairline-top p-5">
            <p className="kicker text-c2">Stack synergy</p>
            <p className="mt-2 font-medium text-zinc-100">{s.title}</p>
            <p className="mt-1.5 text-sm text-zinc-400">{s.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
