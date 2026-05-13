# ═══════════════════════════════════════════════════════════════
# Copy Avatar Files Script
# Copy employee avatars to public uploads folder
# ═══════════════════════════════════════════════════════════════

Write-Host "🚀 Starting avatar files copy..." -ForegroundColor Cyan

# Define paths
$sourceDir = "D:\01-raymaizing\01-deployments\ray-task-management\assets\database\employee\avatar"
$targetDir = "D:\01-raymaizing\01-deployments\ray-task-management\public\uploads\avatar"

# Create target directory if not exists
if (-not (Test-Path $targetDir)) {
    Write-Host "📁 Creating target directory: $targetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Check if source directory exists
if (-not (Test-Path $sourceDir)) {
    Write-Host "❌ Source directory not found: $sourceDir" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Red
    exit 1
}

# Get all files from source
$files = Get-ChildItem -Path $sourceDir -File

if ($files.Count -eq 0) {
    Write-Host "⚠️  No files found in source directory" -ForegroundColor Yellow
    exit 0
}

Write-Host "📋 Found $($files.Count) files to copy" -ForegroundColor Green

# Copy files
$copiedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    $targetPath = Join-Path $targetDir $file.Name
    
    if (Test-Path $targetPath) {
        Write-Host "⏭️  Skipped (already exists): $($file.Name)" -ForegroundColor Gray
        $skippedCount++
    } else {
        Copy-Item -Path $file.FullName -Destination $targetPath -Force
        Write-Host "✅ Copied: $($file.Name)" -ForegroundColor Green
        $copiedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Total files: $($files.Count)" -ForegroundColor White
Write-Host "   Copied: $copiedCount" -ForegroundColor Green
Write-Host "   Skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Avatar files copy completed!" -ForegroundColor Green
