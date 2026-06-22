#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$HOME/midnight_pick}"
BRANCH="${BRANCH:-main}"
WEB_ROOT="${WEB_ROOT:-/var/www/midnightpick}"
PM2_APP="${PM2_APP:-midnight-api}"

cd "$APP_DIR"

echo "[deploy] pulling latest $BRANCH from GitHub"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] installing backend production dependencies"
cd "$APP_DIR/backend"
npm install --omit=dev

echo "[deploy] running database migrations"
node src/db/migrate.js

echo "[deploy] syncing frontend files to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --no-owner --no-group \
  --exclude ".git" \
  --exclude ".agents" \
  --exclude ".codex" \
  --exclude "backend" \
  --exclude "node_modules" \
  --exclude "frontend/node_modules" \
  --exclude "dump.rdb" \
  --exclude "backend/dump.rdb" \
  "$APP_DIR/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

echo "[deploy] restarting PM2 app: $PM2_APP"
pm2 restart "$PM2_APP"

echo "[deploy] done"
