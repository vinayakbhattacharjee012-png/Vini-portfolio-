// Benchmark: scroll the homepage top to bottom on a 4x-throttled phone profile; prints fps and main-thread cost.
// usage: node tests/scroll.bench.cjs (prints one JSON line)
const { chromium } = require('playwright');
const [, , label = 'baseline', css = '', js = ''] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await p.addInitScript(([css, js]) => {
    if (css) document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); });
    if (js) document.addEventListener('DOMContentLoaded', () => { try { (0, eval)(js); } catch (e) { console.log('inject error', e.message); } });
    window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  }, [css, js]);
  await p.goto(process.env.BASE_URL || 'http://localhost:4173/');
  await p.waitForFunction(() => !document.documentElement.classList.contains('loading'), null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame', transferMode: 'ReturnAsStream' });
  const stats = await p.evaluate(async () => {
    window.__long = [];
    const H = document.documentElement.scrollHeight - innerHeight, dur = 12000, frames = [];
    let last = performance.now();
    const t0 = last;
    await new Promise((res) => {
      function step(t) {
        frames.push(t - last); last = t;
        const k = Math.min(1, (t - t0) / dur);
        scrollTo(0, H * k);
        if (k < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
    const ft = frames.slice(2).sort((a, b) => a - b);
    const pct = (q) => ft[Math.floor(ft.length * q)];
    return { frames: ft.length, fps: +(1000 / (ft.reduce((a, b) => a + b, 0) / ft.length)).toFixed(1), p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1),
      over50ms: ft.filter((x) => x > 50).length, longTasks: window.__long.length, longMs: Math.round(window.__long.reduce((a, b) => a + b, 0)),
      anims: document.getAnimations().length, dom: document.getElementsByTagName('*').length };
  });
  const chunks = [];
  const done = new Promise((res) => cdp.on('Tracing.tracingComplete', async ({ stream }) => {
    for (;;) { const r = await cdp.send('IO.read', { handle: stream }); chunks.push(r.data); if (r.eof) break; }
    res();
  }));
  await cdp.send('Tracing.end'); await done;
  const events = JSON.parse(chunks.join('')).traceEvents || [];
  const main = {}; const buckets = { Script: ['FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'EventDispatch', 'v8.callFunction', 'FireIdleCallback', 'RunMicrotasks'],
    Style: ['UpdateLayoutTree', 'RecalculateStyles', 'ScheduleStyleRecalculation'], Layout: ['Layout'], Paint: ['Paint', 'PaintImage', 'UpdateLayer'], PrePaint: ['PrePaint'],
    Composite: ['Layerize', 'CompositeLayers', 'Commit', 'UpdateLayerTree'], Raster: ['RasterTask', 'GPUTask'], Decode: ['Decode Image', 'ImageDecodeTask'] };
  const sum = {}; for (const k of Object.keys(buckets)) sum[k] = 0;
  for (const e of events) {
    if (e.ph !== 'X' || !e.dur) continue;
    for (const [k, names] of Object.entries(buckets)) if (names.includes(e.name)) sum[k] += e.dur / 1000;
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k]);
  console.log(JSON.stringify({ label, ...stats, msByKind: sum }));
  await b.close();
})();
