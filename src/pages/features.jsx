import { useEffect, useMemo, useRef, useState } from "react";
import { featureAreas, featureCount } from "../data/features";
import { lighthouse } from "../data/portfolioData";
import report from "../data/test-report.json";
import { useApp } from "../lib/app";
import { useCountUp, useInView } from "../lib/hooks";
import { Search, X } from "../components/ui/Icons";
import { mountPage } from "./page";

function Counter({ to, label, start }) {
  const { reduced } = useApp();
  const v = useCountUp(to, start, reduced);
  return (
    <div className="card hairline-top p-5">
      <p className="num text-3xl text-zinc-100 sm:text-4xl">{v.toLocaleString("en-US")}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
}

function AreaCard({ a, items, i }) {
  const [ref, seen] = useInView();
  return (
    <section ref={ref} aria-label={a.area} className={`reveal ${seen ? "in" : ""} card p-5`} style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
      <header className="mb-3 flex items-center gap-3">
        <span className="num rounded-lg bg-c1/10 px-2 py-1 text-[11px] text-c1">{a.code}</span>
        <h2 className="text-base font-semibold">{a.area}</h2>
        <span className="num ml-auto text-xs text-zinc-500">{items.length}</span>
      </header>
      <ul className="grid gap-1">
        {items.map(([name, how, href]) => (
          <li key={name}>
            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener"
              className="group flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-c1/[.07]">
              <span><span className="block text-sm text-zinc-200">{name}</span><span className="block text-xs text-zinc-500">{how}</span></span>
              <span className="mt-0.5 shrink-0 text-xs text-c1 opacity-60 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true">Open →</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Features() {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [statsRef, statsSeen] = useInView();
  const root = useRef(null);
  const k = q.trim().toLowerCase();
  const shown = useMemo(() => featureAreas
    .filter((a) => area === "all" || a.code === area)
    .map((a) => ({ a, items: a.items.filter((it) => !k || `${a.area} ${it[0]} ${it[1]}`.toLowerCase().includes(k)) }))
    .filter((x) => x.items.length), [k, area]);
  const total = shown.reduce((n, x) => n + x.items.length, 0);

  // The page lives in a shadow root, so #tests has to be scrolled to by hand.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) setTimeout(() => root.current?.getRootNode().getElementById(id)?.scrollIntoView(), 50);
  }, []);

  return (
    <div ref={root} className="mx-auto max-w-[1120px] px-4 py-12 sm:py-16">
      <div className="anim-pop grid max-w-[70ch] gap-2.5">
        <p className="eyebrow">All features</p>
        <h1 className="sec-title">Everything this site can do</h1>
        <p className="text-zinc-400">Every feature, grouped, with a link that opens it. Each one is checked by the automated browser tests listed at the bottom.</p>
      </div>

      <div ref={statsRef} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter to={featureCount} label="features" start={statsSeen} />
        <Counter to={featureAreas.length} label="areas" start={statsSeen} />
        <Counter to={report.passed || 0} label="automated checks passing" start={statsSeen} />
        <Counter to={report.suites?.length || 0} label="test suites" start={statsSeen} />
      </div>

      <div className="sticky top-16 z-20 -mx-4 mt-8 bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-md">
        <label className="relative block">
          <span className="sr-only">Search features</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${featureCount} features…`} className="field !rounded-full !py-2 pl-9 pr-9 text-sm" />
          {q && <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:text-zinc-100" aria-label="Clear search"><X size={14} /></button>}
        </label>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Areas">
          {[["all", "All"], ...featureAreas.map((a) => [a.code, a.area])].map(([c, label]) => (
            <button key={c} type="button" aria-pressed={area === c} onClick={() => setArea(c)}
              className={`chip shrink-0 transition active:scale-[.98] ${area === c ? "!border-c1 !text-zinc-100" : "hover:text-zinc-200"}`}>{label}</button>
          ))}
        </div>
        <p className="num mt-2 text-xs text-zinc-500" aria-live="polite">{total} shown</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ a, items }, i) => <AreaCard key={a.code} a={a} items={items} i={i} />)}
      </div>
      {!total && <p className="mt-10 text-center text-sm text-zinc-500">No features match “{q}”.</p>}

      <section id="tests" aria-labelledby="tests-title" className="mt-16 scroll-mt-24">
        <p className="eyebrow">Tests</p>
        <h2 id="tests-title" className="sec-title mt-2">Checked in a real browser</h2>
        <p className="mt-2 max-w-[70ch] text-zinc-400">
          Each suite opens the built site in Chromium and clicks through it: shortcuts, every sandbox, forms, themes, phone widths and errors.
          {report.date && <> Last run {new Date(report.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{report.commit ? ` on ${report.commit}` : ""}.</>}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card overflow-x-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="kicker"><tr><th className="p-3">Suite</th><th className="p-3">Checks</th><th className="p-3">Result</th></tr></thead>
              <tbody>
                {(report.suites || []).map((s) => (
                  <tr key={s.name} className="border-t border-zinc-700">
                    <td className="p-3 text-zinc-200">{s.name}</td>
                    <td className="num p-3 text-zinc-300">{s.passed}/{s.passed + s.failed}</td>
                    <td className={`num p-3 ${s.failed ? "text-rose-400" : "text-emerald-400"}`}>{s.failed ? `${s.failed} failing` : "pass"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4">
            <div className="card p-5">
              <p className="kicker">Scrolling on a slow phone</p>
              <p className="num mt-2 text-2xl text-zinc-100">{report.perf ? `${report.perf.fpsBefore} → ${report.perf.fpsAfter} fps` : "–"}</p>
              <p className="mt-1 text-xs text-zinc-500">{report.perf?.profile}</p>
            </div>
            <div className="card p-5">
              <p className="kicker">Lighthouse ({lighthouse.measured})</p>
              <p className="num mt-2 text-sm text-zinc-300">Performance {lighthouse.performance} · Accessibility {lighthouse.accessibility} · Best practices {lighthouse.bestPractices} · SEO {lighthouse.seo}</p>
            </div>
            <p className="text-xs text-zinc-500">Run them yourself with <code className="num text-c1">npm test</code>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

mountPage("features", <Features />);
