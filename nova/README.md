# NOVA OS

A browser desktop shell (NOVA) with an assistant command layer (NEXUS). Static files, no build step: serve the repo and open `/nova/`. ES modules don't load from `file://`, so use any static server.

| File | Role |
|------|------|
| `js/main.js` | Shell: top bar, dock, launcher, command palette (Ctrl/Cmd+K), notifications, widgets, starfield |
| `js/wm.js` | Window manager: drag, resize, minimize/maximize, z-order, layout restore |
| `js/apps.js` | Apps: NEXUS, Notes, Files, Calculator, System Monitor, Settings |
| `js/assistant.js` | NEXUS service: `ask(input, ctx, provider)` |
| `js/calc.js` | Safe expression parser (no `eval`) |
| `js/store.js` | `localStorage` state (`nova-os:v1`) |

## NEXUS providers

NEXUS runs `localProvider`: deterministic rules, offline, no AI model. To add a real model, deploy a server endpoint that holds the API key and returns `{ text, effects, actions }`, then pass `remoteProvider('/api/nexus')` to `ask()` in `main.js`. Keys never go in the browser. `ask()` drops any effect not on its whitelist.

## Tests

```
npm test   # node --test: calculator, app matching, NEXUS commands, effect whitelist
```
