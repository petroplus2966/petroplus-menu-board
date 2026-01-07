/* =========================================================
   PETROPLUS BOARD — app.js (Chrome-first)
   - Clock (AM/PM) + date (right stack)
   - Weather: current + 7-day (Open-Meteo)
   - Headlines: Sports + Local + World via RSS2JSON
   - One continuous ticker line (no switching)
   - Promo: A/B crossfade slideshow with everyday + day-specific
   - Soft updates every 5 minutes
   - Full reload daily at 2:00 AM
========================================================= */

/* -----------------------------
   CONFIG
------------------------------ */
const TZ = "America/Toronto";

// Location shown on right stack (display only)
const LOCATION_LABEL = "Brantford / Six Nations / Hamilton";

// Weather location (Ohsweken area)
const WX_LAT = 42.93;
const WX_LON = -80.12;

// Ticker refresh cadence
const REFRESH_MS = 5 * 60 * 1000;

// Promo timing
const PROMO_MS = 15_000; // change to 10_000 if you want 10s promos

// Stable cache-bust per session (preload URL == display URL)
const CACHE_VERSION = Date.now();

/* -----------------------------
   ELEMENTS
------------------------------ */
const nowIconEl = document.getElementById("nowIcon");
const nowTempEl = document.getElementById("nowTemp");
const nowMetaEl = document.getElementById("nowMeta");

const marqueeTrackEl = document.getElementById("marqueeTrack");

const locTextEl = document.getElementById("locText");
const dateTextEl = document.getElementById("dateText");
const timeTextEl = document.getElementById("timeText");

const promoAEl = document.getElementById("promoA");
const promoBEl = document.getElementById("promoB");

/* -----------------------------
   UTIL
------------------------------ */
function urlFor(file){
  return `${file}?v=${CACHE_VERSION}`;
}

async function exists(file){
  try{
    const r = await fetch(file, { method:"HEAD", cache:"no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

function preloadAndDecode(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try{ if (img.decode) await img.decode(); } catch {}
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

function dayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    weekday: "short"
  }).format(new Date()).toLowerCase(); // mon/tue/...
}

function padTicker(text, minChars = 2400){
  // ensure long readable crawl
  let out = text;
  while (out.length < minChars) out += "   •   " + text;
  return out;
}

/* =========================================================
   CLOCK / DATE (RIGHT STACK)
========================================================= */
function updateClock(){
  const now = new Date();

  if (locTextEl) locTextEl.textContent = LOCATION_LABEL;

  if (dateTextEl){
    // Numeric date (Canada format)
    dateTextEl.textContent = now.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  if (timeTextEl){
    timeTextEl.textContent = now.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).toUpperCase();
  }
}
updateClock();
setInterval(updateClock, 10_000);

/* =========================================================
   DAILY FULL RELOAD @ 2:00 AM (device local time)
========================================================= */
(function schedule2AMReload(){
  const now = new Date();
  const next = new Date(now);

  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => location.reload(), next - now);
})();

/* =========================================================
   WEATHER (CURRENT + 7-DAY TEXT)
========================================================= */
function currentIcon(code){
  const n = Number(code);
  if (n === 0) return { icon:"☀️", text:"CLEAR" };
  if ([1,2].includes(n)) return { icon:"⛅️", text:"PARTLY CLOUDY" };
  if (n === 3) return { icon:"☁️", text:"CLOUDY" };
  if ([45,48].includes(n)) return { icon:"🌫️", text:"FOG" };
  if ([51,53,55,56,57].includes(n)) return { icon:"🌦️", text:"DRIZZLE" };
  if ([61,63,65,80,81,82].includes(n)) return { icon:"🌧️", text:"RAIN" };
  if ([71,73,75,77,85,86].includes(n)) return { icon:"❄️", text:"SNOW" };
  if ([95,96,99].includes(n)) return { icon:"⛈️", text:"STORM" };
  return { icon:"🌡️", text:"WEATHER" };
}

function dailyIcon(precip, hi){
  if (hi <= 0 && precip > 0) return "❄️";
  if (precip >= 5) return "🌧️";
  if (precip > 0) return "🌦️";
  return "☀️";
}

async function loadWeather(){
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${WX_LAT}&longitude=${WX_LON}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7&timezone=${encodeURIComponent(TZ)}`;

  try{
    const res = await fetch(url, { cache:"no-store" });
    const data = await res.json();

    // Current
    const c = data.current || {};
    const temp = c.temperature_2m;
    const feels = c.apparent_temperature;
    const hum = c.relative_humidity_2m;
    const wind = c.wind_speed_10m;
    const code = c.weather_code;

    const cond = currentIcon(code);

    if (nowIconEl) nowIconEl.textContent = cond.icon;
    if (nowTempEl && temp != null) nowTempEl.textContent = `${Math.round(temp)}°C`;

    const metaParts = [];
    metaParts.push(cond.text);
    if (feels != null) metaParts.push(`FEELS ${Math.round(feels)}°`);
    if (hum != null) metaParts.push(`HUM ${Math.round(hum)}%`);
    if (wind != null) metaParts.push(`WIND ${Math.round(wind)} KM/H`);
    if (nowMetaEl) nowMetaEl.textContent = metaParts.join(" • ");

    // 7-day string
    const days = (data.daily?.time || []).slice(0,7);
    const hi = data.daily?.temperature_2m_max || [];
    const lo = data.daily?.temperature_2m_min || [];
    const precip = data.daily?.precipitation_sum || [];

    const parts = days.map((d,i)=>{
      const dt = new Date(d + "T00:00:00");
      const dow = dt.toLocaleDateString("en-CA", { weekday:"short" }).toUpperCase();
      const md  = dt.toLocaleDateString("en-CA", { month:"2-digit", day:"2-digit" });
      return `${dow} ${md} ${dailyIcon(precip[i] ?? 0, hi[i] ?? 10)} ${Math.round(hi[i] ?? 0)}°/${Math.round(lo[i] ?? 0)}°`;
    });

    return `WEATHER: ${parts.join("   •   ")}`;
  }catch{
    if (nowMetaEl) nowMetaEl.textContent = "WEATHER UNAVAILABLE";
    return "WEATHER: UNAVAILABLE";
  }
}

/* =========================================================
   RSS HEADLINES (via rss2json)
========================================================= */
async function fetchRssTitles(rssUrl, maxItems = 8){
  const endpoint = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rssUrl);
  const res = await fetch(endpoint, { cache:"no-store" });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);

  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  return items
    .slice(0, maxItems)
    .map(it => (it?.title || "").trim())
    .filter(Boolean);
}

async function loadHeadlines(){
  // Sportsnet feed (broad sports)
  const sportsRss = "https://www.sportsnet.ca/feed/";

  // Local sources (you requested Brantford / Hamilton focus)
  const brantfordRss = "https://www.brantfordexpositor.ca/feed/";
  const hamiltonRss  = "https://www.cbc.ca/webfeed/rss/rss-canada-hamiltonnews";

  // World (AP)
  const worldRss = "https://apnews.com/index.rss";

  function sportEmoji(t){
    const s = (t || "").toLowerCase();
    if (s.includes("leaf") || s.includes("nhl") || s.includes("hockey")) return "🏒";
    if (s.includes("raptor") || s.includes("nba") || s.includes("basketball")) return "🏀";
    if (s.includes("blue jay") || s.includes("mlb") || s.includes("baseball")) return "⚾";
    if (s.includes("nfl") || s.includes("football")) return "🏈";
    if (s.includes("soccer") || s.includes("mls") || s.includes("premier")) return "⚽";
    return "📰";
  }

  try{
    const [sports, brant, ham, world] = await Promise.all([
      fetchRssTitles(sportsRss, 10).catch(()=>[]),
      fetchRssTitles(brantfordRss, 6).catch(()=>[]),
      fetchRssTitles(hamiltonRss, 6).catch(()=>[]),
      fetchRssTitles(worldRss, 8).catch(()=>[])
    ]);

    const sportsText = sports.length
      ? "SPORTS: " + sports.map(t => `${sportEmoji(t)} ${t.toUpperCase()}`).join("   •   ")
      : "SPORTS: UNAVAILABLE";

    const localMerged = [...brant, ...ham].slice(0, 8);
    const localText = localMerged.length
      ? "LOCAL: " + localMerged.map(t => `🗞️ ${t.toUpperCase()}`).join("   •   ")
      : "LOCAL: UNAVAILABLE";

    const worldText = world.length
      ? "WORLD: " + world.map(t => `🌍 ${t.toUpperCase()}`).join("   •   ")
      : "WORLD: UNAVAILABLE";

    return { sportsText, localText, worldText };
  }catch{
    return {
      sportsText: "SPORTS: UNAVAILABLE",
      localText: "LOCAL: UNAVAILABLE",
      worldText: "WORLD: UNAVAILABLE"
    };
  }
}

/* =========================================================
   TICKER BUILD (ONE CONTINUOUS LINE)
========================================================= */
async function refreshTicker(){
  const weatherText = await loadWeather();
  const { sportsText, localText, worldText } = await loadHeadlines();

  const line = `${weatherText}   •   ${sportsText}   •   ${localText}   •   ${worldText}`;
  if (marqueeTrackEl) marqueeTrackEl.textContent = padTicker(line, 2600);
}

refreshTicker();
setInterval(refreshTicker, REFRESH_MS);

/* =========================================================
   PROMO (A/B CROSSFADES)
   - Everyday + day-specific
   - Auto-adjust to existing files
   - Midnight rebuild for day changes
========================================================= */
const promoEverydayCandidates = [
  "promo1.jpg",
  "promo2.jpg",
  "promo3.jpg",
  "promo4.jpg",
  "promo5.jpg"
];

const promoDayCandidates = {
  mon: ["mon1.jpg","mon2.jpg","mon3.jpg"],
  tue: ["tue1.jpg","tue2.jpg","tue3.jpg"],
  wed: ["wed1.jpg","wed2.jpg","wed3.jpg"],
  thu: ["thu1.jpg","thu2.jpg","thu3.jpg"],
  fri: ["fri1.jpg","fri2.jpg","fri3.jpg"],
  sat: ["sat1.jpg","sat2.jpg","sat3.jpg"],
  sun: ["sun1.jpg","sun2.jpg","sun3.jpg"]
};

(function promoScheduler(){
  if (!promoAEl || !promoBEl) return;

  let playlist = [];
  let i = 0;
  let showingA = true;
  let timer = null;
  let midnightTimer = null;

  function swapTo(url){
    const incoming = showingA ? promoBEl : promoAEl;
    const outgoing = showingA ? promoAEl : promoBEl;

    incoming.src = url;
    incoming.classList.add("isVisible");
    outgoing.classList.remove("isVisible");

    showingA = !showingA;
  }

  function stop(){
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function start(){
    stop();
    if (!playlist.length) return;

    i = 0;

    // first slide immediately
    promoAEl.src = urlFor(playlist[i]);
    promoAEl.classList.add("isVisible");
    promoBEl.classList.remove("isVisible");
    showingA = true;

    if (playlist.length === 1) return;

    // preload next
    let nextIndex = (i + 1) % playlist.length;
    preloadAndDecode(urlFor(playlist[nextIndex])).catch(()=>{});

    timer = setInterval(async () => {
      i = (i + 1) % playlist.length;
      const url = urlFor(playlist[i]);

      try{
        await preloadAndDecode(url);
      }catch{
        return;
      }

      swapTo(url);

      nextIndex = (i + 1) % playlist.length;
      preloadAndDecode(urlFor(playlist[nextIndex])).catch(()=>{});

    }, PROMO_MS);
  }

  async function buildPlaylist(){
    const key = dayKeyToronto();
    const candidates = [
      ...promoEverydayCandidates,
      ...(promoDayCandidates[key] || [])
    ];

    const next = [];
    for (const f of candidates){
      if (await exists(f)) next.push(f);
    }

    playlist = next;
    await start();
  }

  function msUntilLocalMidnight(){
    const now = new Date();
    const next = new Date(now);
    next.setHours(24,0,0,0);
    return Math.max(5000, next - now);
  }

  function scheduleMidnight(){
    if (midnightTimer) clearTimeout(midnightTimer);
    midnightTimer = setTimeout(async () => {
      await buildPlaylist();
      scheduleMidnight();
    }, msUntilLocalMidnight());
  }

  buildPlaylist();
  scheduleMidnight();
})();
