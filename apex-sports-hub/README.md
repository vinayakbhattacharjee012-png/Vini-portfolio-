# Apex Sports Hub

Dark, broadcast-style multi-sport dashboard for **football** (Premier League, La Liga, Champions League, ISL) and **cricket** (IPL, T20Is, ICC events).

React 19 · TypeScript · Tailwind CSS v4 · Lucide · Vite, plus a small Node server for the API.

## Run it

```bash
npm install
cp .env.example .env   # optional: add GEMINI_API_KEY
npm run dev            # web on :5173, API on :8787
```

Production: `npm run build && npm start` (one Node process serves `dist/` and `/api` on `PORT`).

## Where the data comes from

Each endpoint tries its sources in order and serves the first one that works. If all of them fail, it serves the last good cached response; with no cache, it falls back to clearly labelled **sample** data.

| Endpoint | Sources, in order | Cache |
|---|---|---|
| `/api/scoreboard?league=` | ESPN public scoreboard → Gemini + Google Search → sample | 20 s |
| `/api/standings?league=` | ESPN standings → TheSportsDB `lookuptable` → Gemini → sample | 10 min |
| `/api/news?sport=` | Gemini + Google Search (with citations) → sample | 5 min |
| `/api/team?name=` | TheSportsDB `searchteams` + `lookup_all_players` | 1 h |

- **No keys needed** for ESPN and TheSportsDB (public test key `3`).
- **Gemini is optional.** `GEMINI_API_KEY` stays on the server and is never sent to the browser. Without it, scores and tables still work. You lose AI news, plus cricket coverage beyond ESPN's IPL feed (T20Is and ICC events only come from Gemini).
- Grounded answers come back as text JSON, because search grounding can't be combined with a response schema. The server extracts the JSON and attaches the grounding sources as citations.

## UI

- Sport toggle and competition rail; the selection is kept in the URL (`#cricket/ipl`).
- "Live now" strip of broadcast cards with pulsing emerald badges; a score flashes when it changes.
- Matches grouped by day, with All / Live / Results / Fixtures filters.
- Standings with zone markers (UCL, UEL, relegation; IPL playoff spots) and NRR for cricket.
- Match drawer, then team profile drawer (crest, ground, squad).
- Polls every 30 s while a match is live, otherwise every 2 min, and pauses in background tabs.
- Mobile: bottom tab bar (Matches / Table / News) and a bottom-sheet drawer. Press `/` to search, `Esc` to close.
