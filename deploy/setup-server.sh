#!/usr/bin/env bash
# One-time VPS setup for Itaager (Ubuntu/Debian). Run as root:
#   bash deploy/setup-server.sh
# Safe to re-run: every step checks whether it is already done.
set -euo pipefail

DOMAIN="itaager.com"
EMAIL="Itaager1617@gmail.com"
REPO="git@github.com:Itaager/Itaager-web.git"
APP_DIR="/var/www/itaager"
PORT=3000
DEPLOY_KEY="/root/.ssh/itaager_deploy"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

log "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ufw ca-certificates gnupg certbot python3-certbot-nginx

log "Node.js 24"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v
command -v pm2 >/dev/null || npm install -g pm2

log "Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable

log "GitHub deploy key (read-only access to the repo)"
if [[ ! -f "$DEPLOY_KEY" ]]; then
  ssh-keygen -t ed25519 -N "" -C "itaager-vps-deploy" -f "$DEPLOY_KEY"
fi
if ! grep -q "Host github.com" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config
fi
ssh-keyscan -H github.com >> /root/.ssh/known_hosts 2>/dev/null

until git ls-remote "$REPO" >/dev/null 2>&1; do
  echo
  echo "Add this key on GitHub: repo Itaager/Itaager-web -> Settings -> Deploy keys -> Add deploy key"
  echo "(title: itaager-vps, leave 'Allow write access' OFF)"
  echo
  cat "$DEPLOY_KEY.pub"
  echo
  read -rp "Press Enter after adding the key... "
done
echo "GitHub access OK"

log "Code"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi

if [[ ! -f "$APP_DIR/.env.local" ]]; then
  log "Environment file"
  cat > "$APP_DIR/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://vovxczcuajhixxvknunm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kQ4-XZ77S8ZG0AqAb8D2gg_OmE0Cycz
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
EOF
  chmod 600 "$APP_DIR/.env.local"
fi

log "Build"
cd "$APP_DIR"
npm ci
npm run build

log "Start with PM2"
if pm2 describe itaager >/dev/null 2>&1; then
  pm2 reload itaager
else
  pm2 start npm --name itaager -- start -- -p "$PORT" -H 127.0.0.1
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null

log "Nginx"
cat > /etc/nginx/sites-available/itaager <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN _;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf /etc/nginx/sites-available/itaager /etc/nginx/sites-enabled/itaager
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "HTTPS"
SERVER_IP="$(curl -fsS https://api.ipify.org || true)"
DNS_IPS="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | tr '\n' ' ')"
if [[ "$DNS_IPS" == "$SERVER_IP " ]]; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
else
  echo "Skipping HTTPS: $DOMAIN resolves to [$DNS_IPS] but this server is $SERVER_IP."
  echo "Fix the DNS A record, then run: certbot --nginx -d $DOMAIN -d www.$DOMAIN -m $EMAIL --agree-tos --redirect"
fi

log "Done"
curl -fsS -o /dev/null -w "Local check: HTTP %{http_code}\n" "http://127.0.0.1:$PORT/" || true
echo "Site: http://$SERVER_IP  |  https://$DOMAIN (once DNS + HTTPS are ready)"
