import { contact, process, services } from "../data/portfolioData";
import { Faq, InquiryForm, TimezoneOverlap } from "../components/contact/Contact";
import { useApp } from "../lib/app";
import { Copy, Discord, External, Github, Mail } from "../components/ui/Icons";
import { Hero, Reveal, mountPage } from "./page";

const TYPES = services.map((s) => s.type);
const asked = new URLSearchParams(location.search).get("type");
const NEEDS = [["Bots", "a Discord bot or verification flow"], ["Moderation", "help with a server or raid defence"], ["Edits", "football highlights or soundtracks"], ["Ads", "placement, timing and budget in INR or crypto"]];

function Direct() {
  const { copy } = useApp();
  const lines = [
    [Mail, "Email", contact.email, [["Copy", () => copy(contact.email, "Email")], ["Write", `mailto:${contact.email}`]]],
    [Discord, "Discord", contact.discord, [["Copy handle", () => copy(contact.discord, "Discord handle")]]],
    [Discord, "Community", "Galaxy Empire", [["Join", contact.discordServer]]],
    [Github, "Code", "GitHub", [["Open", contact.github]]],
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr]" aria-label="Direct lines">
      {lines.map(([Icon, label, value, actions], i) => (
        <Reveal as="li" key={label} delay={i * 60} className="card flex flex-col gap-3 p-5">
          <span className="flex items-center gap-2 text-c1"><Icon size={18} /><span className="kicker">{label}</span></span>
          <span className="num text-sm text-zinc-100 [overflow-wrap:anywhere]">{value}</span>
          <span className="mt-auto flex flex-wrap gap-2">
            {actions.map(([t, act]) => typeof act === "string"
              ? <a key={t} className="btn !h-9 !px-3.5" href={act} {...(act.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{t}{act.startsWith("http") && <External size={14} />}</a>
              : <button key={t} type="button" className="btn !h-9 !px-3.5" onClick={act}><Copy size={14} />{t}</button>)}
          </span>
        </Reveal>
      ))}
    </ul>
  );
}

function Hire() {
  return (
    <>
      <Hero eyebrow="Hire me" title="Let's build something"
        intro="For projects, collaborations, moderation roles or ads. Send a brief and you get a reference number, or reach me directly." />
      <div className="mx-auto max-w-[1120px] px-4 py-10">
        <Direct />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <InquiryForm types={TYPES} initialType={TYPES.includes(asked) ? asked : ""} />
          <div className="grid content-start gap-5">
            <div className="card p-5">
              <p className="kicker mb-3">Useful to include</p>
              <ul className="grid gap-2 text-sm">
                {NEEDS.map(([b, t]) => <li key={b} className="flex items-baseline gap-2"><span className="chip shrink-0 !py-0.5">{b}</span><span className="text-zinc-400">{t}</span></li>)}
              </ul>
            </div>
            <div className="card p-5">
              <p className="kicker mb-3">What happens next</p>
              <ol className="grid gap-2 text-sm">
                {process.map((p, i) => <li key={p.title} className="flex gap-3"><span className="num text-c1">{String(i + 1).padStart(2, "0")}</span><span><span className="text-zinc-100">{p.title}.</span> <span className="text-zinc-400">{p.text}</span></span></li>)}
              </ol>
            </div>
            <TimezoneOverlap />
          </div>
        </div>
        <div className="mt-12 max-w-[760px]"><Faq /></div>
      </div>
    </>
  );
}

mountPage("contact", <Hire />);
