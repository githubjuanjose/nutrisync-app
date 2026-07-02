# NutriSync — React Native app (Expo)

Pixel-accurate build of the Figma app. Runs on iOS + Android via **Expo Go** so the
team in Greece & Spain can test on real phones without a build.

## Run it
```
cd mobile
cp .env.example .env      # then paste your Supabase anon key into .env
npm install
npx expo start
```
Then scan the QR code with the **Expo Go** app (iOS App Store / Google Play).
Press `i` for the iOS simulator or `a` for an Android emulator.

## Backend (Supabase)
The app is wired to the live Supabase project. Set your anon (publishable) key in `.env`
(`EXPO_PUBLIC_SUPABASE_ANON_KEY`) — the same key the web app uses. With it set:
- **Create account / Log in** use Supabase Auth (email + password).
- **Onboarding answers persist** to `users` + `cycles` on the "Enter NutriSync" step.
- **Home** reads your cycle back and computes today's **phase + cycle day** live via the CAS
  engine (`src/lib/cas.ts`), so it shows real data — not the mockup values.
- Session persists (AsyncStorage), so you stay logged in; the navigator routes you to
  onboarding or the app automatically.

> For a smooth beta, turn **off** "Confirm email" in Supabase Auth settings so sign-up returns a
> session immediately. Without the anon key, the app stays on the Welcome/Login screen.

## What's built so far
- **Foundation:** theme tokens (colours, phase palette, spacing, radius), Poppins + Baloo 2
  fonts, reusable UI (buttons, progress bar, Nutri mascot, signature `PhaseRing`).
- **Navigation:** full stack + 5-tab bottom nav (Calendar · Cycle · NutriLog · Movement · Progress),
  with the entire onboarding flow wired so you can walk Welcome → onboarding → main app.
- **Screens complete (from Figma):**
  - `Welcome` (Role Selection, node 79:3040)
  - `Cycle` / Home (Home Page/Phase, node 66:3215) — header, week strip, phase ring, action pills
  - **Onboarding flow** — Beta Welcome, Cycle Info (cycle length, period length), Health Condition
    (multi-select), Hormonal Contraceptives, Nutritional Preferences, City, Consent, All Set —
    driven by `src/screens/onboarding/steps.ts` + a shared `OnboardingLayout` + `SelectList`.
- **Screens stubbed (navigable placeholders, being built next):** Login, Create account,
  NutriLog, MovementLog, Progress, Calendar, Edit Period/Health, Settings, Notifications, plus
  the remaining onboarding steps (last-period date, symptoms, allergies, age/height/weight).

## Publishing
See `docs/10-Expo-Publishing-Guide.md` for the full EAS build/submit/OTA workflow. `eas.json`
build + submit profiles are already in this folder — fill the Apple/Google placeholders in
`submit.production` before `eas submit`.

## Structure
```
mobile/
  App.tsx                 font loading + navigation container
  src/theme.ts            design tokens
  src/ui/                 NutriOrb, Buttons, ProgressBar, PhaseRing
  src/navigation/         RootNavigator, MainTabs, types
  src/screens/            onboarding/, main/, Placeholder
```

## Fidelity notes
- Built from the live Figma frames (rendered screenshots + layout metadata).
- The Nutri mascot and phase-ring wave fill are faithful vector re-creations; drop in the
  exact exported SVG paths from Figma for final 1:1 if desired.
- Phase colours follow the developer spec (menstrual #E8472A, follicular #6B9E6B,
  ovulatory #D4A017, luteal #7B5EA7). If you switch the whole product to the warm
  marketing palette, change `phaseColor` in `src/theme.ts` only.
