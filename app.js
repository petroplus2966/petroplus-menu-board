/* =========================================================
   CLOCK + DATE (RIGHT STACK)
========================================================= */
function updateClockAndDate() {
  const now = new Date();

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.textContent = `${hh}:${mm}`;

  const dateEl = document.getElementById("dateText");
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-CA");
}
updateClockAndDate();
setInterval(updateClockAndDate, 10_000);


/* =========================================================
   DAILY RELOAD @ 2:00 AM (device local time)
========================================================= */
function scheduleDailyReloadAt2AM() {
  const now = new Date();
  const next = new Date(now);

  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const ms = next.getTime() - now.getTime();
  setTimeout(() => location.reload(), ms);
}

document.addEventListener("DOMContentLoaded", () => {
  scheduleDailyReloadAt2AM();
});


/* =========================================================
   TICKER CONTROL (NO SWITCHING UNTIL READY + FULL CYCLE)
========================================================= */
let weatherLine = "WEATHER: FETCHING…";
let sportsLine  = "SPORTS: FETCHING…";

let weatherReady = false;
let sportsReady  = false;

let tickerMode = "weather"; // "weather" | "sports"
let tickerLoopStarted = false;

function getMarqueeDurationMs() {
  const track = document.getElementById("forecastTrack");
  if (!track) return 70_000; // fallback

  const dur = getComputedStyle(track).animationDuration || "70s";
  // supports "70s" or "70000ms"
  if (dur.endsWith("ms")) return Math.max(10_000, parseFloat(dur));
  if (dur.endsWith("s"))  return Math.max(10_000, parseFloat(dur) * 1000);
  return 70_000;
}

function restartMarquee() {
  const track = document.getElementById("forecastTrack");
  if (!track) return;
  track.style.animation = "none";
  track.offsetHeight; // force reflow
  track.style.animation = "";
}

function setTickerText(line, { restart = false } = {}) {
  const track = document.getElementById("forecastTrack");
  if (!track) return;

  // duplicate for seamless scroll
  track.textContent = `${line}   •   ${line}`;

  if (restart) restartMarquee();
}

function buildSlowSportsLine(headlines) {
  // Make sports feel as “slow” as weather by ensuring long text
  // (short strings appear to zip by even at same animation duration).
  const base = "SPORTS: " + headlines.join("   •   ");

  // Repeat until we have plenty of length
  let out = base;
  while (out.length < 900) out += "   •   " + base;
  return out;
}

async function tickerLoop() {
  // Don’t start switching until weather is ready
  if (!weatherReady) {
    setTickerText(weatherLine, { restart: false });
    setTimeout(tickerLoop, 2000);
    return;
  }

  // Show WEATHER first, always
  tickerMode = "weather";
  setTickerText(weatherLine, { restart: true });

  // Hold for a full marquee cycle (so the full weather scroll completes)
  await new Promise(r => setTimeout(r, getMarqueeDurationMs()));

  // Only switch to sports if sports is ready (otherwise keep weather)
  if (!sportsReady) {
    setTimeout(tickerLoop, 0);
    return;
  }

  // Show SPORTS for a full cycle
  tickerMode = "sports";
  setTickerText(sportsLine, { restart: true });

  await new Promise(r => setTimeout(r, getMarqueeDurationMs()));

  // Loop forever
  setTimeout(tickerLoop, 0);
}

document.addEventListener("DOMContentLoaded", () => {
  // initial placeholder
  setTickerText("WEATHER: LOADING…", { restart: false });

  // start the loop once
  if (!tickerLoopStarted) {
    tickerLoopStarted = true;
    tickerLoop();
  }
});


/* =========================================================
   WEATHER (CURRENT + 7-DAY)
========================================================= */
async function loadWeather() {
  const nowIcon = document.getElementById("nowIcon");
  const nowTemp = document.getElementById("nowTemp");
  const nowMeta = document.getElementById("nowMeta");

  if (nowIcon) nowIcon.textContent = "—";
  if (nowTemp) nowTemp.textContent = "—°C";
  if (nowMeta) nowMeta.textContent = "FETCHING CURRENT…";

  const lat = 42.93; // Ohsweken approx
  const lon = -80.12;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&current_weather=true` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7` +
    `&timezone=America%2FToronto`;

  function conditionFromCode(code) {
    if (code === 0) return { icon: "☀️", text: "CLEAR" };
    if ([1, 2].includes(code)) return { icon: "⛅️", text: "PARTLY CLOUDY" };
    if (code === 3) return { icon: "☁️", text: "CLOUDY" };
    if ([45, 48].includes(code)) return { icon: "🌫️", text: "FOG" };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", text: "DRIZZLE" };
    if ([61, 63, 65, 66, 67].includes(code)) return { icon: "🌧️", text: "RAIN" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄️", text: "SNOW" };
    if ([80, 81, 82].includes(code)) return { icon: "🌧️", text: "SHOWERS" };
    if ([95, 96, 99].includes(code)) return { icon: "⛈️", text: "THUNDER" };
    return { icon: "🌡️", text: "WEATHER" };
  }

  function dailyIcon(hi, mm) {
    if (hi <= 0 && mm > 0) return "❄️";
    if (mm >= 5) return "🌧️";
    if (mm > 0) return "🌦️";
    return "☀️";
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // CURRENT (NOW)
    const c = data?.current || null;
    const cw = data?.current_weather || null;

    const temp  = (c?.temperature_2m ?? cw?.temperature ?? null);
    const feels = (c?.apparent_temperature ?? null);
    const hum   = (c?.relative_humidity_2m ?? null);
    const wind  = (c?.wind_speed_10m ?? cw?.windspeed ?? null);
    const code  = (c?.weather_code ?? cw?.weathercode ?? null);

    if (nowTemp && nowMeta && nowIcon && temp != null) {
      const t = Math.round(temp);
      const cond = conditionFromCode(Number(code));

      nowIcon.textContent = cond.icon;
      nowTemp.textContent = `${t}°C`;

      const metaParts = [];
      metaParts.push(cond.text);
      if (feels != null) metaParts.push(`FEELS ${Math.round(feels)}°`);
      if (hum != null) metaParts.push(`HUM ${Math.round(hum)}%`);
      if (wind != null) metaParts.push(`WIND ${Math.round(wind)} KM/H`);
      nowMeta.textContent = metaParts.join(" • ");
    } else {
      if (nowMeta) nowMeta.textContent = "CURRENT UNAVAILABLE";
    }

    // 7-DAY FORECAST (ticker line)
    const days  = data?.daily?.time ?? [];
    const highs = data?.daily?.temperature_2m_max ?? [];
    const lows  = data?.daily?.temperature_2m_min ?? [];
    const rain  = data?.daily?.precipitation_sum ?? [];

    if (!days.length) throw new Error("No daily forecast");

    const parts = [];
    for (let i = 0; i < Math.min(7, days.length); i++) {
      const d = new Date(days[i] + "T00:00:00");
      const dow = d.toLocaleDateString("en-CA", { weekday: "short" }).toUpperCase();
      const md  = d.toLocaleDateString("en-CA", { month: "2-digit", day: "2-digit" });

      const hi = Math.round(highs[i]);
      const lo = Math.round(lows[i]);
      const mm = Math.round(rain[i] ?? 0);

      parts.push(`${dow} ${md} ${dailyIcon(hi, mm)} ${hi}°/${lo}°`);
    }

    weatherLine = "WEATHER: " + parts.join("   •   ");
    weatherReady = true;

    // If we’re currently showing weather, update content (don’t interrupt cycle)
    if (tickerMode === "weather") setTickerText(weatherLine, { restart: false });

  } catch (err) {
    console.error("Weather error:", err);
    weatherLine = "WEATHER: UNAVAILABLE";
    weatherReady = true; // allow loop to proceed (it’ll just show unavailable)
    if (tickerMode === "weather") setTickerText(weatherLine, { restart: false });

    const nowMeta = document.getElementById("nowMeta");
    if (nowMeta) nowMeta.textContent = "WEATHER UNAVAILABLE";
  }
}

// Soft refresh weather
loadWeather();
setInterval(loadWeather, 5 * 60 * 1000);


/* =========================================================
   SPORTSNET RSS -> HEADLINES (ticker)
   Tries multiple CORS-friendly fetch methods
========================================================= */
async function loadSportsHeadlines() {
  const rssUrl = "https://www.sportsnet.ca/feed/";

  function sportEmoji(title) {
    const t = title.toLowerCase();
    if (t.includes("nhl") || t.includes("leaf") || t.includes("hockey")) return "🏒";
    if (t.includes("nba") || t.includes("raptor") || t.includes("basketball")) return "🏀";
    if (t.includes("mlb") || t.includes("blue jay") || t.includes("baseball")) return "⚾";
    if (t.includes("nfl") || t.includes("football")) return "🏈";
    if (t.includes("soccer") || t.includes("mls") || t.includes("premier")) return "⚽";
    return "📰";
  }

  function parseRssXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const items = Array.from(doc.querySelectorAll("item"));
    const titles = items
      .map(it => (it.querySelector("title")?.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 10);

    if (!titles.length) throw new Error("No RSS titles found");
    return titles;
  }

  async function fetchViaJina() {
    const url = "https://r.jina.ai/http://www.sportsnet.ca/feed/";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
    const text = await res.text();
    const idx = text.indexOf("<rss");
    if (idx === -1) throw new Error("Jina: RSS tag not found");
    return text.slice(idx);
  }

  async function fetchViaAllOrigins() {
    const proxy = "https://api.allorigins.win/get?url=" + encodeURIComponent(rssUrl);
    const res = await fetch(proxy, { cache: "no-store" });
    if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.contents) throw new Error("AllOrigins: no contents");
    return json.contents;
  }

  async function fetchViaRss2Json() {
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rssUrl);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`rss2json HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.items?.length) throw new Error("rss2json: no items");
    const titles = json.items.slice(0, 10).map(it => (it.title || "").trim()).filter(Boolean);
    if (!titles.length) throw new Error("rss2json: no titles");
    return titles;
  }

  try {
    let titles;

    try {
      const xml = await fetchViaJina();
      titles = parseRssXml(xml);
    } catch (e1) {
      console.warn("Sports via Jina failed:", e1);

      try {
        const xml = await fetchViaAllOrigins();
        titles = parseRssXml(xml);
      } catch (e2) {
        console.warn("Sports via AllOrigins failed:", e2);

        titles = await fetchViaRss2Json();
      }
    }

    const decorated = titles.map(t => `${sportEmoji(t)} ${t.toUpperCase()}`);
    sportsLine = buildSlowSportsLine(decorated);
    sportsReady = true;

    // If we’re currently showing sports, update content (don’t interrupt cycle)
    if (tickerMode === "sports") setTickerText(sportsLine, { restart: false });

  } catch (err) {
    console.error("Sports RSS error:", err);
    sportsLine = "SPORTS: HEADLINES UNAVAILABLE";
    sportsReady = true; // allow loop to proceed (it’ll show unavailable)
    if (tickerMode === "sports") setTickerText(sportsLine, { restart: false });
  }
}

// Soft refresh sports
loadSportsHeadlines();
setInterval(loadSportsHeadlines, 5 * 60 * 1000);


/* =========================================================
   OPTIONAL PROMO ROTATION
========================================================= */
const promoFiles = ["promo1.jpg", "promo2.jpg", "promo3.jpg", "promo4.jpg"];

async function fileExists(path) {
  try {
    const r = await fetch(path, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

(async function rotatePromos() {
  const top = document.getElementById("promoTopImg");
  const bottom = document.getElementById("promoBottomImg");
  if (!top || !bottom) return;

  const available = [];
  for (const f of promoFiles) {
    if (await fileExists(f)) available.push(f);
  }

  if (available.length === 0) return;

  if (available.length === 1) {
    top.src = available[0];
    bottom.src = available[0];
    return;
  }

  let index = 0;
  top.src = available[index++ % available.length];
  bottom.src = available[index++ % available.length];

  setInterval(() => {
    top.src = available[index++ % available.length];
    bottom.src = available[index++ % available.length];
  }, 12_000);
})();
