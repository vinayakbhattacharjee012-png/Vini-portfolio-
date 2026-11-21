import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../lib/app";
import { useInterval } from "../../lib/hooks";
import { download } from "../../lib/utils";
import { Drawer } from "../ui/Overlay";
import { Bolt, Download, Pause, Play, Reset } from "../ui/Icons";
import { Sparkline } from "./charts";
import { ApexSim, BotShield, PoloDemo, TradeCalc } from "./sims";

const TABS = [["apex", "Apex-Fit"], ["polo", "Polo AI"], ["shield", "Bot Shield"], ["trade", "Trade Calc"]];
const NODES = ["Auth Node", "Inference Router", "State Cache", "Static CDN"];
const BASE = 14;
const fresh = () => ({ lat: Array.from({ length: 24 }, () => BASE + Math.round(Math.random() * 4 - 2)), stress: 0, peak: BASE, recoveredIn: null, shed: 0 });

// Real frame rate from requestAnimationFrame; memory where the browser exposes it.
function useFps(on) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf, n = 0, t0 = performance.now();
    const tick = (t) => { n++; if (t - t0 >= 1000) { setFps(Math.round((n * 1000) / (t - t0))); n = 0; t0 = t; } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return fps;
}

export default function TelemetryDrawer({ tab = "apex" }) {
  const { close, open } = useApp();
  const [live, setLive] = useState(true);
  const [sys, setSys] = useState(fresh);
  const [resetKey, setResetKey] = useState(0);
  const report = useRef({});
  const onReport = useCallback((r) => { report.current = r; }, []);
  const fps = useFps(live);
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const t0 = useRef(null);

  // Latency sample every 1.5 s; a stress test spikes it, then it decays back to baseline.
  useInterval(() => {
    setSys((s) => {
      const stress = Math.max(0, s.stress - 0.12);
      const v = Math.round(BASE + stress * 170 + Math.random() * 4 - 2);
      let recoveredIn = s.recoveredIn;
      if (s.stress > 0 && stress === 0 && t0.current) { recoveredIn = ((performance.now() - t0.current) / 1000).toFixed(1); t0.current = null; }
      return { ...s, stress, lat: [...s.lat.slice(1), v], peak: Math.max(s.peak, v), shed: s.shed + (stress > 0.5 ? Math.round(stress * 40) : 0), recoveredIn };
    });
  }, live ? 1500 : null);

  const health = (i) => (sys.stress > 0.55 && i === 1 ? "degraded" : sys.stress > 0.8 && i === 2 ? "degraded" : "ok");
  const stressTest = () => { t0.current = performance.now(); setSys((s) => ({ ...s, stress: 1, peak: BASE, recoveredIn: null, shed: 0 })); };
  const reset = () => { t0.current = null; setSys(fresh()); setResetKey((k) => k + 1); };
  const exportJson = () => download(`vini-telemetry-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify({
    capturedAt: new Date().toISOString(), note: "Simulated telemetry from vini's portfolio sandbox", mode: live ? "live" : "paused",
    fps, memoryMB: mem, latencyMs: sys.lat, peakLatencyMs: sys.peak, requestsShed: sys.shed, recoverySeconds: sys.recoveredIn,
    nodes: NODES.map((n, i) => ({ node: n, status: health(i) })), activeSandbox: tab, sandbox: report.current,
  }, null, 2));

  const Sim = { apex: ApexSim, polo: PoloDemo, shield: BotShield, trade: TradeCalc }[tab] || ApexSim;
  return (
    <Drawer title="Command Center · live telemetry" onClose={close} wide>
      <div className="space-y-6 p-5 sm:p-6">
        <div role="tablist" aria-label="Sandboxes" className="flex gap-1 rounded-2xl border border-zinc-700 bg-white/[.02] p-1">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => open("telemetry", { tab: id })}
              className={`flex-1 whitespace-nowrap rounded-xl px-1.5 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${tab === id ? "bg-c1/15 text-white ring-1 ring-c1/40" : "text-zinc-400 hover:text-zinc-200"}`}>{label}</button>
          ))}
        </div>

        <section aria-label="System telemetry" className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn h-9 px-3 text-xs" onClick={() => setLive((l) => !l)} aria-pressed={!live}>{live ? <><Pause size={14} />Pause frame</> : <><Play size={14} />Resume live stream</>}</button>
            <button type="button" className="btn h-9 px-3 text-xs" onClick={stressTest} disabled={!live}><Bolt size={14} />Inject stress test</button>
            <button type="button" className="btn h-9 px-3 text-xs" onClick={exportJson}><Download size={14} />Export .json</button>
            <button type="button" className="btn h-9 px-3 text-xs" onClick={reset}><Reset size={14} />Reset sandbox</button>
            <span className={`num ml-auto text-[11px] ${live ? "text-emerald-400" : "text-amber-300"}`}>{live ? "● SIMULATED LIVE STREAM" : "❚❚ PAUSED · FRAME INSPECTION"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="num flex justify-between text-[11px] text-zinc-500"><span>Latency · ms (1.5 s samples)</span><span className="text-zinc-200">{sys.lat[sys.lat.length - 1]} ms</span></div>
              <Sparkline data={sys.lat} className="mt-1 h-12 w-full" label="Latency sparkline" />
            </div>
            <dl className="num grid grid-cols-4 gap-3 text-center sm:grid-cols-2 sm:text-left">
              <div><dt className="text-[10px] text-zinc-500">FPS</dt><dd className="text-zinc-100">{live ? fps : "—"}</dd></div>
              <div><dt className="text-[10px] text-zinc-500">Memory</dt><dd className="text-zinc-100">{mem != null ? `${mem} MB` : "n/a"}</dd></div>
              <div><dt className="text-[10px] text-zinc-500">Peak</dt><dd className="text-zinc-100">{sys.peak} ms</dd></div>
              <div><dt className="text-[10px] text-zinc-500">Recovery</dt><dd className="text-zinc-100">{sys.recoveredIn ? `${sys.recoveredIn} s` : sys.stress > 0 ? "…" : "—"}</dd></div>
            </dl>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Node health">
            {NODES.map((n, i) => {
              const h = health(i);
              return (
                <li key={n} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs">
                  <i aria-hidden="true" className={`dot ${live ? "dot-live" : ""} ${h === "ok" ? (i % 2 ? "!bg-c2 ![box-shadow:0_0_10px_var(--c2)]" : "") : "!bg-amber-400 ![box-shadow:0_0_10px_#fbbf24]"}`} />
                  <span className="text-zinc-300">{n}</span><span className={`num ml-auto text-[10px] ${h === "ok" ? "text-zinc-500" : "text-amber-300"}`}>{h.toUpperCase()}</span>
                </li>
              );
            })}
          </ul>
          {sys.shed > 0 && <p className="num text-[11px] text-zinc-500">Load shed during stress: {sys.shed} requests · auto-recovery {sys.recoveredIn ? `in ${sys.recoveredIn} s` : "in progress"}</p>}
        </section>

        <Sim live={live} onReport={onReport} resetKey={resetKey} />
      </div>
    </Drawer>
  );
}
