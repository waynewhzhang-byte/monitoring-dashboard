# 📘 监控大屏完整配置与操作指南

## 🎯 目标

本指南将详细说明从 OpManager 数据采集到前端大屏展示的**完整操作流程**，包括所有必需的配置步骤。

---

## 📊 数据流概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           完整数据流图                                    │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ OpManager API (数据源)
   ↓
2️⃣ 数据采集器 (Collectors)
   ├─ Device Collector     → 设备信息
   ├─ Interface Collector  → 接口信息
   ├─ Metric Collector     → 性能指标 (CPU/内存/磁盘)
   ├─ Alarm Collector      → 告警信息
   └─ Topology Collector   → 拓扑数据 (Business Views)
   ↓
3️⃣ 数据库 (PostgreSQL)
   ├─ Device               → 设备表
   ├─ Interface            → 接口表
   ├─ DeviceMetric         → 设备指标表
   ├─ TrafficMetric        → 流量指标表
   ├─ Alarm                → 告警表
   ├─ TopologyNode         → 拓扑节点表
   ├─ TopologyEdge         → 拓扑边表
   ├─ BusinessViewConfig   → 业务视图配置表 ⭐
   └─ DeviceBusinessView   → 设备-业务视图关联表 ⭐
   ↓
4️⃣ API 层 (Next.js API Routes)
   ├─ /api/devices         → 设备列表 API
   ├─ /api/dashboard/overview → 概览数据 API
   ├─ /api/alarms          → 告警列表 API
   ├─ /api/traffic/top     → Top 流量 API
   └─ /api/dashboards/[id] → 大屏配置 API
   ↓
5️⃣ 前端大屏 (Dashboard)
   ├─ /dashboards          → 大屏选择页
   └─ /dashboards/[id]     → 具体大屏展示
   ↓
6️⃣ 实时更新 (WebSocket)
   └─ Socket.io 推送实时数据变化

⭐ 关键配置点: BusinessViewConfig 是连接 OpManager Business View 和大屏拓扑的核心！
```

---

## 🚀 完整配置步骤

### 第一步：环境准备与初始化

#### 1.1 检查环境变量

确保 `.env` 文件包含以下配置：

```bash
# 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/monitoring_dashboard"

# Redis
REDIS_URL="redis://localhost:6379"

# OpManager API (⭐ 重要)
OPMANAGER_BASE_URL="https://10.141.69.192:8061"
OPMANAGER_API_KEY="your-api-key-here"
OPMANAGER_TIMEOUT=30000

# 如果 SSL 证书问题
NODE_TLS_REJECT_UNAUTHORIZED=0

# 应用
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT=3000

# 采集间隔配置
COLLECT_METRICS_INTERVAL=60        # 指标采集: 60秒
COLLECT_ALARMS_INTERVAL=30         # 告警采集: 30秒
SYNC_DEVICES_INTERVAL=600          # 设备同步: 手动触发 (不再自动)
```

#### 1.2 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 同步数据库 Schema
npm run db:push

# (可选) 填充种子数据
npm run db:seed
```

#### 1.3 验证 OpManager 连接

```bash
# 验证所有 OpManager API 端点
npm run verify:opmanager-apis
```

**预期输出**：
```
✅ listDevices_v2 API works
✅ getDeviceDetails API works
✅ filterInterfaces_by_device API works
✅ getBusinessViews API works
```

---

### 第二步：配置 Business Views（⭐ 核心步骤）

#### 2.1 了解 Business View 的作用

**Business View** 是 OpManager 中的概念，用于：
- 将设备按业务或功能分组
- 定义网络拓扑结构
- 关联设备和拓扑图

在本系统中，**必须配置 Business View** 才能在大屏上显示拓扑和关联数据。

#### 2.2 查看 OpManager 中的 Business Views

先在 OpManager 中查看有哪些 Business Views：

```bash
# 方式 1: 使用诊断脚本
npm run diagnose:opmanager

# 方式 2: 查看现有脚本
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/discover-op-bvs.ts
```

**示例输出**：
```
OpManager Business Views:
- 出口业务
- 核心网络
- 服务器区域
```

#### 2.3 在 Admin 面板配置 Business Views

1. **启动应用**（如果未启动）：
   ```bash
   npm run start
   ```

2. **访问 Admin 面板**：
   ```
   http://localhost:3000/admin
   ```

3. **进入 "业务视图配置"**：
   ```
   http://localhost:3000/admin/topology
   ```

4. **添加 Business View**：
   - **OpManager View Name**: 填入 OpManager 中的准确名称，如 `出口业务`
   - **Display Name**: 可选，用户友好的名称，如 `出口业务拓扑`
   - **Description**: 可选，如 `公司出口网络拓扑结构`
   - 点击 "Add View"

5. **激活 Business View**：
   - 确保 `isActive` 开关为 **开启状态** ✅
   - 只有激活的 Business View 才会被采集器同步

6. **重复以上步骤** 添加所有需要监控的 Business Views

**⚠️ 重要**：
- `name` 字段必须与 OpManager 中的名称**完全一致**（包括大小写、空格）
- 错误的名称会导致采集失败

---

### 第三步：首次数据同步

#### 3.1 手动同步设备和接口

设备和接口数据需要**手动触发同步**（不再自动采集）：

**方式 1: 使用 Admin 面板**

1. 访问设备管理页：
   ```
   http://localhost:3000/admin/devices
   ```

2. 点击 **"Sync Devices from OpManager"** 按钮

3. 等待同步完成（可能需要 30-60 秒）

4. 刷新页面查看设备列表

**方式 2: 使用 API**

```bash
# 同步设备
curl -X POST http://localhost:3000/api/devices/sync

# 同步接口
curl -X POST http://localhost:3000/api/interfaces/sync
```

**方式 3: 使用检查脚本**

```bash
# 检查并触发同步
npm run check:sync
```

#### 3.2 启动自动采集器

采集器负责定期采集以下数据：
- ✅ 设备性能指标（CPU、内存、磁盘）：每 60 秒
- ✅ 告警信息：每 30 秒
- ✅ 拓扑数据（Business Views）：每 5 分钟

```bash
# 启动采集器
npm run collector

# 或使用 PM2 管理
pm2 start ecosystem.config.js
```

**预期日志**：
```
🚀 Starting Data Collector Scheduler...
🔄 Syncing Business View: 出口业务...
✅ Synced 12 nodes, 15 edges
🔄 Collecting metrics...
✅ Collected metrics for 45 devices
🔄 Syncing alarms...
✅ Synced 5 active alarms
🕒 Scheduler running.
```

#### 3.3 验证数据采集

```bash
# 完整数据流验证
npm run verify:data-flow
```

**预期结果**：
```
✅ Environment Check: All required variables present
✅ OpManager Connection: Connected successfully
✅ Device Collection: Devices synced successfully
✅ Interface Collection: Interfaces synced successfully
✅ Metric Collection: Metrics collected successfully
✅ Alarm Collection: Alarms synced successfully
✅ Device Data in DB: 45 devices found
✅ Interface Data in DB: 234 interfaces found
✅ Metric Data in DB: 156 metrics found

通过率: 100.0%
🎉 所有测试通过！数据流运行正常。
```

---

### 第四步：配置设备和业务视图关联（重要）

#### 4.1 为什么需要关联？

设备必须关联到 Business View，才能：
- 在拓扑图上显示
- 按业务分组统计
- 支持业务视图过滤

#### 4.2 自动关联（推荐）

Topology Collector 在采集时会自动建立关联：

```typescript
// src/services/collector/topology.ts
// 当同步 Business View 时，会自动：
// 1. 读取 OpManager Business View 中的设备列表
// 2. 在数据库中查找对应的设备
// 3. 创建 DeviceBusinessView 关联记录
```

**验证关联**：

```bash
# 检查设备业务视图关联
npm run check:all
```

查看输出中的 "businessViews" 字段。

#### 4.3 手动关联（可选）

如果自动关联失败，可以通过 Admin 面板手动关联：

1. 访问 **设备管理页**：
   ```
   http://localhost:3000/admin/devices
   ```

2. 找到目标设备，点击 **"Edit Business Views"**

3. 勾选相关的 Business Views

4. 点击 **"Save"**

---

### 第五步：配置设备标签（可选，增强分类）

#### 5.1 标签的作用

设备标签用于：
- 细粒度分类（如 "核心交换机"、"边缘路由器"）
- Dashboard 过滤（按标签显示设备）
- 统计和分组

#### 5.2 添加标签

1. 访问设备管理页：
   ```
   http://localhost:3000/admin/devices
   ```

2. 找到设备，点击 **"Edit Tags"**

3. 输入标签（逗号分隔）：
   ```
   核心, 路由器, 高优先级
   ```

4. 点击 **"Save"**

#### 5.3 批量添加标签

使用脚本批量添加：

```bash
# 创建批量标签脚本
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/batch-tag-devices.ts
```

---

### 第六步：访问和配置大屏

#### 6.1 访问大屏选择页

```
http://localhost:3000/dashboards
```

你会看到 4 个预设大屏模板：

| 大屏 ID | 名称 | 说明 |
|---------|------|------|
| `network-monitor` | 网络监控大屏 | 设备状态、流量统计、网络拓扑 |
| `alarm-center` | 告警中心大屏 | 告警统计、趋势分析 |
| `server-monitor` | 服务器监控大屏 | 服务器性能监控 |
| `comprehensive` | 综合监控大屏 | 全方位监控 |

#### 6.2 访问具体大屏

点击任一模板，或直接访问：

```
http://localhost:3000/dashboards/network-monitor
http://localhost:3000/dashboards/alarm-center
http://localhost:3000/dashboards/server-monitor
http://localhost:3000/dashboards/comprehensive
```

#### 6.3 大屏配置文件

大屏配置文件位于：

```
src/config/dashboards/
├── network-monitor.ts    # 网络监控大屏配置
├── alarm-center.ts       # 告警中心大屏配置
├── server-monitor.ts     # 服务器监控大屏配置
├── comprehensive.ts      # 综合监控大屏配置
└── index.ts              # 配置索引
```

#### 6.4 自定义大屏（高级）

可以通过以下方式自定义大屏：

**方式 1: 修改预设模板**

编辑配置文件，例如 `src/config/dashboards/network-monitor.ts`：

```typescript
export const networkMonitorDashboard: DashboardConfig = {
  id: 'network-monitor',
  name: '网络监控大屏',
  description: '实时监控网络设备状态、流量和拓扑结构',
  layout: [
    { i: 'overview', x: 0, y: 0, w: 24, h: 4 },
    { i: 'devices', x: 0, y: 4, w: 12, h: 8 },
    // ... 添加更多布局
  ],
  widgets: [
    {
      id: 'overview',
      type: 'overview-stats',
      title: '系统概览',
      config: { /* 配置参数 */ }
    },
    // ... 添加更多 widgets
  ],
};
```

**方式 2: 数据库动态大屏**

1. 在数据库中创建 Dashboard 记录：

```sql
INSERT INTO "Dashboard" (id, name, description, layout, widgets)
VALUES (
  'custom-dashboard',
  '自定义大屏',
  '我的自定义监控大屏',
  '{"layout": [...]}',
  '{"widgets": [...]}'
);
```

2. 访问：
   ```
   http://localhost:3000/dashboards/custom-dashboard
   ```

---

### 第七步：验证大屏数据展示

#### 7.1 检查大屏是否正常加载

1. 访问大屏页面
2. 观察是否有加载错误
3. 检查浏览器控制台（F12 → Console）

#### 7.2 验证数据是否显示

大屏上应该能看到：

- ✅ **设备统计**：总设备数、在线设备数、离线设备数
- ✅ **告警统计**：总告警数、严重告警数
- ✅ **流量图表**：Top 10 接口流量
- ✅ **设备列表**：实时设备状态
- ✅ **拓扑图**：网络拓扑结构（如果配置了 Business View）

#### 7.3 常见问题排查

**问题 1: 大屏显示 "无数据"**

```bash
# 检查数据库是否有数据
npm run db:studio

# 检查 API 是否返回数据
curl http://localhost:3000/api/dashboard/overview
```

**问题 2: 拓扑图为空**

```bash
# 检查 Business View 配置
npm run check:all

# 验证 Topology Collector 是否运行
pm2 logs collector | grep "Syncing Business View"
```

**问题 3: 数据不更新**

```bash
# 检查采集器状态
pm2 status

# 查看采集器日志
pm2 logs collector

# 手动触发采集
npm run collector
```

---

## 🔄 数据更新机制

### 自动更新（实时）

1. **WebSocket 连接**：
   - 前端通过 Socket.io 连接到后端
   - 采集器在采集到新数据后，通过 WebSocket 推送到前端
   - 前端自动更新显示

2. **定时轮询**（备用）：
   - 如果 WebSocket 连接失败，前端会降级到定时轮询
   - 默认每 30 秒刷新一次数据

### 手动刷新

在大屏页面按 **F5** 或点击刷新按钮。

---

## 📝 配置检查清单

在大屏上线前，请确保以下配置都已完成：

### ✅ 环境配置
- [ ] `.env` 文件已正确配置
- [ ] `OPMANAGER_BASE_URL` 和 `OPMANAGER_API_KEY` 正确
- [ ] 数据库连接正常
- [ ] Redis 连接正常

### ✅ OpManager 连接
- [ ] `npm run verify:opmanager-apis` 通过
- [ ] 能成功获取设备列表
- [ ] 能成功获取 Business Views

### ✅ Business View 配置
- [ ] 在 `/admin/topology` 添加了所有需要的 Business Views
- [ ] Business View 名称与 OpManager 完全一致
- [ ] Business View 已激活（`isActive = true`）

### ✅ 数据同步
- [ ] 手动同步了设备：`/admin/devices` → "Sync Devices"
- [ ] 手动同步了接口（如需要）
- [ ] 采集器正在运行：`pm2 status` 或 `npm run collector`
- [ ] `npm run verify:data-flow` 通过率 ≥ 80%

### ✅ 数据库数据
- [ ] 设备表有数据：`SELECT COUNT(*) FROM "Device"`
- [ ] 接口表有数据：`SELECT COUNT(*) FROM "Interface"`
- [ ] 指标表有数据：`SELECT COUNT(*) FROM "DeviceMetric"`
- [ ] 拓扑节点有数据：`SELECT COUNT(*) FROM "TopologyNode"`
- [ ] Business View 关联有数据：`SELECT COUNT(*) FROM "DeviceBusinessView"`

### ✅ 大屏访问
- [ ] 能访问大屏选择页：`/dashboards`
- [ ] 能访问具体大屏：`/dashboards/network-monitor`
- [ ] 大屏数据正常显示
- [ ] 拓扑图正常显示（如果有）
- [ ] WebSocket 连接正常（F12 → Network → WS）

---

## 🐛 常见问题与解决方案

### Q1: Business View 采集失败

**现象**：
```
❌ Failed to sync Business View: 出口业务
Error: Business View not found
```

**原因**：
- Business View 名称与 OpManager 不一致
- OpManager 中不存在该 Business View

**解决**：
```bash
# 1. 列出 OpManager 中的所有 Business Views
npm run diagnose:opmanager

# 2. 检查配置中的名称是否完全匹配
# 3. 在 /admin/topology 中修正名称
```

### Q2: 设备未关联到 Business View

**现象**：拓扑图为空，或设备列表中 businessViews 字段为空

**原因**：
- Topology Collector 未运行
- Business View 配置未激活
- 设备在 OpManager 的 Business View 中不存在

**解决**：
```bash
# 1. 确认 Business View 已激活
npm run check:all

# 2. 手动触发拓扑同步
# (需要采集器运行，等待 5 分钟或重启采集器)
pm2 restart collector

# 3. 查看同步日志
pm2 logs collector | grep "Business View"
```

### Q3: 大屏数据为空

**现象**：大屏显示 "无数据" 或数字都是 0

**原因**：
- 采集器未运行
- 设备未同步
- API 返回空数据

**解决**：
```bash
# 1. 完整数据流验证
npm run verify:data-flow

# 2. 检查 API 返回
curl http://localhost:3000/api/dashboard/overview

# 3. 手动同步设备
# 访问 /admin/devices → "Sync Devices"
```

### Q4: 大屏加载很慢

**原因**：
- 数据库查询未优化
- 数据量过大
- 网络延迟

**解决**：
```bash
# 1. 检查数据库索引
# 在 prisma/schema.prisma 中确认索引已创建

# 2. 开启 Redis 缓存
# 确认 REDIS_URL 已配置

# 3. 优化查询
# 在 API 中添加分页和字段过滤
```

### Q5: WebSocket 连接失败

**现象**：
- 浏览器控制台显示 "WebSocket connection failed"
- 数据不自动更新

**原因**：
- Next.js 服务未启动
- 防火墙阻止 WebSocket
- NEXT_PUBLIC_WS_URL 配置错误

**解决**：
```bash
# 1. 检查服务状态
pm2 status

# 2. 验证 WebSocket 端口
# 访问 http://localhost:3000/api/socket

# 3. 检查环境变量
echo $NEXT_PUBLIC_WS_URL
```

---

## 📊 监控和维护

### 定期检查（推荐）

设置 cron job 定期验证数据流：

```bash
# 编辑 crontab
crontab -e

# 每小时检查一次
0 * * * * cd /path/to/monitoring-dashboard && npm run verify:data-flow >> /var/log/health-check.log 2>&1

# 每天早上 8 点发送报告
0 8 * * * cd /path/to/monitoring-dashboard && npm run check:all >> /var/log/daily-report.log 2>&1
```

### 查看日志

```bash
# 采集器日志
pm2 logs collector

# Next.js 服务日志
pm2 logs monitoring-dashboard

# 系统日志
tail -f /var/log/health-check.log
```

### 性能监控

```bash
# 检查数据库大小
npm run db:studio

# 清理过期数据（如果需要）
# 根据 DATA_RETENTION_DAYS 配置自动清理
```

---

## 🎉 总结

完成以上步骤后，你的监控大屏系统应该已经：

1. ✅ 成功连接 OpManager API
2. ✅ 持续采集设备、接口、指标、告警数据
3. ✅ 同步 Business View 拓扑数据
4. ✅ 在数据库中正确存储所有数据
5. ✅ 通过 API 提供数据给前端
6. ✅ 在大屏上实时展示监控数据

**关键要点回顾**：

- 🔑 **Business View** 是拓扑显示的核心，必须在 Admin 面板配置
- 🔑 **手动同步** 设备和接口（不再自动）
- 🔑 **采集器必须运行** 才能持续更新数据
- 🔑 使用 **`npm run verify:data-flow`** 验证完整数据链路

**下一步**：

- 根据业务需求自定义大屏配置
- 添加更多设备标签和分组
- 配置告警规则和通知
- 优化性能和缓存策略

---

**遇到问题？**

1. 查看本指南的 "常见问题与解决方案" 章节
2. 运行 `npm run verify:data-flow` 诊断问题
3. 查看采集器和服务日志
4. 参考 [scripts/VERIFY-DATA-FLOW-README.md](scripts/VERIFY-DATA-FLOW-README.md)

祝你使用愉快！🎉
