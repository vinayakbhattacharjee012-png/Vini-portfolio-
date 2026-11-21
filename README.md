# Vini · portfolio

The site is `index.html`: the original single-page portfolio (VEGA hologram, résumé, sims, Modes menu).
New features are added on top by `src/islands.jsx` and follow the page's themes:

- **Command Center** (`Alt+T`, the gauge button, palette, terminal `center`/`run raid`, or ask VEGA):
  Apex-Fit simulator, Polo triage demo, raid simulator, trade calculator, live telemetry with stress test and JSON export
- **Lab**: build pipeline, guardrail inspector, bloated-vs-lean diff, fallback router, Lighthouse, stack recommender
- **Impact**: stats, build timeline, roadmap, principles, lessons, commit heatmap
- **Start a build**: brief form with reference number (Netlify Forms, email fallback), your hours, FAQ
- QR code, Konami code / `sudo hack` diagnostic sweep

Extra pages (same look as the homepage, animated page transitions):

- `command-center.html`: all four sandboxes running at once
- `features.html`: every feature with a link that opens it, plus the latest test results
- `work.html`: case studies (problem, what was built, where it stands), filterable
- `services.html`: what you can hire me for, the four-step process and FAQ
- `galaxy.html`: the Galaxy network, its treaties, roles, security grid and advertising options
- `contact.html`: Hire me page with direct lines and the brief form (`?type=Discord%20bot` preselects a service)

The client pages' text lives in `src/data/portfolioData.js` (`services`, `process`, `caseStudies`, `galaxy`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

Content for the new sections is in `src/data/portfolioData.js` (look for `CHECK` comments).
After changing `site.url`, run `npm run gen` to regenerate the QR code and commit heatmap.

## Tests

`npm test` builds the site, serves it, runs every suite in `tests/` in Chromium (original site, new features,
restored content, extra pages and all their links), benchmarks scrolling on a throttled phone profile, and writes
`src/data/test-report.json`, which the features page shows. It needs Playwright
(`npm i -D playwright && npx playwright install chromium` if it isn't installed).

Deploy `dist/` to any static host (Render: build `npm ci && npm run build`, publish `dist`).
`apex-sports-hub/` is a separate app with its own README.
