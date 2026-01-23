#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/digital-shadow"
BACKEND_DIR="$APP_DIR/backend"
USER="seb"
GROUP="seb"
PORT=8001

echo "Starting Digital Shadow v0.2 Installation..."

# 1. Unzip and Setup Directories
echo "Extracting package..."
if [ -d "deploy_stage" ]; then rm -rf deploy_stage; fi
# Unzip to temp dir first to avoid perm issues then move
unzip -o deploy-ds-v2.zip -d digital-shadow-install
sudo rm -rf $APP_DIR
sudo mv digital-shadow-install/deploy_stage $APP_DIR
rm -rf digital-shadow-install

# Fix Permissions
echo "Setting permissions..."
sudo chown -R $USER:$GROUP $APP_DIR
sudo chmod -R 755 $APP_DIR

# 2. Setup Python Environment
echo "Setting up Python environment..."
cd $BACKEND_DIR
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Database Migrations
echo "Running database migrations..."
# Update alembic.ini to use production URL if not already set (it should be in .env)
# The .env file is already copied to requirements root in the zip creation step? 
# Wait, let's check zip structure.
# Zip contains: backend/, frontend_build/, alembic.ini, requirements.txt, .env, credentials.json
# Structure on server:
# /var/www/digital-shadow/
#   backend/
#   frontend_build/
#   alembic.ini
#   requirements.txt
#   .env
#   credentials.json

# Move root files to backend where app expects them or link them?
# backend/app/core/config.py reads .env from execution dir or parent?
# Usually python-dotenv finds it.
# Let's move root files into backend/ for consistency with local dev structure if needed, 
# OR execute from root.
# The previous local dev had .env in backend/.
# Our zip structure put them in root of zip.
# Let's move them to backend/ to match local dev structure exactly.

mv ../.env .
mv ../alembic.ini .
mv ../credentials.json .
# requirements.txt is already utilized.

# Run migrations
export PYTHONPATH=$PYTHONPATH:.
alembic upgrade head

# 4. Setup Systemd Service
echo "Configuring Systemd..."
sudo bash -c "cat > /etc/systemd/system/digital-shadow.service <<EOF
[Unit]
Description=Digital Shadow v0.2
After=network.target

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$BACKEND_DIR
Environment=\"PATH=$BACKEND_DIR/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable digital-shadow
sudo systemctl restart digital-shadow

# 5. Setup Nginx (Simple Proxy)
# We use Nginx to forward port 80 (or whatever) to 8001?
# PRD says "Single service on port 8001 (staff.naskaus.com via cloudflared)".
# If cloudflared points to localhost:8001, we don't technically need Nginx listening on 80/443.
# However, usually it's good to have basic Nginx for logs or if cloudflared points to nginx.
# Assumption: Cloudflared points to http://localhost:8001 directly?
# "Existing Services... Nginx configs provided"
# Let's assume we proceed without Nginx for now as requested "FastAPI serves static files".
# But wait, "Remove old nginx configs if they exist (we will overwrite)."
# This implies we SHOULD provide one.
# Let's provide a basic one listening on 80 (internal) that proxies to 8001.

echo "Configuring Nginx..."
sudo bash -c "cat > /etc/nginx/sites-available/digital-shadow <<EOF
server {
    listen 80;
    server_name staff.naskaus.com;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"

# Enable site
if [ -f /etc/nginx/sites-enabled/digital-shadow ]; then
    sudo rm /etc/nginx/sites-enabled/digital-shadow
fi
sudo ln -s /etc/nginx/sites-available/digital-shadow /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t && sudo systemctl reload nginx

echo "Installation Complete!"
echo "Service status:"
sudo systemctl status digital-shadow --no-pager
