# Create Missing Packages Script
Write-Host "📦 Creating all missing packages..." -ForegroundColor Cyan

# Analytics Package
Write-Host "Creating @eatech/analytics..." -ForegroundColor Yellow
$analyticsPackageJson = @'
{
  "name": "@eatech/analytics",
  "version": "12.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "react": "^19.0.0",
    "recharts": "^2.12.0",
    "d3": "^7.9.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "packages/analytics/src" | Out-Null
Set-Content -Path "packages/analytics/package.json" -Value $analyticsPackageJson
Set-Content -Path "packages/analytics/src/index.js" -Value "// @eatech/analytics`nexport const analytics = {};"

# Feature Flags Package
Write-Host "Creating @eatech/feature-flags..." -ForegroundColor Yellow
$featureFlagsPackageJson = @'
{
  "name": "@eatech/feature-flags",
  "version": "12.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "react": "^19.0.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "packages/feature-flags/src" | Out-Null
Set-Content -Path "packages/feature-flags/package.json" -Value $featureFlagsPackageJson
Set-Content -Path "packages/feature-flags/src/index.js" -Value "// @eatech/feature-flags`nexport const useFeatureFlag = () => ({ isEnabled: true });"

# Payments Package
Write-Host "Creating @eatech/payments..." -ForegroundColor Yellow
$paymentsPackageJson = @'
{
  "name": "@eatech/payments",
  "version": "12.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "react": "^19.0.0",
    "@stripe/stripe-js": "^4.0.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "packages/payments/src" | Out-Null
Set-Content -Path "packages/payments/package.json" -Value $paymentsPackageJson
Set-Content -Path "packages/payments/src/index.js" -Value "// @eatech/payments`nexport const payments = {};"

# AI Package
Write-Host "Creating @eatech/ai..." -ForegroundColor Yellow
$aiPackageJson = @'
{
  "name": "@eatech/ai",
  "version": "12.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "react": "^19.0.0",
    "openai": "^4.0.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "packages/ai/src" | Out-Null
Set-Content -Path "packages/ai/package.json" -Value $aiPackageJson
Set-Content -Path "packages/ai/src/index.js" -Value "// @eatech/ai`nexport const ai = {};"

# Database Package
Write-Host "Creating @eatech/database..." -ForegroundColor Yellow
$databasePackageJson = @'
{
  "name": "@eatech/database",
  "version": "12.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "firebase": "^10.8.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "packages/database/src" | Out-Null
Set-Content -Path "packages/database/package.json" -Value $databasePackageJson
Set-Content -Path "packages/database/src/index.js" -Value "// @eatech/database`nexport const db = {};"

# Master App
Write-Host "Creating master app..." -ForegroundColor Yellow
$masterPackageJson = @'
{
  "name": "@eatech/master",
  "version": "12.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@eatech/ui": "workspace:*",
    "@eatech/auth": "workspace:*",
    "@eatech/core": "workspace:*",
    "@eatech/feature-flags": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "apps/master/src" | Out-Null
Set-Content -Path "apps/master/package.json" -Value $masterPackageJson

# Kitchen App
Write-Host "Creating kitchen app..." -ForegroundColor Yellow
$kitchenPackageJson = @'
{
  "name": "@eatech/kitchen",
  "version": "12.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@eatech/ui": "workspace:*",
    "@eatech/core": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "apps/kitchen/src" | Out-Null
Set-Content -Path "apps/kitchen/package.json" -Value $kitchenPackageJson

# Landing App
Write-Host "Creating landing app..." -ForegroundColor Yellow
$landingPackageJson = @'
{
  "name": "@eatech/landing",
  "version": "12.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0",
    "@eatech/ui": "workspace:*"
  }
}
'@
New-Item -ItemType Directory -Force -Path "apps/landing/src" | Out-Null
Set-Content -Path "apps/landing/package.json" -Value $landingPackageJson

# Mobile App
Write-Host "Creating mobile app..." -ForegroundColor Yellow
$mobilePackageJson = @'
{
  "name": "@eatech/mobile",
  "version": "12.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "react": "19.0.0",
    "react-native": "0.74.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "apps/mobile/src" | Out-Null
Set-Content -Path "apps/mobile/package.json" -Value $mobilePackageJson

# API App
Write-Host "Creating api app..." -ForegroundColor Yellow
$apiPackageJson = @'
{
  "name": "@eatech/api",
  "version": "12.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "firebase-admin": "^12.0.0"
  }
}
'@
New-Item -ItemType Directory -Force -Path "apps/api/src" | Out-Null
Set-Content -Path "apps/api/package.json" -Value $apiPackageJson

Write-Host ""
Write-Host "✅ All packages created!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: pnpm install" -ForegroundColor Cyan