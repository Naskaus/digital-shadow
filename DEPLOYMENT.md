# Digital Shadow - Deployment Guide

> **Current Production Version**: v0.3 (Stable Recovery)  
> **Production URL**: https://staff.naskaus.com  
> **Last Updated**: 2026-01-27

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Installation (Fresh Server)](#initial-installation-fresh-server)
4. [Creating a New Release](#creating-a-new-release)
5. [Deploying Updates](#deploying-updates)
6. [Manual Deployment Steps](#manual-deployment-steps)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Logs](#monitoring--logs)

---

## Infrastructure Overview

### Production Environment

| Component | Details |
|-----------|---------|
| **Server** | Raspberry Pi 5 |
| **OS** | Linux (Debian-based) |
| **SSH Access** | `seb@100.119.245.18` |
| **App Directory** | `/var/www/digital-shadow` |
| **Service Name** | `digital-shadow` (Systemd) |
| **Web Server** | Nginx (Reverse Proxy) |
| **Tunnel** | Cloudflare Tunnel |
| **Database** | PostgreSQL 17 |
| **Backend** | FastAPI (Uvicorn) on port 8001 |
| **Frontend** | React (Vite Build) served via Nginx |

### Application Structure on Server

```
/var/www/digital-shadow-v2/
├── backend/
│   ├── app/
│   ├── alembic/
│   └── requirements.txt
├── frontend_build/
│   └── (static files from frontend/dist)
├── venv/
│   └── (Python virtual environment - created on server)
├── alembic.ini
└── .env
```

---

## Prerequisites

### Local Development Machine (Windows)

- **Git** installed and configured
- **Node.js** (for frontend builds)
- **PowerShell** (for running deployment scripts)
- **SSH access** to the Raspberry Pi

### Raspberry Pi Server

- **PostgreSQL** installed and running
- **Python 3** with `venv` support
- **Nginx** configured
- **Systemd** service configured
- **Cloudflare Tunnel** active

---

## Initial Installation (Fresh Server)

> **Use this section only for setting up a new server from scratch.**

### 1. Prepare Deployment Package

On your local machine:

```powershell
# Build frontend
cd frontend
npm install
npm run build

# Create deployment staging area
mkdir deploy_stage
cp -r backend deploy_stage/backend
cp -r frontend/dist deploy_stage/frontend_build
cp backend/alembic.ini deploy_stage/
cp backend/requirements.txt deploy_stage/
cp backend/.env deploy_stage/

# IMPORTANT: Remove local venv to prevent Windows/Linux conflicts
Remove-Item -Recurse -Force deploy_stage/backend/venv -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force deploy_stage/backend/__pycache__ -ErrorAction SilentlyContinue

# Create zip
Compress-Archive -Path deploy_stage/* -DestinationPath deploy-ds-v2.zip -Force
```

### 2. Upload to Server

```powershell
scp deploy-ds-v2.zip seb@100.119.245.18:~/
scp install_app.sh seb@100.119.245.18:~/
```

### 3. Run Installation Script

SSH into the server and execute:

```bash
ssh seb@100.119.245.18
chmod +x install_app.sh
./install_app.sh
```

The `install_app.sh` script will:
- Install PostgreSQL and system dependencies
- Create database user and database
- Extract deployment package to `/var/www/digital-shadow-v2`
- Create Python virtual environment (native Linux)
- Install Python dependencies
- Run database migrations
- Create and start Systemd service

### 4. Verify Installation

```bash
sudo systemctl status digital-shadow-v2
curl http://localhost:8001/api/health
```

---

## Creating a New Release

### 1. Commit and Tag

```bash
# Ensure all changes are committed
git add .
git commit -m "Release v0.X: [Feature Description]"

# Create and push tag
git tag v0.X
git push origin main
git push origin v0.X
```

### 2. Build Frontend

```powershell
cd frontend
npm run build
```

### 3. Create Deployment Package

```powershell
# Create staging directory
$version = "v0.X"
$stageDir = "deploy_stage_$version"
mkdir $stageDir

# Copy files
cp -r backend $stageDir/backend
cp -r frontend/dist $stageDir/frontend_build
cp backend/alembic.ini $stageDir/
cp backend/requirements.txt $stageDir/

# CRITICAL: Remove Windows venv to prevent deployment issues
Remove-Item -Recurse -Force "$stageDir/backend/venv" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$stageDir/backend/__pycache__" -ErrorAction SilentlyContinue

# Create zip
Compress-Archive -Path "$stageDir/*" -DestinationPath "deploy-ds-$version.zip" -Force
```

### 4. Create Update Script

Create `update_v0_X.sh` (replace X with your version number):

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
SERVICE_NAME="digital-shadow-v2"
BACKUP_DIR="/var/www/digital-shadow-backup-$(date +%Y%m%d%H%M%S)"

echo ">>> Starting Digital Shadow v0.X Update..."

# 1. Stop Service
echo ">>> Stopping service..."
sudo systemctl stop $SERVICE_NAME

# 2. Backup
echo ">>> Backing up current version to $BACKUP_DIR..."
sudo cp -r $APP_DIR $BACKUP_DIR

# 3. Update Code
echo ">>> Updating code..."
ZIP_FILE="$HOME/deploy-ds-v0.X.zip"

if [ -f "$ZIP_FILE" ]; then
    echo "Files found at $ZIP_FILE. Extracting..."
    sudo unzip -o "$ZIP_FILE" -d "$APP_DIR"
else
    echo "WARNING: $ZIP_FILE not found."
    exit 1
fi

# 4. Fix Permissions
sudo chown -R $USER:$USER $APP_DIR

# 5. Update Dependencies
echo ">>> Updating dependencies..."
cd $APP_DIR
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

# 6. Run Migrations
echo ">>> Running Migrations..."
export PYTHONPATH=$APP_DIR/backend
sed -i "s|script_location = alembic|script_location = backend/alembic|g" alembic.ini
./venv/bin/alembic upgrade head

# 7. Restart Service
echo ">>> Restarting service..."
sudo systemctl start $SERVICE_NAME
sudo systemctl status $SERVICE_NAME --no-pager

echo ">>> Update Complete! v0.X is live."
```

---

## Deploying Updates

### Automated Deployment (Recommended)

1. **Upload deployment package and script:**

```powershell
scp deploy-ds-v0.X.zip seb@100.119.245.18:~/
scp update_v0_X.sh seb@100.119.245.18:~/
```

2. **Execute update script:**

```bash
ssh seb@100.119.245.18
chmod +x update_v0_X.sh
./update_v0_X.sh
```

3. **Verify deployment:**

```bash
sudo systemctl status digital-shadow-v2
curl http://localhost:8001/api/health
```

Visit https://staff.naskaus.com to confirm the application is running.

---

## Manual Deployment Steps

> **Use these steps if the automated script fails or for troubleshooting.**

### 1. Stop the Service

```bash
sudo systemctl stop digital-shadow-v2
```

### 2. Backup Current Version

```bash
sudo cp -r /var/www/digital-shadow-v2 /var/www/digital-shadow-backup-$(date +%Y%m%d%H%M%S)
```

### 3. Extract New Version

```bash
cd /var/www/digital-shadow-v2
sudo unzip -o ~/deploy-ds-v0.X.zip -d .
```

### 4. Fix Permissions

```bash
sudo chown -R $USER:$USER /var/www/digital-shadow-v2
```

### 5. Recreate Virtual Environment (if corrupted)

```bash
cd /var/www/digital-shadow-v2
sudo rm -rf venv
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt
```

### 6. Run Database Migrations

```bash
cd /var/www/digital-shadow-v2
export PYTHONPATH=/var/www/digital-shadow-v2/backend
sed -i "s|script_location = alembic|script_location = backend/alembic|g" alembic.ini
./venv/bin/alembic upgrade head
```

### 7. Restart Service

```bash
sudo systemctl start digital-shadow-v2
sudo systemctl status digital-shadow-v2
```

---

## Troubleshooting

### Issue: SSH Connection Timeout

**Symptoms**: Cannot connect to `seb@100.119.245.18`

**Solutions**:
- Verify the Raspberry Pi is powered on and connected to the network
- Check if Tailscale/VPN is active
- Wait a few minutes and retry
- Contact network administrator

---

### Issue: Windows `venv` in Deployment Package

**Symptoms**: 
- `rm -rf venv` fails with permission errors
- Python commands fail with "cannot execute binary file"

**Root Cause**: Local Windows `venv` was accidentally included in the zip file

**Solution**:
```bash
# On the server
cd /var/www/digital-shadow-v2
sudo rm -rf venv
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt
```

**Prevention**: Always remove `backend/venv` before creating deployment zip:
```powershell
Remove-Item -Recurse -Force deploy_stage/backend/venv -ErrorAction SilentlyContinue
```

---

### Issue: Alembic `ModuleNotFoundError: No module named 'app'`

**Symptoms**: Migration fails with `ModuleNotFoundError: No module named 'app.core.config'`

**Root Cause**: `PYTHONPATH` not set for Alembic to find the `app` module

**Solution**:
```bash
export PYTHONPATH=/var/www/digital-shadow-v2/backend
./venv/bin/alembic upgrade head
```

**Prevention**: The `update_v0_X.sh` script now includes `export PYTHONPATH=$APP_DIR/backend`

---

### Issue: `unzip` Warning Causes Script Exit

**Symptoms**: Update script exits prematurely after `unzip` with warnings about backslashes

**Root Cause**: `set -e` in script causes exit on any warning; Windows-generated zips may have path issues

**Solution**:
- Manually execute remaining steps (see [Manual Deployment Steps](#manual-deployment-steps))
- Or use `unzip -qqo` for quiet mode in future scripts

---

### Issue: Service Fails to Start

**Symptoms**: `sudo systemctl status digital-shadow-v2` shows "failed" or "inactive"

**Diagnostic Steps**:

1. **Check service logs:**
```bash
sudo journalctl -u digital-shadow-v2 -n 50 --no-pager
```

2. **Check application logs:**
```bash
tail -f /var/www/digital-shadow-v2/backend/app.log
```

3. **Test backend manually:**
```bash
cd /var/www/digital-shadow-v2
./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8001
```

**Common Causes**:
- Database connection failure (check `.env` file)
- Missing Python dependencies (reinstall from `requirements.txt`)
- Port 8001 already in use (check with `sudo lsof -i :8001`)
- Permission issues (run `sudo chown -R $USER:$USER /var/www/digital-shadow-v2`)

---

### Issue: Database Migration Fails

**Symptoms**: `alembic upgrade head` fails with errors

**Solutions**:

1. **Check database connectivity:**
```bash
psql -U seb -d digital_shadow -h localhost
```

2. **Verify `.env` file:**
```bash
cat /var/www/digital-shadow-v2/.env
# Should contain: DATABASE_URL=postgresql+asyncpg://seb:sEb%40dB1217@localhost:5432/digital_shadow
```

3. **Check migration history:**
```bash
./venv/bin/alembic current
./venv/bin/alembic history
```

4. **Manual migration (if needed):**
```bash
./venv/bin/alembic downgrade -1
./venv/bin/alembic upgrade head
```

---

## Rollback Procedures

### Quick Rollback (Using Backup)

If a deployment fails, restore from the automatic backup:

```bash
# Stop current service
sudo systemctl stop digital-shadow-v2

# Find latest backup
ls -lt /var/www/ | grep digital-shadow-backup

# Restore (replace timestamp with actual backup)
sudo rm -rf /var/www/digital-shadow-v2
sudo cp -r /var/www/digital-shadow-backup-YYYYMMDDHHMMSS /var/www/digital-shadow-v2

# Restart service
sudo systemctl start digital-shadow-v2
sudo systemctl status digital-shadow-v2
```

### Git-Based Rollback

If you need to roll back to a specific version:

```bash
# On local machine
git checkout v0.X  # Previous stable version
# Rebuild and redeploy following standard deployment process
```

---

## Monitoring & Logs

### Service Status

```bash
# Check if service is running
sudo systemctl status digital-shadow-v2

# View recent logs
sudo journalctl -u digital-shadow-v2 -n 100 --no-pager

# Follow logs in real-time
sudo journalctl -u digital-shadow-v2 -f
```

### Application Logs

```bash
# Backend logs (if configured)
tail -f /var/www/digital-shadow-v2/backend/app.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Status

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -U seb -d digital_shadow -h localhost

# View active connections
psql -U seb -d digital_shadow -c "SELECT * FROM pg_stat_activity;"
```

### Health Checks

```bash
# Backend health endpoint
curl http://localhost:8001/api/health

# Full application check
curl -I https://staff.naskaus.com
```

---

## Deployment History

| Version | Date | Key Features | Status |
|---------|------|--------------|--------|
| **v0.4** | 2026-01-24 | Analytics Update | ✅ Live |
| **v0.3** | 2026-01-23 | User Management, Data Table Fixes, RBAC | ✅ Deployed |
| **v0.2** | 2026-01-23 | Initial Production Deployment | ✅ Deployed |

---

## Security Notes

### Credentials

- **Database Password**: Contains special character `@` which must be URL-encoded as `%40` in connection strings
- **SSH Access**: Key-based authentication recommended
- **Environment Variables**: Stored in `/var/www/digital-shadow-v2/.env` (never commit to Git)

### Cookie Security

Production cookies are configured with:
- `Secure=True` (HTTPS only)
- `HttpOnly=True` (JavaScript cannot access)
- `SameSite=Lax` (CSRF protection)

---

## Support & Contacts

- **Project Repository**: [Digital-Shadow](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow)
- **Deployment Scripts**: `install_app.sh`, `update_v0_X.sh`
- **Session Logs**: `Staff_Performance/AI_Memory.md`

---

## Quick Reference Commands

```bash
# SSH into server
ssh seb@100.119.245.18

# Check service status
sudo systemctl status digital-shadow-v2

# Restart service
sudo systemctl restart digital-shadow-v2

# View logs
sudo journalctl -u digital-shadow-v2 -f

# Check database
psql -U seb -d digital_shadow -h localhost

# Test backend
curl http://localhost:8001/api/health

# Check disk space
df -h

# Check running processes
ps aux | grep uvicorn
```

---

**Last Updated**: 2026-01-27  
**Maintained By**: Development Team  
**Production URL**: https://staff.naskaus.com
