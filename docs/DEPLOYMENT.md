# Deployment Guide — WorkElate AI Agent

WorkElate AI uses a unified production architecture: the FastAPI backend serves both the API endpoints (`/api/...`), Server-Sent Events (SSE) streams, and the compiled Vite React frontend Single-Page Application (SPA) from a single port.

This design eliminates CORS issues, simplifies infrastructure, and allows the entire app to be deployed as a single container or service.

---

## Deployment Options at a Glance

| Method | Best For | Complexity | Cost |
| :--- | :--- | :--- | :--- |
| **[Docker / Compose](#option-1-docker--docker-compose-recommended)** | Any server / local self-hosting | Very Low | Free |
| **[Render.com](#option-2-rendercom-easy--free-tier)** | Quick cloud hosting with free tier | Zero Config | Free tier available |
| **[Railway.app](#option-3-railwayapp-1-click)** | High performance, instant GitHub sync | Zero Config | Free trial / \$5/mo |
| **[Fly.io](#option-4-flyio)** | Fast global edge deployment | Low | Free / low cost |
| **[Linux VPS](#option-5-ubuntu--debian-linux-vps-systemd--nginx)** | Full control (AWS, DigitalOcean, Hetzner) | Medium | \$4–\$6/mo |

---

## Option 1: Docker & Docker Compose (Recommended)

WorkElate includes a production-ready, multi-stage [`Dockerfile`](file:///c:/Users/vishw/Downloads/workelate/Dockerfile) and [`docker-compose.yml`](file:///c:/Users/vishw/Downloads/workelate/docker-compose.yml).

### Step 1: Clone & Configure Environment
```bash
git clone <your-repo-url>
cd workelate
cp .env.example .env
```
Edit `.env` to supply your `GEMINI_API_KEY` (optional) and customize limits if desired.

### Step 2: Build & Launch Container
```bash
docker compose up -d --build
```

### Step 3: Access Application
- **Web Interface**: `http://localhost:8000`
- **Swagger API Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

To view logs:
```bash
docker compose logs -f
```

To stop:
```bash
docker compose down
```

---

## Option 2: Render.com (Easy & Free Tier)

Render supports automatic Docker builds directly from GitHub.

### Deploy with `render.yaml` (Blueprint)
1. Push your code to a GitHub repository.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\to$ **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect [`render.yaml`](file:///c:/Users/vishw/Downloads/workelate/render.yaml).
5. Add your `GEMINI_API_KEY` in the environment variables prompt.
6. Click **Apply**. Render will build and deploy the container on a persistent free URL:
   - **Active Live Link**: [https://workelate-agent.onrender.com/](https://workelate-agent.onrender.com/)
   - **Health API**: [https://workelate-agent.onrender.com/api/health](https://workelate-agent.onrender.com/api/health)
   - **Swagger Docs**: [https://workelate-agent.onrender.com/docs](https://workelate-agent.onrender.com/docs)

---

## Option 3: Railway.app (1-Click)

Railway provides instant Docker container deployment with automatic HTTPS.

1. Install Railway CLI or log in at [railway.app](https://railway.app).
2. Click **New Project** $\to$ **Deploy from GitHub repo**.
3. Select your `workelate` repository.
4. In Railway dashboard, go to **Variables** and add:
   - `ENVIRONMENT` = `production`
   - `PORT` = `8000`
   - `GEMINI_API_KEY` = `your_gemini_api_key`
5. Under **Settings** $\to$ **Networking**, click **Generate Domain**.
6. Railway will automatically build the `Dockerfile` and provide your public HTTPS URL.

---

## Option 4: Fly.io

Fly.io runs Docker containers directly on edge micro-VMs.

1. Install Fly CLI:
   - Windows: `pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"`
   - Mac/Linux: `curl -L https://fly.io/install.sh | sh`
2. Log in:
   ```bash
   fly auth login
   ```
3. Create persistent storage volume for the SQLite database:
   ```bash
   fly volumes create workelate_data --size 1
   ```
4. Set your Gemini API key:
   ```bash
   fly secrets set GEMINI_API_KEY="your_api_key_here"
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

---

## Option 5: Ubuntu / Debian Linux VPS (Systemd + Nginx)

For deployment on a dedicated VPS (DigitalOcean Droplet, AWS EC2, Linode, or Hetzner):

### 1. Server Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git
```

### 2. Clone Project & Build Frontend
```bash
cd /opt
sudo git clone <your-repo-url> workelate
sudo chown -R $USER:$USER /opt/workelate
cd /opt/workelate

# Build frontend static files
cd frontend
npm install
npm run build
cd ..
```

### 3. Setup Python Virtual Environment
```bash
cd /opt/workelate/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Systemd Service
Create service file `/etc/systemd/system/workelate.service`:
```ini
[Unit]
Description=WorkElate AI Agent Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/workelate/backend
Environment="PATH=/opt/workelate/backend/venv/bin"
Environment="PYTHONPATH=/opt/workelate/backend"
Environment="ENVIRONMENT=production"
Environment="DATABASE_URL=sqlite+aiosqlite:////opt/workelate/backend/workelate.db"
Environment="PORT=8000"
ExecStart=/opt/workelate/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
sudo chown -R www-data:www-data /opt/workelate
sudo systemctl daemon-reload
sudo systemctl enable workelate
sudo systemctl start workelate
sudo systemctl status workelate
```

### 5. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/workelate`:
```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Server-Sent Events (SSE) buffering disabled
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

Enable site & get free SSL with Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/workelate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

---

## Production Checklist & Best Practices

- [ ] **Disable Internal IPs**: Ensure `ALLOW_INTERNAL_IPS=false` in production.
- [ ] **Set Secret Keys**: Protect `GEMINI_API_KEY` via environment variables; never commit keys to Git.
- [ ] **SSE Buffering**: When using Nginx, ensure `proxy_buffering off;` and `proxy_read_timeout 300s;` so SSE execution updates stream live to clients.
- [ ] **Database Backup**: If using SQLite in Docker/VM, mount `/app/data` to a persistent volume. If scaling to multiple instances, switch `DATABASE_URL` to PostgreSQL (`postgresql+asyncpg://user:pass@host:5432/workelate`).
- [ ] **CORS Settings**: Set `CORS_ORIGINS` to `["https://your-domain.com"]` in production.
