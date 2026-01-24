# Multi-Service Deployment Script
# Deploys "catapulse-studio" (Standard) and "catapulse-studio-ai" (AI Enabled)
# Region: europe-west2 (Hardcoded to match active services)

$Region = "europe-west2"
# Use cmd /c to bypass PowerShell alias issues with gcloud
$ProjectId = cmd /c "gcloud config get-value project"

# 0. Clean & Build ONCE
Write-Host ">>> 0. CLEANING AND BUILDING PROJECT..." -ForegroundColor Data
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Build Failed!"; exit 1 }

# Helper Function
function Deploy-Variant {
    param (
        [string]$ServiceName,
        [boolean]$AiEnable
    )
    Write-Host "`n>>> DEPLOYING VARIANT: $ServiceName (AI=$AiEnable)..." -ForegroundColor Cyan

    # 1. Update Config in DIST (No rebuild needed!)
    $ConfigPath = "dist/config.js"
    $ConfigContent = Get-Content $ConfigPath -Raw
    # Regex replace the aiEnabled value
    $NewContent = $ConfigContent -replace "aiEnabled:\s*(true|false)", "aiEnabled: $($AiEnable.ToString().ToLower())"
    Set-Content -Path $ConfigPath -Value $NewContent

    Write-Host "    Updated config.js -> aiEnabled: $($AiEnable.ToString().ToLower())"

    # 2. Submit Build (This packages the current state of 'dist' into a container)
    Write-Host "    Building container image..."
    $ImageTag = "gcr.io/$ProjectId/$ServiceName"
    
    # Use cmd /c for gcloud commands to ensure they run via the Batch script in PATH
    cmd /c "gcloud builds submit --tag `"$ImageTag`" ."
    if ($LASTEXITCODE -ne 0) { Write-Error "Container Build Failed for $ServiceName"; exit 1 }

    # 3. Deploy
    Write-Host "    Deploying to Cloud Run..."
    cmd /c "gcloud run deploy $ServiceName --image `"$ImageTag`" --platform managed --region $Region --allow-unauthenticated --port 8080"
    
    if ($LASTEXITCODE -ne 0) { Write-Error "Deployment Failed for $ServiceName"; exit 1 }
    
    Write-Host ">>> $ServiceName DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
}

# --- EXECUTE ---
Write-Host "Getting Project ID..."
if (-not $ProjectId) { Write-Error "No Project ID."; exit 1 }
Write-Host "Project: $ProjectId" -ForegroundColor Green

# 1. Deploy AI Version
Deploy-Variant -ServiceName "catapulse-studio-ai" -AiEnable $true

# 2. Deploy Standard Version
Deploy-Variant -ServiceName "catapulse-studio" -AiEnable $false

Write-Host "`n>>> ALL DEPLOYMENTS COMPLETE!" -ForegroundColor Green
