import { CommandCenter } from "../components/telemetry/TelemetryDrawer";
import { mountPage } from "./page";

mountPage("command-center", (
  <section className="py-12 sm:py-16">
    <div className="mx-auto max-w-[1120px] px-4">
      <div className="anim-pop mb-8 grid max-w-[70ch] gap-2.5">
        <p className="eyebrow">Command Center</p>
        <h1 className="sec-title">All four sandboxes, live at once</h1>
        <p className="text-zinc-400">Apex-Fit telemetry, Polo triage, the raid simulator and the trade calculator share one live system panel. Everything is simulated in your browser: no server, no API keys.</p>
      </div>
      <CommandCenter all />
    </div>
  </section>
));
