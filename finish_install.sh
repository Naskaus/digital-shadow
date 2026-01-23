#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
SERVICE_NAME="digital-shadow-v2"
USER="seb"
PORT=8001

echo ">>> Rescuing Digital Shadow v0.2 Installation (Attempt 4 - The Logic Fix)..."

# 1. Clean up bad Windows files
if [ -d "$APP_DIR/backend/venv" ]; then
    echo "Removing Windows venv..."
    sudo rm -rf "$APP_DIR/backend/venv"
fi

# 2. Repair Python Environment
cd $APP_DIR
if [ ! -d "venv" ]; then
    echo "Creating venv..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r backend/requirements.txt --force-reinstall
else
    echo "venv exists, ensuring dependencies..."
    ./venv/bin/pip install -r backend/requirements.txt
fi

# 3. Force Write Correct .env (For APP - Standard URL Encoding)
echo "Overwriting .env with correct App configuration..."
# We use %40 for @. The App (Pydantic/SQLAlchemy) expects this single % encoding.
cat > .env <<EOF
DATABASE_URL=postgresql+asyncpg://seb:sEb%40dB1217@localhost:5432/digital_shadow
JWT_SECRET_KEY=prod-secret-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
GOOGLE_CREDENTIALS_PATH=./credentials.json
ENVIRONMENT=production
EOF

# 4. Patch Alembic env.py (For ConfigParser - Double % Escaping)
# The issue is Alembic's usage of ConfigParser which treats % as interpolation.
# We must escape % to %% ONLY when passing to Alembic config, not in the .env itself.
ALEMBIC_ENV_FILE="$APP_DIR/backend/alembic/env.py"
echo "Patching $ALEMBIC_ENV_FILE to handle special characters..."
# This sed replaces the line setting the option with one that escapes % -> %%
sed -i 's/config.set_main_option("sqlalchemy.url", settings.database_url)/config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))/' "$ALEMBIC_ENV_FILE"


# 5. Run Migrations
echo "Running Migrations..."
if [ -f "alembic.ini" ]; then
    sed -i "s|script_location = alembic|script_location = backend/alembic|g" alembic.ini
fi
export PYTHONPATH=$APP_DIR/backend

./venv/bin/alembic upgrade head

# 6. Re-create Systemd Service
echo "Re-creating Service File..."
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

sudo bash -c "cat > $SERVICE_FILE <<EOF
[Unit]
Description=Digital Shadow v0.2
After=network.target postgresql.service

[Service]
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
Environment=\"PATH=$APP_DIR/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"
EnvironmentFile=$APP_DIR/.env
Environment=\"PYTHONPATH=$APP_DIR/backend\"
ExecStart=$APP_DIR/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

# 7. Enable and Start
echo "Starting Service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo ">>> Rescue Complete!"
sudo systemctl status $SERVICE_NAME --no-pager
