# 修复所有组件中的相对路径导入为路径别名
# 用于确保跨平台兼容性（Windows/Linux）

Write-Host "🔧 修复所有组件中的相对路径导入..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# 获取项目根目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }
$srcPath = Join-Path $projectRoot "src"

# 需要修复的文件模式
$filesToFix = @(
    @{
        File = "src\components\device\DeviceDetailPanel.tsx"
        Patterns = @(
            @{ Old = "from '../widgets/MetricChart'"; New = "from '@/components/widgets/MetricChart'" }
        )
    },
    @{
        File = "src\components\dashboard-builder\WidgetRenderer.tsx"
        Patterns = @(
            @{ Old = "from '../widgets/StatCard'"; New = "from '@/components/widgets/StatCard'" }
            @{ Old = "from '../widgets/MetricChart'"; New = "from '@/components/widgets/MetricChart'" }
            @{ Old = "from '../domain/DeviceList'"; New = "from '@/components/domain/DeviceList'" }
            @{ Old = "from '../domain/AlarmList'"; New = "from '@/components/domain/AlarmList'" }
            @{ Old = "from '../domain/TopologyViewer'"; New = "from '@/components/domain/TopologyViewer'" }
            @{ Old = "from '../traffic/TopTrafficList'"; New = "from '@/components/traffic/TopTrafficList'" }
        )
    },
    @{
        File = "src\components\dashboard\TaggedDevicePanel.tsx"
        Patterns = @(
            @{ Old = "from '../widgets/MiniMetricChart'"; New = "from '@/components/widgets/MiniMetricChart'" }
        )
    },
    @{
        File = "src\components\domain\TopologyViewer.tsx"
        Patterns = @(
            @{ Old = "from '../topology/custom/CustomNode'"; New = "from '@/components/topology/custom/CustomNode'" }
            @{ Old = "from '../topology/custom/CustomEdge'"; New = "from '@/components/topology/custom/CustomEdge'" }
        )
    }
)

$fixedCount = 0
$errorCount = 0

foreach ($fileInfo in $filesToFix) {
    $filePath = Join-Path $projectRoot $fileInfo.File
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  文件不存在: $($fileInfo.File)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "修复: $($fileInfo.File)" -ForegroundColor Yellow
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    $fileFixed = $false
    
    foreach ($pattern in $fileInfo.Patterns) {
        if ($content -match [regex]::Escape($pattern.Old)) {
            $content = $content -replace [regex]::Escape($pattern.Old), $pattern.New
            $fileFixed = $true
            Write-Host "  ✅ $($pattern.Old) -> $($pattern.New)" -ForegroundColor Green
        }
    }
    
    if ($fileFixed) {
        Set-Content -Path $filePath -Value $content -NoNewline
        $fixedCount++
        Write-Host "  ✅ 文件已更新" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  无需修复" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "✨ 修复完成！" -ForegroundColor Green
Write-Host "   修复文件数: $fixedCount" -ForegroundColor White
Write-Host ""
Write-Host "📋 下一步:" -ForegroundColor Cyan
Write-Host "   1. 运行 npm run type-check 验证类型" -ForegroundColor White
Write-Host "   2. 运行 npm run build 验证构建" -ForegroundColor White
Write-Host ""
