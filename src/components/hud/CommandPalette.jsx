import { useMemo, useState } from "react";
import { contact, projects, sections, skills, site } from "../../data/portfolioData";
import { ACCENTS, useApp } from "../../lib/app";
import { fuzzy, scrollToId } from "../../lib/utils";
import { Modal } from "../ui/Overlay";
import { Search } from "../ui/Icons";

export function sharePortfolio(toast) {
  const data = { title: "Vini · Portfolio", text: site.tagline, url: site.url };
  if (navigator.share) return navigator.share(data).catch(() => {});
  return navigator.clipboard?.writeText(site.url).then(() => toast("Portfolio link copied"), () => toast(site.url));
}

// Every action the palette can run, grouped. Also reused by the dev console.
export function useCommands() {
  const app = useApp();
  const { open, close, setPref, prefs, reduced, copy, toast } = app;
  return useMemo(() => {
    const go = (id) => () => { close(); setTimeout(() => scrollToId(id, reduced), 30); };
    const list = [
      ...sections.map((s) => ({ group: "Sections", label: `Go to ${s.label}`, hint: s.key, keys: "section jump scroll", run: go(s.id) })),
      ...projects.map((p) => ({ group: "Builds", label: p.name, hint: "deep dive", keys: `${p.summary} ${p.stack.join(" ")} project build`, run: () => open("project", { id: p.id }) })),
      ...skills.map((s) => ({ group: "Skills", label: s.name, hint: s.tier, keys: `${s.use} skill`, run: () => { close(); window.dispatchEvent(new CustomEvent("vini:skill", { detail: s.name })); setTimeout(() => scrollToId("skills", reduced), 30); } })),
      { group: "Actions", label: "Open Command Center (telemetry)", hint: "Alt T", keys: "telemetry drawer sandbox simulate", run: () => open("telemetry", { tab: "apex" }) },
      { group: "Actions", label: "Run Apex-Fit simulator", keys: "heart rate pace stamina sim", run: () => open("telemetry", { tab: "apex" }) },
      { group: "Actions", label: "Try the Polo Health AI demo", keys: "triage guardrail health ai", run: () => open("telemetry", { tab: "polo" }) },
      { group: "Actions", label: "Trigger a raid in the bot security sim", keys: "anti-nuke discord raid shield", run: () => open("telemetry", { tab: "shield" }) },
      { group: "Actions", label: "Open the trade value calculator", keys: "trade margin ratio calc", run: () => open("telemetry", { tab: "trade" }) },
      { group: "Actions", label: "Open dev console", hint: "`", keys: "terminal cli shell", run: () => open("console") },
      { group: "Actions", label: reduced ? "Turn motion back on" : "Reduce motion", hint: "Alt M", keys: "reduced motion animation accessibility low power", run: () => { setPref("reduced", !prefs.reduced); close(); } },
      ...Object.entries(ACCENTS).map(([k, a]) => ({ group: "Actions", label: `Theme: ${a.label}`, keys: `accent colour color theme ${k}`, run: () => { setPref("accent", k); close(); } })),
      { group: "Actions", label: "HUD settings", keys: "grid overdrive accent preferences", run: () => open("settings") },
      { group: "Actions", label: "Copy email", keys: "contact mail", run: () => { copy(contact.email, "Email"); close(); } },
      { group: "Actions", label: "Copy Discord handle", keys: "contact discord", run: () => { copy(contact.discord, "Discord handle"); close(); } },
      { group: "Actions", label: "Show QR code", keys: "mobile scan phone", run: () => open("qr") },
      { group: "Actions", label: "Share portfolio", keys: "link share url", run: () => { close(); sharePortfolio(toast); } },
      { group: "Actions", label: "Download developer dossier", keys: "resume cv pdf print spec sheet", run: () => { close(); window.dispatchEvent(new Event("vini:dossier")); } },
      { group: "Actions", label: "Classic portfolio + VEGA hologram", keys: "old previous version vega hologram", run: () => { location.href = "classic.html"; } },
    ];
    return list;
  }, [open, close, setPref, prefs.reduced, reduced, copy, toast]);
}

export function CommandPalette() {
  const { close } = useApp();
  const commands = useCommands();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const results = useMemo(() => {
    if (!q.trim()) return commands.filter((c) => c.group !== "Skills").slice(0, 14);
    return commands.map((c) => ({ c, s: Math.max(fuzzy(q, c.label) * 2, fuzzy(q, c.keys)) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s).slice(0, 14).map((x) => x.c);
  }, [q, commands]);
  const pick = (i) => results[i]?.run();

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % Math.max(1, results.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s - 1 + results.length) % Math.max(1, results.length)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
  }
  let lastGroup = null;
  return (
    <Modal label="Command palette" onClose={close}>
      <div className="flex items-center gap-3 border-b border-white/[.06] px-4">
        <Search className="text-c1" />
        <input data-autofocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder="Search builds, skills, sections or actions…"
          className="h-14 flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={`cmd-${sel}`} aria-label="Command search" />
        <kbd className="num rounded-md border border-white/10 px-1.5 text-[10px] text-zinc-500">ESC</kbd>
      </div>
      <ul id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">No matches. Try “apex”, “python” or “theme”.</li>}
        {results.map((c, i) => {
          const head = c.group !== lastGroup ? (lastGroup = c.group) : null;
          return (
            <li key={c.group + c.label} role="option" id={`cmd-${i}`} aria-selected={i === sel}>
              {head && <p className="kicker px-3 pb-1 pt-3">{head}</p>}
              <button type="button" tabIndex={-1} onMouseMove={() => setSel(i)} onClick={() => pick(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${i === sel ? "bg-c1/10 text-white" : "text-zinc-300"}`}>
                <span className="truncate">{c.label}</span>
                {c.hint && <span className="num shrink-0 text-[11px] text-zinc-500">{c.hint}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="num flex gap-4 border-t border-white/[.06] px-4 py-2.5 text-[11px] text-zinc-500"><span>↑↓ move</span><span>↵ run</span><span>esc close</span></p>
    </Modal>
  );
}

export function SettingsPanel() {
  const { prefs, setPref, close } = useApp();
  return (
    <Modal title="HUD settings" onClose={close}>
      <div className="space-y-7 p-5">
        <fieldset>
          <legend className="kicker mb-3">Holographic accent</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(ACCENTS).map(([k, a]) => (
              <button key={k} type="button" onClick={() => setPref("accent", k)} aria-pressed={prefs.accent === k}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition active:scale-[.98] ${prefs.accent === k ? "border-c1/60 bg-c1/[.06] text-white" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
                <span className="size-7 rounded-full" style={{ background: `linear-gradient(135deg, ${a.c1} 50%, ${a.c2} 50%)` }} aria-hidden="true" />{a.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="grid" className="kicker mb-3 flex justify-between"><span>Grid overdrive</span><span className="num text-c1">{prefs.grid}%</span></label>
          <input id="grid" type="range" min="0" max="100" value={prefs.grid} onChange={(e) => setPref("grid", Number(e.target.value))} className="w-full accent-[var(--c1)]" />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.08] p-4">
          <div>
            <p className="text-sm font-medium text-zinc-100">Reduced motion · low power</p>
            <p className="text-xs text-zinc-500">Pauses particles, glows and sweeps. Shortcut <kbd className="num">Alt M</kbd></p>
          </div>
          <button type="button" role="switch" aria-checked={prefs.reduced} onClick={() => setPref("reduced", !prefs.reduced)} aria-label="Reduced motion"
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs.reduced ? "bg-c1" : "bg-white/15"}`}>
            <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform duration-200 ease-out-expo ${prefs.reduced ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-zinc-500">Saved on this device. Nothing leaves your browser.</p>
      </div>
    </Modal>
  );
}
