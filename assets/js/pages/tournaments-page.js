// Tournaments page: list + add/edit/delete (with spinners + status badges)
(function () {
  function el(id) { return document.getElementById(id); }

  let cacheById = {};

  function actionButtons(id) {
    const wrap = document.createElement("div");
    wrap.className = "d-flex gap-2";
    wrap.innerHTML = `
      <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${id}">
        <i class="bx bx-edit"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${id}">
        <i class="bx bx-trash"></i>
      </button>`;
    return wrap;
  }

  function renderRows(rows) {
    const tbody = el("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    cacheById = {};
    (rows || []).forEach((r) => {
      if (!r) return;
      cacheById[String(r.id)] = r;

      const tr = document.createElement("tr");

      const cols = ["id","name","sport","format","status","startDate","endDate"];
      cols.forEach((k) => {
        const td = document.createElement("td");
        if (k === "status") {
          const badge = window.GT_ui.statusBadge(r[k]);
          td.appendChild(badge);
        } else {
          td.textContent = (r && r[k] !== undefined && r[k] !== null) ? String(r[k]) : "";
        }
        tr.appendChild(td);
      });

      const tdActions = document.createElement("td");
      tdActions.appendChild(actionButtons(String(r.id || "")));
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  async function refresh() {
    const btn = el("btnRefresh");
    await window.GT_ui.withSpinner(btn, async () => {
      const r = await window.GT_api.call("list", { entity: "tournaments" });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load failed");
      renderRows(r.rows || []);
    }, { loadingText: window.GT_i18n.t("common.loading"), overlay: false });
  }

  async function saveAdd(modalInstance) {
    const btn = el("btnSaveAdd");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        name: el("add_name")?.value || "",
        sport: el("add_sport")?.value || "",
        format: el("add_format")?.value || "",
        status: "ACTIVE",
        startDate: el("add_startDate")?.value || "",
        endDate: el("add_endDate")?.value || "",
        location: el("add_location")?.value || "",
        timezone: "Africa/Casablanca"
      };
      const r = await window.GT_api.call("upsert", { entity: "tournaments", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Save failed");
      if (modalInstance) modalInstance.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  function openEdit(id) {
    const r = cacheById[String(id)];
    if (!r) return;
    el("edit_id").value = r.id || "";
    el("edit_name").value = r.name || "";
    el("edit_sport").value = r.sport || "";
    el("edit_format").value = r.format || "";
    el("edit_location").value = r.location || "";
    el("edit_startDate").value = r.startDate || "";
    el("edit_endDate").value = r.endDate || "";

    const modalEl = document.getElementById("modalEdit");
    if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
  }

  async function saveEdit() {
    const btn = el("btnSaveEdit");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        id: el("edit_id")?.value || "",
        name: el("edit_name")?.value || "",
        sport: el("edit_sport")?.value || "",
        format: el("edit_format")?.value || "",
        location: el("edit_location")?.value || "",
        startDate: el("edit_startDate")?.value || "",
        endDate: el("edit_endDate")?.value || "",
        status: "ACTIVE",
        timezone: "Africa/Casablanca"
      };
      const r = await window.GT_api.call("upsert", { entity: "tournaments", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Update failed");
      const modalEl = document.getElementById("modalEdit");
      if (modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl)?.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  async function removeOne(id) {
    if (!window.GT_ui.confirmAction("common.confirmDelete", "Are you sure you want to delete this item?")) return;
    await window.GT_ui.withSpinner(null, async () => {
      const r = await window.GT_api.call("remove", { entity: "tournaments", id });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Delete failed");
      await refresh();
    }, { overlay: true, loadingText: window.GT_i18n.t("common.loading") });
  }

  function bindRowActions() {
    const tbody = el("tableBody");
    if (!tbody) return;
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;
      if (action === "edit") openEdit(id);
      if (action === "delete") removeOne(id).catch(() => {});
    });
  }

  function boot() {
    const btnAdd = el("btnAdd");
    const btnR = el("btnRefresh");
    if (btnR) btnR.addEventListener("click", refresh);

    const modalEl = document.getElementById("modalAdd");
    const modalInstance = (modalEl && window.bootstrap) ? new bootstrap.Modal(modalEl) : null;

    const btnSave = el("btnSaveAdd");
    if (btnSave) btnSave.addEventListener("click", () => saveAdd(modalInstance));

    const btnSaveEdit = el("btnSaveEdit");
    if (btnSaveEdit) btnSaveEdit.addEventListener("click", saveEdit);

    bindRowActions();

    // auto-load
    refresh().catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
