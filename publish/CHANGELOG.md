# NutriSync — Release Notes / Change Log

## 2026-07-07 — Onboarding language selector + eu/oc native review (v11.42)
- **Web app**: the onboarding wizard now carries the language selector (EN + OS-language pills + ⋯ popover, top-right) — previously reachable only from Welcome/Log-in/Settings; all 14 languages switchable mid-wizard.
- **Basque (eu) native-review pass** (11 corrections): `Lutealea→Luteala` (wrong article stem, 4 spots), `Krucifera→Kruziferoa`, `Insomnioa→Loezina`, mood “Low” `Behean→Apal`, “Pretty unpredictable” `ezustekoa→aurreikusezina`, “consistency beats intensity” now takes the dative (`intentsitateari irabazten dio`), time/date phrasing (`6:40an sinkronizatuta`, `martxoaren 11a`), luteal insight re-phrased.
- **Aranese (oc) native-review pass** (9 corrections): typo `penents→pendents`, `miegdia→miègdia`, `Destalh→Detalh`, dropped the non-Occitan personal “a” (`Coneish Nutri`), gender agreement `fruts arroges→arrois` (2×), `chía→chia`, `sincronizat as 6:40`, notes placeholder now “Bèra causa mès sus aué…”. Distinctive Aranese forms (junhsèga, hèr, hièstra, tath, piòc) verified correct.
- Both packs’ `_note` now records the review; packs are runtime-fetched so no app rebuild was needed for them.

## 2026-07-07 — Footer disclaimer: Madrid only (v11.41)
- Disclaimer reverted to “… Made with care in Madrid.” in the built-in EN/ES **and all 12 language packs** (each in its own language; Greek article and Japanese phrasing hand-corrected after the automated trim).

## 2026-07-07 — Mobile watermark QA + footer wings (v11.40)
- **Mobile-width QA (390 px) of every watermark**: hero, Problem, Science, CAS card, Connected Health, Pricing and Team all read cleanly with text fully legible. One failure found and fixed — **Platform (“Everything in one place”)** had its wings at 38% section height, which on mobile's tall card stack landed far below the header; repositioned to the header's right edge (coral, 10%).
- **Footer no longer watermark-free**: the old 4% flat logo is now the white wings mark at 8% — full brand coverage, every section + footer.

## 2026-07-07 — Watermarks visible everywhere (v11.39)
- **Fixed invisible watermarks**: the Problem, Everything-in-one-place (Platform) and Connected Health wings were painting behind the page background (stacking-context bug) — they now show as intended.
- **New wings added**: Team (“Built by women, for women” — coral, right edge), the See-NutriSync-in-action section behind BOTH prototype tabs (coral left behind the mobile grid · ink right behind the web grid), and the opened phone-prototype backdrop (fixed ink mark, lower right of the desk).
- Every section of the marketing page now carries a visible brand watermark, always behind content.

## 2026-07-07 — Brand watermarks: stronger + every section (v11.38)
- **Existing wings watermarks made more visible**: hero 8→12%, science band 5→9%, Health Flows gallery 5→9%, pricing 6→10%.
- **New wings watermarks added** so every major section carries the brand: the Problem (ink, right), the CAS orange card (white, bottom-left), Platform (coral, left), and Connected Health (ink, bottom-right) — all masked/faded, never touching content. Team keeps its solid mark; the closing CTA keeps its animated wings.

## 2026-07-07 — Onboarding radial sweep + Escape-to-close (v11.37)
- **Onboarding wizard** (8-step questionnaire) and the **Connect-a-device** permission screen moved onto the radial-peach background — no screen in the prototype remains on the old linear gradient.
- **Escape key closes the language popovers** on desktop, in both the marketing/prototype and the web app (complements click-outside-to-close).

## 2026-07-07 — Popover polish + Meet-Nutri / All-set sweep (v11.36)
- **Language popovers now close on any click/tap outside** (all five locations, web + prototype) and show **4 rows** before scrolling.
- **Meet-Nutri and All-set screens** moved off the old linear gradient onto the radial-peach background — the whole pre-auth journey (Welcome → Log in → Create → Meet Nutri → All set) now shares one Figma-matched backdrop.

## 2026-07-07 — Login/Create Figma sweep · named demo nav · scrollable language menu (v11.35)
- **Phone Login & Create Account aligned with the Figma/Welcome vocabulary**: radial-peach background, Poppins-Medium titles (38 px), “Create / account” two-tone with **account in brand orange**, softer grey body copy.
- **Demo-flow bar now shows screen names** (translated in all 14 languages — e.g. “Edit Period”, “已连接的应用”) instead of the n/18 counter.
- **Language menu no longer floods the screen**: the ⋯ dropdown is now a compact popover showing ~5 languages with the rest scrollable — applied in all five selector locations (marketing nav, phone Welcome, web-app Welcome, Log-in/Sign-up, Settings), now listing full language names.
- **i18n completeness**: `welTo`/`welP` welcome keys back-filled into all 12 add-on packs (derived from each pack's own marketing copy), so the web-app Welcome is translated everywhere — no more English fallback.

## 2026-07-07 — Phone-prototype Welcome matched to Figma + language selector (v11.34)
- **Selector repositioned (v11.34):** the language pills now sit in small type just below the welcome copy — they no longer overlap the status-bar antenna/battery icons.
- **Welcome Page now mirrors the Figma design** (and the web app): centered layout on the soft radial-peach background, wings mark enlarged to 156 px, “Welcome to” in Poppins Medium black with **NutriSync in brand orange**, centered grey body copy, and centered pill buttons — orange-gradient Create account, solid-white Log in.
- **Language selector added to the phone prototype**: same EN + OS-language pills + ▾ dropdown as the web app, top-right of the Welcome screen — all 14 languages, persisted across the prototype.
- **For the mobile app build**: this Welcome spec (layout, sizes, colors) and the shared `i18n/*.json` packs apply 1:1 — the mobile team should mirror this screen and reuse the packs as-is.

## 2026-07-07 — Welcome screen + full prototype flow navigation (v11.32)
- **Phone prototype Welcome aligned with the web design**: “NutriSync” renders in brand orange in the title across all 14 languages, and the Create-account button is now translated (was hardcoded English).
- **Web app now opens on a Welcome screen** matching the Figma design — black wings mark, black + orange title, orange Create-account / white Log-in pills, and the full language selector (pills + ▾) available before signing in.
- **Demo flows navigate back & forth**: web #demo mode gets a floating bottom bar — Back to site · ‹ · n / 18 · › — and **swipe left/right** moves between screens; the phone prototype keeps its ‹ › arrows + ← Gallery and now also supports **swipe gestures**.

## 2026-07-06 — Logo pass (v11.30): favicons + gallery & team brand marks
- **Browser-tab identity:** favicon + apple-touch-icon (NutriSync wings) added to both the marketing site and the web app.
- Faint ink wings watermark behind the **Health Flows** gallery header; small coral wings mark introducing the **Team** section.
- Brand moments now: header logo · hero / science / pricing / gallery watermarks · team mark · animated CTA wings · footer logo · favicons.

## 2026-07-06 — Brand watermarks across the marketing page (v11.29)
- Faded NutriSync wings watermarks now appear in three places: the **hero** (coral, top-right, fading downward), the dark **science band** (white, right edge, fading left) and the **pricing section** (coral, bottom-left, fading upward) — subtle 5–8% opacity brand moments that complement the enlarged header logo and the animated wings in the closing CTA.

## 2026-07-06 — Japanese (日本語) live · 14/14 languages complete · hero brand watermark
- **Japanese shipped in one pack** — `i18n/ja.json` carries `app`, `marketing` and `catalog` sections. JA appears in both selectors; web app, marketing page and phone prototype fully translated.
- **The language rollout is complete: all 14 supported languages live end-to-end** (EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL, OC, ZH, JA). Aranese & Basque: native-speaker review recommended before production. Investor & Builder rooms stay EN/ES by design.
- **Brand presence:** large faded NutriSync wings watermark added behind the hero (top-right, fading out downward) — complements the enlarged header logo and the animated wings in the closing CTA.

## 2026-07-06 — Chinese (中文) live end-to-end
- **Simplified Chinese (continental) shipped in one pack** — `i18n/zh.json` carries `app`, `marketing` and `catalog` sections. ZH now appears in both selectors; web app, marketing page and phone prototype are fully translated.
- Live end-to-end: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL, OC, ZH · remaining: JA (日本語).

## 2026-07-06 — Aranese marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Aranese** — `i18n/oc.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Aranese is complete end-to-end. **Native-speaker review strongly recommended before production.**
- Marketing + web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL, OC · remaining: ZH (中文), JA (日本語).

## 2026-07-06 — Valencian marketing packed · Aranese live in the web app
- This pack (v11.25) is the first to ship the **Valencian marketing translation** (merged in the previous build) — Valencian is complete end-to-end.
- **Aranese (Aranés, Occitan of Val d'Aran) app pack shipped** (`i18n/oc.json`) — OC now appears in the web-app selector; its marketing section follows next. **Native-speaker review strongly recommended before production.**
- Web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL, OC · marketing live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL · remaining: OC marketing, ZH, JA.

## 2026-07-06 — Valencian marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Valencian** — `i18n/val.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Valencian is now complete end-to-end.
- Marketing + web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL · remaining: OC (Aranés), ZH, JA.

## 2026-07-06 — Valencian live in the web app
- **Valencian (Valencià, AVL forms) app pack shipped** (`i18n/val.json`) — VAL now appears in the web-app selector; its marketing section follows next.
- Web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL, VAL · marketing live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL.

## 2026-07-06 — Galician marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Galician** — `i18n/gl.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Galician is now complete end-to-end.
- Marketing + web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL · next: VAL (Valencià), OC (Aranés), ZH, JA.

## 2026-07-06 — Galician live in the web app
- **Galician (Galego) app pack shipped** (`i18n/gl.json`) — GL now appears in the web-app selector; its marketing section follows next.
- Web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU, GL · marketing live: EN, ES, FR, DE, IT, NL, EL, CA, EU.

## 2026-07-06 — Basque marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Basque** — `i18n/eu.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Basque is now complete end-to-end (native-speaker review recommended before production).
- Marketing + web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU · next: GL (Galego), VAL (Valencià), OC (Aranés), ZH, JA.

## 2026-07-06 — Basque live in the web app
- **Basque (Euskara) app pack shipped** (`i18n/eu.json`) — EU now appears in the web-app selector; its marketing section follows next. Native-speaker review recommended before production.
- Web-app live: EN, ES, FR, DE, IT, NL, EL, CA, EU · marketing live: EN, ES, FR, DE, IT, NL, EL, CA.

## 2026-07-06 — Catalan marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Catalan** — `i18n/ca.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Catalan is now complete end-to-end.
- Marketing + web-app live: EN, ES, FR, DE, IT, NL, EL, CA · next: EU (Euskara), OC (Aranés), VAL (Valencià), GL (Galego), ZH, JA.

## 2026-07-06 — Catalan live in the web app
- **Catalan (Català) app pack shipped** (`i18n/ca.json`) — CA now appears in the web-app selector; its marketing section follows next.
- Web-app live: EN, ES, FR, DE, IT, NL, EL, CA · marketing live: EN, ES, FR, DE, IT, NL, EL.

## 2026-07-06 — Greek marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Greek** — `i18n/el.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Data-only change; no rebuild.
- Marketing live: EN, ES, FR, DE, IT, NL, EL · web-app live: EN, ES, FR, DE, IT, NL, EL — the seven core languages are now complete end-to-end. Next: CA, EU, OC, VAL, GL, ZH, JA packs (app + marketing).

## 2026-07-06 — Dutch marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Dutch** — `i18n/nl.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Data-only change; no rebuild.
- Marketing live: EN, ES, FR, DE, IT, NL · web-app live: EN, ES, FR, DE, IT, NL, EL · next: EL marketing, then CA, EU, OC, VAL, GL, ZH, JA packs.

## 2026-07-06 — Italian marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in Italian** — `i18n/it.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Data-only change; no rebuild.
- Marketing live: EN, ES, FR, DE, IT · web-app live: EN, ES, FR, DE, IT, NL, EL · next: NL/EL marketing, then CA, EU, OC, VAL, GL, ZH, JA packs.

## 2026-07-06 — German marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in German** — `i18n/de.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections, same contract as French. Data-only change; no rebuild.
- Marketing live: EN, ES, FR, DE · web-app live: EN, ES, FR, DE, IT, NL, EL · next: IT/NL/EL marketing, then CA, EU, OC, VAL, GL, ZH, JA packs.

## 2026-07-06 — French marketing site live
- **The marketing page (and the phone prototype inside it) is now fully translated in French** — `i18n/fr.json` carries the `marketing` (283 keys) and `catalog` (335 entries) sections. Picking FR translates hero, sections, pricing, footer, gallery cards and prototype screens; Investor & Builder rooms stay EN/ES by design.
- The last hardcoded ES/EN copy in the marketing engine (science section, Nutri intro, check-in gate, calendars, tip labels) now routes through the language packs — German, Italian, Dutch and Greek marketing sections can ship as data only.

## 2026-07-06 — Marketing selector parity
- Language pills and dropdown now show **ISO codes** (EN · ES · FR · DE · IT · NL · EL …) instead of full names, on both the marketing site and the web app.
- The marketing page's language selector matches the web app: [EN] + [OS language / ES] pills and a ▾ dropdown listing every language the web app supports. Picking one applies it across site ↔ app (shared `ns_locale`).
- Transitional: marketing-page copy falls back to English for languages whose marketing translation hasn't shipped yet — those sections are rolling out per language. Investor & Builder rooms remain English/Spanish by design.

## 2026-07-06 — Selector: Español as standing second pill
- When the device/OS language is English (or not yet supported), the second pill now defaults to **Español** instead of leaving a lone English pill with Spanish tucked in the dropdown. Two pills are always visible: [English] + [OS language, or Español].

## 2026-07-06 — Languages: Dutch & Greek live · registry grows to 14
- **Dutch (Nederlands) and Greek (Ελληνικά) are live in the web app** (`i18n/nl.json`, `i18n/el.json`).
- **Chinese (中文, continental) and Japanese (日本語) added to the supported set** — 14 languages total; each appears in the selector once its pack ships.
- Shipped: EN, ES, FR, DE, IT, NL, EL · pending: CA, EU, OC (Aranés), VAL, GL, ZH, JA — plus marketing-site sections per language (marketing page gates to EN/ES until then). Investor & Builder rooms stay EN/ES by design.

## 2026-07-06 — Hotfix: marketing page load error · Italian live
- **Fixed `index.html` failing to boot** ("Unexpected token ':'") — a malformed expression introduced with the 12-language registry in the marketing logic; both bundles now compile-checked before packaging.
- **Italian (Italiano) is live in the web app** (`i18n/it.json`). Shipped: EN, ES, FR, DE, IT · pending: NL, EL, CA, EU, OC, VAL, GL.

## 2026-07-06 — Languages: registry grows to 12 · German live
- **Supported set is now 12 languages:** Aranés, Català, Deutsch, English, Español, Euskara, Français, Galego, Italiano, Nederlands, Valencià, Ελληνικά. Each appears in the selector automatically once its `i18n/<code>.json` pack ships.
- **German (Deutsch) is live in the web app** — full professional du-form translation (`i18n/de.json`). Shipped packs so far: EN, ES (built-in), FR, DE. Pending: IT, NL, EL, CA, EU, OC, VAL, GL — plus the marketing-site sections per language.
- Scope confirmed: language packs are shared across web and mobile apps and cover both prototypes; **Investor & Builder rooms stay English/Spanish only**.

## 2026-07-06 — Languages: 7-language system + new selector
- **Language selector (marketing nav, web-app login, Settings):** two pills always visible — **[English] + [OS language]** — with a **▾ dropdown** listing the remaining supported languages alphabetically (Deutsch, Español, Français, Italiano, Nederlands, Ελληνικά). Picking from the dropdown applies the language and takes the second pill's slot. Choice persists (`ns_locale`), shared web ↔ app; backend values stay canonical English.
- **OS-language default:** first load with no saved choice follows the device language when supported.
- **French (Français) is live in the web app** — full professional translation (`i18n/fr.json`), covering auth, onboarding, daily loop, phase content, wearables, privacy & security. German, Italian, Dutch and Greek packs — and the marketing-site translations — land next; each appears in the selector automatically once its pack ships.
- i18n architecture: languages load as decoupled `i18n/<code>.json` packs (no rebuild needed); missing keys fall back to English.

## 2026-07-06 — Navigation & polish (dev-brief fixes, at source)
- **Web app · Back to site:** persistent controls — sidebar item (icon + label, collapses with the rail), a floating "← Back to site" pill fixed at the **bottom-right corner** of the auth/onboarding screens (also on mobile), and a Back-to-site row next to Log out in Settings. Replaces the stopgap floating button.
- **Web app · bigger back controls:** all in-app back links (‹ Today, ‹ Settings, ‹ Connections) are now 44px-tall pills; onboarding back is 44px with a 24px chevron.
- **Web onboarding:** Back on every step, new "Start over" (resets to step 1 and clears answers), and the browser Back button now steps the wizard back instead of leaving the flow.
- **Hub deeper back paths:** room/tab changes push history — the browser Back button steps within the hub (tab → room → landing) instead of dropping straight to the landing.
- **Bundler error overlay — root-caused, not just hidden:** the overlay only fires on a real resource miss. The one genuine miss (a Figma-typo'd mood icon, `mischevious` → `mischievous`) was fixed at source in a prior build; this build's audit confirms every dynamically-referenced asset (12 mood-face pairs, 4 phase dials, 3 Nutri bubbles, avatars, stars, check states) is declared in the bundle manifest, and both `index.html` and `app.html` load with zero console errors. The 6 "asset not found: {{ … }}" messages at export time are compile-time noise (template holes), not runtime failures. The `#__bundler_err { display:none }` rule is retained deliberately as a production safety net — a debug overlay should never reach end users even if an asset regresses — but nothing triggers it today.

## 2026-07-06 — Hub room navigation
- **Sticky room tabs:** Overview / Business case / MIS (Investors) and Overview / Documentation / Admin·MIS / Backlog (Builders) now live inside the sticky room header — always visible while scrolling any document; switching a tab returns you to the top.
- **Room switcher in header:** Investors · Builders · ← Back to site — jump Investor↔Builder directly without returning to the landing page.
- **Back control:** "← Overview" (and the active room pill) returns to that room's Overview; only "← Back to site" exits to the landing.
- **Gate at entry only:** the 123456 access gate appears when entering the hub from the site; switching rooms or tabs inside never re-locks.

## 2026-07-04 — Footer & branding
- **Footer redesign (slimmer, 3 rows):**
  - Row 1 — brand block (logo + paragraph + **Team Access**: Investors / Builders chips side by side) next to Product · Company · Legal columns.
  - Row 2 — single "STAY IN SYNC" bar: newsletter email + orange button, **App Store / Google Play badges and Instagram · LinkedIn · TikTok all on one line**.
  - Row 3 — one-line disclaimer.
- **Logo prominence:** header logo enlarged to 50 px with a larger NUTRISYNC wordmark on the main page.

---

**Package date:** July 4, 2026 · **Contents:** `index.html` (marketing) + `app.html` (web application) + `i18n/` (language resources) + `hub/` (team documents) + `assets/`

This package is self-contained and static — deploy by dragging the folder into Cloudflare Pages (see `README-PUBLISH.md`).

---

## 1 · Marketing site (`index.html`)
The original NutriSync marketing site, preserved in full: hero with live phase preview, validation/traction band, The Problem, The Science (four phases), Cycle Alignment Score, platform value props, Connected Health, pricing (Free / Premium / Employers), team, waitlist and footer.
- **Team access rooms** (footer): Investors / Builders rooms (access code `123456`) with the embedded hub documents (`hub/`).
- **"Prototype" footer link** keeps the original phone prototype reachable.

## 2 · Health Flows — two prototype views
The "See NutriSync in action" section has a **Mobile app / Web app toggle**:
- **Mobile app · prototype** — the original phone screen cards; each opens the interactive phone prototype in-page (full mobile journeys).
- **Web app · prototype** — the same journeys as web cards; each opens the web application in **prototype mode** (`app.html#demo-<screen>`): full navigation on Olivia's demo data, **no account required**, marked with a "PROTOTYPE · DEMO DATA" badge. It never touches the backend.
- **"Open the app"** buttons (nav, hero, pricing, closing CTA) lead to the **live** web application.

## 3 · Responsive web application (`app.html`)
A full customer web app translating the mobile journeys to web (sidebar-dashboard shell chosen from design options):
- **Journeys:** sign-up → 8-step onboarding → all-set → daily mood/energy check-in → Home (phase hero + Cycle Alignment ring) → NutriLog → Movement → Progress → Calendar → Edit Period → Edit Health → Settings → Connected apps → Connect device → Data & Privacy → Sign-in & Security.
- **Responsive tiers:** mobile (bottom tab bar) · tablet (icon rail) · desktop (full sidebar), fluid type/spacing throughout.
- **Data modes:** first-run empty states after sign-up; populated demo persona in prototype mode.

## 4 · Live backend (Supabase)
Wired per the backend spec — same project the mobile apps use:
- Real email/password **sign-up and login** (anon key baked in).
- **Onboarding persists** to `users` + `cycles`; daily check-in, NutriLog checks, Movement sessions and Edit Period logs write through.
- **Cycle math identical to mobile**; CAS engine computes and writes `daily_scores` (5 components).
- Privacy controls: consent toggles, **JSON export**, **delete account & data**.
- Signed-out deep links are guarded (live mode always lands on login); prototype mode is the explicit no-account path.

## 5 · Wearables & connected health
- **Connected apps** screen: 6 providers (Apple Health, Oura, Garmin, Fitbit, WHOOP, Google Fit) with connect/disconnect and **per-metric consent toggles** (sleep, HRV, resting HR, temperature, workouts, steps).
- **Connect-device flow** with read-only permission priming.
- **"From your devices"** card on Home (sleep / HRV / resting HR) driven by connections + consent.

## 6 · Bilingual EN/ES (customer-facing)
- **Professional Spanish** (tú-form, neutral es) across the web app, the marketing site and the phone prototype — every screen and journey.
- **Language selector:** EN/ES pills in the marketing nav and on the web app login; **Language & region** card in web app Settings (region drives date formats: es-ES/MX/AR/CO/US, en-US/GB/CA/AU).
- Choice persists (`localStorage.ns_locale`) and is **shared across marketing ↔ web app**.
- **Backend stays canonical English**: everything stored in Supabase keeps the canonical values used by the mobile apps, so CAS and analytics are unaffected. Investor/hub materials remain English by design.

## 7 · Decoupled language resources (`i18n/`)
- `i18n/en.json` + `i18n/es.json` hold **every customer-facing string** in three sections: `app` (web application, incl. per-phase content + onboarding), `marketing` (site + phone prototype), `catalog` (English→Spanish lookups for list content).
- Both surfaces **fetch these at page load and merge over built-ins** — copy can be edited on the server with **no rebuild**; missing keys fall back safely.
- Contract, rules and how to add a language: `i18n/README-I18N.md` (in this pack).

## 8 · Mobile-fit fixes (marketing landing)
- Header now wraps on small screens; badge and secondary nav link hidden on phones; global horizontal-overflow guard — landing renders correctly on iPhone-class widths (~400 px) with no offset/overflow.

## 9 · Visual/misc
- NutriSync logos enlarged (2×) across surfaces.
- Health Flows web cards, banner and tabs re-copied to make prototype vs live explicit (EN + ES).

---

### Known configuration notes
- Email confirmation should be **off** in Supabase Auth for a smooth beta.
- To restrict access, front the Cloudflare Pages site with **Zero Trust → Access** (email whitelist) — steps in `README-PUBLISH.md`.
- Editing copy: change `i18n/*.json` values only; never change keys or canonical stored values.
