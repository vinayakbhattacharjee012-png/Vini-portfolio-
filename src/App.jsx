import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { sections } from "./data/portfolioData";
import { AppProvider, useApp } from "./lib/app";
import { isTyping, scrollToId } from "./lib/utils";
import { Navbar, useActiveSection } from "./components/hud/Navbar";
import { BackToTop, CornerHud, DiagnosticSweep, ScrollProgress } from "./components/hud/HudBits";
import { CommandPalette, SettingsPanel } from "./components/hud/CommandPalette";
import { Hero, QrModal } from "./components/hero/Hero";
import { ProjectDrawer, Projects } from "./components/projects/Projects";
import { Skills } from "./components/skills/Skills";
import { Lab, SnippetModal } from "./components/lab/Lab";
import { Impact } from "./components/impact/Impact";
import { Contact, Dossier, Footer } from "./components/contact/Contact";
import { Toast } from "./components/ui/Section";

// Heavy, interaction-only pieces load on first use.
const TelemetryDrawer = lazy(() => import("./components/telemetry/TelemetryDrawer"));
const DevConsole = lazy(() => import("./components/terminal/DevConsole").then((m) => ({ default: m.DevConsole })));

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function Hotkeys() {
  const { overlay, open, close, prefs, setPref, setSweep, reduced, toast } = useApp();
  const seq = useRef([]);
  useEffect(() => {
    function onKey(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); return overlay?.name === "palette" ? close() : open("palette"); }
      // Browsers keep Ctrl+T for new tabs, so Alt+T is the shortcut that always works.
      if ((e.altKey && e.code === "KeyT") || (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "t")) { e.preventDefault(); return overlay?.name === "telemetry" ? close() : open("telemetry", { tab: "apex" }); }
      if (e.altKey && e.code === "KeyM") { e.preventDefault(); setPref("reduced", !prefs.reduced); return toast(prefs.reduced ? "Motion on" : "Reduced motion on"); }
      if (isTyping(e) || mod || e.altKey) return;
      if (e.key === "`" || e.key === "~") { e.preventDefault(); return overlay?.name === "console" ? close() : open("console"); }
      seq.current = [...seq.current, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (seq.current.join() === KONAMI.join()) { seq.current = []; setSweep((n) => n + 1); return; }
      if (!overlay) { const s = sections.find((x) => x.key === e.key); if (s) { e.preventDefault(); scrollToId(s.id, reduced); } }
    }
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [overlay, open, close, prefs.reduced, setPref, setSweep, reduced, toast]);
  return null;
}

function Overlays() {
  const { overlay } = useApp();
  if (!overlay) return null;
  switch (overlay.name) {
    case "palette": return <CommandPalette />;
    case "settings": return <SettingsPanel />;
    case "qr": return <QrModal />;
    case "snippet": return <SnippetModal />;
    case "project": return <ProjectDrawer id={overlay.id} />;
    case "telemetry": return <Suspense fallback={null}><TelemetryDrawer tab={overlay.tab} /></Suspense>;
    case "console": return <Suspense fallback={null}><DevConsole /></Suspense>;
    default: return null;
  }
}

function PrintDossier() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const go = () => setOn(true), done = () => setOn(false);
    addEventListener("vini:dossier", go); addEventListener("afterprint", done);
    return () => { removeEventListener("vini:dossier", go); removeEventListener("afterprint", done); };
  }, []);
  useEffect(() => { if (on) requestAnimationFrame(() => window.print()); }, [on]);
  return on ? <Dossier /> : null;
}

function Shell() {
  const { toastState } = useApp();
  const active = useActiveSection();
  return (
    <>
      <a href="#builds" className="fixed left-3 top-3 z-[90] -translate-y-20 rounded-full bg-c1 px-4 py-2 text-sm font-semibold text-black focus:translate-y-0">Skip to builds</a>
      <div className="bg-ambient" aria-hidden="true" />
      <ScrollProgress />
      <Navbar />
      <main id="main">
        <Hero />
        <Projects />
        <Skills />
        <Lab />
        <Impact />
        <Contact />
      </main>
      <Footer />
      <CornerHud active={active} />
      <BackToTop />
      <Overlays />
      <Hotkeys />
      <DiagnosticSweep />
      <PrintDossier />
      <Toast state={toastState} />
    </>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
