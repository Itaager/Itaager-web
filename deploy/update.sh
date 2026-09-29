#!/usr/bin/env bash
# Pull the latest code from GitHub, rebuild and restart with no downtime.
# Run on the server: bash /var/www/itaager/deploy/update.sh
set -euo pipefail

cd /var/www/itaager
git pull --ff-only
npm ci
npm run build
pm2 reload itaager
pm2 save
echo "Deployed $(git rev-parse --short HEAD)"
