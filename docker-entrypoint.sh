#!/bin/sh
set -e

# --- Persisted directories on the mounted /data volume ---------------------
mkdir -p /data/uploads

# Seed the repo's bundled media (magazine covers, PDFs, demo images) into the
# uploads volume. -n => never clobber files an editor uploaded at runtime.
cp -rn /app/uploads/. /data/uploads/ 2>/dev/null || true

# scripts/setup-magazines.mjs (and emdash's default) open ./data.db relative to
# the app root. Bridge that to the real DB on the volume so every tool writes
# the same persisted database.
ln -sf /data/data.db /app/data.db

# --- Database bootstrap ----------------------------------------------------
# First boot only: create schema, run migrations, apply the bundled seed.
# Subsequent boots keep existing content (CMS data persists across updates).
if [ ! -f /data/data.db ]; then
  echo "[entrypoint] fresh database -> seeding"
  node_modules/.bin/emdash seed seed/seed.json --on-conflict=update
fi

# Always run: register magazine issues + their media. Idempotent (ON CONFLICT
# DO NOTHING), so re-running on every deploy just adds anything new.
echo "[entrypoint] running setup-magazines"
node scripts/setup-magazines.mjs

exec "$@"
