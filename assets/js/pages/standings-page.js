// Standings page: compute group standings from matches + results (football default)
(function () {
  function el(id) { return document.getElementById(id); }
  function t(key) { return (window.GT_i18n && window.GT_i18n.t) ? window.GT_i18n.t(key) : key; }

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
    const html = tournaments.map(tt => optionHtml(tt.id, tt.name)).join("");
    if (filter) filter.innerHTML = html;

    const saved = localStorage.getItem("gt.currentTournamentId");
    const first = (tournaments[0] && tournaments[0].id) ? String(tournaments[0].id) : "";
    const current = saved || first;
    if (filter) filter.value = current;
  }

  function buildBaseTeamStats(team) {
    return {
      teamId: team.id,
      name: team.name || team.id,
      groupName: team.groupName || "",
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    };
  }

  function applyMatch(statsByTeam, match, result) {
    if (!match || !result) return;
    const hs = Number(result.homeScore);
    const as = Number(result.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) return;

    const home = statsByTeam[String(match.homeTeamId)];
    const away = statsByTeam[String(match.awayTeamId)];
    if (!home || !away) return;

    home.played += 1; away.played += 1;
    home.gf += hs; home.ga += as;
    away.gf += as; away.ga += hs;

    if (hs > as) { home.wins += 1; away.losses += 1; home.points += 3; }
    else if (hs < as) { away.wins += 1; home.losses += 1; away.points += 3; }
    else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  function groupBy(arr, keyFn) {
    const m = {};
    (arr || []).forEach(x => {
      const k = keyFn(x) || "";
      if (!m[k]) m[k] = [];
      m[k].push(x);
    });
    return m;
  }

  function renderGroup(groupName, rows) {
    const card = document.createElement("div");
    card.className = "mb-4";

    const title = document.createElement("h6");
    title.className = "mb-2";
    title.textContent = `${t("standings.group")}: ${groupName || "-"}`;
    card.appendChild(title);

    const table = document.createElement("table");
    table.className = "table table-striped";

    table.innerHTML = `
      <thead>
        <tr>
          <th>${t("table.col.team")}</th>
          <th>${t("standings.played")}</th>
          <th>${t("standings.wins")}</th>
          <th>${t("standings.draws")}</th>
          <th>${t("standings.losses")}</th>
          <th>${t("standings.gf")}</th>
          <th>${t("standings.ga")}</th>
          <th>${t("standings.gd")}</th>
          <th>${t("standings.points")}</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.played}</td>
        <td>${r.wins}</td>
        <td>${r.draws}</td>
        <td>${r.losses}</td>
        <td>${r.gf}</td>
        <td>${r.ga}</td>
        <td>${r.gd}</td>
        <td><strong>${r.points}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    card.appendChild(table);
    return card;
  }

  async function refresh() {
    const btn = el("btnRefresh");
    await window.GT_ui.withSpinner(btn, async () => {
      const tournamentId = el("filter_tournament")?.value || "";
      localStorage.setItem("gt.currentTournamentId", tournamentId);

      const [teamsR, matchesR, resultsR] = await Promise.all([
        window.GT_api.call("list", { entity: "teams", filterKey: "tournamentId", filterValue: tournamentId }),
        window.GT_api.call("list", { entity: "matches", filterKey: "tournamentId", filterValue: tournamentId }),
        window.GT_api.call("list", { entity: "results" })
      ]);

      if (!teamsR?.ok || !matchesR?.ok || !resultsR?.ok) {
        throw new Error("Load failed");
      }

      const teams = teamsR.rows || [];
      const matches = matchesR.rows || [];
      const results = resultsR.rows || [];

      const teamStats = {};
      teams.forEach(tm => teamStats[String(tm.id)] = buildBaseTeamStats(tm));

      // map results by matchId
      const resByMatch = {};
      results.forEach(rs => { if (rs && rs.matchId) resByMatch[String(rs.matchId)] = rs; });

      matches.forEach(m => {
        const rs = resByMatch[String(m.id)];
        if (!rs) return;
        // Only count finished
        const st = String(rs.status || m.status || "").toUpperCase();
        if (st !== "FINISHED") return;
        applyMatch(teamStats, m, rs);
      });

      // group by groupName
      const grouped = groupBy(Object.values(teamStats), x => x.groupName || "");
      // sort
      Object.keys(grouped).forEach(g => {
        grouped[g].sort((a,b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return String(a.name).localeCompare(String(b.name));
        });
      });

      const container = el("standingsContainer");
      if (!container) return;
      container.innerHTML = "";
      Object.keys(grouped).sort().forEach(g => {
        container.appendChild(renderGroup(g, grouped[g]));
      });
    }, { loadingText: window.GT_i18n.t("common.loading") });
  }

  function boot() {
    const filter = el("filter_tournament");
    if (filter) filter.addEventListener("change", refresh);
    const btnR = el("btnRefresh");
    if (btnR) btnR.addEventListener("click", refresh);

    window.GT_ui.withSpinner(null, async () => {
      await loadTournaments();
      await refresh();
    }, { overlay: true, loadingText: window.GT_i18n.t("common.loading") }).catch(()=>{});
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
