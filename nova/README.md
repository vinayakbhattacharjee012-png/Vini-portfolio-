# NOVA OS

A browser desktop shell (NOVA) with an assistant command layer (NEXUS). No build step and no dependencies. Run `node server.js` for Gemini replies, or serve the folder statically for local demo mode. ES modules don't load from `file://`.

| File | Role |
|------|------|
| `js/main.js` | Shell: top bar, dock, launcher, command palette (Ctrl/Cmd+K), notifications, widgets, starfield |
| `js/wm.js` | Window manager: drag, resize, minimize/maximize, z-order, layout restore |
| `js/apps.js` | Apps: NEXUS, Notes, Files, Calculator, System Monitor, Settings |
| `js/assistant.js` | NEXUS service: `ask(input, ctx, provider)` |
| `js/calc.js` | Safe expression parser (no `eval`) |
| `js/store.js` | `localStorage` state (`nova-os:v1`) |
| `server.js` | Serves the app and proxies `/api/nexus` to Gemini |

## NEXUS + Gemini

Built-in commands ("open notes", "calculate …") always run locally. Anything else goes to `server.js` → Gemini, if the server has a key. Without one, or when the page is static, NEXUS stays in labelled local demo mode.

The key lives only in the server's environment. Never put it in the page or commit it.

**Deploy on Render** (New → Web Service → this repo):

| Setting | Value |
|---------|-------|
| Root directory | `nova` |
| Build command | *(leave empty — no dependencies)* |
| Start command | `node server.js` |
| Environment | `GEMINI_API_KEY` = your Google AI Studio key · optional `GEMINI_MODEL` (default `gemini-2.5-flash`) |

`/api/nexus` limits each IP to 20 messages a minute and 2,000 characters per message. Local run: `GEMINI_API_KEY=... npm start`, then open http://localhost:3000.

## Tests

```
npm test   # calculator, NEXUS commands, effect whitelist, Gemini proxy (mocked)
```
