# Ubuntu 环境迁移部署指南

## 📋 概述

本指南用于将监控大屏系统迁移到新的 Ubuntu 环境（已安装 Node.js、PM2、PostgreSQL、Redis）。

## ✅ 环境检查清单

目标 Ubuntu 服务器需要：

- [x] Node.js >= 18.0.0
- [x] npm >= 9.0.0
- [x] PostgreSQL >= 12
- [x] Redis >= 6
- [x] PM2（可选，部署脚本会自动安装）

## 🚀 快速部署（推荐）

### 方法 1: 使用打包脚本（跨环境迁移）

**在当前环境（Windows/其他）：**

```bash
# 1. 打包项目（会自动清理敏感信息）
bash package-for-ubuntu.sh

# 或指定输出文件名
bash package-for-ubuntu.sh monitoring-dashboard-v1.0.0.tar.gz

# 2. 传输到 Ubuntu 服务器
scp monitoring-dashboard-*.tar.gz user@server:/path/to/deploy/
```

**在 Ubuntu 服务器：**

```bash
# 1. 解压
tar -xzf monitoring-dashboard-*.tar.gz
cd monitoring-dashboard/

# 2. 配置环境变量
cp .env.example .env
nano .env  # 配置数据库、Redis、OpManager 连接

# 3. 运行部署脚本
chmod +x deploy-to-ubuntu.sh
./deploy-to-ubuntu.sh

# 选择部署模式:
#   1) 全新部署 - 首次安装
#   2) 更新部署 - 代码更新
#   3) 快速重启 - 只重启服务
```

### 方法 2: 直接在 Ubuntu 服务器部署（Git 仓库）

```bash
# 1. 克隆项目
git clone <repository-url>
cd monitoring-dashboard/

# 2. 配置环境变量
cp .env.production.example .env
nano .env  # 配置数据库、Redis、OpManager 连接

# 3. 运行部署脚本
chmod +x deploy-to-ubuntu.sh
./deploy-to-ubuntu.sh
```

## 🔧 环境变量配置

编辑 `.env` 文件，配置以下**必需项**：

```bash
# ==================== 数据库配置 ====================
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring-dashboard?schema=public"

# ==================== Redis 配置 ====================
REDIS_URL="redis://localhost:6379"

# ==================== OpManager 配置 ====================
OPMANAGER_BASE_URL="https://your-opmanager-host:8061"
OPMANAGER_API_KEY="your-api-key-here"
OPMANAGER_TIMEOUT=30000

# ==================== 应用配置 ====================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# ==================== 数据采集配置 ====================
COLLECT_METRICS_INTERVAL=60        # 指标采集间隔（秒）
COLLECT_ALARMS_INTERVAL=30         # 告警采集间隔（秒）
SYNC_TOPOLOGY_INTERVAL=300         # 拓扑同步间隔（秒）
```

**⚠️ 重要提示：**
- 将 `your-opmanager-host` 替换为实际的 OpManager 服务器地址
- 将 `your-api-key-here` 替换为实际的 API Key
- 确保数据库连接字符串正确
- 不要提交 `.env` 文件到版本控制

## 📦 PM2 服务配置

项目使用 PM2 管理两个服务：

### 1. monitoring-web（Web 应用）
- **命令**: `npm run start:server` (即 `next start`)
- **端口**: 3000（可通过 .env 配置）
- **作用**: 提供监控大屏 Web 界面

### 2. monitoring-collector（数据采集器）
- **命令**: `npm run collector`
- **作用**: 定时采集 OpManager 数据（设备、接口、指标、告警）

### PM2 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs                          # 所有服务
pm2 logs monitoring-web           # Web 服务
pm2 logs monitoring-collector     # 采集服务

# 重启服务
pm2 restart all                   # 重启所有
pm2 restart monitoring-web        # 重启 Web 服务
pm2 restart all --update-env      # 重启并更新环境变量

# 停止服务
pm2 stop all

# 删除服务
pm2 delete all

# 保存配置（开机自启）
pm2 save
pm2 startup  # 生成开机自启命令，需执行输出的 sudo 命令
```

## 🔍 验证部署

```bash
# 1. 检查 PM2 状态
pm2 status

# 2. 检查服务健康
curl http://localhost:3000/api/health

# 3. 查看日志
pm2 logs --lines 50

# 4. 浏览器访问
# http://server-ip:3000
```

## 🛠 手动部署步骤（高级）

如果不使用自动部署脚本：

```bash
# 1. 安装依赖
npm ci

# 2. 生成 Prisma Client
npm run db:generate

# 3. 数据库初始化（仅首次）
npm run db:push
npm run db:seed  # 可选

# 4. 构建应用
npm run build

# 5. 创建日志目录
mkdir -p logs

# 6. 启动服务
pm2 start ecosystem.config.js
pm2 save
```

## 🔄 更新部署

当有代码更新时：

```bash
# 方法 1: 使用部署脚本
./deploy-to-ubuntu.sh
# 选择 "2) 更新部署"

# 方法 2: 手动更新
git pull                          # 如果使用 Git
npm ci                            # 安装依赖
npm run db:generate               # 生成 Prisma Client
npm run build                     # 构建应用
pm2 restart all --update-env      # 重启服务
```

## 🐛 故障排查

### 服务无法启动

```bash
# 查看详细日志
pm2 logs --lines 100

# 查看错误日志文件
cat logs/pm2-web-error.log
cat logs/pm2-collector-error.log

# 检查进程状态
pm2 show monitoring-web
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U your_user -d monitoring_dashboard -c "SELECT 1;"

# 检查防火墙
sudo ufw status
```

### Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping
```

### OpManager API 连接失败

```bash
# 测试 API 连接
curl -k "$OPMANAGER_BASE_URL/api/json/v2/info" \
  -H "authToken: $OPMANAGER_API_KEY"

# 运行诊断脚本
npm run diagnose:production
npm run verify:opmanager-apis
```

### 环境变量未生效

```bash
# 重启服务并更新环境变量
pm2 restart all --update-env

# 或者删除并重新启动
pm2 delete all
pm2 start ecosystem.config.js
```

## 📊 数据库迁移（可选）

如果需要从旧环境迁移数据：

**在旧环境：**

```bash
# 导出数据库
pg_dump -U postgres -d monitoring_dashboard > backup.sql
```

**在新环境：**

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE monitoring_dashboard;"

# 导入数据
psql -U postgres -d monitoring_dashboard < backup.sql

# 验证
npm run db:studio
```

## 🔐 安全建议

1. **修改默认端口**: 编辑 `.env` 中的 `PORT`
2. **配置防火墙**:
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```
3. **使用反向代理**: 建议使用 Nginx + SSL
4. **定期备份数据库**:
   ```bash
   pg_dump -U postgres -d monitoring_dashboard > backup_$(date +%Y%m%d).sql
   ```
5. **保护 .env 文件**:
   ```bash
   chmod 600 .env
   ```

## 📚 相关文档

- [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) - 完整配置指南
- [QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md) - 快速启动清单
- [CLAUDE.md](./CLAUDE.md) - 项目开发指南
- [README.md](./README.md) - 项目说明

## 🎯 快速命令参考

```bash
# 部署相关
./deploy-to-ubuntu.sh                     # 运行部署脚本
bash package-for-ubuntu.sh                # 打包项目

# PM2 管理
pm2 status                                # 查看状态
pm2 logs                                  # 查看日志
pm2 restart all --update-env              # 重启并更新环境

# 诊断工具
npm run diagnose:production               # 完整诊断
npm run verify:data-flow                  # 验证数据流
npm run check:all                         # 检查所有数据

# 数据库
npm run db:studio                         # 打开数据库 GUI
npm run db:push                           # 推送 schema
```

---

**版本**: 1.0.0
**更新时间**: 2026-02-05
**适用环境**: Ubuntu 18.04+, Node.js 18+
