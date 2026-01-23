#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
cd $APP_DIR

echo ">>> Fixing Dependencies..."
# Downgrade bcrypt to 4.0.1 which is compatible with passlib 1.7.4
./venv/bin/pip install "bcrypt==4.0.1"

echo ">>> Retrying Admin Creation..."
sudo ./run_admin_creation.sh
