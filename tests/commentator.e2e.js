/* AI commentator check. Run: node tests/commentator.e2e.js
   Serves this folder and drives commentator/index.html in Chromium. The VEGA server is answered by this test
   (no key, no network), and speech is a recording stand-in because headless browsers have no voices. Needs Playwright. */
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html"; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); } }); });
const SAMPLE = "Ninety-three minutes on the clock... he steps up. Over the wall, curling... GOAL! What a strike to win the derby!";

(async () => {
  await new Promise((r) => srv.listen(0, r)); const url = "http://127.0.0.1:" + srv.address().port + "/commentator/";
  const b = await chromium.launch(), results = [], fail = [];
  const check = (name, ok, got) => { results.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  (got: " + JSON.stringify(got) + ")"}`); if (!ok) fail.push(name); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    // Recording stand-in for the speech engine: plays each utterance instantly, in order.
    window.__spoken = [];
    const fake = { speaking: false, getVoices: () => [{ name: "Test UK", lang: "en-GB" }, { name: "Test US", lang: "en-US" }], addEventListener() {},
      cancel() { this.q = []; }, q: [],
      speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => { u.onend && u.onend(); }, 20); }, 10 * window.__spoken.length); } };
    Object.defineProperty(window, "speechSynthesis", { value: fake });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  let reply = { status: 200, body: { answer: SAMPLE } }; const bodies = [];
  await ctx.route("https://vega-gemini.onrender.com/**", (route) => {
    bodies.push(JSON.parse(route.request().postData() || "{}"));
    route.fulfill({ status: reply.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(reply.body) });
  });
  const text = (sel) => p.locator(sel).innerText();
  await p.goto(url);

  await p.fill("#moment", "goal"); await p.click("#go");
  check("too-short input explains what to do", /few more words/.test(await text("#status")) && bodies.length === 0, await text("#status"));

  await p.click(".examples button >> nth=0");
  check("example fills the box", (await p.inputValue("#moment")).startsWith("93rd minute"), await p.inputValue("#moment"));

  await p.click("#go"); await p.waitForSelector("#out:not([hidden])");
  check("asks the server in commentary mode", bodies[0].mode === "commentary" && bodies[0].question.startsWith("93rd minute"), bodies[0]);
  check("commentary shown, split into sentences", (await p.locator("#text span").count()) === 5 && (await text("#text")).includes("GOAL!"), await p.locator("#text span").count());
  check("voices listed (English only)", (await p.locator("#voice option").count()) === 3, await p.locator("#voice option").count());

  await p.click("#play");
  check("Stop enabled while playing", await p.isEnabled("#stop"), false);
  await p.waitForFunction(() => !document.getElementById("play").disabled);
  const spoken = await p.evaluate(() => window.__spoken);
  check("every sentence spoken in order", spoken.length === 5 && spoken[3].text === "GOAL!", spoken.map((s) => s.text));
  check("big moments are faster and higher", spoken[3].rate > spoken[0].rate && spoken[3].pitch > spoken[0].pitch, spoken.map((s) => [s.rate, s.pitch]));
  check("prefers a British English voice", spoken[0].voice === "Test UK", spoken[0].voice);

  reply = { status: 429, body: { error: "That's a lot of questions. Give it a few minutes." } };
  await p.click("#go"); await p.waitForSelector("#status.error");
  check("rate limit: server's message + Retry", /a lot of questions/.test(await text("#status")) && (await p.locator("#status button").count()) === 1, await text("#status"));
  reply = { status: 200, body: { answer: "Short and sweet. GOAL!" } };
  await p.click("#status button"); await p.waitForFunction(() => document.getElementById("text").textContent.startsWith("Short"));
  check("Retry recovers", (await p.locator("#text span").count()) === 2, await text("#text"));

  reply = { status: 403, body: { error: "This endpoint only answers Vini's portfolio." } };
  await p.click("#go"); await p.waitForSelector("#status.error");
  check("wrong site: explains where it works, no pointless Retry", /only works on vini-portfolio.onrender.com/.test(await text("#status")) && (await p.locator("#status button").count()) === 0, await text("#status"));

  await ctx.setOffline(true); await p.click("#go"); await p.waitForSelector("#status.error");
  check("offline: says so, offers Retry", /offline/i.test(await text("#status")) && (await p.locator("#status button").count()) === 1, await text("#status"));
  await ctx.setOffline(false);

  check("no horizontal page scroll at 390px", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await p.evaluate(() => document.documentElement.scrollWidth));
  check("no console or page errors", errors.length === 0, errors);
  await b.close(); srv.close();
  console.log(results.join("\n")); if (fail.length) { console.log("\nFailed: " + fail.join(", ")); process.exit(1); } console.log("\nAll commentator checks passed.");
})();
