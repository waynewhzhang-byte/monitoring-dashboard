# 验证和打包脚本
# 用途：验证所有修复已应用，然后打包项目用于迁移

Write-Host "🔍 验证构建修复..." -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$hasErrors = $false

# 1. 检查 StatusIndicator 导入路径
Write-Host "`n1️⃣  检查 StatusIndicator 导入路径..." -ForegroundColor Yellow
$relativeImports = Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "from '../widgets/StatusIndicator'" -ErrorAction SilentlyContinue
if ($relativeImports) {
    Write-Host "❌ 发现相对路径导入:" -ForegroundColor Red
    $relativeImports | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $hasErrors = $true
} else {
    Write-Host "✅ 所有 StatusIndicator 导入路径正确" -ForegroundColor Green
}

# 2. 检查 Google Fonts
Write-Host "`n2️⃣  检查 Google Fonts 配置..." -ForegroundColor Yellow
if (Test-Path "src\app\layout.tsx") {
    $layoutContent = Get-Content "src\app\layout.tsx" -Raw
    if ($layoutContent -match "next/font/google" -or $layoutContent -match "Inter.*from.*next/font") {
        Write-Host "❌ layout.tsx 仍包含 Google Fonts 导入" -ForegroundColor Red
        $hasErrors = $true
    } elseif ($layoutContent -match "font-sans antialiased") {
        Write-Host "✅ layout.tsx 已正确配置（使用系统字体）" -ForegroundColor Green
    } else {
        Write-Host "⚠️  layout.tsx 可能需要检查" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  未找到 src\app\layout.tsx" -ForegroundColor Yellow
}

# 3. 检查 Sigma.js animate
Write-Host "`n3️⃣  检查 HierarchicalTopologyViewer.tsx..." -ForegroundColor Yellow
if (Test-Path "src\components\topology\HierarchicalTopologyViewer.tsx") {
    $topologyContent = Get-Content "src\components\topology\HierarchicalTopologyViewer.tsx" -Raw
    if ($topologyContent -match "animate.*onComplete|onComplete.*animate") {
        Write-Host "❌ HierarchicalTopologyViewer.tsx 仍包含 onComplete 回调" -ForegroundColor Red
        $hasErrors = $true
    } else {
        Write-Host "✅ HierarchicalTopologyViewer.tsx 已修复" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  未找到 HierarchicalTopologyViewer.tsx" -ForegroundColor Yellow
}

# 4. 运行类型检查
Write-Host "`n4️⃣  运行 TypeScript 类型检查..." -ForegroundColor Yellow
$typeCheckResult = npm run type-check 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript 类型检查通过" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript 类型检查失败" -ForegroundColor Red
    Write-Host $typeCheckResult -ForegroundColor Red
    $hasErrors = $true
}

# 5. 如果有错误，停止打包
if ($hasErrors) {
    Write-Host "`n❌ 验证失败，请先修复上述问题" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ 所有验证通过！" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray

# 6. 开始打包
Write-Host "`n📦 开始打包项目..." -ForegroundColor Cyan

$zipFileName = "monitoring-dashboard-deploy.zip"

# 如果已存在同名文件则先删除
if (Test-Path $zipFileName) { 
    Remove-Item $zipFileName -Force 
    Write-Host "已清理旧的压缩包。" -ForegroundColor Yellow
}

# 获取当前目录下所有文件，并过滤掉不需要的内容
$filesToCompress = Get-ChildItem -Path "." -Recurse | Where-Object {
    $_.FullName -notmatch "\\node_modules($|\\)" -and
    $_.FullName -notmatch "\\\.next($|\\)" -and
    $_.FullName -notmatch "\\\.git($|\\)" -and
    $_.FullName -notmatch "\\\.cursor($|\\)" -and
    $_.Name -notmatch "\.md$" -and
    $_.Name -notmatch "\.log$" -and
    $_.Name -ne $zipFileName -and
    $_.Name -ne "pack.ps1" -and
    $_.Name -ne "verify-and-pack.ps1"
}

# 执行压缩
$filesToCompress | Compress-Archive -DestinationPath $zipFileName -ErrorAction SilentlyContinue

$fileSize = (Get-Item $zipFileName).Length / 1MB

Write-Host "`n✅ 打包完成！" -ForegroundColor Green
Write-Host "📦 文件位置: $(Get-Location)\$zipFileName" -ForegroundColor White
Write-Host "📊 文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
Write-Host "`n📋 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. 将 $zipFileName 上传到银河麒麟服务器" -ForegroundColor White
Write-Host "   2. 在服务器上解压: unzip $zipFileName -d /opt/monitoring-app" -ForegroundColor White
Write-Host "   3. 进入目录: cd /opt/monitoring-app" -ForegroundColor White
Write-Host "   4. 安装依赖: npm install" -ForegroundColor White
Write-Host "   5. 生成 Prisma Client: npm run db:generate" -ForegroundColor White
Write-Host "   6. 构建项目: npm run build" -ForegroundColor White
Write-Host "   7. 启动服务: pm2 start ecosystem.config.js" -ForegroundColor White
