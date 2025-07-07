# EATECH Functions - Standalone Installation
# This bypasses the monorepo workspace issues

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "EATECH Functions - Standalone Install" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Save current directory
$originalDir = Get-Location

# Change to functions directory
Set-Location $PSScriptRoot

Write-Host "[1/5] Cleaning up old files..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
}

Write-Host "[2/5] Creating temporary isolated environment..." -ForegroundColor Yellow

# Create a temporary directory for isolated installation
$tempDir = "$env:TEMP\eatech-functions-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy package.json to temp directory
Copy-Item "package.json" -Destination "$tempDir\package.json"

# Change to temp directory
Set-Location $tempDir

Write-Host "[3/5] Installing dependencies in isolated environment..." -ForegroundColor Yellow

# Install with --no-workspaces flag
& npm install --no-workspaces --legacy-peer-deps

# If that fails, try without any workspace detection
if ($LASTEXITCODE -ne 0) {
    Write-Host "Retrying with different approach..." -ForegroundColor Yellow
    $env:NPM_CONFIG_WORKSPACES = "false"
    & npm install --legacy-peer-deps
}

Write-Host "[4/5] Moving dependencies back to functions directory..." -ForegroundColor Yellow

# Move node_modules back to functions directory
Move-Item -Path "node_modules" -Destination "$originalDir\functions\node_modules" -Force
Move-Item -Path "package-lock.json" -Destination "$originalDir\functions\package-lock.json" -Force

Write-Host "[5/5] Cleaning up..." -ForegroundColor Yellow

# Go back to functions directory
Set-Location "$originalDir\functions"

# Remove temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm run build' to compile TypeScript" -ForegroundColor White
Write-Host "2. Run 'npm run serve' to start emulators" -ForegroundColor White
Write-Host ""