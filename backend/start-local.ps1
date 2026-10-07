$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
  throw "backend\.env is missing. Copy .env.example to .env and configure local settings."
}

$mongoListening = Test-NetConnection -ComputerName "127.0.0.1" -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $mongoListening) {
  throw "MongoDB is not listening at 127.0.0.1:27017. Start the local MongoDB service and try again."
}

if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
  throw "Backend dependencies are missing. Run npm install in the backend directory first."
}

$frontendPath = Join-Path (Split-Path $PSScriptRoot -Parent) "frontend"
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
  throw "Frontend dependencies are missing. Run npm install in the frontend directory first."
}

Push-Location $frontendPath
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "React frontend build failed; the local server was not started."
  }
}
finally {
  Pop-Location
}

$env:SERVE_FRONTEND = "true"
Write-Host "Phone Store local: http://localhost:5000"
Write-Host "API health:        http://localhost:5000/api/health"
Write-Host "Admin:             http://localhost:5000/admin"
Write-Host "Press Ctrl+C to stop."

Set-Location $PSScriptRoot
npm run dev
