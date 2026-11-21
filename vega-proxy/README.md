# vega-proxy

Tiny server (no dependencies) that lets every visitor talk to Jarvis/VEGA through Gemini without the key ever reaching a browser.

## Give it the key (pick one, in the Render dashboard, never in the code or in chat)
- **Environment variable:** key `GEMINI_API_KEY`, value = the key. (The name goes in the *Key* box, the key goes in the *Value* box.)
- **Secret file:** a secret file named `GEMINI_API_KEY` whose contents are the key. If it lives in an Environment Group, link the group to this service.

Other settings (all optional): `SITE_URL`, `ALLOWED_ORIGINS`, `DAILY_CAP` (default 400 calls a day), `PER_IP_LIMIT` (default 12 per 10 min), `MODELS`.

## Check it
- `GET /health` returns `{ "ok": true, "configured": true }` once a key is found.
- The first lines of the service log say `startup check: Gemini accepted the key` (or why not). The key is never logged.
- `node test.js` runs the self-test with a fake Gemini, no key and no network.

## Key safety
If a key ever shows up as a variable *name*, in a log or in a screenshot, make a new key in Google AI Studio and delete the old one.
