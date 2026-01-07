# Deploy to Google Cloud Run
$ServiceName = "catapulse-studio"
$Region = "europe-west2" # UK region as indicated by "UK Business Analyst" context in code

Write-Host "Checking gcloud installation..." -ForegroundColor Cyan
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not found. Please restart your terminal or install Google Cloud SDK."
    exit 1
}

Write-Host "Running local tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tests failed! Aborting deployment."
    exit 1
}

Write-Host "Getting Project ID..." -ForegroundColor Cyan
$ProjectId = gcloud config get-value project
if (-not $ProjectId) {
    Write-Error "No project ID found. Please run 'gcloud init' or 'gcloud config set project <PROJECT_ID>'."
    exit 1
}

Write-Host "Deploying to Project: $ProjectId" -ForegroundColor Green

# Submit build to Cloud Build (eliminates need for local Docker)
Write-Host "Building container image in Cloud Build..." -ForegroundColor Cyan
gcloud builds submit --tag "gcr.io/$ProjectId/$ServiceName" .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit 1
}

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $ServiceName `
    --image "gcr.io/$ProjectId/$ServiceName" `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed."
    exit 1
}

Write-Host "Deployment Complete!" -ForegroundColor Green
