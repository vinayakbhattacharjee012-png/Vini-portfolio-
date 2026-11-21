/* Hash routes (#/lab #/arena #/vault #/logs #/dossier) and their interactive views. Static, no server rules needed. */
(function () {
  "use strict";
  var root = document.documentElement, body = document.body;
  var ROUTES = { lab: "Lab", arena: "Arena", vault: "Vault", logs: "Engineering log", dossier: "Dossier", about: "About", services: "Services", contact: "Contact", now: "Now", uses: "Uses", explore: "All pages", "earth-core": "Earth core", cosmos: "Cosmos" };
  var views = {};
  document.querySelectorAll(".view[data-view]").forEach(function (v) { views[v.getAttribute("data-view")] = v; });
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function bytes(s) { return new TextEncoder().encode(s).length; }
  var toastEl = $("toast"), toastT;
  function toast(m) { if (!toastEl) return; toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2200); }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(label + " copied"); }, function () { toast("Copy failed. Select the text instead."); });
    else toast("Copy failed. Select the text instead.");
  }

  // Scrollable panels must be keyboard reachable.
  document.querySelectorAll(".view .log, .view .code").forEach(function (el) {
    el.setAttribute("tabindex", "0"); el.setAttribute("role", "region");
    el.setAttribute("aria-label", (el.id ? el.id.replace(/-/g, " ") : "code sample") + " (scrollable)");
  });

  // ---------- router ----------
  var current = null;
  function routeName(h) { var m = /^#\/([a-z-]+)$/.exec(h || ""); return m && views[m[1]] ? m[1] : null; }
  function show(name) {
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
    current = name;
    body.classList.add("route-view");
    Object.keys(views).forEach(function (k) { views[k].classList.toggle("on", k === name); views[k].hidden = k !== name; });
    document.title = ROUTES[name] + " · Vini";
    var h = views[name].querySelector("h1"); window.scrollTo(0, 0);
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    if (history.replaceState && location.hash !== "#/" + name) history.replaceState(null, "", "#/" + name);
  }
  function home() {
    if (!current) return;
    current = null;
    body.classList.remove("route-view");
    Object.keys(views).forEach(function (k) { views[k].classList.remove("on"); views[k].hidden = true; });
    document.title = "Vini · Builder, Community Founder, Creator";
    var target = (location.hash || "").slice(1);
    var el = target && !/^\//.test(target) ? document.getElementById(target) : null;
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); else window.scrollTo(0, 0);
  }
  function route() {
    var n = routeName(location.hash);
    if (n) show(n); else home();
  }
  Object.keys(views).forEach(function (k) { views[k].hidden = true; });
  window.addEventListener("hashchange", route);
  // Internal links in the footer and palette can change the hash without a page load.
  route();

  // ---------- Lab: Apex-Fit simulator ----------
  (function () {
    var age = $("lab-age"), eff = $("lab-effort"), dur = $("lab-dur");
    if (!age) return;
    function run() {
      var A = +age.value, E = +eff.value, D = +dur.value, rest = 60, hrmax = 220 - A;
      var target = rest + (hrmax - rest) * (E / 100), tau = 25, decay = 45, pts = [], peak = rest, tRec = null;
      var atDur = rest + (target - rest) * (1 - Math.exp(-D / tau));
      var total = D + 150, W = 600, Hh = 260, pad = 30;
      function x(t) { return pad + (t / total) * (W - pad * 2); }
      function y(bpm) { return Hh - pad - ((bpm - 40) / (200 - 40)) * (Hh - pad * 2); }
      for (var t = 0; t <= total; t += 2) {
        var hr = t <= D ? rest + (target - rest) * (1 - Math.exp(-t / tau)) : rest + (atDur - rest) * Math.exp(-(t - D) / decay);
        peak = Math.max(peak, hr);
        pts.push(x(t).toFixed(1) + "," + y(hr).toFixed(1));
      }
      var threshold = rest + (peak - rest) * 0.6;
      for (var s = D; s <= total; s += 1) { var v = rest + (atDur - rest) * Math.exp(-(s - D) / decay); if (v <= threshold) { tRec = s - D; break; } }
      var pct = peak / hrmax * 100, zone = pct < 60 ? "Zone 1 · easy" : pct < 70 ? "Zone 2 · light" : pct < 80 ? "Zone 3 · moderate" : pct < 90 ? "Zone 4 · hard" : "Zone 5 · max";
      $("lab-age-v").textContent = A; $("lab-effort-v").textContent = E + "%"; $("lab-dur-v").textContent = D + " s";
      $("lab-hrmax").textContent = hrmax + " bpm"; $("lab-peak").textContent = Math.round(peak) + " bpm"; $("lab-zone").textContent = zone;
      $("lab-rec").textContent = tRec == null ? "> 2 min" : tRec + " s";
      $("lab-line").setAttribute("points", pts.join(" "));
      $("lab-end").setAttribute("x1", x(D)); $("lab-end").setAttribute("x2", x(D));
      var bands = "", cols = ["#0e7490", "#0891b2", "#06b6d4", "#8b5cf6", "#c4b5fd"];
      for (var z = 0; z < 5; z++) {
        var lo = hrmax * (0.5 + z * 0.1), hi = hrmax * (0.6 + z * 0.1);
        bands += '<rect x="' + pad + '" y="' + y(hi).toFixed(1) + '" width="' + (W - pad * 2) + '" height="' + (y(lo) - y(hi)).toFixed(1) + '" fill="' + cols[z] + '" opacity=".12"/>';
        bands += '<text x="' + (W - pad - 4) + '" y="' + (y((lo + hi) / 2) + 4).toFixed(1) + '" text-anchor="end" fill="#9aa7b8" font-size="11" font-family="monospace">Z' + (z + 1) + "</text>";
      }
      $("lab-bands").innerHTML = bands;
    }
    [age, eff, dur].forEach(function (el) { el.addEventListener("input", run); });
    run();
  })();

  // ---------- Lab: Polo triage flow ----------
  (function () {
    var scen = {
      headache: { badges: [["ok", "Schema valid"], ["ok", "No red flags"], ["ok", "No diagnosis made"]],
        steps: [["Intake", "Symptom: headache. Started today. Mild."], ["Red-flag screen", "No emergency terms matched."], ["Guardrail", "Advice limited to general self-care information."], ["Route", "Self-care information, with a note to see a clinician if it lasts or gets worse."]],
        result: "General information: rest, drink water and note when it started. See a clinician if it lasts several days, comes with vision changes, or gets worse." },
      chest: { badges: [["ok", "Schema valid"], ["bad", "Red flag matched"], ["warn", "Escalated"]],
        steps: [["Intake", "Symptom: chest pain with trouble breathing."], ["Red-flag screen", "Matched: chest pain + breathing difficulty."], ["Guardrail", "Workflow halted. No AI advice generated."], ["Route", "Emergency escalation."]],
        result: "This could be serious. Call your local emergency number now. Do not wait for the workflow to finish." },
      sleep: { badges: [["ok", "Schema valid"], ["ok", "No red flags"], ["ok", "Wellness scope"]],
        steps: [["Intake", "Symptom: poor sleep for about a week."], ["Red-flag screen", "No emergency terms matched."], ["Guardrail", "Wellness information only."], ["Route", "Sleep routine suggestions, with a note to talk to a clinician if it continues."]],
        result: "Wellness suggestions: keep a regular bedtime, limit screens an hour before bed, and avoid caffeine late in the day. Talk to a clinician if poor sleep continues." }
    };
    var btns = document.querySelectorAll("[data-scn]"); if (!btns.length) return;
    function pick(k) {
      var s = scen[k];
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-scn") === k)); });
      $("polo-badges").innerHTML = s.badges.map(function (b) { return '<span class="badge ' + b[0] + '">' + esc(b[1]) + "</span>"; }).join("");
      $("polo-steps").innerHTML = s.steps.map(function (st) { return '<li><span class="k">' + esc(st[0]) + "</span>" + esc(st[1]) + "</li>"; }).join("");
      $("polo-result").textContent = s.result;
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { pick(b.getAttribute("data-scn")); }); });
  })();

  // ---------- Lab: guardrail inspector ----------
  (function () {
    var inp = $("gi-input"); if (!inp) return;
    var INJ = /ignore (all |the |any )?(previous|prior|above) instructions|reveal (the )?system prompt|you are now|jailbreak|disregard (your|the) (rules|instructions)/i;
    function run() {
      var raw = inp.value, badges = [], text = raw;
      var ctrl = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) || []).length;
      text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
      badges.push(ctrl ? ["warn", "Control chars removed: " + ctrl] : ["ok", "No control characters"]);
      badges.push(text.length <= 2000 ? ["ok", "Length " + text.length + "/2000"] : ["bad", "Too long: " + text.length + "/2000"]);
      var inj = INJ.test(text);
      badges.push(inj ? ["bad", "Injection pattern flagged"] : ["ok", "No injection pattern"]);
      var emails = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).length;
      var phones = (text.match(/\+?\d[\d\s-]{7,}\d/g) || []).length;
      text = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]").replace(/\+?\d[\d\s-]{7,}\d/g, "[phone]");
      badges.push(emails || phones ? ["warn", "Redacted: " + emails + " email, " + phones + " phone"] : ["ok", "No personal data found"]);
      var json = null, trimmed = raw.trim();
      if (trimmed.charAt(0) === "{") {
        try { var o = JSON.parse(trimmed); json = typeof o.message === "string" && o.message.length <= 2000 ? "pass" : "fail"; } catch (e) { json = "fail"; }
        badges.push(json === "pass" ? ["ok", "JSON schema: message (string, ≤2000)"] : ["bad", "JSON schema failed"]);
      }
      var escaped = esc(text);
      badges.push(escaped !== text ? ["warn", "HTML escaped for display"] : ["ok", "No HTML to escape"]);
      var blocked = inj || text.length > 2000 || json === "fail";
      badges.push(blocked ? ["bad", "Blocked: will not reach the model"] : ["ok", "Allowed through"]);
      $("gi-badges").innerHTML = badges.map(function (b) { return '<span class="badge ' + b[0] + '">' + esc(b[1]) + "</span>"; }).join("");
      $("gi-out").textContent = blocked ? "(blocked, nothing sent)" : text;
    }
    inp.addEventListener("input", run);
    inp.value = "Hello, can you summarise my week? Email me at test@example.com";
    run();
  })();

  // ---------- Arena: bot defence simulation ----------
  (function () {
    var logEl = $("arena-log"); if (!logEl) return;
    var st = { joins: [], traffic: null, msgs: {}, muted: {}, raid: false, blocked: 0, locked: false, actorTries: 0, latency: null, raidStart: 0, qCount: 0 };
    var users = []; for (var i = 0; i < 40; i++) users.push("user" + (100 + i));
    function log(cls, text) {
      var d = document.createElement("div"); d.className = "l-" + cls; d.textContent = new Date().toISOString().slice(11, 19) + "  " + text;
      logEl.appendChild(d); while (logEl.childNodes.length > 200) logEl.removeChild(logEl.firstChild); logEl.scrollTop = logEl.scrollHeight;
    }
    function stats() {
      var now = performance.now(); st.joins = st.joins.filter(function (t) { return now - t < 10000; });
      $("ar-joins").textContent = st.joins.length; $("ar-raidmode").textContent = st.raid ? "ON" : "OFF";
      $("ar-blocked").textContent = st.blocked; $("ar-latency").textContent = st.latency == null ? "—" : Math.round(st.latency) + " ms";
    }
    function message() {
      var u = users[Math.floor(Math.random() * users.length)], now = performance.now();
      if (st.muted[u] && now < st.muted[u]) return;
      var arr = (st.msgs[u] || []).filter(function (t) { return now - t < 5000; }); arr.push(now); st.msgs[u] = arr;
      if (arr.length > 5) { st.muted[u] = now + 10000; st.blocked++; log("warn", u + " over rate limit (5 msgs / 5 s): timed out 10 s"); }
      else log("info", u + ": message delivered");
    }
    function join(fresh) {
      var now = performance.now(); st.joins.push(now);
      var age = fresh ? Math.floor(Math.random() * 6) : 30 + Math.floor(Math.random() * 400);
      if (st.raidStart === 0) st.raidStart = now;
      if (!st.raid && st.joins.length > 10) {
        var pipe = 180 + Math.random() * 140;
        st.latency = (now - st.raidStart) + pipe; st.raid = true;
        log("bad", "RAID DETECTED: " + st.joins.length + " joins in 10 s. Raid mode ON. Pipeline " + Math.round(pipe) + " ms.");
      }
      if (st.raid && age < 7) { st.blocked++; log("warn", "quarantined new account (" + age + " d old) during raid"); }
      else log("ok", "member joined (account " + age + " d old)");
      stats();
    }
    function raidBurst() {
      if (st.locked) return;
      st.raidStart = 0; st.raid = false; st.latency = null; st.joins = [];
      log("bad", "Raid simulation: 30 joins over 6 s starting");
      var n = 0, t = setInterval(function () { join(true); n++; if (n >= 30) { clearInterval(t); log("info", "burst finished"); stats(); } }, 200);
    }
    function nuke() {
      log("bad", "Nuke attempt: actor 'rogue#0001' sends role-delete requests");
      var tries = 0, t = setInterval(function () {
        tries++;
        if (tries <= 3) { st.blocked++; log("warn", "denied: role delete by rogue#0001 (permission check)"); }
        else if (!st.locked) { st.locked = true; log("bad", "Permission lock engaged: rogue#0001 frozen, admin alert sent"); }
        else { st.blocked++; log("warn", "blocked: rogue#0001 locked out"); }
        stats();
        if (tries >= 8) clearInterval(t);
      }, 300);
    }
    $("arena-traffic").addEventListener("click", function () {
      var b = $("arena-traffic");
      if (st.traffic) { clearInterval(st.traffic); st.traffic = null; b.textContent = "Start traffic"; b.setAttribute("aria-pressed", "false"); log("info", "traffic stopped"); }
      else { st.traffic = setInterval(function () { message(); if (Math.random() < 0.15) join(false); stats(); }, reduce ? 900 : 420); b.textContent = "Stop traffic"; b.setAttribute("aria-pressed", "true"); log("info", "traffic started"); }
    });
    function pauseTraffic() { if (st.traffic) { clearInterval(st.traffic); st.traffic = null; var tb = $("arena-traffic"); tb.textContent = "Start traffic"; tb.setAttribute("aria-pressed", "false"); } }
    window.addEventListener("hashchange", function () { if (location.hash !== "#/arena") pauseTraffic(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) pauseTraffic(); });
    $("arena-raid").addEventListener("click", function () { raidBurst(); setTimeout(nuke, 2000); });
    $("arena-reset").addEventListener("click", function () {
      if (st.traffic) { clearInterval(st.traffic); st.traffic = null; $("arena-traffic").textContent = "Start traffic"; $("arena-traffic").setAttribute("aria-pressed", "false"); }
      st = { joins: [], traffic: null, msgs: {}, muted: {}, raid: false, blocked: 0, locked: false, actorTries: 0, latency: null, raidStart: 0 };
      logEl.innerHTML = ""; log("info", "server reset"); stats();
    });
    $("arena-intro").addEventListener("click", function () { if (window.__arenaReplay) window.__arenaReplay(); });
    log("info", "simulated server online. Press a button to start.");
    stats();

    // trade calculator
    var rows = { a: [["Starter sword", 40], ["Potion x3", 12]], b: [["Shield", 35], ["Gold 20", 20]] };
    function renderRows(side) {
      var box = $("tr-" + side); box.innerHTML = "";
      rows[side].forEach(function (r, i) {
        var line = document.createElement("div"); line.className = "row-item";
        line.innerHTML = '<input type="text" aria-label="Item name" value="' + esc(r[0]) + '" data-s="' + side + '" data-i="' + i + '" data-k="n"/>' +
          '<input type="number" min="0" step="1" aria-label="Item value" value="' + r[1] + '" data-s="' + side + '" data-i="' + i + '" data-k="v"/>' +
          '<button type="button" class="btn" data-del="' + side + '" data-i="' + i + '" aria-label="Remove item">×</button>';
        box.appendChild(line);
      });
      calc();
    }
    function calc() {
      var ta = rows.a.reduce(function (s, r) { return s + (+r[1] || 0); }, 0), tb = rows.b.reduce(function (s, r) { return s + (+r[1] || 0); }, 0);
      $("tr-ta").textContent = ta; $("tr-tb").textContent = tb;
      if (!ta || !tb) { $("tr-ratio").textContent = "—"; $("tr-score").textContent = "—"; $("tr-verdict").textContent = "Add value to both sides to see the balance."; return; }
      var lo = Math.min(ta, tb), hi = Math.max(ta, tb), score = Math.round(lo / hi * 100);
      $("tr-ratio").textContent = (ta / tb).toFixed(2) + " : 1";
      $("tr-score").textContent = score + " / 100";
      $("tr-verdict").textContent = score >= 90 ? "Balanced: both sides are within 10% of each other." : score >= 75 ? "Slightly unfair: the bigger side should give a bit more." : "Unfair: this trade favours one side heavily.";
    }
    $("view-arena").addEventListener("input", function (e) {
      var t = e.target; if (!t.getAttribute || !t.getAttribute("data-s")) return;
      var s = t.getAttribute("data-s"), i = +t.getAttribute("data-i"), k = t.getAttribute("data-k");
      rows[s][i][k === "n" ? 0 : 1] = k === "n" ? t.value : t.value; calc();
    });
    $("view-arena").addEventListener("click", function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute("data-add")) { var s = t.getAttribute("data-add"); rows[s].push(["New item", 10]); renderRows(s); }
      if (t.getAttribute && t.getAttribute("data-del")) { var s2 = t.getAttribute("data-del"); if (rows[s2].length > 1) rows[s2].splice(+t.getAttribute("data-i"), 1); renderRows(s2); }
    });
    renderRows("a"); renderRows("b");
  })();

  // ---------- Vault ----------
  (function () {
    var topo = $("topo"); if (!topo) return;
    var T = {
      polo: { n: ["App UI", "Static host", "Workflow + guardrails", "Session data"], s: ["Patient-facing screens", "Serves the page", "Triage steps and checks", "Per-session state"], note: "Illustrative layer map for Polo. Real storage and hosting may differ." },
      nova: { n: ["Discord", "Gateway", "Bot cogs", "Server storage"], s: ["Members and commands", "Connects to Discord", "Verify, level, anti-spam, AFK", "Illustrative"], note: "Illustrative layer map for Nova 3.0. Confirm the storage details before relying on them." },
      eclipse: { n: ["Discord", "Gateway + keep-alive", "Six cogs (asyncio)", "storage.py JSON"], s: ["Slash commands and events", "Health endpoint, UptimeRobot pings", "Moderation, raid, XP, verify, AFK, utility", "Atomic writes, corrupt-file recovery"], note: "Eclipse as built: one asyncio process, six self-contained cogs, JSON storage with atomic writes." },
      apex: { n: ["Browser tab", "Static HTML file", "Anthropic Messages API", "sessionStorage"], s: ["Chat UI and prompt", "Served as a single file", "Model call with the system prompt", "API key stays in the tab"], note: "Apex as built: one HTML file, no build step, the key lives only in this tab's session." }
    };
    function draw(k) {
      var t = T[k], W = 760, xs = [70, 265, 460, 655], svg = "";
      document.querySelectorAll("[data-topo]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-topo") === k)); });
      for (var i = 0; i < 3; i++) svg += '<path class="topo-edge" d="M' + (xs[i] + 90) + ',100 L' + (xs[i + 1] - 90) + ',100" />';
      for (var j = 0; j < 4; j++) {
        svg += '<g class="edge-node" transform="translate(' + xs[j] + ',60)"><rect x="-86" y="0" width="172" height="80" rx="12" fill="#0c0e14" stroke="#1d2433"/>' +
          '<text x="0" y="28" text-anchor="middle">' + esc(["Client", "Edge", "Engine", "State"][j]) + '</text>' +
          '<text x="0" y="46" text-anchor="middle" class="sub">' + esc(t.n[j]) + '</text>' +
          '<text x="0" y="62" text-anchor="middle" class="sub">' + esc(t.s[j]) + '</text></g>';
      }
      svg += '<circle class="pulse" r="4"><animateMotion dur="3s" repeatCount="indefinite" path="M70,100 L655,100"/></circle>';
      topo.innerHTML = '<title id="topo-t">Layer map: client, edge, engine and state</title>' + svg;
      $("topo-note").textContent = t.note;
    }
    document.querySelectorAll("[data-topo]").forEach(function (b) { b.addEventListener("click", function () { draw(b.getAttribute("data-topo")); }); });
    draw("eclipse");

    // Snippets with simple highlighting
    function hl(code) {
      return esc(code).replace(/(\/\/[^\n]*)|(&quot;[^\n]*?&quot;|'[^'\n]*')|\b(const|let|var|function|return|if|else|new|class|export|import|from|for|of|throw|async|await|try|catch|this)\b/g,
        function (m, c, st, kw) { return c ? '<span class="cm">' + c + "</span>" : st ? '<span class="st">' + st + "</span>" : '<span class="kw">' + kw + "</span>"; });
    }
    var SN = [
      { t: "Static Edge Router", d: "Hash routes for a static site. Works on GitHub Pages with no server rules.",
        c: "const routes = { '/lab': showLab, '/vault': showVault };\nfunction route() {\n  const view = routes[location.hash.slice(1)] || showHome;\n  view();\n}\naddEventListener('hashchange', route);\nroute();" },
      { t: "Rate-Limiter Middleware", d: "Token bucket: each key gets a bucket that refills over time.",
        c: "function rateLimiter({ capacity = 5, refillPerSec = 1 } = {}) {\n  const buckets = new Map();\n  return function allow(key, now = Date.now()) {\n    const b = buckets.get(key) || { tokens: capacity, at: now };\n    b.tokens = Math.min(capacity, b.tokens + ((now - b.at) / 1000) * refillPerSec);\n    b.at = now;\n    const ok = b.tokens >= 1;\n    if (ok) b.tokens -= 1;\n    buckets.set(key, b);\n    return ok;\n  };\n}" },
      { t: "AI Guardrail Wrapper", d: "Checks length, strips control characters and blocks common injection phrases before a model call.",
        c: "const MAX = 2000;\nconst INJECTION = /ignore (all|previous) instructions|system prompt/i;\nexport function guard(input) {\n  const text = String(input).replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, '').slice(0, MAX);\n  if (INJECTION.test(text)) return { ok: false, reason: 'injection-pattern' };\n  return { ok: true, text };\n}" }
    ];
    function drawSnippets() {
      var q = ($("vault-q").value || "").toLowerCase(), box = $("vault-list"); box.innerHTML = "";
      SN.filter(function (s) { return !q || (s.t + " " + s.d).toLowerCase().indexOf(q) >= 0; }).forEach(function (s, i) {
        var d = document.createElement("details"); d.className = "entry"; d.open = i === 0;
        d.innerHTML = '<summary><span class="d">SNIPPET</span><b>' + esc(s.t) + '</b></summary><div class="body">' + esc(s.d) + '</div>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="btn" data-copy>Copy</button></div>' +
          '<pre class="code" style="margin-top:8px">' + hl(s.c) + '</pre>';
        d.querySelector("[data-copy]").addEventListener("click", function () { copy(s.c, s.t); });
        box.appendChild(d);
      });
      if (!box.childNodes.length) box.innerHTML = '<p class="note">No snippet matches that search.</p>';
    }
    $("vault-q").addEventListener("input", drawSnippets);
    drawSnippets();

    // Bloated vs lean
    var BLOAT = "// Bloated: a class, a config object and a cache nobody needs\nclass LimitChecker {\n  constructor(config) { this.config = config || {}; this.cache = {}; this.logger = console; }\n  _key(user) { return 'user:' + String(user.id); }\n  _now() { return new Date().getTime(); }\n  check(user, action) {\n    const key = this._key(user);\n    const now = this._now();\n    const limit = this.config.limit || 5;\n    const windowMs = this.config.windowMs || 5000;\n    if (!this.cache[key]) this.cache[key] = [];\n    this.cache[key] = this.cache[key].filter(function (t) { return now - t < windowMs; });\n    if (this.cache[key].length >= limit) { this.logger.log('limit hit'); return false; }\n    this.cache[key].push(now);\n    return true;\n  }\n}";
    var LEAN = "// Lean: one map, one function\nconst hits = new Map();\nexport function overLimit(id, limit = 5, windowMs = 5000, now = Date.now()) {\n  const recent = (hits.get(id) || []).filter(t => now - t < windowMs);\n  if (recent.length >= limit) return true;\n  recent.push(now);\n  hits.set(id, recent);\n  return false;\n}";
    $("diff-bloat").textContent = BLOAT; $("diff-lean").textContent = LEAN;
    var bb = bytes(BLOAT), lb = bytes(LEAN);
    $("diff-bsize").textContent = bb + " B"; $("diff-lsize").textContent = lb + " B";
    $("diff-saved").textContent = Math.round((1 - lb / bb) * 100) + "%";
    $("diff-lines").textContent = BLOAT.split("\n").length + " → " + LEAN.split("\n").length;
  })();

  // ---------- Logs ----------
  (function () {
    var list = $("logs-list"); if (!list) return;
    var E = [
      ["2026-11-21", "shipped", "Six more pages and a clearer loading duel", "About, Services, Contact, Now, Uses and an All pages hub, plus a duel with bigger fighters, name tags and a caption for every move."],
      ["2026-11-21", "shipped", "1000 generated colour themes", "A seeded generator builds 1000 palettes across ten families. Each palette is checked for readable contrast, and a picker applies the choice before the page paints."],
      ["2026-11-21", "shipped", "Case-study pages for the flagship projects", "Polo, Nova 3.0, Eclipse and Apex each have a page: what it does, how it is built, and an at-a-glance summary."],
      ["2026-11-20", "shipped", "VEGA holographic assistant", "A 3D portfolio map with a voice assistant that answers from the page and can open sections, simulations and the résumé."],
      ["2026-11-20", "shipped", "One-page résumé and shareable links", "A résumé built live from the page, printable as one A4 page, plus deep links such as #resume."],
      ["2026-11-20", "shipped", "Command palette, simulations and terminal", "Ctrl+K command palette, live simulations for Polo, Nova, Eclipse and Apex, a stack graph and a small terminal."],
      ["2026-11-20", "shipped", "Skills overview with category filters", "41 skills grouped into five categories, with filter tabs and short tags."],
      ["2026-11-20", "shipped", "Accessibility and mobile polish", "Lighter logo, fixes for every axe violation found, and cleaner mobile controls."],
      ["2026-11-16", "arch", "Silver and burgundy redesign", "Grouped navigation, section bands and a recoloured night sky to match the new logo."],
      ["2026-11-15", "arch", "Hosting moved to Render", "Site URLs updated, plus sitemap, security headers and SEO meta."],
      ["2026-11-15", "arch", "Lean performance pass", "Heavy rotating loader layers and full-repaint animations removed, with a lighter background on phones."],
      ["2026-11-15", "ops", "Moderation at scale", "Moderated a 90,000-member Roblox community server and co-founded the Galaxy network: five brands, about 1.5k–2k members."],
      ["2026-11-15", "ops", "Community network ops", "Governance, mergers and treaties, plus a layered anti-nuke and raid defence with ownership kept in a separate account."],
      ["Ongoing", "ops", "Football edits and original soundtracks", "European football highlight edits cut to the beat, with soundtracks made in Google Flow Music."]
    ];
    var filter = "all";
    function draw() {
      var items = E.filter(function (e) { return filter === "all" || e[1] === filter; });
      list.innerHTML = items.map(function (e) {
        var tag = { shipped: "Shipped", arch: "Architecture", ops: "Community Ops" }[e[1]];
        return '<details class="entry"><summary><span class="d">' + esc(e[0]) + " · " + esc(tag) + "</span><b>" + esc(e[2]) + '</b></summary><div class="body">' + esc(e[3]) + "</div></details>";
      }).join("") || '<p class="note">Nothing in this filter yet.</p>';
    }
    document.querySelectorAll("#logs-tabs [data-f]").forEach(function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-f");
        document.querySelectorAll("#logs-tabs [data-f]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        draw();
      });
    });
    draw();
  })();

  // ---------- Dossier ----------
  (function () {
    var box = $("dos-cards"); if (!box) return;
    var P = [
      ["Polo", "Health AI app", "In progress", "Structured wellness workflows with clinical safety guardrails designed in.", "projects/polo.html"],
      ["Nova 3.0 Ultimate", "Discord bot", "Live", "Verification views, leveling, anti-spam and AFK tracking in live communities.", "projects/nova.html"],
      ["Eclipse", "discord.py bot", "In progress", "Moderation, anti-raid, XP and verification in six self-contained cogs, on a free Render web service.", "projects/eclipse.html"],
      ["Apex", "AI co-pilot", "Prototype", "A single-file co-pilot that runs a builder-focused system prompt on the Anthropic API.", "projects/apex.html"]
    ];
    box.innerHTML = P.map(function (p) {
      return '<article class="panel cy"><span class="kick">' + esc(p[1]) + " · " + esc(p[2]) + '</span><h2 style="margin-top:8px">' + esc(p[0]) + '</h2><p class="note" style="margin-top:8px;color:var(--tx-2)">' + esc(p[3]) + '</p><p style="margin-top:12px"><a href="' + esc(p[4]) + '" style="color:var(--cy)">Case study →</a></p></article>';
    }).join("");
    var stack = ["Python", "discord.py", "asyncio", "JavaScript", "HTML / CSS", "Anthropic API", "Render", "UptimeRobot", "Claude Pro", "Bolt.new", "Lovable", "Replit Agent", "GitHub"];
    $("dos-stack").innerHTML = stack.map(function (s) { return '<span class="badge info">' + esc(s) + "</span>"; }).join("");
    $("dos-print").addEventListener("click", function () { if (window.__features && window.__features.printCV) window.__features.printCV(); });
    $("dos-resume").addEventListener("click", function () { if (window.__features && window.__features.openResume) window.__features.openResume(); });
    $("dos-copy").addEventListener("click", function () { var m = $("mailText"); copy(m ? m.textContent : "", "Email"); });
  })();

  // ---------- Contact, copy buttons, Explore hub ----------
  (function () {
    var f = $("ct-form");
    if (f) f.addEventListener("submit", function (e) {
      e.preventDefault(); if (!f.reportValidity()) return;
      var d = new FormData(f), mail = $("ct-mail") ? $("ct-mail").textContent : "vini.official.netops@gmail.com";
      var body = ["Name: " + d.get("name"), "Email: " + d.get("email"), "Topic: " + d.get("topic"), "", d.get("message")].join("\n");
      $("ct-status").textContent = "Opening your email app with the details filled in. Just press send there.";
      location.href = "mailto:" + mail + "?subject=" + encodeURIComponent("Enquiry: " + d.get("topic") + " from " + d.get("name")) + "&body=" + encodeURIComponent(body);
    });
    var cm = $("ct-copy-mail"), cd = $("ct-copy-discord");
    if (cm) cm.addEventListener("click", function () { copy($("ct-mail").textContent, "Email"); });
    if (cd) cd.addEventListener("click", function () { copy($("ct-discord").textContent, "Discord handle"); });
    var grid = $("explore-grid"); if (!grid) return;
    var pages = [["about", "About", "Who I am and what I do"], ["services", "Services", "Bots, moderation, edits and ads"], ["contact", "Contact", "Email, Discord and the enquiry form"],
      ["now", "Now", "What I'm working on right now"], ["uses", "Uses", "The tools behind my projects"], ["lab", "Lab", "Heart-rate simulator, triage flow and guardrail inspector"],
      ["arena", "Arena", "Bot raid simulation and a trade calculator"], ["vault", "Vault", "Layer maps, starter code and a bloated vs lean comparison"],
      ["earth-core", "Earth core", "Cutaway Earth, drill probe and seismic waves"], ["cosmos", "Cosmos", "Magnetosphere, solar wind and satellite orbits"], ["logs", "Engineering log", "Shipped work with real dates"], ["dossier", "Dossier", "Project summary with print and copy"]];
    grid.innerHTML = pages.map(function (x) { return '<a class="tile" href="#/' + x[0] + '"><span class="kick">Page</span><h2 style="font-size:1rem">' + esc(x[1]) + "</h2><p>" + esc(x[2]) + "</p></a>"; }).join("");
    var cases = [["polo", "Polo", "Health AI app"], ["nova", "Nova 3.0 Ultimate", "Discord bot"], ["eclipse", "Eclipse", "discord.py bot"], ["apex", "Apex", "AI co-pilot"]];
    $("explore-cases").innerHTML = cases.map(function (x) { return '<a class="tile" href="projects/' + x[0] + '.html"><span class="kick">' + esc(x[2]) + "</span><h3>" + esc(x[1]) + "</h3><p>Case study →</p></a>"; }).join("");
  })();

  // ---------- palette and terminal entry points ----------
  var CM = window.__cmds = window.__cmds || [];
  [["lab", "Lab", "Apex-Fit simulator, Polo triage, guardrail inspector"], ["arena", "Arena", "Bot raid and nuke simulation, trade calculator"],
   ["vault", "Vault", "Architecture maps, starter snippets, bloated vs lean"], ["logs", "Engineering log", "Shipped work, architecture and community operations"],
   ["dossier", "Dossier", "Project summary, print and copy"], ["about", "About", "Who I am and what I do"], ["services", "Services", "Bots, moderation, edits and ads"],
   ["contact", "Contact", "Email, Discord and the enquiry form"], ["now", "Now", "What I'm working on right now"], ["uses", "Uses", "The tools behind my projects"],
   ["explore", "All pages", "Every page on this site"], ["earth-core", "Earth core", "Cutaway Earth, drill probe, seismic waves"], ["cosmos", "Cosmos", "Magnetosphere, solar wind, LEO/MEO/GEO orbits"]].forEach(function (r) {
    CM.push({ t: "Go to " + r[1], d: r[2], k: r[0] + " " + r[1].toLowerCase() + " page view route", run: function () { location.hash = "#/" + r[0]; } });
  });
  CM.push({ t: "Replay intro duel", d: "Play the loading duel again", k: "intro duel replay loader arena", run: function () { if (window.__arenaReplay) window.__arenaReplay(); } });
  var fx = window.__fx;
  if (fx && fx.cmds && fx.print) {
    ["lab", "arena", "vault", "logs", "dossier", "about", "services", "contact", "now", "uses", "pages"].forEach(function (n) { fx.cmds[n] = function () { location.hash = "#/" + (n === "pages" ? "explore" : n); fx.print("g", "→ " + n); }; });
    fx.cmds.intro = function () { if (window.__arenaReplay) window.__arenaReplay(); fx.print("g", "replaying intro"); };
    var oh = fx.cmds.help;
    fx.cmds.help = function (a) { oh(a); fx.print("o", "  lab · arena · vault · logs · dossier   open a page\n  about · services · contact · now · uses · pages\n  intro              replay the loading duel"); };
  }
  document.querySelectorAll("[data-route-link]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); location.hash = a.getAttribute("data-route-link"); }); });
})();
