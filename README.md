# Gestion Tournoi (Static + Sneat)

- Pages are in project root (login.html, dashboard.html, tournaments.html)
- Template assets are in /assets
- i18n: /assets/i18n/{fr,en,ar}.json
- Config: /assets/js/config.js (SCRIPT_URL)

Apps Script:
- /apps_script/Code.gs contains the backend (login/list/upsert/remove)

## Match details (events)

New sheet supported: **match_events** (auto-created by Code.gs if missing).

- Goal/cards/fouls/timeouts are stored as event-by-event rows.
- Existing logic stays unchanged: **matches** / **results** remain the source of truth for the final score.
- UI: on **Matches** page, each match now has an **Events** button to manage timeline.
