# ============================================
# 监控大屏专用迁移打包脚本
# ============================================
#
# 用途: 仅打包 monitoring-dashboard 项目，排除无关的 H5 应用
# 修复: 
#   1. 修正 prisma 目录包含
#   2. 修正部署脚本中的命令引用的 npm scripts (db:generate)
#   3. 移除不存在的 c12 依赖检查
#
# ============================================

param(
    [string]$OutputFile = "monitoring-dashboard-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n[步骤] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "  ✓ $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "  ✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "  ⚠ $Message" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Monitoring Dashboard 迁移打包工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 配置
$includeItems = @(
    "app",
    "src",
    "public",
    "prisma",       # 包含 schema.prisma
    "scripts",      # 包含所有诊断脚本
    "package.json",
    "package-lock.json",
    "ecosystem.config.js",
    "tsconfig.json",
    "tsconfig.node.json",   # required for npm run collector (ts-node)
    "next.config.mjs",
    "next.config.js", # 兼容两种后缀
    "tailwind.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    ".env",
    ".env.local",
    ".env.production",
    "README.md"
)

$excludePatterns = @(
    "node_modules",
    ".next",
    ".git",
    "logs",
    "*.log",
    "*.zip",
    "tmp",
    ".gemini",
    ".agent",
    ".vscode"
)

# 2. 创建临时目录
$tempDir = "temp-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Success "创建临时目录: $tempDir"

# 3. 复制文件
Write-Step "复制项目文件"
foreach ($item in $includeItems) {
    if (Test-Path $item) {
        $dest = Join-Path $tempDir $item
        
        if (Test-Path $item -PathType Container) {
            # 目录复制
            $parent = Split-Path $dest -Parent
            if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item -Path $item -Destination $dest -Recurse -Force
            Write-Success "$item (目录)"
        } else {
            # 文件复制
            Copy-Item -Path $item -Destination $dest -Force
            Write-Success "$item (文件)"
        }
    }
}

# 4. 清理排除项 (在复制后的目录中清理，防止意外复制了 node_modules)
Write-Step "清理排除文件"
foreach ($pattern in $excludePatterns) {
    $items = Get-ChildItem -Path $tempDir -Include $pattern -Recurse -ErrorAction SilentlyContinue
    foreach ($i in $items) {
        Remove-Item $i.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 5. 处理环境变量
Write-Step "处理环境变量 (脱敏)"
$envFiles = @(".env", ".env.local")
foreach ($file in $envFiles) {
    $path = Join-Path $tempDir $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        # 简单脱敏示例，实际部署需在服务器填入真实值
        $content = $content -replace 'OPMANAGER_API_KEY=.+', 'OPMANAGER_API_KEY=PLEASE_RESET_IN_PROD'
        $content = $content -replace 'DATABASE_URL=.+', 'DATABASE_URL=postgresql://user:pass@localhost:5432/monitoring_dashboard'
        $content | Out-File -FilePath $path -Encoding UTF8 -NoNewline
        Write-Success "已脱敏: $file"
    }
}

# 6. 生成 deploy-ubuntu.sh
Write-Step "生成 Ubuntu 部署脚本"
$deployScript = @'
#!/bin/bash
set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "  Dashboard 部署脚本"
echo "========================================"

# 1. 检查环境
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. 安装依赖
echo "----------------------------------------"
echo "正在安装依赖..."
# 优先清除缓存，防止平台不兼容问题
npm cache clean --force

# 删除旧的 node_modules (如果存在)
rm -rf node_modules

# 使用 npm install 而不是 ci，以确保重新计算依赖树适应当前平台
# 并确保安装 devDependencies (包含 prisma CLI)
npm install

# 显式安装 tsx 和 prisma (防止 package.json 定义有误)
npm install tsx prisma --save-dev

echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 3. 数据库初始化
echo "----------------------------------------"
echo "正在初始化数据库..."

# 检查 prisma 文件
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}Error: prisma/schema.prisma 不存在!${NC}"
    exit 1
fi

# 生成客户端 (使用 npx 确保调用的是本地安装的 prisma)
echo "执行: npx prisma generate"
npx prisma generate

echo -e "${GREEN}✓ Prisma Client 生成成功${NC}"

# 可选：推送结构
# echo "正在同步数据库结构..."
# npm run db:push

# 4. 构建
echo "----------------------------------------"
echo "正在构建应用..."
npm run build
echo -e "${GREEN}✓ 构建成功${NC}"

# 5. 提示启动
echo "----------------------------------------"
echo "部署准备完成。请使用 PM2 启动:"
echo "pm2 start ecosystem.config.js"
echo "或手动启动:"
echo "npm run start"
'@

$deployScriptPath = Join-Path $tempDir "deploy-ubuntu.sh"
$deployScript | Out-File -FilePath $deployScriptPath -Encoding UTF8
# 转换换行符为 LF
(Get-Content $deployScriptPath -Raw) -replace "`r`n", "`n" | Set-Content $deployScriptPath -NoNewline -Encoding UTF8

Write-Success "已生成: deploy-ubuntu.sh"

# 7. 压缩
Write-Step "创建压缩包"
if (Test-Path $OutputFile) { Remove-Item $OutputFile -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $OutputFile -Force
Write-Success "打包完成: $OutputFile"

# 8. 清理临时目录
Remove-Item $tempDir -Recurse -Force
Write-Success "清理临时文件"

Write-Host ""
Write-Host "✅ 打包成功！请上传 $OutputFile 到服务器执行 ./deploy-ubuntu.sh" -ForegroundColor Green
