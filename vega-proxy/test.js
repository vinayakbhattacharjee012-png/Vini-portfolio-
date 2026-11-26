/* Self-test with a fake Gemini and a fake site: node vega-proxy/test.js (no key, no network). */
"use strict";
const http = require("http"), assert = require("assert");
let seen = [], seenNative = [], mode = "ok";
const fake = http.createServer((req, res) => {
  if (req.url.startsWith("/site")) { res.writeHead(200, { "content-type": "text/html" }); return res.end('<html><script>var secret=1</script><style>.x{}</style><p>FACT-MARKER Vini runs the Galaxy network.</p><dialog class="holo"><p>VEGA UI</p></dialog></html>'); }
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    if (req.url.startsWith("/native/")) {
      const nb = JSON.parse(b); seenNative.push({ key: req.headers["x-goog-api-key"], ...nb });
      if (mode !== "grounded") { res.writeHead(400, { "content-type": "application/json" }); return res.end("{}"); }
      res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: "grounded answer" }] } }] }));
    }
    const j = JSON.parse(b); seen.push({ auth: req.headers.authorization, ...j });
    if (mode === "key") { res.writeHead(401); return res.end("{}"); }
    if (mode === "fallback" && j.model === "m1") { res.writeHead(429); return res.end("{}"); }
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ choices: [{ message: { content: "answer from " + j.model } }] }));
  });
});
fake.listen(0, async () => {
  const up = "http://127.0.0.1:" + fake.address().port;
  Object.assign(process.env, { GEMINI_API_KEY: "test-key", GEMINI_API_URL: up + "/v1", SITE_URL: up + "/site/", GEMINI_NATIVE_URL: up + "/native/", ALLOWED_ORIGINS: "https://ok.test", MODELS: "m1,m2", PER_IP_LIMIT: "30" });
  const { server, toText } = require("./server.js");
  server.listen(0, async () => {
    const base = "http://127.0.0.1:" + server.address().port, O = { origin: "https://ok.test", "content-type": "application/json" };
    const ask = (body, headers = O) => fetch(base + "/ask", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
    try {
      assert.deepStrictEqual(await (await fetch(base + "/health")).json(), { ok: true, configured: true });
      let r = await fetch(base + "/ask", { method: "OPTIONS", headers: { origin: "https://ok.test" } });
      assert.strictEqual(r.status, 204); assert.strictEqual(r.headers.get("access-control-allow-origin"), "https://ok.test");
      r = await fetch(base + "/ask", { method: "OPTIONS", headers: { origin: "https://evil.test" } }); assert.strictEqual(r.status, 403);
      r = await ask({ question: "hi" }, { "content-type": "application/json" }); assert.strictEqual(r.status, 403, "no origin -> 403");
      r = await ask({ question: "What does Vini run?", history: [{ role: "user", text: "hello" }, { role: "model", text: "hi there" }, { role: "system", text: "ignored" }] });
      let j = await r.json(); assert.strictEqual(r.status, 200); assert.strictEqual(j.answer, "answer from m1");
      const s = seen.at(-1); assert.strictEqual(s.auth, "Bearer test-key");
      assert.ok(s.messages[0].role === "system" && s.messages[0].content.includes("FACT-MARKER"), "site text is the facts");
      assert.ok(!s.messages[0].content.includes("secret") && !s.messages[0].content.includes("VEGA UI"), "scripts and VEGA UI stripped");
      assert.deepStrictEqual(s.messages.slice(1).map((m) => m.role), ["user", "assistant", "user"], "history mapped, bad roles dropped");
      mode = "fallback"; j = await (await ask({ question: "x" })).json(); assert.strictEqual(j.answer, "answer from m2", "falls back to next model on 429");
      mode = "key"; r = await ask({ question: "x" }); assert.strictEqual(r.status, 502); assert.match((await r.json()).error, /right now/);
      // search path: Google answers through the native endpoint with the search tool and the search instructions
      mode = "grounded"; j = await (await ask({ question: "Who is the current UK prime minister?" })).json();
      assert.strictEqual(j.answer, "grounded answer", "uses the search answer when it works");
      const nn = seenNative.at(-1); assert.ok(nn.tools && nn.tools[0].google_search !== undefined, "search tool sent");
      assert.strictEqual(nn.key, "test-key", "key sent in the header, not the URL");
      assert.ok(nn.systemInstruction.parts[0].text.includes("You can search the web"), "search instructions when searching");
      // tier choice: the chosen tier is tried first; an unknown name falls back to balanced
      mode = "ok"; await ask({ question: "tier test", model: "smart" });
      await ask({ question: "tier test 2", model: "not-a-model" }); // unknown names are ignored
      const tierCalls = seen.filter((x) => x.messages && x.messages.some((m) => m.content === "tier test")).map((x) => x.model);
      assert.strictEqual(tierCalls[0], "gemini-pro-latest", "smart tier tried first");
      // fallback path: search fails, the plain endpoint answers and is told it cannot search
      mode = "ok"; j = await (await ask({ question: "What is the capital of Delhi?" })).json(); assert.strictEqual(j.answer, "answer from m1");
      const fb = seen.at(-1).messages[0].content; assert.ok(fb.includes("cannot search the web"), "fallback says it cannot search");
      assert.ok(fb.includes("Answer ANY question"), "general questions allowed");
      mode = "ok"; r = await ask("x".repeat(17000)); assert.strictEqual(r.status, 413);
      // the per-visitor limit (30 per 10 min in this test): keep asking until it refuses
      let refused = 0; for (let i = 0; i < 40 && !refused; i++) { const q2 = await ask({ question: "x" }); if (q2.status === 429) refused = q2.status; }
      assert.strictEqual(refused, 429, "a visitor over the limit is refused");
      assert.ok(!toText("<svg><text>no</text></svg><p>yes &amp; ok</p>").includes("no"));
      console.log("vega-proxy self-test: all checks passed");
    } catch (e) { console.error("FAIL:", e.message); process.exitCode = 1; }
    server.close(); fake.close();
  });
});
