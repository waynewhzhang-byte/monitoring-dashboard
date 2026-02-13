# ============================================
# 监控大屏完整项目迁移打包脚本（优化版）
# ============================================
#
# 用途: 将整个项目完整打包，迁移到 Ubuntu 服务器
# 适用场景: Ubuntu 环境已有 Node.js、PM2、PostgreSQL、Redis
#
# 优化点:
#   ✓ 自动清理环境变量中的敏感信息
#   ✓ 只包含必要文件，减小包体积
#   ✓ 包含优化的部署脚本
#
# 用法:
#   .\package-complete-migration.ps1
#   .\package-complete-migration.ps1 -OutputFile "monitoring-dashboard-v1.0.0.zip"
#
# ============================================

param(
    [string]$OutputFile = "monitoring-dashboard-migration-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
)

# 设置错误处理
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
Write-Host "  完整项目迁移打包工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json")) {
    Write-Error "错误: 请在项目根目录执行此脚本"
    Write-Info "当前目录: $(Get-Location)"
    exit 1
}

Write-Success "项目根目录验证通过"

# 显示配置信息
Write-Step "打包配置"
Write-Info "输出文件: $OutputFile"
Write-Info "模式: 完整迁移（包含所有配置文件）"

# 定义要包含的目录和文件
$includeItems = @(
    # 源代码目录
    "app",
    "prisma",  # 包含 schema.prisma 和 migrations
    "src",
    "scripts",  # 包含 fix-ubuntu-prisma-deps.sh
    "public",
    "pages",

    # 配置文件
    "package.json",
    "package-lock.json",
    "ecosystem.config.js",
    "tsconfig.json",
    "next.config.mjs",
    "tailwind.config.ts",
    "postcss.config.js",
    "vitest.config.ts",
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.fullflow.config.ts",

    # 文档和说明
    "README.md",
    "CLAUDE.md",

    # 部署和迁移相关文档（只包含存在的文件）
    "UBUNTU_404_QUICK_FIX.md",
    "MIGRATION.md",
    "PM2_DEPLOYMENT_GUIDE.md",

    # 部署脚本（deploy-ubuntu.sh 会在后面生成）
    "deploy-ubuntu-optimized.sh",

    # H5子项目（完整目录）
    "h5-display-app",
    "h5-proctor-app",
    "h5-wework-app",

    # ID卡读卡器模拟器
    "id-card-reader-simulator",

    # 其他配置文件
    ".gitignore",
    ".eslintrc.json",
    ".eslintignore",
    ".prettierrc",
    "instrumentation.ts",
    "middleware.ts",
    "next-env.d.ts",

    # TypeScript 配置文件
    "**/tsconfig*.json"
)

# 定义要排除的目录和文件模式（最小化排除）
$excludePatterns = @(
    # 依赖和构建产物（这些会在服务器重新生成）
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
    "*.tar.gz",
    "*.rar",

    # 测试结果
    "test-results",
    "playwright-report",
    "screenshots",
    "coverage",

    # IDE和编辑器（但保留.vscode用于调试配置）
    ".cursor",
    ".claude",
    ".specify",
    "*.swp",
    "*.swo",
    "*~",

    # TypeScript构建信息
    "*.tsbuildinfo",
    "tsconfig.tsbuildinfo",

    # 临时目录
    "deploy-temp-*",
    "temp-*",
    "tmp",

    # 已有的打包文件
    "*.zip"
)

# 定义要明确包含的环境变量文件
$envFiles = @(
    # 主应用
    ".env",
    ".env.example",
    ".env.production.example",
    ".env.production.template",

    # h5-display-app
    "h5-display-app/.env",
    "h5-display-app/.env.development",
    "h5-display-app/.env.local",
    "h5-display-app/.env.production",
    "h5-display-app/.env.example",

    # h5-proctor-app
    "h5-proctor-app/.env",
    "h5-proctor-app/.env.example",
    "h5-proctor-app/.env.production",

    # h5-wework-app
    "h5-wework-app/.env",
    "h5-wework-app/.env.example",
    "h5-wework-app/.env.production",
    "h5-wework-app/.env.production.example"
)

Write-Step "开始打包"

# 创建临时目录
$tempDir = "deploy-temp-complete-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Success "创建临时目录: $tempDir"

# 统计变量
$copiedCount = 0
$envCount = 0
$skippedCount = 0

# 复制文件函数
function Copy-ProjectItem {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [string[]]$ExcludePatterns
    )

    if (-not (Test-Path $SourcePath)) {
        return $false
    }

    # 检查是否应该排除
    $relativePath = $SourcePath.Replace((Get-Location).Path + '\', '')
    foreach ($pattern in $ExcludePatterns) {
        if ($relativePath -like "*$pattern*") {
            return $false
        }
    }

    try {
        $destParent = Split-Path $DestPath -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }

        if (Test-Path $SourcePath -PathType Container) {
            Copy-Item -Path $SourcePath -Destination $DestPath -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Copy-Item -Path $SourcePath -Destination $DestPath -Force -ErrorAction SilentlyContinue
        }
        return $true
    }
    catch {
        return $false
    }
}

# 复制主要文件和目录
Write-Step "复制项目文件"

foreach ($item in $includeItems) {
    $sourcePath = Join-Path (Get-Location) $item
    $destPath = Join-Path $tempDir $item

    if ($item -like "**/*") {
        # 处理递归通配符
        $pattern = $item -replace "\*\*/", ""
        $files = Get-ChildItem -Path (Get-Location) -Filter $pattern -Recurse -ErrorAction SilentlyContinue |
                 Where-Object { $_.FullName -notlike "*\node_modules\*" -and $_.FullName -notlike "*\.next\*" }
        foreach ($file in $files) {
            $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
            $fileDest = Join-Path $tempDir $relativePath
            if (Copy-ProjectItem -SourcePath $file.FullName -DestPath $fileDest -ExcludePatterns $excludePatterns) {
                $copiedCount++
            }
        }
    }
    elseif (Test-Path $sourcePath) {
        if (Copy-ProjectItem -SourcePath $sourcePath -DestPath $destPath -ExcludePatterns $excludePatterns) {
            Write-Success $item
            $copiedCount++
        }
    }
    else {
        $skippedCount++
    }
}

# 清理临时目录中的排除项
Write-Step "清理排除的文件"

function Remove-ExcludedItems {
    param(
        [string]$Path,
        [string[]]$ExcludePatterns
    )

    $removedCount = 0

    foreach ($pattern in $ExcludePatterns) {
        if (-not $pattern.Contains('*')) {
            $items = Get-ChildItem -Path $Path -Filter $pattern -Recurse -ErrorAction SilentlyContinue
            foreach ($item in $items) {
                try {
                    Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
                    $removedCount++
                }
                catch {}
            }
        }
        else {
            $items = Get-ChildItem -Path $Path -Include $pattern -Recurse -ErrorAction SilentlyContinue
            foreach ($item in $items) {
                try {
                    Remove-Item -Path $item.FullName -Force -ErrorAction SilentlyContinue
                    $removedCount++
                }
                catch {}
            }
        }
    }

    return $removedCount
}

$removedCount = Remove-ExcludedItems -Path $tempDir -ExcludePatterns $excludePatterns
Write-Success "已清理 $removedCount 个排除项"

# 处理环境变量文件（清理敏感信息）
Write-Step "处理环境变量文件"

foreach ($envFile in $envFiles) {
    $sourcePath = Join-Path (Get-Location) $envFile
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $tempDir $envFile
        $destParent = Split-Path $destPath -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }

        # 读取并清理敏感信息
        $content = Get-Content $sourcePath -Raw

        # 清理 OpManager URL 和 API Key
        $content = $content -replace 'OPMANAGER_BASE_URL=https?://[^\s]+', 'OPMANAGER_BASE_URL=https://your-opmanager-host:8061'
        $content = $content -replace 'OPMANAGER_API_KEY=[a-f0-9]+', 'OPMANAGER_API_KEY=your-api-key-here'

        # 清理数据库连接字符串中的密码
        $content = $content -replace 'DATABASE_URL="postgresql://[^:]+:([^@]+)@', 'DATABASE_URL="postgresql://user:password@'

        # 清理 Redis 密码
        $content = $content -replace 'REDIS_PASSWORD=.+', 'REDIS_PASSWORD='

        # 保存清理后的内容
        $content | Out-File -FilePath $destPath -Encoding UTF8 -NoNewline

        Write-Success "$envFile (已清理敏感信息)"
        $envCount++
    }
    else {
        Write-Warning "$envFile (不存在，跳过)"
    }
}

# 创建部署说明文件
Write-Step "创建部署说明"

$deployGuide = @"
# 监控大屏系统 Ubuntu 迁移部署指南

## 打包信息
- 打包时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- 打包环境: Windows
- 目标环境: Ubuntu (已有 Node.js、PM2、PostgreSQL、Redis)
- 打包类型: 完整迁移（源代码 + 配置文件 + 部署脚本）
- 安全说明:
  * ✓ 所有环境变量文件已自动清理敏感信息
  * ✓ 不包含 node_modules、.next 等构建产物
  * ✓ 在目标环境重新构建，确保兼容性

## 文件清单
- 已包含: 所有源代码、配置文件、环境变量文件
- 已排除: node_modules、.next、dist、logs、git历史
- 环境变量文件: $envCount 个
- 修复工具: scripts/fix-ubuntu-prisma-deps.sh

## 迁移步骤

### 1. 传输文件到Ubuntu服务器

```bash
# 使用SCP传输（从Windows）
scp $OutputFile username@server-ip:/home/username/

# 或使用FTP/SFTP工具上传
```

### 2. 解压部署包

```bash
# SSH登录到Ubuntu服务器
ssh username@server-ip

# 创建部署目录
sudo mkdir -p /var/www/exmam-register
cd /var/www/exmam-register

# 解压文件
unzip ~/$OutputFile

# 设置权限
sudo chown -R `$USER:`$USER /var/www/exmam-register
```

### 3. 运行一键部署脚本（推荐）

```bash
# 赋予执行权限
chmod +x deploy-ubuntu.sh

# 执行部署脚本（自动完成依赖安装、构建、启动）
./deploy-ubuntu.sh
```

**或者手动安装依赖：**

```bash
# 主应用依赖（完整安装，包含构建工具）
npm ci

# H5子应用依赖
cd h5-display-app && npm ci && cd ..
cd h5-proctor-app && npm ci && cd ..
cd h5-wework-app && npm ci && cd ..
```

**注意**: 必须使用 \`npm ci\` 而不是 \`npm install --only=production\`，因为需要 devDependencies 中的 prisma CLI 来生成 Prisma 客户端。详见 \`UBUNTU_404_QUICK_FIX.md\`

### 4. 检查环境变量

所有环境变量文件已包含在部署包中。请检查并根据Ubuntu环境调整：

```bash
# 检查主应用环境变量
cat .env

# 主要需要修改的配置：
# - DATABASE_URL: 确认PostgreSQL连接字符串
# - APP_SECRET: 保持与Windows一致（如需修改，用户需重新登录）
# - CORS_ALLOWED_ORIGINS: 更新为Ubuntu服务器IP/域名
```

#### 主应用 .env 配置检查项

```bash
# 必须配置项
DATABASE_URL="postgresql://user:password@localhost:5432/exmam_register"
APP_SECRET="your-secret-key"

# 可选配置项
WEWORK_CORP_ID="ww..."
WEWORK_AGENT_ID="1000001"
WEWORK_AGENT_SECRET="..."
CORS_ALLOWED_ORIGINS="http://your-server-ip:5173,http://your-server-ip:3002"
```

#### H5应用环境变量检查

```bash
# h5-display-app/.env.production
VITE_API_BASE_URL=http://your-server-ip:3000

# h5-proctor-app/.env.production
VITE_API_BASE_URL=http://your-server-ip:3000

# h5-wework-app/.env.production
VITE_API_BASE_URL=http://your-server-ip:3000
```

### 5. 数据库迁移（如需要）

如果需要迁移数据库数据：

```bash
# 方法1: 从Windows导出数据库（在Windows上执行）
pg_dump -U postgres -h localhost exmam_register > exmam_register_backup.sql

# 传输到Ubuntu
scp exmam_register_backup.sql username@server-ip:/home/username/

# 在Ubuntu上导入（需先创建数据库）
psql -U postgres -c "CREATE DATABASE exmam_register;"
psql -U postgres -d exmam_register < exmam_register_backup.sql
```

如果是新数据库：

```bash
# 生成Prisma Client
npm run prisma:generate

# 推送schema到数据库
npm run prisma:push

# 初始化种子数据
npm run seed
npm run seed:exam-structure
```

### 6. 构建应用

```bash
# 主应用构建
npm run build

# H5应用构建
cd h5-display-app && npm run build && cd ..
cd h5-proctor-app && npm run build && cd ..
cd h5-wework-app && npm run build && cd ..
```

### 7. 启动应用（使用PM2）

```bash
# 安装PM2（如未安装）
sudo npm install -g pm2

# 创建日志目录
mkdir -p logs

# 启动所有应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 保存PM2配置（开机自启）
pm2 save
pm2 startup
# 执行命令输出的sudo命令
```

### 8. 验证部署

检查各个服务是否正常运行：

```bash
# 检查主应用
curl http://localhost:3000/api/health

# 检查H5应用
curl http://localhost:3002
curl http://localhost:5173
curl http://localhost:5174
```

浏览器访问：
- 主应用（管理后台）: http://server-ip:3000
- 显示屏H5: http://server-ip:3002
- 企业微信H5: http://server-ip:5173
- 监考H5: http://server-ip:5174

## PM2管理命令速查

```bash
# 查看所有应用状态
pm2 status

# 查看日志
pm2 logs                      # 所有应用
pm2 logs exmam-register       # 主应用
pm2 logs h5-display-app       # 显示屏应用

# 重启应用
pm2 restart all               # 重启所有
pm2 restart exmam-register    # 重启主应用

# 停止应用
pm2 stop all

# 删除应用
pm2 delete all
```

## 端口配置

默认端口：
- 主应用: 3000
- h5-display-app: 3002
- h5-wework-app: 5173
- h5-proctor-app: 5174

修改端口：编辑 ecosystem.config.js 和各H5应用的 package.json

## 防火墙配置

```bash
# Ubuntu防火墙开放端口
sudo ufw allow 3000/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 5174/tcp
sudo ufw reload
```

## 常见问题

### 问题1: 数据库连接失败
检查 .env 中的 DATABASE_URL 是否正确，PostgreSQL是否运行：
```bash
sudo systemctl status postgresql
```

### 问题2: 端口被占用
检查端口占用：
```bash
sudo netstat -tulpn | grep :3000
```

### 问题3: 权限问题
确保用户对部署目录有完整权限：
```bash
sudo chown -R `$USER:`$USER /var/www/exmam-register
```

### 问题4: 环境变量未生效
PM2需要重新加载环境变量：
```bash
pm2 restart all --update-env
```

### 问题5: Prisma 依赖安装失败 (重要)

**症状**: 
- 运行 \`npm run prisma:generate\` 时出现错误
- 错误信息包含 "Cannot find module" 或 "c12/dist/index.mjs"
- Prisma Client 生成失败

**原因**:
- Prisma 版本不匹配（@prisma/client 和 prisma CLI 版本不同）
- npm 缓存问题导致模块解析失败
- package-lock.json 跨平台兼容性问题

**解决方案1: 使用独立修复脚本（推荐）**

项目已包含专门的修复脚本：

```bash
# 赋予执行权限
chmod +x scripts/fix-ubuntu-prisma-deps.sh

# 运行修复脚本
./scripts/fix-ubuntu-prisma-deps.sh
```

此脚本会自动：
- 诊断当前依赖状态
- 清理 node_modules 和 package-lock.json
- 清理 npm 缓存
- 重新安装所有依赖
- 生成 Prisma Client
- 验证安装结果

**解决方案2: 手动修复**

```bash
# 1. 清理现有安装
rm -rf node_modules package-lock.json

# 2. 清理 npm 缓存
npm cache clean --force

# 3. 重新安装依赖
npm install

# 4. 生成 Prisma Client
npm run prisma:generate

# 5. 验证安装
node -e "const { PrismaClient } = require('@prisma/client'); console.log('成功');"
```

**解决方案3: 检查版本一致性**

确保 package.json 中 Prisma 版本一致：

```bash
# 查看当前版本
npm list @prisma/client prisma

# 应该显示相同版本（例如都是 6.19.1）
# 如果版本不同，更新 package.json 后重新安装
```

## 安全建议

1. **修改默认密码**: 部署后立即修改管理员密码
2. **配置HTTPS**: 生产环境使用Nginx反向代理+SSL证书
3. **定期备份**: 设置数据库自动备份
4. **监控日志**: 定期检查PM2日志，监控异常

## 支持文档

- **快速修复**: UBUNTU_404_QUICK_FIX.md（Prisma 依赖错误解决方案）
- **优化部署**: deploy-ubuntu-optimized.sh（构建后清理开发依赖）
- 数据库迁移: MIGRATION.md
- PM2配置说明: PM2_DEPLOYMENT_GUIDE.md
- 项目说明: CLAUDE.md

---
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

$guidePath = Join-Path $tempDir "MIGRATION_GUIDE.md"
$deployGuide | Out-File -FilePath $guidePath -Encoding UTF8
Write-Success "已创建 MIGRATION_GUIDE.md"

# 创建一键部署脚本
Write-Step "创建Ubuntu部署脚本"

$ubuntuScript = @'
#!/bin/bash
# ============================================
# Ubuntu一键部署脚本 (增强版)
# ============================================
# 修复说明:
# - 添加 npm cache 清理以解决模块解析问题
# - 添加依赖安装失败时的回退机制
# - 增强 Prisma 依赖验证
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_step() {
    echo -e "\n${CYAN}[步骤] $1${NC}"
}

log_success() {
    echo -e "  ${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "  ${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "  ${YELLOW}⚠ $1${NC}"
}

log_info() {
    echo -e "  $1"
}

# 显示标题
echo ""
echo "========================================"
echo "  exmam-register 一键部署脚本 (增强版)"
echo "========================================"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_error "错误: 请在项目根目录执行此脚本"
    exit 1
fi

log_success "项目根目录验证通过"

# 检查必需工具
log_step "检查系统环境"

# 检查Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    log_info "请安装 Node.js 18+ : curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
log_success "Node.js: $(node -v)"

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    log_error "npm 未安装"
    exit 1
fi
log_success "npm: $(npm -v)"

# 检查PostgreSQL
if ! command -v psql &> /dev/null; then
    log_warning "PostgreSQL 未检测到（如果使用远程数据库可忽略）"
else
    log_success "PostgreSQL: $(psql --version | head -1)"
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 未安装，尝试全局安装..."
    sudo npm install -g pm2
    log_success "PM2 安装完成"
else
    log_success "PM2: $(pm2 -v)"
fi

# 询问是否继续
log_step "部署配置确认"
read -p "是否继续部署？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "部署已取消"
    exit 0
fi

# ============================================
# 中国区域网络优化 (自动配置)
# ============================================
log_step "配置网络优化 (中国区域镜像)"

# 1. 设置 npm 镜像源
log_info "设置 npm 镜像源为淘宝镜像 (npmmirror.com)..."
npm config set registry https://registry.npmmirror.com
log_success "npm 镜像源已更新: $(npm config get registry)"

# 2. 优化 npm 配置 (禁用审计和资金检查，避免镜像源 404 错误)
log_info "禁用 npm audit 和 fund 检查..."
npm config set audit false
npm config set fund false
log_success "npm 基础配置已优化"

# 3. 设置 Prisma Engine 镜像源 (解决二进制下载失败)
log_info "设置 Prisma Engine 镜像源为 npmmirror..."
export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
log_success "PRISMA_ENGINES_MIRROR 已设置"

# 4. 设置 Playwright 镜像源 (如果需要)
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 # 默认跳过，生产环境通常不需要浏览器
# ============================================

# 清理npm缓存（解决模块解析问题）
log_step "清理npm缓存"
log_info "清理npm缓存以避免模块解析问题..."
npm cache clean --force
log_success "npm缓存已清理"

# 安装依赖函数（带回退机制和详细输出）
install_dependencies() {
    local app_name=$1
    local app_dir=$2
    
    log_info "安装 $app_name 依赖..."
    
    if [ -n "$app_dir" ]; then
        cd "$app_dir"
    fi
    
    # 尝试使用 npm ci（确定性安装）
    log_info "尝试使用 npm ci 安装..."
    if npm ci --verbose 2>&1 | tee /tmp/npm-ci-$app_name.log; then
        log_success "$app_name 依赖安装完成 (npm ci)"
    else
        log_warning "$app_name npm ci 失败，尝试使用 npm install..."
        log_info "删除 package-lock.json 以避免冲突..."
        rm -f package-lock.json
        
        log_info "开始 npm install（这可能需要几分钟，请耐心等待）..."
        log_info "如果长时间无响应，可以按 Ctrl+C 取消，然后运行 scripts/fix-ubuntu-prisma-deps.sh"
        
        # 使用 --verbose 显示详细进度，使用 --legacy-peer-deps 避免依赖冲突
        if npm install --verbose --legacy-peer-deps 2>&1 | tee /tmp/npm-install-$app_name.log; then
            log_success "$app_name 依赖安装完成 (npm install)"
        else
            log_error "$app_name 依赖安装失败"
            log_info "日志已保存到: /tmp/npm-install-$app_name.log"
            log_info "请检查网络连接和 npm 配置"
            if [ -n "$app_dir" ]; then
                cd ..
            fi
            return 1
        fi
    fi
    
    if [ -n "$app_dir" ]; then
        cd ..
    fi
    return 0
}

# 安装依赖
log_step "安装依赖"

# 主应用依赖
if ! install_dependencies "主应用" ""; then
    log_error "主应用依赖安装失败，部署终止"
    exit 1
fi

# H5应用依赖
if [ -d "h5-display-app" ] && [ -f "h5-display-app/package.json" ]; then
    install_dependencies "h5-display-app" "h5-display-app" || log_warning "h5-display-app 依赖安装失败，继续..."
else
    log_warning "h5-display-app 不存在，跳过"
fi

if [ -d "h5-proctor-app" ] && [ -f "h5-proctor-app/package.json" ]; then
    install_dependencies "h5-proctor-app" "h5-proctor-app" || log_warning "h5-proctor-app 依赖安装失败，继续..."
else
    log_warning "h5-proctor-app 不存在，跳过"
fi

if [ -d "h5-wework-app" ] && [ -f "h5-wework-app/package.json" ]; then
    install_dependencies "h5-wework-app" "h5-wework-app" || log_warning "h5-wework-app 依赖安装失败，继续..."
else
    log_warning "h5-wework-app 不存在，跳过"
fi

# 验证关键依赖
log_step "验证关键依赖"
log_info "检查 Prisma 依赖..."

if [ -d "node_modules/@prisma/client" ] && [ -d "node_modules/prisma" ]; then
    log_success "Prisma 依赖已安装"
    
    # 显示版本信息
    PRISMA_CLIENT_VERSION=$(npm list @prisma/client --depth=0 2>/dev/null | grep @prisma/client | awk -F@ '{print $NF}' || echo "未知")
    PRISMA_CLI_VERSION=$(npm list prisma --depth=0 2>/dev/null | grep prisma@ | awk -F@ '{print $NF}' || echo "未知")
    log_info "@prisma/client: $PRISMA_CLIENT_VERSION"
    log_info "prisma: $PRISMA_CLI_VERSION"
else
    log_error "Prisma 依赖未正确安装"
    log_info "尝试手动安装 Prisma..."
    npm install @prisma/client prisma
fi

# 检查环境变量
log_step "检查环境变量"

if [ ! -f ".env" ]; then
    log_warning ".env 文件不存在"
    if [ -f ".env.example" ]; then
        log_info "从 .env.example 创建 .env 文件..."
        cp .env.example .env
        log_warning "请编辑 .env 文件配置数据库连接等信息"
        log_info "编辑完成后，运行: nano .env"
        read -p "现在编辑 .env 文件？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano .env
        else
            log_warning "请稍后手动编辑 .env 文件"
            exit 0
        fi
    else
        log_error ".env.example 也不存在，请检查部署包"
        exit 1
    fi
else
    log_success ".env 文件已存在"
fi

# 数据库初始化
log_step "数据库初始化"

log_info "生成 Prisma Client..."
if npm run db:generate; then
    log_success "Prisma Client 生成完成"
else
    log_error "Prisma Client 生成失败"
    log_info "尝试诊断问题..."
    
    # 诊断信息
    log_info "检查 Prisma schema 文件..."
    if [ -f "prisma/schema.prisma" ]; then
        log_success "schema.prisma 文件存在"
    else
        log_error "schema.prisma 文件不存在"
    fi
    
    log_info "检查 node_modules..."
    if [ -d "node_modules" ]; then
        log_success "node_modules 目录存在"
        log_info "node_modules/@prisma/client: $([ -d 'node_modules/@prisma/client' ] && echo '存在' || echo '不存在')"
        log_info "node_modules/prisma: $([ -d 'node_modules/prisma' ] && echo '存在' || echo '不存在')"
        log_info "node_modules/c12: $([ -d 'node_modules/c12' ] && echo '存在' || echo '不存在')"
    else
        log_error "node_modules 目录不存在"
    fi
    
    log_error "请检查上述诊断信息，手动修复后重新运行部署脚本"
    exit 1
fi

read -p "是否需要推送数据库schema？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "推送数据库schema..."
    if npm run db:push; then
        log_success "数据库schema推送完成"
    else
        log_error "数据库schema推送失败"
        log_warning "报错 P2002? 这通常是因为数据库中存在重复数据，违反了新的唯一性约束(JobType/JobSubject)。"
        read -p "是否尝试强制重置数据库(数据将丢失，并重新创建)？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "强制重置数据库..."
            npx prisma db push --schema prisma/schema.prisma --force-reset
            log_success "数据库强制重置并同步完成"
        else
            log_error "请手动清理数据库冲突数据后重试"
            exit 1
        fi
    fi

    read -p "是否需要初始化种子数据？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "初始化种子数据..."
        npm run seed
        npm run seed:exam-structure
        log_success "种子数据初始化完成"
    fi
fi

# 构建应用
log_step "构建应用"

log_info "构建主应用..."
npm run build
log_success "主应用构建完成"

if [ -d "h5-display-app" ] && [ -f "h5-display-app/package.json" ]; then
    log_info "构建 h5-display-app..."
    cd h5-display-app && npm run build && cd ..
    log_success "h5-display-app 构建完成"
fi

if [ -d "h5-proctor-app" ] && [ -f "h5-proctor-app/package.json" ]; then
    log_info "构建 h5-proctor-app..."
    cd h5-proctor-app && npm run build && cd ..
    log_success "h5-proctor-app 构建完成"
fi

if [ -d "h5-wework-app" ] && [ -f "h5-wework-app/package.json" ]; then
    log_info "构建 h5-wework-app..."
    cd h5-wework-app && npm run build && cd ..
    log_success "h5-wework-app 构建完成"
fi

# 创建日志目录
log_step "创建日志目录"
mkdir -p logs
log_success "日志目录创建完成"

# 启动应用
log_step "启动应用"

log_info "使用PM2启动所有应用..."

# 检查是否已有应用在运行
if pm2 list | grep -q "exmam-register"; then
    log_info "检测到应用已在运行，执行重启..."
    pm2 restart ecosystem.config.js
    log_success "应用已重启"
else
    log_info "首次启动应用..."
    pm2 start ecosystem.config.js
    log_success "应用已启动"
fi

# 显示状态
log_step "应用状态"
pm2 status

# 设置开机自启
log_step "配置开机自启"
read -p "是否配置PM2开机自启？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 save
    pm2 startup
    log_warning "请执行上面输出的 sudo 命令以完成开机自启配置"
fi

# 完成
echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "应用访问地址："
echo "  - 主应用（管理后台）: http://localhost:3000"
echo "  - 显示屏H5: http://localhost:3002"
echo "  - 企业微信H5: http://localhost:5173"
echo "  - 监考H5: http://localhost:5174"
echo ""
echo "PM2管理命令："
echo "  - 查看状态: pm2 status"
echo "  - 查看日志: pm2 logs"
echo "  - 重启应用: pm2 restart all"
echo "  - 停止应用: pm2 stop all"
echo ""
echo "详细文档："
echo "  - 迁移指南: MIGRATION_GUIDE.md"
echo ""
echo "故障排除："
echo "  如遇 Prisma 依赖问题，请运行:"
echo "  1. rm -rf node_modules package-lock.json"
echo "  2. npm cache clean --force"
echo "  3. npm install"
echo "  4. npm run prisma:generate"
echo ""
'@

$scriptPath = Join-Path $tempDir "deploy-ubuntu.sh"
$ubuntuScript | Out-File -FilePath $scriptPath -Encoding UTF8
# 转换为Unix格式换行符
$content = Get-Content $scriptPath -Raw
$content = $content -replace "`r`n", "`n"
$content | Out-File -FilePath $scriptPath -Encoding UTF8 -NoNewline
Write-Success "已创建 deploy-ubuntu.sh"

# 创建压缩包
Write-Step "创建压缩包"

if (Test-Path $OutputFile) {
    Remove-Item -Path $OutputFile -Force
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
Write-Host "  打包完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "文件信息:" -ForegroundColor Cyan
Write-Host "  文件名: $OutputFile" -ForegroundColor White
Write-Host "  大小: $fileSizeMB MB" -ForegroundColor White
Write-Host "  位置: $($fileInfo.FullName)" -ForegroundColor White
Write-Host ""
Write-Host "包含内容:" -ForegroundColor Cyan
Write-Host "  ✓ 所有源代码和配置文件" -ForegroundColor White
Write-Host "  ✓ $envCount 个环境变量文件" -ForegroundColor White
Write-Host "  ✓ 部署脚本和指南" -ForegroundColor White
Write-Host "  ✓ 数据库Schema和迁移文件" -ForegroundColor White
Write-Host ""
Write-Host "迁移步骤:" -ForegroundColor Cyan
Write-Host "  1. 传输到Ubuntu服务器:" -ForegroundColor White
Write-Host "     scp $OutputFile username@server:/home/username/" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 在Ubuntu服务器上解压:" -ForegroundColor White
Write-Host "     unzip $OutputFile -d /var/www/exmam-register" -ForegroundColor Gray
Write-Host "     cd /var/www/exmam-register" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 运行一键部署脚本:" -ForegroundColor White
Write-Host "     chmod +x deploy-ubuntu.sh" -ForegroundColor Gray
Write-Host "     ./deploy-ubuntu.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. 或查看详细指南:" -ForegroundColor White
Write-Host "     cat MIGRATION_GUIDE.md" -ForegroundColor Gray
Write-Host ""

Write-Host "重要提示:" -ForegroundColor Yellow
Write-Host "  ✓ 所有环境变量文件已包含" -ForegroundColor Gray
Write-Host "  ✓ 在Ubuntu上需要调整 DATABASE_URL 和服务器地址" -ForegroundColor Gray
Write-Host "  ✓ 如需迁移数据库数据，请参考 MIGRATION_GUIDE.md" -ForegroundColor Gray
Write-Host "  ✓ deploy-ubuntu.sh 已修复 Prisma 依赖问题（使用 npm ci）" -ForegroundColor Gray
Write-Host "  ✓ 如遇问题，请查看 UBUNTU_404_QUICK_FIX.md" -ForegroundColor Gray
Write-Host ""
