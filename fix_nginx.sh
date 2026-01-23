#!/bin/bash
set -e

echo ">>> Fixing Nginx Configuration..."

# 1. Disable conflicting sites
if [ -L "/etc/nginx/sites-enabled/digital-shadow-v4" ]; then
    echo "Disabling digital-shadow-v4 (Old Config)..."
    sudo rm /etc/nginx/sites-enabled/digital-shadow-v4
fi

if [ -L "/etc/nginx/sites-enabled/digital-shadow" ]; then
    echo "Disabling digital-shadow (Potential Conflict)..."
    sudo rm /etc/nginx/sites-enabled/digital-shadow
fi

# 2. Ensure Correct Site is Enabled
SITE_AVAILABLE="/etc/nginx/sites-available/digital-shadow-v2"
SITE_ENABLED="/etc/nginx/sites-enabled/digital-shadow-v2"

if [ ! -f "$SITE_AVAILABLE" ]; then
    echo "ERROR: $SITE_AVAILABLE not found!"
    exit 1
fi

if [ ! -L "$SITE_ENABLED" ]; then
    echo "Enabling digital-shadow-v2..."
    sudo ln -s "$SITE_AVAILABLE" "$SITE_ENABLED"
fi

# 3. Test and Reload
echo "Testing Nginx Configuration..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo ">>> Nginx Fix Complete!"
echo "Active Sites:"
ls -l /etc/nginx/sites-enabled/
