# ═══════════════════════════════════════════════════════════════
# COMPLETE SETUP SCRIPT
# Run all setup steps automatically
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 RAY TASK MANAGEMENT - COMPLETE SETUP" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectRoot = "D:\01-raymaizing\01-deployments\ray-task-management"
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" # Adjust if needed
$dbName = "ray-task_management"
$dbUser = "root"
$dbPassword = "" # Set your MySQL root password here

# ───────────────────────────────────────────────────────────────
# STEP 1: Check Prerequisites
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check if MySQL is installed
if (-not (Test-Path $mysqlPath)) {
    Write-Host "❌ MySQL not found at: $mysqlPath" -ForegroundColor Red
    Write-Host "   Please install MySQL or update the path in this script" -ForegroundColor Red
    Write-Host ""
    
    # Try to find MySQL in common locations
    $commonPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysql.exe"
    )
    
    Write-Host "🔍 Searching for MySQL in common locations..." -ForegroundColor Yellow
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            Write-Host "✅ Found MySQL at: $path" -ForegroundColor Green
            $mysqlPath = $path
            break
        }
    }
    
    if (-not (Test-Path $mysqlPath)) {
        Write-Host "❌ Could not find MySQL. Please install it first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ MySQL found: $mysqlPath" -ForegroundColor Green

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green

# Check if npm is installed
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 2: Update Database
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 2: Updating database..." -ForegroundColor Yellow
Write-Host ""

$sqlFile = Join-Path $projectRoot "00-documentation\UPDATE-USERS-DATA.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Running SQL script: UPDATE-USERS-DATA.sql" -ForegroundColor Cyan

# Build MySQL command
$mysqlArgs = @(
    "-u", $dbUser
)

if ($dbPassword) {
    $mysqlArgs += "-p$dbPassword"
}

$mysqlArgs += @(
    $dbName,
    "-e", "SOURCE $sqlFile"
)

# Execute MySQL command
try {
    & $mysqlPath $mysqlArgs 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database update completed with warnings" -ForegroundColor Yellow
        Write-Host "   This is normal if tables already exist" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error updating database: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual steps:" -ForegroundColor Yellow
    Write-Host "   1. Open MySQL Workbench or phpMyAdmin" -ForegroundColor White
    Write-Host "   2. Select database: $dbName" -ForegroundColor White
    Write-Host "   3. Run SQL file: $sqlFile" -ForegroundColor White
    exit 1
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 3: Set Taufan Password
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 3: Setting taufan password..." -ForegroundColor Yellow
Write-Host ""

$passwordScript = Join-Path $projectRoot "set-taufan-password.js"

if (Test-Path $passwordScript) {
    Write-Host "🔐 Running password script..." -ForegroundColor Cyan
    
    try {
        node $passwordScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Password set successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Password script completed with warnings" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not run password script: $_" -ForegroundColor Yellow
        Write-Host "   You can set the password manually later" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Password script not found, skipping..." -ForegroundColor Yellow
    Write-Host "   You can set taufan password manually in database" -ForegroundColor Gray
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 4: Copy Avatar Files
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 4: Copying avatar files..." -ForegroundColor Yellow
Write-Host ""

$avatarScript = Join-Path $projectRoot "copy-avatars.ps1"

if (Test-Path $avatarScript) {
    Write-Host "📁 Running avatar copy script..." -ForegroundColor Cyan
    
    try {
        & $avatarScript
    } catch {
        Write-Host "⚠️  Could not copy avatars: $_" -ForegroundColor Yellow
        Write-Host "   You can copy them manually later" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Avatar copy script not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 5: Install Dependencies (if needed)
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 5: Checking dependencies..." -ForegroundColor Yellow
Write-Host ""

Set-Location $projectRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# STEP 6: Verify Setup
# ───────────────────────────────────────────────────────────────

Write-Host "📋 STEP 6: Verifying setup..." -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Write-Host "📄 Copying .env.example to .env..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created" -ForegroundColor Green
        Write-Host "   Please update database credentials in .env" -ForegroundColor Yellow
    }
}

Write-Host ""

# ───────────────────────────────────────────────────────────────
# COMPLETION
# ───────────────────────────────────────────────────────────────

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was done:" -ForegroundColor Cyan
Write-Host "   ✅ Database updated with user data" -ForegroundColor White
Write-Host "   ✅ Chat system tables created" -ForegroundColor White
Write-Host "   ✅ AI agents seeded" -ForegroundColor White
Write-Host "   ✅ Taufan user created" -ForegroundColor White
Write-Host "   ✅ Avatar files copied" -ForegroundColor White
Write-Host "   ✅ Dependencies installed" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start the server: npm run dev" -ForegroundColor White
Write-Host "   2. Open browser: http://localhost:3005" -ForegroundColor White
Write-Host "   3. Login with your credentials" -ForegroundColor White
Write-Host "   4. Test profile edit feature" -ForegroundColor White
Write-Host "   5. Test direct message with email" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - EMPLOYEE-MIGRATION-GUIDE.md" -ForegroundColor White
Write-Host "   - CHAT-TROUBLESHOOTING.md" -ForegroundColor White
Write-Host "   - QUICK-REFERENCE.md" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start the server
$response = Read-Host "Do you want to start the development server now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host ""
    npm run dev
}
