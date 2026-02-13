# 🎨 监控大屏数据流可视化图

本文档提供系统数据流的可视化说明，帮助理解从 OpManager 到大屏展示的完整链路。

---

## 1️⃣ 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           监控大屏系统架构                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                         ╔═══════════════════════╗
                         ║   OpManager Server    ║
                         ║   (Data Source)       ║
                         ╚═══════════════════════╝
                                    │
                         REST API   │   HTTPS
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼──────┐  ┌────▼─────┐  ┌─────▼──────┐
            │ listDevices  │  │getAlarms │  │getBVDetails│
            │    _v2       │  │          │  │            │
            └──────────────┘  └──────────┘  └────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                         ╔═══════════════════════╗
                         ║  Data Collectors      ║
                         ║  (Node.js + cron)     ║
                         ╠═══════════════════════╣
                         ║ • Device Collector    ║ → 手动触发
                         ║ • Interface Collector ║ → 手动触发
                         ║ • Metric Collector    ║ → 每 60 秒
                         ║ • Alarm Collector     ║ → 每 30 秒
                         ║ • Topology Collector  ║ → 每 5 分钟
                         ╚═══════════════════════╝
                                    │
                         Prisma ORM │
                                    │
                         ╔═══════════════════════╗
                         ║   PostgreSQL DB       ║
                         ╠═══════════════════════╣
                         ║ • Device              ║
                         ║ • Interface           ║
                         ║ • DeviceMetric        ║
                         ║ • TrafficMetric       ║
                         ║ • Alarm               ║
                         ║ • TopologyNode        ║
                         ║ • TopologyEdge        ║
                         ║ • BusinessViewConfig  ║ ⭐
                         ║ • DeviceBusinessView  ║ ⭐
                         ╚═══════════════════════╝
                                    │
                         ╔═══════════════════════╗
                         ║   Redis Cache         ║
                         ║   (Optional)          ║
                         ║ • Device List (60s)   ║
                         ║ • Topology Data (60s) ║
                         ╚═══════════════════════╝
                                    │
                         ╔═══════════════════════╗
                         ║   Next.js API Routes  ║
                         ╠═══════════════════════╣
                         ║ /api/devices          ║
                         ║ /api/dashboard/       ║
                         ║   overview            ║
                         ║ /api/alarms           ║
                         ║ /api/traffic/top      ║
                         ║ /api/dashboards/[id]  ║
                         ╚═══════════════════════╝
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                HTTP│         Socket.io         WebSocket
                    │           (Real-time)         │
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                         ╔═══════════════════════╗
                         ║   Frontend Dashboard  ║
                         ╠═══════════════════════╣
                         ║ • /dashboards         ║ → 大屏选择
                         ║ • /dashboards/[id]    ║ → 大屏展示
                         ║ • /admin              ║ → 配置管理
                         ╚═══════════════════════╝
                                    │
                                    ▼
                         ╔═══════════════════════╗
                         ║   用户浏览器          ║
                         ║   (Chrome/Firefox)    ║
                         ╚═══════════════════════╝
```

---

## 2️⃣ 配置流程图

### Admin 配置 → 数据采集 → 大屏展示

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         配置与数据流程                                    │
└─────────────────────────────────────────────────────────────────────────┘

【步骤 1】管理员配置
    │
    ├─→ 访问 /admin/topology
    │       │
    │       ├─→ 添加 Business View
    │       │       ├─ name: "出口业务" (必须与 OpManager 一致)
    │       │       ├─ displayName: "出口业务拓扑"
    │       │       └─ isActive: true ✅
    │       │
    │       └─→ 保存到数据库
    │               └─→ BusinessViewConfig 表
    │
    └─→ 访问 /admin/devices
            │
            ├─→ 点击 "Sync Devices from OpManager"
            │       │
            │       └─→ 触发 Device Collector
            │               └─→ 调用 OpManager listDevices_v2 API
            │                       └─→ 保存到 Device 表
            │
            └─→ (可选) 编辑设备标签和类型
                    └─→ tags: ["核心", "路由器"]

【步骤 2】采集器启动
    │
    npm run collector
    │
    ├─→ 【每 5 分钟】Topology Collector
    │       │
    │       ├─→ 读取 BusinessViewConfig (isActive = true)
    │       │
    │       ├─→ 对每个 Business View:
    │       │       ├─→ 调用 getBVDetails(viewName)
    │       │       │       └─→ 获取拓扑节点和边
    │       │       │
    │       │       ├─→ 调用 getBusinessDetailsView(viewName)
    │       │       │       └─→ 获取设备性能数据
    │       │       │
    │       │       ├─→ 同步 TopologyNode
    │       │       │       └─→ 关联 Device (通过 opmanagerId)
    │       │       │
    │       │       ├─→ 同步 TopologyEdge
    │       │       │       └─→ 关联 Interface (如果有)
    │       │       │
    │       │       └─→ 创建 DeviceBusinessView 关联 ⭐
    │       │               └─→ 连接 Device 和 BusinessViewConfig
    │       │
    │       └─→ 日志: "✅ Synced 12 nodes, 15 edges"
    │
    ├─→ 【每 60 秒】Metric Collector
    │       │
    │       ├─→ 读取所有 isMonitored = true 的设备
    │       │
    │       ├─→ 对每个设备:
    │       │       ├─→ 调用 getDeviceDetails(deviceId)
    │       │       │       └─→ 获取 CPU、内存、磁盘等指标
    │       │       │
    │       │       └─→ 创建 DeviceMetric 记录
    │       │               └─→ timestamp: 当前时间
    │       │
    │       └─→ 日志: "✅ Collected metrics for 45 devices"
    │
    └─→ 【每 30 秒】Alarm Collector
            │
            ├─→ 调用 getAlarms()
            │
            ├─→ 对每个告警:
            │       ├─→ 检查是否重复 (去重逻辑)
            │       │
            │       └─→ 创建或更新 Alarm 记录
            │
            └─→ 日志: "✅ Synced 5 active alarms"

【步骤 3】数据存储
    │
    PostgreSQL
    │
    ├─→ Device (45 rows)
    │       ├─ id: "ck..."
    │       ├─ opmanagerId: "10.141.1.1"
    │       ├─ name: "Router-Core-01"
    │       ├─ status: "up"
    │       ├─ isMonitored: true
    │       └─ tags: ["核心", "路由器"]
    │
    ├─→ BusinessViewConfig (2 rows) ⭐
    │       ├─ name: "出口业务"
    │       ├─ displayName: "出口业务拓扑"
    │       └─ isActive: true
    │
    ├─→ DeviceBusinessView (45 rows) ⭐
    │       ├─ deviceId: "ck..."
    │       ├─ viewName: "出口业务"
    │       └─ 关联关系: Device ←→ BusinessViewConfig
    │
    ├─→ TopologyNode (12 rows)
    │       ├─ id: "出口业务-10.141.1.1"
    │       ├─ viewName: "出口业务"
    │       ├─ deviceId: "ck..."
    │       ├─ positionX: 100
    │       └─ positionY: 200
    │
    ├─→ TopologyEdge (15 rows)
    │       ├─ sourceId: "出口业务-10.141.1.1"
    │       ├─ targetId: "出口业务-10.141.1.2"
    │       └─ viewName: "出口业务"
    │
    └─→ DeviceMetric (5678 rows)
            ├─ deviceId: "ck..."
            ├─ cpuUsage: 45.2
            ├─ memoryUsage: 68.5
            └─ timestamp: 2026-01-24T10:30:00Z

【步骤 4】API 查询
    │
    用户访问: /dashboards/network-monitor
    │
    ├─→ GET /api/dashboard/overview
    │       │
    │       └─→ 查询:
    │               ├─ SELECT COUNT(*) FROM Device WHERE isMonitored = true
    │               ├─ SELECT COUNT(*) FROM Alarm WHERE status = 'active'
    │               └─ SELECT * FROM DeviceMetric ORDER BY timestamp DESC LIMIT 10
    │
    ├─→ GET /api/devices?limit=100
    │       │
    │       └─→ 查询:
    │               SELECT * FROM Device
    │               INCLUDE businessViews, interfaces
    │               WHERE isMonitored = true
    │               ORDER BY name
    │
    └─→ GET /api/topology?viewName=出口业务
            │
            └─→ 查询:
                    ├─ SELECT * FROM TopologyNode WHERE viewName = '出口业务'
                    ├─ SELECT * FROM TopologyEdge WHERE viewName = '出口业务'
                    └─ INCLUDE device, interface 数据

【步骤 5】前端展示
    │
    DashboardRenderer 组件
    │
    ├─→ OverviewStats Widget
    │       └─→ 显示: "45 台设备 | 5 个告警 | 89% 在线率"
    │
    ├─→ DeviceList Widget
    │       └─→ 显示设备列表 (名称、IP、状态、标签)
    │
    ├─→ AlarmList Widget
    │       └─→ 显示实时告警 (严重程度、时间、设备)
    │
    ├─→ TopologyViewer Widget
    │       └─→ 使用 Sigma.js 渲染拓扑图
    │               ├─ nodes: TopologyNode 数组
    │               ├─ edges: TopologyEdge 数组
    │               └─ 实时流量叠加显示
    │
    └─→ MetricChart Widget
            └─→ 显示设备性能趋势图 (CPU、内存、磁盘)

【步骤 6】实时更新
    │
    Socket.io WebSocket 连接
    │
    ├─→ 采集器采集到新数据
    │       │
    │       └─→ 通过 broadcastService.sendUpdate()
    │               └─→ 推送到所有连接的客户端
    │
    └─→ 前端接收更新
            │
            ├─→ useRealtimeUpdates Hook
            │       └─→ 监听 'devices:update' 事件
            │
            └─→ 更新 Zustand Store
                    └─→ 触发组件重新渲染
                            └─→ 大屏数据自动刷新 🔄
```

---

## 3️⃣ Business View 核心关联图 ⭐

这是理解拓扑显示的关键！

```
┌─────────────────────────────────────────────────────────────────┐
│              Business View 数据关联关系                          │
└─────────────────────────────────────────────────────────────────┘

OpManager Business View: "出口业务"
    │
    │ 包含设备:
    ├─ Router-Core-01 (10.141.1.1)
    ├─ Router-Core-02 (10.141.1.2)
    ├─ Switch-Edge-01 (10.141.2.1)
    └─ Switch-Edge-02 (10.141.2.2)
    │
    │ 拓扑结构:
    ├─ Nodes: 12 个节点 (设备位置)
    └─ Edges: 15 条连线 (设备连接)

            ↓  Topology Collector 同步

【数据库】
    │
    ├─→ BusinessViewConfig
    │       ├─ id: "bv1"
    │       ├─ name: "出口业务" ←─────────────┐
    │       ├─ displayName: "出口业务拓扑"    │
    │       └─ isActive: true                  │
    │                                           │
    ├─→ Device (4 rows)                        │
    │       ├─ id: "d1"                        │
    │       ├─ opmanagerId: "10.141.1.1"       │
    │       └─ name: "Router-Core-01"          │
    │                                           │
    ├─→ DeviceBusinessView ⭐ 关联表          │
    │       ├─ deviceId: "d1" ─────────────┐   │
    │       └─ viewName: "出口业务" ────────┼───┘
    │                                       │
    ├─→ TopologyNode (12 rows)             │
    │       ├─ id: "出口业务-10.141.1.1"    │
    │       ├─ viewName: "出口业务"         │
    │       ├─ deviceId: "d1" ──────────────┘
    │       ├─ positionX: 100
    │       ├─ positionY: 200
    │       └─ metadata: { performance, ... }
    │
    └─→ TopologyEdge (15 rows)
            ├─ sourceId: "出口业务-10.141.1.1"
            ├─ targetId: "出口业务-10.141.1.2"
            └─ viewName: "出口业务"

            ↓  API 查询

【前端拓扑展示】
    │
    TopologyViewer 组件
    │
    ├─→ 查询参数: viewName = "出口业务"
    │
    ├─→ 获取数据:
    │       ├─ nodes: TopologyNode[] (12 个)
    │       ├─ edges: TopologyEdge[] (15 个)
    │       └─ 每个 node 关联到 Device (获取实时状态)
    │
    └─→ Sigma.js 渲染:
            ├─ 绘制节点 (x, y 坐标)
            ├─ 绘制连线
            ├─ 叠加设备状态 (颜色标识)
            ├─ 显示性能数据 (CPU、内存)
            └─ 支持交互 (点击、拖拽、缩放)

📝 关键点:
  1. BusinessViewConfig.name 必须与 OpManager 完全一致
  2. DeviceBusinessView 建立 Device 和 BusinessView 的多对多关系
  3. TopologyNode.viewName 用于过滤特定业务视图的拓扑
  4. TopologyNode.deviceId 关联到 Device，获取实时状态
```

---

## 4️⃣ 数据采集时序图

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ OpManager│    │Collector │    │PostgreSQL│    │ Frontend │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │               │ 【启动】      │               │
     │               ├──────────────>│               │
     │               │ 读取 BV Config│               │
     │               │<──────────────┤               │
     │               │               │               │
     │<──────────────┤               │               │
     │  getBVDetails │               │               │
     ├──────────────>│               │               │
     │  返回拓扑数据 │               │               │
     │               │               │               │
     │               ├──────────────>│               │
     │               │ 同步 Topology │               │
     │               │  Node & Edge  │               │
     │               │               │               │
     │<──────────────┤               │               │
     │getDeviceDetails              │               │
     ├──────────────>│               │               │
     │  返回性能指标 │               │               │
     │               │               │               │
     │               ├──────────────>│               │
     │               │ 保存 Metric   │               │
     │               │               │               │
     │               │               │<──────────────┤
     │               │               │ GET /api/...  │
     │               │               ├──────────────>│
     │               │               │ 返回数据      │
     │               │               │               │
     │               ├───────────────┴──────────────>│
     │               │     Socket.io 推送更新        │
     │               │               │               │
     │               │ 【等待 60s】  │               │
     │               │ ...           │               │
     │               │ 【下一轮采集】│               │
     │               │               │               │

时间线:
T+0s     : 采集器启动，读取配置
T+5s     : 同步拓扑数据 (Business View)
T+10s    : 采集设备指标
T+15s    : 采集告警
T+20s    : 数据推送到前端
T+30s    : 下一轮告警采集
T+60s    : 下一轮指标采集
T+300s   : 下一轮拓扑采集
```

---

## 5️⃣ 故障排查决策树

```
大屏无数据显示？
    │
    ├─→ 【检查】是否能访问大屏页面？
    │       ├─ 否 → Next.js 服务未启动
    │       │       └─→ 运行: npm run start
    │       │
    │       └─ 是 → 继续下一步
    │
    ├─→ 【检查】API 是否返回数据？
    │       ├─ 测试: curl http://localhost:3000/api/dashboard/overview
    │       │
    │       ├─ 返回 500/404 → API 路由问题
    │       │       └─→ 检查 src/pages/api/dashboard/overview.ts
    │       │
    │       ├─ 返回空数据 → 数据库无数据
    │       │       │
    │       │       ├─→ 【检查】数据库是否有设备？
    │       │       │       ├─ 运行: npm run check:all
    │       │       │       │
    │       │       │       ├─ 无设备 → 未同步设备
    │       │       │       │       └─→ 访问 /admin/devices
    │       │       │       │           → 点击 "Sync Devices"
    │       │       │       │
    │       │       │       └─ 有设备 → 继续下一步
    │       │       │
    │       │       └─→ 【检查】采集器是否运行？
    │       │               ├─ 运行: pm2 status
    │       │               │
    │       │               ├─ 未运行 → 启动采集器
    │       │               │       └─→ npm run collector
    │       │               │
    │       │               └─ 运行中 → 检查日志
    │       │                       └─→ pm2 logs collector
    │       │
    │       └─ 返回正常数据 → 前端渲染问题
    │               └─→ 打开浏览器控制台 (F12)
    │                   → 查看 Console 和 Network 错误
    │
    └─→ 【特殊】拓扑图为空？
            │
            ├─→ 【检查】Business View 是否配置？
            │       ├─ 访问: /admin/topology
            │       │
            │       ├─ 无配置 → 添加 Business View
            │       │       └─→ 参考 COMPLETE-SETUP-GUIDE.md
            │       │
            │       └─ 有配置 → 检查是否激活
            │               └─→ isActive 必须为 true ✅
            │
            └─→ 【检查】拓扑数据是否同步？
                    ├─ 查询: SELECT COUNT(*) FROM "TopologyNode"
                    │
                    ├─ 无数据 → 等待 Topology Collector 运行
                    │       └─→ 每 5 分钟自动运行
                    │           或重启: pm2 restart collector
                    │
                    └─ 有数据 → 检查 viewName 是否匹配
                            └─→ 前端查询的 viewName 必须存在于数据库
```

---

## 6️⃣ 关键配置参数速查表

| 配置项 | 位置 | 作用 | 默认值 | 注意事项 |
|--------|------|------|--------|----------|
| **OPMANAGER_BASE_URL** | `.env` | OpManager API 地址 | - | 必须包含协议和端口 |
| **OPMANAGER_API_KEY** | `.env` | OpManager API 密钥 | - | 从 OpManager 获取 |
| **BusinessViewConfig.name** | 数据库 | BV 名称 | - | 必须与 OpManager 完全一致 ⭐ |
| **BusinessViewConfig.isActive** | 数据库 | 是否激活 | `true` | 只有激活的 BV 才会采集 |
| **Device.isMonitored** | 数据库 | 是否监控 | `true` | 控制是否采集指标 |
| **Interface.isMonitored** | 数据库 | 是否监控接口 | `true` | 控制是否采集流量 |
| **COLLECT_METRICS_INTERVAL** | `.env` | 指标采集间隔 | `60` | 单位：秒 |
| **COLLECT_ALARMS_INTERVAL** | `.env` | 告警采集间隔 | `30` | 单位：秒 |
| **Topology 采集间隔** | 硬编码 | 拓扑采集间隔 | `5 分钟` | 见 `collector/start.ts` |

---

## 📚 相关文档

- **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** - 详细配置步骤
- **[QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)** - 快速启动清单
- **[scripts/VERIFY-DATA-FLOW-README.md](./scripts/VERIFY-DATA-FLOW-README.md)** - 数据流验证工具

---

**提示**：建议打印或保存本文档作为系统部署和故障排查的快速参考！
