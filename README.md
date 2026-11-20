# Vini · portfolio

Static React + Tailwind portfolio: command palette, live client-side sandboxes, zero runtime API keys.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Update the content

Everything on the page comes from **`src/data/portfolioData.js`**: projects, skills, timeline, roadmap, FAQ, contact details and availability hours. Edit that file and rebuild.

After changing `site.url`, run `npm run gen` to regenerate the QR code (and refresh the commit heatmap).

## Shortcuts

| Keys | Action |
|---|---|
| `Ctrl/⌘ K` | Command palette |
| `1`–`6` | Jump to a section |
| `Alt T` | Command Center (telemetry sandboxes) |
| `` ` `` | Dev console (`help` lists commands) |
| `Alt M` | Reduced motion / low power |
| `Esc` | Close any overlay |

## Deploy

The build uses relative paths and hash routing, so `dist/` works on any static host:

- **Netlify**: build `npm run build`, publish `dist`. `_headers` and the inquiry form (Netlify Forms) are picked up automatically.
- **Vercel**: import the repo; it detects Vite.
- **GitHub Pages**: publish the `dist/` folder (for example with the official Pages GitHub Action).

The previous single-file site, including the VEGA hologram assistant, is kept at `classic.html`.

`apex-sports-hub/` is a separate app with its own README.
