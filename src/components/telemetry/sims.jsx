import { useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "../../lib/hooks";
import { LineChart } from "./charts";

const Tag = ({ children }) => <span className="rounded-full border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-500">{children}</span>;
function Slider({ id, label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span className="num text-zinc-100">{value}{unit}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--c1)]" />
    </div>
  );
}

/* ---------------- Apex-Fit: heart rate, pace and stamina load ---------------- */
const APEX = { hr: 132, pace: 14, stamina: 40 };
export function ApexSim({ live, onReport, resetKey }) {
  const [v, setV] = useState(APEX);
  const [buf, setBuf] = useState(() => ({ hr: Array(90).fill(APEX.hr), pace: Array(90).fill(APEX.pace) }));
  const t = useRef(0);
  useEffect(() => { setV(APEX); setBuf({ hr: Array(90).fill(APEX.hr), pace: Array(90).fill(APEX.pace) }); }, [resetKey]);
  useInterval(() => {
    t.current++;
    const beat = t.current % 8 === 0 ? 6 : 0, fatigue = v.stamina / 100;
    setBuf((b) => ({
      hr: [...b.hr.slice(1), v.hr + beat + (Math.random() - 0.5) * (3 + fatigue * 4)],
      pace: [...b.pace.slice(1), Math.max(0, v.pace * (1 - fatigue * 0.12) + (Math.random() - 0.5) * 0.8)],
    }));
  }, live ? 100 : null);
  const zone = v.hr < 120 ? 1 : v.hr < 140 ? 2 : v.hr < 160 ? 3 : v.hr < 180 ? 4 : 5;
  const load = Math.round((v.hr / 200) * 50 + (v.pace / 32) * 30 + v.stamina * 0.2);
  const recovery = Math.round(load * 0.9);
  useEffect(() => { onReport({ sim: "apex-fit", inputs: v, zone, loadIndex: load, recoveryMin: recovery }); }, [v, zone, load, recovery, onReport]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Apex-Fit live simulator</h3><Tag>SIMULATED SENSOR DATA</Tag></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider id="hr" label="Heart rate" unit=" bpm" min={60} max={200} value={v.hr} onChange={(hr) => setV({ ...v, hr })} />
        <Slider id="pace" label="Sprint pace" unit=" km/h" min={6} max={32} value={v.pace} onChange={(pace) => setV({ ...v, pace })} />
        <Slider id="stamina" label="Stamina load" unit="%" min={0} max={100} value={v.stamina} onChange={(stamina) => setV({ ...v, stamina })} />
      </div>
      <div className="card p-3">
        <div className="num mb-1 flex gap-4 text-[11px]"><span className="text-c1">— heart rate</span><span className="text-c2">— pace</span></div>
        <LineChart label="Heart rate and pace over the last 9 seconds" series={[{ data: buf.hr, min: 50, max: 210, color: "var(--c1)" }, { data: buf.pace, min: 0, max: 36, color: "var(--c2)" }]} />
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[["HR zone", `Z${zone}`], ["Load index", load], ["Recovery", `${recovery} min`]].map(([k, val]) => (
          <div key={k} className="card p-3"><dt className="text-[11px] text-zinc-500">{k}</dt><dd className="num mt-1 text-xl text-zinc-100">{val}</dd></div>
        ))}
      </dl>
    </div>
  );
}

/* ---------------- Polo Health AI: rule-based triage demo ---------------- */
const RED = [/chest (pain|tight)/, /short(ness)? of breath|can'?t breathe/, /faint|passed out/, /sever(e)? bleed/, /face droop|slurred speech|stroke/, /suicid|self[- ]?harm|kill myself/];
const DOSE = /\b(how (much|many)|dose|dosage|mg)\b/;
const DIAG = /\b(do i have|diagnos|is it cancer|what disease)\b/;
const TOPICS = [
  [/sleep|tired|insomnia|rest/, "Sleep", ["Keep a fixed wake-up time", "No screens 30 minutes before bed", "Short walk in daylight before noon"]],
  [/water|hydrat|thirst/, "Hydration", ["A glass of water with each meal", "Carry a bottle and refill twice", "More on training days"]],
  [/stress|anx|overwhelm|panic/, "Stress", ["Box breathing: 4 in, 4 hold, 4 out", "Write down the top three worries", "A 10-minute walk without your phone"]],
  [/run|gym|exercise|workout|train/, "Activity", ["Warm up for 5–10 minutes", "Raise volume no more than 10% a week", "One full rest day a week"]],
  [/eat|food|diet|meal|protein/, "Nutrition", ["Half the plate vegetables", "Protein with every meal", "Plan snacks ahead"]],
];
const SAMPLES = ["I slept 5 hours and feel tired", "Chest pain and shortness of breath", "How much ibuprofen should I take?", "Build me a hydration routine"];
function triage(text) {
  const q = text.toLowerCase();
  const checks = [
    { name: "Red-flag symptoms", hit: RED.some((r) => r.test(q)) },
    { name: "Medication dosing", hit: DOSE.test(q) },
    { name: "Diagnosis request", hit: DIAG.test(q) },
  ];
  const disclaimer = "General wellness information, not medical advice. A clinician should assess symptoms.";
  if (checks[0].hit) return { checks, result: { category: "urgent", escalate: true, message: "This could be serious. Contact emergency services or go to the nearest emergency department now.", suggestions: [], disclaimer } };
  if (checks[1].hit) return { checks, result: { category: "medication", escalate: true, message: "I can't recommend doses. Please ask a pharmacist or doctor, and follow the label.", suggestions: [], disclaimer } };
  if (checks[2].hit) return { checks, result: { category: "diagnosis", escalate: true, message: "I can't diagnose conditions. A doctor can examine you and order the right tests.", suggestions: [], disclaimer } };
  const t = TOPICS.find(([r]) => r.test(q));
  return { checks, result: { category: t ? t[1].toLowerCase() : "general-wellness", escalate: false, message: t ? `${t[1]} check-in: here's a simple plan.` : "Here's a general wellness check-in.", suggestions: t ? t[2] : ["Sleep 7–9 hours", "Move for 30 minutes", "Drink water through the day"], disclaimer } };
}
export function PoloDemo({ onReport, resetKey }) {
  const [text, setText] = useState(SAMPLES[0]);
  const [res, setRes] = useState(() => triage(SAMPLES[0]));
  useEffect(() => { setText(SAMPLES[0]); setRes(triage(SAMPLES[0])); }, [resetKey]);
  useEffect(() => { onReport({ sim: "polo", input: text, ...res.result }); }, [res, text, onReport]);
  const run = (t) => { setText(t); setRes(triage(t)); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Polo Health AI · triage demo</h3><Tag>RULE-BASED DEMO · NO MODEL CALLED</Tag></div>
      <div className="flex flex-wrap gap-2">{SAMPLES.map((s) => <button key={s} type="button" onClick={() => run(s)} className={`chip transition active:scale-[.98] ${text === s ? "border-c1/50 text-white" : "hover:text-zinc-200"}`}>{s}</button>)}</div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(text); }}>
        <label htmlFor="polo-q" className="sr-only">Describe how you feel</label>
        <input id="polo-q" className="field text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
        <button className="btn btn-primary shrink-0" type="submit">Run triage</button>
      </form>
      <ol className="grid gap-2 sm:grid-cols-3">
        {res.checks.map((c) => (
          <li key={c.name} className={`card flex items-center justify-between p-3 text-xs ${c.hit ? "border-rose-400/40" : ""}`}>
            <span className="text-zinc-400">{c.name}</span><span className={`num ${c.hit ? "text-rose-400" : "text-emerald-400"}`}>{c.hit ? "FLAGGED" : "CLEAR"}</span>
          </li>
        ))}
      </ol>
      <div className={`card p-4 ${res.result.escalate ? "border-rose-400/30" : "border-c1/25"}`} aria-live="polite">
        <p className={`text-sm font-medium ${res.result.escalate ? "text-rose-300" : "text-zinc-100"}`}>{res.result.message}</p>
        {res.result.suggestions.length > 0 && <ul className="mt-3 grid gap-1 text-sm text-zinc-300">{res.result.suggestions.map((s) => <li key={s}>• {s}</li>)}</ul>}
        <pre className="num mt-4 overflow-x-auto rounded-lg bg-obsidian/80 p-3 text-[11px] text-zinc-400">{JSON.stringify({ category: res.result.category, escalate: res.result.escalate, suggestions: res.result.suggestions.length }, null, 2)}</pre>
        <p className="mt-3 text-[11px] text-zinc-500">{res.result.disclaimer}</p>
      </div>
    </div>
  );
}

/* ---------------- Bot security: anti-raid simulator ---------------- */
const NAMES = ["nova_fan", "pixel", "astro", "luna", "kai", "orbit", "zen", "comet"];
const rnd = (a) => a[(Math.random() * a.length) | 0];
export function BotShield({ live, onReport, resetKey }) {
  const [log, setLog] = useState([]);
  const [s, setS] = useState({ state: "Normal", blocked: 0, quarantined: 0, rate: 1 });
  const raid = useRef(0);
  useEffect(() => { setLog([]); setS({ state: "Normal", blocked: 0, quarantined: 0, rate: 1 }); raid.current = 0; }, [resetKey]);
  const push = (kind, text) => setLog((l) => [{ id: Math.random(), kind, text, t: new Date().toLocaleTimeString("en-GB") }, ...l].slice(0, 40));
  useInterval(() => {
    if (raid.current > 0) {
      raid.current--;
      const n = 3 + ((Math.random() * 4) | 0);
      setS((x) => {
        const contained = x.state === "Contained" || x.state === "Under attack" && x.quarantined > 18;
        return { ...x, state: contained ? "Contained" : "Under attack", rate: n * 4, blocked: x.blocked + (contained ? n : Math.floor(n / 2)), quarantined: x.quarantined + (contained ? 0 : Math.ceil(n / 2)) };
      });
      push("raid", `${n} accounts joined in 250 ms · created < 1 day ago`);
      if (raid.current === 12) push("bot", "Anti-nuke: join burst detected → lockdown + verification required");
      if (raid.current === 10) push("bot", "Automod: slowmode 10s, mass-mention filter on");
      if (raid.current === 8) push("bot", "JailBot: new accounts moved to quarantine role");
      if (raid.current === 0) { push("ok", "Raid contained. Vault Account ownership untouched ✓"); setTimeout(() => setS((x) => ({ ...x, state: "Recovering" })), 1500); setTimeout(() => setS((x) => ({ ...x, state: "Normal", rate: 1 })), 5000); }
    } else if (Math.random() < 0.6) {
      push("ev", rnd([`${rnd(NAMES)} joined · passed verification`, `${rnd(NAMES)} sent a message in #general`, `${rnd(NAMES)} reached level ${2 + ((Math.random() * 20) | 0)}`]));
    }
  }, live ? 250 : null);
  useEffect(() => { onReport({ sim: "bot-shield", ...s }); }, [s, onReport]);
  const tone = { Normal: "text-emerald-400", "Under attack": "text-rose-400", Contained: "text-c1", Recovering: "text-amber-300" }[s.state];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Bot security · anti-nuke simulator</h3><Tag>SIMULATED SERVER</Tag></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Status", s.state, tone], ["Events / s", s.rate], ["Blocked", s.blocked], ["Quarantined", s.quarantined]].map(([k, v, c]) => (
          <div key={k} className="card p-3"><p className="text-[11px] text-zinc-500">{k}</p><p className={`num mt-1 text-lg ${c || "text-zinc-100"}`}>{v}</p></div>
        ))}
      </div>
      <button type="button" className="btn btn-primary" disabled={!live || raid.current > 0} onClick={() => { raid.current = 16; push("raid", "⚠ Raid spike incoming"); }}>Trigger raid spike</button>
      {!live && <p className="text-xs text-zinc-500">Resume the live stream to run the simulation.</p>}
      <ul className="num h-56 overflow-y-auto rounded-xl border border-zinc-700 bg-obsidian/70 p-3 text-[11px] leading-6" aria-live="off" aria-label="Server event log">
        {log.map((l) => <li key={l.id} className={{ raid: "text-rose-300", bot: "text-c1", ok: "text-emerald-300", ev: "text-zinc-500" }[l.kind]}><span className="text-zinc-600">{l.t}</span> {l.text}</li>)}
      </ul>
    </div>
  );
}

/* ---------------- Trade value & margin calculator ---------------- */
const ITEMS = [["Nebula Blade", 1200], ["Comet Pet", 850], ["Aurora Wings", 640], ["Void Crate", 300], ["Star Shard", 90], ["Galaxy Badge", 45]];
export function TradeCalc({ onReport, resetKey }) {
  const [side, setSide] = useState("you");
  const [you, setYou] = useState(["Comet Pet", "Star Shard"]);
  const [them, setThem] = useState(["Aurora Wings", "Void Crate"]);
  useEffect(() => { setYou(["Comet Pet", "Star Shard"]); setThem(["Aurora Wings", "Void Crate"]); }, [resetKey]);
  const val = (list) => list.reduce((a, n) => a + ITEMS.find((i) => i[0] === n)[1], 0);
  const a = val(you), b = val(them);
  const margin = a ? ((b - a) / a) * 100 : 0;
  const verdict = !a || !b ? "Add items to both sides" : Math.abs(margin) <= 5 ? "Fair trade" : margin > 0 ? "You win" : "You overpay";
  const tone = verdict === "Fair trade" ? "text-emerald-400" : verdict === "You win" ? "text-c1" : "text-amber-300";
  const gap = Math.abs(b - a);
  const fill = useMemo(() => { // greedy: smallest set of items that closes the gap
    let left = gap; const out = [];
    for (const [n, v] of [...ITEMS].sort((x, y) => y[1] - x[1])) while (v <= left && out.length < 6) { out.push(n); left -= v; }
    return out;
  }, [gap]);
  useEffect(() => { onReport({ sim: "trade-calc", yourValue: a, theirValue: b, marginPct: Number(margin.toFixed(1)), verdict }); }, [a, b, margin, verdict, onReport]);
  const add = (n) => (side === "you" ? setYou([...you, n]) : setThem([...them, n]));
  // A plain function (not a component) so re-renders keep focus on the clicked button.
  const sideBox = (title, id, list, set, total) => (
    <div key={id} className={`card p-4 ${side === id ? "border-c1/40" : ""}`}>
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setSide(id)} aria-pressed={side === id}>
        <span className="text-sm font-medium text-zinc-100">{title}</span><span className="num text-c1">{total.toLocaleString()}</span>
      </button>
      <ul className="mt-3 flex min-h-8 flex-wrap gap-1.5">
        {list.map((n, i) => <li key={n + i}><button type="button" className="chip hover:border-rose-400/50" onClick={() => set(list.filter((_, k) => k !== i))} aria-label={`Remove ${n}`}>{n} ×</button></li>)}
      </ul>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Trade value & margin calculator</h3><Tag>SAMPLE VALUES</Tag></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sideBox("Your offer", "you", you, setYou, a)}
        {sideBox("Their offer", "them", them, setThem, b)}
      </div>
      <div>
        <p className="mb-2 text-xs text-zinc-500">Add to <span className="text-zinc-200">{side === "you" ? "your offer" : "their offer"}</span>:</p>
        <div className="flex flex-wrap gap-1.5">{ITEMS.map(([n, v]) => <button key={n} type="button" className="chip transition hover:border-c1/50 hover:text-zinc-100 active:scale-[.98]" onClick={() => add(n)}>+ {n} <span className="num text-zinc-500">{v}</span></button>)}</div>
      </div>
      <div className="card grid gap-3 p-4 sm:grid-cols-3" aria-live="polite">
        <div><p className="text-[11px] text-zinc-500">Ratio</p><p className="num text-lg text-zinc-100">{a ? (b / a).toFixed(2) : "–"}×</p></div>
        <div><p className="text-[11px] text-zinc-500">Margin</p><p className="num text-lg text-zinc-100">{margin > 0 ? "+" : ""}{margin.toFixed(1)}%</p></div>
        <div><p className="text-[11px] text-zinc-500">Verdict</p><p className={`text-lg font-medium ${tone}`}>{verdict}</p></div>
        {a > 0 && b > 0 && Math.abs(margin) > 5 && <p className="text-xs text-zinc-400 sm:col-span-3">To balance, {margin > 0 ? "you could add" : "they could add"} about <span className="num text-zinc-200">{gap}</span> in value{fill.length ? `, e.g. ${fill.join(" + ")}` : ""}.</p>}
      </div>
    </div>
  );
}
