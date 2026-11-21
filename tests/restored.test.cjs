// Restored content: raid sim, timeline, constellation, gaming.
// Run through `npm test` (sets BASE_URL to a local preview of the build).
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const { chromium } = require('playwright');
const DIR = require('os').tmpdir() + '/';
let fails = 0; const check = (n, ok, x = '') => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1280, 800], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text()) && errs.push(m.text().slice(0, 150)));
    await p.goto(BASE); await p.waitForFunction(() => !document.documentElement.classList.contains('loading')); await p.waitForTimeout(900);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`${w}px: no sideways scroll`, sw <= w, 'scrollWidth ' + sw);
    if (w >= 1280) {
      const nav = await p.evaluate(() => { const r = document.querySelector('nav .wrap').getBoundingClientRect(); const links = [...document.querySelectorAll('#navLinks a')]; const tops = new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))); return { h: Math.round(r.height), rows: tops.size, gaming: links.some((a) => a.textContent === 'Gaming') }; });
      check(`${w}px: nav on one row with Gaming link`, nav.rows === 1 && nav.h <= 64 && nav.gaming, JSON.stringify(nav));
    }
    if (w !== 1440) { check(`${w}px: no JS errors`, errs.length === 0, errs.join(' | ')); await p.close(); continue; }
    check('ticker filled', (await p.locator('#ticker span').count()) > 20);
    check('About facts back', (await p.locator('.facts .fact').count()) === 4);
    await p.evaluate(() => document.getElementById('security').scrollIntoView()); await p.waitForTimeout(800);
    check('Four rings of defense caption', await p.locator('text=Four rings of defense.').isVisible());
    check('4 defense layer cards', (await p.locator('#security .kicker:text-matches("^(Layer [123]|Core)$")').count()) === 4);
    await p.click('#raidBtn'); await p.waitForTimeout(4500);
    check('raid simulator runs', /Raid over|stopped/.test(await p.locator('#raidLog').textContent()) && (await p.locator('#raidLayer circle').count()) === 12, await p.locator('#raidLog').textContent());
    await p.screenshot({ path: DIR + 'r-security.png' });
    await p.evaluate(() => document.getElementById('term').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    check('Nova terminal types', /verification views ready/.test(await p.locator('#term').textContent()));
    await p.evaluate(() => document.getElementById('beat').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
    const t1 = await p.locator('#beatTime').textContent(); await p.waitForTimeout(700);
    check('beat timeline plays', t1 !== (await p.locator('#beatTime').textContent()) && (await p.locator('#clips span').count()) === 8);
    check('equaliser back', (await p.locator('.eq i').count()) === 8);
    await p.screenshot({ path: DIR + 'r-creative.png' });
    await p.click('#navLinks a:text-is("Gaming")'); await p.waitForTimeout(1200);
    check('Gaming section + nav link', Math.abs(await p.evaluate(() => document.getElementById('gaming').getBoundingClientRect().top)) < 80 && (await p.locator('#gaming .slot').count()) === 7);
    await p.screenshot({ path: DIR + 'r-gaming.png' });
    check('Senior Moderator role + experience', (await p.locator('text=Senior Moderator').count()) >= 1 && (await p.locator('.xp li:has-text("Fruity Blox")').count()) === 1);
    check('Part two band', await p.locator('.band:has-text("Projects & creative")').count() === 1);
    check('ThinkPad line', await p.locator('text=Multi-device workflow on a Lenovo ThinkPad X270').count() === 1);
    await p.evaluate(() => document.getElementById('constellation').scrollIntoView({ block: 'center' })); await p.waitForTimeout(800);
    check('constellation has 8 areas', (await p.locator('#cSvg .cnode').count()) === 8);
    check('skill count 59', /59/.test(await p.locator('#skillCount').textContent()), await p.locator('#skillCount').textContent());
    const before = await p.locator('#tiles > *').count();
    await p.locator('#filters button').nth(2).click(); await p.waitForTimeout(300);
    const after = await p.evaluate(() => [...document.querySelectorAll('#tiles > *')].filter((t) => getComputedStyle(t).display !== 'none' && !t.hidden).length);
    check('constellation filter narrows tiles', after > 0 && after < before, `${before} → ${after}`);
    await p.screenshot({ path: DIR + 'r-constellation.png' });
    await p.evaluate(() => document.querySelector('figure.tree').scrollIntoView({ block: 'start' })); await p.waitForTimeout(800);
    check('Discord skill map + Beyond Discord', await p.locator('text=My Discord skill map.').isVisible() && await p.locator('.hub-node.alt:has-text("Beyond Discord")').count() === 1);
    await p.screenshot({ path: DIR + 'r-skillmap.png' });
    check('1440px: no JS errors', errs.length === 0, errs.join(' | '));
    await p.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
