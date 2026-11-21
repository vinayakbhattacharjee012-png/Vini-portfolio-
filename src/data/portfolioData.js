// Content for the Command Center, Lab, Impact and Start-a-build sections.
// Edit here; the components only render what they find.

export const site = {
  name: "Vini",
  url: "https://vini-portfolio.onrender.com/",
  version: "v2.6.0-static",
  tagline: "I build AI tools, Discord systems and the communities they run in.",
  roles: ["Full-Stack AI Builder", "Telemetry & Systems Architect", "Discord Automation Engineer", "Interactive Web Prototyper"],
  status: "SYSTEM ONLINE • AVAILABLE FOR BUILDS",
  summary:
    "I design health AI with safety guardrails, ship Python Discord bots that run in live communities, and run a five-brand network. I've moderated servers as big as 90,000 members, so security comes first.",
  license: "© 2026 Vini · All rights reserved",
};

export const contact = {
  email: "vini.official.netops@gmail.com",
  discord: "daring_lynx_05522",
  github: "https://github.com/vinayakbhattacharjee012-png",
  discordServer: "https://discord.gg/JJkyD2Rhc", // Galaxy Empire
  robloxServer: "https://discord.gg/vtacNP4kG",
  timezone: "Asia/Kolkata",
  // Hours (IST, 24h) when I usually reply fastest. Change to your real hours.
  availability: { start: 17, end: 23, label: "Evenings IST, every day" },
};

export const pipeline = [
  { id: "spec", title: "Spec & Graph Map", tools: ["Requirements list", "Knowledge graph of the codebase", "User flows"], target: "1 page spec", checks: ["Every feature has an owner file", "Edge cases written down first"] },
  { id: "arch", title: "Lean Architecture", tools: ["One data file", "Small components", "No framework I don't need"], target: "< 100 kB JS gzip", checks: ["No duplicated state", "Every dependency justified"] },
  { id: "guard", title: "Guardrails & Sim", tools: ["Input validation", "Simulators with mock data", "Sandbox servers"], target: "0 unsafe paths", checks: ["Red-flag tests pass", "Raid simulation contained"] },
  { id: "ship", title: "Static Edge Deploy", tools: ["Vite build", "Netlify / Render", "UptimeRobot"], target: "< 50 ms UI response", checks: ["Lighthouse run", "Uptime monitor armed"] },
];

export const blueprints = {
  "Discord bot": { layers: ["discord.py client", "Cogs per feature", "SQLite or JSON state", "/health endpoint"], host: "Render + UptimeRobot", note: "Keep ownership in a separate Vault Account." },
  "AI prototype": { layers: ["Static UI", "Guardrail layer", "Model API via server", "Structured JSON output"], host: "Render web service", note: "API keys stay on the server, never in the browser." },
  "Web app": { layers: ["React + Tailwind", "Small Node API", "Source chain + cache", "Hash routing"], host: "Render or Netlify", note: "Label sample data whenever a source fails." },
  "Portfolio / landing": { layers: ["Static HTML or Vite", "One data file", "Lazy interactive islands", "Print stylesheet"], host: "Netlify, Vercel or GitHub Pages", note: "No runtime keys, so it can live on any CDN." },
};

export const stats = [
  { value: 2000, suffix: "+", label: "community members managed" },
  { value: 10, suffix: "+", label: "shipped prototypes" },
  { value: 50, prefix: "<", suffix: "ms", label: "UI latency target" },
];

export const timeline = [
  { title: "Junior moderator, 90,000-member Roblox community", tag: "Moderation", detail: "Learned large-scale moderation: case logs, appeals and calm under raids." },
  { title: "Founded the Galaxy network", tag: "Community", detail: "Five brands, 1.5k–2k members, a merger charter with Zen Services and the Project RMC treaty." },
  { title: "Designed a layered security grid", tag: "Security", detail: "Anti-nuke, automod and containment bots, with ownership isolated in a Vault Account." },
  { title: "Shipped Nova 3.0 Ultimate", tag: "Bots", detail: "Verification views, leveling, anti-spam and AFK tracking, live in communities." },
  { title: "Started Polo, a health AI app", tag: "AI", detail: "Guardrails designed before the prototype: red flags escalate, answers stay structured." },
  { title: "Launched Apex Sports Hub", tag: "Web", detail: "Live football and cricket with fallbacks, caching and grounded AI news." },
  { title: "Portfolio v2.6: static command center", tag: "Now", detail: "Command palette, live sandboxes and zero runtime API keys." },
];

// CHECK: rough progress estimates. Set your real numbers.
export const roadmap = [
  { name: "Polo Health AI", stage: "Design → prototype", progress: 35 },
  { name: "Eclipse bot", stage: "Building cogs", progress: 60 },
  { name: "Apex-Fit telemetry", stage: "Iterating", progress: 75 },
];

export const principles = [
  { title: "Speed over bloat", text: "Every dependency has to earn its bytes. Fast beats fancy." },
  { title: "Interactive proof over static résumés", text: "If I say a system works, there's a sandbox you can poke." },
  { title: "Guardrails by default", text: "Safety, permissions and fallbacks go in before features." },
];

export const devEnv = ["Lenovo ThinkPad X270", "Core i5 · 16 GB RAM", "External monitor", "Multi-device workflow", "Python + Node", "Git + GitHub"];

export const lessons = [
  { title: "Rate limits are a feature", text: "Bots that respect Discord's limits never get banned mid-raid. Queue, back off, retry." },
  { title: "Ownership never moderates", text: "The account that owns a server should never hold a bot token or click a ban button." },
  { title: "Test in a sandbox server", text: "Every command runs against a copy of the server before it touches real members." },
  { title: "Free APIs fail at kickoff", text: "Chain sources, cache the last good answer, and say clearly when data is a sample." },
  { title: "Monitor, don't hope", text: "A /health route plus an uptime monitor turns silent outages into alerts." },
];

export const faq = [
  { q: "What's your usual stack?", a: "React, Tailwind and Vite on the front end; Python and discord.py for bots; Node for small APIs; Claude and Gemini for AI features." },
  { q: "How fast can you turn things around?", a: "It depends on scope. Tell me what you need in the form and I'll reply with a realistic plan before anything starts." },
  { q: "Are you open to collaboration or open source?", a: "Yes. Bots, UI revamps and AI prototypes are my favourite collaborations. Send a short brief and we'll take it from there." },
  { q: "Do you need API keys or a server for my site?", a: "Not for static sites like this one. When a feature needs a key, it lives on a server, never in the browser." },
];

export const projectTypes = ["Web App", "AI Prototype", "Discord Bot", "UI Revamp"];

// Measured with Lighthouse on the production build; update after re-running it.
export const lighthouse = { performance: 80, accessibility: 97, bestPractices: 100, seo: 100, measured: "Nov 2026 · mobile" };
