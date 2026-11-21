import { useState } from "react";
import { contact, faq, projectTypes } from "../../data/portfolioData";
import { useInterval } from "../../lib/hooks";
import { hourIn, refId } from "../../lib/utils";
import { Section } from "../ui/Section";
import { Check, Mail } from "../ui/Icons";

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

export function InquiryForm({ types = projectTypes, initialType = "" }) {
  const [f, setF] = useState({ name: "", email: "", type: initialType, message: "" });
  const [touched, setTouched] = useState({});
  const [state, setState] = useState({ step: "edit" });
  const errs = validate(f);
  const show = (k) => (touched[k] || state.step === "tried") && errs[k];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (Object.keys(errs).length) { setState({ step: "tried" }); return; }
    const ref = refId();
    setState({ step: "sending", ref });
    let sent = false;
    // Only Netlify can receive the form; other static hosts may answer a POST with 200 and drop it, so hand over to email there.
    if (/netlify\.app$/.test(location.hostname)) try {
      const body = new URLSearchParams({ "form-name": "inquiry", ...f, ref }).toString();
      const r = await fetch(location.pathname, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      sent = r.ok;
    } catch { sent = false; }
    setState({ step: "done", ref, sent });
  }

  if (state.step === "done") {
    return (
      <div className="anim-pop card hairline-top grid gap-4 p-6" role="status">
        <p className="kicker text-c1">{state.sent ? "Message transmitted" : "Ready to send"}</p>
        <p className="text-lg font-semibold text-zinc-100">{state.sent ? "Got it. I'll reply by email." : "Last step: send it from your email app."}</p>
        <dl className="num grid grid-cols-2 gap-3 text-xs">
          <div><dt className="text-zinc-500">Reference</dt><dd className="text-zinc-100">{state.ref}</dd></div>
          <div><dt className="text-zinc-500">Type</dt><dd className="text-zinc-100">{f.type}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <a className={state.sent ? "btn" : "btn btn-primary"} href={mailto(f, state.ref)}><Mail size={15} />{state.sent ? "Also open in my email app" : "Send via email"}</a>
          <button type="button" className="btn" onClick={() => { setF({ name: "", email: "", type: initialType, message: "" }); setTouched({}); setState({ step: "edit" }); }}>New message</button>
        </div>
      </div>
    );
  }
  const err = (k) => show(k) && <p id={`err-${k}`} className="mt-1.5 text-xs text-rose-400">{errs[k]}</p>;
  const ok = (k) => touched[k] && !errs[k] && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />;
  return (
    <form name="inquiry" noValidate onSubmit={submit} className="card grid gap-4 p-5 sm:p-6">
      <p className="kicker">Start a build / collaborate</p>
      <fieldset>
        <legend className="mb-2 text-sm text-zinc-300">What are we building?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby={show("type") ? "err-type" : undefined}>
          {types.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={f.type === t} onClick={() => { setF({ ...f, type: t }); setTouched({ ...touched, type: true }); }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition active:scale-[.98] ${f.type === t ? "border-c1 bg-c1/10 text-zinc-100" : "border-zinc-600 text-zinc-400 hover:text-zinc-200"}`}>{t}</button>
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
        <textarea id="f-message" name="message" rows="4" value={f.message} onChange={set("message")} onBlur={() => setTouched({ ...touched, message: true })}
          aria-invalid={!!show("message")} aria-describedby={show("message") ? "err-message" : undefined} className="field resize-y" placeholder="Goal, timeline, links…" />
        {err("message")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary h-11 px-5" disabled={state.step === "sending"}>{state.step === "sending" ? "Transmitting…" : "Transmit brief"}</button>
        <span className="text-xs text-zinc-500">No account, no tracking. Your email app opens with the brief filled in, ready to send.</span>
      </div>
    </form>
  );
}

export function TimezoneOverlap() {
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
      <div className="relative mt-4 h-3 rounded-full bg-white/10" role="img" aria-label={`Availability in your time zone: ${fmt(ls)} to ${fmt(le)}. It is ${fmt(now)} now.`}>
        {segs.map(([a, b]) => <span key={a} className="absolute inset-y-0 rounded-full bg-c1/80" style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` }} />)}
        <span className="absolute -top-1 h-5 w-0.5 rounded bg-zinc-100" style={{ left: `${(now / 24) * 100}%` }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] text-zinc-500"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      <p className={`num mt-3 text-xs ${live ? "text-emerald-400" : "text-zinc-500"}`}>{live ? "● Inside the window right now" : "○ Outside the window right now. Email anyway; I reply when I'm back."}</p>
    </div>
  );
}

export function Faq({ items = faq }) {
  return (
    <div className="grid gap-2">
      <p className="kicker">FAQ</p>
      {items.map((x) => (
        <details key={x.q} className="group card p-4 open:border-c1/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
            {x.q}<span className="text-c1 transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-2 text-sm text-zinc-400">{x.a}</p>
        </details>
      ))}
    </div>
  );
}

export function StartBuild() {
  return (
    <Section id="build" kicker="Start a build" title="Got a project? Send a brief" intro="Pick a type, describe it, and you get a reference number. Or check when I'm usually around.">
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <InquiryForm />
        <div className="grid content-start gap-5">
          <TimezoneOverlap />
          <Faq />
        </div>
      </div>
    </Section>
  );
}
