/* =========================================================
   CLOCK + DATE (RIGHT STACK)
========================================================= */
function updateClockAndDate() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  const clock = document.getElementById("clock");
  const date  = document.getElementById("dateText");

  if (clock) clock.textContent = `${hh}:${mm}`;
  if (date)  date.textContent  = now.toLocaleDateString("en-CA");
}
updateClockAndDate();
setInterval(updateClockAndDate, 10_000);


/* =========================================================
   DAILY RELOAD @ 2:00 AM (LOCAL DEVICE TIME)
========================================================= */
(function schedule2AMReload(){
  const now = new Date();
  const next = new Date(now);

  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => location.reload(), next - now);
})();


/* =========================================================
   PROMO ROTATION (SINGLE PROMO ZONE)
========================================================= */
const promoFiles = ["promo1.jpg", "promo2.jpg", "promo3.jpg", "promo4.jpg"];

(async function rotatePromo(){
  const img = document.getElementById("promoImg");
  if (!img) return;

  // Only use files that actually exist (prevents broken images)
  async function exists(path){
    try{
      const r = await fetch(path, { method:"HEAD", cache:"no-store" });
      return r.ok;
    }catch{
      return false;
    }
  }

  const available = [];
  for (const f of promoFiles){
    if (await exists(f)) available.push(f);
  }

  if (available.length === 0) return;

  let i = 0;
  img.src = available[i];

  setInterval(() => {
    i = (i + 1) % available.length;
    img.src = available[i];
  }, 12_000);
})();


/* =========================================================
   TICKER CORE (CONTINUOUS – SPORTS BAR SPEED)
========================================================= */
const track = document.getElementById("forecastTrack");

let weatherText = "WEATHER LOADING…";
let sportsText  = "SPORTS LOADING…";

function rebuildTicker() {
  if (!track) return;

  const base = `${weatherText}   •   ${sportsText}`;

  // Heavy padding for slow, readable crawl
  let combined = base;
  while (combined.length < 1600) {
    combined += "   •   " + base;
  }

  track.textContent = combined;
}


/* =========================================================
   WEATHER (CURRENT + 7-DAY) — STABLE
========================================================= */
async function loadWeather() {
  const lat = 42.93;   // Ohsweken
  const lon = -80.12;

  const nowIcon = document.getElementById("nowIcon");
  const nowTemp = document.getElementById("nowTemp");
  const nowMeta = document.getElementById("nowMeta");

  if (nowIcon) nowIcon.textContent = "—";
  if (nowTemp) nowTemp.textContent = "—°C";
  if (nowMeta) nowMeta.textContent = "FETCHING CURRENT…";

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7&timezone=America%2FToronto`;

  function currentIcon(code) {
    if (code === 0) return { icon: "☀️", text: "CLEAR" };
    if ([1,2].includes(code)) return { icon: "⛅️", text: "PARTLY CLOUDY" };
    if (code === 3) return { icon: "☁️", text: "CLOUDY" };
    if ([45,48].includes(code)) return { icon: "🌫️", text: "FOG" };
    if ([51,53,55,56,57].includes(code)) return { icon: "🌦️", text: "DRIZZLE" };
    if ([61,63,65,66,67,80,81,82].includes(code)) return { icon: "🌧️", text: "RAIN" };
    if ([71,73,75,77,85,86].includes(code)) return { icon: "❄️", text: "SNOW" };
    if ([95,96,99].includes(code)) return { icon: "⛈️", text: "STORM" };
    return { icon: "🌡️", text: "WEATHER" };
  }

  function dailyIcon(rain, hi) {
    if (hi <= 0 && rain > 0) return "❄️";
    if (rain >= 5) return "🌧️";
    if (rain > 0)  return "🌦️";
    return "☀️";
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    /* ---------- CURRENT CONDITIONS ---------- */
    const c  = data.current || null;
    const cw = data.current_weather || null;

    const temp  = c?.temperature_2m ?? cw?.temperature ?? null;
    const feels = c?.apparent_temperature ?? null;
    const hum   = c?.relative_humidity_2m ?? null;
    const wind  = c?.wind_speed_10m ?? cw?.windspeed ?? null;
    const code  = c?.weather_code ?? cw?.weathercode ?? null;

    if (temp != null && nowIcon && nowTemp && nowMeta) {
      const cond = currentIcon(Number(code));
      nowIcon.textContent = cond.icon;
      nowTemp.textContent = `${Math.round(temp)}°C`;

      const meta = [];
      meta.push(cond.text);
      if (feels != null) meta.push(`FEELS ${Math.round(feels)}°`);
      if (hum != null)   meta.push(`HUM ${Math.round(hum)}%`);
      if (wind != null)  meta.push(`WIND ${Math.round(wind)} KM/H`);

      nowMeta.textContent = meta.join(" • ");
    } else {
      if (nowMeta) nowMeta.textContent = "CURRENT UNAVAILABLE";
    }

    /* ---------- 7-DAY FORECAST ---------- */
    const days = data?.daily?.time ?? [];
    const hi   = data?.daily?.temperature_2m_max ?? [];
    const lo   = data?.daily?.temperature_2m_min ?? [];
    const rain = data?.daily?.precipitation_sum ?? [];

    if (!days.length) throw new Error("No daily forecast");

    const parts = days.slice(0, 7).map((d, i) => {
      const date = new Date(d + "T00:00:00");
      const dow  = date.toLocaleDateString("en-CA",{ weekday:"short" }).toUpperCase();
      const md   = date.toLocaleDateString("en-CA",{ month:"2-digit", day:"2-digit" });
      return `${dow} ${md} ${dailyIcon(Number(rain[i] ?? 0), Number(hi[i] ?? 0))} ${Math.round(hi[i])}°/${Math.round(lo[i])}°`;
    });

    weatherText = `WEATHER: ${parts.join("   •   ")}`;
    rebuildTicker();

  } catch (err) {
    console.error("Weather error:", err);
    if (nowMeta) nowMeta.textContent = "WEATHER UNAVAILABLE";
    weatherText = "WEATHER UNAVAILABLE";
    rebuildTicker();
  }
}

loadWeather();
setInterval(loadWeather, 5 * 60 * 1000);


/* =========================================================
   SPORTSNET RSS (HEADLINES)
========================================================= */
async function loadSports() {
  const rss =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent("https://www.sportsnet.ca/feed/");

  function emoji(title){
    const t = (title || "").toLowerCase();
    if (t.includes("leaf") || t.includes("nhl") || t.includes("hockey")) return "🏒";
    if (t.includes("raptor") || t.includes("nba") || t.includes("basketball")) return "🏀";
    if (t.includes("blue jay") || t.includes("mlb") || t.includes("baseball")) return "⚾";
    if (t.includes("nfl") || t.includes("football")) return "🏈";
    if (t.includes("soccer") || t.includes("mls") || t.includes("premier")) return "⚽";
    return "📰";
  }

  try {
    const res  = await fetch(rss, { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = Array.isArray(data?.items) ? data.items : [];
    const headlines = items
      .slice(0, 10)
      .map(h => h?.title ? `${emoji(h.title)} ${String(h.title).toUpperCase()}` : "")
      .filter(Boolean);

    sportsText = headlines.length
      ? `SPORTS: ${headlines.join("   •   ")}`
      : "SPORTS: NO HEADLINES";

    rebuildTicker();

  } catch (err) {
    console.error("Sports error:", err);
    sportsText = "SPORTS: HEADLINES UNAVAILABLE";
    rebuildTicker();
  }
}

loadSports();
setInterval(loadSports, 5 * 60 * 1000);
