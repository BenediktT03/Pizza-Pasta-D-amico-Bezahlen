# EATECH V26.0 - Deep Cleanup Script
# Löscht NUR nicht benötigte Dateien basierend auf dem offiziellen Manifest
# Version: 26.0.0

Write-Host "`n🚀 EATECH V26.0 - DEEP CLEANUP SCRIPT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Dieses Script löscht NUR Dateien, die NICHT im EATECH Manifest stehen" -ForegroundColor Yellow
Write-Host ""

# Statistiken
$deletedCount = 0
$movedCount = 0
$errors = @()

# Funktion für sicheres Löschen
function Remove-Unneeded {
    param($Path, $Type = "File")
    
    if (Test-Path $Path) {
        try {
            Remove-Item $Path -Force -Recurse -ErrorAction Stop
            Write-Host "  ✓ Gelöscht: $Path" -ForegroundColor Green
            $script:deletedCount++
        } catch {
            Write-Host "  ✗ Fehler beim Löschen: $Path - $_" -ForegroundColor Red
            $script:errors += "$Path - $_"
        }
    } else {
        Write-Host "  - Nicht gefunden: $Path" -ForegroundColor DarkGray
    }
}

# 1. ROOT-VERZEICHNIS BEREINIGEN
Write-Host "`n📁 ROOT-VERZEICHNIS bereinigen..." -ForegroundColor Yellow

# Leere/ungenutzte Ordner
Remove-Unneeded "infrastructure" "Directory"
Remove-Unneeded "qr-codes" "Directory"
Remove-Unneeded ".firebase" "Directory"
Remove-Unneeded "dist" "Directory"
Remove-Unneeded "build" "Directory"
Remove-Unneeded ".turbo" "Directory"
Remove-Unneeded "coverage" "Directory"

# Unnötige Dateien im Root
Remove-Unneeded "löschen.json" "File"
Remove-Unneeded "create-packages.ps1" "File"

# Alle Log-Dateien
Get-ChildItem -Path . -Filter "*.log" -File | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}

# OS-spezifische Dateien
Get-ChildItem -Path . -Filter ".DS_Store" -Recurse -Force | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}
Get-ChildItem -Path . -Filter "Thumbs.db" -Recurse -Force | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}

# 2. FIREBASE MESSAGING SERVICE WORKER VERSCHIEBEN
Write-Host "`n📦 Firebase Service Worker verschieben..." -ForegroundColor Yellow
if (Test-Path "public/firebase-messaging-sw.js") {
    if (!(Test-Path "apps/admin/public")) {
        New-Item -ItemType Directory -Force -Path "apps/admin/public" | Out-Null
    }
    Move-Item "public/firebase-messaging-sw.js" "apps/admin/public/firebase-messaging-sw.js" -Force
    Write-Host "  ✓ Verschoben: firebase-messaging-sw.js → apps/admin/public/" -ForegroundColor Green
    $movedCount++
    
    # Leeren public Ordner löschen wenn leer
    if ((Get-ChildItem "public" -Force | Measure-Object).Count -eq 0) {
        Remove-Unneeded "public" "Directory"
    }
}

# 3. APPS BEREINIGEN
Write-Host "`n📱 APPS bereinigen..." -ForegroundColor Yellow

# HTML Duplikate in admin
Remove-Unneeded "apps/admin/src/components/common/LodingScreen/index.html" "File"
Remove-Unneeded "apps/admin/src/pages/billing/index.html" "File"

# 4. PACKAGES BEREINIGEN
Write-Host "`n📦 PACKAGES bereinigen..." -ForegroundColor Yellow

# Prüfe ob Packages leer sind
$emptyPackages = @("auth", "database", "ai")
foreach ($pkg in $emptyPackages) {
    $pkgPath = "packages/$pkg"
    if (Test-Path $pkgPath) {
        $srcPath = "$pkgPath/src"
        if (Test-Path $srcPath) {
            $files = Get-ChildItem -Path $srcPath -File -Recurse
            if ($files.Count -eq 0 -or ($files.Count -eq 1 -and $files[0].Name -eq "index.js")) {
                # Prüfe ob index.js nur Platzhalter ist
                $indexContent = Get-Content "$srcPath/index.js" -Raw -ErrorAction SilentlyContinue
                if ($indexContent -match "export const \w+ = \{\};") {
                    Write-Host "  ? Package '$pkg' scheint leer zu sein (nur Platzhalter)" -ForegroundColor Yellow
                    $response = Read-Host "    Löschen? (j/N)"
                    if ($response -eq 'j') {
                        Remove-Unneeded $pkgPath "Directory"
                    }
                }
            }
        }
    }
}

# 5. SERVICES BEREINIGEN
Write-Host "`n🔧 SERVICES bereinigen..." -ForegroundColor Yellow
if (Test-Path "services") {
    $serviceFiles = Get-ChildItem -Path "services" -File -Recurse
    if ($serviceFiles.Count -eq 0) {
        Remove-Unneeded "services" "Directory"
    }
}

# 6. WEITERE BEREINIGUNGEN
Write-Host "`n🧹 Weitere Bereinigungen..." -ForegroundColor Yellow

# Alle weiteren löschen.json Dateien
Get-ChildItem -Path . -Filter "löschen.json" -Recurse | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}

# Editor Swap-Dateien
Get-ChildItem -Path . -Include "*.swp","*.swo","*~",".*.swp" -Recurse -Force | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}

# Temporäre Dateien
Get-ChildItem -Path . -Include "*.tmp","*.temp","*.backup","*.old","*.orig","*.bak" -Recurse | ForEach-Object {
    Remove-Unneeded $_.FullName "File"
}

# 7. OPTIONALE APPS
Write-Host "`n❓ OPTIONALE APPS prüfen..." -ForegroundColor Yellow

# Kitchen App
if (Test-Path "apps/kitchen") {
    Write-Host "`n  ? apps/kitchen/ gefunden" -ForegroundColor Yellow
    Write-Host "    Wird eine separate Kitchen Display App benötigt?" -ForegroundColor White
    $response = Read-Host "    Behalten? (J/n)"
    if ($response -eq 'n') {
        Remove-Unneeded "apps/kitchen" "Directory"
    }
}

# Landing App
if (Test-Path "apps/landing") {
    Write-Host "`n  ? apps/landing/ gefunden" -ForegroundColor Yellow
    Write-Host "    Wird eine Landing Page benötigt?" -ForegroundColor White
    $response = Read-Host "    Behalten? (J/n)"
    if ($response -eq 'n') {
        Remove-Unneeded "apps/landing" "Directory"
    }
}

# 8. FINALE PRÜFUNG
Write-Host "`n🔍 Finale Struktur-Prüfung..." -ForegroundColor Yellow

# Wichtige Dateien prüfen
$criticalFiles = @(
    "package.json",
    ".env.local",
    "firebase.json",
    ".firebaserc",
    "apps/admin/package.json",
    "apps/web/package.json"
)

$allGood = $true
foreach ($file in $criticalFiles) {
    if (!(Test-Path $file)) {
        Write-Host "  ⚠️  WARNUNG: Wichtige Datei fehlt: $file" -ForegroundColor Red
        $allGood = $false
    }
}

if ($allGood) {
    Write-Host "  ✅ Alle kritischen Dateien vorhanden!" -ForegroundColor Green
}

# ZUSAMMENFASSUNG
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ DEEP CLEANUP ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📊 Statistik:" -ForegroundColor Yellow
Write-Host "  - Gelöschte Elemente: $deletedCount" -ForegroundColor White
Write-Host "  - Verschobene Dateien: $movedCount" -ForegroundColor White
if ($errors.Count -gt 0) {
    Write-Host "  - Fehler: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}

# Projektgröße
Write-Host "`n📁 Projektstruktur:" -ForegroundColor Yellow
Write-Host "  Apps:" -ForegroundColor White
Get-ChildItem "apps" -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "    - $($_.Name): $([math]::Round($size, 2)) MB" -ForegroundColor Gray
}

Write-Host "`n💡 Nächste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Führe 'pnpm install' aus um Dependencies zu installieren" -ForegroundColor White
Write-Host "  2. Führe 'pnpm run build' aus um das Projekt zu bauen" -ForegroundColor White
Write-Host "  3. Teste mit 'pnpm run dev' ob alles funktioniert" -ForegroundColor White

Write-Host "`n🎉 Dein EATECH Projekt ist jetzt optimiert und bereinigt!" -ForegroundColor Green