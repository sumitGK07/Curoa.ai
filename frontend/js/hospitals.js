/**
 * Curoa.AI — Hospitals module
 * Renders the "Hospitals Near You" rail on the chat page and powers
 * the full hospitals search/filter/detail page.
 *
 * Data comes from GET /api/hospitals. Until real geolocation + a maps
 * API are wired in (see backend/app/routers/hospitals.py), this falls
 * back to sample data so the UI is fully explorable.
 */

const CuroaHospitals = (() => {
  const SAMPLE_HOSPITALS = [
    {
      id: 1,
      name: "Sunrise General Hospital",
      type: "Multi-specialty Hospital",
      address: "142 MG Road, Camp, Pune, MH 411001",
      phone: "+91 20 4567 8901",
      distance_km: 1.2,
      is_open: true,
      hours_note: "Open 24 hours",
      emergency: true,
      rating: 4.4,
      lat: 18.5195, lng: 73.8553,
    },
    {
      id: 2,
      name: "Lakeside Family Clinic",
      type: "General Physician Clinic",
      address: "9 Boat Club Road, Pune, MH 411001",
      phone: "+91 20 2345 6789",
      distance_km: 2.1,
      is_open: true,
      hours_note: "Open until 9:00 PM",
      emergency: false,
      rating: 4.6,
      lat: 18.5304, lng: 73.8567,
    },
    {
      id: 3,
      name: "St. Martin's Medical Center",
      type: "Hospital & Trauma Center",
      address: "77 Airport Road, Pune, MH 411006",
      phone: "+91 20 6789 0123",
      distance_km: 3.4,
      is_open: true,
      hours_note: "Open 24 hours",
      emergency: true,
      rating: 4.2,
      lat: 18.5679, lng: 73.9143,
    },
    {
      id: 4,
      name: "Green Valley Urgent Care",
      type: "Urgent Care",
      address: "21 Baner Road, Pune, MH 411045",
      phone: "+91 20 3456 7890",
      distance_km: 4.0,
      is_open: false,
      hours_note: "Opens tomorrow at 8:00 AM",
      emergency: false,
      rating: 4.0,
      lat: 18.5590, lng: 73.7868,
    },
    {
      id: 5,
      name: "Riverside Children's Hospital",
      type: "Pediatric Hospital",
      address: "5 FC Road, Shivajinagar, Pune, MH 411005",
      phone: "+91 20 2233 4455",
      distance_km: 2.8,
      is_open: true,
      hours_note: "Open 24 hours",
      emergency: true,
      rating: 4.7,
      lat: 18.5314, lng: 73.8446,
    },
    {
      id: 6,
      name: "Harborview Skin & Allergy Clinic",
      type: "Dermatology Clinic",
      address: "63 Koregaon Park, Pune, MH 411001",
      phone: "+91 20 4123 9988",
      distance_km: 1.8,
      is_open: false,
      hours_note: "Opens at 10:00 AM",
      emergency: false,
      rating: 4.5,
      lat: 18.5362, lng: 73.8938,
    },
  ];

  async function fetchHospitals(params = {}) {
    try {
      const data = await CuroaAPI.listHospitals(params);
      if (Array.isArray(data) && data.length) return data;
      if (data && Array.isArray(data.results) && data.results.length) return data.results;
      return SAMPLE_HOSPITALS;
    } catch {
      // Backend/chatbot not connected yet — fall back to sample data
      // so the interface remains fully browsable.
      return SAMPLE_HOSPITALS;
    }
  }

  function statusBadge(hospital) {
    if (hospital.is_open === true) {
      return `<span class="badge badge-open"><span class="badge-dot"></span>Open now</span>`;
    }
    if (hospital.is_open === false) {
      return `<span class="badge badge-closed"><span class="badge-dot"></span>Closed</span>`;
    }
    return `<span class="badge badge-unknown"><span class="badge-dot"></span>Hours unknown</span>`;
  }

  function directionsUrl(h) {
    if (h.lat && h.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address)}`;
  }

  // ---------- Chat sidebar rail ----------
  async function renderSidebar(container) {
    if (!container) return;
    container.innerHTML = `<div class="hosp-loading" style="padding:20px;color:var(--color-ink-faint);font-size:13px;">Finding hospitals near you…</div>`;
    const hospitals = await fetchHospitals({ limit: 6 });
    const sorted = [...hospitals].sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));

    container.innerHTML = sorted.slice(0, 6).map((h) => `
      <div class="hosp-card" data-id="${h.id}">
        <div class="hosp-card-top">
          <div class="hosp-name">${escapeHtml(h.name)}</div>
          <div class="hosp-dist mono">${h.distance_km != null ? h.distance_km + " km" : "—"}</div>
        </div>
        <div class="hosp-addr">${escapeHtml(h.address)}</div>
        <div class="hosp-phone mono">${phoneIcon()}${escapeHtml(h.phone || "N/A")}</div>
        <div class="hosp-status-row">${statusBadge(h)}</div>
        <div class="hosp-actions">
          <button class="btn btn-secondary btn-sm" data-action="details" data-id="${h.id}">Details</button>
          <a class="btn btn-primary btn-sm" href="${directionsUrl(h)}" target="_blank" rel="noopener">Directions</a>
        </div>
      </div>
    `).join("");

    container.querySelectorAll('[data-action="details"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = `hospitals.html?hospital=${btn.dataset.id}`;
      });
    });
  }

  // ---------- Full hospitals page ----------
  let state = { hospitals: [], filtered: [], activeType: "all", query: "", sort: "distance", selectedId: null };

  async function initHospitalsPage() {
    const resultsEl = document.getElementById("hosp-results");
    const searchInput = document.getElementById("hosp-search-input");
    const sortSelect = document.getElementById("hosp-sort");
    const chips = document.querySelectorAll(".filter-chip");

    state.hospitals = await fetchHospitals();
    applyFilters();
    render(resultsEl);

    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("hospital");
    if (preselect) selectHospital(Number(preselect));
    else if (state.filtered.length) selectHospital(state.filtered[0].id);

    searchInput?.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      applyFilters();
      render(resultsEl);
    });

    sortSelect?.addEventListener("change", (e) => {
      state.sort = e.target.value;
      applyFilters();
      render(resultsEl);
    });

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.activeType = chip.dataset.type;
        applyFilters();
        render(resultsEl);
      });
    });
  }

  function applyFilters() {
    let list = [...state.hospitals];

    if (state.activeType === "open") list = list.filter((h) => h.is_open);
    else if (state.activeType === "emergency") list = list.filter((h) => h.emergency);
    else if (state.activeType !== "all") {
      list = list.filter((h) => (h.type || "").toLowerCase().includes(state.activeType));
    }

    if (state.query) {
      list = list.filter((h) =>
        h.name.toLowerCase().includes(state.query) ||
        (h.type || "").toLowerCase().includes(state.query) ||
        (h.address || "").toLowerCase().includes(state.query)
      );
    }

    if (state.sort === "distance") list.sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
    if (state.sort === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));

    state.filtered = list;
  }

  function render(resultsEl) {
    if (!resultsEl) return;
    document.getElementById("hosp-count").textContent = `${state.filtered.length} found`;

    if (!state.filtered.length) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          ${emptyIcon()}
          <p>No hospitals match your search. Try a different name, area, or filter.</p>
        </div>`;
      return;
    }

    resultsEl.innerHTML = state.filtered.map((h) => `
      <div class="hosp-result-card ${h.id === state.selectedId ? "selected" : ""}" data-id="${h.id}">
        <div class="hosp-result-icon">${hospitalIcon()}</div>
        <div class="hosp-result-body">
          <div class="hosp-result-top">
            <div>
              <div class="hosp-result-name">${escapeHtml(h.name)}</div>
              <div class="hosp-result-type">${escapeHtml(h.type || "Healthcare facility")}</div>
            </div>
            <div class="hosp-result-dist mono">${h.distance_km != null ? h.distance_km + " km" : "—"}</div>
          </div>
          <div class="hosp-result-addr">${escapeHtml(h.address)}</div>
          <div class="hosp-result-meta">
            ${statusBadge(h)}
            <span class="meta-item">${phoneIcon()}${escapeHtml(h.phone || "N/A")}</span>
            ${h.rating ? `<span class="meta-item">${starIcon()}${h.rating.toFixed(1)}</span>` : ""}
            ${h.emergency ? `<span class="meta-item">${emergencyIcon()}Emergency</span>` : ""}
          </div>
          <div class="hosp-result-actions">
            <button class="btn btn-secondary btn-sm" data-action="select" data-id="${h.id}">View details</button>
            <a class="btn btn-primary btn-sm" href="${directionsUrl(h)}" target="_blank" rel="noopener">Get directions</a>
          </div>
        </div>
      </div>
    `).join("");

    resultsEl.querySelectorAll(".hosp-result-card, [data-action='select']").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = Number(el.dataset.id || el.closest("[data-id]").dataset.id);
        selectHospital(id);
      });
    });
  }

  function selectHospital(id) {
    state.selectedId = id;
    const h = state.hospitals.find((x) => x.id === id);
    if (!h) return;

    document.querySelectorAll(".hosp-result-card").forEach((c) => {
      c.classList.toggle("selected", Number(c.dataset.id) === id);
    });

    const detailEl = document.getElementById("map-detail");
    if (!detailEl) return;
    detailEl.innerHTML = `
      <h3>${escapeHtml(h.name)}</h3>
      <div class="detail-type">${escapeHtml(h.type || "Healthcare facility")}</div>
      <div class="detail-row">${pinIcon()}<span>${escapeHtml(h.address)}</span></div>
      <div class="detail-row">${phoneIcon()}<span class="mono">${escapeHtml(h.phone || "N/A")}</span></div>
      <div class="detail-row">${clockIcon()}<span>${escapeHtml(h.hours_note || "Hours unavailable")} · ${statusBadge(h)}</span></div>
      <div class="detail-row">${routeIcon()}<span>${h.distance_km != null ? h.distance_km + " km away" : "Distance unavailable"}</span></div>
      <div class="detail-actions">
        <a class="btn btn-primary" href="${directionsUrl(h)}" target="_blank" rel="noopener">Get directions</a>
        <a class="btn btn-secondary" href="tel:${(h.phone || "").replace(/\s+/g, "")}">Call</a>
      </div>
    `;
  }

  // ---------- tiny icon + escape helpers ----------
  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function phoneIcon() { return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`; }
  function hospitalIcon() { return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M5 8h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M9 13h6M12 10v6"/></svg>`; }
  function starIcon() { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`; }
  function emergencyIcon() { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`; }
  function pinIcon() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`; }
  function clockIcon() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`; }
  function routeIcon() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h7a4 4 0 0 0 4-4V9M6 16V9a4 4 0 0 1 4-4h1"/></svg>`; }
  function emptyIcon() { return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`; }

  return { fetchHospitals, renderSidebar, initHospitalsPage, statusBadge, directionsUrl };
})();
