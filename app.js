/* =========================================================
   CLOCK + DATE (RIGHT STACK)
========================================================= */
function updateClockAndDate() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  document.getElementById("clock").textContent = `${hh}:${mm}`;
  document.getElementById("dateText").textContent =
    now.toLocaleDateString("en-CA");
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
   PROMO SLIDESHOW (FADE, 15s, CACHE-BUST, AUTO-ADJUST)
========================================================= */
const promoCandidates = [
  "promo1.jpg",
  "promo2.jpg",
  "promo3.jpg",
  "promo4.jpg",
  "promo5.jpg"
];

(async function promoSlideshow(){
  const img = document.getElementById("promoImg");
  if (!img) return;

  async function exists(file){
    try {
      const r = await fetch(file, { method: "HEAD", cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  }

  // Build list of promos that actually exist
  const promos = [];
  for (const f of promoCandidates){
    if (await exists(f)) promos.push(f);
  }

  // No promos → do nothing
  if (promos.length === 0) return;

  // One promo → just show it (no slideshow)
  if (promos.length === 1){
    img.src = promos[0] + "?v=" + Date.now();
    return;
  }

  let index = 0;

  function setSrc(file){
    img.src = file + "?v=" + Date.now(); // cache-bust
  }

  setSrc(promos[index]);

  setInterval(() => {
    img.classList.add("fadeOut");

    setTimeout(() => {
      index = (index + 1) % promos.length;
      setSrc(promos[index]);
    }, 400);

    setTimeout(() => {
      img.classList.remove("fadeOut");
    }, 800);

  }, 15_000);
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
  let combined = base;

  while (combined.length < 1600) {
    combined += "   •   " + base;
  }

  track.textContent = combined;
}


/* =========================================================
   WEATHER (CURRENT + 7-DAY FORECAST)
========================================================= */
async function loadWeather() {
  const lat = 42.93;
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

  function icon(code) {
    if (code === 0) return { i:"☀️", t:"CLEAR" };
    if ([1,2].includes(code)) return { i:"⛅️", t:"PARTLY CLOUDY" };
    if (code === 3) return { i:"☁️", t:"CLOUDY" };
    if ([45,48].includes(code)) return { i:"🌫️", t:"FOG" };
    if ([61,63,65].includes(code)) return { i:"🌧️", t:"RAIN" };
    if ([71,73,75].includes(code)) return { i:"❄️", t:"SNOW" };
    if ([95,96,99].includes(code)) return { i:"⛈️", t:"STORM" };
    return { i:"🌡️", t:"WEATHER" };
  }

  try {
    const res = await fetch(url, { cache:"no-store" });
    const data = await res.json();

    const c  = data.current || null;
    const cw = data.current_weather || null;

    const temp = c?.temperature_2m ?? cw?.temperature;
    const code = c?.weather_code ?? cw?.weathercode;

    if (temp != null && nowIcon && nowTemp && nowMeta) {
      const cond = icon(Number(code));
      nowIcon.textContent = cond.i;
      nowTemp.textContent = `${Math.round(temp)}°C`;
      nowMeta.textContent = cond.t;
    }

    const days = data.daily.time;
    const hi   = data.daily.temperature_2m_max;
    const lo   = data.daily.temperature_2m_min;
    const rain = data.daily.precipitation_sum;

    const parts = days.slice(0,7).map((d,i)=>{
      const dt = new Date(d+"T00:00:00");
      const dow = dt.toLocaleDateString("en-CA",{ weekday:"short" }).toUpperCase();
      const md  = dt.toLocaleDateString("en-CA",{ month:"2-digit", day:"2-digit" });
      return `${dow} ${md} ${rain[i] > 0 ? "🌧️" : "☀️"} ${Math.round(hi[i])}°/${Math.round(lo[i])}°`;
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

  try {
    const res = await fetch(rss, { cache:"no-store" });
    const data = await res.json();

    const headlines = data.items
      .slice(0,10)
      .map(h => `📰 ${h.title.toUpperCase()}`);

    sportsText = `SPORTS: ${headlines.join("   •   ")}`;
    rebuildTicker();

  } catch {
    sportsText = "SPORTS HEADLINES UNAVAILABLE";
    rebuildTicker();
  }
}

loadSports();
setInterval(loadSports, 5 * 60 * 1000);
