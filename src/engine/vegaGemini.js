/* Gemini for VEGA/Jarvis.
   Default: the shared server (vega-proxy/) holds Vini's Google AI Studio key, so every visitor gets Gemini with no key.
   Fallback: a visitor can still paste their own key (kept in this tab's sessionStorage, sent only to Google).
   The page never contains a key. window.VegaAI = { ready, ask }. */
(function () {
  "use strict";
  var PROXY = (window.VEGA_PROXY || "https://vega-gemini.onrender.com").replace(/\/$/, "");
  var KEY = "vegaGemini", MODELS = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"], URL = "https://generativelanguage.googleapis.com/v1beta/models/";
  var st = { key: "", on: false };            // visitor's own key (optional)
  var sh = { state: "unknown", on: true };    // shared server: unknown | waking | ready | down
  try { var s = JSON.parse(sessionStorage.getItem(KEY) || "{}"); st.key = s.key || ""; st.on = !!(s.on && s.key); sh.on = s.shared !== false; } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ key: st.key, on: st.on, shared: sh.on })); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function timeout(ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms); return c.signal; }

  /* ---- shared server ---- */
  function wake() {
    if (sh.state === "waking" || sh.state === "ready") return;
    sh.state = "waking"; paint();
    // a free server sleeps when idle; the first call can take up to a minute while it wakes
    fetch(PROXY + "/health", { signal: timeout(75000) }).then(function (r) { return r.json(); })
      .then(function (j) { sh.state = j && j.configured ? "ready" : "down"; }, function () { sh.state = "down"; })
      .then(paint);
  }
  // Model choice for the shared answers. Empty means the server's default order.
  var tier = ""; try { tier = localStorage.getItem("vegaTier") || ""; } catch (e) {}
  if (["", "fast", "balanced", "smart"].indexOf(tier) < 0) tier = "";
  function askShared(question, history) {
    var h = (history || []).map(function (m) { return { role: m.role === "model" ? "model" : "user", text: (m.parts && m.parts[0] && m.parts[0].text) || "" }; });
    return fetch(PROXY + "/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: question, history: h, model: tier || undefined }), signal: timeout(30000) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.ok && j.answer) return j.answer; throw new Error(j.error || "Gemini is busy right now."); }); },
        function (e) { throw new Error(e && e.name === "AbortError" ? "That took too long. Try again." : "I can't answer right now."); });
  }

  /* ---- visitor's own key (direct to Google) ---- */
  function facts(K) {
    var out = ["Name: " + K.name, "Role: " + (K.role || ""), "Intro: " + (K.lede || ""), "Email: " + (K.email || ""), "", "SECTIONS"];
    K.sections.forEach(function (x) { out.push("- " + x.t + ": " + (x.d || x.h || "")); });
    out.push("", "PROJECTS"); K.projects.forEach(function (x) { out.push("- " + x.t + (x.k ? " (" + x.k + ")" : "") + ": " + (x.d || "")); });
    out.push("", "SKILLS"); K.skills.forEach(function (x) { out.push("- " + x.t + ": " + x.items.join(", ")); });
    if (K.stats && K.stats.length) { out.push("", "NUMBERS"); K.stats.forEach(function (x) { out.push("- " + x.txt + " " + x.label); }); }
    return out.join("\n").slice(0, 7000);
  }
  function system(K) {
    return "You are VEGA, the voice assistant on Vini's portfolio site. Talk like a person giving a quick demo: short, plain, friendly, one to three sentences, no lists, no hype.\n" +
      "Answer ONLY from the facts below. If the answer isn't there, say you don't have that and suggest emailing " + (K.email || "Vini") + ". Never invent dates, employers, prices, locations or personal details.\n" +
      "The health demos on the site are simulations, not medical advice.\n\nFACTS\n" + facts(K);
  }
  function askOwn(question, K, history) {
    var body = { systemInstruction: { parts: [{ text: system(K) }] }, contents: (history || []).concat([{ role: "user", parts: [{ text: question }] }]), generationConfig: { maxOutputTokens: 320, temperature: 0.4 } };
    var i = 0, sig = timeout(20000);
    function next() {
      return fetch(URL + MODELS[i] + ":generateContent", { method: "POST", signal: sig, headers: { "content-type": "application/json", "x-goog-api-key": st.key }, body: JSON.stringify(body) }).then(function (r) {
        if (r.status === 400 || r.status === 403) return r.json().catch(function () { return {}; }).then(function (j) { var m = (j.error && j.error.message) || ""; throw new Error(/API key|permission|referer|referrer/i.test(m) ? "Gemini rejected the key. Check it in the Gemini panel." : "Gemini couldn't take that request."); });
        if (r.status === 429 || r.status >= 500 || r.status === 404) { if (++i < MODELS.length) return next(); throw new Error(r.status === 429 ? "Gemini is rate-limiting this key right now." : "Gemini is busy right now."); }
        return r.json().then(function (j) {
          var c = j.candidates && j.candidates[0], t = c && c.content && c.content.parts && c.content.parts.map(function (p) { return p.text || ""; }).join("").trim();
          if (!t) throw new Error(c && c.finishReason === "SAFETY" ? "Gemini declined to answer that." : "Gemini sent an empty answer.");
          return t;
        });
      }).catch(function (e) { throw e.name === "AbortError" ? new Error("Gemini took too long.") : e; });
    }
    return next();
  }

  function sharedOn() { return sh.state === "ready" && sh.on; }
  window.VegaAI = {
    ready: function () { return (st.on && !!st.key) || sharedOn(); },
    ask: function (question, K, history) { return st.on && st.key ? askOwn(question, K, history) : askShared(question, history); }
  };

  /* ---- UI: Gemini button (+ Key button for a visitor's own key) and a small key panel ---- */
  function paint() {
    var b = $("holoAi"), kb = $("holoAiCfg"), p = $("holoPrivacy");
    if (b) {
      var label = st.on && st.key ? "your key" : sh.state === "ready" ? (sh.on ? "on" : "off") : sh.state === "waking" ? "waking…" : "off";
      b.textContent = "AI answers: " + label; b.setAttribute("aria-pressed", String((st.on && !!st.key) || sharedOn()));
    }
    if (kb) kb.hidden = !(st.key || sh.state === "down");
    if (p) p.textContent = st.on && st.key ? "Answers use your own key. Your questions go to the answer service, and the key stays in this tab only."
      : sharedOn() ? "Answers come from an AI service with live search. Your questions are sent to it, so don't share personal details."
      : sh.state === "waking" ? "Connecting the answer service… Until then, I answer from the page."
      : "Voice is turned into text by your browser's speech service (in Chrome, that's Google). This site doesn't store anything you say or type.";
  }
  function build() {
    var form = $("holoAsk"), holo = $("holo"); if (!form || $("holoAi")) return;
    var b = document.createElement("button"); b.className = "holo-btn"; b.type = "button"; b.id = "holoAi"; b.setAttribute("aria-pressed", "false"); form.appendChild(b);
    var kb = document.createElement("button"); kb.className = "holo-btn"; kb.type = "button"; kb.id = "holoAiCfg"; kb.textContent = "Key"; kb.hidden = true; kb.setAttribute("aria-controls", "holoAiPanel"); form.appendChild(kb);
    var panel = document.createElement("div"); panel.id = "holoAiPanel"; panel.className = "holo-ai"; panel.hidden = true;
    panel.innerHTML = '<p>Use your own Google AI Studio key. It stays in this tab, goes only to Google, and is gone when you close the tab. Never share it.</p>' +
      '<label for="holoAiKey">Gemini API key</label><input id="holoAiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key" />' +
      '<div class="holo-ai-row"><button class="holo-btn" type="button" id="holoAiSave">Save and test</button><button class="holo-btn" type="button" id="holoAiOff">Remove key</button></div><p class="holo-ai-msg" id="holoAiMsg" aria-live="polite"></p>';
    form.parentNode.insertBefore(panel, $("holoPrivacy"));
    kb.addEventListener("click", function () { panel.hidden = !panel.hidden; if (!panel.hidden) $("holoAiKey").focus(); });
    var tierSel = document.createElement("select"); tierSel.id = "holoAiTier"; tierSel.className = "holo-btn"; tierSel.setAttribute("aria-label", "Answer model");
    tierSel.innerHTML = '<option value="">Auto</option><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="smart">Smart</option>';
    tierSel.value = tier; form.appendChild(tierSel);
    tierSel.addEventListener("change", function () { tier = tierSel.value; try { localStorage.setItem("vegaTier", tier); } catch (e) {} });
    b.addEventListener("click", function () {
      if (st.on && st.key) { st.on = false; save(); paint(); return; }          // own key on -> off
      if (sh.state === "ready") { sh.on = !sh.on; save(); paint(); return; }   // shared on <-> off
      if (st.key) { st.on = true; save(); paint(); return; }                   // own key saved -> on
      if (sh.state === "unknown" || sh.state === "down") { sh.state = "unknown"; wake(); }
      if (sh.state === "down") { panel.hidden = !panel.hidden; }
    });
    $("holoAiSave").addEventListener("click", function () {
      var k = $("holoAiKey").value.trim(), m = $("holoAiMsg"); if (!/^[\w-]{20,}$/.test(k)) { m.textContent = "That doesn't look like a Gemini key."; return; }
      st.key = k; st.on = true; m.textContent = "Testing…";
      askOwn("Reply with the single word: ready", { name: "test", sections: [], projects: [], skills: [], stats: [] }).then(function () { save(); $("holoAiKey").value = ""; m.textContent = "Connected with your key."; panel.hidden = true; paint(); })
        .catch(function (e) { st.key = ""; st.on = false; save(); m.textContent = e.message; paint(); });
    });
    $("holoAiOff").addEventListener("click", function () { st.key = ""; st.on = false; save(); $("holoAiKey").value = ""; $("holoAiMsg").textContent = "Key removed."; paint(); });
    // wake the shared server the first time someone opens Jarvis (not on every page view, so it can sleep)
    if (holo && window.MutationObserver) new MutationObserver(function () { if (holo.open) wake(); }).observe(holo, { attributes: true, attributeFilter: ["open"] });
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
