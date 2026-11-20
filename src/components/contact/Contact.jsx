import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { contact, faq, principles, projects, projectTypes, sections, site, skillTabs, skills } from "../../data/portfolioData";
import { useApp } from "../../lib/app";
import { useInterval } from "../../lib/hooks";
import { hourIn, refId, scrollToId } from "../../lib/utils";
import { Section } from "../ui/Section";
import { Check, Copy, Discord, Download, Github, Mail, Share } from "../ui/Icons";
import { sharePortfolio } from "../hud/CommandPalette";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Tell me your name (2+ characters).";
  if (!EMAIL.test(f.email.trim())) e.email = "That email doesn't look right.";
  if (!f.type) e.type = "Pick a project type.";
  if (f.message.trim().length < 20) e.message = `A little more detail please (${Math.max(0, 20 - f.message.trim().length)} more characters).`;
  return e;
}
const mailto = (f, ref) => `mailto:${contact.email}?subject=${encodeURIComponent(`[${f.type || "Build"}] ${f.name} · ${ref}`)}&body=${encodeURIComponent(`${f.message}\n\n— ${f.name} (${f.email})\nRef: ${ref}`)}`;

function InquiryForm() {
  const [f, setF] = useState({ name: "", email: "", type: "", message: "" });
  const [touched, setTouched] = useState({});
  const [state, setState] = useState({ step: "edit" });
  const msgRef = useRef(null);
  const errs = validate(f);
  const show = (k) => (touched[k] || state.step === "tried") && errs[k];
  useEffect(() => {
    // "Private · ask for access" on a project card prefills the brief.
    const fn = (e) => { setF((x) => ({ ...x, type: x.type || "Web App", message: `Hi Vini, I'd like to see the source for ${e.detail}. ` })); setTimeout(() => msgRef.current?.focus({ preventScroll: true }), 400); };
    addEventListener("vini:ask", fn);
    return () => removeEventListener("vini:ask", fn);
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (Object.keys(errs).length) { setState({ step: "tried" }); return; }
    const ref = refId();
    setState({ step: "sending", ref });
    let sent = false;
    try {
      const body = new URLSearchParams({ "form-name": "inquiry", ...f, ref }).toString();
      const r = await fetch(location.pathname, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      sent = r.ok;
    } catch { sent = false; }
    setState({ step: "done", ref, sent });
  }

  if (state.step === "done") {
    return (
      <div className="anim-pop card hairline-top grid gap-4 border-c1/30 p-6" role="status">
        <p className="kicker text-c1">{state.sent ? "Message transmitted" : "Ready to send"}</p>
        <p className="text-lg font-semibold text-zinc-100">{state.sent ? "Got it. I'll reply by email." : "The form service didn't answer, so send it by email instead."}</p>
        <dl className="num grid grid-cols-2 gap-3 text-xs">
          <div><dt className="text-zinc-500">Reference</dt><dd className="text-zinc-100">{state.ref}</dd></div>
          <div><dt className="text-zinc-500">Type</dt><dd className="text-zinc-100">{f.type}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <a className={state.sent ? "btn" : "btn btn-primary"} href={mailto(f, state.ref)}><Mail size={15} />{state.sent ? "Also open in my email app" : "Send via email"}</a>
          <button type="button" className="btn" onClick={() => { setF({ name: "", email: "", type: "", message: "" }); setTouched({}); setState({ step: "edit" }); }}>New message</button>
        </div>
      </div>
    );
  }
  const err = (k) => show(k) && <p id={`err-${k}`} className="mt-1.5 text-xs text-rose-300">{errs[k]}</p>;
  const ok = (k) => touched[k] && !errs[k] && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />;
  return (
    <form name="inquiry" noValidate onSubmit={submit} className="card grid gap-4 p-5 sm:p-6">
      <p className="kicker">Start a build / collaborate</p>
      <fieldset>
        <legend className="mb-2 text-sm text-zinc-300">What are we building?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby={show("type") ? "err-type" : undefined}>
          {projectTypes.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={f.type === t} onClick={() => { setF({ ...f, type: t }); setTouched({ ...touched, type: true }); }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition active:scale-[.98] ${f.type === t ? "border-c1/60 bg-c1/10 text-white" : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}>{t}</button>
          ))}
        </div>
        {err("type")}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {[["name", "Your name", "text", "name"], ["email", "Email", "email", "email"]].map(([k, label, type, ac]) => (
          <div key={k}>
            <label htmlFor={`f-${k}`} className="mb-1.5 block text-sm text-zinc-300">{label}</label>
            <div className="relative">
              <input id={`f-${k}`} name={k} type={type} autoComplete={ac} value={f[k]} onChange={set(k)} onBlur={() => setTouched({ ...touched, [k]: true })}
                aria-invalid={!!show(k)} aria-describedby={show(k) ? `err-${k}` : undefined} className="field pr-9" />
              {ok(k)}
            </div>
            {err(k)}
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="f-message" className="mb-1.5 block text-sm text-zinc-300">Brief</label>
        <textarea id="f-message" ref={msgRef} name="message" rows="4" value={f.message} onChange={set("message")} onBlur={() => setTouched({ ...touched, message: true })}
          aria-invalid={!!show("message")} aria-describedby={show("message") ? "err-message" : undefined} className="field resize-y" placeholder="Goal, timeline, links…" />
        {err("message")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary h-11 px-5" disabled={state.step === "sending"}>{state.step === "sending" ? "Transmitting…" : "Transmit brief"}</button>
        <span className="text-xs text-zinc-500">No account, no tracking. Falls back to email if the form service is offline.</span>
      </div>
    </form>
  );
}

function TimezoneOverlap() {
  const [, tick] = useState(0);
  useInterval(() => tick((x) => x + 1), 60000);
  const { start, end, label } = contact.availability;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "your time";
  const shift = hourIn(tz) - hourIn(contact.timezone); // visitor hours minus IST hours
  const norm = (h) => ((h % 24) + 24) % 24;
  const ls = norm(start + shift), le = norm(end + shift), now = hourIn(tz), ist = hourIn(contact.timezone);
  const live = ist >= start && ist < end;
  const fmt = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  const segs = ls < le ? [[ls, le]] : [[ls, 24], [0, le]];
  return (
    <div className="card p-5">
      <p className="kicker mb-3">Collaboration window</p>
      <p className="text-sm text-zinc-300">{label}: <span className="num text-zinc-100">{fmt(start)}–{fmt(end)} IST</span></p>
      <p className="mt-1 text-sm text-zinc-400">That's <span className="num text-c1">{fmt(ls)}–{fmt(le)}</span> in {tz}.</p>
      <div className="relative mt-4 h-3 rounded-full bg-white/[.06]" role="img" aria-label={`Availability in your time zone: ${fmt(ls)} to ${fmt(le)}. It is ${fmt(now)} now.`}>
        {segs.map(([a, b]) => <span key={a} className="absolute inset-y-0 rounded-full bg-gradient-to-r from-c1/70 to-c2/70" style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` }} />)}
        <span className="absolute -top-1 h-5 w-0.5 rounded bg-white" style={{ left: `${(now / 24) * 100}%` }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] text-zinc-600"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      <p className={`num mt-3 text-xs ${live ? "text-emerald-400" : "text-zinc-500"}`}>{live ? "● Inside the window right now" : "○ Outside the window right now. Email anyway; I reply when I'm back."}</p>
    </div>
  );
}

export function Dossier() {
  return createPortal(
    <article id="dossier" aria-hidden="true">
      <h1 style={{ fontSize: "22pt", margin: 0 }}>{site.name} · developer dossier</h1>
      <p style={{ margin: "4pt 0 10pt", color: "#555" }}>{site.roles.join(" · ")}<br />{contact.email} · Discord {contact.discord} · {site.url}</p>
      <p>{site.summary}</p>
      <h2 style={{ fontSize: "13pt", borderBottom: "1px solid #ccc", marginTop: "14pt" }}>Builds</h2>
      {projects.map((p) => <p key={p.id} style={{ margin: "6pt 0" }}><b>{p.name}</b> ({p.status}) · {p.summary}<br /><span style={{ color: "#555" }}>{p.stack.join(", ")}{p.repo ? ` · ${p.repo}` : ""}</span></p>)}
      <h2 style={{ fontSize: "13pt", borderBottom: "1px solid #ccc", marginTop: "14pt" }}>Skills</h2>
      {skillTabs.map((t) => <p key={t.id} style={{ margin: "4pt 0" }}><b>{t.label}:</b> {skills.filter((s) => s.tab === t.id).map((s) => `${s.name} (${s.tier})`).join(", ")}</p>)}
      <h2 style={{ fontSize: "13pt", borderBottom: "1px solid #ccc", marginTop: "14pt" }}>Principles</h2>
      {principles.map((p) => <p key={p.title} style={{ margin: "4pt 0" }}><b>{p.title}.</b> {p.text}</p>)}
    </article>,
    document.body,
  );
}

export function Contact() {
  const { copy, toast } = useApp();
  const rows = [
    { label: "Email", value: contact.email, icon: <Mail size={15} /> },
    { label: "Discord", value: contact.discord, icon: <Discord size={15} /> },
    { label: "GitHub", value: contact.github, icon: <Github size={15} /> },
  ];
  return (
    <Section id="contact" n="06" kicker="Contact & collaboration" title="Let's build something" intro="Send a brief, copy a handle, or grab the dossier. I read everything.">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <InquiryForm />
        <div className="grid content-start gap-5">
          <div className="card grid gap-2 p-5">
            <p className="kicker mb-1">Direct lines</p>
            {rows.map((r) => (
              <button key={r.label} type="button" onClick={() => copy(r.value, r.label)} className="group flex items-center gap-3 rounded-xl border border-white/[.06] px-3 py-2.5 text-left transition hover:border-c1/40 active:scale-[.98]">
                <span className="text-c1">{r.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-[11px] text-zinc-500">{r.label}</span><span className="num block truncate text-sm text-zinc-200">{r.value.replace("https://", "")}</span></span>
                <Copy size={14} className="text-zinc-500 group-hover:text-c1" />
              </button>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn" onClick={() => window.dispatchEvent(new Event("vini:dossier"))}><Download size={15} />Dossier</button>
              <button type="button" className="btn" onClick={() => sharePortfolio(toast)}><Share size={15} />Share</button>
            </div>
          </div>
          <TimezoneOverlap />
        </div>
      </div>
      <div className="mt-10">
        <p className="kicker mb-4">FAQ</p>
        <div className="grid gap-2 md:grid-cols-2">
          {faq.map((x) => (
            <details key={x.q} className="group card p-4 open:border-c1/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
                {x.q}<span className="text-c1 transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm text-zinc-400">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Footer() {
  const { reduced } = useApp();
  return (
    <footer className="mt-10 border-t border-white/[.06] py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-zinc-300">{site.license}</p>
          <p className="num mt-1 text-[11px] text-zinc-600">{site.version} · static build · React + Tailwind · no trackers · <a href="classic.html" className="underline-offset-4 hover:text-c1 hover:underline">classic site + VEGA hologram</a></p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {sections.map((s) => <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollToId(s.id, reduced); }} className="text-zinc-400 hover:text-c1">{s.label}</a>)}
        </nav>
      </div>
    </footer>
  );
}
