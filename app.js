// ---------- CLOCK + DATE ----------
function setClockAndDate() {
  const now = new Date();

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.textContent = `${hh}:${mm}`;

  const dateFmt = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const dateEl = document.getElementById("dateText");
  if (dateEl) dateEl.textContent = dateFmt.toUpperCase();
}
setClockAndDate();
setInterval(setClockAndDate, 10_000);

// ---------- 7-DAY FORECAST (SCROLLING TICKER) ----------
async function load7DayForecast() {
  // Ohsweken approx
  const lat = 42.93;
  const lon = -80.12;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=America%2FToronto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Weather fetch failed");

  const data = await res.json();

  const days = data?.daily?.time ?? [];
  const tmax = data?.daily?.temperature_2m_max ?? [];
  const tmin = data?.daily?.temperature_2m_min ?? [];
  const pop = data?.daily?.precipitation_probability_max ?? [];

  const parts = [];
  for (let i = 0; i < Math.min(7, days.length); i++) {
    const d = new Date(days[i] + "T00:00:00");
    const label = d.toLocaleDateString("en-CA", { weekday: "short" }).toUpperCase();

    const hi = Number.isFinite(tmax[i]) ? Math.round(tmax[i]) : "—";
    const lo = Number.isFinite(tmin[i]) ? Math.round(tmin[i]) : "—";
    const p = Number.isFinite(pop[i]) ? `${Math.round(pop[i])}%` : "—";

    // Example: WED 3°/-4° POP 20%
    parts.push(`${label} ${hi}°/${lo}° POP ${p}`);
  }

  const line = parts.length ? parts.join("   •   ") : "Forecast unavailable";

  // Duplicate text for seamless loop
  const track = document.getElementById("forecastTrack");
  if (track) track.textContent = `${line}   •   ${line}`;
}

load7DayForecast().catch(() => {
  const track = document.getElementById("forecastTrack");
  if (track) track.textContent = "Forecast unavailable   •   Forecast unavailable   •   Forecast unavailable";
});

// Refresh the forecast every 30 minutes (keeps ticker current without reloading page)
setInterval(() => {
  load7DayForecast().catch(() => {});
}, 30 * 60 * 1000);

// ---------- OPTIONAL: PROMO ROTATION (IF YOU ADD MORE PROMO FILES) ----------
// Put any promo files you upload into this list:
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

  // Keep only promos that actually exist in your repo
  const available = [];
  for (const f of promoFiles) {
    if (await fileExists(f)) available.push(f);
  }

  // If you only have one promo, just show it in both slots
  if (available.length === 0) return;
  if (available.length === 1) {
    top.src = available[0];
    bottom.src = available[0];
    return;
  }

  // Initialize with first two
  let i = 0;
  top.src = available[i++ % available.length];
  bottom.src = available[i++ % available.length];

  // Rotate every 12 seconds
  setInterval(() => {
    top.src = available[i++ % available.length];
    bottom.src = available[i++ % available.length];
  }, 12_000);
})();
