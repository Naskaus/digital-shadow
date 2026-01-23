#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/digital-shadow-v2"
DB_USER="seb"
DB_PASS="sEb@dB1217"
DB_NAME="digital_shadow"
SERVICE_NAME="digital-shadow-v2"
PORT=8001

echo ">>> Starting Digital Shadow v0.2 Installation..."

# 1. Install System Dependencies
echo ">>> Installing PostgreSQL and system dependencies..."
sudo apt-get update
sudo apt-get install -y postgresql libpq-dev unzip python3-venv acl

# 2. Setup PostgreSQL
echo ">>> Setting up PostgreSQL..."
# Check if user exists, if not create
if ! sudo -u postgres psql -t -c '\du' | grep -qw "$DB_USER"; then
    echo "Creating database user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
    echo "User $DB_USER already exists, updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

# Check if DB exists, if not create
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Creating database $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
else
    echo "Database $DB_NAME already exists."
fi

# Grant privileges (just in case)
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 3. Application Setup
echo ">>> Setting up Application in $APP_DIR..."

# Create directory
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Unzip (assuming deploy-ds-v2.zip is in home dir ~/)
ZIP_FILE="$HOME/deploy-ds-v2.zip"
if [ -f "$ZIP_FILE" ]; then
    echo "Unzipping $ZIP_FILE..."
    unzip -o "$ZIP_FILE" -d "$APP_DIR"
    
    # Adjust structure if needed (zip structure: backend/, frontend_build/, .env, etc. at root)
    # The zip contents are dumped directly into APP_DIR. 
    # expected: $APP_DIR/backend, $APP_DIR/frontend_build, $APP_DIR/.env
else
    echo "ERROR: $ZIP_FILE not found!"
    exit 1
fi

# 4. Update .env with correct DB credentials
echo ">>> Configuring .env..."
ENV_FILE="$APP_DIR/.env"
# We need to ensure the connection string is correct for asyncpg
# Escape password for sed if needed, although simple replacement is safer implies writing the whole line.
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://$DB_USER:${DB_PASS//%/\%}%40localhost:5432/$DB_NAME|g" "$ENV_FILE"
# Wait, the password sEb@dB1217 needs URL encoding? 
# @ -> %40
# The original .env had sEb%%40dB1217 (double % for python config interpolation maybe? or just verify)
# Let's write the exact known working string.
# Using sEb%40dB1217 for the URL encoding of @
echo "DATABASE_URL=postgresql+asyncpg://$DB_USER:sEb%40dB1217@localhost:5432/$DB_NAME" >> "$ENV_FILE.tmp"
grep -v "DATABASE_URL=" "$ENV_FILE" >> "$ENV_FILE.tmp"
mv "$ENV_FILE.tmp" "$ENV_FILE"

# 5. Virtualenv & Dependencies
echo ">>> Setting up Python environment..."
cd $APP_DIR
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

# 6. Database Migrations
echo ">>> Running Database Migrations..."
# Ensure alembic uses the correct env
export DATABASE_URL="postgresql+asyncpg://$DB_USER:sEb%40dB1217@localhost:5432/$DB_NAME"
# We need to run alembic from backend/ dir or point to it?
# backend/alembic.ini expects script_location = alembic
# struct: 
#   backend/alembic/
#   backend/alembic.ini
# But in our zip, alembic.ini is at root?
# Let's check zip content again.
# "cp backend/alembic.ini deploy_stage/" -> root of zip
# "cp -r backend deploy_stage/backend" -> backend folder
# So we have $APP_DIR/alembic.ini and $APP_DIR/backend/alembic/
# We need to make sure alembic.ini points to backend/alembic
sed -i "s|script_location = alembic|script_location = backend/alembic|g" alembic.ini

./venv/bin/alembic upgrade head

# 7. Systemd Service
echo ">>> Creating Systemd Service..."
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
ExecStart=$APP_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port $PORT
# Note: backend.main:app vs app.main:app. 
# Folder struct: backend/app/main.py.
# If we run from $APP_DIR, and backend is a package?
# Local dev was: uvicorn app.main:app (running from backend/ dir)
# Here WorkingDirectory=$APP_DIR.
# So we need 'backend.app.main:app'? 
# Let's check imports. backend/app/main.py imports 'from app.api ...'
# This requires 'app' to be importable.
# If we run from $APP_DIR, we have 'backend' folder.
# We should probably set PYTHONPATH=$APP_DIR/backend or change WorkingDirectory to $APP_DIR/backend.
# User requested: WorkingDir: /var/www/digital-shadow-v2
# ExecStart: ... backend.app.main:app
# If we do that, 'from app.api' inside main.py might fail if 'app' is not found.
# Unless 'backend' wraps 'app'.
# Let's try setting PYTHONPATH.
Environment=\"PYTHONPATH=$APP_DIR/backend\"

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

# Reload and Start
echo ">>> Starting Service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo ">>> Installation Complete!"
sudo systemctl status $SERVICE_NAME --no-pager
