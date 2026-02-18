const statusText = {
  green: "Free now",
  yellow: "Free within 1 hour",
  red: "Busy or not connected",
};

const socket = io();
const map = L.map("map").setView([43.238949, 76.889709], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

let activeAccountId = null;
const markers = [];

function switchTab(target) {
  const isClient = target === "client";
  document.getElementById("tabClient").classList.toggle("active", isClient);
  document.getElementById("tabBusiness").classList.toggle("active", !isClient);
  document.getElementById("clientScreen").classList.toggle("active", isClient);
  document.getElementById("businessScreen").classList.toggle("active", !isClient);
}

async function fetchClientMap() {
  const category = document.getElementById("categoryFilter").value;
  const freeNow = document.getElementById("freeNowFilter").checked;
  const params = new URLSearchParams({
    lat: "43.238949",
    lng: "76.889709",
    radiusKm: "5",
  });
  if (category) params.set("category", category);
  if (freeNow) params.set("freeNow", "true");

  const res = await fetch(`/api/client/map?${params.toString()}`);
  const data = await res.json();
  renderClientList(data.items || []);
  renderMarkers(data.items || []);
}

function renderMarkers(items) {
  while (markers.length) {
    map.removeLayer(markers.pop());
  }

  items.forEach((item) => {
    const color = item.tutfree?.statusColor || "red";
    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 9,
      color,
      fillColor: color,
      fillOpacity: 0.9,
    }).addTo(map);
    marker.bindPopup(`<b>${item.name}</b><br>${item.address}<br>${statusText[color]}`);
    markers.push(marker);
  });
}

function renderClientList(items) {
  const list = document.getElementById("list");
  if (!items.length) {
    list.innerHTML = "<p>No matching venues.</p>";
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const color = item.tutfree?.statusColor || "red";
      const reviews = item.reviewsCount || 0;
      return `
        <article class="venue">
          <h3>${item.name}</h3>
          <p>${item.address}</p>
          <p>Rating: ${item.rating} (${reviews} reviews)</p>
          <p class="status ${color}">${statusText[color]}</p>
          <button onclick="openBooking('${item.id}')">Instant booking</button>
        </article>
      `;
    })
    .join("");
}

async function openBooking(venueId) {
  document.getElementById("venueId").value = venueId;
  document.getElementById("bookingDialog").showModal();
}

window.openBooking = openBooking;

document.getElementById("bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    venueId: document.getElementById("venueId").value,
    clientName: document.getElementById("clientName").value,
    clientPhone: document.getElementById("clientPhone").value,
  };

  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Booking failed");
    return;
  }

  alert(`Booking ID: ${data.booking.id}`);
  document.getElementById("bookingDialog").close();
  event.target.reset();
});

async function createBusinessAccount() {
  const payload = {
    ownerName: document.getElementById("ownerName").value,
    phone: document.getElementById("ownerPhone").value,
  };
  const res = await fetch("/api/business/auth/mock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Create account failed");
    return;
  }
  activeAccountId = data.account.id;
  alert(`Business account created: ${activeAccountId}`);
}

async function search2gis() {
  const q = document.getElementById("search2gis").value.trim();
  const res = await fetch(`/api/business/search-2gis?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  const root = document.getElementById("searchResults");

  root.innerHTML = (data.items || [])
    .slice(0, 10)
    .map(
      (v) => `
      <div class="result-row">
        <code>${v.id}</code> ${v.name}
        <button onclick="claimVenue('${v.id}')">Claim</button>
      </div>
    `
    )
    .join("");
}

async function claimVenue(twoGisId) {
  if (!activeAccountId) {
    alert("Create business account first");
    return;
  }
  const res = await fetch("/api/business/claim-point", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: activeAccountId, twoGisId }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Claim failed");
    return;
  }
  document.getElementById("businessVenueId").value = twoGisId;
  socket.emit("business:subscribe", { venueId: twoGisId });
  alert(`Claim verified: ${twoGisId}`);
}

window.claimVenue = claimVenue;

async function setLiveStatus() {
  const twoGisId = document.getElementById("businessVenueId").value.trim();
  const mode = document.getElementById("statusMode").value;
  const nextAvailableInMinutes = Number(document.getElementById("nextMinutes").value || 30);

  if (!twoGisId) {
    alert("Set venue ID first");
    return;
  }

  const res = await fetch(`/api/business/${encodeURIComponent(twoGisId)}/live-status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      nextAvailableInMinutes,
      actorAccountId: activeAccountId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Status update failed");
    return;
  }
  document.getElementById("statusResult").textContent = `Updated: ${data.status.mode}`;
}

async function loadBookings() {
  const venueId = document.getElementById("businessVenueId").value.trim();
  if (!venueId) {
    alert("Set venue ID first");
    return;
  }

  const res = await fetch(`/api/business/${encodeURIComponent(venueId)}/bookings`);
  const data = await res.json();
  renderBookingQueue(data.items || []);
}

function renderBookingQueue(items) {
  const queue = document.getElementById("bookingQueue");
  if (!items.length) {
    queue.innerHTML = "<p>No bookings yet.</p>";
    return;
  }

  queue.innerHTML = items
    .map(
      (item) => `
      <article class="booking-card">
        <p><b>${item.clientName}</b> (${item.clientPhone})</p>
        <p>Status: ${item.status}</p>
        <div class="actions">
          <button onclick="decideBooking('${item.id}','confirm')">Confirm</button>
          <button class="danger" onclick="decideBooking('${item.id}','reject')">Reject</button>
        </div>
      </article>
    `
    )
    .join("");
}

async function decideBooking(bookingId, decision) {
  const res = await fetch(`/api/business/bookings/${bookingId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Decision failed");
    return;
  }
  await loadBookings();
}

window.decideBooking = decideBooking;

socket.on("live_status_updated", fetchClientMap);
socket.on("booking_created", async () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  oscillator.connect(audioContext.destination);
  oscillator.frequency.value = 920;
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
  await loadBookings();
});

document.getElementById("tabClient").addEventListener("click", () => switchTab("client"));
document.getElementById("tabBusiness").addEventListener("click", () => switchTab("business"));
document.getElementById("refreshClient").addEventListener("click", fetchClientMap);
document.getElementById("categoryFilter").addEventListener("change", fetchClientMap);
document.getElementById("freeNowFilter").addEventListener("change", fetchClientMap);
document.getElementById("createAccountBtn").addEventListener("click", createBusinessAccount);
document.getElementById("searchBtn").addEventListener("click", search2gis);
document.getElementById("setStatusBtn").addEventListener("click", setLiveStatus);
document.getElementById("loadBookingsBtn").addEventListener("click", loadBookings);

fetchClientMap();
