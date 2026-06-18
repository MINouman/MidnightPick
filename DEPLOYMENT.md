# Midnight Pick — Deployment Guide (first-timer friendly)

This walks you through hosting the whole system on **one DigitalOcean droplet
($6/mo, 1 GB RAM, 1 vCPU)** with **Cloudflare** in front (free CDN + free SSL).
Every step is copy-paste. Replace anything in `ALL_CAPS` or `yourdomain.com`.

> Tip: when a command fails, copy the error into your Claude Code session and
> ask — that's the fastest way through the inevitable snags.

**Architecture:** Browser → Cloudflare (CDN/SSL) → nginx (static files + reverse
proxy) → Node/Fastify (PM2) → PostgreSQL + Redis. All on one droplet.

---

## 0. Before you start — what you need
- A DigitalOcean account + the $6 droplet (create it in step 1).
- Your domain at Namecheap.
- A free Cloudflare account.
- Your code pushed to GitHub (easiest), or ready to upload from your PC.
- Your real secrets ready: SMS API key, Steadfast API/secret keys.

---

## 1. Create the droplet
In DigitalOcean: **Create → Droplets**
- **Image:** Ubuntu 24.04 LTS
- **Plan:** Basic → Regular → **$6/mo (1 GB / 1 vCPU / 25 GB)**
  *(the $4 has only 10 GB disk; the $6 gives 1 GB RAM — pick the $6)*
- **Region:** Singapore (closest to Bangladesh)
- **Authentication:** **SSH key** (recommended) or password
- **Hostname:** `midnightpick`

Create it, then copy the droplet's **public IP** (e.g. `203.0.113.10`).

---

## 2. First login + secure the server

From your computer's terminal:
```bash
ssh root@YOUR_DROPLET_IP
```

### 2a. Create a non-root user (don't run the app as root)
```bash
adduser deploy            # set a password when prompted
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy SSH access
```
Now log out and back in as `deploy`:
```bash
exit
ssh deploy@YOUR_DROPLET_IP
```

### 2b. Add swap (critical on 1 GB — prevents out-of-memory crashes)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h                   # confirm "Swap: 2.0Gi"
```

### 2c. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```
> Postgres (5432) and Redis (6379) are NOT opened — they stay on localhost only.

---

## 3. Install the software
```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL, Redis, nginx, git, build tools (bcrypt needs them)
sudo apt install -y postgresql redis-server nginx git build-essential

# PM2 (process manager) globally
sudo npm install -g pm2

node -v && psql --version && redis-server --version && nginx -v
```

---

## 4. Set up PostgreSQL + Redis

### 4a. Create the database + user
```bash
sudo -u postgres psql
```
Inside psql (replace `STRONG_DB_PASSWORD` with a password you choose):
```sql
CREATE USER midnight_user WITH PASSWORD 'STRONG_DB_PASSWORD';
CREATE DATABASE midnightpick_db OWNER midnight_user;
\q
```

### 4b. Apply the tuned configs (from this repo — see step 5 first if not cloned yet)
After you've cloned the repo in step 5, come back and run:
```bash
# Postgres tuning
sudo cp ~/midnight_pick/deploy/postgresql-tuning.conf /etc/postgresql/*/main/conf.d/zz-midnightpick.conf
sudo systemctl restart postgresql

# Redis tuning
sudo bash -c 'cat ~/midnight_pick/deploy/redis-tuning.conf >> /etc/redis/redis.conf'
sudo systemctl restart redis-server
```

---

## 5. Get the code onto the server
**Option A — GitHub (recommended):**
```bash
cd ~
git clone https://github.com/MINouman/MidnightPick.git midnight_pick

```
**Option B — upload from your PC** (run this on YOUR computer, not the server):
```bash
rsync -avz --exclude node_modules --exclude .git \
  /home/muzahid_gtrd224/midnight_pick/ deploy@YOUR_DROPLET_IP:~/midnight_pick/
```

Install backend dependencies:
```bash
cd ~/midnight_pick/backend
npm install --omit=dev
```

Now go back and do **step 4b** (apply the DB/Redis tuning).

---

## 6. Configure + migrate the backend

### 6a. Create the production `.env`
```bash
cd ~/midnight_pick/backend
cp .env.production.example .env
nano .env
```
Fill in real values. Generate the secrets with these commands (run each, paste the output):
```bash
openssl rand -base64 48      # → JWT_SECRET
openssl rand -base64 48      # → JWT_REFRESH_SECRET (use a DIFFERENT one)
openssl rand -hex 32         # → STEADFAST_WEBHOOK_BEARER_TOKEN
```
Key fields:
- `NODE_ENV=production`
- `CORS_ORIGIN=https://yourdomain.com`  *(your real domain, not localhost)*
- `DATABASE_URL=postgresql://midnight_user:STRONG_DB_PASSWORD@localhost:5432/midnightpick_db`
- `REDIS_URL=redis://127.0.0.1:6379`
- `STEADFAST_INSECURE=false`
- SMS + Steadfast keys = your real credentials
Save with `Ctrl+O`, `Enter`, exit `Ctrl+X`.

> The app **refuses to start** if any of these are wrong (localhost CORS, missing
> webhook token, etc.). That's intentional — the error tells you exactly what to fix.

### 6b. Run database migrations
```bash
npm run migrate
```
You should see `[migrate] all migrations applied.`

### 6c. Create the first admin account
The app has a one-time bootstrap endpoint (works only while no admin exists).
You'll call it in step 11 once the site is live.

---

## 7. Start the app with PM2
```bash
cd ~/midnight_pick/backend
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 logs midnight-api --lines 30     # check it started cleanly (Ctrl+C to exit)

# Survive reboots:
pm2 save
pm2 startup        # run the sudo command it prints, then `pm2 save` again

# Log rotation so logs don't fill the disk:
pm2 install pm2-logrotate
```
Quick local check:
```bash
curl http://127.0.0.1:3000/health     # → {"ok":true,...}
```

---

## 8. nginx + the frontend files

### 8a. Copy the frontend to the web root
```bash
sudo mkdir -p /var/www/midnightpick
sudo rsync -av --exclude backend --exclude node_modules --exclude .git \
  ~/midnight_pick/ /var/www/midnightpick/
sudo chown -R www-data:www-data /var/www/midnightpick
```

### 8b. Install the nginx config
```bash
sudo cp ~/midnight_pick/deploy/nginx-midnightpick.conf /etc/nginx/sites-available/midnightpick
sudo cp ~/midnight_pick/deploy/cloudflare-realip.conf /etc/nginx/conf.d/cloudflare-realip.conf
# edit the domain name in the site config:
sudo nano /etc/nginx/sites-available/midnightpick     # replace yourdomain.com
sudo ln -s /etc/nginx/sites-available/midnightpick /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```
Don't reload yet — nginx needs the SSL cert files first (step 9b).

---

## 9. Cloudflare — DNS, CDN, and free SSL

### 9a. Add your site to Cloudflare
1. Sign up at cloudflare.com → **Add a site** → enter `yourdomain.com` → **Free** plan.
2. Cloudflare gives you **two nameservers** (e.g. `xxx.ns.cloudflare.com`).
3. In **Namecheap** → Domain List → Manage → **Nameservers** → **Custom DNS** →
   paste Cloudflare's two nameservers → save. (Propagation: minutes to a few hours.)

### 9b. Create the origin SSL certificate (free, lasts 15 years)
In Cloudflare: **SSL/TLS → Origin Server → Create Certificate** → Create.
Copy the two blocks it shows. On the server:
```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/midnightpick.pem    # paste the CERTIFICATE block
sudo nano /etc/ssl/cloudflare/midnightpick.key    # paste the PRIVATE KEY block
sudo chmod 600 /etc/ssl/cloudflare/midnightpick.key
```
Then set **SSL/TLS → Overview → mode → Full (strict)**.

### 9c. DNS records (in Cloudflare → DNS)
Add two **A records**, both **Proxied** (orange cloud ON):
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@`   | YOUR_DROPLET_IP | Proxied |
| A | `www` | YOUR_DROPLET_IP | Proxied |

### 9d. Start nginx
```bash
sudo nginx -t                  # must say "syntax is ok" / "test is successful"
sudo systemctl reload nginx
sudo systemctl enable nginx
```

Visit **https://yourdomain.com** — the site should load over HTTPS. 🎉

---

## 10. Point Steadfast at your webhook
In your Steadfast merchant panel, set the webhook URL to:
```
https://yourdomain.com/webhooks/steadfast
```
and the **Authorization header** to `Bearer <your STEADFAST_WEBHOOK_BEARER_TOKEN>`
(the `openssl rand -hex 32` value from step 6a). The app rejects any webhook
without the exact token.

---

## 11. Verify end-to-end
```bash
# Health (through Cloudflare):
curl https://yourdomain.com/health

# Create the first admin (do this ONCE; replace values):
curl -X POST https://yourdomain.com/api/v1/auth/admin/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```
Then in a browser:
- Open the shop, place a test order.
- Log into the admin dashboard, move the order to "delivered", confirm points/commission.
- Check `pm2 logs midnight-api` for errors.

---

## 12. Day-2 operations (keep this handy)
```bash
pm2 status                       # is the app running?
pm2 logs midnight-api            # live logs
pm2 restart midnight-api         # restart after a config change
free -h                          # memory (watch swap usage)
df -h                            # disk space

# Deploy an update:
cd ~/midnight_pick && git pull
cd backend && npm install --omit=dev && npm run migrate && pm2 restart midnight-api
# Re-copy frontend if it changed:
sudo rsync -av --exclude backend --exclude node_modules --exclude .git \
  ~/midnight_pick/ /var/www/midnightpick/

# Nightly database backup (optional but wise) — add to crontab -e:
0 3 * * * pg_dump -U midnight_user midnightpick_db | gzip > ~/backups/db-$(date +\%F).sql.gz
```

---

## 13. Troubleshooting quick map
- **App won't start / `pm2 logs` shows "Refusing to start"** → a `.env` value is
  wrong; the message names it. Fix `.env`, `pm2 restart midnight-api`.
- **502 Bad Gateway** → Node isn't running. `pm2 status`, `pm2 logs`.
- **Site won't load / SSL error** → DNS not propagated yet, or Cloudflare SSL mode
  isn't "Full (strict)", or cert files are wrong. Recheck step 9.
- **Redirect loop** → Cloudflare SSL mode is "Flexible"; switch to "Full (strict)".
- **Out of memory** → confirm swap is on (`free -h`); confirm Postgres/Redis tuning
  applied (steps 4b). `pm2 restart midnight-api`.
- **Rate limiting affects everyone at once** → `cloudflare-realip.conf` not loaded;
  recheck step 8b and `sudo nginx -t`.

When stuck, paste the exact error into Claude Code and we'll work it out.
