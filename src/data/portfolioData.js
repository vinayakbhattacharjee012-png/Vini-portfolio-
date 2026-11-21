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

// ---------------- Client pages: Work, Services, Galaxy, Hire me ----------------
// Everything below restates what the homepage already says; no invented clients, quotes or prices.
// `type` is the label the Hire me form uses (contact.html?type=...).

export const services = [
  { id: "bots", type: "Discord bot", code: "BOT", title: "Custom Discord bots", pitch: "Python bots that run your server for you, tested in a sandbox before they go live.",
    gets: ["Button verification that survives restarts", "Leveling, XP, level roles and leaderboards", "Anti-spam, join-burst anti-raid and AFK", "Moderation slash commands, split into cogs", "Hosting on Render with uptime alerts"],
    proof: "Nova 3.0 Ultimate is live in real servers; Eclipse ships 31 slash commands in 6 cogs.", link: ["Case studies", "work.html#nova"] },
  { id: "security", type: "Server security", code: "SEC", title: "Server security setup", pitch: "A layered defence so raids and rogue staff can't take your server down.",
    gets: ["Anti-nuke layer: Wick, Bravers, Security Bot, Krypton", "Automod and logging: Dyno, Carl-bot, Sapphire", "JailBot containment for problem accounts", "Ownership moved to a separate Vault Account", "Least-privilege roles and a raid simulation test"],
    proof: "The same 8-bot grid protects the Galaxy network.", link: ["See the raid simulator", "./#security"] },
  { id: "moderation", type: "Moderation", code: "MOD", title: "Moderation & community management", pitch: "Staff, structure and rules that keep a big community healthy.",
    gets: ["Moderation team structure and roles", "Case logs and an appeals process", "Automod tuning for fewer false positives", "Governance, mergers and partnerships"],
    proof: "Senior Moderator for a 40,000-member server, Junior Moderator for 90,000, founder of a five-brand network.", link: ["How I moderate", "./#process"] },
  { id: "web", type: "Website or AI", code: "WEB", title: "Websites & AI prototypes", pitch: "Fast single-page sites, dashboards and AI prototypes with guardrails built in.",
    gets: ["Landing pages and portfolios", "Live dashboards with fallback data sources", "AI features with safety checks and structured output", "Deploy, domain and uptime monitoring"],
    proof: "Apex Sports Hub is live; this portfolio is built and tested the same way.", link: ["Apex Sports Hub case study", "work.html#apex-sports"] },
  { id: "edits", type: "Football edit", code: "CUT", title: "Football edits & soundtracks", pitch: "Highlight edits cut to the beat, with music written for the edit.",
    gets: ["European football and La Liga highlights", "Beat-synced cuts and velocity speed ramps", "Original background scores (Google Flow Music)"],
    proof: "Every cut lands on the music, and the music is written for the edit.", link: ["See the edit timeline", "./#creative"] },
  { id: "ads", type: "Advertising", code: "AD", title: "Advertising on the Galaxy network", pitch: "Put your server, brand or project in front of 1.5k–2k members across five communities.",
    gets: ["Announcement post", "Ongoing partnership", "Custom campaign for a launch, event or giveaway", "Pay in INR or crypto"],
    proof: "Rates on request; nothing goes live until the details are agreed.", link: ["Advertising options", "galaxy.html#advertise"] },
];

export const process = [
  { title: "Send a brief", text: "Use the form or email. Say what you need and when." },
  { title: "Agree the plan", text: "I reply by email with questions, then we agree scope, timing and price." },
  { title: "Build and test", text: "Bots run through attacks in a private sandbox server before touching a live community." },
  { title: "Launch and monitor", text: "It goes live, and uptime and latency are watched so problems turn into alerts." },
];

export const caseStudies = [
  { id: "galaxy", tag: "Community", status: "Running", title: "The Galaxy network", role: "Founder & director",
    challenge: "Five community brands needed to work as one network without losing their own identities.",
    approach: "Built a shared network with common staff and security, merged Zen Services into Galaxy Empire through a merger charter, and bound Project RMC to the network with the Treaty of Declaration.",
    result: "A five-brand Discord ecosystem of 1.5k–2k members, with its own advertising arm.",
    stats: [["1.5k–2k", "members"], ["5", "brands"], ["2", "treaties"]], stack: ["Governance", "Staff leadership", "Partnerships"],
    links: [["Join Galaxy Empire", "https://discord.gg/JJkyD2Rhc"], ["Network map", "./#community"]] },
  { id: "security", tag: "Security", status: "In use", title: "A layered defence grid", role: "Server security architect",
    challenge: "Raids and permission escalations hit faster than human moderators can react, and one compromised staff account can wreck a server.",
    approach: "Four rings: anti-nuke bots on the outside, automod and logging inside that, JailBot containment for problem accounts, and server ownership isolated in a Vault Account that never moderates.",
    result: "Attacks have to get through several bot layers, and ownership stays out of reach.",
    stats: [["8", "security bots"], ["4", "rings"], ["90k", "largest server moderated"]], stack: ["Wick", "Bravers", "Dyno", "Carl-bot", "Sapphire", "JailBot"],
    links: [["Run the raid simulator", "./#security"], ["Raid sim in the Command Center", "command-center.html"]] },
  { id: "nova", tag: "Discord bot", status: "Live", title: "Nova 3.0 Ultimate", role: "Bot developer",
    challenge: "Communities wanted verification, leveling, anti-spam and AFK in one bot instead of five.",
    approach: "A multi-purpose Python bot: every member passes a button verification view, then leveling, anti-spam and AFK modules run side by side.",
    result: "Running in live servers.",
    stats: [["4", "core modules"], ["live", "in communities"]], stack: ["Python", "discord.py", "Button views"],
    links: [["Run the Nova simulation", "./#sim-nova"]] },
  { id: "eclipse", tag: "Discord bot", status: "In progress", title: "Eclipse", role: "Bot developer",
    challenge: "Moderation, anti-raid, leveling and verification had to survive restarts and stay easy to extend.",
    approach: "A discord.py bot built on slash commands and split into six self-contained cogs, with a /health keep-alive for the host.",
    result: "31 slash commands across 6 cogs: kick, ban, timeout, warnings, purge, lock and slowmode; automatic anti-spam and join-burst anti-raid; XP, level roles and leaderboard; restart-proof button verification and AFK.",
    stats: [["31", "slash commands"], ["6", "cogs"]], stack: ["Python", "discord.py", "Render", "UptimeRobot"],
    links: [["Architecture map", "./#arch-eclipse"], ["Source on GitHub", "https://github.com/vinayakbhattacharjee012-png/Bot-eclipse"]] },
  { id: "apex-sports", tag: "Website", status: "Live", title: "Apex Sports Hub", role: "Builder",
    challenge: "A sports site needs live scores and tables, but free data sources go down or rate-limit at the worst moment.",
    approach: "React, TypeScript and Tailwind on the front, a small Node API behind it. Each endpoint tries ESPN and other sources in order, caches the last good answer, and Gemini with Google Search adds grounded news.",
    result: "Live: scores, tables, a match centre and an AI match assistant.",
    stats: [["live", "site"], ["30 s", "refresh while matches are live"]], stack: ["React", "TypeScript", "Tailwind", "Node", "Gemini"],
    links: [["Open the live site", "https://apex-sports-hub.onrender.com"]] },
  { id: "polo", tag: "Health AI", status: "In design", title: "Polo", role: "Product designer & builder",
    challenge: "Health chatbots answer confidently, including the questions they should hand to a doctor.",
    approach: "Safety guardrails designed before the prototype: structured wellness workflows, with clinical safety checks built into the product.",
    result: "In product design and build.",
    stats: [], stack: ["Claude", "Guardrails", "Product design"],
    links: [["Run the Polo simulation", "./#sim-polo"], ["Triage demo", "command-center.html"]] },
  { id: "apex-ai", tag: "AI prototype", status: "Prototype", title: "Apex, an AI co-pilot", role: "Builder",
    challenge: "A builder-to-builder AI co-pilot had to be easy to run anywhere without a server holding anyone's key.",
    approach: "A single-file HTML and JavaScript chat app running the Apex system prompt on the Anthropic API, with the key kept only in the browser tab's session and guardrails for destructive commands and health questions.",
    result: "One file, zero build steps, session-only key.",
    stats: [["1", "file"], ["0", "build steps"]], stack: ["Anthropic API", "HTML", "JavaScript"],
    links: [["Architecture map", "./#arch-apex"]] },
  { id: "edits", tag: "Creative", status: "Ongoing", title: "Football edits with original sound", role: "Editor & composer",
    challenge: "Highlight edits feel flat when the cuts ignore the music.",
    approach: "Source raw match footage, cut on beat drops, add velocity speed ramps, and score each edit with original music made in Google Flow Music.",
    result: "European football and La Liga edits where every cut lands on the music.",
    stats: [], stack: ["Editing", "Beat sync", "Google Flow Music"],
    links: [["See the edit timeline", "./#creative"]] },
];

export const galaxy = {
  brands: [
    { name: "Galaxy Empire", note: "The main hub", href: "https://discord.gg/JJkyD2Rhc" },
    { name: "Galaxy Studios", note: "Part of the network" },
    { name: "Galaxy Ad Solutions", note: "The network's advertising arm" },
    { name: "Celestial Services", note: "Part of the network" },
    { name: "Blox Donate", note: "Part of the network" },
  ],
  treaties: [
    { title: "Galaxy Empire & Zen Services Merger Charter", text: "Zen Services joined Galaxy Empire through the merger charter." },
    { title: "Project RMC Treaty of Declaration", text: "Project RMC is bound to the network by the Treaty of Declaration." },
  ],
  adOptions: [
    { title: "Announcement post", text: "Your ad posted in the network's announcement channels." },
    { title: "Partnership", text: "An ongoing partnership between your community and the Galaxy network." },
    { title: "Custom campaign", text: "A promotion planned around your launch, event or giveaway." },
  ],
  adSteps: ["Send an enquiry with the form or by email", "Agree placement, timing and rate", "Pay in INR or crypto", "Your ad goes live across the network"],
};
