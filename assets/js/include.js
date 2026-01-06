window.GT_include = async (selector, url) => {
  const host = document.querySelector(selector);
  if (!host) return;
  const res = await fetch(url, { cache: "no-store" });
  host.innerHTML = await res.text();
  // Apply i18n to loaded partial
  if (window.GT_i18n) GT_i18n.apply(host);
};