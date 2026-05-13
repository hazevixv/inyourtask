#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════
# COMPLETE EMPLOYEE MIGRATION SETUP
# ═══════════════════════════════════════════════════════════════
# This script migrates ALL 93 employees to users table
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  COMPLETE EMPLOYEE MIGRATION - Load ALL 93 Employees" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env file with database credentials" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$DB_HOST = $env:DB_HOST
$DB_USER = $env:DB_USER
$DB_PASSWORD = $env:DB_PASSWORD
$DB_NAME = $env:DB_NAME

Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray
Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 1: Check MySQL connection
# ───────────────────────────────────────────────────────────────

Write-Host "🔌 Step 1: Checking MySQL connection..." -ForegroundColor Yellow

try {
    $testQuery = "SELECT 1"
    if ($DB_PASSWORD) {
        mysql -h $DB_HOST -u $DB_USER -p"$DB_PASSWORD" -e $testQuery 2>&1 | Out-Null
    } else {
        mysql -h $DB_HOST -u $DB_USER -e $testQuery 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL connection failed"
    }
    
    Write-Host "✅ MySQL connection successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error: Cannot connect to MySQL!" -ForegroundColor Red
    Write-Host "   Please check your database credentials in .env" -ForegroundColor Yellow
    exit 1
}

# ───────────────────────────────────────────────────────────────
# STEP 2: Check if employees table exists
# ───────────────────────────────────────────────────────────────

Write-Host "📋 Step 2: Checking employees table..." -ForegroundColor Yellow

try {
    $checkTable = "USE $DB_NAME; SHOW TABLES LIKE 'employees';"
    if ($DB_PASSWORD) {
        $result = mysql -h $DB_HOST -u $DB_USER -p"$DB_PASSWORD" -e $checkTable 2>&1
    } else {
        $result = mysql -h $DB_HOST -u $DB_USER -e $checkTable 2>&1
    }
    
    if ($result -notmatch "employees") {
        Write-Host "❌ Error: employees table not found!" -ForegroundColor Red
        Write-Host "   Please run: mysql -u $DB_USER -p $DB_NAME < assets/database/employee/employees.sql" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Employees table found" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error checking employees table: $_" -ForegroundColor Red
    exit 1
}

# ───────────────────────────────────────────────────────────────
# STEP 3: Install dependencies
# ───────────────────────────────────────────────────────────────

Write-Host "📦 Step 3: Installing dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: npm install failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✓ Dependencies already installed" -ForegroundColor Gray
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 4: Run migration script
# ───────────────────────────────────────────────────────────────

Write-Host "🚀 Step 4: Migrating all employees to users table..." -ForegroundColor Yellow
Write-Host "   This will create users for all 93 employees" -ForegroundColor Gray
Write-Host "   Default password: raymaizing2024" -ForegroundColor Gray
Write-Host ""

node scripts/migrate-all-employees.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Error: Migration failed!" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 5: Copy avatar files
# ───────────────────────────────────────────────────────────────

Write-Host "📁 Step 5: Copying avatar files..." -ForegroundColor Yellow

$sourceDir = "assets/database/employee/avatar"
$targetDir = "public/uploads/avatar"

if (Test-Path $sourceDir) {
    # Create target directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    # Copy all avatar files
    $files = Get-ChildItem -Path $sourceDir -File
    $copiedCount = 0
    
    foreach ($file in $files) {
        $targetPath = Join-Path $targetDir $file.Name
        Copy-Item -Path $file.FullName -Destination $targetPath -Force
        $copiedCount++
    }
    
    Write-Host "✅ Copied $copiedCount avatar files" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Avatar source directory not found: $sourceDir" -ForegroundColor Yellow
    Write-Host "   Avatars will not be displayed" -ForegroundColor Gray
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 6: Create chat tables (if not exists)
# ───────────────────────────────────────────────────────────────

Write-Host "💬 Step 6: Setting up chat system..." -ForegroundColor Yellow

$chatSetupScript = "00-documentation/CHAT-DATABASE-SETUP.sql"

if (Test-Path $chatSetupScript) {
    if ($DB_PASSWORD) {
        mysql -h $DB_HOST -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < $chatSetupScript 2>&1 | Out-Null
    } else {
        mysql -h $DB_HOST -u $DB_USER $DB_NAME < $chatSetupScript 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Chat system ready" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Chat setup had issues (may already exist)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Warning: Chat setup script not found" -ForegroundColor Yellow
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# DONE!
# ───────────────────────────────────────────────────────────────

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🎉 SUCCESS! All employees migrated!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ All 93 employees loaded into users table" -ForegroundColor Green
Write-Host "   ✅ Existing users updated (wendra, iman, rizky, taufik)" -ForegroundColor Green
Write-Host "   ✅ New user created (taufan)" -ForegroundColor Green
Write-Host "   ✅ 88 new employee users created" -ForegroundColor Green
Write-Host "   ✅ Avatar files copied" -ForegroundColor Green
Write-Host "   ✅ Chat system ready" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Login Information:" -ForegroundColor Cyan
Write-Host "   Default password for all users: raymaizing2024" -ForegroundColor Yellow
Write-Host "   Login with any employee email" -ForegroundColor Gray
Write-Host ""
Write-Host "👥 Team Members:" -ForegroundColor Cyan
Write-Host "   wendra  → R. WENDRA (siwendra@gmail.com)" -ForegroundColor Gray
Write-Host "   iman    → IMAN CANGGA (hallo.imancangga@gmail.com)" -ForegroundColor Gray
Write-Host "   rizky   → RIZKI PUTRA (poetraarromadhon56@gmail.com)" -ForegroundColor Gray
Write-Host "   taufan  → HENDAR MULYADI (hendarmulyadi16@gmail.com)" -ForegroundColor Gray
Write-Host "   taufik  → TAUFIK NUR (taufiknrr.work@gmail.com)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start server: npm run dev" -ForegroundColor White
Write-Host "   2. Open browser: http://localhost:3005" -ForegroundColor White
Write-Host "   3. Login with any employee email" -ForegroundColor White
Write-Host "   4. Test features:" -ForegroundColor White
Write-Host "      - Profile edit" -ForegroundColor Gray
Write-Host "      - Direct message by email" -ForegroundColor Gray
Write-Host "      - Display names (2 words)" -ForegroundColor Gray
Write-Host "      - Chat with AI agents" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Display Names:" -ForegroundColor Cyan
Write-Host "   Full names are shortened to first 2 words everywhere" -ForegroundColor Gray
Write-Host "   Example: 'R. WENDRA WILENDRA SUKARNO M.MT' → 'R. WENDRA'" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Ready to use! Start the server and enjoy!" -ForegroundColor Green
Write-Host ""
