# Deploy Code.gs (Google Apps Script)

1. Open your Google Sheet (the one with tournament data).
2. Extensions -> Apps Script
3. Create/Replace Code.gs with the content from this folder.
4. Deploy -> New deployment -> Web app
   - Execute as: Me
   - Who has access: Anyone
5. Copy the /exec URL into your front-end config.js (SCRIPT_URL).

Quick check:
- GET:  <YOUR_EXEC_URL>?action=ping
- GET:  <YOUR_EXEC_URL>?action=sheets
