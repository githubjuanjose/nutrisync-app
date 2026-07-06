# NutriSync — publish package

One site, ready for Cloudflare:

- `index.html` — **the marketing site** (entry point): hero, platform, science, pricing, "See NutriSync in action", team, waitlist — everything as built.
  - **Health Flows has two views**: a Mobile app / Web app toggle — both are **prototypes**. Mobile cards open the phone prototype in-page; Web cards open the web app in **prototype mode** (`app.html#demo-<screen>`): full navigation on demo data, no account needed, with a "Prototype · demo data" badge.
  - Every **"Open the app"** button → `app.html` (the **live** product: real sign-up/login against Supabase).
  - Footer **Team access** (Investors / Builders, code `123456`) still works, including the embedded hub documents.
  - Footer **"Prototype"** link keeps the original phone prototype reachable for the team.
- `app.html` — **the responsive customer web application**: mobile-first (bottom tabs → icon rail → sidebar).
  - **Backend-wired (Supabase, same project as the mobile apps):** real sign-up/log-in, session routing (no session → login · session without cycle → onboarding · else → home), onboarding persisted to `users` + `cycles`, daily check-in / NutriLog / Movement / Edit Period writes, mobile-identical cycle & phase math, and the 5-component CAS engine writing `daily_scores`. Data export (JSON) and delete-account work from Data & Privacy.
  - **One step to go live:** the anon key is a placeholder. Open `app.html`, find `SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_PUBLISHABLE_KEY'` and paste the same anon/publishable key the mobile apps use (public + safe under RLS). Until then the app runs in demo mode (Olivia persona), so nothing breaks.
  - Beta tips from the wiring spec: turn OFF "Confirm email" in Supabase → Auth settings; full auth-record deletion needs a service-role Edge Function (noted as backend follow-up).
- `hub/` — investor/builder documents embedded by the team rooms.
- `assets/` — logos + team photos.

## Publish on Cloudflare Pages (drag & drop)

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name the project (e.g. `nutrisync`) and drag this whole folder in.
3. Deploy → live at `https://nutrisync.pages.dev` (add your own domain under **Custom domains**).

## Email whitelist

Cloudflare **Zero Trust → Access → Applications** → Add self-hosted app for your domain → policy **Allow → Emails** → paste your list. Visitors get a one-time email code; everyone else is blocked.

## Updating later

Re-export from the workspace and re-upload the folder; Pages keeps version history.
