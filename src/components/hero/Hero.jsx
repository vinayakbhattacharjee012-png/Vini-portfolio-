import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { contact, projects, site, skills, vitals } from "../../data/portfolioData";
import { qr } from "../../data/generated";
import { useApp } from "../../lib/app";
import { useInterval, useMagnetic } from "../../lib/hooks";
import { scrollToId } from "../../lib/utils";
import { Modal } from "../ui/Overlay";
import { Chevron, Copy, Discord, Github, Mail, Qr, Share } from "../ui/Icons";
import { sharePortfolio } from "../hud/CommandPalette";

const NeuralMesh = lazy(() => import("./NeuralMesh"));

const HEAD = [["I build "], ["AI tools, Discord systems", true], [" & the communities they run in."]];
const GLYPHS = "!<>-_\\/[]{}=+*^?#01";

// Kinetic "decryption", once on load. Every real letter keeps its slot (hidden until revealed) and the
// random glyph is painted over it by CSS, so the line never reflows: zero layout shift.
function DecryptHeadline({ reduced }) {
  const full = HEAD.map((s) => s[0]).join("");
  const [k, setK] = useState(reduced ? full.length : 0); // characters revealed so far
  const done = useRef(false); // one-shot: toggling motion later never replays it
  useEffect(() => {
    if (reduced || done.current) { done.current = true; return setK(full.length); }
    let f = 0, t;
    const frames = 26;
    const step = () => { f++; setK(Math.floor((full.length * f) / frames)); if (f < frames) t = setTimeout(step, 34); else done.current = true; };
    step();
    return () => clearTimeout(t);
  }, [reduced, full]);
  let i = 0;
  return (
    <h1 id="home-title" className="text-[clamp(2.1rem,5.4vw,4rem)] font-semibold leading-[1.05] tracking-tight" aria-label={full}>
      {HEAD.map(([text, grad]) => {
        const start = i;
        return text.split(/(\s+)/).map((word, w) => {
          if (/^\s+$/.test(word)) { i += word.length; return word; }
          return (
            <span key={`${start}-${w}`} aria-hidden="true" className="whitespace-nowrap">
              {[...word].map((ch) => {
                const idx = i++, hidden = idx >= k;
                // Gradient words get a per-letter colour step, which survives hiding letters one by one.
                const color = grad ? `color-mix(in oklab, var(--c1) ${Math.round(100 - ((idx - start) / (text.length - 1)) * 100)}%, var(--c2))` : undefined;
                return <span key={idx} className={hidden ? "dc" : undefined} data-g={hidden ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : undefined} style={color ? { color } : undefined}>{ch}</span>;
              })}
            </span>
          );
        });
      })}
    </h1>
  );
}

function Typewriter({ words, reduced }) {
  const [i, setI] = useState(0), [n, setN] = useState(0), [del, setDel] = useState(false);
  useEffect(() => {
    if (reduced) { const t = setTimeout(() => setI((x) => (x + 1) % words.length), 2800); return () => clearTimeout(t); }
    const w = words[i];
    let t;
    if (!del && n < w.length) t = setTimeout(() => setN(n + 1), 42);
    else if (!del) t = setTimeout(() => setDel(true), 1700);
    else if (n > 0) t = setTimeout(() => setN(n - 1), 20);
    else { setDel(false); setI((i + 1) % words.length); }
    return () => clearTimeout(t);
  }, [n, del, i, reduced, words]);
  return (
    <p className="num mt-5 h-6 text-sm text-zinc-400 sm:text-base">
      <span className="text-c1">&gt;</span> <span aria-hidden="true" className="caret text-zinc-200">{reduced ? words[i] : words[i].slice(0, n)}</span>
      <span className="sr-only">Roles: {words.join(", ")}</span>
    </p>
  );
}

function Vitals() {
  const [lat, setLat] = useState(vitals.latencyMs);
  useInterval(() => setLat(vitals.latencyMs + Math.round((Math.random() - 0.5) * 6)), 1500);
  const rows = [["Uptime", `${vitals.uptime.toFixed(2)}%`], ["Build latency", `${String(lat).padStart(2, "0")}ms`], ["Active nodes", String(vitals.nodes)]];
  return (
    <div className="glass hairline-top rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="kicker">System vitals</p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-500">SIMULATED</span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-[11px] text-zinc-500">{k}</dt><dd className="num mt-1 text-lg text-zinc-100">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

const HELP = "commands: help · whoami · projects · stack · clear";
function HeroTerminal() {
  const [lines, setLines] = useState([["o", "vini@portfolio:~ ready. type help"]]);
  const [val, setVal] = useState("");
  const out = useRef(null);
  useEffect(() => { out.current.scrollTop = out.current.scrollHeight; }, [lines]);
  function run(e) {
    e.preventDefault();
    const c = val.trim().toLowerCase();
    if (!c) return;
    const say = {
      help: HELP,
      whoami: `${site.name} · ${site.roles.join(" · ")}`,
      projects: projects.map((p) => `• ${p.name}`).join("\n"),
      stack: [...new Set(skills.filter((s) => s.tier !== "Prototyping").map((s) => s.name))].slice(0, 12).join(" · "),
    }[c];
    setVal("");
    if (c === "clear") return setLines([]);
    setLines((l) => [...l, ["i", `$ ${c}`], [say ? "o" : "e", say || `command not found: ${c} (try help)`]].slice(-14));
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/[.06] px-4 py-2.5">
        <i className="size-2.5 rounded-full bg-white/15" /><i className="size-2.5 rounded-full bg-white/15" /><i className="size-2.5 rounded-full bg-c1/70" />
        <span className="num ml-2 text-[11px] text-zinc-500">greeting.sh</span>
      </div>
      <pre ref={out} className="num h-36 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed" aria-live="polite">
        {lines.map(([k, t], i) => <div key={i} className={k === "i" ? "text-c1" : k === "e" ? "text-rose-400" : "text-zinc-400"}>{t}</div>)}
      </pre>
      <form onSubmit={run} className="flex items-center gap-2 border-t border-white/[.06] px-4 py-2.5">
        <label htmlFor="hero-cmd" className="num text-xs text-c1">$</label>
        <input id="hero-cmd" value={val} onChange={(e) => setVal(e.target.value)} autoComplete="off" spellCheck="false" placeholder="help"
          className="num flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none" aria-label="Type a command: help, whoami, projects or stack" />
      </form>
    </div>
  );
}

export function QrModal() {
  const { close } = useApp();
  return (
    <Modal title="Scan to open on mobile" onClose={close}>
      <div className="grid place-items-center gap-4 p-6">
        <div className="rounded-2xl border border-c1/30 bg-obsidian p-4 shadow-[0_0_40px_-12px_var(--c1)]">
          <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} width="232" height="232" role="img" aria-label={`QR code for ${qr.url}`} shapeRendering="crispEdges">
            <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} fill="#06070a" />
            <path d={qr.path} fill="var(--c1)" />
          </svg>
        </div>
        <p className="num text-xs text-zinc-400">{qr.url}</p>
      </div>
    </Modal>
  );
}

export function Hero() {
  const { reduced, open, copy, toast } = useApp();
  const a = useMagnetic(reduced, 0.2), b = useMagnetic(reduced, 0.2);
  const [mesh, setMesh] = useState(false);
  // Mount the canvas after first paint so text renders first.
  useEffect(() => { const id = (window.requestIdleCallback || setTimeout)(() => setMesh(true)); return () => (window.cancelIdleCallback || clearTimeout)(id); }, []);
  const dock = [
    { label: "GitHub", href: contact.github, icon: <Github /> },
    { label: "Galaxy Empire Discord", href: contact.discordServer, icon: <Discord /> },
    { label: "Email", href: `mailto:${contact.email}`, icon: <Mail /> },
  ];
  const ring = "grid size-10 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-c1/60 hover:text-c1 hover:shadow-[0_0_18px_-4px_var(--c1)] active:scale-[.98]";

  return (
    <section id="home" aria-labelledby="home-title" className="relative isolate overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      <div className="absolute inset-0 -z-10">{mesh && <Suspense fallback={null}><NeuralMesh reduced={reduced} /></Suspense>}</div>
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="anim-enter">
          <p className="kicker"><span className="text-c1">01</span> / Vini · builder, community founder, creator</p>
          <div className="mt-5"><DecryptHeadline reduced={reduced} /></div>
          <Typewriter words={site.roles} reduced={reduced} />
          <p className="mt-5 max-w-xl text-zinc-400">{site.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button ref={a} type="button" className="btn btn-primary h-11 px-5" onClick={() => open("telemetry", { tab: "apex" })}>Launch Command Center</button>
            <button ref={b} type="button" className="btn h-11 px-5" onClick={() => scrollToId("builds", reduced)}>Inspect Flagship Builds</button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="chip transition hover:border-c1/40 hover:text-zinc-100 active:scale-[.98]" onClick={() => copy(contact.email, "Email")}><Copy size={14} />{contact.email}</button>
            <button type="button" className="chip transition hover:border-c1/40 hover:text-zinc-100 active:scale-[.98]" onClick={() => copy(contact.discord, "Discord handle")}><Discord size={14} />{contact.discord}</button>
          </div>
          <ul className="mt-8 flex gap-2" aria-label="Links">
            {dock.map((d) => <li key={d.label}><a className={ring} href={d.href} target={d.href.startsWith("http") ? "_blank" : undefined} rel="noopener" aria-label={d.label} title={d.label}>{d.icon}</a></li>)}
            <li><button type="button" className={ring} onClick={() => open("qr")} aria-label="Scan to open on mobile" title="QR code"><Qr /></button></li>
            <li><button type="button" className={ring} onClick={() => sharePortfolio(toast)} aria-label="Share portfolio" title="Share"><Share /></button></li>
          </ul>
        </div>
        <div className="anim-enter grid gap-4 [animation-delay:120ms]">
          <Vitals />
          <HeroTerminal />
        </div>
      </div>
      <a href="#builds" onClick={(e) => { e.preventDefault(); scrollToId("builds", reduced); }} aria-label="Scroll to builds"
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-zinc-500 transition hover:text-c1 md:block">
        <Chevron size={22} style={{ animation: "bob 1.8s var(--ease) infinite" }} />
      </a>
    </section>
  );
}
