# NutriSync → TestFlight (iOS remote testing)

This gets NutriSync onto real iPhones (Lucía, Pilar, María Paula, you) with **no tunnel, no Expo Go** — a proper signed build installed through Apple's TestFlight app.

Analogy: EAS Build is a *remote CI oven* — you hand it the source, it bakes a signed `.ipa` in Apple's format; `eas submit` is the *courier* that drops it at App Store Connect; TestFlight is the *storefront shelf* your testers pull from.

---

## 0. One-time prerequisites
- **Apple Developer Program membership active** — the $99/yr enrollment must be *complete* (not just an Apple ID). Check: <https://developer.apple.com/account> should show "Membership" with no pending verification.
- Node 20+ and the EAS CLI on your Mac:
  ```
  npm install -g eas-cli
  eas login          # your Expo account
  ```
- Run everything below from the **folder that contains `app.json`** (the unzipped `nutrisync-app`).

---

## 1. Build the signed iOS app
```
cd nutrisync-app
npm install
eas build --platform ios --profile production
```
- When prompted **"Do you want to log in to your Apple account?"** → **Yes**. Enter your Apple ID + 2FA code.
- EAS then **auto-creates** the App ID (`com.nutrisync.app`), the distribution certificate, and the provisioning profile. Accept the defaults.
- Build runs on Expo's servers (~15–25 min). It ends with a link to the finished build.

## 2. Send it to TestFlight
```
eas submit --platform ios --latest
```
- Sign in to Apple again when asked.
- When it asks for the App Store Connect app, let it **create a new one** named **NutriSync** (bundle `com.nutrisync.app`).
- Upload takes a few minutes; Apple then "processes" the build for ~5–15 min. It appears under **App Store Connect → your app → TestFlight**.

> The encryption/export-compliance question is already answered for you (`usesNonExemptEncryption: false` in `app.json`), so you won't be prompted.

---

## 3. Invite your testers — pick ONE

### Option A — External testing (recommended for the Madrid team)
Best for people who aren't on your Apple team.
1. App Store Connect → **TestFlight** → **External Testing** → **+** create a group (e.g. "Beta").
2. Add tester emails: Lucía, Pilar, María Paula (and yourself).
3. Submit the build for **Beta App Review** — a light, one-time review (~24h first build; later builds are usually instant).
4. Once approved, each tester gets an email → they install the **TestFlight** app from the App Store → tap the invite → NutriSync installs.

### Option B — Internal testing (instant, no review, but team-only)
Fastest, but each tester must be added as a **User** on your Apple team.
1. App Store Connect → **Users and Access** → invite each tester's Apple ID (role: *Developer* or *Marketing*).
2. TestFlight → **Internal Testing** → add them to the internal group.
3. Build is available to them **immediately**, no Apple review. Cap: 100 people.

For 3 external friends, **Option A** is the normal route.

---

## 4. Pushing updates later (the nice part)
Two speeds:
- **JS/content changes** (screens, copy, CAS tweaks) → **OTA, no rebuild**:
  ```
  eas update --branch production
  ```
  Testers get it on next app launch. This is already wired (channel `production`).
- **Native changes** (new SDK, added native module, icon) → rebuild + resubmit (steps 1–2). Bump `version` in `app.json` first.

---

## Common snags
| Symptom | Fix |
|---|---|
| `eas build` says no Apple membership | Enrollment still pending Apple's identity check — wait for the "Welcome" email. |
| Build fails on credentials | Re-run and let EAS manage credentials ("Set up a new one"). |
| Testers see "couldn't install" | They must install the **TestFlight** app first, then open the invite link. |
| Signup fails in the app | Supabase → Auth → turn **OFF "Confirm email"** (same fix as the web app). |
| Invalid API key | The `.env` anon key is wrong/truncated — recopy the full key, `npx expo start -c`. |

---

**Bundle:** `com.nutrisync.app` · **EAS project:** `3b124e7e-e7e8-43ed-a54c-b660a07109dc` · **OTA channel:** `production`
