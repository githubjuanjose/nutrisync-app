# NutriSync — decoupled language resources (EN/ES)

One JSON file per language, consumed by BOTH customer-facing web surfaces at load time —
edit copy here (or serve edited copies from the backend) and the apps pick it up on the
next page load. No rebuild required.

## Files
- `en.json` / `es.json` — the full string catalogs. Deployed copies live in `publish/i18n/`;
  the site fetches `i18n/{lang}.json` relative to the page.

## Sections
- `app` — the responsive web application (app.html): every screen (auth, onboarding, check-in,
  Home, NutriLog, Movement, Progress, Calendar, Edit Period/Health, Settings, Connections,
  device consent, Privacy, Security) + `phase` (per-phase content: headlines, meals, whys,
  movement plans, tips) + `ob` (onboarding questions; es only — option `k` is the canonical
  value, translate `label` only).
- `marketing` — the marketing site + phone prototype (index.html): hero, problem, science,
  CAS, platform, Health Flows, pricing, team, footer + all `px*` phone-screen keys.
- `catalog` — English→Spanish lookup for list content rendered from canonical English
  (gallery cards, foods, tags, movements, symptoms, onboarding options, provider reads…).
  Keys are the exact English strings; change values only. Empty in en.json by design.

## Rules
1. **Never change keys** (or catalog keys) — they are the contract with the code.
2. **Canonical values stay English** — everything written to Supabase (moods, options,
   symptoms, goals) is stored canonically; translations are display-only. CAS/analytics parity
   with the mobile apps depends on this.
3. Language + region selection persists in `localStorage.ns_locale` ({lang, region}) and is
   shared by the marketing site and the web app.
4. Overrides merge over built-ins: a missing key falls back to the built-in string, so partial
   edits are safe.

## Adding a language
Add `{lang}.json` (copy es.json as template), then ask design/dev to add the language to the
selector lists (`langPills`/`_setLang`) and, for the web app, a region option — a one-line
code change per surface.

## For the mobile builds (Claude Code handoff)
The same catalogs translate 1:1 to the Expo apps: use section `app` keys as the i18n bundle,
keep canonical values for storage, and read Supabase content tables in English (`phase_food`
etc.) until `*_es` content columns land (backend follow-up).