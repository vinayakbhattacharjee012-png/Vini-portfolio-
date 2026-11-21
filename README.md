# Vini · portfolio

The site is `index.html`: the original single-page portfolio (VEGA hologram, résumé, sims, Modes menu).
New features are added on top by `src/islands.jsx` and follow the page's themes:

- **Command Center** (`Alt+T`, the gauge button, palette, terminal `center`/`run raid`, or ask VEGA):
  Apex-Fit simulator, Polo triage demo, raid simulator, trade calculator, live telemetry with stress test and JSON export
- **Lab**: build pipeline, guardrail inspector, bloated-vs-lean diff, fallback router, Lighthouse, stack recommender
- **Impact**: stats, build timeline, roadmap, principles, lessons, commit heatmap
- **Start a build**: brief form with reference number (Netlify Forms, email fallback), your hours, FAQ
- QR code, Konami code / `sudo hack` diagnostic sweep

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

Content for the new sections is in `src/data/portfolioData.js` (look for `CHECK` comments).
After changing `site.url`, run `npm run gen` to regenerate the QR code and commit heatmap.

Deploy `dist/` to any static host (Render: build `npm ci && npm run build`, publish `dist`).
`apex-sports-hub/` is a separate app with its own README.
