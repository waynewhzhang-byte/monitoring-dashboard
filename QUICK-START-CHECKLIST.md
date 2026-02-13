# ⚡ 快速启动检查清单

> 从零到大屏展示的最快路径（约 15-30 分钟）

---

## 📋 第一次部署快速清单

### 阶段 1: 基础环境（5 分钟）

```bash
# ✅ 步骤 1: 克隆项目并安装依赖
git clone <repository-url>
cd monitoring-dashboard
npm install

# ✅ 步骤 2: 配置环境变量
cp .env.production.example .env
# 编辑 .env，填入 OpManager 信息：
# - OPMANAGER_BASE_URL
# - OPMANAGER_API_KEY
# - DATABASE_URL
# - REDIS_URL

# ✅ 步骤 3: 初始化数据库
npm run db:push

# ✅ 步骤 4: 验证 OpManager 连接
npm run verify:opmanager-apis
```

**期望结果**：所有 API 测试通过 ✅

---

### 阶段 2: 配置 Business View（5-10 分钟）⭐

```bash
# ✅ 步骤 5: 启动应用
npm run start &
# 等待 5 秒让服务启动
sleep 5

# ✅ 步骤 6: 查看 OpManager 中的 Business Views
npm run diagnose:opmanager
# 记录输出的 Business View 名称，例如：
# - 出口业务
# - 核心网络
```

**接下来在浏览器操作**：

1. 访问 Admin 面板：`http://localhost:3000/admin`
2. 点击 "业务视图配置"
3. 添加每个 Business View：
   - **OpManager View Name**: `出口业务`（必须与 OpManager 完全一致）
   - **Display Name**: `出口业务拓扑`（可选，用户友好名称）
   - 点击 "Add View"
4. 确保添加的 Business View 是**激活状态** ✅

**⚠️ 关键**：Business View 名称必须精确匹配 OpManager，包括空格和大小写！

---

### 阶段 3: 数据同步（5-10 分钟）

```bash
# ✅ 步骤 7: 手动同步设备
# 方式 1: 浏览器
# 访问 http://localhost:3000/admin/devices
# 点击 "Sync Devices from OpManager" 按钮
# 等待同步完成（约 30-60 秒）

# 方式 2: API
curl -X POST http://localhost:3000/api/devices/sync

# ✅ 步骤 8: 启动采集器
npm run collector &
# 或使用 PM2
pm2 start ecosystem.config.js

# ✅ 步骤 9: 等待首次采集完成
# 等待约 2 分钟，让采集器运行一轮
sleep 120

# ✅ 步骤 10: 验证数据流
npm run verify:data-flow
```

**期望结果**：
```
测试结果汇总:
  总测试数: 15
✅   通过: 15
  通过率: 100.0%

🎉 所有测试通过！数据流运行正常。
```

---

### 阶段 4: 访问大屏（2 分钟）

```bash
# ✅ 步骤 11: 访问大屏选择页
# 打开浏览器：http://localhost:3000/dashboards

# ✅ 步骤 12: 选择一个大屏
# 点击任一模板，例如 "网络监控大屏"

# ✅ 步骤 13: 验证数据显示
# 检查以下内容是否正常：
# - 设备统计数字 (总设备数、在线数、离线数)
# - 告警统计 (总告警数、严重告警数)
# - 设备列表 (显示实际设备)
# - 拓扑图 (如果配置了 Business View)
```

**🎉 成功！** 如果看到数据，说明整个流程已打通。

---

## 🔍 故障快速排查

### 问题 1: `verify:data-flow` 失败

```bash
# OpManager 连接失败？
→ 检查 .env 中的 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY
→ 测试网络连通性: ping 10.141.69.192
→ 如果 SSL 问题，设置: NODE_TLS_REJECT_UNAUTHORIZED=0

# 数据库无数据？
→ 检查是否运行了设备同步
→ 访问 /admin/devices → "Sync Devices"
→ 或运行: curl -X POST http://localhost:3000/api/devices/sync

# 采集器未运行？
→ 检查: pm2 status
→ 启动: npm run collector
```

### 问题 2: 大屏无数据

```bash
# 1. 检查数据库是否有数据
npm run check:all

# 2. 检查 API 是否返回数据
curl http://localhost:3000/api/dashboard/overview

# 3. 如果 API 返回空，说明数据未同步
# 回到"阶段 3: 数据同步"重新执行
```

### 问题 3: 拓扑图为空

```bash
# 1. 检查 Business View 配置
# 访问 /admin/topology
# 确认已添加且激活

# 2. 检查拓扑数据是否同步
npm run check:all | grep -i topology

# 3. 手动触发拓扑同步
# 重启采集器或等待 5 分钟
pm2 restart collector
```

---

## 📊 验证步骤对照表

| 步骤 | 命令/操作 | 预期结果 | 状态 |
|------|-----------|----------|------|
| 1. 安装依赖 | `npm install` | 成功安装 | ⬜ |
| 2. 配置 .env | 编辑 `.env` | 包含所有必需变量 | ⬜ |
| 3. 初始化数据库 | `npm run db:push` | Schema 同步成功 | ⬜ |
| 4. 验证 OpManager | `npm run verify:opmanager-apis` | 所有 API 通过 ✅ | ⬜ |
| 5. 启动应用 | `npm run start` | 服务运行在 3000 端口 | ⬜ |
| 6. 查看 Business Views | `npm run diagnose:opmanager` | 列出所有 BV 名称 | ⬜ |
| 7. 配置 BV | `/admin/topology` | 添加所有需要的 BV | ⬜ |
| 8. 激活 BV | 开关打开 | `isActive = true` ✅ | ⬜ |
| 9. 同步设备 | `/admin/devices` 或 API | 设备列表显示 | ⬜ |
| 10. 启动采集器 | `npm run collector` | 日志显示采集中 | ⬜ |
| 11. 验证数据流 | `npm run verify:data-flow` | 通过率 100% | ⬜ |
| 12. 访问大屏 | `/dashboards` | 显示模板列表 | ⬜ |
| 13. 查看数据 | `/dashboards/network-monitor` | 数据正常显示 | ⬜ |

**目标**：所有状态都是 ✅

---

## 🎯 关键配置点速查

### 1. Business View 配置路径
```
OpManager → 配置 Business View
     ↓
Admin 面板 → /admin/topology → 添加 BV
     ↓
Topology Collector → 自动同步拓扑数据
     ↓
数据库 → BusinessViewConfig + DeviceBusinessView + TopologyNode
     ↓
前端大屏 → 显示拓扑图
```

### 2. 设备数据流路径
```
OpManager → listDevices_v2 API
     ↓
Device Collector → 手动同步
     ↓
数据库 → Device 表
     ↓
Metric Collector → 自动采集性能指标
     ↓
数据库 → DeviceMetric 表
     ↓
Dashboard API → /api/dashboard/overview
     ↓
前端大屏 → 显示设备状态和指标
```

### 3. 告警数据流路径
```
OpManager → getAlarms API
     ↓
Alarm Collector → 自动采集 (每 30 秒)
     ↓
数据库 → Alarm 表
     ↓
Dashboard API → /api/alarms
     ↓
前端大屏 → 显示告警列表
```

---

## ⏱️ 时间线参考

| 时间 | 里程碑 | 检查点 |
|------|--------|--------|
| T+0 | 开始部署 | - |
| T+5min | 环境就绪 | `npm install` 完成 |
| T+10min | OpManager 连接 | `verify:opmanager-apis` 通过 |
| T+15min | BV 配置完成 | Admin 面板添加所有 BV |
| T+20min | 数据同步完成 | 设备、接口数据入库 |
| T+25min | 采集器运行 | 首轮采集完成 |
| T+30min | 大屏上线 | 数据正常显示 🎉 |

**实际时间可能因数据量和网络速度而异**

---

## 📞 快速支持

### 诊断命令速查

```bash
# 环境检查
npm run test:env

# OpManager 连接
npm run verify:opmanager-apis

# 完整数据流
npm run verify:data-flow

# 数据检查
npm run check:all

# 查看日志
pm2 logs collector
pm2 logs monitoring-dashboard
```

### 重要文件路径

```
配置文件:        .env
大屏配置:        src/config/dashboards/
采集器入口:      src/services/collector/start.ts
Admin 面板:      src/app/admin/
API 路由:        src/pages/api/
数据库 Schema:   prisma/schema.prisma
```

### 常用端口

```
应用端口:        3000
数据库:          5432 (PostgreSQL)
缓存:            6379 (Redis)
OpManager:       8061 (HTTPS)
```

---

## ✅ 部署成功标志

当你看到以下内容时，说明部署成功：

1. ✅ `npm run verify:data-flow` 显示 100% 通过
2. ✅ `/dashboards` 页面显示 4 个大屏模板
3. ✅ 点击大屏后能看到实时数据
4. ✅ 设备数量、告警数量显示正确
5. ✅ 拓扑图显示网络结构（如果配置了 BV）
6. ✅ 数据会自动更新（采集器在运行）

**🎉 恭喜！你的监控大屏系统已成功上线！**

---

**下一步**：
- 📖 阅读 [COMPLETE-SETUP-GUIDE.md](COMPLETE-SETUP-GUIDE.md) 了解详细配置
- 🔧 根据需求调整大屏配置
- 📊 设置定期健康检查
- 🚀 优化性能和缓存

**需要帮助？**
- 查看详细指南：[COMPLETE-SETUP-GUIDE.md](COMPLETE-SETUP-GUIDE.md)
- 运行诊断工具：`npm run verify:data-flow`
- 查看故障排查：[scripts/VERIFY-DATA-FLOW-README.md](scripts/VERIFY-DATA-FLOW-README.md)
