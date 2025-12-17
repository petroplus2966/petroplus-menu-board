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
  const now  = new Date();
  const next = new Date(now);

  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => location.reload(), next - now);
})();


/* =========================================================
   TICKER CORE (CONTINUOUS — SPORTS BAR STYLE)
========================================================= */
const track = document.getElementById("forecastTrack");

let weatherText = "WEATHER LOADING…";
let sportsText  = "SPORTS LOADING…";

function rebuildTicker() {
  if (!track) return;

  const base = `${weatherText}   •   ${sportsText}`;

  // Pad heavily so crawl is slow & readable
  let combined = base;
  while (combined.length < 1600) {
    combined += "   •   " + base;
  }

  track.textContent = combined;
}


/* =========================================================
   WEATHER (7-DAY FORECAST)
========================================================= */
async function loadWeather() {
  const lat = 42.93;   // Ohsweken
  const lon = -80.12;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7&timezone=America%2FToronto`;

  function icon(rain, hi) {
    if (rain >= 5) return "🌧️";
    if (rain > 0)  return "🌦️";
    if (hi <= 0)   return "❄️";
    return "☀️";
  }

  try {
    const res  = await fetch(url, { cache:"no-store" });
    const data = await res.json();

    const days = data.daily.time;
    const hi   = data.daily.temperature_2m_max;
    const lo   = data.daily.temperature_2m_min;
    const rain = data.daily.precipitation_sum;

    const parts = days.map((d, i) => {
      const date = new Date(d + "T00:00:00");
      const dow  = date.toLocaleDateString("en-CA", { weekday:"short" }).toUpperCase();
      const md   = date.toLocaleDateString("en-CA", { month:"2-digit", day:"2-digit" });
      return `${dow} ${md} ${icon(rain[i], hi[i])} ${Math.round(hi[i])}°/${Math.round(lo[i])}°`;
    });

    weatherText = `WEATHER: ${parts.join("   •   ")}`;
    rebuildTicker();

  } catch {
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
    const t = title.toLowerCase();
    if (t.includes("leaf") || t.includes("nhl")) return "🏒";
    if (t.includes("raptor") || t.includes("nba")) return "🏀";
    if (t.includes("blue jay") || t.includes("mlb")) return "⚾";
    if (t.includes("soccer")) return "⚽";
    return "📰";
  }

  try {
    const res  = await fetch(rss, { cache:"no-store" });
    const data = await res.json();

    const headlines = data.items
      .slice(0, 10)
      .map(h => `${emoji(h.title)} ${h.title.toUpperCase()}`);

    sportsText = `SPORTS: ${headlines.join("   •   ")}`;
    rebuildTicker();

  } catch {
    sportsText = "SPORTS HEADLINES UNAVAILABLE";
    rebuildTicker();
  }
}

loadSports();
setInterval(loadSports, 5 * 60 * 1000);
