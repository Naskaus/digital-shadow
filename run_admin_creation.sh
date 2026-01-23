#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
cd $APP_DIR

export PYTHONPATH=$APP_DIR/backend
export ENVIRONMENT=production

# Run the python script using the venv python
./venv/bin/python3 create_admin.py
