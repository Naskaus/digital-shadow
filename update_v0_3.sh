#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
SERVICE_NAME="digital-shadow-v2"
BACKUP_DIR="/var/www/digital-shadow-backup-$(date +%Y%m%d%H%M%S)"

echo ">>> Starting Digital Shadow v0.3 Update..."

# 1. Stop Service
echo ">>> Stopping service..."
sudo systemctl stop $SERVICE_NAME

# 2. Backup
echo ">>> Backing up current version to $BACKUP_DIR..."
sudo cp -r $APP_DIR $BACKUP_DIR

# 3. Update Code
echo ">>> Updating code..."
# Unzip contents from current location (~) to APP_DIR
# We assume the zip was extracted here or we are running this script which was inside the zip?
# Usually we unzip the artifact to APP_DIR. 
# Let's assume the zip is at ~/deploy-ds-v0.3.zip and verify.
ZIP_FILE="$HOME/deploy-ds-v0.3.zip"

if [ -f "$ZIP_FILE" ]; then
    echo "Files found at $ZIP_FILE. Extracting..."
    # -o overwrite without prompting
    sudo unzip -o "$ZIP_FILE" -d "$APP_DIR"
    
    # Check if 'frontend_build' was extracted. If so, overwrite existing frontend
    # Note: unzip will overwrite files, but maybe not delete old ones. 
    # v0.2 structure: backend/, frontend_build/ (renamed from dist?), .env
    
else
    echo "WARNING: $ZIP_FILE not found. Assuming script is running from extracted folder?"
fi

# 4. Fix Permissions
sudo chown -R $USER:$USER $APP_DIR

# 5. Update Dependencies
echo ">>> Updating dependencies..."
cd $APP_DIR
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

# 6. Run Migrations (Critical for v0.3)
echo ">>> Running Migrations..."
# Make sure we use the correct Database URL from .env
# We need to source the .env or extract the var
set -a
source .env
set +a
# ALEMBIC_INI logic from install_app.sh:
# Ensure alembic.ini points to backend/alembic
sed -i "s|script_location = alembic|script_location = backend/alembic|g" alembic.ini

./venv/bin/alembic upgrade head

# 7. Restart Service
echo ">>> Restarting service..."
sudo systemctl start $SERVICE_NAME
sudo systemctl status $SERVICE_NAME --no-pager

echo ">>> Update Complete! v0.3 is live."
