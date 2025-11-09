// 🌍 Detect user's location at startup and show weather
window.addEventListener("load", () => {
  if (!navigator.geolocation) {
    document.getElementById("response").innerHTML = `<p class="text-red-300">Geolocation not supported.</p>`;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;

      // Initialize and show map
      initWeatherMap(latitude, longitude, null, true);
      document.getElementById("weather-map-container").style.display = "block";

      try {
        const res = await fetch(`/api/weather/current?q=${latitude},${longitude}`);
        if (!res.ok) throw new Error("Weather data unavailable");
        const data = await res.json();
        const c = data.current;

        document.getElementById("response").innerHTML = `
          <div class="space-y-3 weather-details">
            <h2 class="text-2xl font-bold text-cyan-300">${data.location.name}</h2>
            <p class="text-4xl font-bold">${c.temp_c}°C</p>
            <p class="flex items-center gap-2 text-xl"><span>${getWeatherIcon(c.condition.text)}</span> ${c.condition.text}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">AQI</p>
                <p class="font-bold" id="aqi-value">Loading...</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Wind</p>
                <p class="font-bold">${c.wind_kph} kph</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Humidity</p>
                <p class="font-bold">${c.humidity}%</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Feels Like</p>
                <p class="font-bold">${c.feelslike_c}°C</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Pressure</p>
                <p class="font-bold">${c.pressure_mb} mb</p>
              </div>
            </div>
          </div>
        `;

        const aqi = await getAQI(latitude, longitude);
        document.getElementById("aqi-value").textContent = aqi;

        document.querySelectorAll(".weather-details").forEach(el => el.classList.add("visible"));
        renderTemperatureGraph(latitude, longitude);
        loadAstronomy(latitude, longitude);
      } catch (err) {
        document.getElementById("response").innerHTML = `<p class="text-red-300">Unable to fetch weather for your location.</p>`;
        console.error("Weather fetch error:", err);
      }
    },
    () => {
      document.getElementById("response").innerHTML = `<p class="text-red-300">Geolocation denied. Unable to show map.</p>`;
      console.warn("Geolocation blocked by user.");
    }
  );
});

let map, marker;

// ✉️ Initialize Weather Map
function initWeatherMap(lat, lon, temp, center) {
  console.log("Initializing map at:", lat, lon); // Debug
  if (!map) {
    map = L.map("weather-map").setView([lat, lon], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
// Function to map WMO weather codes to Google emojis
function getWeatherEmojiFromCode(code) {
  if (code === 0) return "☀️"; // Clear sky
  if (code === 1 || code === 2 || code === 3) return "⛅"; // Partly cloudy
  if (code >= 45 && code <= 48) return "🌫️"; // Fog
  if (code >= 51 && code <= 55) return "🌦️"; // Drizzle
  if (code >= 61 && code <= 65) return "🌧️"; // Rain
  if (code >= 71 && code <= 75) return "❄️"; // Snow
  if (code >= 80 && code <= 85) return "🌧️"; // Showers
  if (code >= 95 && code <= 99) return "⛈️"; // Thunderstorm
  return "☁️"; // Default
}

// Function to update the 7-day forecast using Open-Meteo based on clicked location
async function updateSevenDayForecast(lat = 51.505, lon = -0.09) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    // Update the forecast scroll area
    const forecastScroll = document.getElementById("forecast-scroll");
    forecastScroll.innerHTML = ""; // Clear existing cards

    for (let i = 0; i < 7; i++) {
      const day = data.daily.time[i];
      const dayName = new Date(day).toLocaleDateString("en-US", { weekday: "long" });
      const high = data.daily.temperature_2m_max[i];
      const low = data.daily.temperature_2m_min[i];
      const code = data.daily.weathercode[i];
      const emoji = getWeatherEmojiFromCode(code);

      const card = document.createElement("div");
      card.className = "forecast-card glass";
      card.innerHTML = `
        <div class="weather-icon">${emoji}</div>
        <div>${dayName}</div>
        <div class="temp-high">${high.toFixed(1)}°C</div>
        <div class="temp-low">${low.toFixed(1)}°C</div>
      `;
      forecastScroll.appendChild(card);
    }
  } catch (error) {
    console.error("Error fetching 7-day forecast from Open-Meteo:", error);
    document.getElementById("forecast-scroll").innerHTML = "<p>Failed to load 7-day forecast...</p>";
  }
}


// Handle map click to update forecast
map.on('click', function(e) {
  const { lat, lng } = e.latlng;
  map.setView([lat, lng], 13); // Center map on clicked location
  updateSevenDayForecast(lat, lng); // Update forecast for clicked location
});

// Handle initial load with default location
updateSevenDayForecast(); // Load default forecast on page load

// Handle recenter functionality (fallback to geolocation)
document.getElementById("recenter-btn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        updateSevenDayForecast(latitude, longitude);
      },
      error => console.error("Recenter geolocation error:", error.message)
    );
  } else {
    console.log("Geolocation not supported for recenter.");
  }
});

// Add fullscreen toggle functionality
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  const mapContainer = document.getElementById("weather-map-container");
  if (!document.fullscreenElement) {
    mapContainer.requestFullscreen().catch(err => {
      console.error("Fullscreen request failed:", err.message);
    });
  } else {
    document.exitFullscreen().catch(err => {
      console.error("Exit fullscreen failed:", err.message);
    });
  }
});
// Add recenter functionality
document.getElementById("recenter-btn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        updateSevenDayForecast(latitude, longitude);
      },
      error => console.error("Recenter geolocation error:", error.message)
    );
  } else {
    console.log("Geolocation not supported for recenter.");
  }
});

// Add recenter functionality
document.getElementById("recenter-btn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        updateSevenDayForecast(latitude, longitude);
      },
      error => console.error("Recenter geolocation error:", error.message)
    );
  } else {
    console.log("Geolocation not supported for recenter.");
  }
});
    // Add click event to place new marker and update panel
    map.on("click", async (e) => {
      if (marker) map.removeLayer(marker); // Remove old marker
      const { lat: newLat, lng: newLon } = e.latlng;

      try {
        const weatherRes = await fetch(`/api/weather/current?q=${newLat},${newLon}`);
        if (!weatherRes.ok) throw new Error("Weather data unavailable");
        const weatherData = await weatherRes.json();
        const c = weatherData.current;
        const locationName = weatherData.location.name;

        const aqi = await getAQI(newLat, newLon);

        // Create new marker with click event for recentering
        marker = L.marker([newLat, newLon])
          .addTo(map)
          .bindPopup(`<b>${c.temp_c}°C<br>AQI: ${aqi}</b>`)
          .on("click", (e) => {
            const markerLatLng = marker.getLatLng();
            map.setView([markerLatLng.lat, markerLatLng.lng], 11, { animate: true });
            console.log("Map recentered to marker at:", markerLatLng.lat, markerLatLng.lng);
          })
          .openPopup();
        console.log("Marker click event attached at:", newLat, newLon);

        // Update response panel with new location data
        document.getElementById("response").innerHTML = `
          <div class="space-y-3 weather-details">
            <h2 class="text-2xl font-bold text-cyan-300">${locationName}</h2>
            <p class="text-4xl font-bold">${c.temp_c}°C</p>
            <p class="flex items-center gap-2 text-xl"><span>${getWeatherIcon(c.condition.text)}</span> ${c.condition.text}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">AQI</p>
                <p class="font-bold" id="aqi-value">${aqi}</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Wind</p>
                <p class="font-bold">${c.wind_kph} kph</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Humidity</p>
                <p class="font-bold">${c.humidity}%</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Feels Like</p>
                <p class="font-bold">${c.feelslike_c}°C</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-cyan-300">Pressure</p>
                <p class="font-bold">${c.pressure_mb} mb</p>
              </div>
            </div>
          </div>
        `;

        document.querySelectorAll(".weather-details").forEach(el => el.classList.add("visible"));
        renderTemperatureGraph(newLat, newLon);
        console.log("Panel updated for:", locationName, "at", newLat, newLon);
      } catch (err) {
        marker = L.marker([newLat, newLon])
          .addTo(map)
          .bindPopup("<b>Weather data unavailable</b>")
          .on("click", (e) => {
            const markerLatLng = marker.getLatLng();
            map.setView([markerLatLng.lat, markerLatLng.lng], 11, { animate: true });
            console.log("Map recentered to marker at:", markerLatLng.lat, markerLatLng.lng);
          })
          .openPopup();
        console.log("Marker click event attached at:", newLat, newLon);
        document.getElementById("response").innerHTML = `<p class="text-red-300">Unable to fetch weather for clicked location.</p>`;
        console.error("Failed to fetch weather for clicked location:", err);
      }
    });
  } else if (center) {
    map.setView([lat, lon], 11, { animate: true });
  }
  if (marker) map.removeLayer(marker); // Remove old marker before adding new
  // Create initial marker with click event for recentering
  marker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(`<b>${temp ? temp + "°C" : "Your Location"}</b>`)
    .on("click", (e) => {
      const markerLatLng = marker.getLatLng();
      map.setView([markerLatLng.lat, markerLatLng.lng], 11, { animate: true });
      console.log("Map recentered to marker at:", markerLatLng.lat, markerLatLng.lng);
    })
    .openPopup();
  console.log("Initial marker click event attached at:", lat, lon);
}

// ✅ FULLSCREEN BUTTON  
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  const container = document.getElementById("weather-map-container");
  if (!document.fullscreenElement) {
    container.requestFullscreen();
    document.getElementById("fullscreen-btn").textContent = "🗕 Exit";
  } else {
    document.exitFullscreen();
    document.getElementById("fullscreen-btn").textContent = "⛶ Expand";
  }
});

// ✅ RECENTER BUTTON
document.getElementById("recenter-btn").addEventListener("click", async () => {
  if (!navigator.geolocation) return alert("Geolocation not supported.");

  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 11, { animate: true });
    if (marker) map.removeLayer(marker); // Remove old marker

    const res = await fetch(`/api/weather/current?q=${latitude},${longitude}`);
    if (!res.ok) throw new Error("Weather data unavailable");
    const data = await res.json();
    const c = data.current;

    const aqi = await getAQI(latitude, longitude);

    marker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`<b>Your Location<br>${c.temp_c}°C<br>AQI: ${aqi}</b>`)
      .on("click", (e) => {
        const markerLatLng = marker.getLatLng();
        map.setView([markerLatLng.lat, markerLatLng.lng], 11, { animate: true });
        console.log("Map recentered to marker at:", markerLatLng.lat, markerLatLng.lng);
      })
      .openPopup();

    document.getElementById("response").innerHTML = `
      <div class="space-y-3 weather-details">
        <h2 class="text-2xl font-bold text-cyan-300">${data.location.name}</h2>
        <p class="text-4xl font-bold">${c.temp_c}°C</p>
        <p class="flex items-center gap-2 text-xl"><span>${getWeatherIcon(c.condition.text)}</span> ${c.condition.text}</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div class="bg-white/10 rounded-lg p-3 text-center">
            <p class="text-cyan-300">AQI</p>
            <p class="font-bold" id="aqi-value">${aqi}</p>
          </div>
          <div class="bg-white/10 rounded-lg p-3 text-center">
            <p class="text-cyan-300">Wind</p>
            <p class="font-bold">${c.wind_kph} kph</p>
          </div>
          <div class="bg-white/10 rounded-lg p-3 text-center">
            <p class="text-cyan-300">Humidity</p>
            <p class="font-bold">${c.humidity}%</p>
          </div>
          <div class="bg-white/10 rounded-lg p-3 text-center">
            <p class="text-cyan-300">Feels Like</p>
            <p class="font-bold">${c.feelslike_c}°C</p>
          </div>
          <div class="bg-white/10 rounded-lg p-3 text-center">
            <p class="text-cyan-300">Pressure</p>
            <p class="font-bold">${c.pressure_mb} mb</p>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll(".weather-details").forEach(el => el.classList.add("visible"));
    renderTemperatureGraph(latitude, longitude);
    loadAstronomy(latitude, longitude);
    console.log("Panel updated for user's current location:", data.location.name);
    renderTemperatureGraph(latitude, longitude);
    loadAstronomy(latitude, longitude);
  } catch (err) {
    if (err.message.includes("denied")) {
      document.getElementById("response").innerHTML = `<p class="text-red-300">Geolocation denied. Unable to update.</p>`;
    } else {
      document.getElementById("response").innerHTML = `<p class="text-red-300">Unable to fetch weather for your location.</p>`;
    }
    console.error("Recenter error:", err);
    if (marker) map.removeLayer(marker); // Clean up marker on failure
  }
});
async function identifyUserWithChatbase() {
  try {
    const res = await fetch("/api/chatbase/token");
    const data = await res.json();

    if (!data.token) {
      console.warn("No Chatbase token returned");
      return;
    }

    window.chatbase('identify', { token: data.token });
    console.log("✅ Chatbase user identified");
  } catch (err) {
    console.error("Chatbase identify error:", err);
  }
}
async function getAQI(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&us_aqi=true`;
    const res = await fetch(url);
    const data = await res.json();

    const aqi = data?.us_aqi?.[0] || 0;
    return aqi;

  } catch (err) {
    console.error("AQI error:", err);
    return 0;
  }
}

// ✅ Fetch Astronomy Data (Sun + Moon)
async function loadAstronomy(lat, lon) {
  try {
    const res = await fetch(`/api/weather/astronomy?q=${lat},${lon}`);
    const data = await res.json();

    const astro = data.astronomy.astro;
// ✅ Get current weather for visibility + pressure
const currentRes = await fetch(`/api/weather/current?q=${lat},${lon}`);
const currentData = await currentRes.json();

const current = currentData.current;
// ✅ Humidity
document.getElementById("humidity-val").textContent = current.humidity + "%";
document.getElementById("dew-val").textContent = current.dewpoint_c + "° Dew point";

document.getElementById("humidity-desc").textContent =
  current.humidity < 40 ? "Low humidity." :
  current.humidity < 70 ? "Normal humidity." :
  "High humidity.";
// ✅ UV Index
document.getElementById("uv-val").textContent = current.uv;

document.getElementById("uv-desc").textContent =
  current.uv < 3 ? "Low UV exposure." :
  current.uv < 6 ? "Moderate UV exposure." :
  current.uv < 8 ? "High UV exposure." :
  current.uv < 11 ? "Very high UV exposure." :
  "Extreme UV exposure.";

drawGaugeArc("uvArc", current.uv, 11);
// ✅ AQI
// ✅ AQI from Open-Meteo
const aqi = await getAQI(lat, lon);

document.getElementById("aqi-val").textContent = aqi;

document.getElementById("aqi-desc").textContent =
  aqi <= 50 ? "Good air quality" :
  aqi <= 100 ? "Moderate" :
  aqi <= 150 ? "Unhealthy for sensitive groups" :
  aqi <= 200 ? "Unhealthy" :
  aqi <= 300 ? "Very unhealthy" :
  "Hazardous";

drawGaugeArc("aqiArc", aqi, 300);   // Max 300 on US AQI scale
// ✅ Visibility
document.getElementById("vis-km").textContent = current.vis_km + " km";
document.getElementById("vis-desc").textContent =
  current.vis_km >= 10
    ? "Excellent visibility."
    : current.vis_km >= 5
    ? "Good visibility."
    : "Low visibility.";

// ✅ Pressure
document.getElementById("pressure-val").textContent = current.pressure_mb;
document.getElementById("pressure-desc").textContent =
  current.pressure_trend === 1
    ? "Rising"
    : current.pressure_trend === -1
    ? "Falling"
    : "Steady";

    // ✅ SUN
    document.getElementById("sunrise-time").textContent = astro.sunrise;
    document.getElementById("sunset-time").textContent = astro.sunset;
    document.getElementById("sun-duration").textContent =
      calcDuration(astro.sunrise, astro.sunset);

    // ✅ MOON
    document.getElementById("moonrise-time").textContent = astro.moonrise;
    document.getElementById("moonset-time").textContent = astro.moonset;
    document.getElementById("moon-duration").textContent =
      calcDuration(astro.moonrise, astro.moonset);

    // ✅ Moon phase
    document.getElementById("moon-phase-text").textContent = astro.moon_phase;
    document.getElementById("moon-next-full").textContent = astro.moon_phase === "Full Moon"
      ? "Today"
      : data.forecast?.forecastday?.[0]?.astro?.next_full_moon || "Unknown";

    drawSunArc("sunArc");
    drawMoonArc("moonArc");
    document.getElementById("moon-phase-text").textContent = astro.moon_phase;
document.getElementById("moon-phase-icon").src = getMoonPhaseIcon(astro.moon_phase);

// ✅ approximate next full moon
document.getElementById("moon-next-full").textContent = astro.moon_phase.includes("Full") 
  ? "Today"
  : predictNextFullMoon();
function predictNextFullMoon() {
  // the lunar cycle is ~29.53 days
  const now = new Date();
  const next = new Date(now.getTime() + 29.53 * 24 * 60 * 60 * 1000);
  return next.toDateString();
}


  } catch (err) {
    console.error("Astronomy error:", err);
  }
}

function calcDuration(start, end) {
  if (!start || !end) return "—";

  let s = new Date(`2025-01-01 ${start}`);
  let e = new Date(`2025-01-01 ${end}`);

  // ✅ If moonset is past midnight (next day)
  if (e < s) {
    e = new Date(`2025-01-02 ${end}`);
  }

  const diff = (e - s) / 1000 / 60;
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);

  return `${h} hrs ${m} mins`;
}

// ✅ Sun arc visual
function drawSunArc(id) {
  const ctx = document.getElementById(id).getContext("2d");
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 6;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#FFA500");
  grad.addColorStop(1, "#6B1AFF");

  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(w/2, h, w/2 - 10, Math.PI, 0);
  ctx.stroke();
}

// ✅ Moon arc visual
function drawMoonArc(id) {
  const ctx = document.getElementById(id).getContext("2d");
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 6;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#FFD27F");
  grad.addColorStop(1, "#5F4B8B");

  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(w/2, h, w/2 - 10, Math.PI, 0);
  ctx.stroke();
}
function drawGaugeArc(id, value, max) {
  const ctx = document.getElementById(id).getContext("2d");
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const start = Math.PI;
  const end = Math.PI + (Math.PI * value / max);

  // gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#4ade80");
  grad.addColorStop(0.5, "#facc15");
  grad.addColorStop(1, "#ef4444");

  ctx.lineWidth = 10;
  ctx.strokeStyle = grad;

  ctx.beginPath();
  ctx.arc(w/2, h, w/2 - 15, start, end);
  ctx.stroke();
}

function getMoonPhaseIcon(phase) {
  phase = phase.toLowerCase();

  if (phase.includes("new")) return "images/moon/new.png";
  if (phase.includes("waning crescent")) return "images/moon/waning_crescent.png";
  if (phase.includes("third quarter")) return "images/moon/third_quarter.png";
  if (phase.includes("waning gibbous")) return "images/moon/waning_gibbous.png";
  if (phase.includes("full")) return "images/moon/full.png";
  if (phase.includes("waxing gibbous")) return "images/moon/waxing_gibbous.png";
  if (phase.includes("first quarter")) return "images/moon/first_quarter.png";
  if (phase.includes("waxing crescent")) return "images/moon/waxing_crescent.png";

  return "images/moon/default.png";
}
async function renderTemperatureGraph(lat, lon) {
  try {
    const res = await fetch(`/api/weather/forecast?q=${lat},${lon}`);
    const data = await res.json();

    const hours = data.forecast.forecastday[0].hour;

    const labels = [];
    const temps = [];

    for (let i = 0; i < 24; i += 2) {
      const h = hours[i];
      labels.push(h.time.substring(11, 16));
      temps.push(h.temp_c);
    }

    if (window.tempChartInstance) {
      window.tempChartInstance.destroy();
    }

    const ctx = document.getElementById("tempChart").getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(255, 200, 0, 0.35)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    window.tempChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: temps,
          borderColor: "#ffcc33",
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0
        }]
      },
      options: {
  responsive: true,

  // ✅ Makes the chart wider and more spread out
  aspectRatio: 3.2, 

  layout: {
    padding: {
      left: 40,
      right: 40,
      top: 10,
      bottom: 10
    }
  },

  plugins: {
    legend: { display: false },
  },

  scales: {
    x: {
      ticks: {
        color: "#fff",
        maxRotation: 0,
        minRotation: 0,
        autoSkip: false,   // ✅ Show all labels
        padding: 15        // ✅ Adds spacing
      },
      grid: { display: false }
    },

    y: {
      ticks: {
        color: "#fff",
        padding: 10        // ✅ Extra vertical breathing room
      },
      grid: { color: "rgba(255,255,255,0.1)" }
    }
  },

  elements: {
    line: {
      tension: 0.35
    },
    point: {
      radius: 2,
      hitRadius: 12
    }
  }
}

    });
  } catch (err) {
    console.error("Temp graph error:", err);
  }
}

// ✅ HELPERS
function setLoading(loading) {
  // No-op since no input exists
}

function showError(msg) {
  document.getElementById("response").innerHTML = `<div class="text-red-300 p-4">${msg}</div>`;
}

async function fetchWeatherCard(url, render) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather data unavailable");
  const data = await res.json();
  return render(data);
}

async function getAQI(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi`;
    const res = await fetch(url);
    const data = await res.json();
    return data.hourly?.us_aqi?.[0] ?? "N/A";
  } catch {
    return "N/A";
  }
}

function getMoonEmoji(phase) {
  if (phase < 0.03) return "🌑";
  if (phase < 0.22) return "🌒";
  if (phase < 0.28) return "🌓";
  if (phase < 0.47) return "🌔";
  if (phase < 0.53) return "🌕";
  if (phase < 0.72) return "🌖";
  if (phase < 0.78) return "🌗";
  return "🌘";
}

function getWeatherIcon(condition) {
  const map = {
    sun: "☀️",
    clear: "☀️",
    cloud: "☁️",
    rain: "🌧️",
    snow: "❄️",
    thunder: "⚡",
    mist: "🌫️",
    fog: "🌫️"
  };
  const key = Object.keys(map).find(k => condition.toLowerCase().includes(k));
  return map[key] || "🌤️";
}
// ✅ Identify user in Chatbase when page loads
identifyUserWithChatbase();
loadAstronomy(latitude, longitude);
