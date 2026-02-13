# PostgreSQL 数据库导出脚本
# 用途：将 monitoring-dashboard 数据库导出为压缩文件，用于迁移到银河麒麟 Linux

param(
    [string]$OutputFile = "monitoring-dashboard-db-backup.dump",
    [string]$Format = "custom"  # custom 或 plain
)

Write-Host "🗄️  PostgreSQL 数据库导出工具" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# 0. 获取项目根目录（脚本所在目录的父目录，或当前目录）
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }
$envFile = Join-Path $projectRoot ".env"

# 切换到项目根目录（确保相对路径正确）
Push-Location $projectRoot

# 1. 检查 .env 文件是否存在
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 错误: 未找到 .env 文件" -ForegroundColor Red
    Write-Host "   查找路径: $envFile" -ForegroundColor Yellow
    Write-Host "   请确保项目根目录存在 .env 文件，并包含 DATABASE_URL 配置" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# 2. 读取 DATABASE_URL
Write-Host "📖 读取数据库配置..." -ForegroundColor Yellow
$envContent = Get-Content $envFile -Raw
$dbUrlMatch = [regex]::Match($envContent, "DATABASE_URL\s*=\s*[""']?([^""'\s]+)[""']?")
if (-not $dbUrlMatch.Success) {
    Write-Host "❌ 错误: .env 文件中未找到 DATABASE_URL" -ForegroundColor Red
    exit 1
}

$databaseUrl = $dbUrlMatch.Groups[1].Value
Write-Host "✅ 已读取 DATABASE_URL" -ForegroundColor Green

# 3. 解析数据库连接信息
# DATABASE_URL 格式: postgresql://user:password@host:port/database?schema=public
$dbUrlPattern = 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)'
$dbMatch = [regex]::Match($databaseUrl, $dbUrlPattern)
if (-not $dbMatch.Success) {
    Write-Host "❌ 错误: DATABASE_URL 格式不正确" -ForegroundColor Red
    Write-Host "   期望格式: postgresql://user:password@host:port/database" -ForegroundColor Yellow
    exit 1
}

$dbUser = $dbMatch.Groups[1].Value
$dbPassword = $dbMatch.Groups[2].Value
$dbHost = $dbMatch.Groups[3].Value
$dbPort = $dbMatch.Groups[4].Value
$dbName = $dbMatch.Groups[5].Value  # 已自动去掉 ? 后面的查询参数

Write-Host "   数据库: $dbName" -ForegroundColor White
Write-Host "   主机: ${dbHost}:${dbPort}" -ForegroundColor White
Write-Host "   用户: $dbUser" -ForegroundColor White

# 4. 检查 pg_dump 是否可用
Write-Host "`n🔍 检查 pg_dump 工具..." -ForegroundColor Yellow
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-Host "❌ 错误: 未找到 pg_dump 命令" -ForegroundColor Red
    Write-Host "   请安装 PostgreSQL 客户端工具，或将其添加到 PATH 环境变量" -ForegroundColor Yellow
    Write-Host "   下载地址: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ 找到 pg_dump: $($pgDumpPath.Source)" -ForegroundColor Green

# 5. 设置输出文件路径
$outputPath = Join-Path (Get-Location) $OutputFile
if (Test-Path $outputPath) {
    $response = Read-Host "文件已存在，是否覆盖? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ 操作已取消" -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $outputPath -Force
}

# 6. 设置环境变量（用于 pg_dump 认证）
$env:PGPASSWORD = $dbPassword

# 7. 执行导出
Write-Host "`n📦 开始导出数据库..." -ForegroundColor Cyan
Write-Host "   格式: $Format" -ForegroundColor White
Write-Host "   输出: $outputPath" -ForegroundColor White

$dumpArgs = @(
    "-h", $dbHost
    "-p", $dbPort
    "-U", $dbUser
    "-d", $dbName
    "-F", $Format
    "-f", $outputPath
    "-v"  # 详细输出
)

if ($Format -eq "custom") {
    $dumpArgs += "-Z", "9"  # 最高压缩级别
}

try {
    & pg_dump $dumpArgs
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $outputPath).Length / 1MB
        Write-Host "`n✅ 导出成功！" -ForegroundColor Green
        Write-Host "   文件: $outputPath" -ForegroundColor White
        Write-Host "   大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
        Write-Host "`n📋 下一步操作:" -ForegroundColor Cyan
        Write-Host "   1. 将 $OutputFile 上传到银河麒麟服务器" -ForegroundColor White
        Write-Host "   2. 在服务器上运行 import-database.sh 脚本导入数据" -ForegroundColor White
    } else {
        Write-Host "`n❌ 导出失败 (退出码: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ 导出过程中发生错误: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清理环境变量
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    # 恢复工作目录
    Pop-Location
}

Write-Host "`n✨ 完成！" -ForegroundColor Green
