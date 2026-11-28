/* Performance budget check. Run: node tests/perf-budget.js
   Serves this folder, loads the site with the CPU throttled 4x (phone-class) and fails if a budget is broken.
   Needs Playwright (npm i -D playwright). Budgets are deliberately loose: they catch regressions, not noise. */
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const BUDGET = { liteIdleFps: 50, fullIdleFps: 28, fullAnimations: 45, loadLongTaskMs: 150, homeLoopsMax: 3, routeLoopsMax: 1 };
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html"; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); } }); });
const fps = (p, ms = 2500) => p.evaluate((ms) => new Promise((res) => { let n = 0, t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round(n / (ms / 1000))); })(); }), ms);
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://127.0.0.1:" + srv.address().port + "/";
  const b = await chromium.launch(), results = [], fail = [];
  const check = (name, val, ok, limit) => { results.push(`${ok ? "PASS" : "FAIL"}  ${name}: ${val} (budget ${limit})`); if (!ok) fail.push(name); };
  async function open(mode, hash = "") {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await c.newPage();
    await p.addInitScript((m) => { try { sessionStorage.setItem("arenaSeen", "1"); localStorage.setItem("perf", m); } catch (e) {} window.__long = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ["longtask"] }); } catch (e) {} }, mode);
    await p.goto(base + hash); await p.waitForTimeout(2500);
    await (await c.newCDPSession(p)).send("Emulation.setCPUThrottlingRate", { rate: 4 }); return { c, p };
  }
  let t = await open("lite"); check("Lite idle fps (4x CPU)", await fps(t.p), (await fps(t.p)) >= BUDGET.liteIdleFps, ">= " + BUDGET.liteIdleFps);
  check("load long tasks (max ms)", Math.max(0, ...(await t.p.evaluate(() => window.__long))), Math.max(0, ...(await t.p.evaluate(() => window.__long))) <= BUDGET.loadLongTaskMs, "<= " + BUDGET.loadLongTaskMs); await t.c.close();
  t = await open("full"); const ff = await fps(t.p), an = await t.p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  check("Full idle fps (4x CPU)", ff, ff >= BUDGET.fullIdleFps, ">= " + BUDGET.fullIdleFps); check("Full running animations", an, an <= BUDGET.fullAnimations, "<= " + BUDGET.fullAnimations);
  const homeLoops = await t.p.evaluate(() => Gov.stats().filter((l) => l.on).length); check("Governor loops running on home", homeLoops, homeLoops <= BUDGET.homeLoopsMax, "<= " + BUDGET.homeLoopsMax);
  await t.p.evaluate(() => (location.hash = "#/earth-core")); await t.p.waitForTimeout(1500);
  let on = await t.p.evaluate(() => Gov.stats().filter((l) => l.on).map((l) => l.name)); check("loops on #/earth-core", on.join(",") || "none", on.length === 1 && on[0] === "earth-core", "exactly earth-core");
  await t.p.evaluate(() => (location.hash = "#/cosmos")); await t.p.waitForTimeout(1500);
  on = await t.p.evaluate(() => Gov.stats().filter((l) => l.on).map((l) => l.name)); check("loops on #/cosmos", on.join(",") || "none", on.length === 1 && on[0] === "cosmos", "exactly cosmos");
  await t.p.evaluate(() => (location.hash = "#/lab")); await t.p.waitForTimeout(1500);
  on = await t.p.evaluate(() => Gov.stats().filter((l) => l.on).length); check("loops on #/lab (leaving a canvas view)", on, on === 0, "0");
  await t.c.close(); await b.close(); srv.close();
  console.log(results.join("\n")); if (fail.length) { console.log("\nBudget broken: " + fail.join(", ")); process.exit(1); } console.log("\nAll budgets met.");
})();
