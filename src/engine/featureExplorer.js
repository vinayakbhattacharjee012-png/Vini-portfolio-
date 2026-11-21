/* Feature Matrix Explorer (Ctrl+Shift+F), terminal command bridge and dossier export. List is paged (30 per batch) and search is debounced. */
(function () {
  "use strict";
  var FM = window.FM, PAGE = 30, dlg, els = {}, state = { q: "", eng: "all", shown: 0, list: [], sel: null }, timer = 0;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = FM.esc;
  function engKey(f) { return f.r + "-" + f.e; }

  /* ---------- explorer ---------- */
  function build() {
    var v = FM.validate(), tot = FM.list.length;
    dlg = document.createElement("dialog"); dlg.className = "fm-dlg"; dlg.setAttribute("aria-labelledby", "fmT");
    dlg.innerHTML = '<div class="fm-top"><h2 id="fmT">Feature Matrix Explorer <b>(' + v.active.toLocaleString() + "/" + tot.toLocaleString() + ' Active)</b></h2><input type="search" id="fmQ" placeholder="Search 2,000 features…" autocomplete="off" aria-label="Search features"/><button type="button" class="fm-x" id="fmX" aria-label="Close">esc</button></div>' +
      '<div class="fm-eng" id="fmEng" role="group" aria-label="Filter by engine"></div><div class="fm-body"><ul class="fm-list" id="fmList" aria-live="polite"></ul><div class="fm-run" id="fmRun"><p class="fm-empty">Pick a feature and press Launch. Everything runs in your browser.</p></div></div><div class="fm-stat" id="fmStat"></div>';
    document.body.appendChild(dlg);
    els = { q: $("#fmQ", dlg), eng: $("#fmEng", dlg), list: $("#fmList", dlg), run: $("#fmRun", dlg), stat: $("#fmStat", dlg) };
    var chips = '<button type="button" aria-pressed="true" data-e="all">All</button>';
    FM.engines.forEach(function (e) { chips += '<button type="button" aria-pressed="false" data-e="' + e.r + "-" + e.id + '" title="' + esc(e.n) + '">R' + e.r + " · E" + String(e.id).padStart(2, "0") + " " + esc(e.n.split(/ [&(]/)[0]) + "</button>"; });
    els.eng.innerHTML = chips;
    els.eng.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; state.eng = b.dataset.e; Array.prototype.forEach.call(els.eng.children, function (c) { c.setAttribute("aria-pressed", c === b); }); refilter(); });
    els.q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { state.q = els.q.value.trim().toLowerCase(); refilter(); }, 120); });
    $("#fmX", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    els.list.addEventListener("click", function (e) {
      var more = e.target.closest(".fm-more"); if (more) { more.remove(); paint(); return; }
      var b = e.target.closest("button[data-id]"); if (!b) return;
      var f = FM.by[b.dataset.id]; if (!f) return; Array.prototype.forEach.call(els.list.querySelectorAll("li.on"), function (x) { x.classList.remove("on"); }); b.parentNode.classList.add("on");
      launch(f);
    });
  }
  function launch(f) { state.sel = f; try { FM.run(f, els.run); } catch (e) { els.run.innerHTML = "<p class='fm-empty'>This feature failed: " + esc(e.message) + "</p>"; } els.run.scrollTop = 0; if (window.SFX) SFX.tick(); if (matchMedia("(max-width:760px)").matches) els.run.scrollIntoView({ block: "nearest" }); }
  function refilter() {
    var q = state.q, words = q ? q.split(/\s+/) : [];
    state.list = FM.list.filter(function (f) { if (state.eng !== "all" && engKey(f) !== state.eng) return false; for (var i = 0; i < words.length; i++) if (f.k.indexOf(words[i]) < 0 && f.id.toLowerCase().indexOf(words[i]) < 0) return false; return true; });
    state.shown = 0; els.list.textContent = ""; paint();
  }
  function paint() {
    var frag = document.createDocumentFragment(), end = Math.min(state.list.length, state.shown + PAGE), i;
    for (i = state.shown; i < end; i++) { var f = state.list[i], li = document.createElement("li"); li.innerHTML = "<code>" + f.id.slice(1, 2) + "·" + f.id.slice(4) + "</code><span title='" + esc(f.n) + "'>" + esc(f.n) + "</span><button type='button' data-id='" + f.id + "'>Launch</button>"; frag.appendChild(li); }
    state.shown = end; els.list.appendChild(frag);
    if (end < state.list.length) { var m = document.createElement("li"); m.style.display = "block"; m.innerHTML = '<button type="button" class="fm-more">Load ' + Math.min(PAGE, state.list.length - end) + " more</button>"; els.list.appendChild(m); }
    if (!state.list.length) els.list.innerHTML = '<li class="fm-empty" style="display:block">No features match.</li>';
    var s = FM.stats(); els.stat.textContent = "Showing " + end + " of " + state.list.length + " matches · " + FM.list.length.toLocaleString() + " features total · you ran " + s.runs + " (" + s.unique + " unique), " + s.unlocked + " milestones unlocked";
  }
  FM.open = function (q) {
    if (!dlg) build();
    if (!dlg.open) dlg.showModal();
    FM.flag("fm");
    if (typeof q === "string") { els.q.value = q; state.q = q.toLowerCase(); }
    refilter(); setTimeout(function () { els.q.focus(); }, 0);
  };

  /* ---------- terminal bridge: tab-complete, flags and pipes ---------- */
  var cmds = FM.cmds = {};
  FM.terminal = function () {
    var fx = window.__fx, vi = document.getElementById("vtIn");
    if (!fx || !fx.cmds || FM.terminalReady) return; FM.terminalReady = true;
    FM.list.forEach(function (f) { if (f.t === "term" && f.p.cmd !== "noop" && !cmds[f.p.cmd]) { cmds[f.p.cmd] = { fn: f.p.fn, desc: f.p.desc }; if (!fx.cmds[f.p.cmd]) fx.cmds[f.p.cmd] = function () { }; } });
    var PF = { upper: function (s) { return s.toUpperCase(); }, lower: function (s) { return s.toLowerCase(); }, count: function (s) { return String(s.split("\n").filter(Boolean).length); }, sort: function (s) { return s.split("\n").sort().join("\n"); }, uniq: function (s) { return Array.from(new Set(s.split("\n"))).join("\n"); }, copy: function (s) { FM.copy(s, "Output"); return s; }, json: function (s) { return JSON.stringify({ output: s }); } };
    function pipe(s, seg) { var p = seg.trim().split(/\s+/), n = p[0]; if (n === "head") return s.split("\n").slice(0, +p[1] || 10).join("\n"); if (n === "tail") return s.split("\n").slice(-(+p[1] || 10)).join("\n"); if (n === "grep") return s.split("\n").filter(function (l) { return l.toLowerCase().indexOf((p[1] || "").toLowerCase()) > -1; }).join("\n"); return PF[n] ? PF[n](s) : s + "\n(unknown filter: " + n + ")"; }
    function exec(line) {
      var segs = line.split("|"), toks = segs[0].trim().split(/\s+/), name = toks[0].toLowerCase(), flags = toks.filter(function (t) { return t.indexOf("--") === 0; }), args = toks.slice(1).filter(function (t) { return t.indexOf("--") !== 0; }).join(" ");
      var out; try { out = String(cmds[name].fn(args)); } catch (e) { out = "error: " + e.message; }
      segs.slice(1).forEach(function (s) { out = pipe(out, s); });
      if (flags.indexOf("--json") > -1) out = JSON.stringify({ command: name, output: out });
      if (flags.indexOf("--copy") > -1) FM.copy(out, "Output");
      fx.print("o", out);
    }
    FM.runInTerminal = function (line) { fx.openTerminal(); setTimeout(function () { fx.print("c", "$ " + line); exec(line); FM.flag("terminal"); }, 30); };
    if (vi) vi.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return; var line = vi.value.trim(), name = line.split(/[\s|]/)[0].toLowerCase();
      if (!cmds[name]) return; e.preventDefault(); e.stopImmediatePropagation(); vi.value = ""; fx.print("c", "$ " + line); exec(line);
    }, true);
  };
  var stub = FM.runInTerminal = function (line) { FM.terminal(); if (FM.runInTerminal !== stub) FM.runInTerminal(line); };

  /* ---------- dossier export ---------- */
  function txt(sel) { var e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; }
  FM.dossierText = function (role) {
    var cards = Array.prototype.map.call(document.querySelectorAll("#ai .grid .card"), function (c) { return { t: txt2(c, "h3"), d: txt2(c, "p"), tags: c.dataset.tags || "" }; });
    function txt2(c, s) { var e = c.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; }
    var want = { recruiter: ["web", "ops", "python"], ai: ["ai", "web"], community: ["python", "bots", "ops"] }[role] || [];
    cards.sort(function (a, b) { var A = want.some(function (w) { return a.tags.indexOf(w) > -1; }) ? 0 : 1, B = want.some(function (w) { return b.tags.indexOf(w) > -1; }) ? 0 : 1; return A - B; });
    var skills = Array.prototype.map.call(document.querySelectorAll("#skGrid .sk-card"), function (c) { return (c.querySelector("h3") || {}).textContent + ": " + Array.prototype.map.call(c.querySelectorAll(".sk-pills li"), function (l) { return l.textContent; }).join(", "); });
    var focus = { recruiter: "Shipped, deployable work and the tooling around it.", ai: "AI products, safety guardrails and system design.", community: "Bots, moderation and running communities at scale." }[role] || "";
    return ["# Vini: dossier (" + role + " view)", "", "Focus: " + focus, "", "## Projects (ordered for this view)"].concat(cards.map(function (c) { return "- " + c.t + ": " + c.d; })).concat(["", "## Skills"], skills.map(function (s) { return "- " + s; }), ["", "## Contact", "- Email: " + (txt("#ct-mail") || "see the Contact page"), "- Discord: " + (txt("#ct-discord") || "see the Contact page"), "", "Generated in the browser from the live page. Nothing was sent anywhere."]).join("\n");
  };
  FM.dossier = function (role) {
    var text = FM.dossierText(role), d = document.createElement("dialog"); d.className = "w2-dlg";
    d.innerHTML = '<form method="dialog" class="w2-x"><button aria-label="Close">esc</button></form><h2>Dossier: ' + esc(role) + '</h2><pre style="white-space:pre-wrap;max-height:50vh;overflow:auto;font:500 .78rem/1.5 monospace">' + esc(text) + '</pre><div class="w2-act"><button type="button" class="w2-go" data-a="c">Copy</button><button type="button" class="w2-go alt" data-a="d">Download .md</button></div>';
    document.body.appendChild(d); d.addEventListener("close", function () { d.remove(); });
    d.addEventListener("click", function (e) { var b = e.target.closest("button[data-a]"); if (!b) return; if (b.dataset.a === "c") FM.copy(text, "Dossier"); else { var a = document.createElement("a"), u = URL.createObjectURL(new Blob([text], { type: "text/markdown" })); a.href = u; a.download = "vini-dossier-" + role + ".md"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000); } FM.flag("export"); });
    d.showModal();
  };
})();
