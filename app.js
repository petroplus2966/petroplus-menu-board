/* ===============================
   CLOCK + DATE
================================ */
function updateClockAndDate() {
  const now = new Date();

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  const clock = document.getElementById("clock");
  if (clock) clock.textContent = `${hh}:${mm}`;

  const dateText = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).toUpperCase();

  const dateEl = document.getElementById("dateText");
  if (dateEl) dateEl.textContent = dateText;
}

updateClockAndDate();
setInterval(updateClockAndDate, 10_000);


/* ===============================
   7-DAY WEATHER TICKER
   (Open-Meteo – no API key)
================================ */
async function load7DayForecast() {
  const track = document.getElementById("forecastTrack");
  if (!track) return;

  // Show immediate feedback so you know JS is running
  track.textContent = "FETCHING 7-DAY FORECAST…";

  const lat = 42.93;   // Ohsweken
  const lon = -80.12;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7` +
    `&timezone=America%2FToronto`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (!data.daily || !data.daily.time) {
      throw new Error("Invalid weather data");
    }

    const days = data.daily.time;
    const highs = data.daily.temperature_2m_max;
    const lows = data.daily.temperature_2m_min;
    const rain = data.daily.precipitation_sum;

    const items = [];

    for (let i = 0; i < Math.min(7, days.length); i++) {
      const d = new Date(days[i] + "T00:00:00");
      const day = d.toLocaleDateString("en-CA", { weekday: "short" }).toUpperCase();

      const hi = Math.round(highs[i]);
      const lo = Math.round(lows[i]);
      const mm = Math.round(rain[i] ?? 0);

      items.push(`${day} ${hi}°/${lo}° ${mm}mm`);
    }

    const line = items.join("   •   ");

    // Duplicate so the scroll never ends
    track.textContent = `${line}   •   ${line}`;

  } catch (err) {
    console.error("Weather error:", err);
    track.textContent =
      "WEATHER DATA UNAVAILABLE   •   WEATHER DATA UNAVAILABLE   •   WEATHER DATA UNAVAILABLE";
  }
}

// Initial load
load7DayForecast();

// Refresh weather every 30 minutes
setInterval(load7DayForecast, 30 * 60 * 1000);


/* ===============================
   PROMO ROTATION (OPTIONAL)
================================ */
const promoFiles = [
  "promo1.jpg",
  "promo2.jpg",
  "promo3.jpg",
  "promo4.jpg"
];

async function fileExists(path) {
  try {
    const res = await fetch(path, { method: "HEAD", cache: "no-store" });
    return res.ok;
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

  // If only one promo exists
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
