# ============================================
# Digital Shadow - One Click Deployment Script
# ============================================
# Target: Raspberry Pi via Tailscale
# Author: DevOps Lead
# ============================================

param(
    [switch]$SkipBackup,
    [switch]$DryRun
)

# Configuration
$PI_IP = "100.119.245.18"
$PI_USER = "pi"
$REMOTE_PATH = "/var/www/digital-shadow"
$LOCAL_PATH = $PSScriptRoot
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$ZIP_NAME = "digital-shadow-deploy-$TIMESTAMP.zip"
$TEMP_ZIP = "$env:TEMP\$ZIP_NAME"

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     DIGITAL SHADOW - DEPLOYMENT SCRIPT         ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Step 1: Create deployment package
Write-Info "Creating deployment package..."

# Files/Folders to exclude from zip
$excludeList = @(
    ".venv",
    "venv",
    "__pycache__",
    ".git",
    "*.pyc",
    "november_data.html",
    "DATA_MASTER_2025.html",
    "*.csv",
    "deploy.ps1"
)

# Create zip with exclusions
$filesToZip = Get-ChildItem -Path $LOCAL_PATH -Recurse | Where-Object {
    $item = $_
    $exclude = $false
    foreach ($pattern in $excludeList) {
        if ($item.FullName -like "*$pattern*" -or $item.Name -like $pattern) {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

if ($DryRun) {
    Write-Warn "DRY RUN - Would zip the following files:"
    $filesToZip | ForEach-Object { Write-Host "  - $($_.FullName.Replace($LOCAL_PATH, ''))" }
    exit 0
}

# Create the zip
Compress-Archive -Path "$LOCAL_PATH\*" -DestinationPath $TEMP_ZIP -Force

# Manual exclusion by recreating zip without unwanted folders
$extractPath = "$env:TEMP\digital-shadow-staging"
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
Expand-Archive -Path $TEMP_ZIP -DestinationPath $extractPath -Force

# Remove excluded folders from staging
$excludeFolders = @(".venv", "venv", "__pycache__", ".git")
foreach ($folder in $excludeFolders) {
    $folderPath = Join-Path $extractPath $folder
    if (Test-Path $folderPath) {
        Remove-Item $folderPath -Recurse -Force
        Write-Info "Excluded: $folder"
    }
    # Also check in subdirectories
    Get-ChildItem -Path $extractPath -Directory -Recurse -Filter $folder | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
        Write-Info "Excluded: $($_.FullName.Replace($extractPath, ''))"
    }
}

# Remove large files
$excludeFiles = @("november_data.html", "DATA_MASTER_2025.html", "*.csv")
foreach ($pattern in $excludeFiles) {
    Get-ChildItem -Path $extractPath -Recurse -Filter $pattern | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Info "Excluded file: $($_.Name)"
    }
}

# Rezip clean version
Remove-Item $TEMP_ZIP -Force
Compress-Archive -Path "$extractPath\*" -DestinationPath $TEMP_ZIP -Force
Remove-Item $extractPath -Recurse -Force

$zipSize = (Get-Item $TEMP_ZIP).Length / 1MB
Write-Success "Package created: $ZIP_NAME ($([math]::Round($zipSize, 2)) MB)"

# Step 2: Upload to Pi
Write-Info "Uploading to Raspberry Pi ($PI_IP)..."
scp $TEMP_ZIP "${PI_USER}@${PI_IP}:/tmp/$ZIP_NAME"

if ($LASTEXITCODE -ne 0) {
    Write-Err "SCP upload failed!"
    exit 1
}
Write-Success "Upload complete"

# Step 3: Deploy on Pi
Write-Info "Deploying on Raspberry Pi..."

$deployScript = @"
set -e
echo '>>> Stopping service...'
sudo systemctl stop digital-shadow || true

echo '>>> Backing up current deployment...'
if [ -d "$REMOTE_PATH" ]; then
    sudo cp -r $REMOTE_PATH ${REMOTE_PATH}_backup_$TIMESTAMP
fi

echo '>>> Extracting new version...'
sudo rm -rf $REMOTE_PATH/*
sudo unzip -o /tmp/$ZIP_NAME -d $REMOTE_PATH

echo '>>> Setting permissions...'
sudo chown -R www-data:www-data $REMOTE_PATH
sudo chmod -R 755 $REMOTE_PATH

echo '>>> Restarting services...'
sudo systemctl restart digital-shadow
sudo systemctl reload nginx

echo '>>> Cleaning up...'
rm /tmp/$ZIP_NAME

echo '>>> Deployment complete!'
"@

ssh "${PI_USER}@${PI_IP}" $deployScript

if ($LASTEXITCODE -ne 0) {
    Write-Err "Remote deployment failed!"
    exit 1
}

# Cleanup local temp
Remove-Item $TEMP_ZIP -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         DEPLOYMENT SUCCESSFUL! 🚀              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Access your app at: https://your-cloudflare-tunnel-url" -ForegroundColor Cyan
Write-Host ""
