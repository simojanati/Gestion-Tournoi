window.GT_auth = (() => {
  const P = window.GT_CONFIG?.STORAGE_PREFIX || "GT_";
  const KEY = P + "session";

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  }
  function setSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function clear() { localStorage.removeItem(KEY); }

  function requireAuth() {
    const s = getSession();
    if (!s || !s.token) window.location.href = "login.html";
    return s;
  }

  async function login(email, password) {
    const data = await GT_api.login(email, password);
    setSession({ token: data.token, user: data.user });
    return data;
  }

  return { getSession, setSession, clear, requireAuth, login };
})();