import { useState } from "react";
import { community, devEnv, lessons, media, principles, roadmap, stats, timeline } from "../../data/portfolioData";
import { activity } from "../../data/generated";
import { useApp } from "../../lib/app";
import { useCountUp, useInView } from "../../lib/hooks";
import { Section } from "../ui/Section";
import { Chevron } from "../ui/Icons";

function Stat({ s, start }) {
  const { reduced } = useApp();
  const v = useCountUp(s.value, start, reduced);
  return (
    <div className="card hairline-top p-5">
      <p className="num text-3xl text-zinc-50 md:text-4xl">{s.prefix}{v.toLocaleString("en-US")}{s.suffix}</p>
      <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
    </div>
  );
}

function Timeline() {
  const [open, setOpen] = useState(timeline.length - 1);
  return (
    <ol className="relative grid gap-2 border-l border-white/[.08] pl-5">
      {timeline.map((t, i) => (
        <li key={t.title} className="relative">
          <span aria-hidden="true" className={`absolute -left-[25px] top-3 size-2.5 rounded-full border ${open === i ? "border-c1 bg-c1 shadow-[0_0_10px_var(--c1)]" : "border-white/30 bg-obsidian"}`} />
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 rounded-lg py-2 text-left text-sm text-zinc-200 hover:text-white">
            <span><span className="num mr-2 text-[10px] uppercase tracking-wider text-c1">{t.tag}</span>{t.title}</span>
            <Chevron size={16} className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="anim-fade pb-2 text-sm text-zinc-400">{t.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

function Heatmap() {
  const weeks = [];
  for (let i = 0; i < activity.days.length; i += 7) weeks.push(activity.days.slice(i, i + 7));
  const max = Math.max(1, ...activity.days.map((d) => d[1]));
  const shade = (n) => (n === 0 ? "rgb(255 255 255 / .05)" : `color-mix(in srgb, var(--c1) ${25 + Math.round((n / max) * 75)}%, transparent)`);
  return (
    <div>
      <svg viewBox={`0 0 ${weeks.length * 12} ${7 * 12}`} className="w-full" role="img" aria-label={`${activity.total} commits to the ${activity.repo} repository in the last 26 weeks`}>
        {weeks.map((w, x) => w.map(([day, n], y) => <rect key={day} x={x * 12} y={y * 12} width="10" height="10" rx="2" fill={shade(n)}><title>{`${day}: ${n} commit${n === 1 ? "" : "s"}`}</title></rect>))}
      </svg>
      <p className="num mt-2 text-[11px] text-zinc-500">{activity.total} commits · {activity.repo} repo · last 26 weeks</p>
    </div>
  );
}

function Lesson({ l }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`w-full rounded-xl border p-3 text-left transition active:scale-[.98] ${open ? "border-c2/40 bg-c2/[.05]" : "border-white/[.07] hover:border-white/15"}`}>
        <span className="flex items-center justify-between gap-2 text-sm font-medium text-zinc-100">{l.title}<Chevron size={15} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} /></span>
        {open && <span className="anim-fade mt-1.5 block text-sm text-zinc-400">{l.text}</span>}
      </button>
    </li>
  );
}

export function Impact() {
  const [ref, seen] = useInView();
  const box = "card p-5 sm:p-6";
  return (
    <Section id="impact" n="05" kicker="Metrics, milestones & impact" title="What the work adds up to" intro="Numbers, the path so far, and what's being built next.">
      <div ref={ref} className="grid gap-4 sm:grid-cols-3">{stats.map((s) => <Stat key={s.label} s={s} start={seen} />)}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        <div className={`${box} md:col-span-4`}>
          <p className="kicker text-c1">Community leadership</p>
          <h3 className="mt-2 text-lg font-semibold">{community.title}</h3>
          <p className="mt-2 text-sm text-zinc-400">{community.text}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">{community.points.map((p) => <li key={p} className="chip">{p}</li>)}</ul>
        </div>
        <div className={`${box} md:col-span-2`}>
          <p className="kicker text-c2">Creative</p>
          <h3 className="mt-2 text-lg font-semibold">{media.title}</h3>
          <p className="mt-2 text-sm text-zinc-400">{media.text}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">{media.tags.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
        </div>
        <div className={`${box} md:col-span-3`}><p className="kicker mb-4">Build timeline</p><Timeline /></div>
        <div className={`${box} md:col-span-3`}>
          <p className="kicker mb-4">Currently building / next up</p>
          <ul className="grid gap-4">
            {roadmap.map((r) => (
              <li key={r.name}>
                <div className="flex justify-between text-sm"><span className="text-zinc-200">{r.name}</span><span className="num text-xs text-zinc-500">{r.stage}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]" role="progressbar" aria-label={`${r.name} progress`} aria-valuenow={r.progress} aria-valuemin="0" aria-valuemax="100">
                  <div className="h-full origin-left rounded-full bg-gradient-to-r from-c1 to-c2 transition-transform duration-700 ease-out-expo" style={{ transform: `scaleX(${seen ? r.progress / 100 : 0})` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 kicker mb-3">Commit activity</p>
          <Heatmap />
        </div>
        <div className={`${box} md:col-span-4`}>
          <p className="kicker mb-4">Engineering principles</p>
          <ol className="grid gap-3 sm:grid-cols-3">{principles.map((p, i) => <li key={p.title}><p className="num text-xs text-c1">0{i + 1}</p><p className="mt-1 font-medium text-zinc-100">{p.title}</p><p className="mt-1 text-sm text-zinc-400">{p.text}</p></li>)}</ol>
        </div>
        <div className={`${box} md:col-span-2`}>
          <p className="kicker mb-4">Dev environment</p>
          <ul className="flex flex-wrap gap-1.5">{devEnv.map((d) => <li key={d} className="chip">{d}</li>)}</ul>
          <p className="mt-4 text-xs text-zinc-500">Lightweight on purpose: if it runs on a modest laptop, it runs anywhere.</p>
        </div>
        <div className={`${box} md:col-span-6`}>
          <p className="kicker mb-4">Lessons learned · tap to expand</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{lessons.map((l) => <Lesson key={l.title} l={l} />)}</ul>
        </div>
      </div>
    </Section>
  );
}
