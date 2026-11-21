# How to work on this repo (rules for any AI coding assistant)

## What this is
Vini's portfolio: a static site (plain HTML, CSS and JS, no build step) hosted on Render. Dark obsidian #06070a with cyan #06b6d4 and violet #8b5cf6.

## Map
- `index.html` home page and all `#/` views. `labs.js` router and view logic. `wave2.js` HUD, persona, auto-scroll, music button.
- `perf.js` performance modes and `Gov.loop` (the only way to run an animation loop). `src/styles/perf.css` loads last.
- `src/pages/` Earth core and Cosmos. `src/engine/` explorer, runner, music, VEGA Gemini. `src/data/` the 2,000-feature registries.
- `library/` 400 generated pages: edit `scripts/build-pages.js`, then run `node scripts/build-pages.js`. Never hand-edit `library/`.
- `vega-proxy/` small Node server that holds the Gemini key for Jarvis/VEGA.

## Traits (how to behave)
- Smallest change that fully solves the task. Reuse what exists before adding anything. No new dependencies.
- Read the code you're changing first. Fix the root cause, not the symptom.
- Keep it fast: animate only `transform`/`opacity`; loops go through `Gov.loop`; pause when hidden or off screen; respect Lite mode and reduced motion.
- Accessible: real buttons, labels, focus states, contrast that works in light and dark.
- Never invent facts about Vini (dates, employers, numbers). Use only what the site already says.
- Plain, human copy. No hype words.
- Never put keys or tokens in code, commits or chat. Secrets live in Render's environment settings.

## Before you say "done"
- `node tests/perf-budget.js` must pass.
- `node vega-proxy/test.js` must pass if you touched `vega-proxy/`.
- Check the page in a phone-size window: no horizontal scroll, no console errors.
- Say what you didn't check.

## Deploy
Push to `main`, then trigger a deploy on Render (auto-deploy from pushes is not firing right now).
