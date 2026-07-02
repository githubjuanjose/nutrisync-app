#!/usr/bin/env bash
# NutriSync — one-command update.
# After you download a new nutrisync-app*.zip to ~/Downloads, run this from the
# project folder:  bash update.sh
# It copies the new code in (keeping your node_modules and .env untouched) and
# tells Expo to reload. No Finder unzipping needed.
set -e

DEST="$(cd "$(dirname "$0")" && pwd)"
ZIP=$(ls -t "$HOME/Downloads/nutrisync-app"*.zip 2>/dev/null | head -1)
[ -z "$ZIP" ] && { echo "✗ No nutrisync-app*.zip found in ~/Downloads. Download the latest one first."; exit 1; }

echo "→ Updating from: $ZIP"
TMP=$(mktemp -d)
unzip -q -o "$ZIP" -d "$TMP"

# locate the folder that actually holds App.tsx (handles flat or nested zips)
APP=$(find "$TMP" -maxdepth 3 -name App.tsx | head -1)
[ -z "$APP" ] && { echo "✗ App.tsx not found inside the zip."; exit 1; }
ROOT=$(dirname "$APP")

# sync source + assets (src is mirrored so deleted files are removed too)
rsync -a --delete "$ROOT/src/" "$DEST/src/"
[ -d "$ROOT/assets" ] && rsync -a "$ROOT/assets/" "$DEST/assets/"
for f in App.tsx index.ts package.json app.json eas.json babel.config.js tsconfig.json; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$DEST/$f"
done

echo "✓ Code updated (your .env and node_modules were left as-is)."

# If this folder is a git repo, commit + push → triggers the CI OTA update.
if [ -d "$DEST/.git" ]; then
  cd "$DEST"
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -q -m "app update $(date +%Y-%m-%d\ %H:%M)"
    git push -q && echo "✓ Pushed to GitHub → CI will publish the OTA update (app refreshes on next open)."
  else
    echo "· No changes to push."
  fi
else
  if ! diff -q "$ROOT/package.json" "$DEST/package.json" >/dev/null 2>&1; then
    echo "  Dependencies changed — run: npm install --legacy-peer-deps"
  fi
  echo "  Now reload: shake the phone in Expo Go → Reload, or restart with: npx expo start -c"
fi
