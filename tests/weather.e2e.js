/* Weather app check. Run: node tests/weather.e2e.js
   Serves this folder and drives weather/index.html in Chromium. Open-Meteo is answered by the fixtures below,
   which copy the shape of its real responses, so the check runs offline and gives the same result every time.
   The fixtures live only in this test; the app itself never shows made-up data. Needs Playwright. */
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html"; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); } }); });

// Forecast in the shape Open-Meteo returns with timezone=auto (local times, no offset).
function forecast(lat, tempC, tz) {
  const ymd = (d) => new Date(Date.UTC(2026, 10, 26 + d)).toISOString().slice(0, 10), day = ymd(0), hours = [], days = [];
  for (let d = 0; d < 7; d++) { days.push(ymd(d)); for (let h = 0; h < 24; h++) hours.push(`${ymd(d)}T${String(h).padStart(2, "0")}:00`); }
  return {
    latitude: lat, timezone: tz, timezone_abbreviation: "GMT+5:30", utc_offset_seconds: 19800,
    current: { time: `${day}T14:30`, temperature_2m: tempC, relative_humidity_2m: 61, weather_code: 2, wind_speed_10m: 10, is_day: 1 },
    hourly: { time: hours, temperature_2m: hours.map((_, i) => tempC - (i % 24 > 18 ? 4 : 0)), precipitation_probability: hours.map((_, i) => i % 5 * 10), weather_code: hours.map((_, i) => [0, 2, 61, 3][i % 4]) },
    daily: { time: days, weather_code: [2, 61, 63, 0, 1, 95, 3], temperature_2m_max: days.map((_, i) => tempC + i), temperature_2m_min: days.map((_, i) => tempC - 10 + i), precipitation_probability_max: [10, 80, 90, 0, 5, 70, 20] }
  };
}
const LONDON = { name: "London", latitude: 51.5085, longitude: -0.1257, country: "United Kingdom", admin1: "England" };

(async () => {
  await new Promise((r) => srv.listen(0, r)); const url = "http://127.0.0.1:" + srv.address().port + "/weather/";
  const b = await chromium.launch(), results = [], fail = [];
  const check = (name, ok, got) => { results.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  (got: " + got + ")"}`); if (!ok) fail.push(name); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && !/^Failed to load resource/.test(m.text()) && errors.push(m.text())); // the browser logs the 503 that step 6 serves on purpose
  let failForecast = false; const forecastUrls = [];
  await ctx.route("https://api.open-meteo.com/**", (route) => {
    const u = new URL(route.request().url()); forecastUrls.push(u.search);
    if (failForecast) return route.fulfill({ status: 503, body: "busy" });
    const lat = +u.searchParams.get("latitude");
    route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(lat > 50 ? forecast(lat, 8, "Europe/London") : forecast(lat, 25, "Asia/Kolkata")) });
  });
  await ctx.route("https://geocoding-api.open-meteo.com/**", (route) => {
    const name = new URL(route.request().url()).searchParams.get("name").toLowerCase();
    route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(name === "london" ? { results: [LONDON] } : { generationtime_ms: 0.4 }) });
  });
  const text = (sel) => p.locator(sel).innerText();

  // 1. Default location
  await p.goto(url); await p.waitForSelector("#main:not(.empty)");
  check("loads Siliguri by default", (await text("#place")).startsWith("Siliguri, West Bengal"), await text("#place"));
  check("requests Siliguri coordinates", /latitude=26.7271&longitude=88.3953/.test(forecastUrls[0]), forecastUrls[0]);
  check("current temperature in °C", (await text("#nowTemp")) === "25°", await text("#nowTemp"));
  check("condition, humidity, wind shown", (await text("#nowCond")) === "Partly cloudy" && (await text("#nowHum")) === "61%" && (await text("#nowWind")) === "10 km/h", [await text("#nowCond"), await text("#nowHum"), await text("#nowWind")]);
  check("local time shown", /^Local time: .+\d/.test(await text("#localTime")), await text("#localTime"));
  check("24 hourly entries starting now", (await p.locator("#hours li").count()) === 24 && (await text("#hours li >> nth=0")).startsWith("Now"), await p.locator("#hours li").count());
  check("7 daily rows with high and low", (await p.locator("#days li").count()) === 7 && /25°\s*15°/.test(await text("#days li >> nth=0")), await text("#days li >> nth=0"));
  check("every day has a real name", !/Invalid/.test(await text("#days")), await text("#days li >> nth=6"));
  check("no horizontal page scroll at 390px", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await p.evaluate(() => document.documentElement.scrollWidth));

  // 2. Unit toggle, remembered across reloads
  await p.click("[data-unit=f]");
  check("°F converts current temp", (await text("#nowTemp")) === "77°" && (await text("#nowWind")) === "6 mph", [await text("#nowTemp"), await text("#nowWind")]);
  await p.reload(); await p.waitForSelector("#main:not(.empty)");
  check("°F remembered after reload", (await text("#nowTemp")) === "77°" && (await p.getAttribute("[data-unit=f]", "aria-pressed")) === "true", await text("#nowTemp"));
  await p.click("[data-unit=c]");

  // 3. City that doesn't exist
  await p.fill("#q", "Zzxqvplorn"); await p.press("#q", "Enter");
  await p.waitForSelector("#status.error");
  check("unknown city: clear message, page still shows Siliguri", /No place found for “Zzxqvplorn”/.test(await text("#status")) && (await text("#place")).startsWith("Siliguri"), await text("#status"));

  // 4. Search and pick a city
  await p.fill("#q", "London"); await p.click("form button[type=submit]");
  await p.click("#results button");
  await p.waitForFunction(() => document.getElementById("place").textContent.startsWith("London"));
  check("search → London forecast", (await text("#nowTemp")) === "8°" && /latitude=51.5085/.test(forecastUrls.at(-1)), await text("#nowTemp"));

  // 5. Pin, reload, one-click switch
  await p.click("#pinBtn");
  await p.reload(); await p.waitForSelector("#main:not(.empty)");
  check("pin survives reload", (await p.locator("#pins .pin").count()) === 1 && (await text("#pins .pin")) === "London", await p.locator("#pins .pin").count());
  await p.click("#pins .pin"); await p.waitForFunction(() => document.getElementById("place").textContent.startsWith("London"));
  check("pinned city loads in one click", (await p.getAttribute("#pinBtn", "aria-pressed")) === "true", await p.getAttribute("#pinBtn", "aria-pressed"));

  // 6. Server error, then Retry
  failForecast = true; await p.click("#pins .pin");
  await p.waitForSelector("#status.error button");
  check("server error: message + Retry, last weather kept", /HTTP 503/.test(await text("#status")) && (await text("#place")).startsWith("London"), await text("#status"));
  failForecast = false; await p.click("#status button");
  await p.waitForFunction(() => !document.getElementById("status").textContent);
  check("Retry recovers", (await text("#nowTemp")) === "8°", await text("#nowTemp"));

  // 7. Offline
  await ctx.setOffline(true);
  await p.fill("#q", "London"); await p.press("#q", "Enter");
  await p.waitForSelector("#status.error");
  check("offline: says so, offers Retry", /offline/i.test(await text("#status")) && (await p.locator("#status button").count()) === 1, await text("#status"));
  await ctx.setOffline(false);

  // 8. Unpin
  await p.click("#pins .unpin");
  check("unpin removes it", (await p.locator("#pins .pin").count()) === 0 && (await p.isHidden("#pinsBox")), await p.locator("#pins .pin").count());

  check("no console or page errors", errors.length === 0, errors.join(" | "));
  await p.screenshot({ path: process.env.SHOT || "/dev/null" }).catch(() => {});
  await b.close(); srv.close();
  console.log(results.join("\n")); if (fail.length) { console.log("\nFailed: " + fail.join(", ")); process.exit(1); } console.log("\nAll weather checks passed.");
})();
