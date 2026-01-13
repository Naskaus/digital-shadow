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
$PI_USER = "seb"
$REMOTE_PATH = "/var/www/digital-shadow"
$LOCAL_PATH = $PSScriptRoot
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$ZIP_NAME = "digital-shadow-deploy-$TIMESTAMP.zip"
$TEMP_ZIP = "$env:TEMP\$ZIP_NAME"

# Colors for output
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  DIGITAL SHADOW - DEPLOYMENT SCRIPT   " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Create deployment package
Write-Info "Creating deployment package..."

# Create staging directory
$extractPath = "$env:TEMP\digital-shadow-staging"
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
New-Item -ItemType Directory -Path $extractPath -Force | Out-Null

# Copy files to staging (excluding unwanted folders)
$excludeFolders = @(".venv", "venv", "__pycache__", ".git", "node_modules")
$excludeFiles = @("november_data.html", "DATA_MASTER_2025.html", "*.csv", "deploy.ps1")

Get-ChildItem -Path $LOCAL_PATH | ForEach-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($pattern in $excludeFolders) {
        if ($item.Name -eq $pattern) {
            $shouldExclude = $true
            Write-Info "Excluding folder: $($item.Name)"
            break
        }
    }
    
    foreach ($pattern in $excludeFiles) {
        if ($item.Name -like $pattern) {
            $shouldExclude = $true
            Write-Info "Excluding file: $($item.Name)"
            break
        }
    }
    
    if (-not $shouldExclude) {
        Copy-Item -Path $item.FullName -Destination $extractPath -Recurse -Force
    }
}

# Remove __pycache__ from subdirectories
Get-ChildItem -Path $extractPath -Directory -Recurse -Filter "__pycache__" | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Info "Removed nested: $($_.Name)"
}

if ($DryRun) {
    Write-Warn "DRY RUN - Would deploy these files:"
    Get-ChildItem -Path $extractPath -Recurse | ForEach-Object { 
        Write-Host "  - $($_.FullName.Replace($extractPath, ''))" 
    }
    Remove-Item $extractPath -Recurse -Force
    exit 0
}

# Create zip from staging
Compress-Archive -Path "$extractPath\*" -DestinationPath $TEMP_ZIP -Force
Remove-Item $extractPath -Recurse -Force

$zipSize = [math]::Round((Get-Item $TEMP_ZIP).Length / 1MB, 2)
Write-Success "Package created: $ZIP_NAME ($zipSize MB)"

# Step 2: Upload to Pi
Write-Info "Uploading to Raspberry Pi ($PI_IP)..."
$scpTarget = "${PI_USER}@${PI_IP}:/tmp/$ZIP_NAME"
scp $TEMP_ZIP $scpTarget

if ($LASTEXITCODE -ne 0) {
    Write-Err "SCP upload failed!"
    exit 1
}
Write-Success "Upload complete"

# Step 3: Deploy on Pi
Write-Info "Deploying on Raspberry Pi..."

$deployCommands = @"
set -e
echo '>>> Stopping service...'
sudo systemctl stop digital-shadow 2>/dev/null || true

echo '>>> Backing up current deployment...'
if [ -d "$REMOTE_PATH" ]; then
    sudo cp -r $REMOTE_PATH ${REMOTE_PATH}_backup_$TIMESTAMP 2>/dev/null || true
fi

echo '>>> Extracting new version...'
sudo rm -rf $REMOTE_PATH/* 2>/dev/null || true
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

$sshTarget = "${PI_USER}@${PI_IP}"

# Convert CRLF to LF and execute
$deployCommands = $deployCommands -replace "`r`n", "`n"
$deployCommands | ssh $sshTarget "cat | tr -d '\r' | bash"

if ($LASTEXITCODE -ne 0) {
    Write-Err "Remote deployment failed!"
    exit 1
}

# Cleanup local temp
Remove-Item $TEMP_ZIP -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    DEPLOYMENT SUCCESSFUL!             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your app via your Cloudflare tunnel" -ForegroundColor Cyan
Write-Host ""
