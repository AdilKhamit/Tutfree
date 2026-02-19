const API_BASE = window.location.origin;
// If backend requires JWT:
// const AUTH_TOKEN = "...";
let companyId = null;
let occupiedSlots = new Set();

const errorBanner = document.getElementById("errorBanner");
const successBanner = document.getElementById("successBanner");
const servicesList = document.getElementById("servicesList");
const companyForm = document.getElementById("companyForm");
const scheduleCard = document.getElementById("scheduleCard");
const slotsGrid = document.getElementById("slotsGrid");

function requestHeaders() {
  const headers = { "Content-Type": "application/json" };
  // if (AUTH_TOKEN) headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  return headers;
}

function showError(message) {
  successBanner.classList.add("hidden");
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function showSuccess(message) {
  errorBanner.classList.add("hidden");
  successBanner.textContent = message;
  successBanner.classList.remove("hidden");
}

function clearBanners() {
  errorBanner.classList.add("hidden");
  successBanner.classList.add("hidden");
}

function addServiceRow(name = "", price = "") {
  const row = document.createElement("div");
  row.className = "service-row";
  row.innerHTML = `
    <input class="service-name" placeholder="Название услуги" value="${name}" />
    <input class="service-price" type="number" min="0" step="100" placeholder="Цена" value="${price}" />
    <button type="button" class="remove">x</button>
  `;
  row.querySelector(".remove").addEventListener("click", () => row.remove());
  servicesList.appendChild(row);
}

function readServices() {
  return Array.from(servicesList.querySelectorAll(".service-row"))
    .map((row) => ({
      name: row.querySelector(".service-name").value.trim(),
      price: Number(row.querySelector(".service-price").value || 0),
    }))
    .filter((item) => item.name.length > 0);
}

function generateSlots(start, end, intervalMinutes) {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || startMinutes >= endMinutes) {
    return [];
  }

  const slots = [];
  for (let cursor = startMinutes; cursor < endMinutes; cursor += intervalMinutes) {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

function renderSlots() {
  slotsGrid.innerHTML = "";
  const workStart = document.getElementById("workStart").value;
  const workEnd = document.getElementById("workEnd").value;
  const interval = Number(document.getElementById("slotDuration").value);
  const slots = generateSlots(workStart, workEnd, interval);

  if (slots.length === 0) {
    slotsGrid.innerHTML = "<p>Проверьте время работы и длительность слота.</p>";
    return;
  }

  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `slot ${occupiedSlots.has(slot) ? "occupied" : ""}`;
    button.textContent = slot;
    button.addEventListener("click", () => {
      if (occupiedSlots.has(slot)) {
        occupiedSlots.delete(slot);
      } else {
        occupiedSlots.add(slot);
      }
      renderSlots();
    });
    slotsGrid.appendChild(button);
  });
}

async function publishCompany(event) {
  event.preventDefault();
  clearBanners();

  const payload = {
    name: document.getElementById("name").value.trim(),
    category: document.getElementById("category").value,
    address: document.getElementById("address").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    work_start: document.getElementById("workStart").value,
    work_end: document.getElementById("workEnd").value,
    slot_duration_minutes: Number(document.getElementById("slotDuration").value),
    services: readServices(),
  };

  if (!payload.name || !payload.address || !payload.phone) {
    showError("Заполните обязательные поля: название, адрес, телефон.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/companies`, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(data.detail || data.error || "Ошибка при публикации компании.");
      return;
    }

    companyId = data.id;
    scheduleCard.classList.remove("hidden");
    renderSlots();
    showSuccess(`Компания создана. ID: ${companyId}`);
  } catch (error) {
    showError(`Сервер недоступен: ${error.message}`);
  }
}

function openDashboard(companyIdValue) {
  const url = `${API_BASE}/company/dashboard?companyId=${encodeURIComponent(companyIdValue)}`;
  const popup = window.open(url, "_blank");
  if (!popup) {
    window.location.href = url;
  }
}

async function saveScheduleAndPublish() {
  clearBanners();
  if (!companyId) {
    showError("Сначала нажмите «Опубликовать», чтобы получить ID компании.");
    return;
  }

  const payload = {
    occupiedSlots: Array.from(occupiedSlots).sort(),
  };

  try {
    const response = await fetch(`${API_BASE}/companies/${companyId}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(data.detail || data.error || "Ошибка при сохранении графика.");
      return;
    }

    showSuccess("Сохранено. Открываем панель управления записями...");
    setTimeout(() => openDashboard(companyId), 300);
  } catch (error) {
    showError(`Ошибка сети: ${error.message}`);
  }
}

document.getElementById("addServiceBtn").addEventListener("click", () => addServiceRow());
document.getElementById("saveScheduleBtn").addEventListener("click", saveScheduleAndPublish);
companyForm.addEventListener("submit", publishCompany);

document.getElementById("workStart").addEventListener("change", renderSlots);
document.getElementById("workEnd").addEventListener("change", renderSlots);
document.getElementById("slotDuration").addEventListener("change", renderSlots);

addServiceRow("Замена масла", "8000");
