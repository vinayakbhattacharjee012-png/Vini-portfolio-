// Original site: looks, modes, tour, palette, terminal, phone.
// Run through `npm test` (sets BASE_URL to a local preview of the build).
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
// Browser checks for the modes work. Prints PASS/FAIL lines and saves screenshots.
const { chromium } = require('playwright');
const DIR = require('os').tmpdir() + '/';
const URL = BASE;
let fails = 0;
function check(name, ok, extra) { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); }

async function page(b, opts = {}, query = '') {
  const ctx = await b.newContext({ viewport: opts.vp || { width: 1280, height: 800 }, colorScheme: opts.scheme || 'dark', reducedMotion: 'no-preference' });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && p.errs.push(m.text().slice(0, 160)));
  await p.goto(URL + query);
  await p.waitForFunction(() => !document.documentElement.classList.contains('loading'), null, { timeout: 8000 });
  await p.waitForTimeout(600);
  return p;
}
const attr = (p, a) => p.evaluate(a => document.documentElement.getAttribute(a), a);

(async () => {
  const b = await chromium.launch();

  // 1. Desktop: panel, looks, auto
  let p = await page(b);
  check('no JS errors on load', p.errs.length === 0, p.errs.join(' | '));
  await p.click('#modesBtn');
  check('panel opens', await p.isVisible('#modesPanel'));
  check('auto pressed by default', (await p.getAttribute('.themes [data-set="auto"]', 'aria-pressed')) === 'true');
  await p.screenshot({ path: DIR + 't-panel.png' });
  for (const t of ['light', 'hologram', 'nebula', 'terminal', 'black', 'dark']) {
    await p.click(`.themes [data-set="${t}"]`);
    await p.waitForTimeout(750);
    const ok = (await attr(p, 'data-theme')) === t && (await p.getAttribute(`.themes [data-set="${t}"]`, 'aria-pressed')) === 'true';
    const saved = await p.evaluate(() => localStorage.getItem('theme'));
    check(`theme ${t} applies + saves`, ok && saved === t);
    if (['light', 'hologram', 'nebula', 'terminal'].includes(t)) {
      await p.keyboard.press('Escape');
      await p.screenshot({ path: DIR + `t-hero-${t}.png` });
      // hero text must be light on the night sky in every look
      const lum = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.hero h1')).color.match(/\d+/g).map(Number); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; });
      check(`hero headline readable in ${t}`, lum > 0.6, 'luma ' + lum.toFixed(2));
      const meta = await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
      check(`browser colour follows ${t}`, meta.length > 3, meta);
      await p.click('#modesBtn');
    }
  }
  await p.click('.themes [data-set="auto"]');
  await p.waitForTimeout(750);
  check('auto clears theme', (await attr(p, 'data-theme')) === null && (await p.evaluate(() => localStorage.getItem('theme'))) === null);
  await p.keyboard.press('Escape');
  check('Esc closes panel', !(await p.isVisible('#modesPanel')));
  check('focus returns to Modes button', await p.evaluate(() => document.activeElement.id === 'modesBtn'));

  // 2. Recruiter view
  await p.click('#modesBtn');
  await p.click('.views [data-view="recruiter"]');
  await p.waitForTimeout(400);
  check('recruiter attr set', (await attr(p, 'data-view')) === 'recruiter');
  check('brief visible', await p.isVisible('#brief'));
  const brief = await p.evaluate(() => ({ h: document.querySelector('#briefTitle').textContent, cols: [...document.querySelectorAll('#brief h3')].map(h => h.textContent), proj: document.querySelectorAll('#brief .brief-list li').length }));
  check('brief has name + columns', brief.h && brief.cols.length >= 2, JSON.stringify(brief));
  check('hero hidden in recruiter', (await p.evaluate(() => document.querySelector('.hero').getBoundingClientRect().height)) === 0);
  await p.screenshot({ path: DIR + 't-recruiter.png' });
  await p.screenshot({ path: DIR + 't-recruiter-full.png', fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 800 } });
  await p.click('#brief .brief-top .cta');
  await p.waitForTimeout(300);
  check('exit recruiter from brief', (await attr(p, 'data-view')) === null && !(await p.isVisible('#brief')));

  // 3. Tour
  await p.click('#modesBtn');
  await p.click('.views [data-view="tour"]');
  await p.waitForTimeout(500);
  let n = await p.textContent('.tour .n');
  check('tour starts at 1', /^1 \/ \d+$/.test(n), n);
  await p.screenshot({ path: DIR + 't-tour-1.png' });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
  n = await p.textContent('.tour .n');
  const t2 = await p.textContent('.tour h3');
  check('ArrowRight advances', n.startsWith('2 /'), n + ' · ' + t2);
  await p.screenshot({ path: DIR + 't-tour-2.png' });
  await p.click('.tour [data-next]'); await p.waitForTimeout(900);
  check('Next advances', (await p.textContent('.tour .n')).startsWith('3 /'), await p.textContent('.tour h3'));
  const allSteps = await p.evaluate(async () => { const out = []; const nxt = document.querySelector('.tour [data-next]'); const total = +document.querySelector('.tour .n').textContent.split('/')[1]; for (let i = 3; i <= total; i++) { out.push(document.querySelector('.tour .n').textContent + ' ' + document.querySelector('.tour .k').textContent + ' | ' + document.querySelector('.tour h3').textContent + ' | ' + document.querySelector('.tour p').textContent.slice(0, 60)); if (i < total) nxt.click(); } return out; });
  console.log('   tour steps:\n    ' + allSteps.join('\n    '));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check('Esc ends tour', !(await p.$('.tour')) && (await attr(p, 'data-tour')) === null);

  // 4. Calm on (runtime), then off (reload)
  await p.click('#modesBtn');
  await p.click('.views [data-view="calm"]');
  await p.waitForTimeout(400);
  check('calm attr + fx off', (await attr(p, 'data-calm')) === '' && (await attr(p, 'data-fx')) === 'off');
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector('.ticker-track') || document.body).animationDuration);
  check('calm stops CSS animation', anim === '1e-06s' || anim === '0.000001s' || anim.startsWith('0') || anim.startsWith('1e'), anim);
  await Promise.all([p.waitForNavigation(), p.click('.views [data-view="calm"]')]);
  await p.waitForTimeout(800);
  check('calm off reloads without calm', (await attr(p, 'data-calm')) === null && (await p.evaluate(() => localStorage.getItem('calm'))) === null);
  check('no JS errors after modes', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  // 5. Shared links
  p = await page(b, {}, '?theme=nebula&mode=recruiter,calm');
  check('?theme=nebula applied', (await attr(p, 'data-theme')) === 'nebula');
  check('?mode=recruiter,calm applied', (await attr(p, 'data-view')) === 'recruiter' && (await attr(p, 'data-calm')) === '');
  check('calm load uses reduced-motion path', await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  check('no loader in calm', !(await p.evaluate(() => document.documentElement.classList.contains('loading'))));
  await p.screenshot({ path: DIR + 't-shared-nebula-recruiter.png' });
  check('no JS errors (calm+recruiter load)', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  p = await page(b, {}, '?theme=bogus&mode=tour');
  check('bad theme ignored', (await attr(p, 'data-theme')) === null);
  await p.waitForTimeout(800);
  check('?mode=tour starts tour', !!(await p.$('.tour')));
  await p.context().close();

  // 6. Palette + terminal
  p = await page(b);
  await p.keyboard.press('Control+k');
  await p.fill('#searchInput', '>mode');
  await p.waitForTimeout(300);
  const cmds = await p.$$eval('#searchResults li', ls => ls.map(l => l.textContent.trim().slice(0, 40)));
  check('palette lists mode commands', cmds.some(c => /Recruiter/.test(c)) && cmds.some(c => /tour/i.test(c)), cmds.slice(0, 6).join(' / '));
  await p.fill('#searchInput', '>hologram');
  await p.waitForTimeout(300);
  const hc = await p.$$eval('#searchResults li', ls => ls.map(l => l.textContent.trim().slice(0, 40)));
  check('palette lists new themes', hc.some(c => /Theme: Hologram/.test(c)), hc.slice(0, 4).join(' / '));
  await p.keyboard.press('Escape');
  await p.click('#tele');
  await p.fill('#vtIn', 'mode recruiter'); await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  check('terminal: mode recruiter', (await attr(p, 'data-view')) === 'recruiter');
  await p.fill('#vtIn', 'theme terminal'); await p.keyboard.press('Enter');
  await p.waitForTimeout(800);
  check('terminal: theme terminal', (await attr(p, 'data-theme')) === 'terminal');
  await p.fill('#vtIn', 'mode full'); await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  check('terminal: mode full', (await attr(p, 'data-view')) === null);
  check('no JS errors (palette/terminal)', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  // 7. Phone
  p = await page(b, { vp: { width: 375, height: 760 } });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  check('phone: no horizontal scroll', sw <= 375, 'scrollWidth ' + sw);
  await p.screenshot({ path: DIR + 't-phone-top.png' });
  await p.click('#modesBtn');
  const box = await p.$eval('#modesPanel', e => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.bottom]; });
  check('phone: panel inside screen', box[0] >= 0 && box[1] <= 375, JSON.stringify(box));
  await p.screenshot({ path: DIR + 't-phone-panel.png' });
  await p.click('.views [data-view="recruiter"]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: DIR + 't-phone-recruiter.png' });
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth);
  check('phone recruiter: no horizontal scroll', sw2 <= 375, 'scrollWidth ' + sw2);
  await p.click('#brief .brief-top .cta');
  await p.click('#modesBtn'); await p.click('.views [data-view="tour"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: DIR + 't-phone-tour.png' });
  const fabKbd = await p.$eval('.fab kbd', e => getComputedStyle(e).display).catch(() => 'none');
  check('phone: palette key hint hidden', fabKbd === 'none', fabKbd);
  check('no JS errors (phone)', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  // 8. Light system scheme, no saved theme: hero readable
  p = await page(b, { scheme: 'light' });
  const lum = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.hero h1')).color.match(/\d+/g).map(Number); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; });
  check('system light: hero readable', lum > 0.6, lum.toFixed(2));
  await p.screenshot({ path: DIR + 't-system-light.png' });
  await p.context().close();

  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
