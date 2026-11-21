// New features: Command Center, Lab, Impact, brief form.
// Run through `npm test` (sets BASE_URL to a local preview of the build).
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
// Checks the new features mounted inside the original page (served by `vite preview` on :4173).
const { chromium } = require('playwright');
const URL = BASE;
const DIR = require('os').tmpdir() + '/';
let fails = 0;
const check = (n, ok, x = '') => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const sleep = (p, ms) => p.waitForTimeout(ms);

async function open(b, vp = { width: 1440, height: 900 }, path = '', scheme = 'dark') {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|ERR_|fonts\.g/.test(m.text()) && p.errs.push(m.text().slice(0, 160)));
  await p.goto(URL + path);
  await p.waitForFunction(() => !document.documentElement.classList.contains('loading'), null, { timeout: 8000 });
  await sleep(p, 900);
  return p;
}
const drawerOpen = (p) => p.locator('text=Command Center · live telemetry').isVisible();

(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  check('loads without JS errors', p.errs.length === 0, p.errs.join(' | '));
  check('three new sections mounted', await p.evaluate(() => ['lab', 'impact', 'build'].every((id) => document.getElementById(id).shadowRoot?.textContent.length > 100)));
  check('original hero + VEGA still there', await p.locator('.hero h1').isVisible() && (await p.locator('[data-holo]').count()) > 0);

  // Command Center from the nav button, focus trap, Esc returns focus
  await p.click('#centerBtn'); await sleep(p, 700);
  check('nav button opens Command Center', await drawerOpen(p));
  for (let i = 0; i < 25; i++) await p.keyboard.press('Tab');
  check('focus stays inside the drawer', await p.evaluate(() => { let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement; return !!a.closest('[role="dialog"]'); }));
  await p.keyboard.press('Escape'); await sleep(p, 200);
  check('Esc closes, focus back on nav button', !(await drawerOpen(p)) && (await p.evaluate(() => document.activeElement.id)) === 'centerBtn');
  await p.keyboard.press('Alt+t'); await sleep(p, 700);
  check('Alt+T opens it', await drawerOpen(p));
  check('deep link hash set', (await p.evaluate(() => location.hash)) === '#/telemetry/apex');
  await p.locator('#hr').fill('185'); await sleep(p, 300);
  check('Apex-Fit slider → Z5', await p.locator('dd:text-is("Z5")').isVisible());
  await p.click('button:has-text("Inject stress test")'); await sleep(p, 3300);
  check('stress test spikes latency', parseInt(await p.locator('dt:text-is("Peak") + dd').textContent()) > 60);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Export .json")')]);
  const snap = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  check('export .json', snap.nodes.length === 4 && snap.sandbox.sim === 'apex-fit');
  await p.click('[role="tab"]:has-text("Polo AI")'); await p.click('button:has-text("Chest pain and shortness of breath")');
  check('Polo red flag escalates', await p.locator('text=Contact emergency services').isVisible());
  await p.click('[role="tab"]:has-text("Bot Shield")'); await p.click('button:has-text("Trigger raid spike")'); await sleep(p, 5000);
  check('raid contained', (await p.locator('text=Raid contained').count()) > 0);
  await p.click('[role="tab"]:has-text("Trade Calc")'); await p.click('button:has-text("+ Nebula Blade")');
  check('trade calc verdict', /overpay|win|Fair/i.test(await p.locator('p:text-is("Verdict") + p').textContent()));
  await p.screenshot({ path: DIR + 'i-telemetry-dark.png' });
  await p.keyboard.press('Escape'); await sleep(p, 200);

  // Page palette + terminal integration
  await p.keyboard.press('Control+k'); await sleep(p, 300);
  await p.keyboard.type('command center'); await sleep(p, 300);
  const hits = await p.$$eval('#searchResults li', (ls) => ls.map((l) => l.textContent));
  check('page palette lists Command Center', hits.some((h) => /Command Center: live telemetry/.test(h)), hits.slice(0, 3).join(' / ').slice(0, 90));
  await p.keyboard.press('Enter'); await sleep(p, 700);
  check('palette opens it', await drawerOpen(p));
  await p.keyboard.press('Escape'); await sleep(p, 200);
  await p.click('#tele'); await sleep(p, 300);
  await p.fill('#vtIn', 'help'); await p.keyboard.press('Enter');
  check('terminal help lists new commands', /run <sim>/.test(await p.locator('#vtOut').textContent()));
  await p.fill('#vtIn', 'sudo hack'); await p.keyboard.press('Enter'); await sleep(p, 200);
  check('sudo hack sweep', await p.locator('text=DIAGNOSTIC SWEEP · ALL SYSTEMS NOMINAL').isVisible());
  await p.fill('#vtIn', 'run raid'); await p.keyboard.press('Enter'); await sleep(p, 900);
  check('terminal run raid opens Bot Shield', await p.locator('text=Bot security · anti-nuke simulator').isVisible());
  await p.keyboard.press('Escape'); await sleep(p, 300);

  // Typing inside the new form must not fire the page's shortcuts
  await p.evaluate(() => document.getElementById('build').scrollIntoView());
  await sleep(p, 600);
  await p.click('#f-message');
  await p.keyboard.type('need /help ` with a bot?');
  check('typing / and ` stays in the form', (await p.inputValue('#f-message')) === 'need /help ` with a bot?' && (await p.locator('#search').isHidden()) && (await p.locator('#vt').isHidden()));

  // Brief form
  await p.fill('#f-message', '');
  await p.click('button:has-text("Transmit brief")');
  check('validation blocks empty brief', (await p.locator('#build [aria-invalid="true"]').count()) === 3 && await p.locator('#err-type').isVisible());
  await p.click('#build [role="radio"]:has-text("Discord Bot")');
  await p.fill('#f-name', 'Test Visitor'); await p.fill('#f-email', 'test@example.com');
  await p.fill('#f-message', 'I need an anti-raid bot for a 5k member server, soon.');
  await p.click('button:has-text("Transmit brief")'); await sleep(p, 800);
  check('receipt with reference + email fallback', /VX-/.test(await p.locator('#build [role="status"]').textContent()) && (await p.locator('#build a[href^="mailto:"]').count()) === 1);
  check('timezone window', /IST/.test(await p.locator('#build >> text=Collaboration window').locator('..').textContent()));
  await p.click('#build summary:has-text("usual stack")');
  check('FAQ opens', await p.locator('#build >> text=Node for small APIs').isVisible());

  // Lab
  await p.evaluate(() => document.getElementById('lab').scrollIntoView()); await sleep(p, 700);
  await p.click('#lab [role="tab"]:has-text("Static Edge Deploy")');
  check('Lab pipeline stage', await p.locator('#lab >> text=Uptime monitor armed').isVisible());
  await p.click('#lab button:has-text("Prompt injection")');
  check('guardrail blocks injection', await p.locator('#lab >> text=Injection pattern blocked').isVisible());
  await p.click('#lab button:has-text("Personal data")');
  check('guardrail redacts PII', /\[email\].*\[phone\]/.test(await p.locator('#lab p[aria-live]').first().textContent()));
  await p.click('#lab button:has-text("Simulate rate limit")'); await p.click('#lab button:has-text("Send request")');
  check('gateway falls back', await p.locator('#lab >> text=retried on fallback').isVisible());
  await p.click('#lab button:has-text("Starter architecture snippet")'); await sleep(p, 300);
  check('snippet modal highlighted', (await p.locator('[role="dialog"] .code-k').count()) > 3);
  await p.keyboard.press('Escape');
  await p.click('#lab button[aria-label="Mobile"]');
  check('viewport preview switches', (await p.locator('#lab .\\@container').evaluate((e) => e.style.width)) === '300px');
  await p.screenshot({ path: DIR + 'i-lab-dark.png' });

  // Impact
  await p.evaluate(() => document.getElementById('impact').scrollIntoView()); await sleep(p, 1800);
  check('count-up reaches 2,000+', await p.locator('#impact >> text=2,000+').isVisible());
  await p.click('#impact button:has-text("Founded the Galaxy network")');
  check('timeline expands', await p.locator('#impact >> text=merger charter').isVisible());
  check('heatmap rendered', (await p.locator('#impact svg[aria-label*="commits"] rect').count()) === 182);
  await p.screenshot({ path: DIR + 'i-impact-dark.png' });

  // Follows the page's Modes: light theme + Calm
  const inkOf = () => p.evaluate(() => { const h = document.getElementById('lab').shadowRoot.querySelector('h2'); return [getComputedStyle(h).color, getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()]; });
  await p.click('#modesBtn'); await p.click('.themes [data-set="light"]'); await sleep(p, 900); await p.keyboard.press('Escape');
  const [h2c, ink] = await inkOf();
  check('light theme: new sections use the page ink', h2c === 'rgb(18, 18, 22)' && ink === '#121216', h2c + ' / ' + ink);
  await p.evaluate(() => document.getElementById('lab').scrollIntoView()); await sleep(p, 500);
  await p.screenshot({ path: DIR + 'i-lab-light.png' });
  await p.click('#modesBtn'); await p.click('.themes [data-set="hologram"]'); await sleep(p, 900); await p.keyboard.press('Escape');
  const accent = await p.evaluate(() => getComputedStyle(document.getElementById('lab').shadowRoot.querySelector('.eyebrow')).color);
  check('hologram look recolours the new sections', accent === 'rgb(56, 217, 242)', accent);
  await p.click('#modesBtn'); await p.click('.views [data-view="calm"]'); await sleep(p, 300);
  check('Calm mode reaches the new sections', await p.evaluate(() => ['lab', 'impact', 'build'].every((id) => document.getElementById(id).classList.contains('calm'))));
  await Promise.all([p.waitForNavigation(), p.click('.views [data-view="calm"]')]); await sleep(p, 1000);
  await p.click('#modesBtn'); await p.click('.themes [data-set="auto"]'); await sleep(p, 600); await p.keyboard.press('Escape');

  // Tour visits the new sections with real titles; footer + QR; Konami; VEGA
  await p.click('#modesBtn'); await p.click('.views [data-view="tour"]'); await sleep(p, 400);
  const titles = await p.evaluate(async () => { const out = []; const n = +document.querySelector('.tour .n').textContent.split('/')[1]; for (let i = 1; i < n; i++) { out.push(document.querySelector('.tour h3').textContent); document.querySelector('.tour [data-next]').click(); } out.push(document.querySelector('.tour h3').textContent); return out; });
  check('tour includes new sections', titles.includes('How I build, shown instead of told') && titles.includes('Got a project? Send a brief'), titles.length + ' steps');
  await p.keyboard.press('Escape');
  await p.click('.foot-links button:has-text("QR code")'); await sleep(p, 300);
  check('footer QR opens', await p.locator('svg[aria-label^="QR code for https://vini-portfolio.onrender.com"]').isVisible());
  await p.keyboard.press('Escape');
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await p.keyboard.press(k);
  await sleep(p, 150);
  check('Konami sweep', await p.locator('text=DIAGNOSTIC SWEEP · ALL SYSTEMS NOMINAL').isVisible());
  await p.evaluate(() => window.__holo.ask('open the command center')); await sleep(p, 2200);
  check('VEGA opens the Command Center', await drawerOpen(p));
  check('no JS errors (desktop)', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  // Deep link on load
  p = await open(b, undefined, '#/telemetry/trade');
  check('deep link opens Trade Calc on load', await p.locator('text=Trade value & margin calculator').isVisible());
  await p.context().close();

  // Phone
  p = await open(b, { width: 375, height: 812 });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  check('375px: no horizontal scroll', sw <= 375, 'scrollWidth ' + sw);
  await p.evaluate(() => document.getElementById('lab').scrollIntoView()); await sleep(p, 600);
  await p.screenshot({ path: DIR + 'i-m-lab.png' });
  await p.evaluate(() => window.__vx.open('telemetry', { tab: 'apex' })); await sleep(p, 700);
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth);
  check('375px: Command Center fits', sw2 <= 375 && await drawerOpen(p), 'scrollWidth ' + sw2);
  await p.screenshot({ path: DIR + 'i-m-telemetry.png' });
  check('no JS errors (phone)', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
