# Prisma Schema 同步脚本
# 用途：将数据库实际结构同步到 Prisma schema

Write-Host "🔄 Prisma Schema 同步工具" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# 获取项目根目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }
Push-Location $projectRoot

# 检查 .env 文件
$envFile = Join-Path $projectRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 错误: 未找到 .env 文件" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "📋 选项：" -ForegroundColor Yellow
Write-Host "   1. 从数据库拉取结构到 Prisma schema (db pull)" -ForegroundColor White
Write-Host "   2. 检查数据库和 schema 的差异 (migrate diff)" -ForegroundColor White
Write-Host "   3. 生成迁移文件以同步差异 (migrate dev)" -ForegroundColor White
Write-Host "   4. 查看当前迁移状态 (migrate status)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请选择操作 (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n🔄 从数据库拉取结构..." -ForegroundColor Yellow
        Write-Host "⚠️  警告: 这将覆盖现有的 schema.prisma 文件" -ForegroundColor Red
        $confirm = Read-Host "是否继续? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            # 备份现有 schema
            $backupFile = "prisma/schema.prisma.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Copy-Item "prisma/schema.prisma" $backupFile
            Write-Host "✅ 已备份现有 schema 到: $backupFile" -ForegroundColor Green
            
            # 执行 db pull
            npx prisma db pull
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ Schema 同步成功！" -ForegroundColor Green
                Write-Host "📝 请检查 prisma/schema.prisma 文件，确认更改是否正确" -ForegroundColor Yellow
                Write-Host "📝 备份文件: $backupFile" -ForegroundColor Gray
            }
            else {
                Write-Host "`n❌ Schema 同步失败" -ForegroundColor Red
                Write-Host "📝 已恢复备份文件" -ForegroundColor Yellow
                Copy-Item $backupFile "prisma/schema.prisma" -Force
            }
        }
        else {
            Write-Host "操作已取消" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host "`n🔍 检查数据库和 schema 的差异..." -ForegroundColor Yellow
        npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ 差异检查完成" -ForegroundColor Green
        }
        else {
            Write-Host "`n❌ 差异检查失败" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "`n📝 生成迁移文件..." -ForegroundColor Yellow
        $migrationName = Read-Host "请输入迁移名称（例如: sync_database_changes）"
        if ($migrationName) {
            npx prisma migrate dev --name $migrationName --create-only
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ 迁移文件已创建" -ForegroundColor Green
                Write-Host "📝 请检查生成的迁移文件，确认 SQL 语句正确" -ForegroundColor Yellow
                Write-Host "📝 然后运行: npx prisma migrate deploy" -ForegroundColor Yellow
            }
            else {
                Write-Host "`n❌ 迁移文件创建失败" -ForegroundColor Red
            }
        }
        else {
            Write-Host "迁移名称不能为空" -ForegroundColor Red
        }
    }
    "4" {
        Write-Host "`n📊 查看迁移状态..." -ForegroundColor Yellow
        npx prisma migrate status
    }
    default {
        Write-Host "无效的选择" -ForegroundColor Red
    }
}

Pop-Location
Write-Host "`n✨ 完成！" -ForegroundColor Green
