<#
.SYNOPSIS
    Deploiement Automatise Digital Shadow v0.5 - FIX PATH & ENV
    Correction critique : Utilisation de chemins absolus pour eviter la corruption du PATH.
#>

$ServerUser = "seb"
$ServerHost = "100.119.245.18"
$RemoteTempDir = "/tmp"
$ZipName = "deploy_package.zip"
$ScriptFileName = "remote_deploy.sh"
$RemoteAppDir = "/var/www/digital-shadow"

# Correction encodage
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n>>> DEBUT DU DEPLOIEMENT DIGITAL SHADOW v0.5 [MODE ABSOLU]`n" -ForegroundColor Cyan

# --- PHASE 1 : PACKAGING (LOCAL) ---
Write-Host "[1/4] Creation du package..." -ForegroundColor Yellow

$StageDir = ".\temp_deploy_stage"
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
New-Item -ItemType Directory -Path $StageDir | Out-Null

Write-Host "   - Copie des fichiers..."
Copy-Item -Recurse -Path ".\backend" -Destination $StageDir
Copy-Item -Recurse -Path ".\frontend_build" -Destination $StageDir
Copy-Item -Path ".\backend\requirements.txt" -Destination $StageDir
Copy-Item -Path ".\backend\alembic.ini" -Destination $StageDir

# SECURITE : On retire le .env local
if (Test-Path "$StageDir\backend\.env") { Remove-Item -Force "$StageDir\backend\.env" }
if (Test-Path "$StageDir\backend\.venv") { Remove-Item -Recurse -Force "$StageDir\backend\.venv" }
if (Test-Path "$StageDir\backend\__pycache__") { Remove-Item -Recurse -Force "$StageDir\backend\__pycache__" }

if (Test-Path $ZipName) { Remove-Item -Force $ZipName }
Compress-Archive -Path "$StageDir\*" -DestinationPath $ZipName -Force
Remove-Item -Recurse -Force $StageDir
Write-Host "[OK] ZIP pret." -ForegroundColor Green


# --- PHASE 2 : SCRIPT BASH (CORRIGE) ---
Write-Host "`n[2/4] Generation du script Bash..." -ForegroundColor Yellow

# Note: On n'utilise plus 'export PATH'. On appelle les executables directement.
$BashScriptContent = @"
set -e
echo '>>> [ REMOTE ] Demarrage...'

echo '[ REMOTE ] 1. Arret Service...'
sudo systemctl stop digital-shadow || true

echo '[ REMOTE ] 2. Backup Config...'
# On tente de sauver le .env s'il existe
if [ -f $RemoteAppDir/backend/.env ]; then
    cp $RemoteAppDir/backend/.env ${RemoteTempDir}/prod.env.bak
    echo '   -> Backup OK.'
else
    echo '   -> Pas de .env existant a sauver.'
fi

echo '[ REMOTE ] 3. Nettoyage code...'
sudo rm -rf $RemoteAppDir/backend
sudo rm -rf $RemoteAppDir/frontend_build

echo '[ REMOTE ] 4. Extraction...'
# -o overwrite, -q quiet
sudo unzip -o -q ${RemoteTempDir}/${ZipName} -d $RemoteAppDir

echo '[ REMOTE ] 5. Restauration Config...'
if [ -f ${RemoteTempDir}/prod.env.bak ]; then
    sudo mv ${RemoteTempDir}/prod.env.bak $RemoteAppDir/backend/.env
    echo '   -> .env restaure.'
elif [ -f $RemoteAppDir/backend/.env.example ]; then
    # FILET DE SECURITE : Si pas de .env, on prend l'exemple
    echo '   [INFO] Pas de .env trouve. Creation depuis .env.example'
    sudo cp $RemoteAppDir/backend/.env.example $RemoteAppDir/backend/.env
else
    echo '   [ALERTE] Aucun fichier .env disponible.'
fi

echo '[ REMOTE ] 6. Dependances (pip)...'
# CORRECTION CRITIQUE : Chemin absolu vers le pip du venv
sudo $RemoteAppDir/venv/bin/pip install -r $RemoteAppDir/requirements.txt

echo '[ REMOTE ] 7. Verification API...'
if sudo grep -q "ANTHROPIC_API_KEY" $RemoteAppDir/backend/.env; then
    echo '   [OK] Cle presente.'
else
    echo '   [ATTENTION] ANTHROPIC_API_KEY manquante dans .env'
fi

echo '[ REMOTE ] 8. Permissions & Restart...'
sudo chown -R ${ServerUser}:${ServerUser} $RemoteAppDir
sudo systemctl restart digital-shadow

echo '[ REMOTE ] Termine !'
"@

Set-Content -Path ".\$ScriptFileName" -Value $BashScriptContent -Encoding UTF8
Write-Host "[OK] Script genere." -ForegroundColor Green


# --- PHASE 3 : TRANSFERT ---
Write-Host "`n[3/4] Transfert SCP..." -ForegroundColor Yellow
scp $ZipName $ScriptFileName ${ServerUser}@${ServerHost}:${RemoteTempDir}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] SCP a echoue." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Fichiers envoyes." -ForegroundColor Green


# --- PHASE 4 : EXECUTION ---
Write-Host "`n[4/4] Execution..." -ForegroundColor Yellow

# On nettoie les fins de ligne Windows avant d'executer
$SSHCommand = "tr -d '\r' < ${RemoteTempDir}/${ScriptFileName} | bash"

ssh -t ${ServerUser}@${ServerHost} $SSHCommand

if ($LASTEXITCODE -eq 0) {
    Remove-Item -Force ".\$ScriptFileName"
    Write-Host "`n[SUCCES] Version v0.5 deployee." -ForegroundColor Green
    Write-Host "IMPORTANT : Si le site affiche une erreur 500, editez le fichier .env :" -ForegroundColor Yellow
    Write-Host "ssh ${ServerUser}@${ServerHost} 'nano $RemoteAppDir/backend/.env'" -ForegroundColor Gray
}
else {
    Write-Host "`n[ECHEC] Erreur d'execution." -ForegroundColor Red
}