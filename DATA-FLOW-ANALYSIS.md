# 数据采集到大屏展示的完整数据流程分析

## 📊 数据流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据采集阶段 (Collector)                          │
└─────────────────────────────────────────────────────────────────────────┘

OpManager API
    │
    ├─→ [MetricCollector] 每60秒采集一次
    │   ├─→ getDeviceSummary(deviceName)
    │   ├─→ 写入 PostgreSQL: prisma.deviceMetric.createMany()
    │   └─→ 推送实时更新: broadcaster.emit('device:${id}', 'METRICS_UPDATE')
    │
    ├─→ [AlarmCollector] 每30秒采集一次
    │   ├─→ getAlarms()
    │   ├─→ 告警去重检查: redis.get('alarm:dedupe:${deviceId}:${category}:${severity}')
    │   ├─→ 写入 PostgreSQL: prisma.alarm.create() (新告警)
    │   │   或 prisma.alarm.update() (重复告警，增加occurrenceCount)
    │   ├─→ 存储去重标记: redis.setex('alarm:dedupe:*', 300秒)
    │   └─→ 推送实时更新: broadcaster.emit('alarms', 'ALARM_NEW')
    │
    ├─→ [DeviceCollector] 手动触发
    │   └─→ 写入 PostgreSQL: prisma.device.upsert()
    │
    └─→ [InterfaceCollector] 手动触发
        └─→ 写入 PostgreSQL: prisma.interface.upsert()

┌─────────────────────────────────────────────────────────────────────────┐
│                        实时推送机制 (Redis Pub/Sub)                        │
└─────────────────────────────────────────────────────────────────────────┘

Broadcaster.emit(room, event, data)
    │
    └─→ redis.publish('events', { room, event, data })
        │
        └─→ Socket.io Server (io.ts)
            ├─→ 订阅 'events' 频道
            ├─→ 解析消息: { room, event, data }
            └─→ io.to(room).emit(event, data) 或 io.emit(event, data)
                │
                └─→ 前端 Socket.io Client 接收实时更新

┌─────────────────────────────────────────────────────────────────────────┐
│                        数据存储层 (PostgreSQL)                            │
└─────────────────────────────────────────────────────────────────────────┘

PostgreSQL 数据库表:
├─→ devices (设备信息)
├─→ device_metrics (设备指标历史)
├─→ alarms (告警记录)
├─→ interfaces (接口信息)
└─→ traffic_metrics (流量指标，如果启用)

┌─────────────────────────────────────────────────────────────────────────┐
│                        数据查询层 (API Routes)                            │
└─────────────────────────────────────────────────────────────────────────┘

前端请求 → Next.js API Routes
    │
    ├─→ /api/devices
    │   └─→ 直接从 PostgreSQL 读取: prisma.device.findMany()
    │       ❌ 不使用 Redis 缓存
    │
    ├─→ /api/alarms
    │   └─→ 直接从 PostgreSQL 读取: prisma.alarm.findMany()
    │       ❌ 不使用 Redis 缓存
    │
    ├─→ /api/metrics/history
    │   └─→ 直接从 PostgreSQL 读取: prisma.deviceMetric.findMany()
    │       ❌ 不使用 Redis 缓存
    │
    ├─→ /api/analytics/top-devices
    │   ├─→ 先查 Redis: getCache('analytics:top-devices:${metric}:${limit}')
    │   ├─→ 缓存命中 → 直接返回
    │   └─→ 缓存未命中 → 查 PostgreSQL → 写入 Redis (TTL: 30秒)
    │
    ├─→ /api/dashboard/critical-devices
    │   ├─→ 先查 Redis: getCache('dashboard:critical-devices')
    │   ├─→ 缓存命中 → 直接返回
    │   └─→ 缓存未命中 → 查 PostgreSQL → 写入 Redis (TTL: 30秒)
    │
    ├─→ /api/analytics/system-metrics
    │   ├─→ 先查 Redis: getCache('analytics:system-metrics')
    │   └─→ 缓存未命中 → 查 PostgreSQL → 写入 Redis (TTL: 30秒)
    │
    └─→ /api/analytics/health
        ├─→ 先查 Redis: getCache('analytics:health')
        └─→ 缓存未命中 → 查 PostgreSQL → 写入 Redis (TTL: 60秒)

┌─────────────────────────────────────────────────────────────────────────┐
│                        前端展示层 (React Components)                      │
└─────────────────────────────────────────────────────────────────────────┘

前端组件
    │
    ├─→ 初始数据加载
    │   └─→ fetch('/api/devices') → PostgreSQL
    │   └─→ fetch('/api/alarms') → PostgreSQL
    │   └─→ fetch('/api/metrics/history') → PostgreSQL
    │
    ├─→ 实时数据更新
    │   └─→ Socket.io Client
    │       ├─→ 监听 'device:${id}' 频道 → 接收 METRICS_UPDATE
    │       ├─→ 监听 'alarms' 频道 → 接收 ALARM_NEW/UPDATE
    │       └─→ 自动更新组件状态（无需重新请求API）
    │
    └─→ 定时刷新（部分组件）
        └─→ setInterval(() => fetch('/api/...'), 30000)
            └─→ 从 PostgreSQL 重新获取最新数据
```

## 🔍 Redis 参与情况详细分析

### ✅ Redis 使用的场景

#### 1. **告警去重服务** (`src/services/alarm/deduplicator.ts`)
```typescript
// 存储去重键，防止短时间内重复告警
redis.setex('alarm:dedupe:${deviceId}:${category}:${severity}', 300, alarmId)
redis.get('alarm:dedupe:${deviceId}:${category}:${severity}')  // 检查是否重复
```
- **用途**: 防止5分钟内产生重复告警
- **TTL**: 300秒（5分钟）
- **数据流**: Collector → Redis → 告警去重判断 → PostgreSQL

#### 2. **实时推送机制** (`src/services/broadcast/index.ts`)
```typescript
// Collector 发布事件到 Redis
redis.publish('events', JSON.stringify({ room, event, data }))

// Socket.io Server 订阅事件
eventSub.subscribe('events')
eventSub.on('message', (channel, message) => {
    const { room, event, data } = JSON.parse(message)
    io.to(room).emit(event, data)  // 推送到前端
})
```
- **用途**: 实现跨进程实时推送（Collector进程 → API Server进程 → 前端）
- **数据流**: Collector → Redis Pub/Sub → Socket.io → Frontend

#### 3. **Socket.io Redis 适配器** (`src/pages/api/socket/io.ts`)
```typescript
// 用于多实例部署时的消息同步
io.adapter(createAdapter(pubClient, subClient))
```
- **用途**: 多实例部署时，确保所有实例的Socket.io客户端都能收到消息
- **数据流**: 实例A的Socket.io → Redis → 实例B的Socket.io

#### 4. **API 结果缓存** (部分分析API)
```typescript
// 缓存查询结果，减少数据库压力
getCache('analytics:top-devices:${metric}:${limit}')  // 先查缓存
setCache(key, result, 30)  // 缓存30秒
```
- **使用缓存的API**:
  - `/api/analytics/top-devices` (TTL: 30秒)
  - `/api/dashboard/critical-devices` (TTL: 30秒)
  - `/api/analytics/system-metrics` (TTL: 30秒)
  - `/api/analytics/system-trend` (TTL: 60秒)
  - `/api/analytics/health` (TTL: 60秒)
- **数据流**: API请求 → Redis缓存 → 命中返回 / 未命中查PostgreSQL → 写入缓存

### ❌ 不使用 Redis 的场景

#### 1. **基础数据查询API**
- `/api/devices` - 直接从PostgreSQL读取
- `/api/alarms` - 直接从PostgreSQL读取
- `/api/metrics/history` - 直接从PostgreSQL读取
- `/api/devices/[id]` - 直接从PostgreSQL读取

#### 2. **数据采集写入**
- MetricCollector 直接写入 PostgreSQL，**不写入Redis**
- AlarmCollector 直接写入 PostgreSQL，**不写入Redis**
- DeviceCollector 直接写入 PostgreSQL，**不写入Redis**

## 📋 完整数据流总结

### 数据采集流程
```
OpManager API
    ↓
Collector (采集器进程)
    ├─→ PostgreSQL (持久化存储) ✅ 主要存储
    ├─→ Redis (告警去重标记) ✅ 临时标记
    └─→ Redis Pub/Sub (实时推送) ✅ 消息队列
```

### 数据展示流程
```
Frontend Request
    ↓
Next.js API Route
    ├─→ Redis Cache (部分分析API) ✅ 可选缓存
    └─→ PostgreSQL (主要数据源) ✅ 主要查询
        ↓
Frontend Display
```

### 实时更新流程
```
Collector 采集到新数据
    ↓
PostgreSQL (持久化)
    ↓
Broadcaster.emit()
    ↓
Redis Pub/Sub ('events' 频道)
    ↓
Socket.io Server (订阅 'events')
    ↓
Socket.io Client (前端)
    ↓
React Component 自动更新
```

## 🎯 关键发现

1. **PostgreSQL 是主要数据存储**
   - 所有采集的数据都写入 PostgreSQL
   - 大部分API直接从PostgreSQL读取
   - Redis **不存储**采集的原始数据

2. **Redis 的4个用途**
   - ✅ 告警去重（临时标记，TTL: 300秒）
   - ✅ 实时推送（Pub/Sub消息队列）
   - ✅ Socket.io适配器（多实例同步）
   - ✅ API结果缓存（部分分析API，TTL: 30-60秒）

3. **数据流特点**
   - 采集：OpManager → Collector → **PostgreSQL** + Redis（去重/推送）
   - 展示：**PostgreSQL** → API → Frontend
   - 实时：Collector → **Redis Pub/Sub** → Socket.io → Frontend
   - 缓存：部分API使用 **Redis缓存** 查询结果

4. **前端数据获取方式**
   - 初始加载：HTTP API → PostgreSQL
   - 实时更新：Socket.io → Redis Pub/Sub → Collector推送
   - 定时刷新：HTTP API → PostgreSQL（部分组件）

## 🔧 优化建议

1. **考虑为常用API添加Redis缓存**
   - `/api/devices` 可以缓存30秒
   - `/api/alarms` 可以缓存10秒（告警需要及时性）

2. **考虑在采集时缓存最新指标**
   - MetricCollector 可以同时写入 Redis（最新指标）
   - 前端查询时先查Redis，未命中再查PostgreSQL

3. **监控Redis使用情况**
   - 告警去重键的TTL和数量
   - Pub/Sub消息的吞吐量
   - 缓存命中率
