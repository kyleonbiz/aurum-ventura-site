# Aurum Ventura Enterprise LLC — Website

Single-page React site (Vite) for Aurum Ventura Enterprise LLC.

## Local development
```
npm install
npm run dev
```

## Deploy to Vercel

**Option A — Vercel dashboard (no CLI, easiest):**
1. Push this folder to a GitHub repo (or use Vercel's "drag and drop" upload if you don't want GitHub).
2. Go to vercel.com → New Project → Import your repo.
3. Vercel auto-detects Vite. Leave build settings as default (`npm run build`, output dir `dist`).
4. Click Deploy.

**Option B — Vercel CLI, from your own machine:**
```
npm install -g vercel
cd aurum-site
vercel
```
Follow the prompts (link/create project, confirm defaults). Run `vercel --prod` to push to production once you're happy with the preview URL.

## Routing

Each page has a real, shareable URL (`/`, `/services`, `/about`, `/contact`,
`/services/<slug>`) synced via the native History API in `src/App.jsx` — no
router library. `vercel.json` rewrites all paths to `index.html` so direct
links and refreshes work in production; Vite's dev server does the same
automatically.

## Before going live
- Replace `[BUSINESS EMAIL]` and `[BUSINESS PHONE]` placeholders in `src/App.jsx` (search for both — they appear in the footer, contact page, and hero areas).
- The contact form is client-side only (no backend) — it just shows a confirmation message on submit. Hook it up to an email service (e.g. Formspree, Resend, or a Vercel serverless function) before relying on it to capture real leads.
- Connect your custom domain in Vercel's Project → Settings → Domains once deployed.
