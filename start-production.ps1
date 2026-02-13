# 生产环境快速启动脚本
# 使用方法: .\start-production.ps1

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "🚀 监控大屏系统 - 生产环境启动" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 检查环境配置
Write-Host "🔍 检查环境配置..." -ForegroundColor Yellow

if (-not (Test-Path ".env.local")) {
    Write-Host "❌ 错误: .env.local 文件不存在" -ForegroundColor Red
    Write-Host "   请先配置环境变量" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "USE_MOCK_DATA=true") {
    Write-Host "❌ 错误: MOCK 数据未禁用" -ForegroundColor Red
    Write-Host "   请在 .env.local 中设置 USE_MOCK_DATA=false" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 环境配置正确" -ForegroundColor Green
Write-Host ""

# 询问用户
Write-Host "选择启动模式:" -ForegroundColor Yellow
Write-Host "  1. 完整启动（采集器 + 前端）"
Write-Host "  2. 仅启动采集器"
Write-Host "  3. 仅启动前端"
Write-Host "  4. 验证配置并退出"
Write-Host ""

$choice = Read-Host "请选择 (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 启动完整服务..." -ForegroundColor Green
        Write-Host ""
        
        # 启动采集器（后台）
        Write-Host "启动数据采集器..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run collector" -WindowStyle Normal
        Start-Sleep -Seconds 3
        
        # 启动前端
        Write-Host "启动前端服务..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
        
        Write-Host ""
        Write-Host "✅ 服务启动中..." -ForegroundColor Green
        Write-Host "   采集器: 运行在后台窗口" -ForegroundColor Cyan
        Write-Host "   前端: http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 提示: 两个新窗口已打开，请勿关闭" -ForegroundColor Yellow
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔄 启动数据采集器..." -ForegroundColor Green
        npm run collector
    }
    
    "3" {
        Write-Host ""
        Write-Host "🌐 启动前端服务..." -ForegroundColor Green
        npm run dev
    }
    
    "4" {
        Write-Host ""
        Write-Host "🔍 运行配置验证..." -ForegroundColor Green
        Write-Host ""
        npx tsx scripts/verify-production-setup.ts
    }
    
    default {
        Write-Host ""
        Write-Host "❌ 无效选择" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
