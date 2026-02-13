#!/usr/bin/env node
/**
 * 一键生成 Ubuntu 迁移脚本
 * 用法: node scripts/generate-ubuntu-migration.js [输出路径]
 * 默认输出: scripts/migrate-to-ubuntu.sh
 *
 * 生成的脚本在 Ubuntu 上执行，完成：
 * - 安装 Node.js、PostgreSQL、Redis
 * - 创建数据库（可选）
 * - 安装依赖、Prisma、构建、PM2 启动
 */

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.resolve(
  process.cwd(),
  process.argv[2] || 'scripts/migrate-to-ubuntu.sh'
);

// 使用数组拼接避免模板字面量中 ${} 被解析
const lines = [
  '#!/bin/bash',
  '# =============================================================================',
  '# 监控大屏项目 - Ubuntu 一键迁移脚本（自动生成，请勿直接编辑）',
  '# 生成后用法: chmod +x migrate-to-ubuntu.sh && ./migrate-to-ubuntu.sh',
  '# =============================================================================',
  'set -e',
  '',
  "RED='\\033[0;31m'",
  "GREEN='\\033[0;32m'",
  "YELLOW='\\033[1;33m'",
  "CYAN='\\033[0;36m'",
  "NC='\\033[0m'",
  '',
  'APP_DIR="${1:-$(pwd)}"',
  'echo -e "${CYAN}📦 项目目录: $APP_DIR${NC}"',
  '',
  '# -----------------------------------------------------------------------------',
  '# 1. 系统检测（Ubuntu/Debian）',
  '# -----------------------------------------------------------------------------',
  'if [ ! -f /etc/os-release ]; then',
  '  echo -e "${RED}❌ 无法检测系统类型，请确保在 Ubuntu/Debian 上运行${NC}"',
  '  exit 1',
  'fi',
  '. /etc/os-release',
  'if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then',
  '  echo -e "${YELLOW}⚠️  当前系统: $ID，本脚本针对 Ubuntu/Debian 编写，是否继续? (y/N)${NC}"',
  '  read -r confirm',
  "  [[ \"$confirm\" != \"y\" && \"$confirm\" != \"Y\" ]] && exit 0",
  'fi',
  '',
  '# -----------------------------------------------------------------------------',
  '# 2. 安装系统依赖与 Node.js',
  '# -----------------------------------------------------------------------------',
  'echo -e "${CYAN}📌 步骤 1/7: 安装系统依赖...${NC}"',
  'export DEBIAN_FRONTEND=noninteractive',
  'sudo apt-get update -qq',
  'sudo apt-get install -y -qq curl ca-certificates gnupg build-essential',
  '',
  'echo -e "${CYAN}📌 步骤 2/7: 安装 Node.js 20 LTS...${NC}"',
  'if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d \'v\') -lt 18 ]]; then',
  '  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
  '  sudo apt-get install -y -qq nodejs',
  'fi',
  'echo "   Node: $(node -v)  npm: $(npm -v)"',
  '',
  '# -----------------------------------------------------------------------------',
  '# 3. 安装 PostgreSQL',
  '# -----------------------------------------------------------------------------',
  'echo -e "${CYAN}📌 步骤 3/7: 安装 PostgreSQL...${NC}"',
  'if ! command -v psql &>/dev/null; then',
  '  sudo apt-get install -y -qq postgresql postgresql-contrib',
  '  sudo systemctl start postgresql || true',
  '  sudo systemctl enable postgresql || true',
  'fi',
  'echo "   PostgreSQL: $(psql --version 2>/dev/null || echo \'已安装\')"',
  '',
  '# -----------------------------------------------------------------------------',
  '# 4. 安装 Redis',
  '# -----------------------------------------------------------------------------',
  'echo -e "${CYAN}📌 步骤 4/7: 安装 Redis...${NC}"',
  'if ! command -v redis-server &>/dev/null; then',
  '  sudo apt-get install -y -qq redis-server',
  '  sudo systemctl start redis-server || true',
  '  sudo systemctl enable redis-server || true',
  'fi',
  'echo "   Redis: $(redis-cli --version 2>/dev/null || echo \'已安装\')"',
  '',
  '# -----------------------------------------------------------------------------',
  '# 5. 创建数据库（可选）',
  '# -----------------------------------------------------------------------------',
  'echo -e "${CYAN}📌 步骤 5/7: 数据库配置${NC}"',
  'DB_NAME="${DB_NAME:-monitoring_dashboard}"',
  'DB_USER="${DB_USER:-monitoring}"',
  'DB_PASS="${DB_PASS:-}"',
  '',
  'if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname=\'$DB_NAME\'" | grep -q 1; then',
  '  echo "   数据库 $DB_NAME 已存在，跳过创建"',
  'else',
  '  echo "   创建数据库与用户: $DB_NAME / $DB_USER"',
  '  if [ -z "$DB_PASS" ]; then',
  '    echo -e "${YELLOW}   未设置 DB_PASS，使用默认密码 \'monitoring\'（生产请导出 DB_PASS 再运行）${NC}"',
  '    DB_PASS="monitoring"',
  '  fi',
  '  sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOSQL',
  'CREATE USER $DB_USER WITH PASSWORD \'"\'"$DB_PASS"\'"\';',
  'CREATE DATABASE $DB_NAME OWNER $DB_USER;',
  'GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;',
  'EOSQL',
  '  echo "   DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"',
  'fi',
  '',
  '# -----------------------------------------------------------------------------',
  '# 6. 项目依赖与构建',
  '# -----------------------------------------------------------------------------',
  'cd "$APP_DIR"',
  'if [ ! -f package.json ]; then',
  '  echo -e "${RED}❌ 未在 $APP_DIR 找到 package.json${NC}"',
  '  exit 1',
  'fi',
  '',
  'echo -e "${CYAN}📌 步骤 6/7: 安装依赖并构建...${NC}"',
  'if [ ! -f .env ]; then',
  '  if [ -f env.example.txt ]; then',
  '    cp env.example.txt .env',
  '    echo -e "${YELLOW}   已从 env.example.txt 复制生成 .env，请编辑 .env 填写 DATABASE_URL 和 OPMANAGER_*${NC}"',
  '  elif [ -f .env.example ]; then',
  '    cp .env.example .env',
  '    echo -e "${YELLOW}   已从 .env.example 复制生成 .env，请编辑 .env 填写配置${NC}"',
  '  else',
  '    echo -e "${RED}❌ 未找到 env.example.txt 或 .env.example${NC}"',
  '    exit 1',
  '  fi',
  'fi',
  '',
  '# 若未配置 DATABASE_URL，写入默认（与上面创建的 DB 一致）',
  'if ! grep -q \'^DATABASE_URL=.*postgresql\' .env 2>/dev/null; then',
  '  echo "DATABASE_URL=\\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\\"" >> .env',
  'fi',
  '',
  'npm install --no-audit --no-fund',
  'npx prisma generate',
  'npx prisma migrate deploy',
  'npm run build',
  '',
  '# -----------------------------------------------------------------------------',
  '# 7. PM2 启动',
  '# -----------------------------------------------------------------------------',
  'echo -e "${CYAN}📌 步骤 7/7: 使用 PM2 启动服务...${NC}"',
  'npm install -g pm2',
  'mkdir -p logs',
  '',
  'if [ -f ecosystem.config.js ]; then',
  "  sed -i.bak \"s|cwd: '[^']*'|cwd: '$APP_DIR'|g\" ecosystem.config.js",
  '  pm2 start ecosystem.config.js',
  'else',
  '  pm2 start npm --name "monitoring-web" -- start',
  '  pm2 start npm --name "monitoring-collector" -- run collector',
  'fi',
  'pm2 save',
  '',
  'echo -e "${GREEN}✅ 迁移完成！${NC}"',
  'echo -e "${CYAN}   访问: http://$(hostname -I | awk \'{print $1}\'):3000${NC}"',
  'echo -e "${CYAN}   命令: pm2 list | pm2 logs | pm2 restart all${NC}"',
  'echo -e "${YELLOW}   建议: 运行 pm2 startup 并执行其输出命令以设置开机自启${NC}"',
];

const SCRIPT = lines.join('\n');

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, SCRIPT, 'utf8');
try {
  fs.chmodSync(OUT_PATH, 0o755);
} catch (_) {
  // Windows may not support chmod
}

console.log('Generated:', OUT_PATH);
console.log('');
console.log('Usage on Ubuntu:');
console.log('  1. Copy this project to Ubuntu (e.g. /opt/monitoring-dashboard)');
console.log('  2. chmod +x scripts/migrate-to-ubuntu.sh');
console.log('  3. ./scripts/migrate-to-ubuntu.sh   # or: ./scripts/migrate-to-ubuntu.sh /opt/monitoring-dashboard');
console.log('');
console.log('Optional env (before running script):');
console.log('  DB_NAME=monitoring_dashboard  DB_USER=monitoring  DB_PASS=yourpassword');
