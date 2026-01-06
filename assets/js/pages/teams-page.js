// Teams page: list + add/edit/delete (with spinners + filters)
(function () {
  function el(id) { return document.getElementById(id); }

  let cacheById = {};
  let tournaments = [];

  function optionHtml(value, label) {
    const v = String(value ?? "");
    const l = String(label ?? value ?? "");
    return `<option value="${v}">${l}</option>`;
  }

  async function loadTournaments() {
    const r = await window.GT_api.call("list", { entity: "tournaments" });
    if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load tournaments failed");
    tournaments = r.rows || [];
    const filter = el("filter_tournament");
    const addSel = el("add_tournamentId");
    const editSel = el("edit_tournamentId");

    const opts = tournaments.map(t => optionHtml(t.id, t.name));
    const html = opts.join("");
    [filter, addSel, editSel].forEach(s => { if (s) s.innerHTML = html; });

    const saved = localStorage.getItem("gt.currentTournamentId");
    const first = (tournaments[0] && tournaments[0].id) ? String(tournaments[0].id) : "";
    const current = saved || first;
    if (filter) filter.value = current;
    if (addSel) addSel.value = current;
    if (editSel) editSel.value = current;
  }

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

      ["id", "name", "groupName", "coachName", "phone"].forEach((k) => {
        const td = document.createElement("td");
        td.textContent = (r && r[k] !== undefined && r[k] !== null) ? String(r[k]) : "";
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
      const tournamentId = el("filter_tournament")?.value || "";
      localStorage.setItem("gt.currentTournamentId", tournamentId);
      const r = await window.GT_api.call("list", { entity: "teams", filterKey: "tournamentId", filterValue: tournamentId });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load teams failed");
      renderRows(r.rows || []);
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  async function saveAdd(modalInstance) {
    const btn = el("btnSaveAdd");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        tournamentId: el("add_tournamentId")?.value || "",
        name: el("add_name")?.value || "",
        groupName: el("add_groupName")?.value || "",
        coachName: el("add_coachName")?.value || "",
        phone: el("add_phone")?.value || ""
      };
      const r = await window.GT_api.call("upsert", { entity: "teams", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Save failed");
      if (modalInstance) modalInstance.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  function openEdit(id) {
    const r = cacheById[String(id)];
    if (!r) return;
    el("edit_id").value = r.id || "";
    el("edit_tournamentId").value = r.tournamentId || "";
    el("edit_name").value = r.name || "";
    el("edit_groupName").value = r.groupName || "";
    el("edit_coachName").value = r.coachName || "";
    el("edit_phone").value = r.phone || "";

    const modalEl = document.getElementById("modalEdit");
    if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
  }

  async function saveEdit() {
    const btn = el("btnSaveEdit");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        id: el("edit_id")?.value || "",
        tournamentId: el("edit_tournamentId")?.value || "",
        name: el("edit_name")?.value || "",
        groupName: el("edit_groupName")?.value || "",
        coachName: el("edit_coachName")?.value || "",
        phone: el("edit_phone")?.value || ""
      };
      const r = await window.GT_api.call("upsert", { entity: "teams", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Update failed");
      const modalEl = document.getElementById("modalEdit");
      if (modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl)?.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  async function removeOne(id) {
    if (!window.GT_ui.confirmAction("common.confirmDelete", "Are you sure you want to delete this item?")) return;
    await window.GT_ui.withSpinner(null, async () => {
      const r = await window.GT_api.call("remove", { entity: "teams", id });
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
    const filter = el("filter_tournament");
    if (filter) filter.addEventListener("change", refresh);

    const btnR = el("btnRefresh");
    if (btnR) btnR.addEventListener("click", refresh);

    const modalEl = document.getElementById("modalAdd");
    const modalInstance = (modalEl && window.bootstrap) ? new bootstrap.Modal(modalEl) : null;
    const btnSave = el("btnSaveAdd");
    if (btnSave) btnSave.addEventListener("click", () => saveAdd(modalInstance));

    const btnSaveEdit = el("btnSaveEdit");
    if (btnSaveEdit) btnSaveEdit.addEventListener("click", saveEdit);

    bindRowActions();

    // initial load
    window.GT_ui.withSpinner(null, async () => {
      await loadTournaments();
      await refresh();
    }, { overlay: true, loadingText: window.GT_i18n.t("common.loading") }).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
