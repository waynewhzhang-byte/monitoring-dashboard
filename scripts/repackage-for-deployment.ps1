# 重新打包脚本 - 用于部署到银河麒麟 Linux
# 功能：1. 导出最新数据库 2. 打包应用（包含最新迁移文件）

Write-Host "🚀 重新打包项目用于部署到银河麒麟 Linux" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# 0. 获取项目根目录（脚本所在目录的父目录）
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }
$envFile = Join-Path $projectRoot ".env"

# 切换到项目根目录
Push-Location $projectRoot

# 1. 检查迁移状态
Write-Host "📋 步骤 1/3: 检查数据库迁移状态..." -ForegroundColor Yellow
if (Test-Path $envFile) {
    $env:DATABASE_URL = (Get-Content $envFile | Select-String '^DATABASE_URL=').ToString().Split('=', 2)[1] -replace "'", ""
}
try {
    $migrateStatus = npx prisma migrate status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库迁移状态正常" -ForegroundColor Green
        Write-Host $migrateStatus -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️  警告: 无法检查迁移状态，但继续执行..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  警告: 无法检查迁移状态，但继续执行..." -ForegroundColor Yellow
}
Write-Host ""

# 2. 导出数据库
Write-Host "📋 步骤 2/3: 导出数据库..." -ForegroundColor Yellow
$dbBackupFile = "monitoring-dashboard-db-backup.dump"
$exportScript = Join-Path $projectRoot "scripts\export-database.ps1"
try {
    & $exportScript -OutputFile $dbBackupFile -Format "custom"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库导出成功" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 数据库导出失败" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ 数据库导出失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. 打包应用
Write-Host "📋 步骤 3/3: 打包应用..." -ForegroundColor Yellow
$packScript = Join-Path $projectRoot "scripts\pack.ps1"
try {
    & $packScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 应用打包成功" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 应用打包失败" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ 应用打包失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. 验证文件
Write-Host "📋 验证打包文件..." -ForegroundColor Yellow
$zipFile = "monitoring-dashboard-deploy.zip"
$dbFile = "monitoring-dashboard-db-backup.dump"

if (Test-Path $zipFile) {
    $zipSize = (Get-Item $zipFile).Length / 1MB
    Write-Host "✅ 应用包: $zipFile ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
}
else {
    Write-Host "❌ 应用包不存在: $zipFile" -ForegroundColor Red
    exit 1
}

if (Test-Path $dbFile) {
    $dbSize = (Get-Item $dbFile).Length / 1MB
    Write-Host "✅ 数据库备份: $dbFile ($([math]::Round($dbSize, 2)) MB)" -ForegroundColor Green
}
else {
    Write-Host "❌ 数据库备份不存在: $dbFile" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. 检查迁移文件是否包含在打包中
Write-Host "📋 检查迁移文件..." -ForegroundColor Yellow
$migrationFile = "prisma\migrations\20251231101327_add_tags_fields\migration.sql"
if (Test-Path $migrationFile) {
    Write-Host "✅ 找到最新迁移文件: $migrationFile" -ForegroundColor Green
}
else {
    Write-Host "⚠️  警告: 未找到迁移文件: $migrationFile" -ForegroundColor Yellow
}
Write-Host ""

# 6. 总结
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "✨ 重新打包完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📦 生成的文件:" -ForegroundColor Cyan
Write-Host "   1. $zipFile - 应用包（包含最新迁移文件）" -ForegroundColor White
Write-Host "   2. $dbFile - 数据库备份（包含 tags 字段）" -ForegroundColor White
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. 将 $zipFile 上传到银河麒麟服务器" -ForegroundColor White
Write-Host "   2. 将 $dbFile 上传到银河麒麟服务器" -ForegroundColor White
Write-Host "   3. 在服务器上解压应用包: unzip $zipFile -d /opt/monitoring-app" -ForegroundColor White
Write-Host "   4. 导入数据库: ./scripts/import-database.sh $dbFile" -ForegroundColor White
Write-Host "   5. 安装依赖: npm install" -ForegroundColor White
Write-Host "   6. 生成 Prisma Client: npm run db:generate" -ForegroundColor White
Write-Host "   7. 应用迁移: npx prisma migrate deploy" -ForegroundColor White
Write-Host "   8. 构建项目: npm run build" -ForegroundColor White
Write-Host "   9. 启动服务: pm2 start ecosystem.config.js" -ForegroundColor White
Write-Host ""
