const params = new URLSearchParams(window.location.search);
const companyId = params.get("companyId");

document.getElementById("companyIdLabel").textContent = companyId || "не передан";

function renderEmpty() {
  const root = document.getElementById("bookingsRoot");
  root.innerHTML = `
    <div class="booking-item">
      <p><b>Пока записей нет</b></p>
      <p class="muted">Когда появится endpoint со списком записей компании, они будут отображаться здесь.</p>
    </div>
  `;
}

renderEmpty();
