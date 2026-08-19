# Case Register — Child Protection

A standalone build of the case intake, registry, analytics, and reporting
app, ready to deploy on Vercel.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `npx vercel` from inside it).
2. Import the repo in Vercel — it auto-detects Vite, no config needed.
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — your Anthropic API key (from console.anthropic.com).
     This powers the "Auto-fill form" and "Add AI executive summary"
     features via the `/api/claude` serverless function. Without it, the
     rest of the app (entry, registry, analytics, CSV, Sheet sync) still
     works fine — those two AI buttons will just show an error if clicked.
4. Deploy. Your team can then open the same Vercel URL.

## Connecting your Google Sheet

Same as before: deploy `gsheet_sync_script.gs` in your Sheet's Apps Script
(Extensions → Apps Script → Deploy → New deployment → Web app, access set
to "Anyone"), then paste the resulting `/exec` URL into **Connect Sheet**
inside the app. Test the URL directly in a browser tab first
(`.../exec?action=list`) — you should see JSON, not a login page.

## Notes

- Case data is **not** stored in this app itself — it lives in your Google
  Sheet, read and written live through the Apps Script endpoint. Nothing
  is stored on Vercel.
- The Sheet sync URL is remembered per-browser via `localStorage`, so each
  teammate pastes it once on their own device.
- The Anthropic API key stays server-side in the `/api/claude` function —
  it is never sent to the browser.
