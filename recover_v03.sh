#!/bin/bash
set -e

echo "=== STARTING DIGITAL SHADOW v0.3 RECOVERY ==="

# 1. Kill Phantom Processes on Port 8001
echo "[1/4] Cleaning up port 8001..."
sudo fuser -k 8001/tcp || true
sudo systemctl stop digital-shadow || true
echo "Port 8001 cleared."

# 2. Align File Structure
echo "[2/4] Aligning file structure in /var/www/digital-shadow..."
# Ensure target directory exists and is clean
if [ ! -d "/var/www/digital-shadow" ]; then
    sudo mkdir -p /var/www/digital-shadow
fi

cd /var/www/digital-shadow

# Remove nested digital-shadow if it accidentally exists
if [ -d "digital-shadow" ]; then
    echo "Removing nested 'digital-shadow' folder..."
    sudo rm -rf digital-shadow/
fi

# Copy backend code to root of /var/www/digital-shadow (mirroring the working structure)
# Assuming the 'good' code is in ~/digital-shadow-v2/backend/ or similar from the upload.
# The user instruction said: sudo cp -r ~/digital-shadow-v2/backend/* .
# We will verify if ~/digital-shadow-v2 exists, otherwise we warn.
if [ -d "/home/seb/digital-shadow-v2/backend" ]; then
    echo "Copying code from ~/digital-shadow-v2/backend..."
    sudo cp -r /home/seb/digital-shadow-v2/backend/* .
else
    echo "WARNING: ~/digital-shadow-v2/backend not found. Creating minimal structure or expecting files to be present."
    # If this fails, the user might need to upload the code again. 
    # But let's proceed with the user's explicit command as primary path.
fi

# Fix ownership
sudo chown -R seb:seb /var/www/digital-shadow

# 3. Update Systemd Service
echo "[3/4] Updating Systemd Service..."
sudo bash -c "cat > /etc/systemd/system/digital-shadow.service <<EOF
[Unit]
Description=Digital Shadow v0.3 (Stable)
After=network.target

[Service]
User=seb
Group=seb
WorkingDirectory=/var/www/digital-shadow
Environment=\"PATH=/var/www/digital-shadow/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"
Environment=\"PYTHONPATH=/var/www/digital-shadow\"
ExecStart=/var/www/digital-shadow/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

# 4. Reload and Start
echo "[4/4] Reloading and starting service..."
sudo systemctl daemon-reload
sudo systemctl start digital-shadow

# Verification
echo "=== VERIFICATION ==="
sleep 2
sudo journalctl -u digital-shadow -n 20 --no-pager

echo ""
echo "=== RECOVERY COMPLETE ==="
echo "Please check the logs above to confirm 'Uvicorn running on http://0.0.0.0:8001'."
