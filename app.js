/* =========================================================
   CLOCK + DATE (RIGHT SIDE STACK)
   Location is static in HTML
========================================================= */
function updateClockAndDate() {
  const now = new Date();

  // Time (24h)
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.textContent = `${hh}:${mm}`;

  // Date (numeric YYYY-MM-DD)
  const dateEl = document.getElementById("dateText");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-CA");
  }
}
updateClockAndDate();
setInterval(updateClockAndDate, 10_000);


/* =========================================================
   7-DAY WEATHER FORECAST (SCROLLING TICKER)
   Open-Meteo (no API key)
========================================================= */
async function load7DayForecast() {
  const track = document.getElementById("forecastTrack");
  if (!track) return;

  // Immediate feedback (confirms JS is running)
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
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const days  = data?.daily?.time ?? [];
    const highs = data?.daily?.temperature_2m_max ?? [];
    const lows  = data?.daily?.temperature_2m_min ?? [];
    const rain  = data?.daily?.precipitation_sum ?? [];

    if (!days.length) throw new Error("No forecast data");

    // Decide emoji by temp + precipitation
    function iconFor(i) {
      const hi = highs[i] ?? 0;
      const mm = rain[i] ?? 0;

      if (hi <= 0 && mm > 0) return "❄️";
      if (mm >= 5) return "🌧️";
      if (mm > 0) return "🌦️";
      return "☀️";
    }

    const parts = [];
    for (let i = 0; i < Math.min(7, days.length); i++) {
      const d = new Date(days[i] + "T00:00:00");

      const dow = d
        .toLocaleDateString("en-CA", { weekday: "short" })
        .toUpperCase();

      const md = d.toLocaleDateString("en-CA", {
        month: "2-digit",
        day: "2-digit",
      });

      const hi = Math.round(highs[i]);
      const lo = Math.round(lows[i]);

      parts.push(`${dow} ${md} ${iconFor(i)} ${hi}°/${lo}°`);
    }

    const line = parts.join("   •   ");

    // Duplicate content for seamless scroll loop
    track.textContent = `${line}   •   ${line}`;

  } catch (err) {
    console.error("Weather error:", err);
    track.textContent =
      "WEATHER UNAVAILABLE   •   WEATHER UNAVAILABLE   •   WEATHER UNAVAILABLE";
  }
}

// Initial load
load7DayForecast();

// Refresh forecast every 30 minutes
setInterval(load7DayForecast, 30 * 60 * 1000);


/* =========================================================
   PROMO ROTATION (OPTIONAL)
   Uses only files that actually exist
========================================================= */
const promoFiles = [
  "promo1.jpg",
  "promo2.jpg",
  "promo3.jpg",
  "promo4.jpg"
];

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

  // Single promo fallback
  if (available.length === 1) {
    top.src = available[0];
    bottom.src = available[0];
    return;
  }

  let index = 0;
  top.src = available[index++ % available.length];
  bottom.src = available[index++ % available.length];

  // Rotate every 12 seconds
  setInterval(() => {
    top.src = available[index++ % available.length];
    bottom.src = available[index++ % available.length];
  }, 12_000);
})();
