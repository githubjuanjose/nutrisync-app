# NutriSync mobile — automated update pipeline (GitHub → OTA)

Goal: you do almost nothing. New code lands in GitHub → the app updates itself on your
phone the next time you open it. No re-installing, no Expo Go, no zips.

**How it works (the analogy):** EAS Update is to your app what a website deploy is to a web
page — publish once, and every installed app fetches the new JS bundle on next launch, the
same way a browser loads the new version of a page. Only *native* changes (a brand-new native
module) need a fresh build; everything else — screens, logic, assets — flows over-the-air.

```
 my change  →  nutrisync-app.zip  →  bash update.sh  →  git push
                                                           │
                                             GitHub Actions (eas-update.yml)
                                                           │
                                                     eas update  →  Expo servers
                                                           │
                                          your phone pulls it on next app open  ✓
```

---

## One-time setup (~15 min, once)

1. **Make a GitHub repo for the app** (flat layout — `App.tsx` at the root). From the app folder:
   ```
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/githubjuanjose/nutrisync-app.git
   git push -u origin main
   ```

2. **Link Expo + configure updates.** From the app folder:
   ```
   npm install -g eas-cli
   eas login
   eas init                 # creates the EAS project, writes the project id into app.json
   eas update:configure     # fills the updates URL + runtime version
   ```

3. **Create an Expo access token** at expo.dev → Account settings → **Access tokens** → create.
   In the GitHub repo → Settings → Secrets and variables → Actions → **New secret**:
   name `EXPO_TOKEN`, value = the token. (This is what lets CI publish updates.)

4. **Install one build on your phone that listens for updates** (replaces Expo Go):
   ```
   eas build --profile preview --platform ios     # or android
   ```
   Install it (TestFlight for iOS, direct APK for Android). This build is tied to the
   `production` update branch, so it receives every OTA update.

That's it. The workflow at `.github/workflows/eas-update.yml` is already in the repo.

---

## Ongoing — what you do per change

When I hand you a new `nutrisync-app.zip`:

1. Download it to `~/Downloads`.
2. From the app folder, run:
   ```
   bash update.sh
   ```
   That syncs the new code in, commits, and pushes to GitHub. GitHub Actions then runs
   `eas update` automatically.
3. **Open the app** — it pulls the update. Done.

So your effort per change = download + one command. Native-dependency changes (rare) will say
"run npm install" and need a new `eas build`; I'll flag those explicitly.

---

## Optional: zero-effort mode

If you authorize the **GitHub connector** in your Claude settings, I can commit and push my
changes directly to the repo. Then the pipeline runs with **no action from you at all** — you
just open the app and it's current. Until then, `bash update.sh` is the one manual step.

---

## Notes
- `eas update` publishes to the `production` **branch/channel** (matches `eas.json`).
- Roll back instantly from the Expo dashboard (Updates → republish a previous one).
- For store releases (App Store / Play), keep using the flow in `docs/10-Expo-Publishing-Guide`.
