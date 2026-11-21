// Extra pages: Command Center, All features, Case studies, Services, Galaxy network and Hire me.
// Every "Open" link must lead somewhere real. Run through `npm test` (sets BASE_URL to a local preview of the build).
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
let fails = 0;
const check = (n, ok, x = '') => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const quiet = (m) => /Failed to load resource|fonts\.g|ERR_/.test(m);
const PAGES = ['command-center.html', 'features.html', 'work.html', 'services.html', 'galaxy.html', 'contact.html'];

async function open(b, path, { vp = { width: 1280, height: 860 }, theme } = {}) {
  const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
  await ctx.addInitScript((t) => { try { sessionStorage.setItem('vini-quick', '1'); if (t) localStorage.setItem('theme', t); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  p.errs = [];
  p.posts = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !quiet(m.text()) && p.errs.push(m.text().slice(0, 160)));
  p.on('request', (r) => r.method() === 'POST' && p.posts.push(r.url()));
  await p.goto(BASE + path);
  await p.waitForTimeout(900);
  return p;
}
// Distance of a shadow-root element's top from the viewport top (after hash scrolling).
const topOf = (p, id) => p.evaluate((id) => Math.round(document.getElementById('page').shadowRoot.getElementById(id)?.getBoundingClientRect().top ?? 9999), id);

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
  await Promise.all([p.waitForURL(/features\.html/), p.click('footer a:has-text("All features")')]);
  check('footer links to the features page', /features\.html/.test(p.url()));
  await p.context().close();

  // All features page
  p = await open(b, 'features.html');
  check('features page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  const counted = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 1600)); return document.getElementById('page').shadowRoot.querySelector('.num').textContent; });
  const links = await p.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  check('feature counter counts up', parseInt(counted) >= 120, counted + ' features');
  check('lists the client pages', ['work.html', 'services.html', 'galaxy.html', 'contact.html'].every((h) => links.includes(h)));
  await p.fill('input[placeholder^="Search"]', 'raid');
  const raid = await p.locator('main li').count();
  check('search narrows the list', raid >= 2 && raid < 10, raid + ' results');
  await p.fill('input[placeholder^="Search"]', 'zzzz');
  check('empty search says so', await p.locator('text=No features match').isVisible());
  await p.fill('input[placeholder^="Search"]', '');
  await p.click('button[aria-pressed]:has-text("Command Center")');
  check('area filter', (await p.locator('main section[aria-label]').count()) === 1);
  check('test report section', await p.locator('#tests >> text=Checked in a real browser').isVisible());

  // Every internal link: pages must exist, hash routes on the homepage must open something.
  const unique = [...new Set(links.filter((h) => !/^https?:/.test(h)))];
  const bad = [];
  for (const h of unique) {
    if (/^[\w-]+\.html/.test(h)) {
      const r = await p.request.get(BASE + h.replace(/[#?].*$/, '')); if (!r.ok()) bad.push(h);
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

  // Case studies
  p = await open(b, 'work.html');
  check('Case studies page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  const cases = await p.locator('main article').count();
  check('shows every case study', cases >= 8, cases + ' case studies');
  check('header marks the current page', (await p.locator('header a[aria-current="page"]').textContent()) === 'Work');
  await p.click('button[aria-pressed]:has-text("Discord bot")');
  check('filter narrows case studies', (await p.locator('main article').count()) === 2 && await p.locator('text=2 of').isVisible());
  await p.click('button[aria-pressed]:has-text("All")');
  check('filter resets', (await p.locator('main article').count()) === cases);
  check('borders render inside the page (Tailwind defaults registered)', (await p.evaluate(() => getComputedStyle(document.getElementById('page').shadowRoot.querySelector('.border-l-2')).borderLeftStyle)) === 'solid');
  await p.context().close();
  p = await open(b, 'work.html#security');
  const secTop = await topOf(p, 'security');
  check('work.html#security scrolls to that case study', secTop >= 0 && secTop < 140, 'top ' + secTop);
  await p.context().close();

  // Services, and "Start this project" preselecting the Hire me form
  p = await open(b, 'services.html');
  check('Services page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  check('shows six services', (await p.locator('main article').count()) === 6);
  check('four-step process', (await p.locator('#process li').count()) === 4);
  await p.click('nav[aria-label="Services on this page"] a:has-text("Advertising")'); await p.waitForTimeout(500);
  const adsTop = await topOf(p, 'ads');
  check('service chips jump to their card', adsTop >= 0 && adsTop < 140, 'top ' + adsTop);
  await Promise.all([p.waitForURL(/contact\.html\?type=Discord/), p.click('#bots a:has-text("Start this project")')]);
  await p.waitForTimeout(700);
  check('Start this project opens Hire me with the service picked', (await p.locator('[role="radio"][aria-checked="true"]').textContent()) === 'Discord bot');
  await p.context().close();

  // Galaxy network
  p = await open(b, 'galaxy.html', { theme: 'hologram' });
  check('Galaxy page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  check('network map drawn', await p.locator('svg[role="img"][aria-label^="Network map"]').isVisible());
  check('all five brands listed', (await p.locator('#brands li').count()) === 5);
  check('join link opens the Galaxy Empire invite in a new tab', (await p.locator('a:has-text("Join Galaxy Empire")').first().getAttribute('target')) === '_blank'
    && /discord\.gg\/JJkyD2Rhc/.test(await p.locator('a:has-text("Join Galaxy Empire")').first().getAttribute('href')));
  await p.click('a[href="#advertise"]'); await p.waitForTimeout(500);
  const adTop = await topOf(p, 'advertise');
  check('Advertise with us jumps to the ad section', adTop >= 0 && adTop < 140, 'top ' + adTop);
  check('three ad options, rates on request', (await p.locator('#advertise >> text=Rate on request').count()) === 3);
  await Promise.all([p.waitForURL(/contact\.html\?type=Advertising/), p.click('a:has-text("Send an ad enquiry")')]);
  await p.waitForTimeout(700);
  check('ad enquiry opens Hire me with Advertising picked', (await p.locator('[role="radio"][aria-checked="true"]').textContent()) === 'Advertising');
  await p.context().close();

  // Hire me
  p = await open(b, 'contact.html');
  check('Hire me page loads without errors', p.errs.length === 0, p.errs.join(' | '));
  check('four direct lines', (await p.locator('ul[aria-label="Direct lines"] > li').count()) === 4);
  await p.click('button:has-text("Copy handle")'); await p.waitForTimeout(300);
  check('copying the Discord handle confirms it', /Discord handle/.test(await p.locator('#toast').textContent()));
  await p.click('button:has-text("Transmit brief")');
  check('empty brief shows what is missing', (await p.locator('[aria-invalid="true"]').count()) === 3 && await p.locator('text=Pick a project type').isVisible());
  await p.click('[role="radio"]:has-text("Server security")');
  await p.fill('#f-name', 'Test Client'); await p.fill('#f-email', 'client@example.com');
  await p.fill('#f-message', 'Need an anti-nuke setup for a 5k member server this month.');
  await p.click('button:has-text("Transmit brief")'); await p.waitForTimeout(400);
  const mail = await p.locator('a:has-text("Send via email")').getAttribute('href');
  check('brief hands over to email off Netlify, with a reference', /^mailto:/.test(mail) && /Server%20security/.test(mail) && await p.locator('dt:text-is("Reference")').isVisible());
  check('no form POST off Netlify (it would be lost)', p.posts.length === 0, p.posts.join(' '));
  await p.context().close();

  // Homepage knows about the pages
  p = await open(b, '');
  check('footer links to All features', (await p.locator('.foot-links button:has-text("All features")').count()) === 1);
  check('footer links to all four client pages', (await p.locator('.foot-links a[href$=".html"]').count()) === 4);
  check('Hire me button in the nav', (await p.locator('nav .nav-hire').getAttribute('href')) === 'contact.html' && await p.locator('nav .nav-hire').isVisible());
  check('Explore section links each page', (await p.$$eval('#explore a.card', (as) => as.map((a) => a.getAttribute('href')).join())) === 'work.html,services.html,galaxy.html,contact.html');
  check('section numbers survive off-screen skipping', (await p.evaluate(() => ['advertise', 'explore'].map((id) => document.querySelector(`#${id} .sec-head > .eyebrow`).dataset.n).join())) === '09,12');
  check('palette has the pages', await p.evaluate(() => ['Case studies', 'Services', 'Galaxy network', 'Hire me'].every((t) => (window.__cmds || []).some((c) => c.t === t))));
  check('terminal has page commands', await p.evaluate(() => ['work', 'services', 'network', 'hire'].every((c) => typeof window.__fx?.cmds?.[c] === 'function')));
  await p.context().close();
  p = await open(b, '', { vp: { width: 375, height: 812 } });
  check('375px: Hire me moves into the phone menu', !(await p.locator('nav .nav-hire').isVisible()));
  await p.click('#menuBtn'); await p.waitForTimeout(300);
  check('375px: phone menu lists the pages', await p.locator('#navLinks a:has-text("Hire me")').isVisible() && await p.locator('#navLinks a:has-text("Case studies")').isVisible());
  await p.context().close();

  // Phone widths
  for (const path of PAGES) {
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
