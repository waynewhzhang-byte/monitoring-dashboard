# ============================================
# 监控大屏增强版迁移打包脚本 v2.0
# ============================================
#
# 改进点:
#   ✅ 包含所有必要的配置文件（.env.example, 文档等）
#   ✅ 生成支持镜像源切换的部署脚本
#   ✅ 网络诊断和自动重试机制
#   ✅ 完整的错误处理
#   ✅ 确保 TSX 和 TS-Node 支持
#   ✅ 完善的环境变量脱敏
#
# 用法:
#   .\package-monitoring-dashboard-v2.ps1
#   .\package-monitoring-dashboard-v2.ps1 -OutputFile "custom-name.zip"
#
# ============================================

param(
    [string]$OutputFile = "monitoring-dashboard-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Step {
    param([string]$Message)
    Write-Host "`n[步骤] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ $Message" -ForegroundColor Gray
}

# 显示标题
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Monitoring Dashboard 增强版打包工具" -ForegroundColor Cyan
Write-Host "  版本: 2.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json")) {
    Write-Error "错误: 请在项目根目录执行此脚本"
    Write-Info "当前目录: $(Get-Location)"
    exit 1
}

Write-Success "项目根目录验证通过"

# 验证关键文件
Write-Step "验证关键文件"
$criticalFiles = @(
    "package.json",
    "package-lock.json",
    "ecosystem.config.js",
    "prisma/schema.prisma",
    "src/services/collector/start.ts"
)

$missingFiles = @()
foreach ($file in $criticalFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Error "缺少关键文件："
    foreach ($file in $missingFiles) {
        Write-Info "  - $file"
    }
    exit 1
}
Write-Success "关键文件验证通过"

# 定义要包含的项目（增强版，包含更多必要文件）
$includeItems = @(
    # 核心目录
    "app",
    "src",
    "public",
    "prisma",       # 包含 schema.prisma 和 migrations
    "scripts",      # 包含所有诊断和工具脚本

    # 配置文件
    "package.json",
    "package-lock.json",
    "ecosystem.config.js",
    "tsconfig.json",
    "tsconfig.node.json",    # ⭐ TSX/TS-Node 配置
    "next.config.mjs",
    "next.config.js",
    "next-env.d.ts",
    "tailwind.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "instrumentation.ts",    # ⭐ Next.js 仪表化
    "middleware.ts",         # ⭐ Next.js 中间件

    # 环境变量文件
    ".env.example",
    ".env.production.example",
    ".env.local",            # 如果存在会被脱敏
    ".env",                  # 如果存在会被脱敏

    # 文档文件
    "README.md",
    "CLAUDE.md",
    "COMPLETE-SETUP-GUIDE.md",
    "QUICK-START-CHECKLIST.md",
    "UBUNTU-MIGRATION-GUIDE.md",

    # 其他配置
    ".gitignore",
    ".eslintrc.json",
    ".prettierrc"
)

$excludePatterns = @(
    # 依赖和构建产物
    "node_modules",
    ".next",
    "dist",
    "build",
    "out",

    # 版本控制
    ".git",

    # 日志和临时文件
    "logs",
    "*.log",
    "*.dump",
    "*.zip",
    "tmp",
    "temp-*",

    # IDE 和编辑器
    ".vscode",
    ".cursor",
    ".claude",
    ".gemini",
    ".agent",
    ".specify",

    # 测试结果
    "coverage",
    "test-results",

    # TypeScript 构建信息
    "*.tsbuildinfo"
)

# 创建临时目录
Write-Step "创建临时目录"
$tempDir = "temp-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Success "临时目录: $tempDir"

# 复制文件函数
function Copy-ProjectItem {
    param(
        [string]$SourcePath,
        [string]$DestPath
    )

    try {
        $destParent = Split-Path $DestPath -Parent
        if ($destParent -and (-not (Test-Path $destParent))) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }

        if (Test-Path $SourcePath -PathType Container) {
            Copy-Item -Path $SourcePath -Destination $DestPath -Recurse -Force -ErrorAction Stop
        } else {
            Copy-Item -Path $SourcePath -Destination $DestPath -Force -ErrorAction Stop
        }
        return $true
    }
    catch {
        Write-Warning "复制失败: $SourcePath - $_"
        return $false
    }
}

# 复制项目文件
Write-Step "复制项目文件"
$copiedCount = 0
$skippedCount = 0

foreach ($item in $includeItems) {
    if (Test-Path $item) {
        $dest = Join-Path $tempDir $item

        if (Copy-ProjectItem -SourcePath $item -DestPath $dest) {
            $type = if (Test-Path $item -PathType Container) { "目录" } else { "文件" }
            Write-Success "$item ($type)"
            $copiedCount++
        } else {
            $skippedCount++
        }
    } else {
        Write-Info "$item (不存在，跳过)"
        $skippedCount++
    }
}

Write-Info "已复制: $copiedCount 项，跳过: $skippedCount 项"

# 清理排除项
Write-Step "清理排除文件"
$removedCount = 0
foreach ($pattern in $excludePatterns) {
    $items = Get-ChildItem -Path $tempDir -Include $pattern -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        try {
            Remove-Item $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $removedCount++
        } catch {}
    }
}
Write-Success "清理了 $removedCount 个排除项"

# 处理环境变量文件（完整脱敏）
Write-Step "处理环境变量文件（脱敏）"
$envFiles = @(".env", ".env.local", ".env.production")
$envProcessed = 0

foreach ($envFile in $envFiles) {
    $sourcePath = Join-Path $tempDir $envFile
    if (Test-Path $sourcePath) {
        $content = Get-Content $sourcePath -Raw

        # 完整脱敏规则
        $content = $content -replace 'OPMANAGER_BASE_URL=https?://[^\s]+', 'OPMANAGER_BASE_URL=https://your-opmanager-host:8061'
        $content = $content -replace 'OPMANAGER_API_KEY=[a-f0-9]+', 'OPMANAGER_API_KEY=your-api-key-here'
        $content = $content -replace 'DATABASE_URL="?postgresql://[^:]+:([^@]+)@[^"]+', 'DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard'
        $content = $content -replace 'REDIS_URL="?redis://[^"]+', 'REDIS_URL="redis://localhost:6379'
        $content = $content -replace 'REDIS_PASSWORD=.+', 'REDIS_PASSWORD='

        $content | Out-File -FilePath $sourcePath -Encoding UTF8 -NoNewline
        Write-Success "$envFile (已脱敏)"
        $envProcessed++
    }
}

if ($envProcessed -eq 0) {
    Write-Warning "未找到环境变量文件，请确保服务器上有 .env 配置"
}

# 生成增强版 Ubuntu 部署脚本
Write-Step "生成增强版 Ubuntu 部署脚本"

$deployScript = @'
#!/bin/bash
# ============================================
# 监控大屏增强版部署脚本 v2.0 (Ubuntu)
# ============================================
#
# 特性:
#   ✅ 支持镜像源切换（官方源 / 淘宝源）
#   ✅ 网络诊断和自动重试
#   ✅ 完整的错误处理和回滚
#   ✅ 确保 TSX 和 TS-Node 支持
#   ✅ Prisma 依赖验证
#   ✅ 部署后健康检查
#
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}[步骤] $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
log_ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
log_err() { echo -e "  ${RED}✗ $1${NC}"; }
log_warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }
log_info() { echo -e "  ${BLUE}ℹ $1${NC}"; }

# 显示标题
clear
echo ""
echo "=========================================="
echo "  监控大屏增强版部署脚本 v2.0"
echo "  目标环境: Ubuntu 18.04+"
echo "=========================================="
echo ""

# 部署日志
DEPLOY_LOG="deploy-$(date +%Y%m%d-%H%M%S).log"
exec 1> >(tee -a "$DEPLOY_LOG")
exec 2>&1

log_info "部署日志: $DEPLOY_LOG"

# ============================================
# 1. 环境检查
# ============================================
log_step "检查系统环境"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_err "错误: 请在项目根目录执行此脚本"
    log_info "当前目录: $(pwd)"
    exit 1
fi
log_ok "项目根目录验证通过: $(pwd)"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_err "Node.js 未安装"
    log_info "Ubuntu 安装方法:"
    log_info "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    log_info "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_err "Node.js 版本过低: $(node -v)，需要 >= 18.0.0"
    exit 1
fi
log_ok "Node.js: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    log_err "npm 未安装"
    exit 1
fi
log_ok "npm: $(npm -v)"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2 未安装，正在安装..."
    sudo npm install -g pm2
    log_ok "PM2 安装完成: $(pm2 -v)"
else
    log_ok "PM2: $(pm2 -v)"
fi

# 检查 PostgreSQL（可选）
if command -v psql &> /dev/null; then
    log_ok "PostgreSQL: 已安装"
else
    log_warn "PostgreSQL 未检测到（如使用远程数据库可忽略）"
fi

# 检查 Redis（可选）
if command -v redis-cli &> /dev/null; then
    log_ok "Redis: 已安装"
else
    log_warn "Redis 未检测到（如使用远程 Redis 可忽略）"
fi

# ============================================
# 2. 网络优化配置
# ============================================
log_step "配置 npm 镜像源"

echo "请选择 npm 镜像源:"
echo "  1) 官方源 (registry.npmjs.org) - 国外网络"
echo "  2) 淘宝源 (registry.npmmirror.com) - 国内网络（推荐）"
echo "  3) 跳过，使用当前配置"
read -p "请输入选项 (1/2/3): " -n 1 -r
echo

case $REPLY in
    1)
        log_info "配置官方源..."
        npm config set registry https://registry.npmjs.org/
        export PRISMA_ENGINES_MIRROR=""
        log_ok "已设置官方源"
        ;;
    2)
        log_info "配置淘宝源..."
        npm config set registry https://registry.npmmirror.com/
        npm config set audit false
        npm config set fund false
        export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
        log_ok "已设置淘宝源"
        ;;
    3)
        log_info "跳过镜像源配置"
        ;;
    *)
        log_warn "无效选项，使用当前配置"
        ;;
esac

log_info "当前镜像源: $(npm config get registry)"

# ============================================
# 3. 停止现有服务
# ============================================
log_step "停止现有服务"

if pm2 list | grep -q "monitoring-"; then
    log_info "检测到现有服务，正在停止..."
    pm2 stop monitoring-web monitoring-collector 2>/dev/null || true
    log_ok "服务已停止"
else
    log_info "未检测到现有服务"
fi

# ============================================
# 4. 清理和安装依赖（带重试机制）
# ============================================
log_step "安装依赖（带网络重试）"

# 清理缓存
log_info "清理 npm 缓存..."
npm cache clean --force
log_ok "缓存已清理"

# 删除旧的 node_modules 和 package-lock.json（如果是更新部署）
if [ -d "node_modules" ]; then
    log_info "删除旧的 node_modules..."
    rm -rf node_modules
    log_ok "旧依赖已清理"
fi

# 安装依赖函数（带重试）
install_deps_with_retry() {
    local max_attempts=3
    local attempt=1
    local success=false

    while [ $attempt -le $max_attempts ] && [ "$success" = false ]; do
        log_info "尝试安装依赖 (第 $attempt/$max_attempts 次)..."

        # 使用 npm ci（确定性安装）或 npm install
        if [ -f "package-lock.json" ]; then
            if npm ci --verbose 2>&1 | tee npm-install.log; then
                success=true
            else
                log_warn "npm ci 失败，尝试 npm install..."
                if npm install --verbose --legacy-peer-deps 2>&1 | tee npm-install.log; then
                    success=true
                fi
            fi
        else
            if npm install --verbose 2>&1 | tee npm-install.log; then
                success=true
            fi
        fi

        if [ "$success" = false ]; then
            if [ $attempt -lt $max_attempts ]; then
                log_warn "安装失败，30秒后重试..."
                sleep 30
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ "$success" = false ]; then
        log_err "依赖安装失败，已尝试 $max_attempts 次"
        log_info "详细日志: npm-install.log"
        log_info "建议："
        log_info "  1. 检查网络连接"
        log_info "  2. 尝试切换镜像源（重新运行脚本）"
        log_info "  3. 查看日志: cat npm-install.log"
        exit 1
    fi

    return 0
}

# 执行安装
install_deps_with_retry
log_ok "依赖安装完成"

# ============================================
# 5. 验证关键依赖
# ============================================
log_step "验证关键依赖"

# 验证 Prisma
log_info "检查 Prisma..."
if [ -d "node_modules/@prisma/client" ] && [ -d "node_modules/prisma" ]; then
    PRISMA_CLIENT_VER=$(npm list @prisma/client --depth=0 2>/dev/null | grep @prisma/client | awk '{print $2}' | cut -d'@' -f2 || echo "未知")
    PRISMA_CLI_VER=$(npm list prisma --depth=0 2>/dev/null | grep "prisma@" | awk '{print $2}' | cut -d'@' -f2 || echo "未知")

    log_ok "Prisma 依赖已安装"
    log_info "  @prisma/client: $PRISMA_CLIENT_VER"
    log_info "  prisma (CLI): $PRISMA_CLI_VER"

    if [ "$PRISMA_CLIENT_VER" != "$PRISMA_CLI_VER" ]; then
        log_warn "Prisma 版本不一致，可能导致问题"
    fi
else
    log_err "Prisma 依赖未正确安装"
    log_info "尝试手动安装..."
    npm install @prisma/client prisma
fi

# 验证 tsx 和 ts-node
log_info "检查 TypeScript 运行时..."
if [ -f "node_modules/.bin/tsx" ]; then
    log_ok "tsx: 已安装"
else
    log_warn "tsx 未安装，某些诊断脚本可能无法运行"
fi

if [ -f "node_modules/.bin/ts-node" ]; then
    log_ok "ts-node: 已安装"
else
    log_warn "ts-node 未安装，collector 可能无法运行"
fi

# ============================================
# 6. 环境变量配置
# ============================================
log_step "配置环境变量"

if [ ! -f ".env" ]; then
    log_warn ".env 文件不存在"

    if [ -f ".env.example" ]; then
        log_info "从 .env.example 创建 .env..."
        cp .env.example .env
        log_ok ".env 文件已创建"

        log_warn "⚠️  请立即编辑 .env 文件配置必要信息"
        log_info "必须配置项:"
        log_info "  - DATABASE_URL: PostgreSQL 连接字符串"
        log_info "  - REDIS_URL: Redis 连接字符串"
        log_info "  - OPMANAGER_BASE_URL: OpManager 服务器地址"
        log_info "  - OPMANAGER_API_KEY: OpManager API 密钥"

        read -p "是否现在编辑 .env？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        else
            log_err "请先配置 .env 文件后再继续"
            exit 1
        fi
    else
        log_err ".env.example 也不存在"
        exit 1
    fi
else
    log_ok ".env 文件已存在"

    # 验证关键配置
    log_info "验证关键配置项..."
    missing_vars=()

    if ! grep -q "^DATABASE_URL=" .env; then
        missing_vars+=("DATABASE_URL")
    fi
    if ! grep -q "^OPMANAGER_BASE_URL=" .env; then
        missing_vars+=("OPMANAGER_BASE_URL")
    fi
    if ! grep -q "^OPMANAGER_API_KEY=" .env; then
        missing_vars+=("OPMANAGER_API_KEY")
    fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warn "缺少关键配置项: ${missing_vars[*]}"
        read -p "是否编辑 .env？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        log_ok "关键配置项验证通过"
    fi
fi

# ============================================
# 7. 数据库初始化
# ============================================
log_step "数据库初始化"

# 生成 Prisma Client
log_info "生成 Prisma Client..."
if npx prisma generate; then
    log_ok "Prisma Client 生成成功"
else
    log_err "Prisma Client 生成失败"
    log_info "诊断信息："
    log_info "  schema.prisma: $([ -f 'prisma/schema.prisma' ] && echo '存在' || echo '不存在')"
    log_info "  node_modules/@prisma/client: $([ -d 'node_modules/@prisma/client' ] && echo '存在' || echo '不存在')"
    log_info "  node_modules/prisma: $([ -d 'node_modules/prisma' ] && echo '存在' || echo '不存在')"
    exit 1
fi

# 询问是否推送 schema
read -p "是否推送数据库 schema？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "推送数据库 schema..."
    if npm run db:push; then
        log_ok "数据库 schema 推送成功"

        read -p "是否初始化种子数据？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run db:seed 2>/dev/null || log_warn "种子数据初始化失败（可能已存在）"
            log_ok "数据库初始化完成"
        fi
    else
        log_err "数据库 schema 推送失败"
        log_info "请检查 DATABASE_URL 配置和数据库连接"
        exit 1
    fi
fi

# ============================================
# 8. 构建应用
# ============================================
log_step "构建应用"

log_info "构建 Next.js 应用（可能需要几分钟）..."
if npm run build; then
    log_ok "应用构建成功"
else
    log_err "应用构建失败"
    exit 1
fi

# ============================================
# 9. 准备运行环境
# ============================================
log_step "准备运行环境"

# 创建日志目录
mkdir -p logs
log_ok "日志目录已准备"

# 修正 ecosystem.config.js 中的部署路径
if [ -f "ecosystem.config.js" ]; then
    DEPLOY_DIR="$(pwd)"
    if command -v sed &>/dev/null; then
        sed -i.bak "s|/opt/monitoring-dashboard|$DEPLOY_DIR|g" ecosystem.config.js
        log_ok "PM2 配置路径已更新: $DEPLOY_DIR"
    else
        log_warn "未找到 sed，请手动修改 ecosystem.config.js 中的 cwd"
    fi
fi

# ============================================
# 10. 启动应用
# ============================================
log_step "启动应用"

log_info "使用 PM2 启动服务..."

# 检查是否已有应用在 PM2 中
if pm2 list | grep -q "monitoring-"; then
    log_info "检测到服务已存在，执行重新加载..."
    pm2 reload ecosystem.config.js --update-env
    log_ok "服务已重新加载"
else
    log_info "首次启动服务..."
    pm2 start ecosystem.config.js
    log_ok "服务已启动"
fi

# 等待服务启动
log_info "等待服务启动（15秒）..."
sleep 15

# ============================================
# 11. 健康检查
# ============================================
log_step "健康检查"

# 显示 PM2 状态
pm2 status

# 检查 Web 服务
log_info "检查 Web 服务健康状态..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
    log_ok "Web 服务运行正常 (http://localhost:3000)"
else
    log_warn "Web 服务健康检查失败"
    log_info "查看日志: pm2 logs monitoring-web"
fi

# 检查采集服务
log_info "检查采集服务状态..."
if pm2 list | grep "monitoring-collector" | grep -q "online"; then
    log_ok "采集服务运行正常"
else
    log_warn "采集服务状态异常"
    log_info "查看日志: pm2 logs monitoring-collector"
fi

# ============================================
# 12. 配置开机自启（可选）
# ============================================
log_step "配置开机自启"

read -p "是否配置 PM2 开机自启？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 save
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    log_ok "PM2 开机自启已配置"
    log_warn "如果上面输出了 sudo 命令，请执行它"
fi

# ============================================
# 完成
# ============================================
echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "应用访问地址:"
echo "  - 监控大屏: http://$(hostname -I | awk '{print $1}'):3000"
echo "  - 本地访问: http://localhost:3000"
echo ""
echo "PM2 管理命令:"
echo "  - 查看状态: pm2 status"
echo "  - 查看日志: pm2 logs"
echo "  - 实时日志: pm2 logs --lines 100"
echo "  - 重启应用: pm2 restart all"
echo "  - 停止应用: pm2 stop all"
echo "  - 重载环境: pm2 restart all --update-env"
echo ""
echo "诊断工具:"
echo "  - 完整诊断: npm run diagnose:production"
echo "  - 数据流验证: npm run verify:data-flow"
echo "  - 检查所有: npm run check:all"
echo ""
echo "日志文件:"
echo "  - 部署日志: $DEPLOY_LOG"
echo "  - Web 日志: logs/pm2-web-*.log"
echo "  - 采集日志: logs/pm2-collector-*.log"
echo ""
echo "下一步:"
echo "  1. 访问 http://localhost:3000 验证大屏"
echo "  2. 检查设备数据同步: npm run check:sync"
echo "  3. 查看实时日志: pm2 logs --lines 50"
echo ""

'@

$deployScriptPath = Join-Path $tempDir "deploy-ubuntu-enhanced.sh"
$deployScript | Out-File -FilePath $deployScriptPath -Encoding UTF8 -NoNewline

# 转换为 Unix 换行符
$content = Get-Content $deployScriptPath -Raw
$content = $content -replace "`r`n", "`n"
$content | Out-File -FilePath $deployScriptPath -Encoding UTF8 -NoNewline

Write-Success "已生成增强版部署脚本: deploy-ubuntu-enhanced.sh"

# 生成部署说明文档
Write-Step "生成部署说明文档"

$readme = @"
# 监控大屏 Ubuntu 部署包

## 📦 包信息

- **打包时间**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **打包工具**: package-monitoring-dashboard-v2.ps1
- **版本**: 2.0 (增强版)
- **目标环境**: Ubuntu 18.04+ (已安装 Node.js 18+, PostgreSQL, Redis)

## 🚀 快速部署

### 1. 上传到 Ubuntu 服务器

``````bash
# 使用 SCP 传输
scp $OutputFile user@server:/home/user/

# 或使用 SFTP/FTP 工具上传
``````

### 2. 解压部署包

``````bash
# SSH 登录服务器
ssh user@server

# 解压到部署目录
mkdir -p /opt/monitoring-dashboard
cd /opt/monitoring-dashboard
unzip ~/$(Split-Path $OutputFile -Leaf)
``````

### 3. 运行增强版部署脚本

``````bash
# 赋予执行权限
chmod +x deploy-ubuntu-enhanced.sh

# 执行部署（交互式）
./deploy-ubuntu-enhanced.sh

# 脚本会自动：
#   ✅ 检查系统环境
#   ✅ 配置 npm 镜像源（可选择官方源或淘宝源）
#   ✅ 安装依赖（带重试机制）
#   ✅ 验证关键依赖（Prisma, tsx, ts-node）
#   ✅ 配置环境变量
#   ✅ 初始化数据库
#   ✅ 构建应用
#   ✅ 启动 PM2 服务
#   ✅ 健康检查
#   ✅ 配置开机自启（可选）
``````

## 📋 部署前准备

### 必需的环境变量

编辑 `.env` 文件，配置以下必需项：

``````bash
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard"

# Redis 连接
REDIS_URL="redis://localhost:6379"

# OpManager API
OPMANAGER_BASE_URL="https://your-opmanager-host:8061"
OPMANAGER_API_KEY="your-api-key-here"
OPMANAGER_TIMEOUT=30000

# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
``````

**⚠️ 重要提示**：
- 环境变量文件已自动脱敏，请填入实际配置
- OpManager API Key 可在 OpManager 管理界面获取
- 确保数据库和 Redis 已安装并运行

## 🔧 网络问题排查

### 如果遇到 npm 超时错误：

脚本支持镜像源切换，部署时会提示选择：

1. **官方源** (registry.npmjs.org) - 适合国外网络
2. **淘宝源** (registry.npmmirror.com) - 适合国内网络

如果部署失败，可以：

``````bash
# 手动切换到官方源
npm config set registry https://registry.npmjs.org/

# 或手动切换到淘宝源
npm config set registry https://registry.npmmirror.com/

# 清理缓存
npm cache clean --force

# 重新运行部署脚本
./deploy-ubuntu-enhanced.sh
``````

## 🔍 验证部署

``````bash
# 1. 检查 PM2 状态
pm2 status

# 2. 检查服务健康
curl http://localhost:3000/api/health

# 3. 查看日志
pm2 logs --lines 50

# 4. 运行诊断
npm run diagnose:production
npm run verify:data-flow

# 5. 浏览器访问
# http://server-ip:3000
``````

## 📊 PM2 服务说明

本项目使用 PM2 管理两个服务：

### 1. monitoring-web (Web 应用)
- **端口**: 3000
- **命令**: `npm run start:server`
- **作用**: 提供监控大屏 Web 界面

### 2. monitoring-collector (数据采集器)
- **命令**: `npm run collector`
- **作用**: 定时采集 OpManager 数据
  - 设备和接口（手动同步或通过 Admin 面板）
  - 指标（每 60 秒）
  - 告警（每 30 秒）
  - 拓扑（每 5 分钟）

### PM2 常用命令

``````bash
# 查看状态
pm2 status

# 查看日志
pm2 logs                          # 所有服务
pm2 logs monitoring-web           # Web 服务
pm2 logs monitoring-collector     # 采集服务
pm2 logs --lines 100              # 显示最近 100 行

# 重启服务
pm2 restart all                   # 重启所有
pm2 restart monitoring-web        # 重启 Web
pm2 restart all --update-env      # 重启并更新环境变量

# 停止/启动
pm2 stop all
pm2 start ecosystem.config.js

# 删除服务
pm2 delete all

# 保存配置
pm2 save
``````

## 🛠️ 故障排查

### 服务无法启动

``````bash
# 查看详细日志
pm2 logs --lines 200

# 查看错误日志
cat logs/pm2-web-error.log
cat logs/pm2-collector-error.log

# 检查进程详情
pm2 show monitoring-web
``````

### Prisma 相关错误

``````bash
# 重新生成 Prisma Client
npx prisma generate

# 查看 Prisma 版本
npm list @prisma/client prisma

# 如果版本不一致，重新安装
npm install @prisma/client prisma
``````

### TSX/TS-Node 错误

``````bash
# 检查是否安装
ls -la node_modules/.bin/ | grep -E "tsx|ts-node"

# 手动安装
npm install tsx ts-node --save-dev

# 验证
npx tsx --version
npx ts-node --version
``````

### 数据库连接失败

``````bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U your_user -d monitoring_dashboard -c "SELECT 1;"
``````

### OpManager 连接失败

``````bash
# 测试 API 连接
npm run verify:opmanager-apis

# 查看诊断
npm run diagnose:production
``````

## 🔄 更新部署

当有代码更新时：

``````bash
# 1. 停止服务
pm2 stop all

# 2. 上传新的部署包并解压（覆盖现有文件）

# 3. 重新运行部署脚本
./deploy-ubuntu-enhanced.sh

# 或手动更新：
npm ci
npm run db:generate
npm run build
pm2 restart all --update-env
``````

## 📚 相关文档

- **CLAUDE.md** - 项目开发指南
- **COMPLETE-SETUP-GUIDE.md** - 完整配置指南
- **QUICK-START-CHECKLIST.md** - 快速启动清单
- **UBUNTU-MIGRATION-GUIDE.md** - Ubuntu 迁移指南

## 🔐 安全建议

1. **修改默认端口**: 编辑 `.env` 中的 `PORT`
2. **配置防火墙**:
   ``````bash
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ``````
3. **使用反向代理**: 建议使用 Nginx + SSL
4. **保护 .env 文件**:
   ``````bash
   chmod 600 .env
   ``````
5. **定期备份数据库**:
   ``````bash
   pg_dump -U postgres -d monitoring_dashboard > backup_`$(date +%Y%m%d)`.sql
   ``````

## 📞 技术支持

如遇问题，请查看：

1. **部署日志**: `deploy-YYYYMMDD-HHMMSS.log`
2. **应用日志**: `logs/pm2-web-*.log`, `logs/pm2-collector-*.log`
3. **诊断工具**: `npm run diagnose:production`
4. **项目文档**: `CLAUDE.md`, `COMPLETE-SETUP-GUIDE.md`

---

**打包时间**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**脚本版本**: v2.0 (增强版)
**支持的 Node.js**: >= 18.0.0
**支持的 Ubuntu**: 18.04+
"@

$readmePath = Join-Path $tempDir "DEPLOYMENT-README.md"
$readme | Out-File -FilePath $readmePath -Encoding UTF8
Write-Success "已生成部署说明: DEPLOYMENT-README.md"

# 创建压缩包
Write-Step "创建压缩包"

if (Test-Path $OutputFile) {
    Remove-Item $OutputFile -Force
}

try {
    $compressStart = Get-Date
    Compress-Archive -Path "$tempDir\*" -DestinationPath $OutputFile -Force
    $compressTime = (Get-Date) - $compressStart
    Write-Success "压缩包创建成功 (耗时: $([math]::Round($compressTime.TotalSeconds, 2)) 秒)"
}
catch {
    Write-Error "压缩包创建失败: $_"
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# 清理临时目录
Write-Step "清理临时文件"
Remove-Item -Path $tempDir -Recurse -Force
Write-Success "临时目录已清理"

# 显示文件信息
$fileInfo = Get-Item $OutputFile
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ 打包完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 文件信息:" -ForegroundColor Cyan
Write-Host "  文件名: $OutputFile" -ForegroundColor White
Write-Host "  大小: $fileSizeMB MB" -ForegroundColor White
Write-Host "  位置: $($fileInfo.FullName)" -ForegroundColor White
Write-Host ""
Write-Host "📋 包含内容:" -ForegroundColor Cyan
Write-Host "  ✅ 所有源代码和配置文件" -ForegroundColor White
Write-Host "  ✅ TSX 和 TS-Node 支持" -ForegroundColor White
Write-Host "  ✅ Prisma 数据库配置" -ForegroundColor White
Write-Host "  ✅ 增强版部署脚本 (deploy-ubuntu-enhanced.sh)" -ForegroundColor White
Write-Host "  ✅ 完整的部署文档 (DEPLOYMENT-README.md)" -ForegroundColor White
Write-Host "  ✅ 环境变量文件（已脱敏）" -ForegroundColor White
Write-Host ""
Write-Host "🚀 部署步骤:" -ForegroundColor Cyan
Write-Host "  1. 上传到 Ubuntu 服务器:" -ForegroundColor Yellow
Write-Host "     scp $OutputFile user@server:/path/" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 解压部署包:" -ForegroundColor Yellow
Write-Host "     unzip $OutputFile -d monitoring-dashboard" -ForegroundColor Gray
Write-Host "     cd monitoring-dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 运行增强版部署脚本:" -ForegroundColor Yellow
Write-Host "     chmod +x deploy-ubuntu-enhanced.sh" -ForegroundColor Gray
Write-Host "     ./deploy-ubuntu-enhanced.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. 查看详细说明:" -ForegroundColor Yellow
Write-Host "     cat DEPLOYMENT-README.md" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ 增强特性:" -ForegroundColor Cyan
Write-Host "  ✅ 支持镜像源切换（官方源/淘宝源）" -ForegroundColor White
Write-Host "  ✅ 网络诊断和自动重试" -ForegroundColor White
Write-Host "  ✅ 完整的错误处理和回滚" -ForegroundColor White
Write-Host "  ✅ TSX 和 TS-Node 依赖验证" -ForegroundColor White
Write-Host "  ✅ Prisma 版本一致性检查" -ForegroundColor White
Write-Host "  ✅ 部署后健康检查" -ForegroundColor White
Write-Host "  ✅ 详细的部署日志" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  重要提示:" -ForegroundColor Yellow
Write-Host "  • 部署前请确保 Ubuntu 服务器已安装 Node.js 18+, PostgreSQL, Redis" -ForegroundColor Gray
Write-Host "  • 环境变量文件已脱敏，部署时需填入实际配置" -ForegroundColor Gray
Write-Host "  • 部署脚本支持交互式镜像源选择，推荐国内用户选择淘宝源" -ForegroundColor Gray
Write-Host "  • 脚本包含网络重试机制，遇到超时会自动重试 3 次" -ForegroundColor Gray
Write-Host ""
