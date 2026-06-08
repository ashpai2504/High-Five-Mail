# 🙌 High Five Mailer

A small internal web tool for Hunter Industries representatives. Upload a **High Five**
recognition spreadsheet, and the tool uses **Google Gemini** to write a warm recognition
email for each row, then gives you back the same spreadsheet with an extra **Email Link**
column. Clicking a link opens **Outlook** with the To, CC, subject, and body pre-filled.

- **To** = `Recipient` + `LandscapeDivisionLeadership@hunterindustries.com`
- **CC** = `Recipient Manager` + `Submitted`
- **Body** = AI-written from that row's `Comments`, following your system prompt, with your plain-text signature appended

> The signature is plain text only — a `mailto:` body can't carry a rich/graphical
> (logo, colors) signature. Set it in the **Signature** box in the UI.

The Gemini API key lives **only on the server** (a Vercel serverless function) and is never
exposed to the browser.

## How it works

| File | Purpose |
|------|---------|
| `index.html` | Frontend (upload, prompt, generate, download). Static. |
| `api/generate.js` | Vercel serverless function. Calls Gemini with the server-side key. |
| `hunter-logo.svg` | Hunter Industries logo used in the header. |

The spreadsheet needs these columns (case/space-insensitive):
`Recipient`, `Recipient Manager`, `Submitted`, `Comments`.

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this there).
2. In [Vercel](https://vercel.com), **Add New… → Project** and import this repo.
   No build settings needed — it's a static site plus an `api/` function.
3. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Google Gemini API key (get one at <https://aistudio.google.com/apikey>)
   - `GEMINI_MODEL` = `gemini-2.5-flash-lite` *(optional; this is the default)*
4. **Deploy**. Open the URL, upload a sheet, and click **Test connection** to confirm the key works.

## Cross-device settings sync (optional)

The **Subject**, **System prompt**, and **Signature** are saved automatically. By default they
save only in the current browser. To make edits persist server-side and appear on **any device
after a refresh**, add a Redis store:

1. Vercel → **Storage** → **Create Database** → **Upstash for Redis** (or "KV") → connect it to this project.
   Vercel auto-injects the connection env vars (`KV_REST_API_URL` / `KV_REST_API_TOKEN`,
   or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — both naming styles are supported).
2. Redeploy. The Step 2 header will now show **“✓ Synced across devices.”**

Without a store, the tool still works — it just shows *"Saved on this device only."*

## Local development

```bash
npm i -g vercel
cp .env.example .env      # put your real key in .env (gitignored)
vercel dev                # serves index.html + /api/generate locally
```

Opening `index.html` directly with `file://` will **not** work because it needs the
`/api/generate` endpoint — use `vercel dev` (or the deployed site).

## Notes & limits

- **Name resolution:** Links use display names (not email addresses); Outlook resolves them

