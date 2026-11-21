import { useRef } from "react";
import { contact, galaxy } from "../data/portfolioData";
import { Section } from "../components/ui/Section";
import { Arrow, External } from "../components/ui/Icons";
import { CtaBand, Hero, Reveal, Stats, mountPage, useHashScroll } from "./page";

const [HUB, ...ORBIT] = galaxy.brands;
const SPOTS = [[70, 64], [330, 64], [70, 256], [330, 256]];
const ROLES = [
  ["Head Administrator", "Owned Galaxy network hubs"],
  ["Senior Moderator", "Fruity Blox · Blox Fruits community · 40,000 members"],
  ["Junior Moderator", "Roblox community server · 90,000 members", contact.robloxServer],
];
const RINGS = [["Anti-nuke", "Wick, Bravers, Security Bot, Krypton"], ["Automod & logging", "Dyno, Carl-bot, Sapphire"], ["Containment", "JailBot holds problem accounts"], ["Vault Account", "Server ownership that never moderates"]];

// The network as a small star map: Galaxy Empire in the middle, the other four brands around it.
function NetworkMap() {
  return (
    <svg viewBox="0 0 400 320" role="img" aria-label={`Network map: ${HUB.name} at the centre, linked to ${ORBIT.map((b) => b.name).join(", ")}.`} className="w-full max-w-[460px]">
      <circle cx="200" cy="160" r="118" fill="none" stroke="var(--line)" strokeDasharray="2 7" className="orbit" />
      {SPOTS.map(([x, y], i) => <line key={i} x1="200" y1="160" x2={x} y2={y} stroke="var(--c1)" strokeOpacity=".45" strokeDasharray="3 6" className="flow" />)}
      <circle cx="200" cy="160" r="34" fill="color-mix(in srgb, var(--c1) 14%, var(--surface))" stroke="var(--c1)" />
      <circle cx="200" cy="160" r="34" fill="none" stroke="var(--c1)" className="pulse" />
      <text x="200" y="156" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="600">Galaxy</text>
      <text x="200" y="171" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="600">Empire</text>
      {ORBIT.map((b, i) => {
        const [x, y] = SPOTS[i];
        return (
          <g key={b.name}>
            <circle cx={x} cy={y} r="9" fill="var(--c2)" fillOpacity=".25" stroke="var(--c2)" />
            <circle cx={x} cy={y} r="3" fill="var(--c2)" />
            <text x={x} y={y + (y < 160 ? -16 : 26)} textAnchor="middle" fill="var(--muted)" fontSize="12.5">{b.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Galaxy() {
  const root = useRef(null);
  useHashScroll(root);
  return (
    <div ref={root}>
      <Hero eyebrow="Galaxy network" title="Five community brands, one network"
        intro={`I founded the Galaxy network: ${galaxy.brands.map((b) => b.name).join(", ").replace(/, ([^,]*)$/, " and $1")}. Shared staff, shared security and its own advertising arm.`}>
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn btn-primary !h-11 !px-5" href={contact.discordServer} target="_blank" rel="noopener">Join Galaxy Empire<External size={16} /></a>
          <a className="btn !h-11 !px-5" href="#advertise">Advertise with us</a>
        </div>
      </Hero>
      <div className="mx-auto max-w-[1120px] px-4 py-10">
        <Stats items={[["1.5k–2k", "members"], [galaxy.brands.length, "community brands"], [galaxy.treaties.length, "treaties"], ["8", "security bots"]]} />
      </div>

      <section id="brands" aria-labelledby="brands-title" className="scroll-mt-20 py-10">
        <Section id="brands" kicker="The network" title="Who's in it" intro="Galaxy Empire is the main hub; the other brands sit around it and share staff, security and partners.">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="card grid place-items-center p-4"><NetworkMap /></div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {galaxy.brands.map((b, i) => (
                <Reveal as="li" key={b.name} delay={i * 60} className={`card p-4 ${i === 0 ? "hairline-top sm:col-span-2" : ""}`}>
                  <p className="font-semibold text-zinc-100">{b.name}</p>
                  <p className="text-sm text-zinc-400">{b.note}</p>
                  {b.href && <a className="mt-2 inline-flex items-center gap-1.5 text-sm text-c1 hover:underline" href={b.href} target="_blank" rel="noopener">Join on Discord<External size={14} /></a>}
                </Reveal>
              ))}
            </ul>
          </div>
        </Section>
      </section>

      <section id="treaties" aria-labelledby="treaties-title" className="scroll-mt-20 py-10">
        <Section id="treaties" kicker="Agreements" title="How it's held together" intro="The network grew through written agreements, not just invites.">
          <div className="grid gap-4 md:grid-cols-2">
            {galaxy.treaties.map((t, i) => (
              <Reveal key={t.title} delay={i * 80} className="card p-6">
                <p className="kicker !text-c1">{i ? "Treaty" : "Charter"}</p>
                <h3 className="mt-2 text-lg font-semibold">{t.title}</h3>
                <p className="mt-1 text-zinc-400">{t.text}</p>
              </Reveal>
            ))}
          </div>
        </Section>
      </section>

      <section id="team" aria-labelledby="team-title" className="scroll-mt-20 py-10">
        <Section id="team" kicker="Run & protected" title="Moderated at scale, guarded in four rings">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-6">
              <p className="kicker mb-3">My roles</p>
              <ul className="grid gap-3">
                {ROLES.map(([r, where, href]) => (
                  <li key={r} className="border-l-2 border-c1 pl-3">
                    <p className="font-semibold text-zinc-100">{r}</p>
                    <p className="text-sm text-zinc-400">{href ? <a className="hover:text-c1 hover:underline" href={href} target="_blank" rel="noopener">{where} ↗</a> : where}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <p className="kicker mb-3">Security grid</p>
              <ol className="grid gap-2">
                {RINGS.map(([r, d], i) => (
                  <li key={r} className="flex items-start gap-3">
                    <span className="num grid size-7 shrink-0 place-items-center rounded-full border border-c1 text-xs text-c1">{i + 1}</span>
                    <span><span className="block text-sm font-medium text-zinc-100">{r}</span><span className="block text-sm text-zinc-400">{d}</span></span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn" href="work.html#security">Security case study<Arrow size={15} /></a>
                <a className="btn" href="./#security">Run the raid simulator</a>
              </div>
            </div>
          </div>
        </Section>
      </section>

      <section id="advertise" aria-labelledby="advertise-title" className="scroll-mt-20 py-10">
        <Section id="advertise" kicker="Galaxy Ad Solutions" title="Advertise across the network"
          intro="Put your server, brand or project in front of 1.5k–2k members across five communities. Rates on request; pay in INR or crypto.">
          <div className="grid gap-4 md:grid-cols-3">
            {galaxy.adOptions.map((o, i) => (
              <Reveal key={o.title} delay={i * 70} className="card hairline-top p-6">
                <h3 className="text-lg font-semibold">{o.title}</h3>
                <p className="mt-1 text-zinc-400">{o.text}</p>
                <p className="num mt-3 text-xs text-zinc-500">Rate on request</p>
              </Reveal>
            ))}
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How an ad goes live">
            {galaxy.adSteps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-2xl border border-zinc-700 p-4">
                <span className="num text-xl text-c1" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><span className="text-sm text-zinc-300">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-primary !h-11 !px-5" href="contact.html?type=Advertising">Send an ad enquiry<Arrow size={16} /></a>
            <a className="btn !h-11 !px-5" href="./#advertise">Use the ad form on the portfolio</a>
          </div>
        </Section>
      </section>

      <CtaBand title="Want this for your own community?" text="I set up the same security, moderation and bots for other servers. Send a brief and say what your community needs."
        secondary={["Join Galaxy Empire ↗", contact.discordServer]} />
    </div>
  );
}

mountPage("galaxy", <Galaxy />);
