#!/bin/bash
set -e

echo ">>> Applying Nginx Configuration..."

# Move config
sudo mv digital-shadow-v2.conf /etc/nginx/sites-available/digital-shadow-v2

# Enable site
if [ -L "/etc/nginx/sites-enabled/digital-shadow-v2" ]; then
    echo "Symlink already exists."
else
    sudo ln -s /etc/nginx/sites-available/digital-shadow-v2 /etc/nginx/sites-enabled/
    echo "Symlink created."
fi

# Test and Reload
echo "Testing Nginx configuration..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo ">>> Nginx Setup Complete!"
