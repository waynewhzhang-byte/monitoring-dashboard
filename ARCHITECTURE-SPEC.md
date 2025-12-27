# 智能监控大屏系统 - 架构设计规格文档

## 文档信息

| 项目 | 内容 |
|------|------|
| **系统名称** | 智能监控大屏系统 (Intelligent Monitoring Dashboard) |
| **版本** | v1.0.0 |
| **文档版本** | 1.0 |
| **最后更新** | 2024-12-15 |
| **架构师** | Wayne Zhang |
| **状态** | 待评审 |

---

## 1. 架构概述

### 1.1 系统定位

智能监控大屏系统采用**现代化全栈架构**，基于Next.js 14 App Router构建，实现：

- 🎯 **单体应用架构** - 前后端一体化，简化部署
- ⚡ **实时数据流** - WebSocket + Redis Pub/Sub
- 📊 **时序数据处理** - PostgreSQL + TimescaleDB扩展
- 🚀 **高性能缓存** - Redis多级缓存策略
- 🔌 **可扩展设计** - 插件化数据源、模块化架构

### 1.2 技术选型依据

| 技术组件 | 选型理由 | 替代方案对比 |
|---------|---------|------------|
| **Next.js 14** | 全栈框架、SSR支持、API Routes、优秀的开发体验 | Remix、Nuxt.js（生态不如Next.js成熟） |
| **TypeScript** | 类型安全、IDE支持好、减少运行时错误 | JavaScript（缺少类型检查） |
| **Prisma** | 类型安全的ORM、迁移管理、优秀的DX | TypeORM（类型推断不够强）、Drizzle（生态较新） |
| **PostgreSQL** | 成熟稳定、支持TimescaleDB扩展、丰富的数据类型 | MySQL（时序数据支持弱）、MongoDB（关系查询复杂） |
| **Redis** | 高性能缓存、Pub/Sub支持、丰富的数据结构 | Memcached（功能单一）、NATS（学习曲线陡） |
| **Socket.io** | WebSocket封装、自动降级、房间管理 | 原生WebSocket（需自行实现重连）、SockJS（维护较少） |
| **TailwindCSS** | 原子化CSS、高度定制、开发效率高 | Styled Components（运行时开销）、Ant Design（定制困难） |
| **React Flow** | 专业拓扑图库、性能优秀、可定制性强 | Cytoscape.js（配置复杂）、D3.js（需要大量自定义） |

### 1.3 架构设计原则

#### 1.3.1 单一职责原则 (SRP)
- 每个模块/服务只负责一个功能领域
- 数据采集、实时推送、告警处理相互独立

#### 1.3.2 开闭原则 (OCP)
- 对扩展开放：插件化数据源接口
- 对修改封闭：核心逻辑稳定，扩展通过接口

#### 1.3.3 依赖倒置原则 (DIP)
- 高层模块不依赖低层模块，都依赖抽象
- 使用接口定义数据源、通知渠道

#### 1.3.4 最小惊讶原则
- API设计符合RESTful规范
- WebSocket事件命名清晰明确
- 错误处理一致性

---

## 2. 系统架构

### 2.1 总体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     展示层 (Presentation Layer)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  大屏页面    │  │  管理后台    │  │  移动端      │          │
│  │              │  │              │  │  (未来)      │          │
│  │ - 主大屏     │  │ - 设备管理   │  │              │          │
│  │ - 网络视图   │  │ - 拓扑编辑   │  │              │          │
│  │ - 服务器视图 │  │ - 告警管理   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│                    React 18 + TypeScript                         │
│                    TailwindCSS + Framer Motion                   │
│                    Zustand (状态管理)                            │
│                    Socket.io Client (实时通信)                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                     应用层 (Application Layer)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Next.js 14 App Router                       │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │       │
│  │  │ API Routes  │  │ Server      │  │ Middleware  │  │       │
│  │  │             │  │ Actions     │  │             │  │       │
│  │  │ /api/devices│  │             │  │ - Auth      │  │       │
│  │  │ /api/alarms │  │ - Mutations │  │ - CORS      │  │       │
│  │  │ /api/topology│  │ - Queries  │  │ - Logging   │  │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                            ↕                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Socket.io Server (WebSocket)                │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │       │
│  │  │ Connection  │  │ Room        │  │ Broadcast   │  │       │
│  │  │ Manager     │  │ Manager     │  │ Engine      │  │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                    业务逻辑层 (Business Logic Layer)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  数据采集服务   │  │  实时推送服务   │  │  告警处理服务   │ │
│  │                 │  │                 │  │                 │ │
│  │ - DeviceCollector│  │ - RealtimeServer│  │ - RuleEngine   │ │
│  │ - MetricCollector│  │ - RedisPubSub  │  │ - Deduplication│ │
│  │ - AlarmCollector│  │ - Broadcaster  │  │ - Aggregation  │ │
│  │ - TrafficCollector│  │                │  │ - Escalation   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  拓扑管理服务   │  │  统计分析服务   │  │  通知服务       │ │
│  │                 │  │                 │  │  (可选)         │ │
│  │ - LayoutEngine │  │ - HealthScore  │  │ - Email        │ │
│  │ - NodeManager  │  │ - Aggregator   │  │ - DingTalk     │ │
│  │ - EdgeManager  │  │ - Reporter     │  │ - WeChat       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                    数据访问层 (Data Access Layer)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Prisma ORM                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│    │
│  │  │ Device   │  │ Metric   │  │ Alarm    │  │ Topology ││    │
│  │  │ Model    │  │ Model    │  │ Model    │  │ Model    ││    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                    │                 │
│  ┌────────▼──────────┐              ┌─────────▼──────────┐      │
│  │  Redis Client     │              │  PostgreSQL        │      │
│  │                   │              │  + TimescaleDB     │      │
│  │ - Cache Layer     │              │                    │      │
│  │ - Pub/Sub         │              │ - 设备配置         │      │
│  │ - Session         │              │ - 时序指标         │      │
│  │ - Task Queue      │              │ - 告警记录         │      │
│  └───────────────────┘              │ - 拓扑数据         │      │
│                                      └────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                    外部集成层 (External Integration)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           OpManager API Client                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │ Device API   │  │ Alarm API    │  │ Interface API│  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │ Metrics API  │  │ Topology API │  │ Availability │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │
│  │                                                          │    │
│  │  - HTTP Client (Axios)                                  │    │
│  │  - Rate Limiting                                        │    │
│  │  - Auto Retry                                           │    │
│  │  - Error Handling                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↕ HTTPS                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │       ManageEngine OpManager REST API                    │    │
│  │       https://opmanager.example.com/api/json/...         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    基础设施层 (Infrastructure)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Logging    │  │  Monitoring  │  │   Security   │          │
│  │              │  │              │  │              │          │
│  │ - Winston    │  │ - Sentry     │  │ - JWT Auth   │          │
│  │ - File/      │  │ - Prometheus │  │ - HTTPS/WSS  │          │
│  │   Console    │  │   (可选)     │  │ - Rate Limit │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 分层架构说明

#### 展示层 (Presentation Layer)
- **职责**: 用户界面展示、用户交互处理
- **技术**: React 18, TypeScript, TailwindCSS, Framer Motion
- **组件**:
  - 页面组件: 大屏页面、管理后台
  - 业务组件: DevicePanel, NetworkTopology, AlarmList等
  - UI组件: Button, Card, Modal等
  - Hooks: useWebSocket, useDevices, useMetrics等

#### 应用层 (Application Layer)
- **职责**: 请求路由、请求处理、响应封装
- **技术**: Next.js 14 App Router, API Routes, Server Actions
- **组件**:
  - API Routes: RESTful API端点
  - Server Actions: 服务端操作（如表单提交）
  - Middleware: 认证、日志、CORS
  - WebSocket Server: 实时通信服务

#### 业务逻辑层 (Business Logic Layer)
- **职责**: 核心业务逻辑、数据处理、规则引擎
- **组件**:
  - 数据采集服务: 从OpManager采集数据
  - 实时推送服务: WebSocket消息推送
  - 告警处理服务: 告警去重、聚合、升级
  - 拓扑管理服务: 拓扑图布局、节点管理
  - 统计分析服务: 健康度计算、趋势分析

#### 数据访问层 (Data Access Layer)
- **职责**: 数据持久化、缓存管理
- **技术**: Prisma ORM, PostgreSQL, Redis
- **组件**:
  - Prisma Models: 数据模型定义
  - Redis Client: 缓存和Pub/Sub
  - Database Migrations: 数据库迁移

#### 外部集成层 (External Integration)
- **职责**: 对接外部系统API
- **组件**:
  - OpManager API Client: HTTP客户端
  - Rate Limiting: 限流处理
  - Auto Retry: 自动重试

#### 基础设施层 (Infrastructure)
- **职责**: 日志、监控、安全
- **组件**:
  - Logging: Winston日志
  - Monitoring: Sentry错误追踪
  - Security: JWT认证、HTTPS

---

## 3. 核心模块设计

### 3.1 数据采集模块

#### 3.1.1 架构设计

```
┌────────────────────────────────────────────────────────────┐
│              Collector Scheduler (Node-cron)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Device Sync  │  │ Metrics Coll │  │ Alarm Sync   │     │
│  │ (10min)      │  │ (60s)        │  │ (30s)        │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Collectors                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │DeviceCollector  │  │MetricCollector  │  │AlarmCollector││
│  │                 │  │                 │  │              ││
│  │- syncDevices()  │  │- collectMetrics │  │- syncAlarms()││
│  │- syncInterfaces │  │- collectTraffic │  │- deduplicate ││
│  │                 │  │- batchCollect   │  │              ││
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘│
└───────────┼────────────────────┼────────────────────┼────────┘
            │                    │                    │
            ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                 OpManager API Client                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ listDevices │  │ getDeviceSum│  │ listAlarms  │         │
│  │ getDeviceInfo│  │ getInterface│  │ acknowledge │         │
│  │ setManaged  │  │ getTraffic  │  │ clearAlarm  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  - Rate Limiting (自动检测429)                               │
│  - Auto Retry (3次重试)                                      │
│  - Error Handling                                            │
└───────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────┐
│           Data Processing Pipeline                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Validation │→ │ Transform  │→ │ Persist    │            │
│  │ (Zod)      │  │ (Mapping)  │  │            │            │
│  └────────────┘  └────────────┘  └─────┬──────┘            │
└──────────────────────────────────────────┼───────────────────┘
                                           │
                    ┌──────────────────────┴─────────────┐
                    │                                    │
                    ↓                                    ↓
          ┌──────────────────┐              ┌──────────────────┐
          │  PostgreSQL      │              │  Redis Cache     │
          │                  │              │                  │
          │ - Device         │              │ - metrics:device │
          │ - DeviceMetric   │              │ - metrics:iface  │
          │ - Alarm          │              │ - TTL: 60s       │
          │ - TrafficMetric  │              │                  │
          └──────────────────┘              └──────────────────┘
                    │                                    │
                    └──────────────┬─────────────────────┘
                                   ↓
                        ┌──────────────────┐
                        │  Redis Pub/Sub   │
                        │                  │
                        │ - metrics:updated│
                        │ - alarms:new     │
                        └──────────────────┘
                                   ↓
                        ┌──────────────────┐
                        │ WebSocket Server │
                        │ (Real-time Push) │
                        └──────────────────┘
```

#### 3.1.2 采集策略

**分级监控策略**

| 级别 | 采集间隔 | 适用设备 | 优先级 |
|-----|---------|---------|--------|
| CRITICAL | 30秒 | 核心路由器、核心交换机、关键服务器 | P0 |
| NORMAL | 60秒 | 普通网络设备、应用服务器 | P1 |
| LOW | 300秒 | 非关键设备、测试环境 | P2 |

**批量采集优化**

```typescript
// 每批50个设备，避免API限流
async function batchCollect(devices: Device[]) {
  const chunks = chunk(devices, 50);

  for (const batch of chunks) {
    // 并发采集，但控制并发数
    await Promise.allSettled(
      batch.map(device => collectMetrics(device))
    );

    // 批次间延迟100ms，避免过快触发限流
    await sleep(100);
  }
}
```

**智能重试机制**

```typescript
async function collectWithRetry(device: Device, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await collectMetrics(device);
    } catch (error) {
      if (error.statusCode === 429) {
        // 限流错误，等待1分钟后重试
        await sleep(60000);
      } else if (i === maxRetries - 1) {
        // 最后一次重试失败，记录错误
        logger.error(`Failed to collect metrics for ${device.name}`, error);
        throw error;
      } else {
        // 指数退避重试
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }
}
```

#### 3.1.3 数据流转

```typescript
// 1. 采集 OpManager 数据
const opDevice = await opManagerClient.getDeviceSummary(deviceName);

// 2. 数据验证和转换
const metrics = DeviceMetricsSchema.parse({
  cpuUsage: opDevice.cpuUtilization,
  memoryUsage: opDevice.memoryUtilization,
  diskUsage: opDevice.diskUtilization,
  timestamp: new Date(),
});

// 3. 持久化到数据库
await prisma.deviceMetric.create({
  data: { deviceId, ...metrics }
});

// 4. 缓存到 Redis（用于快速查询）
await redis.setex(
  `metrics:device:${deviceId}`,
  60, // TTL: 60秒
  JSON.stringify(metrics)
);

// 5. 发布到 Pub/Sub（触发实时推送）
await redis.publish('metrics:updated', JSON.stringify({
  deviceId,
  metrics,
  timestamp: Date.now()
}));
```

### 3.2 实时推送模块

#### 3.2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Clients                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Client 1 │  │ Client 2 │  │ Client 3 │  │ Client N │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼─────────────┼───────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │ Socket.io
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              Socket.io Server (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Connection Manager                        │   │
│  │  - onConnect: 客户端连接处理                         │   │
│  │  - onDisconnect: 客户端断开清理                      │   │
│  │  - Heartbeat: 心跳检测 (30s)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Subscription Manager                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Device      │  │ Alarm       │  │ Topology    │  │   │
│  │  │ Rooms       │  │ Room        │  │ Room        │  │   │
│  │  │             │  │             │  │             │  │   │
│  │  │ device:id1  │  │ alarms      │  │ topology    │  │   │
│  │  │ device:id2  │  │             │  │             │  │   │
│  │  │ ...         │  │             │  │             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Broadcast Engine                          │   │
│  │  - broadcastToRoom(room, event, data)                │   │
│  │  - broadcast(event, data) // 全局广播                │   │
│  │  - 批量推送优化 (100ms buffer)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                      ↕ Redis Adapter
┌─────────────────────────────────────────────────────────────┐
│                Redis Pub/Sub (多实例支持)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Channel:     │  │ Channel:     │  │ Channel:     │      │
│  │ metrics:     │  │ alarms:      │  │ topology:    │      │
│  │ updated      │  │ new          │  │ changed      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  - Subscriber监听频道                                       │
│  - 接收到消息后广播到相应的Socket.io房间                    │
└──────────────────────────────────────────────────────────────┘
```

#### 3.2.2 订阅机制

**房间隔离策略**

```typescript
// 客户端订阅特定设备
socket.emit('subscribe:devices', ['device-1', 'device-2']);

// 服务端加入房间
socket.on('subscribe:devices', (deviceIds: string[]) => {
  deviceIds.forEach(deviceId => {
    socket.join(`device:${deviceId}`);
  });
});

// 推送时只发送到订阅的房间
io.to(`device:${deviceId}`).emit('metrics:update', data);
```

**批量推送优化**

```typescript
// 100ms内的更新合并推送
const updateBuffer: Map<string, any[]> = new Map();

function queueUpdate(room: string, data: any) {
  if (!updateBuffer.has(room)) {
    updateBuffer.set(room, []);

    // 100ms后批量推送
    setTimeout(() => {
      const updates = updateBuffer.get(room);
      if (updates && updates.length > 0) {
        io.to(room).emit('batch:update', updates);
        updateBuffer.delete(room);
      }
    }, 100);
  }

  updateBuffer.get(room)!.push(data);
}
```

#### 3.2.3 多实例支持

```typescript
// 使用 Redis Adapter 实现多实例 Socket.io
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = redis.duplicate();
const subClient = redis.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// 所有实例共享房间状态
// 消息会自动在实例间同步
```

### 3.3 告警管理模块

#### 3.3.1 告警处理流程

```
┌────────────────────────────────────────────────────────┐
│              OpManager Alarm Source                     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────┐
│             Alarm Collector                             │
│  - 定时同步告警 (30s)                                   │
│  - 获取活动告警列表                                     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────┐
│             Alarm Rule Engine                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. 数据验证 (Zod Schema)                        │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↓                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  2. 告警去重                                      │  │
│  │  - Key: deviceId + category + severity           │  │
│  │  - Window: 5分钟                                  │  │
│  │  - Action: 更新发生次数，不创建新告警             │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↓                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  3. 告警聚合                                      │  │
│  │  - 同一设备的多个告警聚合                         │  │
│  │  - 同一根因的告警聚合                             │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↓                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  4. 告警升级                                      │  │
│  │  - 持续时间 > 30分钟 → 升级一级                   │  │
│  │  - 重要设备告警 → 自动升级                        │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↓                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  5. 告警分级                                      │  │
│  │  - CRITICAL: CPU>90%, 设备离线                    │  │
│  │  - MAJOR: CPU>80%, 磁盘>90%                       │  │
│  │  - MINOR: CPU>70%, 内存>80%                       │  │
│  │  - WARNING: 其他告警                              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│  PostgreSQL      │    │  Redis Pub/Sub   │
│  - Alarm表       │    │  - alarms:new    │
│  - 历史告警      │    │  - 即时推送      │
│  - 审计日志      │    │                  │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ↓
                        ┌──────────────────┐
                        │ WebSocket Server │
                        │ - 推送到前端     │
                        └──────────────────┘
                                 │
                                 ↓
                        ┌──────────────────┐
                        │ Notification     │
                        │ Service (可选)   │
                        │ - 邮件           │
                        │ - 钉钉           │
                        │ - 企业微信       │
                        └──────────────────┘
```

#### 3.3.2 告警去重算法

```typescript
class AlarmDeduplicator {
  async deduplicate(alarm: Alarm): Promise<Alarm | null> {
    // 生成去重键
    const dedupeKey = this.generateKey(alarm);

    // 检查Redis中是否存在
    const existing = await redis.get(`alarm:dedupe:${dedupeKey}`);

    if (existing) {
      // 已存在，更新发生次数
      const existingAlarm = JSON.parse(existing);
      existingAlarm.occurrenceCount++;
      existingAlarm.lastOccurrence = new Date();

      // 更新数据库
      await prisma.alarm.update({
        where: { id: existingAlarm.id },
        data: {
          occurrenceCount: existingAlarm.occurrenceCount,
          lastOccurrence: existingAlarm.lastOccurrence,
        },
      });

      // 刷新Redis TTL
      await redis.setex(
        `alarm:dedupe:${dedupeKey}`,
        300, // 5分钟
        JSON.stringify(existingAlarm)
      );

      return null; // 不创建新告警
    }

    // 不存在，创建新告警
    alarm.occurrenceCount = 1;
    const created = await prisma.alarm.create({ data: alarm });

    // 添加到Redis
    await redis.setex(
      `alarm:dedupe:${dedupeKey}`,
      300,
      JSON.stringify(created)
    );

    return created;
  }

  private generateKey(alarm: Alarm): string {
    return `${alarm.deviceId}:${alarm.category}:${alarm.severity}`;
  }
}
```

### 3.4 网络拓扑模块

#### 3.4.1 数据模型

```typescript
// 拓扑节点
interface TopologyNode {
  id: string;
  type: 'device' | 'group' | 'cloud';
  label: string;
  position: { x: number; y: number };
  data: {
    deviceId?: string;      // 关联的设备ID
    status?: DeviceStatus;  // 设备状态
    icon?: string;          // 图标名称
    metrics?: {             // 实时指标
      cpuUsage?: number;
      memoryUsage?: number;
    };
  };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

// 拓扑连接
interface TopologyEdge {
  id: string;
  source: string;           // 源节点ID
  target: string;           // 目标节点ID
  type?: 'default' | 'smoothstep' | 'step';
  label?: string;           // 连接标签(如带宽)
  data?: {
    interfaceId?: string;   // 关联的接口ID
    bandwidth?: number;     // 带宽
    utilization?: number;   // 利用率
    inTraffic?: number;     // 入流量
    outTraffic?: number;    // 出流量
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
  animated?: boolean;       // 是否动画
}
```

#### 3.4.2 布局算法

**层次布局 (Hierarchical Layout)**

```typescript
function hierarchicalLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): TopologyNode[] {
  // 1. 构建层次结构
  const layers = buildLayers(nodes, edges);

  // 2. 计算每层的Y坐标
  const layerHeight = 200;
  const nodeHeight = 60;

  layers.forEach((layer, layerIndex) => {
    const y = layerIndex * layerHeight;

    // 3. 计算每个节点的X坐标(居中对齐)
    const layerWidth = 1000;
    const spacing = layerWidth / (layer.length + 1);

    layer.forEach((node, nodeIndex) => {
      node.position = {
        x: spacing * (nodeIndex + 1),
        y: y
      };
    });
  });

  return nodes;
}
```

**力导向布局 (Force-directed Layout)**

```typescript
// 使用 D3-force 算法
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

function forceDirectedLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): TopologyNode[] {
  const simulation = forceSimulation(nodes)
    .force('link', forceLink(edges).id(d => d.id).distance(200))
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(500, 400));

  // 运行模拟
  simulation.tick(300);

  // 停止模拟
  simulation.stop();

  return nodes;
}
```

---

## 4. 数据库设计

### 4.1 物理数据模型

```sql
-- ==================== 设备表 ====================
CREATE TABLE "Device" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "opmanagerId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "type" TEXT NOT NULL, -- ROUTER, SWITCH, FIREWALL, SERVER, etc.
  "category" TEXT,
  "ipAddress" TEXT NOT NULL,
  "macAddress" TEXT,
  "vendor" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "osType" TEXT,
  "osVersion" TEXT,
  "location" TEXT,
  "status" TEXT NOT NULL, -- ONLINE, OFFLINE, WARNING, ERROR
  "availability" DOUBLE PRECISION,
  "isMonitored" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  "lastSyncAt" TIMESTAMP
);

-- 索引
CREATE INDEX "Device_status_idx" ON "Device"("status");
CREATE INDEX "Device_type_idx" ON "Device"("type");
CREATE INDEX "Device_isMonitored_idx" ON "Device"("isMonitored");

-- ==================== 设备指标表 (时序数据) ====================
CREATE TABLE "DeviceMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "cpuUsage" DOUBLE PRECISION,
  "cpuLoad1m" DOUBLE PRECISION,
  "cpuLoad5m" DOUBLE PRECISION,
  "cpuLoad15m" DOUBLE PRECISION,
  "memoryUsage" DOUBLE PRECISION,
  "memoryTotal" BIGINT,
  "memoryUsed" BIGINT,
  "memoryFree" BIGINT,
  "diskUsage" DOUBLE PRECISION,
  "diskTotal" BIGINT,
  "diskUsed" BIGINT,
  "diskFree" BIGINT,
  "responseTime" DOUBLE PRECISION,
  "packetLoss" DOUBLE PRECISION,
  "uptime" BIGINT,
  "temperature" DOUBLE PRECISION,
  "timestamp" TIMESTAMP NOT NULL,

  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE
);

-- 转换为TimescaleDB超表
SELECT create_hypertable('DeviceMetric', 'timestamp');

-- 索引
CREATE INDEX "DeviceMetric_deviceId_timestamp_idx"
  ON "DeviceMetric"("deviceId", "timestamp" DESC);

-- 数据保留策略 (30天)
SELECT add_retention_policy('DeviceMetric', INTERVAL '30 days');

-- ==================== 接口表 ====================
CREATE TABLE "Interface" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "opmanagerId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "description" TEXT,
  "type" TEXT NOT NULL, -- ETHERNET, FIBER, LOOPBACK, etc.
  "macAddress" TEXT,
  "speed" BIGINT,
  "mtu" INTEGER,
  "ipAddress" TEXT,
  "subnetMask" TEXT,
  "status" TEXT NOT NULL, -- UP, DOWN, TESTING, DORMANT
  "adminStatus" TEXT,
  "ifIndex" INTEGER,
  "isMonitored" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE
);

-- 索引
CREATE INDEX "Interface_deviceId_idx" ON "Interface"("deviceId");
CREATE INDEX "Interface_status_idx" ON "Interface"("status");

-- ==================== 流量指标表 (时序数据) ====================
CREATE TABLE "TrafficMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "interfaceId" TEXT NOT NULL,
  "inOctets" BIGINT NOT NULL DEFAULT 0,
  "outOctets" BIGINT NOT NULL DEFAULT 0,
  "inPackets" BIGINT NOT NULL DEFAULT 0,
  "outPackets" BIGINT NOT NULL DEFAULT 0,
  "inBandwidth" BIGINT,
  "outBandwidth" BIGINT,
  "inUtilization" DOUBLE PRECISION,
  "outUtilization" DOUBLE PRECISION,
  "inErrors" BIGINT,
  "outErrors" BIGINT,
  "inDiscards" BIGINT,
  "outDiscards" BIGINT,
  "timestamp" TIMESTAMP NOT NULL,

  FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE
);

-- 转换为TimescaleDB超表
SELECT create_hypertable('TrafficMetric', 'timestamp');

-- 索引
CREATE INDEX "TrafficMetric_interfaceId_timestamp_idx"
  ON "TrafficMetric"("interfaceId", "timestamp" DESC);

-- ==================== 告警表 ====================
CREATE TABLE "Alarm" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "opmanagerId" TEXT,
  "deviceId" TEXT NOT NULL,
  "severity" TEXT NOT NULL, -- CRITICAL, MAJOR, MINOR, WARNING, INFO
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL, -- ACTIVE, ACKNOWLEDGED, RESOLVED, CLEARED
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP,
  "clearedAt" TIMESTAMP,
  "occurredAt" TIMESTAMP NOT NULL,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "lastOccurrence" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE
);

-- 索引
CREATE INDEX "Alarm_deviceId_idx" ON "Alarm"("deviceId");
CREATE INDEX "Alarm_severity_idx" ON "Alarm"("severity");
CREATE INDEX "Alarm_status_idx" ON "Alarm"("status");
CREATE INDEX "Alarm_occurredAt_idx" ON "Alarm"("occurredAt" DESC);

-- ==================== 拓扑节点表 ====================
CREATE TABLE "TopologyNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- device, group, cloud
  "positionX" DOUBLE PRECISION NOT NULL,
  "positionY" DOUBLE PRECISION NOT NULL,
  "icon" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL
);

-- ==================== 拓扑连接表 ====================
CREATE TABLE "TopologyEdge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "label" TEXT,
  "type" TEXT,
  "interfaceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  FOREIGN KEY ("sourceId") REFERENCES "TopologyNode"("id") ON DELETE CASCADE,
  FOREIGN KEY ("targetId") REFERENCES "TopologyNode"("id") ON DELETE CASCADE,
  FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE SET NULL
);
```

### 4.2 数据保留策略

| 表名 | 粒度 | 保留时长 | 聚合策略 |
|-----|------|---------|---------|
| DeviceMetric (原始) | 1分钟 | 7天 | - |
| DeviceMetric (聚合) | 5分钟 | 30天 | AVG, MAX, MIN |
| DeviceMetric (汇总) | 1小时 | 1年 | AVG |
| TrafficMetric (原始) | 1分钟 | 7天 | - |
| TrafficMetric (聚合) | 5分钟 | 30天 | SUM, AVG |
| Alarm | - | 90天 | 已解决告警归档 |

### 4.3 TimescaleDB 连续聚合

```sql
-- 创建5分钟聚合视图
CREATE MATERIALIZED VIEW device_metrics_5min
WITH (timescaledb.continuous) AS
SELECT
  deviceId,
  time_bucket('5 minutes', timestamp) AS bucket,
  AVG(cpuUsage) AS avg_cpu,
  MAX(cpuUsage) AS max_cpu,
  AVG(memoryUsage) AS avg_memory,
  MAX(memoryUsage) AS max_memory,
  AVG(diskUsage) AS avg_disk
FROM DeviceMetric
GROUP BY deviceId, bucket;

-- 自动刷新策略
SELECT add_continuous_aggregate_policy('device_metrics_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');
```

---

## 5. 性能优化方案

### 5.1 前端性能优化

#### 5.1.1 代码分割和懒加载

```typescript
// 路由级别代码分割
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('./app/dashboard/page'));
const TopologyEditor = lazy(() => import('./app/admin/topology/page'));

// 组件级别懒加载
const HeavyChart = lazy(() => import('./components/charts/HeavyChart'));

<Suspense fallback={<Loading />}>
  <HeavyChart data={data} />
</Suspense>
```

#### 5.1.2 虚拟滚动

```typescript
import { FixedSizeList } from 'react-window';

// 告警列表虚拟滚动
<FixedSizeList
  height={600}
  itemCount={alarms.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <AlarmRow style={style} alarm={alarms[index]} />
  )}
</FixedSizeList>
```

#### 5.1.3 图表数据降采样

```typescript
// 1分钟粒度数据降采样到5分钟
function downsample(data: Metric[], interval: number): Metric[] {
  const result: Metric[] = [];

  for (let i = 0; i < data.length; i += interval) {
    const chunk = data.slice(i, i + interval);
    result.push({
      timestamp: chunk[0].timestamp,
      value: average(chunk.map(d => d.value))
    });
  }

  return result;
}

// 使用
const downsampledData = downsample(rawData, 5);
```

#### 5.1.4 React 性能优化

```typescript
// 使用 React.memo 避免不必要的重渲染
export const DevicePanel = React.memo(({ device }) => {
  // ...
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.device.id === nextProps.device.id
      && prevProps.device.status === nextProps.device.status;
});

// 使用 useMemo 缓存计算结果
const processedData = useMemo(() => {
  return processMetrics(rawMetrics);
}, [rawMetrics]);

// 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  // ...
}, [dependency]);
```

### 5.2 后端性能优化

#### 5.2.1 数据库查询优化

```typescript
// 使用 Prisma 的 select 只查询需要的字段
const devices = await prisma.device.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    // 不查询不需要的字段
  },
  where: {
    isMonitored: true,
  },
  take: 100,
});

// 使用索引优化查询
// (已在数据库设计中添加索引)

// 批量查询优化
const devices = await prisma.device.findMany({
  where: { id: { in: deviceIds } },
  include: {
    metrics: {
      orderBy: { timestamp: 'desc' },
      take: 1, // 只取最新的指标
    },
  },
});
```

#### 5.2.2 Redis 缓存策略

```typescript
// 多级缓存
class MetricsService {
  async getDeviceMetrics(deviceId: string) {
    // L1: Redis缓存 (60秒)
    const cached = await redis.get(`metrics:device:${deviceId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // L2: 数据库查询
    const metrics = await prisma.deviceMetric.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    // 写入缓存
    if (metrics) {
      await redis.setex(
        `metrics:device:${deviceId}`,
        60,
        JSON.stringify(metrics)
      );
    }

    return metrics;
  }
}
```

#### 5.2.3 API 响应压缩

```typescript
// Next.js自动压缩响应 (gzip)
// 在 next.config.js 中启用
module.exports = {
  compress: true,
};

// 对于非常大的响应,可以使用流式传输
export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const data = await fetchLargeData();
      controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 5.3 实时通信优化

#### 5.3.1 WebSocket 消息压缩

```typescript
// Socket.io 配置压缩
const io = new Server(httpServer, {
  perMessageDeflate: {
    threshold: 1024, // 超过1KB的消息才压缩
  },
});
```

#### 5.3.2 批量推送

```typescript
// 100ms批量推送
const updateBuffer = new Map<string, any[]>();

function scheduleUpdate(deviceId: string, data: any) {
  const key = `device:${deviceId}`;

  if (!updateBuffer.has(key)) {
    updateBuffer.set(key, []);

    setTimeout(() => {
      const updates = updateBuffer.get(key)!;
      io.to(key).emit('batch:update', updates);
      updateBuffer.delete(key);
    }, 100);
  }

  updateBuffer.get(key)!.push(data);
}
```

---

## 6. 安全设计

### 6.1 认证与授权

#### 6.1.1 JWT 认证

```typescript
// JWT Token生成
import jwt from 'jsonwebtoken';

function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '24h',
      issuer: 'monitoring-dashboard',
    }
  );
}

// JWT验证中间件
async function authMiddleware(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.user = decoded;
    return null;
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

#### 6.1.2 RBAC 权限控制

```typescript
enum Role {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

const permissions = {
  [Role.ADMIN]: ['*'], // 所有权限
  [Role.OPERATOR]: ['device:read', 'device:update', 'alarm:acknowledge'],
  [Role.VIEWER]: ['device:read', 'alarm:read'],
};

function hasPermission(user: User, permission: string): boolean {
  const userPermissions = permissions[user.role];
  return userPermissions.includes('*') || userPermissions.includes(permission);
}
```

### 6.2 API 安全

#### 6.2.1 Rate Limiting

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 100, // 100个请求
  duration: 60, // 每60秒
  keyPrefix: 'api_limit',
});

async function rateLimitMiddleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  try {
    await rateLimiter.consume(ip);
    return null;
  } catch (error) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

#### 6.2.2 输入验证

```typescript
import { z } from 'zod';

// API输入验证
const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ROUTER', 'SWITCH', 'SERVER', 'FIREWALL']),
  ipAddress: z.string().ip(),
  isMonitored: z.boolean().default(true),
});

export async function POST(request: Request) {
  const body = await request.json();

  // 验证输入
  const result = CreateDeviceSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const device = await createDevice(result.data);
  return Response.json(device);
}
```

### 6.3 数据安全

#### 6.3.1 敏感信息加密

```typescript
// 环境变量存储敏感信息
// .env.local
OPMANAGER_API_KEY=<encrypted-or-from-vault>
DATABASE_URL=<encrypted-connection-string>
JWT_SECRET=<random-secret>
```

#### 6.3.2 SQL注入防护

```typescript
// Prisma自动防护SQL注入
// ✅ 安全 - 参数化查询
await prisma.device.findMany({
  where: { name: userInput }
});

// ❌ 不安全 - 直接拼接SQL(不要这样做)
await prisma.$queryRawUnsafe(`SELECT * FROM Device WHERE name = '${userInput}'`);

// ✅ 安全 - 使用$queryRaw with参数
await prisma.$queryRaw`SELECT * FROM Device WHERE name = ${userInput}`;
```

---

## 7. 部署架构

### 7.1 生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                       Load Balancer                          │
│                         (Nginx)                              │
│                  - HTTPS Termination                         │
│                  - Load Balancing                            │
│                  - WebSocket Support                         │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
┌─────────▼─────────┐  ┌────────▼────────┐
│  App Instance 1   │  │ App Instance 2  │
│                   │  │                 │
│ - Next.js Server  │  │ - Next.js Server│
│ - Socket.io       │  │ - Socket.io     │
│ - Collector       │  │ - Collector     │
└─────────┬─────────┘  └────────┬────────┘
          │                     │
          └──────────┬──────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
┌─────▼──────┐  ┌───▼────────┐  ┌─▼────────┐
│PostgreSQL  │  │  Redis     │  │ OpManager│
│ Master     │  │  Cluster   │  │   API    │
│            │  │            │  │          │
│ - Data     │  │ - Cache    │  │          │
│ - Timeseries│  │ - Pub/Sub │  │          │
└────┬───────┘  └────────────┘  └──────────┘
     │
┌────▼───────┐
│PostgreSQL  │
│ Replica    │
│ (Read-only)│
└────────────┘
```

### 7.2 Docker Compose 部署

```yaml
version: '3.8'

services:
  # 应用服务
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/monitoring
      REDIS_URL: redis://redis:6379
      OPMANAGER_BASE_URL: ${OPMANAGER_BASE_URL}
      OPMANAGER_API_KEY: ${OPMANAGER_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # PostgreSQL
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: monitoring
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  # Nginx (Load Balancer)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 7.3 Kubernetes 部署

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitoring-dashboard
  template:
    metadata:
      labels:
        app: monitoring-dashboard
    spec:
      containers:
      - name: app
        image: monitoring-dashboard:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: monitoring-dashboard
spec:
  selector:
    app: monitoring-dashboard
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## 8. 监控和运维

### 8.1 应用监控

#### 8.1.1 日志管理

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // 综合日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}
```

#### 8.1.2 错误追踪 (Sentry)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});
```

#### 8.1.3 性能监控

```typescript
// API性能监控
export async function GET(request: Request) {
  const start = Date.now();

  try {
    const result = await fetchData();

    const duration = Date.now() - start;
    logger.info('API call completed', {
      path: request.url,
      duration
    });

    return Response.json(result);
  } catch (error) {
    logger.error('API call failed', {
      path: request.url,
      error
    });
    throw error;
  }
}
```

### 8.2 健康检查

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      opmanager: await checkOpManager(),
    },
  };

  const isHealthy = Object.values(health.checks).every(c => c.healthy);

  return Response.json(health, {
    status: isHealthy ? 200 : 503,
  });
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

---

## 9. 扩展性设计

### 9.1 插件化数据源

```typescript
// 数据源接口定义
interface DataSourcePlugin {
  name: string;
  version: string;

  // 认证
  authenticate(config: any): Promise<boolean>;

  // 设备管理
  listDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device>;

  // 指标采集
  getDeviceMetrics(deviceId: string): Promise<Metrics>;
  getInterfaceTraffic(interfaceId: string): Promise<Traffic>;

  // 告警管理
  listAlarms(): Promise<Alarm[]>;
  acknowledgeAlarm(alarmId: string): Promise<void>;
}

// OpManager实现
class OpManagerDataSource implements DataSourcePlugin {
  name = 'OpManager';
  version = '1.0.0';

  async authenticate(config: OpManagerConfig) {
    // ...
  }

  async listDevices() {
    // ...
  }

  // ...其他方法实现
}

// Zabbix实现(未来扩展)
class ZabbixDataSource implements DataSourcePlugin {
  name = 'Zabbix';
  version = '1.0.0';

  // ...实现接口
}

// 数据源管理器
class DataSourceManager {
  private sources = new Map<string, DataSourcePlugin>();

  register(source: DataSourcePlugin) {
    this.sources.set(source.name, source);
  }

  get(name: string): DataSourcePlugin | undefined {
    return this.sources.get(name);
  }
}
```

### 9.2 水平扩展

```typescript
// 使用Redis实现多实例协调

// 分布式锁 - 避免重复采集
async function acquireLock(key: string, ttl: number): Promise<boolean> {
  const result = await redis.set(key, '1', 'EX', ttl, 'NX');
  return result === 'OK';
}

async function collectWithLock(deviceId: string) {
  const lockKey = `lock:collect:${deviceId}`;

  if (await acquireLock(lockKey, 60)) {
    try {
      await collectMetrics(deviceId);
    } finally {
      await redis.del(lockKey);
    }
  } else {
    logger.info(`Device ${deviceId} is being collected by another instance`);
  }
}
```

---

## 10. 总结

### 10.1 架构优势

| 优势 | 说明 |
|------|------|
| **全栈TypeScript** | 端到端类型安全，减少运行时错误 |
| **实时性能** | WebSocket + Redis Pub/Sub实现毫秒级更新 |
| **高性能** | 多级缓存、数据库优化、前端虚拟化 |
| **可扩展** | 插件化数据源、水平扩展支持 |
| **易维护** | 模块化设计、清晰的分层架构 |
| **生产就绪** | 完整的监控、日志、错误追踪 |

### 10.2 技术债务管理

| 阶段 | 技术债务 | 解决方案 |
|------|---------|---------|
| **MVP** | 单机部署、简单缓存 | 快速上线，验证需求 |
| **v1.1** | 添加Redis集群、读写分离 | 提升性能和可用性 |
| **v1.2** | Kubernetes部署、微服务拆分 | 支持大规模部署 |
| **v2.0** | 多数据源支持、AI告警 | 增强功能和智能化 |

### 10.3 后续优化方向

1. **性能优化**
   - 使用CDN加速静态资源
   - 实现边缘计算(Edge Functions)
   - GraphQL替代部分REST API

2. **功能增强**
   - 移动端适配(PWA)
   - 自定义仪表盘
   - 报表生成和导出

3. **智能化**
   - 异常检测算法
   - 告警预测
   - 根因分析

4. **多租户**
   - 组织隔离
   - 数据隔离
   - 权限精细化

---

**文档状态**: 待评审
**下一步行动**:
1. 技术团队评审架构设计
2. 确认技术选型
3. 搭建开发环境
4. 开始Phase 1开发

---

*本文档最后更新于 2024-12-15*
