# Launch Guide - FixMy.Site on a VPS with Domain and SSL

This guide covers deploying the React + Node/Express + SQLite app on Ubuntu with Nginx and HTTPS for `fixmy.site`.

## 0) Prerequisites
- Ubuntu 22.04+ VPS with sudo access
- A-record for `fixmy.site` (and optionally `www`) pointing to your VPS public IP
- Domain you control: `fixmy.site`

## 1) SSH and base setup
```bash
ssh ubuntu@YOUR_VPS_IP
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```
Enable firewall (optional):
```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2) Install Node.js and PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
sudo npm i -g pm2@latest
```

## 3) Create app user and directories
```bash
sudo adduser --system --group --home /var/www/fixmysite fixmysite
sudo mkdir -p /var/www/fixmysite
sudo chown -R fixmysite:fixmysite /var/www/fixmysite
```

## 4) Clone code and build
```bash
sudo -u fixmysite bash -lc '
  cd /var/www/fixmysite && 
  git clone YOUR_REPO_URL app && 
  cd app && 
  npm run install-all && 
  npm run build
'
```
Notes:
- `npm run install-all` installs root and backend deps
- Frontend builds to `dist/`; backend serves `../dist` statically

## 5) Configure environment variables
Create backend env at `/var/www/fixmysite/app/backend/.env`:
```ini
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-strong-secret
OPENAI_API_KEY=sk-...
# Email (SMTP)
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-pass
EMAIL_FROM=help@fixmy.site
# Discord
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CHANNEL_ID=...
DISCORD_GUILD_ID=...
ALLOWED_ORIGINS=https://fixmy.site
CREDENTIALS_ENCRYPTION_KEY=your-32-byte-base64-or-hex-key
# Stripe (if using)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin (for dashboard Analytics page and admin-only APIs)
ADMIN_USER_IDS=1

# AI & Analytics (optional)
# Daily AI prompt limits per IP/user in addition to per-minute rate limit
AI_DAILY_LIMIT_AUTH=200
AI_DAILY_LIMIT_ANON=50
# Default due date (days) for custom invoices
INVOICE_DUE_DAYS=14

# CAPTCHA (optional; recommended if public forms are abused)
ENABLE_CAPTCHA=0
CAPTCHA_PROVIDER=turnstile
TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# Moderation (optional)
ENABLE_OPENAI_MODERATION=0
```

## 6) Start backend with PM2
```bash
sudo -u fixmysite bash -lc '
  cd /var/www/fixmysite/app/backend && 
  pm2 start server.js --name fixmysite-api
'
pm2 save
pm2 startup systemd -u fixmysite --hp /var/www/fixmysite
# Run the printed command to enable PM2 on boot
```

### 6.1) Verify analytics and AI rate limits
- Page analytics: after deployment, browse a few pages and check the `AnalyticsEvent` table grows.
  - On server: `sqlite3 /var/www/fixmysite/app/backend/database.sqlite "SELECT COUNT(*) FROM AnalyticsEvent;"`
- AI quotas: hit `/api/chat` a few times and ensure 429 is returned after the daily limit is hit (50/day anon by default).
  - Logs will show 429 responses when limits are exceeded.
Check process:
```bash
pm2 status
pm2 logs fixmysite-api --lines 100
```
Ensure DB file ownership (if created):
```bash
sudo chown fixmysite:fixmysite /var/www/fixmysite/app/backend/database.sqlite || true
```

## 7) Install and configure Nginx
```bash
sudo apt install -y nginx
sudo ufw allow 'Nginx Full'
```
Create `/etc/nginx/sites-available/fixmy.site`:
```nginx
server {
  listen 80;
  server_name fixmy.site www.fixmy.site;
  location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
  location / { return 301 https://fixmy.site$request_uri; }
}

server {
  listen 443 ssl http2;
  server_name fixmy.site www.fixmy.site;

  ssl_certificate     /etc/letsencrypt/live/fixmy.site/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/fixmy.site/privkey.pem;

  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy no-referrer-when-downgrade;
  add_header X-XSS-Protection "1; mode=block";

  root /var/www/fixmysite/app/dist;
  index index.html;

  location /assets/ {
    try_files $uri =404;
  }

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Ensure client IP is forwarded for analytics and AI quotas
    real_ip_header X-Forwarded-For;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```
Enable site:
```bash
sudo mkdir -p /var/www/letsencrypt
sudo ln -s /etc/nginx/sites-available/fixmy.site /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 8) Issue HTTPS certificates (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fixmy.site -d www.fixmy.site --redirect --agree-tos -m you@fixmy.site --non-interactive
```
Verify and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 9) Deploy updates
```bash
ssh ubuntu@YOUR_VPS_IP
sudo -u fixmysite bash -lc '
  cd /var/www/fixmysite/app && 
  git pull && 
  npm ci && npm --prefix backend ci && 
  npm run build && 
  pm2 reload fixmysite-api
'
```

## 10) DNS checklist
- A-record for `fixmy.site` (and `www`) points to VPS IP
- Check propagation: `dig fixmy.site +short`

## 11) Verification
- Backend: `curl -I http://127.0.0.1:3001/api/health`
- Site: visit `https://fixmy.site`
- WebSocket: open browser console and check for errors; or `pm2 logs fixmysite-api`
- Analytics API: `curl -I http://127.0.0.1:3001/api/admin/analytics/summary?days=1 -H "x-access-token: <ADMIN_JWT>"`
- AI daily quota: hit `/api/chat` repeatedly to validate 429 after limit

## 12) Optional hardening
- Set `NODE_ENV=production`
- Restrict CORS to `https://fixmy.site`
- Add `helmet` and `express-rate-limit` to Express
- Consider Fail2ban for Nginx

## 13) Backup and monitoring
- Back up `/var/www/fixmysite/app/backend/database.sqlite`
- Ship logs in `backend/logs` to a central system
- Uptime monitor for `https://fixmy.site/api/health`

## 14) Discord commands deployment
```bash
cd /var/www/fixmysite/app/backend
node deploy-commands.js
```
Ensure `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` are set.

## 15) Troubleshooting
- 502/504: `pm2 logs fixmysite-api`
- WebSocket failures: ensure Nginx Upgrade/Connection headers are set and backend is running
- Static 404: confirm `root` points to `/var/www/fixmysite/app/dist` and `npm run build` ran
- JWT errors: confirm `JWT_SECRET` and client sends `x-access-token`
