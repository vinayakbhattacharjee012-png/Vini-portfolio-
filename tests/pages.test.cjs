// New pages: Command Center page, All features page (every "Open" link must lead somewhere real).
// Run through `npm test` (sets BASE_URL to a local preview of the build).
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
let fails = 0;
const check = (n, ok, x = '') => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const quiet = (m) => /Failed to load resource|fonts\.g|ERR_/.test(m);

async function open(b, path, { vp = { width: 1280, height: 860 }, theme } = {}) {
  const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
  await ctx.addInitScript((t) => { try { sessionStorage.setItem('vini-quick', '1'); if (t) localStorage.setItem('theme', t); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !quiet(m.text()) && p.errs.push(m.text().slice(0, 160)));
  await p.goto(BASE + path);
  await p.waitForTimeout(900);
  return p;
}

(async () => {
  const b = await chromium.launch();

  // Command Center page
  let p = await open(b, 'command-center.html', { theme: 'nebula' });
  check('Command Center page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  check('uses the saved look', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'nebula');
  check('accent follows the look', (await p.evaluate(() => getComputedStyle(document.getElementById('page').shadowRoot.querySelector('.eyebrow')).color)) === 'rgb(185, 140, 255)');
  for (const t of ['Apex-Fit live simulator', 'Polo Health AI · triage demo', 'Bot security · anti-nuke simulator', 'Trade value & margin calculator'])
    check(`shows ${t}`, await p.locator(`text=${t}`).isVisible());
  await p.click('button:has-text("Trigger raid spike")'); await p.waitForTimeout(5000);
  check('raid sim runs on the page', (await p.locator('text=Raid contained').count()) > 0);
  await p.click('button:has-text("Inject stress test")'); await p.waitForTimeout(3300);
  check('stress test spikes latency', parseInt(await p.locator('dt:text-is("Peak") + dd').textContent()) > 60);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Export .json")')]);
  const snap = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  check('export holds all four sandboxes', snap.activeSandbox === 'all' && Object.keys(snap.sandboxes).length === 4, Object.keys(snap.sandboxes).join(','));
  check('page transitions enabled', await p.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.constructor.name === 'CSSViewTransitionRule' || /@view-transition/.test(r.cssText)); } catch (e) { return false; } })));
  await Promise.all([p.waitForURL(/features\.html/), p.click('nav a:has-text("All features")')]);
  check('header links to the features page', /features\.html/.test(p.url()));
  await p.context().close();

  // All features page
  p = await open(b, 'features.html');
  check('features page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  const counted = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 1600)); return document.getElementById('page').shadowRoot.querySelector('.num').textContent; });
  const links = await p.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  check('feature counter counts up', parseInt(counted) >= 100, counted + ' features');
  await p.fill('input[placeholder^="Search"]', 'raid');
  const raid = await p.locator('main li').count();
  check('search narrows the list', raid >= 2 && raid < 10, raid + ' results');
  await p.fill('input[placeholder^="Search"]', 'zzzz');
  check('empty search says so', await p.locator('text=No features match').isVisible());
  await p.fill('input[placeholder^="Search"]', '');
  await p.click('button[aria-pressed]:has-text("Command Center")');
  check('area filter', (await p.locator('main section[aria-label]').count()) === 1);
  check('test report section', await p.locator('#tests >> text=Checked in a real browser').isVisible());

  // Every internal link: hash routes must open something, pages must exist.
  const unique = [...new Set(links.filter((h) => !/^https?:/.test(h)))];
  const bad = [];
  for (const h of unique) {
    if (/^(command-center|features)\.html/.test(h)) {
      const r = await p.request.get(BASE + h.replace(/#.*$/, '')); if (!r.ok()) bad.push(h);
      continue;
    }
    if (!h.startsWith('./#') || h === './#') continue;
    const id = h.slice(3);
    const q = await open(b, h);
    await q.waitForTimeout(700);
    const ok = await q.evaluate(async (id) => {
      // Filter links (#projects-python, #skills-ai) apply a filter and scroll to their section.
      const filterTarget = { projects: 'ai', skills: 'skills' }[id.split('-')[0]];
      if (filterTarget && !document.getElementById(id)) {
        for (let i = 0; i < 20; i++) { if (Math.abs(document.getElementById(filterTarget).getBoundingClientRect().top) < 200) return true; await new Promise((r) => setTimeout(r, 100)); }
        return false;
      }
      if (document.getElementById(id)) return true; // a section
      if (document.querySelector('dialog[open]')) return true; // résumé, sims, architecture, VEGA
      const layer = [...document.querySelectorAll('.vx-host')].pop();
      return !!layer?.shadowRoot?.querySelector('[role="dialog"]'); // Command Center, QR
    }, id);
    if (!ok) bad.push(h);
    await q.context().close();
  }
  check(`all ${unique.length} internal links open something`, bad.length === 0, bad.join(' '));
  await p.context().close();

  // Homepage knows about the pages
  p = await open(b, '');
  check('footer links to All features', (await p.locator('.foot-links button:has-text("All features")').count()) === 1);
  await p.context().close();

  // Phone widths
  for (const path of ['command-center.html', 'features.html']) {
    p = await open(b, path, { vp: { width: 375, height: 812 } });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`${path} at 375px: no sideways scroll`, sw <= 375, 'scrollWidth ' + sw);
    check(`${path} at 375px: no errors`, p.errs.length === 0, p.errs.join(' | '));
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
