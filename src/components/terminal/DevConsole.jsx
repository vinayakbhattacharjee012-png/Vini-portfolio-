import { useEffect, useRef, useState } from "react";
import { contact, projects, sections, site, skills } from "../../data/portfolioData";
import { ACCENTS, useApp } from "../../lib/app";
import { scrollToId } from "../../lib/utils";
import { BottomDrawer } from "../ui/Overlay";

const THEMES = { dual: "dual", cyan: "cyan", violet: "violet", matrix: "emerald", emerald: "emerald" };
const SIMS = { "apex-sim": "apex", polo: "polo", raid: "shield", trade: "trade" };
const COMMANDS = ["help", "ls projects", "ls skills", "ls sections", "cat skills.json", "cat projects.json", "run apex-sim", "run polo", "run raid", "run trade",
  "theme dual", "theme cyan", "theme violet", "theme matrix", "motion on", "motion off", "open builds", "open skills", "open lab", "open impact", "open contact",
  "whoami", "contact", "history", "clear", "sudo hack", "exit"];

export function DevConsole() {
  const app = useApp();
  const { close, open, setPref, setSweep, reduced } = app;
  const [lines, setLines] = useState([["o", `vini-os ${site.version} · type "help"`]]);
  const [val, setVal] = useState("");
  const hist = useRef([]), hi = useRef(0), out = useRef(null);
  useEffect(() => { out.current.scrollTop = out.current.scrollHeight; }, [lines]);
  const print = (...l) => setLines((x) => [...x, ...l].slice(-200));

  function exec(raw) {
    const cmd = raw.trim().replace(/\s+/g, " ");
    if (!cmd) return;
    hist.current.push(cmd); hi.current = hist.current.length;
    print(["i", `$ ${cmd}`]);
    const [c, ...args] = cmd.split(" "), a = args.join(" ").toLowerCase();
    switch (c.toLowerCase()) {
      case "help":
        return print(["o", "ls projects|skills|sections   cat skills.json|projects.json|<project>\nrun apex-sim|polo|raid|trade   theme dual|cyan|violet|matrix\nmotion on|off   open <section>   whoami   contact   history   clear   exit\npsst: there's a sudo command."]);
      case "ls":
        if (a === "projects") return print(["o", projects.map((p) => `${p.id.padEnd(14)} ${p.status.padEnd(10)} ${p.name}`).join("\n")]);
        if (a === "skills") return print(["o", skills.map((s) => `${s.tier.padEnd(12)} ${s.name}`).join("\n")]);
        if (a === "sections" || !a) return print(["o", sections.map((s) => `${s.key}  ${s.id}/`).join("\n")]);
        return print(["e", `ls: ${a}: no such directory`]);
      case "cat": {
        if (a === "skills.json") return print(["o", JSON.stringify(skills.map(({ name, tier, tab }) => ({ name, tier, area: tab })), null, 2)]);
        if (a === "projects.json") return print(["o", JSON.stringify(projects.map(({ id, name, status, stack }) => ({ id, name, status, stack })), null, 2)]);
        const p = projects.find((x) => x.id === a);
        if (p) return print(["o", `${p.name} [${p.status}]\n${p.summary}\nstack: ${p.stack.join(", ")}\nrepo: ${p.repo || "private"}`]);
        return print(["e", `cat: ${a || "(nothing)"}: no such file`]);
      }
      case "run":
        if (SIMS[a]) { print(["g", `launching ${a}…`]); return setTimeout(() => open("telemetry", { tab: SIMS[a] }), 250); }
        return print(["e", `run: unknown program "${a}". try apex-sim, polo, raid or trade`]);
      case "theme":
        if (THEMES[a]) { setPref("accent", THEMES[a]); return print(["g", `accent → ${ACCENTS[THEMES[a]].label}`]); }
        return print(["e", "usage: theme dual|cyan|violet|matrix"]);
      case "motion":
        if (a === "on" || a === "off") { setPref("reduced", a === "off"); return print(["g", `motion ${a}`]); }
        return print(["e", "usage: motion on|off"]);
      case "open": {
        const s = sections.find((x) => x.id === a || x.label.toLowerCase() === a);
        if (s) { close(); return setTimeout(() => scrollToId(s.id, reduced), 50); }
        return print(["e", `open: no section "${a}"`]);
      }
      case "whoami": return print(["o", `${site.name} · ${site.roles.join(" · ")}`]);
      case "contact": return print(["o", `email   ${contact.email}\ndiscord ${contact.discord}\ngithub  ${contact.github}`]);
      case "history": return print(["o", hist.current.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join("\n")]);
      case "clear": return setLines([]);
      case "exit": return close();
      case "sudo":
        if (a === "hack") { setSweep((n) => n + 1); return print(["g", "[sudo] access granted… running holographic diagnostic sweep\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%  all systems nominal. nothing was hacked :)"]); }
        return print(["e", "sudo: try `sudo hack`"]);
      default: return print(["e", `command not found: ${c}. type "help"`]);
    }
  }

  function onKey(e) {
    if (e.key === "ArrowUp") { e.preventDefault(); if (hi.current > 0) setVal(hist.current[--hi.current]); }
    else if (e.key === "ArrowDown") { e.preventDefault(); hi.current = Math.min(hist.current.length, hi.current + 1); setVal(hist.current[hi.current] || ""); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const v = val.toLowerCase(), m = COMMANDS.filter((c) => c.startsWith(v));
      if (m.length === 1) setVal(m[0]);
      else if (m.length > 1) {
        let pre = m[0]; // longest common prefix
        for (const x of m) while (!x.startsWith(pre)) pre = pre.slice(0, -1);
        if (pre.length > v.length) setVal(pre); else print(["m", m.join("   ")]);
      }
    }
  }

  return (
    <BottomDrawer label="Dev console" onClose={close}>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 border-b border-white/[.06] px-4 py-2.5">
          <i className="size-2.5 rounded-full bg-rose-400/70" /><i className="size-2.5 rounded-full bg-amber-300/70" /><i className="size-2.5 rounded-full bg-c1/80" />
          <span className="num ml-2 text-xs text-zinc-500">vini@portfolio: ~ · dev console</span>
          <button type="button" onClick={close} className="num ml-auto rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white" aria-label="Close console">esc</button>
        </div>
        <pre ref={out} className="num h-[42vh] overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed sm:text-[13px]" aria-live="polite">
          {lines.map(([k, t], i) => <div key={i} className={{ i: "text-c1", e: "text-rose-400", g: "text-emerald-300", m: "text-zinc-500", o: "text-zinc-300" }[k]}>{t}</div>)}
        </pre>
        <form className="flex items-center gap-2 border-t border-white/[.06] px-4 py-3" onSubmit={(e) => { e.preventDefault(); exec(val); setVal(""); }}>
          <label htmlFor="console-in" className="num text-xs text-c1">vini@portfolio:~$</label>
          <input id="console-in" data-autofocus data-tab-local value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKey} autoComplete="off" spellCheck="false" autoCapitalize="off"
            className="num flex-1 bg-transparent text-sm text-zinc-100 focus:outline-none" aria-label="Console command (Tab completes, arrows browse history)" />
        </form>
      </div>
    </BottomDrawer>
  );
}
