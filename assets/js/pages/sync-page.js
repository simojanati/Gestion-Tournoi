// Sync page (DEV): shows spinner + simple pull test
(function () {
  async function runSync() {
    const btn = document.getElementById("btnSync");
    const status = document.getElementById("syncStatus");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      await window.GT_ui.withSpinner(btn, async () => {
        if (status) status.textContent = window.GT_i18n.t("sync.statusRunning");
        try {
          // DEV: simple read to prove connectivity
          const r = await window.GT_api.call("list", { entity: "tournaments" });
          if (!r || !r.ok) throw new Error((r && (r.error || r.message)) || "Sync failed");
          if (status) status.textContent = window.GT_i18n.t("sync.statusOk") + " (" + (r.count || 0) + ")";
        } catch (e) {
          if (status) status.textContent = window.GT_i18n.t("sync.statusError") + ": " + (e && e.message ? e.message : e);
        }
      }, { loadingText: window.GT_i18n.t("sync.loading") });
    });
  }

  document.addEventListener("DOMContentLoaded", runSync);
})();
