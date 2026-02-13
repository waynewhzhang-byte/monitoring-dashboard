# 监控大屏增强版部署指南 v2.0

## 🎯 快速开始

### Windows 端（打包）

```powershell
# 1. 执行增强版打包脚本
.\package-monitoring-dashboard-v2.ps1

# 2. 脚本会自动生成类似文件名：
# monitoring-dashboard-deploy-20260205-120000.zip
```

### Ubuntu 端（部署）

```bash
# 1. 上传部署包
scp monitoring-dashboard-deploy-*.zip user@server:/opt/

# 2. 解压
cd /opt
unzip monitoring-dashboard-deploy-*.zip -d monitoring-dashboard
cd monitoring-dashboard

# 3. 运行增强版部署脚本（一键部署）
chmod +x deploy-ubuntu-enhanced.sh
./deploy-ubuntu-enhanced.sh

# 按提示选择镜像源（推荐国内选淘宝源）
# 按提示配置环境变量
# 等待自动完成部署
```

## 🆚 v2.0 改进对比

### 旧版问题
- ❌ 缺少重要配置文件（文档、TypeScript 配置等）
- ❌ 部署脚本无镜像源选择
- ❌ 没有网络重试机制
- ❌ 错误处理不完善
- ❌ 缺少 TSX/TS-Node 验证

### v2.0 改进
- ✅ **完整的文件清单**：包含所有必要配置和文档
- ✅ **镜像源选择**：支持官方源/淘宝源切换
- ✅ **网络重试**：npm 安装失败自动重试 3 次
- ✅ **完整错误处理**：详细的错误诊断和建议
- ✅ **TSX 支持**：确保 tsx 和 ts-node 正确安装
- ✅ **Prisma 验证**：检查版本一致性
- ✅ **健康检查**：部署后自动验证服务状态
- ✅ **详细日志**：生成部署日志文件

## 📦 包含的文件

### 核心目录
- `app/`, `src/`, `public/` - Next.js 应用代码
- `prisma/` - 数据库 schema 和迁移
- `scripts/` - 诊断和工具脚本

### 配置文件
- `package.json`, `package-lock.json`
- `tsconfig.json`, `tsconfig.node.json` ⭐ TypeScript 配置
- `ecosystem.config.js` - PM2 配置
- `next.config.mjs` - Next.js 配置
- `instrumentation.ts`, `middleware.ts` ⭐ Next.js 高级配置

### 环境变量（已脱敏）
- `.env.example`, `.env.production.example`
- `.env`, `.env.local` (如果存在)

### 文档
- `README.md` - 项目说明
- `CLAUDE.md` - 开发指南
- `COMPLETE-SETUP-GUIDE.md` - 完整配置指南
- `QUICK-START-CHECKLIST.md` - 快速启动清单
- `UBUNTU-MIGRATION-GUIDE.md` - Ubuntu 迁移指南
- `DEPLOYMENT-README.md` ⭐ 部署说明（自动生成）

### 部署脚本
- `deploy-ubuntu-enhanced.sh` ⭐ 增强版部署脚本

## 🔧 部署脚本特性详解

### 1. 环境检查
```bash
✓ Node.js >= 18.0.0
✓ npm >= 9.0.0
✓ PM2 (自动安装如果缺失)
✓ PostgreSQL (可选，远程数据库可跳过)
✓ Redis (可选)
```

### 2. 镜像源选择
```bash
请选择 npm 镜像源:
  1) 官方源 (registry.npmjs.org) - 国外网络
  2) 淘宝源 (registry.npmmirror.com) - 国内网络（推荐）
  3) 跳过，使用当前配置

# 自动配置：
- npm registry
- Prisma engines mirror
- npm audit/fund 禁用（淘宝源）
```

### 3. 网络重试机制
```bash
尝试安装依赖 (第 1/3 次)...
  → npm ci (首选)
  → npm install (备选)
  → 失败后等待 30 秒重试
  → 最多重试 3 次
```

### 4. 依赖验证
```bash
✓ Prisma Client 版本检查
✓ Prisma CLI 版本检查
✓ 版本一致性验证
✓ tsx 安装检查
✓ ts-node 安装检查
```

### 5. 环境变量交互
```bash
# 自动检测 .env
# 验证必需配置项：
  - DATABASE_URL
  - OPMANAGER_BASE_URL
  - OPMANAGER_API_KEY

# 缺失时提示编辑
```

### 6. 数据库初始化
```bash
✓ 生成 Prisma Client
✓ 询问是否推送 schema
✓ 询问是否初始化种子数据
✓ 错误诊断和建议
```

### 7. PM2 服务管理
```bash
# 智能检测：
  - 服务已存在 → reload（零停机）
  - 首次部署 → start（新启动）

# 自动更新 ecosystem.config.js 路径
```

### 8. 健康检查
```bash
✓ PM2 状态检查
✓ Web 服务 HTTP 健康检查
✓ 采集服务进程检查
✓ 详细日志位置提示
```

### 9. 开机自启
```bash
# 询问是否配置
pm2 save
pm2 startup systemd
```

## 🚨 常见问题解决

### 问题 1: npm 超时 (ETIMEDOUT)

**v2.0 解决方案**：
```bash
# 方案 A: 部署时选择淘宝源（推荐国内）
选择选项 2) 淘宝源

# 方案 B: 手动切换后重新部署
npm config set registry https://registry.npmmirror.com/
./deploy-ubuntu-enhanced.sh
```

**自动重试**：脚本会自动重试 3 次，每次间隔 30 秒

### 问题 2: Prisma 未找到

**v2.0 解决方案**：
```bash
# 脚本自动诊断：
✓ 检查 schema.prisma 文件
✓ 检查 node_modules/@prisma/client
✓ 检查 node_modules/prisma
✓ 显示版本信息
✓ 版本不一致时警告

# 手动修复（如果脚本失败）：
npm install @prisma/client prisma
npx prisma generate
```

### 问题 3: TSX 脚本无法运行

**v2.0 解决方案**：
```bash
# 脚本自动检查：
✓ node_modules/.bin/tsx
✓ node_modules/.bin/ts-node

# 手动安装（如果缺失）：
npm install tsx ts-node --save-dev
```

### 问题 4: 权限问题

```bash
# 确保部署目录权限正确
sudo chown -R $USER:$USER /opt/monitoring-dashboard

# 确保脚本可执行
chmod +x deploy-ubuntu-enhanced.sh
```

## 📊 部署日志分析

部署脚本会生成详细日志：`deploy-YYYYMMDD-HHMMSS.log`

**日志结构**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[步骤] 检查系统环境
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Node.js: v20.10.0
  ✓ npm: 10.2.3
  ✓ PM2: 5.3.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[步骤] 配置 npm 镜像源
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ℹ 配置淘宝源...
  ✓ 已设置淘宝源
  ...
```

**查看日志**：
```bash
# 查看完整日志
cat deploy-YYYYMMDD-HHMMSS.log

# 查看错误（如果有）
grep "✗" deploy-YYYYMMDD-HHMMSS.log

# 查看警告
grep "⚠" deploy-YYYYMMDD-HHMMSS.log
```

## 🎯 验证部署成功

### 1. 检查 PM2 状态
```bash
pm2 status

# 期望输出：
# ┌─────┬───────────────────────┬─────────┬─────────┐
# │ id  │ name                  │ status  │ restart │
# ├─────┼───────────────────────┼─────────┼─────────┤
# │ 0   │ monitoring-web        │ online  │ 0       │
# │ 1   │ monitoring-collector  │ online  │ 0       │
# └─────┴───────────────────────┴─────────┴─────────┘
```

### 2. 健康检查
```bash
# Web 服务
curl http://localhost:3000/api/health
# 期望：{"status":"ok"}

# 或浏览器访问
curl -I http://localhost:3000
# 期望：HTTP/1.1 200 OK
```

### 3. 查看日志
```bash
# 实时日志
pm2 logs --lines 50

# 无错误日志
pm2 logs --err
```

### 4. 运行诊断
```bash
# 完整诊断
npm run diagnose:production

# 数据流验证
npm run verify:data-flow

# 检查同步状态
npm run check:sync
```

### 5. 浏览器访问
```
http://server-ip:3000
```

## 🔄 更新部署流程

### Windows 端
```powershell
# 1. 拉取最新代码
git pull

# 2. 重新打包
.\package-monitoring-dashboard-v2.ps1

# 3. 上传新包到服务器
scp monitoring-dashboard-deploy-*.zip user@server:/opt/
```

### Ubuntu 端
```bash
# 1. 停止服务
pm2 stop all

# 2. 备份当前版本（可选）
cp -r /opt/monitoring-dashboard /opt/monitoring-dashboard.backup

# 3. 解压新包（覆盖）
cd /opt/monitoring-dashboard
unzip -o ~/monitoring-dashboard-deploy-*.zip

# 4. 重新部署
./deploy-ubuntu-enhanced.sh

# 或快速更新（不重新安装依赖）
npm ci
npm run build
pm2 restart all --update-env
```

## 📚 相关文档

- **DEPLOYMENT-README.md** - 打包后自动生成的详细部署说明
- **CLAUDE.md** - 项目开发指南（包含所有 npm 命令）
- **COMPLETE-SETUP-GUIDE.md** - 从 OpManager 到大屏的完整流程
- **QUICK-START-CHECKLIST.md** - 15分钟快速上线清单
- **UBUNTU-MIGRATION-GUIDE.md** - Ubuntu 环境迁移详细指南

## 🎉 成功标志

当你看到以下输出时，部署成功：

```
==========================================
  🎉 部署完成！
==========================================

应用访问地址:
  - 监控大屏: http://192.168.1.100:3000
  - 本地访问: http://localhost:3000

PM2 管理命令:
  - 查看状态: pm2 status
  - 查看日志: pm2 logs
  ...

下一步:
  1. 访问 http://localhost:3000 验证大屏
  2. 检查设备数据同步: npm run check:sync
  3. 查看实时日志: pm2 logs --lines 50
```

## 💡 专业提示

1. **首次部署**：选择"淘宝源"，可大幅减少网络超时
2. **生产环境**：配置 PM2 开机自启，确保服务器重启后自动恢复
3. **定期备份**：使用 `pg_dump` 定期备份数据库
4. **监控日志**：使用 `pm2 logs --lines 100` 观察应用运行状况
5. **性能优化**：部署后运行 `npm run check:sync` 确保数据采集正常

---

**版本**: v2.0
**更新时间**: 2026-02-05
**兼容性**: Ubuntu 18.04+, Node.js 18+
**维护者**: Monitoring Dashboard Team
