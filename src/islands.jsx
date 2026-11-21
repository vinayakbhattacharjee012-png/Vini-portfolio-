// Mounts the new features into the existing page. Each one renders inside its own shadow root,
// so the page's CSS and these components can't break each other, while the page's theme tokens
// still flow in. If this script fails to load, the original page works exactly as before.
import { StrictMode, Suspense, lazy, startTransition, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { AppProvider, useApp } from "./lib/app";
import { isTyping, scrollToId } from "./lib/utils";
import { attach, syncCalm } from "./lib/mount";
import { Lab, SnippetModal } from "./components/lab/Lab";
import { Impact } from "./components/impact/Impact";
import { StartBuild } from "./components/contact/Contact";
import { QrModal } from "./components/ui/QrModal";
import { Sweep } from "./components/ui/Sweep";

const TelemetryDrawer = lazy(() => import("./components/telemetry/TelemetryDrawer"));
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const GAUGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14l4-4M3.3 17a9 9 0 1 1 17.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function Overlays() {
  const { overlay } = useApp();
  if (overlay?.name === "telemetry") return <Suspense fallback={null}><TelemetryDrawer tab={overlay.tab} /></Suspense>;
  if (overlay?.name === "qr") return <QrModal />;
  if (overlay?.name === "snippet") return <SnippetModal />;
  return null;
}

const page = (href) => () => { location.href = href; };

// Adds the new features to the page's command palette, terminal, nav and footer (once).
function register(a, center, go) {
  (window.__cmds = window.__cmds || []).push(
    { t: "Command Center: live telemetry", d: "Apex-Fit, Polo triage, raid sim and trade calc · Alt+T", k: "command center telemetry sandbox dashboard stress test fps export", run: center() },
    { t: "Apex-Fit simulator", d: "Heart rate, pace and stamina sliders with a live chart", k: "apex fit heart rate pace stamina sim", run: center("apex") },
    { t: "Polo triage demo", d: "Guardrail checks and red-flag escalation", k: "polo health ai triage guardrail demo", run: center("polo") },
    { t: "Raid simulator", d: "Trigger a raid and watch the anti-nuke stack contain it", k: "raid anti nuke discord security shield sim", run: center("shield") },
    { t: "Trade value calculator", d: "Live ratio, margin and fair-trade verdict", k: "trade calculator margin ratio value galaxy", run: center("trade") },
    { t: "Go to the Lab", d: "How I build: pipeline, guardrails, fallback router", k: "lab architecture workflow guardrail pipeline lighthouse recommender", run: go("lab") },
    { t: "Go to Impact", d: "Stats, timeline, roadmap and lessons", k: "impact metrics milestones timeline roadmap lessons heatmap", run: go("impact") },
    { t: "Start a build", d: "Send a project brief", k: "hire inquiry brief collaborate form faq availability", run: go("build") },
    { t: "QR code", d: "Scan to open this site on your phone", k: "qr phone mobile scan", run: () => a().open("qr") },
    { t: "Command Center page", d: "Full screen: all four sandboxes at once", k: "command center page full screen dashboard all sims", run: page("command-center.html") },
    { t: "All features", d: "Every feature with a link, plus the test results", k: "features list everything catalogue tests summary", run: page("features.html") },
    { t: "Case studies", d: "Each project: the problem, the build, where it stands", k: "work case studies projects results portfolio", run: page("work.html") },
    { t: "Services", d: "What you can hire me for", k: "services hire offer bots security moderation website edits ads", run: page("services.html") },
    { t: "Galaxy network", d: "Five brands, treaties and advertising", k: "galaxy network community brands treaty charter advertise ads", run: page("galaxy.html") },
    { t: "Brand kit", d: "Logo, colours, fonts and bio", k: "brand kit logo colours colors fonts press bio", run: page("brand.html") },
    { t: "Hire me", d: "Send a brief, or reach me by email or Discord", k: "hire contact brief email discord work together project", run: page("contact.html") },
  );

  const f = window.__fx || {};
  if (f.cmds && f.print) {
    const help = f.cmds.help, sudo = f.cmds.sudo;
    const leave = () => f.closeTerminal?.(false);
    f.cmds.help = (x) => { help?.(x); f.print("o", "  center           open the Command Center\n  run <sim>        apex-sim | polo | raid | trade\n  qr               QR code for your phone\n  features         every feature on this site\n  work · services · network · brand · hire   open a page"); };
    f.cmds.center = () => { leave(); center()(); };
    f.cmds.run = (x) => {
      const tab = { "apex-sim": "apex", apex: "apex", polo: "polo", raid: "shield", trade: "trade" }[x];
      if (!tab) return f.print("w", "usage: run apex-sim | polo | raid | trade");
      leave(); center(tab)();
    };
    f.cmds.qr = () => { leave(); a().open("qr"); };
    f.cmds.features = page("features.html");
    for (const [cmd, href] of [["work", "work.html"], ["services", "services.html"], ["network", "galaxy.html"], ["brand", "brand.html"], ["hire", "contact.html"]]) if (!f.cmds[cmd]) f.cmds[cmd] = page(href);
    f.cmds.sudo = (x) => {
      if (x !== "hack") return sudo?.(x);
      a().setSweep((n) => n + 1);
      f.print("g", "[sudo] access granted… running a holographic diagnostic sweep. all systems nominal.");
    };
  }

  // Nav: a Command Center button styled like the search button next to it.
  const search = document.getElementById("searchBtn");
  if (search) {
    const b = document.createElement("button");
    Object.assign(b, { type: "button", id: "centerBtn", className: "search-btn", title: "Command Center · Alt T", innerHTML: GAUGE });
    b.setAttribute("aria-label", "Command Center (Alt+T)");
    b.addEventListener("click", center());
    search.after(b);
  }
  // Footer links.
  const foot = document.querySelector(".foot-links");
  for (const [label, run] of [["Command Center", center()], ["QR code", () => a().open("qr")], ["All features", page("features.html")]]) {
    const b = document.createElement("button");
    Object.assign(b, { type: "button", className: "linkish", textContent: label });
    b.addEventListener("click", run);
    foot?.append(b);
  }
}

let registered = false; // StrictMode runs effects twice in dev; register with the page only once

function Bridge() {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;
  useEffect(() => {
    const a = () => latest.current;
    const center = (tab = "apex") => () => a().open("telemetry", { tab });
    const go = (id) => () => scrollToId(id, a().reduced);
    window.__vx = { open: (name, payload) => a().open(name, payload) };
    if (!registered) { registered = true; register(a, center, go); }

    // Alt+T toggles the Command Center (browsers keep Ctrl+T for new tabs). The Konami code runs a sweep.
    const seq = [];
    const onKey = (e) => {
      if (e.altKey && e.code === "KeyT") { e.preventDefault(); return a().overlay?.name === "telemetry" ? a().close() : center()(); }
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      seq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (seq.length > KONAMI.length) seq.shift();
      if (seq.join() === KONAMI.join()) { seq.length = 0; a().setSweep((n) => n + 1); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  return null;
}

function Islands({ boxes }) {
  return (
    <AppProvider>
      {createPortal(<Lab />, boxes.lab)}
      {createPortal(<Impact />, boxes.impact)}
      {createPortal(<StartBuild />, boxes.build)}
      <Overlays />
      <Sweep />
      <Bridge />
    </AppProvider>
  );
}

const hosts = ["lab", "impact", "build"].map((id) => document.getElementById(id));
function mount() {
  const layer = document.createElement("div");
  layer.className = "vx-host";
  document.body.append(layer);
  const boxes = Object.fromEntries(hosts.map((h) => [h.id, attach(h)]));
  syncCalm([...hosts, layer]);
  const root = createRoot(attach(layer));
  // A transition lets React render in small slices instead of one long task.
  startTransition(() => root.render(<StrictMode><Islands boxes={boxes} /></StrictMode>));
}
// Mount after the page has loaded, so the loading screen and hero never wait on React.
if (hosts.every(Boolean)) {
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(mount, { timeout: 500 }) : setTimeout(mount, 50));
  if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
}
