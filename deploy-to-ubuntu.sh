#!/bin/bash
# ============================================
# 监控大屏 Ubuntu 部署脚本（优化版）
# ============================================
# 适用场景: Ubuntu 环境已有 Node.js、PM2、PostgreSQL、Redis
# 用途: 部署或更新监控大屏系统
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
echo "  监控大屏系统 Ubuntu 部署脚本"
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
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi
log_success "Node.js: $(node -v)"

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
    log_success "PostgreSQL: 已安装"
fi

# 检查Redis
if ! command -v redis-cli &> /dev/null; then
    log_warning "Redis 未检测到（如果使用远程 Redis 可忽略）"
else
    log_success "Redis: 已安装"
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 未安装，尝试全局安装..."
    sudo npm install -g pm2
    log_success "PM2 安装完成"
else
    log_success "PM2: $(pm2 -v)"
fi

# 检查环境变量文件
log_step "检查环境变量配置"

if [ ! -f ".env" ]; then
    log_error ".env 文件不存在"
    if [ -f ".env.production.example" ]; then
        log_info "从 .env.production.example 创建 .env 文件..."
        cp .env.production.example .env
        log_warning "请立即编辑 .env 文件配置数据库连接和 OpManager API 信息"
        log_info "必须配置项:"
        log_info "  - DATABASE_URL: PostgreSQL 连接字符串"
        log_info "  - REDIS_URL: Redis 连接字符串"
        log_info "  - OPMANAGER_BASE_URL: OpManager 服务器地址"
        log_info "  - OPMANAGER_API_KEY: OpManager API Key"
        echo ""
        read -p "是否现在编辑 .env 文件？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano .env || vi .env
        else
            log_error "请先配置 .env 文件后再运行此脚本"
            exit 1
        fi
    else
        log_error ".env.production.example 也不存在，请检查项目文件"
        exit 1
    fi
else
    log_success ".env 文件已存在"

    # 验证关键配置项
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
        log_warning "缺少关键配置项: ${missing_vars[*]}"
        log_info "请检查并完善 .env 文件"
        read -p "是否现在编辑 .env 文件？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano .env || vi .env
        fi
    else
        log_success "所有关键配置项已配置"
    fi
fi

# 询问部署模式
log_step "选择部署模式"
echo "请选择部署模式:"
echo "  1) 全新部署 (安装依赖 + 构建 + 数据库初始化 + 启动)"
echo "  2) 更新部署 (安装依赖 + 构建 + 重启服务)"
echo "  3) 快速重启 (只重启服务，不重新构建)"
read -p "请输入选项 (1/2/3): " -n 1 -r
echo
DEPLOY_MODE=$REPLY

# 停止现有服务
if pm2 list | grep -q "monitoring-"; then
    log_step "停止现有服务"
    pm2 stop monitoring-web monitoring-collector 2>/dev/null || true
    log_success "现有服务已停止"
fi

# 全新部署或更新部署
if [[ $DEPLOY_MODE =~ ^[12]$ ]]; then
    # 安装依赖
    log_step "安装项目依赖"

    log_info "清理 npm 缓存..."
    npm cache clean --force
    log_success "npm 缓存已清理"

    log_info "安装依赖（这可能需要几分钟）..."
    if npm ci 2>/dev/null || npm install; then
        log_success "依赖安装完成"
    else
        log_error "依赖安装失败"
        exit 1
    fi

    # 生成 Prisma Client
    log_step "生成 Prisma Client"
    if npm run db:generate; then
        log_success "Prisma Client 生成完成"
    else
        log_error "Prisma Client 生成失败"
        log_info "尝试手动安装 Prisma..."
        npm install @prisma/client prisma
        npm run db:generate
    fi

    # 数据库初始化（仅全新部署）
    if [[ $DEPLOY_MODE == "1" ]]; then
        log_step "数据库初始化"
        read -p "是否需要推送数据库 schema？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "推送数据库 schema..."
            if npm run db:push; then
                log_success "数据库 schema 推送完成"
            else
                log_error "数据库 schema 推送失败，请检查数据库连接"
                exit 1
            fi

            read -p "是否需要初始化种子数据？(y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_info "初始化种子数据..."
                npm run db:seed 2>/dev/null || log_warning "种子数据初始化失败（可能已存在）"
                log_success "数据库初始化完成"
            fi
        fi
    fi

    # 构建应用
    log_step "构建应用"
    log_info "构建 Next.js 应用（这可能需要几分钟）..."
    if npm run build; then
        log_success "应用构建完成"
    else
        log_error "应用构建失败"
        exit 1
    fi
fi

# 创建日志目录
log_step "准备运行环境"
mkdir -p logs
log_success "日志目录已准备"

# 启动应用
log_step "启动应用服务"

log_info "使用 PM2 启动服务..."

# 检查是否已有应用在 PM2 中
if pm2 list | grep -q "monitoring-"; then
    log_info "检测到服务已在 PM2 中，执行重新加载..."
    pm2 reload ecosystem.config.js --update-env
    log_success "服务已重新加载"
else
    log_info "首次启动服务..."
    pm2 start ecosystem.config.js
    log_success "服务已启动"
fi

# 显示状态
log_step "服务状态"
pm2 status

# 等待服务启动
log_info "等待服务启动（10秒）..."
sleep 10

# 健康检查
log_step "健康检查"
log_info "检查 Web 服务..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    log_success "Web 服务运行正常"
else
    log_warning "Web 服务健康检查失败，请查看日志: pm2 logs monitoring-web"
fi

log_info "检查采集服务..."
if pm2 list | grep "monitoring-collector" | grep -q "online"; then
    log_success "采集服务运行正常"
else
    log_warning "采集服务状态异常，请查看日志: pm2 logs monitoring-collector"
fi

# 配置开机自启（仅全新部署）
if [[ $DEPLOY_MODE == "1" ]]; then
    log_step "配置开机自启"
    read -p "是否配置 PM2 开机自启？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 save
        pm2 startup
        log_warning "请执行上面输出的 sudo 命令以完成开机自启配置"
    fi
fi

# 完成
echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "应用访问地址:"
echo "  - 监控大屏: http://$(hostname -I | awk '{print $1}'):3000"
echo "  - 本地访问: http://localhost:3000"
echo ""
echo "PM2 管理命令:"
echo "  - 查看状态: pm2 status"
echo "  - 查看日志: pm2 logs"
echo "  - 重启应用: pm2 restart all"
echo "  - 停止应用: pm2 stop all"
echo ""
echo "日志文件位置:"
echo "  - Web 服务: ./logs/pm2-web-*.log"
echo "  - 采集服务: ./logs/pm2-collector-*.log"
echo ""
echo "故障排查:"
echo "  - 查看实时日志: pm2 logs --lines 100"
echo "  - 查看服务详情: pm2 show monitoring-web"
echo "  - 重新加载环境: pm2 restart all --update-env"
echo ""
