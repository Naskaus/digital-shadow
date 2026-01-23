#!/bin/bash
set -e

SERVICE_FILE="/etc/systemd/system/digital-shadow-v2.service"

echo ">>> Fixing Systemd Service..."

# Stop service
sudo systemctl stop digital-shadow-v2

# Update ExecStart line
# Change 'backend.main:app' to 'app.main:app'
sudo sed -i 's/backend.main:app/app.main:app/g' $SERVICE_FILE

# Verify change
echo "Updated Service File:"
grep "ExecStart" $SERVICE_FILE

# Reload and Start
echo ">>> Restarting Service..."
sudo systemctl daemon-reload
sudo systemctl start digital-shadow-v2

echo ">>> Service Status:"
sudo systemctl status digital-shadow-v2 --no-pager
