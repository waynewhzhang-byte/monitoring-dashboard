#!/bin/bash
# ============================================
# 监控大屏项目一键部署脚本（目标环境: Ubuntu）
# ============================================
# 用途: 在 Ubuntu 上安装依赖、构建、并启动 Web + Collector
# 用法: chmod +x scripts/deploy-monitoring-dashboard.sh && ./scripts/deploy-monitoring-dashboard.sh
#       （或在解压后的项目根目录: chmod +x deploy-monitoring-dashboard.sh && ./deploy-monitoring-dashboard.sh）
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_step() { echo -e "\n${CYAN}[步骤] $1${NC}"; }
log_ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
log_err() { echo -e "  ${RED}✗ $1${NC}"; }
log_warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }
log_info() { echo -e "  $1"; }

echo ""
echo "========================================"
echo "  监控大屏项目一键部署 (Ubuntu)"
echo "========================================"
echo ""

if [ ! -f "package.json" ]; then
  log_err "请在项目根目录执行此脚本"
  exit 1
fi
log_ok "项目根目录验证通过"

DEPLOY_DIR="$(pwd)"
log_step "部署目录: $DEPLOY_DIR"

# 检查 Node.js / npm（Ubuntu 上需先安装 Node 18+）
log_step "检查环境"
if ! command -v node &>/dev/null; then
  log_err "未安装 Node.js。Ubuntu 安装示例:"
  log_info "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  log_info "  或: sudo apt install -y nodejs npm  # 若版本不足 18 请用 NodeSource"
  exit 1
fi
NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  log_err "需要 Node.js 18+，当前: $(node -v)"
  log_info "Ubuntu 升级: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exit 1
fi
log_ok "Node.js: $(node -v)"
if ! command -v npm &>/dev/null; then
  log_err "未安装 npm，请先安装 Node.js（通常与 node 一起安装）"
  exit 1
fi
log_ok "npm: $(npm -v)"

# 可选：中国区域 npm 镜像
read -p "是否使用国内 npm 镜像？(y/n，默认 n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm config set registry https://registry.npmmirror.com
  npm config set audit false
  npm config set fund false
  export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
  log_ok "已配置国内镜像"
fi

# 修正 ecosystem.config.js 中的 cwd（Ubuntu 上 GNU sed -i 需备份后缀）
log_step "修正 PM2 配置中的部署路径"
if [ -f "ecosystem.config.js" ]; then
  if command -v sed &>/dev/null; then
    sed -i.bak "s|/opt/monitoring-app|$DEPLOY_DIR|g" ecosystem.config.js
    log_ok "ecosystem.config.js cwd 已设为 $DEPLOY_DIR"
  else
    log_warn "未找到 sed，请手动将 ecosystem.config.js 中 cwd 改为: $DEPLOY_DIR"
  fi
fi

# .env
log_step "检查环境变量"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    log_warn "已从 .env.example 复制生成 .env，请按需修改: nano .env"
    read -p "是否现在编辑 .env？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      ${EDITOR:-nano} .env
    fi
  else
    log_err "缺少 .env 或 .env.example"
    exit 1
  fi
else
  log_ok ".env 已存在"
fi

# 依赖
log_step "安装依赖"
npm cache clean --force 2>/dev/null || true
if npm ci 2>/dev/null; then
  log_ok "依赖安装完成 (npm ci)"
else
  log_warn "npm ci 失败，尝试 npm install"
  rm -f package-lock.json
  npm install --legacy-peer-deps
  log_ok "依赖安装完成 (npm install)"
fi

# Prisma
log_step "Prisma 生成"
if ! npm run db:generate; then
  log_err "Prisma 生成失败"
  exit 1
fi
log_ok "Prisma Client 已生成"

read -p "是否推送数据库 schema？(y/n，默认 n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm run db:push
  log_ok "数据库 schema 已推送"
  read -p "是否执行种子数据？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:seed
    log_ok "种子数据已执行"
  fi
fi

# 构建
log_step "构建 Next.js 大屏"
if ! npm run build; then
  log_err "构建失败"
  exit 1
fi
log_ok "构建完成"

# 日志目录
mkdir -p logs
log_ok "日志目录 logs 已创建"

# PM2（Ubuntu 上 system/node 安装的 npm 全局包通常需 sudo）
log_step "启动服务 (PM2)"
if ! command -v pm2 &>/dev/null; then
  log_warn "PM2 未安装，正在全局安装..."
  if ! npm install -g pm2 2>/dev/null; then
    log_info "无权限写入全局目录，尝试: sudo npm install -g pm2"
    sudo npm install -g pm2
  fi
  log_ok "PM2 已安装"
fi
# 先删除可能存在的旧进程（避免残留进程 ID 导致 restart 报错）
pm2 delete monitoring-web monitoring-collector 2>/dev/null || true
# 再启动（始终用 start，避免 restart 对已失效进程报错）
pm2 start ecosystem.config.js
log_ok "已启动 monitoring-web + monitoring-collector"
pm2 status

read -p "是否配置 PM2 开机自启？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pm2 save
  pm2 startup
  log_warn "请执行上面输出的 sudo 命令以完成开机自启"
fi

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
echo ""
echo "访问: http://<服务器IP>:3000"
echo "PM2: pm2 status | pm2 logs | pm2 restart all"
echo "详见: DEPLOY.md"
echo ""
