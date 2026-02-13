# 生产环境启动指南 - 银河麒麟 Linux

本指南说明如何在银河麒麟 Linux 生产环境启动监控系统服务。

---

## 📋 前置要求

1. ✅ 项目已解压到 `/opt/monitoring-app`（或您的部署路径）
2. ✅ 已配置 `.env` 文件（包含生产环境的数据库和 OpManager API 配置）
3. ✅ 已安装 Node.js 和 npm
4. ✅ 已安装 PM2：`npm install -g pm2`
5. ✅ 已安装 PostgreSQL 客户端工具
6. ✅ 数据库已导入并完成 Prisma 迁移

---

## 🚀 启动方式

### 方式 1：使用启动脚本（推荐）

```bash
# 1. 进入项目根目录
cd /opt/monitoring-app

# 2. 给脚本添加执行权限
chmod +x scripts/start-production.sh

# 3. 运行启动脚本
./scripts/start-production.sh
```

脚本会自动：

- 检查环境配置
- 创建日志目录
- 启动所有服务
- 设置 PM2 开机自启（可选）

---

### 方式 2：使用 PM2 配置文件

```bash
# 1. 进入项目根目录（重要！）
cd /opt/monitoring-app

# 2. 修改 ecosystem.config.js 中的 cwd 路径（如果部署路径不是 /opt/monitoring-app）
# 编辑 ecosystem.config.js，将 cwd 改为实际路径

# 3. 启动所有服务
pm2 start ecosystem.config.js

# 4. 保存配置（确保重启后自动启动）
pm2 save
```

---

### 方式 3：手动启动（不推荐，但更灵活）

```bash
# 1. 进入项目根目录（重要！）
cd /opt/monitoring-app

# 2. 启动 Web 服务
pm2 start npm --name "monitoring-web" -- start

# 3. 启动数据采集服务
pm2 start npm --name "monitoring-collector" -- run collector

# 4. 保存配置
pm2 save
```

**⚠️ 重要提示：**

- **必须在项目根目录执行**，因为：
  - `npm start` 需要找到 `package.json`
  - `npm run collector` 需要找到 `package.json` 中的脚本定义
  - 相对路径（如 `src/services/collector/start.ts`）需要从项目根目录解析
  - `.env` 文件通常从项目根目录读取

---

## 📊 服务管理

### 查看服务状态

```bash
pm2 list                    # 查看所有服务状态
pm2 status                 # 查看服务状态（详细）
pm2 monit                  # 打开监控面板（实时监控）
```

### 查看日志

```bash
pm2 logs                           # 查看所有服务日志（实时）
pm2 logs monitoring-web            # 查看 Web 服务日志
pm2 logs monitoring-collector      # 查看采集服务日志
pm2 logs --lines 100               # 查看最近 100 行日志
```

日志文件位置：

- Web 服务：`./logs/pm2-web-out.log` 和 `./logs/pm2-web-error.log`
- 采集服务：`./logs/pm2-collector-out.log` 和 `./logs/pm2-collector-error.log`

### 重启服务

```bash
pm2 restart all                    # 重启所有服务
pm2 restart monitoring-web        # 重启 Web 服务
pm2 restart monitoring-collector   # 重启采集服务
```

### 停止服务

```bash
pm2 stop all                       # 停止所有服务（不删除）
pm2 stop monitoring-web           # 停止 Web 服务
```

### 删除服务

```bash
pm2 delete all                     # 删除所有服务
pm2 delete monitoring-web        # 删除 Web 服务
```

---

## 🔄 开机自启

### 设置开机自启

```bash
# 1. 生成启动脚本
pm2 startup

# 2. 复制输出的命令并执行（通常是 sudo 命令）

# 3. 保存当前 PM2 进程列表
pm2 save
```

### 取消开机自启

```bash
pm2 unstartup
```

---

## 🔍 故障排查

### 问题 1：服务启动失败

**检查步骤：**

```bash
# 1. 查看错误日志
pm2 logs monitoring-web --err
pm2 logs monitoring-collector --err

# 2. 检查环境变量
cat .env | grep DATABASE_URL
cat .env | grep OPMANAGER

# 3. 检查端口占用
netstat -tulpn | grep 3000

# 4. 检查数据库连接
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

### 问题 2：采集服务无法连接 OpManager

**检查步骤：**

```bash
# 1. 检查 OpManager API 配置
cat .env | grep OPMANAGER

# 2. 测试 API 连接
curl -k -H "Authorization: Bearer $OPMANAGER_API_KEY" \
     "$OPMANAGER_BASE_URL/api/json/device/listDevices?start=0&size=1"

# 3. 查看采集服务日志
pm2 logs monitoring-collector --lines 50
```

### 问题 3：服务频繁重启

**检查步骤：**

```bash
# 1. 查看重启历史
pm2 logs --lines 200 | grep "restarting"

# 2. 检查内存使用
pm2 monit

# 3. 检查系统资源
free -h
df -h
```

### 问题 4：PM2 命令找不到

**解决方案：**

```bash
# 全局安装 PM2
npm install -g pm2

# 或使用 npx
npx pm2 list
```

---

## 📝 完整启动流程示例

```bash
# ===== 1. 进入项目目录 =====
cd /opt/monitoring-app

# ===== 2. 检查环境 =====
# 确认 .env 文件存在并配置正确
cat .env

# ===== 3. 安装依赖（如果还没安装） =====
npm install

# ===== 4. 生成 Prisma Client =====
npx prisma generate

# ===== 5. 构建项目 =====
npm run build

# ===== 6. 启动服务 =====
# 方式 A：使用启动脚本
./scripts/start-production.sh

# 方式 B：使用 PM2 配置
pm2 start ecosystem.config.js
pm2 save

# ===== 7. 验证服务 =====
pm2 list
pm2 logs

# ===== 8. 设置开机自启（可选） =====
pm2 startup
# 执行输出的 sudo 命令
pm2 save
```

---

## 🔗 相关文档

- 数据库迁移指南：`DATABASE-MIGRATION-GUIDE.md`
- PM2 官方文档：https://pm2.keymetrics.io/docs/usage/quick-start/

---

## ⚠️ 注意事项

1. **工作目录**：所有 PM2 命令必须在项目根目录执行
2. **环境变量**：确保 `.env` 文件包含所有必要的生产环境配置
3. **端口占用**：确保端口 3000 未被其他服务占用
4. **日志管理**：定期清理日志文件，避免磁盘空间不足
5. **监控**：建议使用 `pm2 monit` 定期检查服务状态

---

## 📞 需要帮助？

如果遇到问题，请：

1. 查看 PM2 日志：`pm2 logs`
2. 检查系统资源：`free -h`、`df -h`
3. 验证网络连接和 API 配置
4. 查看本文档的故障排查部分
