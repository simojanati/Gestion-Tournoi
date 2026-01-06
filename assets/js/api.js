window.GT_api = (() => {
  const url = () => window.GT_CONFIG?.SCRIPT_URL;

  async function post(params) {
    const body = new URLSearchParams(params);
    const res = await fetch(url(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });
    const data = await res.json();
    if (!data.ok) throw data;
    return data;
  }

  function login(email, password) {
    return post({ action: "login", email, password });
  }

  function list(entity, filterKey, filterValue) {
    const p = { action: "list", entity };
    if (filterKey && filterValue !== undefined && filterValue !== null && String(filterValue).trim() !== "") {
      p.filterKey = filterKey;
      p.filterValue = String(filterValue);
    }
    return post(p);
  }

  function upsert(entity, payload) {
    return post({ action: "upsert", entity, payload: JSON.stringify(payload || {}) });
  }

  function bulkUpsert(entity, payloadArray) {
    // Backward/forward compatible with different Code.gs parameter names (payload vs items)
    const json = JSON.stringify(payloadArray || []);
    return post({ action: "bulkUpsert", entity, payload: json, items: json });
  }

  function remove(entity, id) {
    return post({ action: "remove", entity, id });
  }

  function removeWhere(entity, key, value) {
    const p = { action: "removeWhere", entity, key };
    if (value !== undefined && value !== null) p.value = String(value);
    return post(p);
  }

  return { login, list, upsert, bulkUpsert, remove, removeWhere };
})();
