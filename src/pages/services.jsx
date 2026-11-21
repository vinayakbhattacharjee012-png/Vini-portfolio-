import { useRef } from "react";
import { process, services } from "../data/portfolioData";
import { Faq, TimezoneOverlap } from "../components/contact/Contact";
import { Section } from "../components/ui/Section";
import { Arrow, Check } from "../components/ui/Icons";
import { CtaBand, Hero, Reveal, mountPage, useHashScroll } from "./page";

function ServiceCard({ s, i }) {
  return (
    <Reveal delay={(i % 3) * 70} className="h-full">
      <article id={s.id} aria-labelledby={`${s.id}-title`} className="card flex h-full scroll-mt-24 flex-col gap-4 p-6 transition-colors duration-200 hover:border-c1">
        <div className="flex items-center gap-3">
          <span className="num grid size-10 shrink-0 place-items-center rounded-xl bg-c1/10 text-xs text-c1" aria-hidden="true">{s.code}</span>
          <h2 id={`${s.id}-title`} className="text-lg font-semibold leading-snug">{s.title}</h2>
        </div>
        <p className="text-zinc-400">{s.pitch}</p>
        <div>
          <h3 className="kicker mb-2">What you get</h3>
          <ul className="grid gap-1.5 text-sm">
            {s.gets.map((g) => <li key={g} className="flex gap-2 text-zinc-300"><Check size={16} className="mt-0.5 shrink-0 text-c1" />{g}</li>)}
          </ul>
        </div>
        <p className="rounded-xl border border-zinc-700 bg-panel-2 p-3 text-sm text-zinc-400"><span className="kicker mr-1.5 !text-c1">Proof</span>{s.proof}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <a className="btn btn-primary" href={`contact.html?type=${encodeURIComponent(s.type)}`}>Start this project<Arrow size={15} /></a>
          <a className="btn" href={s.link[1]}>{s.link[0]}</a>
        </div>
      </article>
    </Reveal>
  );
}

function Services() {
  const root = useRef(null);
  useHashScroll(root);
  return (
    <div ref={root}>
      <Hero eyebrow="Services" title="What you can hire me for"
        intro="Discord bots, server security, moderation, websites and AI prototypes, football edits and advertising. Each card says what you get and where you can already see it working.">
        <nav aria-label="Services on this page" className="flex flex-wrap gap-1.5 pt-1">
          {services.map((s) => <a key={s.id} href={`#${s.id}`} className="chip transition-colors hover:!border-c1 hover:text-zinc-100">{s.type}</a>)}
        </nav>
      </Hero>
      <div className="mx-auto grid max-w-[1120px] gap-5 px-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => <ServiceCard key={s.id} s={s} i={i} />)}
      </div>
      <section id="process" aria-labelledby="process-title" className="scroll-mt-20 py-10">
        <Section id="process" kicker="How it works" title="From brief to launch in four steps" intro="No sign-ups and no surprises: everything is agreed by email before work starts.">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 80} className="card hairline-top p-5">
                <span className="num text-3xl text-c1" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{p.text}</p>
              </Reveal>
            ))}
          </ol>
        </Section>
      </section>
      <section id="questions" aria-labelledby="questions-title" className="scroll-mt-20 py-10">
        <Section id="questions" kicker="Good to know" title="Before you ask">
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Faq /><div className="grid content-start"><TimezoneOverlap /></div></div>
        </Section>
      </section>
      <CtaBand title="Ready when you are" primary={["Send a brief", "contact.html"]} secondary={["See case studies", "work.html"]} />
    </div>
  );
}

mountPage("services", <Services />);
