import { useRef } from "react";
import { devEnv, lessons, principles, timeline } from "../data/portfolioData";
import { Section } from "../components/ui/Section";
import { Arrow } from "../components/ui/Icons";
import { CtaBand, Hero, Reveal, mountPage, useHashScroll } from "./page";

// Built only from the timeline, principles, lessons and setup already on the homepage.
function Story() {
  const root = useRef(null);
  useHashScroll(root);
  return (
    <div ref={root}>
      <Hero eyebrow="Background story" title="How the work got built"
        intro="How one moderator became a builder of Discord bots, security grids and AI prototypes. The chapters are what happened, and the lessons are the ones that became rules.">
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn btn-primary !h-11 !px-5" href="#chapters">Read the chapters<Arrow size={16} /></a>
          <a className="btn !h-11 !px-5" href="work.html">See the work</a>
        </div>
      </Hero>

      <section id="chapters" aria-labelledby="chapters-title" className="scroll-mt-20 py-10">
        <Section id="chapters" kicker="Chapters" title="From moderator to builder" intro="Read top to bottom. Each step is something that shipped or was run in a live community.">
          <ol className="grid gap-5 border-l border-zinc-700 pl-6">
            {timeline.map((c, i) => (
              <Reveal as="li" key={c.title} delay={(i % 3) * 60} className="relative">
                <span aria-hidden="true" className="absolute -left-[31px] top-6 size-3 rounded-full bg-c1 shadow-[0_0_12px_var(--c1)]" />
                <article className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs text-c1">{String(i + 1).padStart(2, "0")}</span>
                    <span className="chip">{c.tag}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
                  <p className="mt-1 text-zinc-400">{c.detail}</p>
                </article>
              </Reveal>
            ))}
          </ol>
        </Section>
      </section>

      <section id="principles" aria-labelledby="principles-title" className="scroll-mt-20 py-10">
        <Section id="principles" kicker="How I decide" title="Three principles" intro="These shape every build, from a bot command to a landing page.">
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 70} className="card hairline-top p-6">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-zinc-400">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </Section>
      </section>

      <section id="lessons" aria-labelledby="lessons-title" className="scroll-mt-20 py-10">
        <Section id="lessons" kicker="Lessons" title="What went wrong, and the rule it became" intro="Each rule came from a real failure or a near miss.">
          <ul className="grid gap-4 sm:grid-cols-2">
            {lessons.map((l, i) => (
              <Reveal as="li" key={l.title} delay={(i % 2) * 70} className="card p-5">
                <h3 className="font-semibold">{l.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{l.text}</p>
              </Reveal>
            ))}
          </ul>
        </Section>
      </section>

      <section id="setup" aria-labelledby="setup-title" className="scroll-mt-20 py-10">
        <Section id="setup" kicker="The setup" title="What it's built on" intro="Everything here runs on a single laptop.">
          <ul className="flex flex-wrap gap-2">
            {devEnv.map((d) => <li key={d} className="chip !text-sm">{d}</li>)}
          </ul>
        </Section>
      </section>

      <CtaBand title="Want to be part of the next chapter?" text="Send a short brief, or see what's been built so far."
        primary={["Start a project", "contact.html"]} secondary={["See the work", "work.html"]} />
    </div>
  );
}

mountPage("story", <Story />);
