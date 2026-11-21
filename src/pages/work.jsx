import { useRef, useState } from "react";
import { caseStudies } from "../data/portfolioData";
import { Arrow, External } from "../components/ui/Icons";
import { CtaBand, Hero, Reveal, Stats, mountPage, useHashScroll } from "./page";

const TAGS = ["All", ...new Set(caseStudies.map((c) => c.tag))];
const LIVE = /live|running|in use/i;

function CaseStudy({ c }) {
  const live = LIVE.test(c.status);
  return (
    <Reveal as="article" id={c.id} aria-labelledby={`${c.id}-title`} className="card scroll-mt-24 p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{c.tag}</span>
            <span className={`chip ${live ? "!text-emerald-400" : ""}`}><span className={`dot ${live ? "dot-live !bg-emerald-400" : "!bg-zinc-500 !shadow-none"}`} aria-hidden="true" />{c.status}</span>
          </div>
          <h2 id={`${c.id}-title`} className="text-2xl font-bold tracking-tight">{c.title}</h2>
          <p className="kicker">{c.role}</p>
          {!!c.stats.length && <dl className="mt-1 grid grid-cols-2 gap-2">
            {c.stats.map(([v, l]) => (
              <div key={l} className="flex flex-col-reverse rounded-xl border border-zinc-700 bg-panel-2 p-3">
                <dt className="text-xs text-zinc-500">{l}</dt><dd className="num text-lg text-zinc-100">{v}</dd>
              </div>
            ))}
          </dl>}
        </div>
        <div className="grid content-start gap-5">
          {[["The problem", c.challenge], ["What I built", c.approach], ["Where it stands", c.result]].map(([h, t], k) => (
            <div key={h} className={`grid gap-1.5 border-l-2 pl-4 ${k === 2 ? "border-c1" : "border-zinc-700"}`}>
              <h3 className="kicker">{h}</h3>
              <p className="text-zinc-300">{t}</p>
            </div>
          ))}
          <ul className="flex flex-wrap gap-1.5" aria-label="Tools">{c.stack.map((s) => <li key={s} className="chip">{s}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            {c.links.map(([label, href], k) => {
              const out = href.startsWith("http");
              return <a key={href} href={href} target={out ? "_blank" : undefined} rel={out ? "noopener" : undefined} className={`btn ${k === 0 ? "btn-primary" : ""}`}>{label}{out ? <External size={15} /> : <Arrow size={15} />}</a>;
            })}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function Work() {
  const [tag, setTag] = useState("All");
  const root = useRef(null);
  useHashScroll(root);
  const shown = caseStudies.filter((c) => tag === "All" || c.tag === tag);
  return (
    <div ref={root}>
      <Hero eyebrow="Case studies" title="Work that's live, in use, or on the way"
        intro="Communities, security, bots, websites and AI. For each project: the problem, what I built, and where it stands today.">
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn btn-primary !h-11 !px-5" href="contact.html">Start a project<Arrow size={16} /></a>
          <a className="btn !h-11 !px-5" href="services.html">What I offer</a>
        </div>
      </Hero>
      <div className="mx-auto max-w-[1120px] px-4">
        <div className="py-10">
          <Stats items={[[caseStudies.length, "case studies"], ["90,000", "largest community moderated"], ["8", "security bots in the grid"], ["31", "slash commands in Eclipse"]]} />
        </div>
        <div role="group" aria-label="Filter case studies" className="flex gap-1.5 overflow-x-auto pb-1">
          {TAGS.map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)}
              className={`chip shrink-0 transition active:scale-[.98] ${tag === t ? "!border-c1 !text-zinc-100" : "hover:text-zinc-200"}`}>{t}</button>
          ))}
        </div>
        <p className="num mt-2 text-xs text-zinc-500" aria-live="polite">{shown.length} of {caseStudies.length} shown</p>
        <div className="mt-6 grid gap-5">{shown.map((c) => <CaseStudy key={c.id} c={c} />)}</div>
      </div>
      <CtaBand title="Want something like this?" />
    </div>
  );
}

mountPage("work", <Work />);
