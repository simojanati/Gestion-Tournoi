// Matches page: list + add/edit/delete (with spinners + status badges + selectors)
(function () {
  function el(id) { return document.getElementById(id); }

  let cacheById = {};
  let tournaments = [];
  let teams = [];
  let venues = [];
  let referees = [];

  let teamMap = {};
  let venueMap = {};
  let refMap = {};

  function optionHtml(value, label) {
    const v = String(value ?? "");
    const l = String(label ?? value ?? "");
    return `<option value="${v}">${l}</option>`;
  }

  function rebuildMaps() {
    teamMap = {};
    venueMap = {};
    refMap = {};
    (teams || []).forEach(t => teamMap[String(t.id)] = t.name || t.id);
    (venues || []).forEach(v => venueMap[String(v.id)] = v.name || v.id);
    (referees || []).forEach(r => refMap[String(r.id)] = r.fullName || r.id);
  }

  async function loadTournaments() {
    const r = await window.GT_api.call("list", { entity: "tournaments" });
    if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load tournaments failed");
    tournaments = r.rows || [];
    const filter = el("filter_tournament");
    const addSel = el("add_tournamentId");
    const editSel = el("edit_tournamentId");

    const html = tournaments.map(t => optionHtml(t.id, t.name)).join("");
    [filter, addSel, editSel].forEach(s => { if (s) s.innerHTML = html; });

    const saved = localStorage.getItem("gt.currentTournamentId");
    const first = (tournaments[0] && tournaments[0].id) ? String(tournaments[0].id) : "";
    const current = saved || first;
    if (filter) filter.value = current;
    if (addSel) addSel.value = current;
    if (editSel) editSel.value = current;
  }

  async function loadVenuesReferees() {
    const [rv, rr] = await Promise.all([
      window.GT_api.call("list", { entity: "venues" }),
      window.GT_api.call("list", { entity: "referees" })
    ]);
    if (rv && rv.ok) venues = rv.rows || [];
    if (rr && rr.ok) referees = rr.rows || [];
  }

  async function loadTeamsForTournament(tournamentId) {
    const r = await window.GT_api.call("list", { entity: "teams", filterKey: "tournamentId", filterValue: tournamentId });
    if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load teams failed");
    teams = r.rows || [];
  }

  function fillSelect(id, list, labelKey) {
    const s = el(id);
    if (!s) return;
    s.innerHTML = (list || []).map(x => optionHtml(x.id, x[labelKey] || x.name || x.fullName || x.id)).join("");
  }

  function fillSelectors() {
    rebuildMaps();
    fillSelect("add_homeTeamId", teams, "name");
    fillSelect("add_awayTeamId", teams, "name");
    fillSelect("edit_homeTeamId", teams, "name");
    fillSelect("edit_awayTeamId", teams, "name");

    fillSelect("add_venueId", venues, "name");
    fillSelect("edit_venueId", venues, "name");

    fillSelect("add_refereeId", referees, "fullName");
    fillSelect("edit_refereeId", referees, "fullName");
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

      // id
      const tdId = document.createElement("td");
      tdId.textContent = r.id || "";
      tr.appendChild(tdId);

      // stage
      const tdStage = document.createElement("td");
      tdStage.textContent = r.stage || "";
      tr.appendChild(tdStage);

      // group
      const tdGroup = document.createElement("td");
      tdGroup.textContent = r.groupName || "";
      tr.appendChild(tdGroup);

      // home/away names
      const tdHome = document.createElement("td");
      tdHome.textContent = teamMap[String(r.homeTeamId)] || r.homeTeamId || "";
      tr.appendChild(tdHome);

      const tdAway = document.createElement("td");
      tdAway.textContent = teamMap[String(r.awayTeamId)] || r.awayTeamId || "";
      tr.appendChild(tdAway);

      const tdVenue = document.createElement("td");
      tdVenue.textContent = venueMap[String(r.venueId)] || r.venueId || "";
      tr.appendChild(tdVenue);

      const tdRef = document.createElement("td");
      tdRef.textContent = refMap[String(r.refereeId)] || r.refereeId || "";
      tr.appendChild(tdRef);

      const tdTime = document.createElement("td");
      tdTime.textContent = r.startTime || "";
      tr.appendChild(tdTime);

      const tdStatus = document.createElement("td");
      tdStatus.appendChild(window.GT_ui.statusBadge(r.status || "SCHEDULED"));
      tr.appendChild(tdStatus);

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

      // load teams for mapping
      await loadTeamsForTournament(tournamentId);
      fillSelectors();

      const r = await window.GT_api.call("list", { entity: "matches", filterKey: "tournamentId", filterValue: tournamentId });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Load matches failed");
      renderRows(r.rows || []);
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  async function saveAdd(modalInstance) {
    const btn = el("btnSaveAdd");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        tournamentId: el("add_tournamentId")?.value || "",
        stage: el("add_stage")?.value || "GROUP",
        groupName: el("add_groupName")?.value || "",
        homeTeamId: el("add_homeTeamId")?.value || "",
        awayTeamId: el("add_awayTeamId")?.value || "",
        venueId: el("add_venueId")?.value || "",
        refereeId: el("add_refereeId")?.value || "",
        startTime: el("add_startTime")?.value || "",
        status: "SCHEDULED"
      };
      const r = await window.GT_api.call("upsert", { entity: "matches", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Save failed");
      if (modalInstance) modalInstance.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  function openEdit(id) {
    const r = cacheById[String(id)];
    if (!r) return;

    el("edit_id").value = r.id || "";
    el("edit_tournamentId").value = r.tournamentId || (el("filter_tournament")?.value || "");
    el("edit_stage").value = r.stage || "GROUP";
    el("edit_groupName").value = r.groupName || "";
    el("edit_homeTeamId").value = r.homeTeamId || "";
    el("edit_awayTeamId").value = r.awayTeamId || "";
    el("edit_venueId").value = r.venueId || "";
    el("edit_refereeId").value = r.refereeId || "";
    el("edit_startTime").value = (r.startTime || "").replace("Z", "");
    el("edit_status").value = r.status || "SCHEDULED";

    const modalEl = document.getElementById("modalEdit");
    if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
  }

  async function saveEdit() {
    const btn = el("btnSaveEdit");
    await window.GT_ui.withSpinner(btn, async () => {
      const payload = {
        id: el("edit_id")?.value || "",
        tournamentId: el("edit_tournamentId")?.value || "",
        stage: el("edit_stage")?.value || "GROUP",
        groupName: el("edit_groupName")?.value || "",
        homeTeamId: el("edit_homeTeamId")?.value || "",
        awayTeamId: el("edit_awayTeamId")?.value || "",
        venueId: el("edit_venueId")?.value || "",
        refereeId: el("edit_refereeId")?.value || "",
        startTime: el("edit_startTime")?.value || "",
        status: el("edit_status")?.value || "SCHEDULED"
      };
      const r = await window.GT_api.call("upsert", { entity: "matches", payload });
      if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Update failed");
      const modalEl = document.getElementById("modalEdit");
      if (modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl)?.hide();
      await refresh();
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  async function removeOne(id) {
    if (!window.GT_ui.confirmAction("common.confirmDelete", "Are you sure you want to delete this item?")) return;
    await window.GT_ui.withSpinner(null, async () => {
      const r = await window.GT_api.call("remove", { entity: "matches", id });
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

  async function onTournamentChange() {
    const tId = el("filter_tournament")?.value || "";
    // sync add tournament selection too
    if (el("add_tournamentId")) el("add_tournamentId").value = tId;
    if (el("edit_tournamentId")) el("edit_tournamentId").value = tId;

    await window.GT_ui.withSpinner(null, async () => {
      await loadTeamsForTournament(tId);
      fillSelectors();
      await refresh();
    }, { overlay: true, loadingText: window.GT_i18n.t("common.loading") });
  }

  function boot() {
    const filter = el("filter_tournament");
    if (filter) filter.addEventListener("change", () => onTournamentChange().catch(()=>{}));

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
      await loadVenuesReferees();
      await loadTeamsForTournament(el("filter_tournament")?.value || "");
      fillSelectors();
      await refresh();
    }, { overlay: true, loadingText: window.GT_i18n.t("common.loading") }).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
