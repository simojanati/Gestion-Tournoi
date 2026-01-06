window.GT_i18n = (() => {
  const LS_KEY = (window.GT_CONFIG?.STORAGE_PREFIX || "GT_") + "lang";
  let dict = {};
  let lang = localStorage.getItem(LS_KEY) || (window.GT_CONFIG?.DEFAULT_LANG || "fr");

  async function load(l) {
    const res = await fetch(`assets/i18n/${l}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("i18n load failed");
    dict = await res.json();
    lang = l;
    localStorage.setItem(LS_KEY, l);
    applyDir();
    apply();
  }

  function applyDir() {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }

  function get(path, obj) {
    return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
  }

  // If allowRaw=true, return key itself if not found.
  function t(key, vars = null, allowRaw = false) {
    const v = get(key, dict);
    if (typeof v !== "string") return allowRaw ? key : (key || "");
    if (!vars) return v;
    return Object.keys(vars).reduce((s, k) => s.replaceAll(`{${k}}`, String(vars[k])), v);
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key, null, true);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"), null, true));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title"), null, true));
    });
  }

  function currentLang(){ return lang; }

  return { load, apply, t, currentLang };
})();