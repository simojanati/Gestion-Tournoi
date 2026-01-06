// UI helpers (spinners, alerts, badges, dialogs)
// Depends on: GT_i18n (assets/js/i18n.js) and Bootstrap JS

window.GT_ui = (() => {
  const overlayId = "gtOverlay";

  // HTML escape helper to safely render raw values in badges/chips/options
  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureOverlay() {
    let el = document.getElementById(overlayId);
    if (!el) {
      el = document.createElement("div");
      el.id = overlayId;
      el.className = "gt-overlay";
      el.innerHTML = `
        <div class="gt-overlay-card text-center">
          <div class="spinner-border" role="status" aria-label="Loading"></div>
          <div class="mt-3 fw-semibold" data-i18n="common.loading">Loading...</div>
        </div>`;
      document.body.appendChild(el);
    }
    return el;
  }

  function showOverlay() {
    ensureOverlay().classList.add("show");
  }

  function hideOverlay() {
    ensureOverlay().classList.remove("show");
  }

  async function withSpinner(btn, work, opts = {}) {
    const { loadingTextKey = "common.loading", overlay = false } = opts;
    const originalHtml = btn ? btn.innerHTML : null;
    const originalDisabled = btn ? btn.disabled : null;

    if (btn) {
      btn.disabled = true;
      const txt = (window.GT_i18n && GT_i18n.t) ? GT_i18n.t(loadingTextKey) : "Loading...";
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${txt}`;
    }
    if (overlay) showOverlay();

    try {
      return await work();
    } finally {
      if (overlay) hideOverlay();
      if (btn) {
        btn.disabled = originalDisabled;
        btn.innerHTML = originalHtml;
      }
    }
  }

  function withOverlaySpinner(btn, work, opts = {}) {
    return withSpinner(btn, work, { ...opts, overlay: true });
  }

  function alert(container, type, msgKeyOrText) {
    const c = typeof container === "string" ? document.querySelector(container) : container;
    if (!c) return;
    const text = (window.GT_i18n && GT_i18n.t) ? GT_i18n.t(msgKeyOrText, null, true) : String(msgKeyOrText);
    c.innerHTML = `<div class="alert alert-${type} mb-0" role="alert">${text}</div>`;
  }

  const STATUS_CLASS = {
    ACTIVE: "bg-label-success",
    DRAFT: "bg-label-secondary",
    FINISHED: "bg-label-success",
    SCHEDULED: "bg-label-warning",
    IN_PROGRESS: "bg-label-info",
    CANCELED: "bg-label-danger"
  };

  function statusBadge(status) {
    const s = String(status || "").trim().toUpperCase();
    const cls = STATUS_CLASS[s] || "bg-label-secondary";
    return `<span class="badge ${cls} gt-badge">${esc(s)}</span>`;
  }

  const FORMAT_CLASS = {
    CHAMPIONNAT: "bg-label-primary",
    GROUPS_FINALS: "bg-label-info",
    KNOCKOUT: "bg-label-warning"
  };

  function formatChip(format) {
    const f = String(format || "").trim().toUpperCase();
    const def = (window.GT_CONST && GT_CONST.formats) ? GT_CONST.formats.find(x => x.value === f) : null;
    const icon = def && def.icon ? def.icon : "bx-shape-circle";
    const cls = FORMAT_CLASS[f] || "bg-label-secondary";
    return `
      <span class="gt-format-chip badge ${cls}">
        <i class="bx ${icon} me-1"></i>
        <span class="fw-semibold">${esc(f)}</span>
      </span>`;
  }

  function formatPreviewCard(format) {
    const f = String(format || "").trim().toUpperCase();
    const chip = formatChip(f);

    const diagramMap = {
      CHAMPIONNAT: `<div class="d-flex gap-2 flex-wrap">
        <span class="badge bg-label-primary">A-B</span><span class="badge bg-label-primary">A-C</span><span class="badge bg-label-primary">B-C</span>
        <span class="badge bg-label-secondary">...</span>
      </div>`,
      GROUPS_FINALS: `<div class="d-flex align-items-center gap-2 flex-wrap">
        <span class="badge bg-label-primary">Group A</span>
        <span class="badge bg-label-primary">Group B</span>
        <i class="bx bx-right-arrow-alt"></i>
        <span class="badge bg-label-success">Semi</span>
        <span class="badge bg-label-success">Final</span>
      </div>`,
      KNOCKOUT: `<div class="d-flex align-items-center gap-2 flex-wrap">
        <span class="badge bg-label-warning">R16/QF</span>
        <i class="bx bx-right-arrow-alt"></i>
        <span class="badge bg-label-info">SF</span>
        <i class="bx bx-right-arrow-alt"></i>
        <span class="badge bg-label-success">Final</span>
      </div>`
    };

    const diagram = diagramMap[f] || `<div class="text-muted">—</div>`;
    return `
      <div class="card mt-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-bold">${esc(f || "-")}</div>
            </div>
            <div>${chip}</div>
          </div>
          <div class="mt-3">${diagram}</div>
        </div>
      </div>`;
  }

  function formatDateTime(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const hasTime = /T\d{2}:\d{2}/.test(raw) || /\d{2}:\d{2}/.test(raw);
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(raw + "T00:00:00");
    else d = new Date(raw);
    if (isNaN(d.getTime())) return raw;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return hasTime ? `${dd}/${mm}/${yyyy} - ${hh}:${min}` : `${dd}/${mm}/${yyyy}`;
  }

  function fillSelect(selectEl, items, value) {
    const el = typeof selectEl === "string" ? document.querySelector(selectEl) : selectEl;
    if (!el) return;
    el.innerHTML = (items || []).map(it => `<option value="${esc(it.value)}">${esc(it.value)}</option>`).join("");
    if (value) el.value = value;
  }

  function toast(message, type = "info") {
    const id = "gtToastContainer";
    let container = document.getElementById(id);
    if (!container) {
      container = document.createElement("div");
      container.id = id;
      container.className = "toast-container position-fixed p-3";
      container.style.top = "0";
      container.style.right = "0";
      container.style.zIndex = "2000";
      document.body.appendChild(container);
    }

    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    container.appendChild(toastEl);

    if (window.bootstrap && bootstrap.Toast) {
      const t = new bootstrap.Toast(toastEl, { delay: 2600 });
      t.show();
      toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
    }
  }

  async function confirm({ title, message, confirmText, cancelText } = {}) {
    const id = "gtConfirmModal";
    let modalEl = document.getElementById(id);
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = id;
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" data-gt="title">Confirm</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" data-gt="message"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-gt="cancel">Cancel</button>
              <button type="button" class="btn btn-danger" data-gt="ok">Delete</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
    }

    const t = (k, fallback) => (window.GT_i18n && GT_i18n.t) ? GT_i18n.t(k, null, true) : fallback;
    modalEl.querySelector("[data-gt='title']").textContent = title || t("common.confirm", "Confirm");
    modalEl.querySelector("[data-gt='message']").textContent = message || "";
    modalEl.querySelector("[data-gt='ok']").textContent = confirmText || t("common.delete", "Delete");
    modalEl.querySelector("[data-gt='cancel']").textContent = cancelText || t("common.cancel", "Cancel");

    const modal = new bootstrap.Modal(modalEl);
    return await new Promise((resolve) => {
      const okBtn = modalEl.querySelector("[data-gt='ok']");
      const cancelBtn = modalEl.querySelector("[data-gt='cancel']");

      const cleanup = () => {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        modalEl.removeEventListener("hidden.bs.modal", onCancel);
      };

      const onOk = () => {
        cleanup();
        modal.hide();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      modalEl.addEventListener("hidden.bs.modal", onCancel);
      modal.show();
    });
  }

  return {
    // spinners
    withSpinner,
    withOverlaySpinner,
    showOverlay,
    hideOverlay,

    // notifications / dialogs
    toast,
    confirm,
    alert,

    // UI formatters
    statusBadge,
    formatChip,
    formatPreviewCard,
    formatDateTime,
    fillSelect
  };
})();