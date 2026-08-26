# iNWebTools — Production Deployment Guide

This guide describes how to deploy and operate **iNWebTools** in production using Docker Compose, systemd, or modern cloud VPS providers (Ubuntu 24.04 / Debian 12).

---

## 1. System Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU Cores | 4+ vCPU Cores |
| **RAM** | 2 GB RAM | 4 GB - 8 GB RAM |
| **Disk Storage** | 20 GB SSD | 50 GB+ NVMe SSD |
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS / Debian 12 |
| **Container Engine**| Docker Engine 26+ | Docker Engine & Compose v2 |

---

## 2. Environment Configuration

Create a production `.env` file inside `WebApplication/`:

```env
# Runtime Environment
NODE_ENV=production
PORT=5000
PUBLIC_APP_URL=https://inwebtools.com

# PostgreSQL Database
DATABASE_URL=postgres://inwebtools_user:your_secure_db_password@127.0.0.1:5432/inwebtools
DB_NAME=inwebtools
DB_USER=inwebtools_user
DB_PASSWORD=your_secure_db_password

# Authentication & Security
JWT_SECRET=generate_a_64_character_random_secret_string_here
CORS_ORIGIN=https://inwebtools.com

# AI & Voice/Audio Processing (Optional)
HUGGINGFACE_API_KEY=hf_your_production_token
ASR_MODEL=openai/whisper-large-v3-turbo
```

---

## 3. Deployment with Docker Compose (Recommended)

### Step 1: Clone Repository & Setup Environment
```bash
git clone https://github.com/iNAYATechLab/iNWebTools.git
cd iNWebTools/WebApplication
cp .env.example .env
nano .env # update your production secrets
```

### Step 2: Build and Launch Containers
```bash
docker compose build --no-cache
docker compose up -d
```

### Step 3: Run Database Migrations
```bash
docker compose exec app npm run db:migrate
docker compose exec app npm run db:doctor
```

### Step 4: Verify Health Status
```bash
docker compose ps
curl -I http://localhost:5000/health
```

---

## 4. Standalone Bare-Metal / VPS Deployment

### Step 1: Install Node.js 22 LTS & PostgreSQL 17
```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# PostgreSQL 17
sudo apt-get install -y postgresql postgresql-contrib
```

### Step 2: Build Client & Start API via PM2
```bash
cd /var/www/iNWebTools/WebApplication
npm ci
npm run build

# Start with PM2 Process Manager
npm install -g pm2
pm2 start server/index.js --name "inwebtools-api" -i max
pm2 save
pm2 startup
```

### Step 3: Configure Nginx & SSL Certificate
```bash
sudo cp nginx.conf /etc/nginx/sites-available/inwebtools.conf
sudo ln -s /etc/nginx/sites-available/inwebtools.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Install Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d inwebtools.com -d www.inwebtools.com
```

---

## 5. Routine Maintenance & Operations

- **Viewing Real-time Logs**:
  ```bash
  docker compose logs -f app
  # or bare-metal:
  pm2 logs inwebtools-api
  ```
- **Automated Database Backups**:
  ```bash
  pg_dump -U inwebtools_user -d inwebtools -Fc > /backups/inwebtools_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Updating to New Platform Releases**:
  ```bash
  git pull origin main
  npm ci
  npm run build
  pm2 restart inwebtools-api
  ```
