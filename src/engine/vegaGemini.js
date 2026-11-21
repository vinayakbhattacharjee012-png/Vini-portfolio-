/* Optional Gemini mode for VEGA. Bring your own key: it lives in this tab's sessionStorage and goes only to Google.
   Nothing is stored on the server, and no key of the site owner is in this file or anywhere in the page. window.VegaAI = { ready, ask }. */
(function () {
  "use strict";
  var KEY = "vegaGemini", MODELS = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"], URL = "https://generativelanguage.googleapis.com/v1beta/models/";
  var st = { key: "", on: false };
  try { var s = JSON.parse(sessionStorage.getItem(KEY) || "{}"); st.key = s.key || ""; st.on = !!(s.on && s.key); } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }

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
  function call(model, body, signal) {
    return fetch(URL + model + ":generateContent", { method: "POST", signal: signal, headers: { "content-type": "application/json", "x-goog-api-key": st.key }, body: JSON.stringify(body) });
  }
  function ask(question, K, history) {
    var body = { systemInstruction: { parts: [{ text: system(K) }] }, contents: (history || []).concat([{ role: "user", parts: [{ text: question }] }]), generationConfig: { maxOutputTokens: 320, temperature: 0.4 } };
    var i = 0, ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 20000);
    function next() {
      return call(MODELS[i], body, ctl.signal).then(function (r) {
        if (r.status === 400 || r.status === 403) return r.json().catch(function () { return {}; }).then(function (j) { var m = (j.error && j.error.message) || ""; throw new Error(/API key|permission|referer|referrer/i.test(m) ? "Gemini rejected the key. Check it in the Gemini panel." : "Gemini couldn't take that request."); });
        if (r.status === 429 || r.status >= 500 || r.status === 404) { if (++i < MODELS.length) return next(); throw new Error(r.status === 429 ? "Gemini is rate-limiting this key right now." : "Gemini is busy right now."); }
        return r.json().then(function (j) {
          var c = j.candidates && j.candidates[0], t = c && c.content && c.content.parts && c.content.parts.map(function (p) { return p.text || ""; }).join("").trim();
          if (!t) throw new Error(c && c.finishReason === "SAFETY" ? "Gemini declined to answer that." : "Gemini sent an empty answer.");
          return t;
        });
      });
    }
    return next().then(function (t) { clearTimeout(timer); return t; }, function (e) { clearTimeout(timer); throw e.name === "AbortError" ? new Error("Gemini took too long.") : e; });
  }
  window.VegaAI = { ready: function () { return st.on && !!st.key; }, ask: ask };

  /* ---- UI: a Gemini button in the ask bar and a small key panel ---- */
  function paint() {
    var b = $("holoAi"); if (b) { b.textContent = "Gemini: " + (st.on ? "on" : "off"); b.setAttribute("aria-pressed", st.on); }
    var kb = $("holoAiCfg"); if (kb) kb.hidden = !st.key;
    var p = $("holoPrivacy"); if (p) p.textContent = st.on ? "Gemini mode is on: your questions and a short summary of this site are sent to Google using your own key. The key stays in this tab only." : "Voice is turned into text by your browser's speech service (in Chrome, that's Google). This site doesn't store anything you say or type.";
  }
  function build() {
    var form = $("holoAsk"); if (!form || $("holoAi")) return;
    var b = document.createElement("button"); b.className = "holo-btn"; b.type = "button"; b.id = "holoAi"; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-controls", "holoAiPanel"); form.appendChild(b);
    var panel = document.createElement("div"); panel.id = "holoAiPanel"; panel.className = "holo-ai"; panel.hidden = true;
    panel.innerHTML = '<p>Let VEGA answer anything about Vini with Google Gemini. Paste your own key from Google AI Studio. It stays in this tab, goes only to Google, and is gone when you close the tab. Restrict the key to this website there, and never share it.</p>' +
      '<label for="holoAiKey">Gemini API key</label><input id="holoAiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key" />' +
      '<div class="holo-ai-row"><button class="holo-btn" type="button" id="holoAiSave">Save and test</button><button class="holo-btn" type="button" id="holoAiOff">Remove key</button></div><p class="holo-ai-msg" id="holoAiMsg" aria-live="polite"></p>';
    form.parentNode.insertBefore(panel, $("holoPrivacy"));
    var kb = document.createElement("button"); kb.className = "holo-btn"; kb.type = "button"; kb.id = "holoAiCfg"; kb.textContent = "Key"; kb.hidden = true; kb.setAttribute("aria-controls", "holoAiPanel"); form.appendChild(kb);
    kb.addEventListener("click", function () { panel.hidden = !panel.hidden; if (!panel.hidden) $("holoAiKey").focus(); });
    // one button: on -> off, off with a saved key -> on, no key yet -> open the key panel
    b.addEventListener("click", function () { if (st.on) { st.on = false; save(); paint(); return; } if (st.key) { st.on = true; save(); paint(); return; } panel.hidden = !panel.hidden; if (!panel.hidden) $("holoAiKey").focus(); });
    $("holoAiSave").addEventListener("click", function () {
      var k = $("holoAiKey").value.trim(), m = $("holoAiMsg"); if (!/^[\w-]{20,}$/.test(k)) { m.textContent = "That doesn't look like a Gemini key."; return; }
      st.key = k; m.textContent = "Testing…";
      var K0 = { name: "test", sections: [], projects: [], skills: [], stats: [] };
      ask("Reply with the single word: ready", K0).then(function () { st.on = true; save(); $("holoAiKey").value = ""; m.textContent = "Connected. VEGA will use Gemini for questions it can't answer from the page."; panel.hidden = true; paint(); })
        .catch(function (e) { st.key = ""; st.on = false; save(); m.textContent = e.message; paint(); });
    });
    $("holoAiOff").addEventListener("click", function () { st.key = ""; st.on = false; save(); $("holoAiKey").value = ""; $("holoAiMsg").textContent = "Key removed."; paint(); });
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
