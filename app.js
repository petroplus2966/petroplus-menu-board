/* =========================================================
   CLOCK + DATE (RIGHT STACK)
========================================================= */
function updateClockAndDate() {
  const now = new Date();

  // 24h time
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.textContent = `${hh}:${mm}`;

  // Numeric date (YYYY-MM-DD)
  const dateEl = document.getElementById("dateText");
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-CA");
}
updateClockAndDate();
setInterval(updateClockAndDate, 10_000);


/* =========================================================
   WEATHER (CURRENT + 7-DAY)
   Open-Meteo — no API key
   Handles BOTH `current` and legacy `current_weather` formats
========================================================= */
async function loadWeather() {
  const track   = document.getElementById("forecastTrack");
  const nowIcon = document.getElementById("nowIcon");
  const nowTemp = document.getElementById("nowTemp");
  const nowMeta = document.getElementById("nowMeta");

  // Visible status so you know JS is running
  if (track) track.textContent = "FETCHING 7-DAY FORECAST…";
  if (nowIcon) nowIcon.textContent = "—";
  if (nowTemp) nowTemp.textContent = "—°C";
  if (nowMeta) nowMeta.textContent = "FETCHING CURRENT…";

  // Ohsweken approx
  const lat = 42.93;
  const lon = -80.12;

  // Ask for BOTH formats for maximum compatibility
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&current_weather=true` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7` +
    `&timezone=America%2FToronto`;

  function conditionFromCode(code) {
    // WMO weather code mapping (signage-friendly)
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

    /* ---------- CURRENT CONDITIONS (NOW) ---------- */
    const c = data?.current || null;
    const cw = data?.current_weather || null;

    // Pull from modern `current` first, fallback to legacy `current_weather`
    const temp = (c?.temperature_2m ?? cw?.temperature ?? null);
    const feels = (c?.apparent_temperature ?? null);
    const hum = (c?.relative_humidity_2m ?? null);
    const wind = (c?.wind_speed_10m ?? cw?.windspeed ?? null);
    const code = (c?.weather_code ?? cw?.weathercode ?? null);

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

    /* ---------- 7-DAY FORECAST (SCROLL) ---------- */
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

    const line = parts.join("   •   ");
    if (track) track.textContent = `${line}   •   ${line}`;

  } catch (err) {
    console.error("Weather error:", err);

    if (track) track.textContent =
      "WEATHER UNAVAILABLE   •   WEATHER UNAVAILABLE   •   WEATHER UNAVAILABLE";
    if (nowMeta) nowMeta.textContent = "WEATHER UNAVAILABLE";
  }
}

// Initial load + refresh every 30 minutes
loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);


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
