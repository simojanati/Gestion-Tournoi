/**
 * Gestion Tournoi - Apps Script backend (Code.gs)
 * - Uses Google Sheet as datastore
 * - Actions (POST): login, list, upsert, remove, bulkUpsert, removeWhere
 * - Actions (GET): ping, sheets
 *
 * NOTE: Sheet names supported (case-insensitive):
 * users, tournaments, teams, TournamentTeams, players, venues, referees, matches, results, match_events, audit_log, sync_queue
 */
const SPREADSHEET_ID = "1tMclq4y2ou1WbWxZwrhuZ9NGDf0pe8j9HlglEgddgME";
const USERS_SHEET = "users";

// Known sheets + default headers (created if missing)
const SHEET_SCHEMAS = {
  "users": ["id","email","fullName","role","isActive","passwordHash","createdAt","updatedAt"],
  "tournaments": ["id","name","sport","format","status","startDate","endDate","location","timezone","createdBy","createdAt","updatedAt","teamsCount","rulesJson"],
  "teams": ["id","sport","name","coachName","phone","createdAt","updatedAt"],
  "tournamentteams": ["id","tournamentId","teamId","groupCode","seed","createdAt","updatedAt"],
  "players": ["id","teamId","tournamentId","firstName","lastName","jerseyNumber","phone","createdAt","updatedAt"],
  "venues": ["id","name","city","address","createdAt","updatedAt"],
  "referees": ["id","fullName","phone","level","createdAt","updatedAt"],
  "matches": ["id","tournamentId","stage","groupName","homeTeamId","awayTeamId","venueId","refereeId","startTime","status","createdAt","updatedAt"],
  "results": ["id","matchId","homeScore","awayScore","status","notes","enteredBy","createdAt","updatedAt"],
  // Match details events (goals/cards/fouls/timeouts...) - keeps existing matches/results untouched
  "matchevents": ["id","matchId","sport","teamId","playerId","type","period","minute","clock","value1","value2","notes","createdBy","createdAt","updatedAt"],
  "audit_log": ["id","actorId","action","entity","entityId","message","createdAt"],
  "sync_queue": ["id","action","entity","payload","status","createdAt","updatedAt"]
};

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const action = (p.action || "ping").trim();
  if (action === "ping") {
    return jsonResponse({ ok: true, action: "ping", ts: new Date().toISOString() });
  }
  if (action === "sheets") {
    const names = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().map(s => s.getName());
    return jsonResponse({ ok: true, sheets: names });
  }
  return jsonResponse({ ok: false, error: "UNKNOWN_GET_ACTION", action });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = (p.action || "").trim();
    if (!action) return jsonResponse({ ok: false, error: "MISSING_ACTION" });

    switch (action) {
      case "login": return jsonResponse(handleLogin(p));
      case "list": return jsonResponse(handleList(p));
      case "upsert": return jsonResponse(handleUpsert(p));
      case "remove": return jsonResponse(handleRemove(p));
      case "bulkUpsert": return jsonResponse(handleBulkUpsert(p));
      case "removeWhere": return jsonResponse(handleRemoveWhere(p));
      default: return jsonResponse({ ok: false, error: "UNKNOWN_ACTION", action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: "SERVER_ERROR", message: String(err), stack: (err && err.stack) ? String(err.stack) : undefined });
  }
}

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function normSheetKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function getOrCreateSheet(name) {
  const book = ss();
  const targetKey = normSheetKey(name);

  // exact / normalized match
  const found = book.getSheets().find(sh => normSheetKey(sh.getName()) === targetKey);
  if (found) return found;

  // auto-create with schema if known
  const schema = SHEET_SCHEMAS[targetKey];
  if (!schema) {
    throw new Error("SHEET_NOT_FOUND: " + name);
  }
  const sh = book.insertSheet(name);
  sh.getRange(1, 1, 1, schema.length).setValues([schema]);
  return sh;
}

function readAll(name) {
  const sh = getOrCreateSheet(name);
  const values = sh.getDataRange().getValues();
  if (!values || values.length === 0) return { headers: [], rows: [] };
  const headers = (values[0] || []).map(String);
  const rows = values.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { headers, rows };
}

function ensureId(payload) {
  const id = (payload && payload.id) ? String(payload.id).trim() : "";
  return id ? id : Utilities.getUuid();
}

function nowIso() {
  return new Date().toISOString();
}

function findRowIndexById(name, id) {
  const sh = getOrCreateSheet(name);
  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return -1;
  const headers = (values[0] || []).map(String);
  const idCol = headers.indexOf("id");
  if (idCol < 0) throw new Error("MISSING_ID_COLUMN in sheet: " + name);

  const target = String(id).trim();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === target) return i + 1; // 1-based
  }
  return -1;
}

function handleLogin(p) {
  const email = String(p.email || "").trim().toLowerCase();
  const password = String(p.password || "");
  if (!email || !password) return { ok: false, error: "MISSING_CREDENTIALS" };

  const data = readAll(USERS_SHEET);
  const user = data.rows.find(u =>
    String(u.email || "").trim().toLowerCase() === email &&
    String(u.isActive || "").toUpperCase() === "TRUE"
  );
  if (!user) return { ok: false, error: "INVALID_LOGIN" };

  // DEV: accept "demo" (same as seed). You can replace with hashing later.
  if (password !== "demo") return { ok: false, error: "INVALID_LOGIN" };

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    }
  };
}

function handleList(p) {
  const entity = String(p.entity || "").trim();
  if (!entity) return { ok: false, error: "MISSING_ENTITY" };

  const filterKey = String(p.filterKey || "").trim();
  const filterValue = String(p.filterValue || "").trim();

  const data = readAll(entity);
  let rows = data.rows;

  if (filterKey && filterValue) {
    rows = rows.filter(r => String(r[filterKey] || "").trim() === filterValue);
  }

  return { ok: true, entity, count: rows.length, rows };
}

function handleUpsert(p) {
  const entity = String(p.entity || "").trim();
  if (!entity) return { ok: false, error: "MISSING_ENTITY" };

  const payload = JSON.parse(p.payload || "{}");
  const sh = getOrCreateSheet(entity);

  const all = sh.getDataRange().getValues();
  const headers = (all[0] || []).map(String);
  if (!headers.length) throw new Error("EMPTY_HEADERS in sheet: " + entity);

  const id = ensureId(payload);
  payload.id = id;

  const ts = nowIso();
  if (headers.includes("updatedAt")) payload.updatedAt = ts;
  if (headers.includes("createdAt") && !payload.createdAt) payload.createdAt = ts;

  const rowIndex = findRowIndexById(entity, id);
  if (rowIndex === -1) {
    const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
    sh.appendRow(newRow);
    return { ok: true, entity, mode: "insert", id };
  } else {
    const existing = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const rowValues = headers.map((h, i) => payload[h] !== undefined ? payload[h] : existing[i]);
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
    return { ok: true, entity, mode: "update", id };
  }
}

function handleRemove(p) {
  const entity = String(p.entity || "").trim();
  const id = String(p.id || "").trim();
  if (!entity || !id) return { ok: false, error: "MISSING_ENTITY_OR_ID" };

  const rowIndex = findRowIndexById(entity, id);
  if (rowIndex === -1) return { ok: false, error: "NOT_FOUND", entity, id };

  getOrCreateSheet(entity).deleteRow(rowIndex);
  return { ok: true, entity, id };
}

function handleBulkUpsert(p) {
  const entity = String(p.entity || "").trim();
  if (!entity) return { ok: false, error: "MISSING_ENTITY" };

  // Accept both parameter names for compatibility: "payload" (front) and "items" (legacy)
  const raw = (p.payload !== undefined && p.payload !== null) ? p.payload : (p.items || "[]");
  const items = JSON.parse(raw || "[]");
  if (!Array.isArray(items) || items.length === 0) return { ok: true, entity, inserted: 0, updated: 0 };

  const sh = getOrCreateSheet(entity);
  const values = sh.getDataRange().getValues();
  const headers = (values[0] || []).map(String);
  const idCol = headers.indexOf("id");
  if (idCol < 0) throw new Error("MISSING_ID_COLUMN in sheet: " + entity);

  // build map id -> rowIndex (1-based)
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const rid = String(values[i][idCol] || "").trim();
    if (rid) map[rid] = i + 1;
  }

  let inserted = 0, updated = 0;
  const ts = nowIso();

  items.forEach(it => {
    const payload = it || {};
    const id = ensureId(payload);
    payload.id = id;
    if (headers.includes("updatedAt")) payload.updatedAt = ts;
    if (headers.includes("createdAt") && !payload.createdAt) payload.createdAt = ts;

    const rowIndex = map[id];
    if (!rowIndex) {
      const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
      sh.appendRow(newRow);
      inserted++;
    } else {
      const existing = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      const rowValues = headers.map((h, i) => payload[h] !== undefined ? payload[h] : existing[i]);
      sh.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
      updated++;
    }
  });

  return { ok: true, entity, inserted, updated };
}

function handleRemoveWhere(p) {
  const entity = String(p.entity || "").trim();
  const key = String(p.key || "").trim();
  const value = String(p.value || "").trim();
  if (!entity || !key) return { ok: false, error: "MISSING_ENTITY_OR_KEY" };

  const sh = getOrCreateSheet(entity);
  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return { ok: true, entity, removed: 0 };

  const headers = (values[0] || []).map(String);
  const col = headers.indexOf(key);
  if (col < 0) return { ok: false, error: "COLUMN_NOT_FOUND", entity, key };

  let removed = 0;
  // delete bottom-up to keep indices stable
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][col] || "").trim() === value) {
      sh.deleteRow(i + 1);
      removed++;
    }
  }
  return { ok: true, entity, removed };
}
