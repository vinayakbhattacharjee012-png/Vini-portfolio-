/* Builds the static Library: one real, working page per feature for four engines, plus index pages and sitemap entries.
   Run: node scripts/build-pages.js   (re-run after changing the registries). No dependencies. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, ".."), OUT = path.join(ROOT, "library"), SITE = "https://vini-portfolio.onrender.com/";
global.window = {}; global.document = { querySelectorAll: () => [], getElementById: () => null };
for (const f of ["src/data/commits.js", "src/data/featureRegistry1000.js", "src/data/featureRegistry2000.js"]) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), "utf8"));
const all = [].concat(window.FR1000.list, window.FR2000.list);
const SECTIONS = [
  { dir: "tools", r: 1, e: 2, title: "Tools", blurb: "100 small calculators and checkers that run in your browser: unit converters, heart-rate zones, rate limiters, validators, colour contrast and text tools." },
  { dir: "patterns", r: 1, e: 4, title: "Code patterns", blurb: "100 short, copyable patterns: rate limiters, anti-raid checks, deploy configs, validators and clean refactors, each with a small diagram." },
  { dir: "planets", r: 2, e: 2, title: "Planets and moons", blurb: "100 side-by-side comparisons of 14 bodies in the solar system: mass, size, density, gravity and escape velocity." },
  { dir: "astronomy", r: 2, e: 5, title: "Astronomy calculators", blurb: "100 quick astronomy conversions: light-years, parsecs, light travel time, redshift, parallax, Kepler's third law and more." }
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 70);
function page({ title, desc, canonical, depth, body, scripts }) {
  const up = "../".repeat(depth);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)} · Vini</title><meta name="description" content="${esc(desc)}" /><link rel="canonical" href="${canonical}" />
<meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" /><meta property="og:image" content="${SITE}og.png" />
<link rel="icon" href="${up}favicon-64.png" /><meta name="theme-color" content="#06070a" /><link rel="stylesheet" href="${up}library/library.css" /></head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="top"><a class="brand" href="${up}"><img src="${up}logo-vini-256.webp" alt="" width="28" height="28" />Vini</a><nav aria-label="Library"><a href="${up}library/">Library</a>${SECTIONS.map((s) => `<a href="${up}library/${s.dir}/">${s.title}</a>`).join("")}</nav></header>
<main id="main" class="wrap">${body}</main>
<footer class="foot wrap"><a href="${up}">← Back to the portfolio</a><span>Everything here runs in your browser. Nothing you type is sent anywhere.</span></footer>
<div id="toast" class="toast" role="status" aria-live="polite"></div>${scripts || ""}
</body></html>`;
}
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(__dirname, "library.css"), path.join(OUT, "library.css"));
const urls = [SITE + "library/"]; let count = 0;
for (const S of SECTIONS) {
  const items = all.filter((f) => f.r === S.r && f.e === S.e), used = new Set(), dir = path.join(OUT, S.dir); fs.mkdirSync(dir);
  items.forEach((f) => { let s = slug(f.n) || f.id.toLowerCase(); while (used.has(s)) s += "-" + f.id.slice(-3); used.add(s); f.slug = s; });
  items.forEach((f, i) => {
    const prev = items[(i - 1 + items.length) % items.length], next = items[(i + 1) % items.length], canonical = SITE + "library/" + S.dir + "/" + f.slug + ".html";
    const desc = (f.d || S.blurb).replace(/\s+/g, " ").slice(0, 155);
    const body = `<p class="crumbs"><a href="../">Library</a> / <a href="./">${S.title}</a></p><h1>${esc(f.n)}</h1><p class="lede">${esc(f.d || "")}</p>
<section class="card" id="app" aria-live="polite"><noscript>This tool needs JavaScript to run.</noscript><p class="muted">Loading…</p></section>
<nav class="pn" aria-label="More ${esc(S.title)}"><a href="${prev.slug}.html">← ${esc(prev.n)}</a><a href="${next.slug}.html">${esc(next.n)} →</a></nav>
<p class="muted small">Feature ${f.id}. Also in the <a href="../../#/f/${f.id}">portfolio explorer</a>.</p>`;
    const scripts = `<script src="../../src/data/featureRegistry1000.js" defer></script><script src="../../src/data/featureRegistry2000.js" defer></script><script src="../../src/engine/featureRunner.js" defer></script>
<script>addEventListener("DOMContentLoaded",function(){var a=document.getElementById("app");try{FM.run(FM.by["${f.id}"],a);["h3",".meta"].forEach(function(q){var x=a.querySelector(q);if(x)x.remove();});var d=a.querySelector("p");if(d&&d.textContent.trim()===document.querySelector(".lede").textContent.trim())d.remove();}catch(e){a.textContent="This tool couldn't start: "+e.message;}});</script>`;
    fs.writeFileSync(path.join(dir, f.slug + ".html"), page({ title: f.n, desc, canonical, depth: 2, body, scripts })); urls.push(canonical); count++;
  });
  const list = items.map((f) => `<li><a href="${f.slug}.html">${esc(f.n)}</a></li>`).join("");
  fs.writeFileSync(path.join(dir, "index.html"), page({ title: S.title, desc: S.blurb, canonical: SITE + "library/" + S.dir + "/", depth: 2, body: `<p class="crumbs"><a href="../">Library</a></p><h1>${S.title}</h1><p class="lede">${esc(S.blurb)}</p><label class="find">Filter <input type="search" id="q" placeholder="Type to filter…" autocomplete="off" /></label><ul class="grid" id="list">${list}</ul>`, scripts: `<script>var q=document.getElementById("q"),li=[].slice.call(document.querySelectorAll("#list li"));q.addEventListener("input",function(){var v=q.value.toLowerCase();li.forEach(function(l){l.hidden=v&&l.textContent.toLowerCase().indexOf(v)<0;});});</script>` }));
  urls.push(SITE + "library/" + S.dir + "/");
}
const hub = `<h1>Library</h1><p class="lede">${count} working pages built from the features on this site. Pick a shelf.</p><div class="shelves">${SECTIONS.map((S) => `<a class="card shelf" href="${S.dir}/"><b>${S.title}</b><span>${esc(S.blurb)}</span></a>`).join("")}</div>`;
fs.writeFileSync(path.join(OUT, "index.html"), page({ title: "Library", desc: "Hundreds of small, working tools and references from Vini's portfolio.", canonical: SITE + "library/", depth: 1, body: hub }));
// sitemap: keep the existing entries, add the library
const smPath = path.join(ROOT, "sitemap.xml"); let sm = fs.readFileSync(smPath, "utf8").replace(/\s*<url><loc>[^<]*\/library\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
sm = sm.replace("</urlset>", urls.map((u) => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`).join("\n") + "\n</urlset>");
fs.writeFileSync(smPath, sm);
console.log("library pages:", count, "+", SECTIONS.length + 1, "index pages; sitemap urls added:", urls.length);
