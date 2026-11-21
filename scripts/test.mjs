// npm test: build the site, serve dist/, run every tests/*.test.cjs in Chromium, benchmark scrolling,
// and write src/data/test-report.json (shown on the All features page; rebuild to publish it).
import { execSync, spawn, spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
try { require.resolve("playwright"); } catch {
  console.error("Playwright is needed: npm i -D playwright && npx playwright install chromium"); process.exit(1);
}
const PORT = 4400, BASE = `http://localhost:${PORT}/`;
const NAMES = { "original.test.cjs": "Original site", "new-features.test.cjs": "New features", "restored.test.cjs": "Restored content", "pages.test.cjs": "Extra pages & links" };
const FPS_BEFORE = 19; // measured 2026-11-21 on this benchmark, before off-screen sections were paused

execSync("npx vite build", { stdio: "inherit" });
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const run = (file) => spawnSync(process.execPath, [file], { env: { ...process.env, BASE_URL: BASE }, encoding: "utf8", timeout: 900000 });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const suites = [];
  for (const file of readdirSync("tests").filter((f) => f.endsWith(".test.cjs")).sort()) {
    const t0 = Date.now(), r = run(`tests/${file}`), out = (r.stdout || "") + (r.stderr || "");
    const passed = (out.match(/^PASS /gm) || []).length;
    let failed = (out.match(/^FAIL /gm) || []).length;
    if (r.status !== 0 && !failed) failed = 1; // crashed before reporting
    console.log(`\n${NAMES[file] || file}: ${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    for (const line of out.split("\n")) if (line.startsWith("FAIL") || (r.status !== 0 && /Error/.test(line))) console.log("  " + line);
    suites.push({ name: NAMES[file] || file, passed, failed, ms: Date.now() - t0 });
  }
  // One run swings by ~10 fps on a shared machine, so report the median of three.
  const runs = [1, 2, 3].map(() => { try { return JSON.parse(run("tests/scroll.bench.cjs").stdout.trim().split("\n").pop()).fps; } catch { return null; } }).filter(Boolean).sort((a, b) => a - b);
  const fps = runs.length ? runs[Math.floor(runs.length / 2)] : null;
  const passed = suites.reduce((n, s) => n + s.passed, 0), failed = suites.reduce((n, s) => n + s.failed, 0);
  let commit = null; try { commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); } catch {}
  const report = { date: new Date().toISOString(), commit, passed, failed, suites,
    perf: fps && { fpsBefore: FPS_BEFORE, fpsAfter: Math.round(fps), profile: "Scrolling the whole homepage on a 412 px phone profile with 4× CPU throttling (median of 3 runs)" } };
  writeFileSync("src/data/test-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(`\nTotal: ${passed} passed, ${failed} failed · scrolling ${fps ? Math.round(fps) : "?"} fps (was ${FPS_BEFORE})`);
  process.exitCode = failed ? 1 : 0;
} finally { server.kill(); }
