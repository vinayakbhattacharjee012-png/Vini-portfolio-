# Performance rules

The site is static and has to stay smooth on a phone. These are the rules and where they live.

## Modes
- **Auto** (default): starts with effects on, samples the frame rate in 3 s windows, and drops to **Lite** after two slow windows in a row (under ~48 fps). It never climbs back by itself.
- **Lite**: `html.lite`. No decorative animation, no ambient canvases, no blur. Forced on phones and weak devices.
- **Full**: effects on, always. Footer button cycles Auto → Lite → Full.
- `Alt+Shift+P` (or `perf hud` in the terminal) shows live fps, running animations and every governor loop.

## Rules for new code
1. **Animations**: only `transform` and `opacity`. No `width`, `height`, `top`, `left` or `box-shadow` keyframes.
2. **Loops**: register with `Gov.loop(name, fn, { fps, liteFps, when, once })` in `perf.js`. Never call `requestAnimationFrame` in a loop of your own.
   - `when()` must be false when the view or canvas is off screen. A parked loop is restarted by calling `start()`.
   - Hidden tabs run nothing. Reduced motion means `once: true` (one frame per interaction).
3. **Pointer and scroll handlers**: `{ passive: true }`, and write state at most once per frame with a `requestAnimationFrame` flag.
4. **Lists**: never render more than ~30 items at once. Debounce search at 120 ms.
5. **Data**: big registries load on first use, not at page load.
6. **Blur**: only the sticky nav may use `backdrop-filter`. Dialogs may blur their backdrop while open.
7. **Isolation**: independent panels and canvases get `contain: layout style paint` (`src/styles/perf.css`).
8. **Off-screen sections**: `wave2.js` toggles `.w2-off` on sections and SVGs, which pauses their CSS animations.

## Checking it
`node tests/perf-budget.js` serves the site, throttles the CPU 4x and fails if a budget is broken: idle fps in Lite and Full, running animations, load long tasks, and which governor loops are alive on each view.

## Known trade-offs
- Off-screen home sections use `content-visibility: auto`, which roughly halves the first layout. Its height guesses used to break `#anchor` jumps, so `perf.js` measures every section once when the page is idle (and before any early section-link click). Don't remove that step.
- No layout reads (`getBoundingClientRect`, `offsetHeight`, `scrollHeight`) while the page is still loading: each one forces a full-page layout. Wait for `load` or an IntersectionObserver callback.
- Anything inserted above the first screen after load must have its space reserved in the HTML (see the `#w2Hud` placeholder), or the page jumps.
- The big drifting background blobs and clouds are static now. They were the largest single paint cost.
- Full mode is still the heaviest setting. Lite is the fix for a slow device.
