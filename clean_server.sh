#!/bin/bash
set -e

echo "Starting Digital Shadow v0.2 cleanup..."

# Stop old services
echo "Stopping services..."
sudo systemctl stop digital-shadow performances || echo "Services already stopped or not found"

# Disable them
echo "Disabling services..."
sudo systemctl disable digital-shadow performances || echo "Services already disabled or not found"

# Archive old folder
TIMESTAMP=$(date +%F)
OLD_DIR="/var/www/digital-shadow"
BACKUP_DIR="/var/www/digital-shadow-OLD-$TIMESTAMP"

if [ -d "$OLD_DIR" ]; then
    echo "Archiving $OLD_DIR to $BACKUP_DIR"
    sudo mv "$OLD_DIR" "$BACKUP_DIR"
else
    echo "$OLD_DIR does not exist, skipping archive."
fi

# Remove old nginx configs
echo "Removing old nginx configs..."
if [ -f /etc/nginx/sites-enabled/digital-shadow ]; then
    sudo rm /etc/nginx/sites-enabled/digital-shadow
    echo "Removed /etc/nginx/sites-enabled/digital-shadow"
fi
if [ -f /etc/nginx/sites-available/digital-shadow ]; then
    sudo rm /etc/nginx/sites-available/digital-shadow
    echo "Removed /etc/nginx/sites-available/digital-shadow"
fi
if [ -f /etc/nginx/sites-enabled/performances ]; then
    sudo rm /etc/nginx/sites-enabled/performances
    echo "Removed /etc/nginx/sites-enabled/performances"
fi
if [ -f /etc/nginx/sites-available/performances ]; then
    sudo rm /etc/nginx/sites-available/performances
    echo "Removed /etc/nginx/sites-available/performances"
fi

# Reload nginx just in case, though we will deploy new configs later
# sudo systemctl reload nginx || true

echo "Cleanup complete. Ready for new deployment."
