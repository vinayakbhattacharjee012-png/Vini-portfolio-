// Every project, skill and line of copy on the site lives in this file.
// Edit here; the components only render what they find.

export const site = {
  name: "Vini",
  url: "https://vini-portfolio-galaxy.netlify.app/",
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

export const sections = [
  { id: "home", label: "Home", key: "1" },
  { id: "builds", label: "Builds", key: "2" },
  { id: "skills", label: "Skills", key: "3" },
  { id: "lab", label: "Lab", key: "4" },
  { id: "impact", label: "Impact", key: "5" },
  { id: "contact", label: "Contact", key: "6" },
];

// Simulated: shown with a "simulated" tag wherever they appear.
export const vitals = { uptime: 99.98, latencyMs: 14, nodes: 4 };

export const categories = [
  { id: "all", label: "All Builds" },
  { id: "ai", label: "AI & Health" },
  { id: "telemetry", label: "Telemetry & Sports" },
  { id: "bots", label: "Bots & Automation" },
  { id: "web", label: "Web Engines" },
];

// repo: public URL, or null for a private repo (the card then offers "ask for access").
// sandbox: which Command Center tab demos it (null = none).
export const projects = [
  // CHECK: written from your brief. Make sure the summary, stack and links match the real Apex-Fit project.
  {
    id: "apex-fit",
    name: "Apex-Fit Telemetry Engine",
    category: "telemetry",
    featured: "waveform",
    status: "Iterating",
    summary: "Streams heart rate, pace and stamina load into one live performance read-out.",
    metrics: ["10 Hz stream", "5 HR zones", "Auto load index"],
    stack: ["React", "TypeScript", "SVG charts", "Vite"],
    repo: null,
    live: null,
    sandbox: "apex",
    problem: "Raw sensor numbers are noisy and arrive faster than people can read them.",
    design: "A fixed-size ring buffer smooths each signal, derives zones and a load index, and paints only what changed.",
    outcomes: ["Readable at a glance during a sprint", "Constant memory however long the session runs", "Works fully offline"],
    topology: ["Wearable / sliders", "Edge smoothing", "Load engine", "Session state"],
  },
  {
    id: "polo",
    name: "Polo Health AI",
    category: "ai",
    featured: "triage",
    status: "In design",
    summary: "A health AI app for structured wellness check-ins, with clinical safety guardrails built in.",
    metrics: ["Guardrails first", "Structured output", "Red-flag escalation"],
    stack: ["Claude", "System prompts", "JSON schema", "Python"],
    repo: null,
    live: null,
    sandbox: "polo",
    problem: "General chatbots answer health questions confidently, including the ones they should hand to a doctor.",
    design: "Every message passes red-flag checks before the model; answers come back as validated JSON with a disclaimer attached.",
    outcomes: ["Urgent symptoms are always escalated", "Advice stays in the wellness lane", "Every answer is structured and auditable"],
    topology: ["Mobile client", "Guardrail edge", "Triage model", "Check-in history"],
  },
  {
    id: "nova-eclipse",
    name: "Nova 3.0 & Eclipse Discord Bots",
    category: "bots",
    status: "Live",
    summary: "Python bots for verification, leveling, anti-spam and anti-raid, running in live communities.",
    metrics: ["31 slash commands", "6 cogs", "/health keep-alive"],
    stack: ["Python", "discord.py", "Render", "UptimeRobot"],
    repo: "https://github.com/vinayakbhattacharjee012-png/Bot-eclipse",
    live: null,
    sandbox: "shield",
    problem: "Raids and spam hit faster than human moderators can react.",
    design: "Join-burst detection, rate limits and a containment role act in seconds; ownership sits in a separate Vault Account.",
    outcomes: ["Raids contained automatically", "Verification survives restarts", "Uptime watched around the clock"],
    topology: ["Discord gateway", "Event router", "Cogs engine", "Guild state"],
  },
  // CHECK: the trading-calculator details and stack are from your brief; adjust to the real tool.
  {
    id: "galaxy",
    name: "Galaxy Empire & Trading Calculators",
    category: "bots",
    status: "Live",
    summary: "A five-brand Discord network with trade-value tools that balance offers in real time.",
    metrics: ["2,000+ members", "5 brands", "Live valuation"],
    stack: ["Community ops", "Governance", "JavaScript"],
    repo: null,
    live: "https://discord.gg/JJkyD2Rhc",
    sandbox: "trade",
    problem: "Trades stall when nobody can tell quickly whether an offer is fair.",
    design: "Item values and a ratio check give both sides the same number; the network's charters keep partner servers aligned.",
    outcomes: ["Instant fair / overpay verdict", "Merger charter and treaty in force", "Moderated with a layered bot stack"],
    topology: ["Members", "Bot commands", "Valuation logic", "Item value table"],
  },
  {
    id: "apex-sports",
    name: "Apex Sports Hub",
    category: "web",
    status: "Live",
    summary: "A broadcast-style football and cricket dashboard with live scores, tables and an AI match assistant.",
    metrics: ["ESPN + fallbacks", "30 s live polling", "Grounded AI news"],
    stack: ["React", "TypeScript", "Tailwind", "Node", "Gemini"],
    repo: "https://github.com/vinayakbhattacharjee012-png/Vini-portfolio-/tree/ccr-fa6484c7-g9hs8j/apex-sports-hub",
    live: "https://apex-sports-hub.onrender.com",
    sandbox: null,
    problem: "Free sports APIs go down or rate-limit at the worst moment.",
    design: "Each endpoint tries its sources in order, caches the last good answer and labels sample data clearly.",
    outcomes: ["Keeps working when a source fails", "API key never reaches the browser", "Pauses polling in background tabs"],
    topology: ["Browser", "Node API", "Source chain", "Response cache"],
  },
  {
    id: "portfolio",
    name: "This Portfolio",
    category: "web",
    status: "Live",
    summary: "A static, keyboard-first portfolio: command palette, live sandboxes and zero runtime API keys.",
    metrics: ["0 API keys", "Hash routing", "Lazy sandboxes"],
    stack: ["React", "Tailwind", "Vite", "Canvas"],
    repo: "https://github.com/vinayakbhattacharjee012-png/Vini-portfolio-",
    live: "https://vini-portfolio-galaxy.netlify.app/",
    sandbox: null,
    problem: "A résumé can say \"interactive\"; it can't prove it.",
    design: "One data file drives every section; heavy canvases and sandboxes only load when you reach them.",
    outcomes: ["Deploys to any static host", "Works with JavaScript-light devices", "Edit one file to update it"],
    topology: ["Visitor", "Static CDN", "React islands", "portfolioData.js"],
  },
];

export const skillTabs = [
  { id: "frontend", label: "Frontend & UI Systems" },
  { id: "python", label: "Python & Backend Engines" },
  { id: "ai", label: "AI, LLMs & RAG Pipelines" },
  { id: "automation", label: "Automation & Bot Security" },
  { id: "devops", label: "DevOps, Git & Static Hosting" },
];

// tier: Core (daily), Production (shipped with it), Prototyping (built prototypes with it)
export const skills = [
  { name: "React", tab: "frontend", use: "Component UIs", tier: "Production", projects: ["apex-fit", "apex-sports", "portfolio"] },
  { name: "TypeScript", tab: "frontend", use: "Typed front ends", tier: "Production", projects: ["apex-fit", "apex-sports"] },
  { name: "Tailwind CSS", tab: "frontend", use: "Design systems", tier: "Production", projects: ["apex-sports", "portfolio"] },
  { name: "HTML, CSS & JS", tab: "frontend", use: "Zero-build pages", tier: "Core", projects: ["portfolio", "galaxy"] },
  { name: "SVG & Canvas", tab: "frontend", use: "Live diagrams", tier: "Production", projects: ["apex-fit", "portfolio"] },
  { name: "Vite", tab: "frontend", use: "Static builds", tier: "Production", projects: ["apex-fit", "apex-sports", "portfolio"] },

  { name: "Python", tab: "python", use: "Bots & services", tier: "Core", projects: ["nova-eclipse", "polo"] },
  { name: "discord.py", tab: "python", use: "Slash commands, cogs", tier: "Core", projects: ["nova-eclipse"] },
  { name: "Node.js", tab: "python", use: "API servers", tier: "Production", projects: ["apex-sports"] },
  { name: "REST APIs", tab: "python", use: "Source chains", tier: "Production", projects: ["apex-sports"] },
  { name: "Caching & fallbacks", tab: "python", use: "Resilience", tier: "Production", projects: ["apex-sports", "nova-eclipse"] },

  { name: "Claude", tab: "ai", use: "Prompting & personas", tier: "Core", projects: ["polo"] },
  { name: "Gemini + Search grounding", tab: "ai", use: "Cited answers", tier: "Production", projects: ["apex-sports"] },
  { name: "Safety guardrails", tab: "ai", use: "Red-flag escalation", tier: "Core", projects: ["polo"] },
  { name: "Structured output", tab: "ai", use: "JSON schemas", tier: "Production", projects: ["polo", "apex-sports"] },
  { name: "AI builders", tab: "ai", use: "Bolt, Lovable, Replit, Base44", tier: "Prototyping", projects: ["portfolio"] },

  { name: "Anti-nuke & raid defense", tab: "automation", use: "8-bot layered stack", tier: "Core", projects: ["nova-eclipse", "galaxy"] },
  { name: "Permission architecture", tab: "automation", use: "Least privilege", tier: "Core", projects: ["nova-eclipse", "galaxy"] },
  { name: "Automod tuning", tab: "automation", use: "Fewer false positives", tier: "Core", projects: ["nova-eclipse"] },
  { name: "Verification flows", tab: "automation", use: "Button views", tier: "Production", projects: ["nova-eclipse"] },
  { name: "Bot testing", tab: "automation", use: "Sandbox before live", tier: "Core", projects: ["nova-eclipse"] },

  { name: "Git & GitHub", tab: "devops", use: "Branches & reviews", tier: "Production", projects: ["portfolio", "apex-sports"] },
  { name: "Render", tab: "devops", use: "Bots & web services", tier: "Production", projects: ["nova-eclipse", "apex-sports"] },
  { name: "Netlify", tab: "devops", use: "Static hosting", tier: "Production", projects: ["portfolio"] },
  { name: "UptimeRobot", tab: "devops", use: "Uptime & latency alerts", tier: "Production", projects: ["nova-eclipse"] },
  { name: "Static edge deploys", tab: "devops", use: "Hash-routed SPAs", tier: "Production", projects: ["portfolio"] },
];

export const synergies = [
  { title: "Python + discord.py + guardrails", text: "Bots that act in seconds but never touch ownership: cogs for features, a Vault Account for safety." },
  { title: "React + Tailwind + static edge", text: "Fast UIs with no server to babysit: build once, serve from a CDN, deep-link with hashes." },
  { title: "Claude + JSON schema + red flags", text: "Health answers that are structured, checked and escalated when they should be." },
];

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

// CHECK: replace with your actual setup.
export const devEnv = ["Windows & Linux", "Git + GitHub", "Node 22 + Vite", "Python 3", "Browser-first AI builders"];

export const lessons = [
  { title: "Rate limits are a feature", text: "Bots that respect Discord's limits never get banned mid-raid. Queue, back off, retry." },
  { title: "Ownership never moderates", text: "The account that owns a server should never hold a bot token or click a ban button." },
  { title: "Test in a sandbox server", text: "Every command runs against a copy of the server before it touches real members." },
  { title: "Free APIs fail at kickoff", text: "Chain sources, cache the last good answer, and say clearly when data is a sample." },
  { title: "Monitor, don't hope", text: "A /health route plus an uptime monitor turns silent outages into alerts." },
];

export const media = {
  title: "Media & creative engineering",
  text: "European football and La Liga highlight edits, cut to the beat, with original soundtracks I produce in Google Flow Music.",
  tags: ["Beat-synced cuts", "Velocity curves", "Original scores"],
};

export const community = {
  title: "Community leadership & anti-nuke systems",
  text: "Moderation for servers from 40k to 90k members, and a five-brand network I founded and run.",
  points: ["8-bot layered defense", "Vault Account isolation", "Charters & treaties"],
};

export const faq = [
  { q: "What's your usual stack?", a: "React, Tailwind and Vite on the front end; Python and discord.py for bots; Node for small APIs; Claude and Gemini for AI features." },
  { q: "How fast can you turn things around?", a: "It depends on scope. Tell me what you need in the form and I'll reply with a realistic plan before anything starts." },
  { q: "Are you open to collaboration or open source?", a: "Yes. Bots, UI revamps and AI prototypes are my favourite collaborations. Send a short brief and we'll take it from there." },
  { q: "Do you need API keys or a server for my site?", a: "Not for static sites like this one. When a feature needs a key, it lives on a server, never in the browser." },
];

export const projectTypes = ["Web App", "AI Prototype", "Discord Bot", "UI Revamp"];

// Measured with Lighthouse on the production build; update after re-running it.
export const lighthouse = { performance: 95, accessibility: 100, bestPractices: 100, seo: 100, measured: "Nov 2026 · mobile" };
