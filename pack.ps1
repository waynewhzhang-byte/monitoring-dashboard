# 1. 定义输出文件名
$zipFileName = "monitoring-dashboard-deploy.zip"

# 2. 如果已存在同名文件则先删除
if (Test-Path $zipFileName) { 
    Remove-Item $zipFileName -Force 
    Write-Host "已清理旧的压缩包。" -ForegroundColor Yellow
}

Write-Host "🚀 开始打包项目..." -ForegroundColor Cyan

# 3. 获取当前目录下所有文件，并过滤掉不需要的内容
# 排除项：.md 文件, .next 目录, node_modules 目录, .git 目录, 以及脚本生成的日志
$filesToCompress = Get-ChildItem -Path "." -Recurse | Where-Object {
    $_.FullName -notmatch "\\node_modules($|\\)" -and
    $_.FullName -notmatch "\\\.next($|\\)" -and
    $_.FullName -notmatch "\\\.git($|\\)" -and
    $_.FullName -notmatch "\\\.cursor($|\\)" -and
    $_.Name -notmatch "\.md$" -and
    $_.Name -notmatch "\.log$" -and
    $_.Name -ne $zipFileName -and
    $_.Name -ne "pack.ps1"
}

# 4. 执行压缩
$filesToCompress | Compress-Archive -DestinationPath $zipFileName -ErrorAction SilentlyContinue

Write-Host "✅ 打包完成！" -ForegroundColor Green
Write-Host "📦 文件位置: $(Get-Location)\$zipFileName" -ForegroundColor White
Write-Host "ℹ️  说明: 该包已包含 .env 文件，但不含依赖和编译产物。上传到银河麒麟后请运行 npm install 和 npm run build。" -ForegroundColor Gray