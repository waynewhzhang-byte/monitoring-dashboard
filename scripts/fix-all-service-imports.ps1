# 修复所有服务层文件中的相对路径导入
# 用于确保跨平台兼容性

Write-Host "🔧 修复所有服务层文件中的相对路径导入..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# 获取项目根目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }

# 需要修复的文件
$filesToFix = @(
    @{
        File = "src\services\collector\alarm.ts"
        Patterns = @(
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
            @{ Old = "from '../opmanager/client'"; New = "from '@/services/opmanager/client'" }
            @{ Old = "from '../broadcast'"; New = "from '@/services/broadcast'" }
            @{ Old = "from '../alarm/deduplicator'"; New = "from '@/services/alarm/deduplicator'" }
        )
    },
    @{
        File = "src\services\collector\device.ts"
        Patterns = @(
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
            @{ Old = "from '../opmanager/client'"; New = "from '@/services/opmanager/client'" }
        )
    },
    @{
        File = "src\services\collector\interface.ts"
        Patterns = @(
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
            @{ Old = "from '../opmanager/client'"; New = "from '@/services/opmanager/client'" }
        )
    },
    @{
        File = "src\services\collector\topology.ts"
        Patterns = @(
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
            @{ Old = "from '../opmanager/client'"; New = "from '@/services/opmanager/client'" }
        )
    },
    @{
        File = "src\services\collector\metric.ts"
        Patterns = @(
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
            @{ Old = "from '../opmanager/client'"; New = "from '@/services/opmanager/client'" }
            @{ Old = "from '../broadcast'"; New = "from '@/services/broadcast'" }
        )
    },
    @{
        File = "src\services\alarm\deduplicator.ts"
        Patterns = @(
            @{ Old = "from '../../lib/redis'"; New = "from '@/lib/redis'" }
            @{ Old = "from '../../lib/prisma'"; New = "from '@/lib/prisma'" }
        )
    },
    @{
        File = "src\services\broadcast\index.ts"
        Patterns = @(
            @{ Old = "from '../../lib/redis'"; New = "from '@/lib/redis'" }
        )
    },
    @{
        File = "src\stores\useDashboardStore.ts"
        Patterns = @(
            @{ Old = "from '../types/dashboard-config'"; New = "from '@/types/dashboard-config'" }
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
