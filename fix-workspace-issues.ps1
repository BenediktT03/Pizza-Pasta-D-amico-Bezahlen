# EATECH - Fix Workspace Package Issues
# This script fixes version conflicts in the monorepo

Write-Host "🔧 Fixing workspace package issues..." -ForegroundColor Cyan

$rootPath = "C:\Users\Benedikt Thomma\Documents\Eatech"

# Fix 1: Remove non-existent package from mobile
$mobilePkgPath = "$rootPath\apps\mobile\package.json"
if (Test-Path $mobilePkgPath) {
    Write-Host "Fixing mobile package.json..." -ForegroundColor Yellow
    $content = Get-Content $mobilePkgPath -Raw
    $content = $content -replace '"react-native-widget-kit":\s*"[^"]*",?\s*', ''
    Set-Content $mobilePkgPath $content
}

# Fix 2: Update vite-bundle-visualizer in web
$webPkgPath = "$rootPath\apps\web\package.json"
if (Test-Path $webPkgPath) {
    Write-Host "Fixing web package.json..." -ForegroundColor Yellow
    $content = Get-Content $webPkgPath -Raw
    $content = $content -replace '"vite-bundle-visualizer":\s*"\^0\.10\.3"', '"vite-bundle-visualizer": "^1.2.1"'
    Set-Content $webPkgPath $content
}

# Fix 3: Update expo packages in mobile
if (Test-Path $mobilePkgPath) {
    Write-Host "Updating expo packages..." -ForegroundColor Yellow
    $content = Get-Content $mobilePkgPath -Raw
    $content = $content -replace '"expo-firebase-recaptcha":\s*"~3\.0\.0"', '"expo-firebase-recaptcha": "^2.3.1"'
    $content = $content -replace '"expo-firebase-analytics":\s*"~9\.0\.0"', '"expo-firebase-analytics": "^8.0.0"'
    $content = $content -replace '"@types/react-native":\s*"~0\.79\.0"', '"@types/react-native": "^0.73.0"'
    Set-Content $mobilePkgPath $content
}

Write-Host "✅ Package issues fixed!" -ForegroundColor Green

# Now install everything properly
Write-Host "📦 Installing all dependencies..." -ForegroundColor Cyan
Set-Location $rootPath
npm install --legacy-peer-deps

Write-Host "✅ Installation complete!" -ForegroundColor Green