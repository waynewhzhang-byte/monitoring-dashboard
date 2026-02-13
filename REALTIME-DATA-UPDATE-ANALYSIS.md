# 实时数据更新机制分析报告

## 📋 概述

本文档分析监控大屏系统的实时数据更新机制，包括当前实现状态、存在的问题和改进建议。

---

## ✅ 当前实现

### 1. 后端数据采集（已实现）

**位置**: `src/services/collector/start.ts`

```typescript
// 采集频率配置
const topologyIntervalSeconds = env.SYNC_TOPOLOGY_INTERVAL;      // 300秒（5分钟）
const metricsIntervalSeconds = env.COLLECT_METRICS_INTERVAL;     // 60秒（1分钟）
const alarmsIntervalSeconds = env.COLLECT_ALARMS_INTERVAL;       // 30秒
const trafficIntervalSeconds = env.COLLECT_METRICS_INTERVAL;     // 60秒
```

**采集流程**:
1. 采集器定时从 OpManager 获取数据
2. 数据写入 PostgreSQL 数据库
3. **关键**: 通过 Broadcaster 发送 Socket.io 事件

### 2. 数据广播机制（已实现）

**位置**: `src/services/broadcast/index.ts` + `src/services/collector/*.ts`

```typescript
// 指标更新广播
await broadcaster.emit(`device:${device.id}`, BroadcastEvent.METRICS_UPDATE, {
    deviceId: device.id,
    metrics: deviceMetrics
});

// 告警广播
await broadcaster.emit('alarms', BroadcastEvent.ALARM_NEW, newAlarm);
await broadcaster.emit(`device:${device.id}`, BroadcastEvent.ALARM_NEW, newAlarm);
```

**广播事件类型**:
- `metrics:update` - 指标更新
- `alarm:new` - 新告警
- `alarm:update` - 告警更新
- `alarm:resolved` - 告警解决
- `device:updated` - 设备更新

### 3. Socket.io 基础设施（已实现）

**服务端**: `src/pages/api/socket/io.ts`
- 使用 Socket.io Server
- Redis Adapter 支持多实例

**客户端**: `src/hooks/useSocket.ts`
```typescript
const socket = useSocket(); // 建立 WebSocket 连接

socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('subscribe:alarms'); // 订阅告警
});
```

---

## ⚠️ 存在的问题

### 1. 前端未完全使用 Socket.io 实时更新

**问题**: 虽然后端有数据广播，但前端大多数组件仍然依赖轮询或手动刷新。

**示例**: `DashboardRenderer` 没有监听 Socket.io 事件

```tsx
// ❌ 当前实现：没有 Socket.io 监听
export function DashboardRenderer() {
    // 只在初始加载时获取数据
    // 没有实时更新机制
}
```

### 2. 数据更新不统一

不同组件使用不同的更新策略：

| 组件 | 更新方式 | 频率 | 问题 |
|------|---------|------|------|
| AlarmList | Socket.io ✅ | 实时 | 较好 |
| OverviewStats | 轮询 ⚠️ | 不定 | 不一致 |
| DeviceList | 手动刷新 ❌ | 用户触发 | 不够实时 |
| TopologyViewer | 初始加载 ❌ | 页面加载 | 静态 |

### 3. 广播事件未被完全利用

**问题**: 后端发送了很多事件，但前端只监听了部分事件。

```typescript
// 后端发送的事件
BroadcastEvent.METRICS_UPDATE    // ❌ 前端未监听
BroadcastEvent.ALARM_NEW          // ✅ 前端监听
BroadcastEvent.ALARM_UPDATE       // ❌ 前端未监听
BroadcastEvent.DEVICE_UPDATE      // ❌ 前端未监听
```

---

## 🎯 推荐改进方案

### 方案 1: 完善 Socket.io 实时更新（推荐）

#### 优点：
- ✅ 真正的实时更新（延迟 < 1秒）
- ✅ 减少服务器压力（不需要轮询）
- ✅ 后端基础设施已完备
- ✅ 数据一致性好

#### 需要做的：

**1. 前端统一使用 Socket.io**

创建一个全局的数据管理 Hook：

```typescript
// src/hooks/useRealtimeData.ts
export function useRealtimeData() {
    const socket = useSocket();
    const [devices, setDevices] = useState([]);
    const [alarms, setAlarms] = useState([]);

    useEffect(() => {
        if (!socket) return;

        // 监听指标更新
        socket.on(BroadcastEvent.METRICS_UPDATE, (data) => {
            // 更新设备数据
            updateDevice(data.deviceId, data.metrics);
        });

        // 监听告警
        socket.on(BroadcastEvent.ALARM_NEW, (alarm) => {
            addAlarm(alarm);
        });

        // 监听拓扑更新
        socket.on('topology:updated', (data) => {
            refreshTopology();
        });

        return () => {
            socket.off(BroadcastEvent.METRICS_UPDATE);
            socket.off(BroadcastEvent.ALARM_NEW);
            socket.off('topology:updated');
        };
    }, [socket]);

    return { devices, alarms };
}
```

**2. 在 DashboardRenderer 中使用**

```typescript
export function DashboardRenderer() {
    const { devices, alarms } = useRealtimeData();

    // 数据自动更新，组件自动重新渲染
    return <div>...</div>;
}
```

**3. 增强广播逻辑**

确保拓扑变化也会广播：

```typescript
// src/services/collector/topology.ts
await broadcaster.emit('topology', 'topology:updated', {
    businessView: viewName,
    timestamp: Date.now()
});
```

---

### 方案 2: 使用轮询 + SWR（次选）

#### 优点：
- ✅ 实现简单
- ✅ 不依赖 WebSocket
- ✅ SWR 提供缓存和重试

#### 缺点：
- ❌ 增加服务器负载
- ❌ 不够实时（延迟 3-5 秒）
- ❌ 浪费带宽

#### 实现方式：

```typescript
// 使用 SWR 自动轮询
import useSWR from 'swr';

export function useDevices() {
    const { data, error } = useSWR(
        '/api/devices',
        fetcher,
        {
            refreshInterval: 5000, // 每5秒刷新一次
            revalidateOnFocus: true
        }
    );

    return { devices: data, loading: !data && !error };
}
```

---

## 📊 性能对比

| 方案 | 实时性 | 服务器压力 | 实现难度 | 用户体验 |
|------|--------|-----------|---------|---------|
| **Socket.io (推荐)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **轮询 + SWR** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **手动刷新** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |

---

## 🚀 快速实现指南

### 立即可用：告警实时更新（已实现）

告警已经实现了实时更新，可以作为参考：

```typescript
// src/components/domain/AlarmList.tsx（示例）
const socket = useSocket();

useEffect(() => {
    if (!socket) return;

    socket.on(BroadcastEvent.ALARM_NEW, (alarm) => {
        setAlarms(prev => [alarm, ...prev]);
    });

    return () => socket.off(BroadcastEvent.ALARM_NEW);
}, [socket]);
```

### 扩展到其他组件

1. **设备列表实时更新**
   ```typescript
   socket.on(BroadcastEvent.METRICS_UPDATE, ({ deviceId, metrics }) => {
       updateDeviceMetrics(deviceId, metrics);
   });
   ```

2. **拓扑图实时更新**
   ```typescript
   socket.on('topology:updated', ({ businessView }) => {
       if (currentView === businessView) {
           refreshTopology();
       }
   });
   ```

3. **统计数据实时更新**
   ```typescript
   socket.on('stats:updated', (stats) => {
       setStats(stats);
   });
   ```

---

## 🔧 配置实时更新频率

### 后端采集频率

在 `.env` 文件中配置：

```bash
# 采集频率（秒）
COLLECT_METRICS_INTERVAL=60      # 指标：60秒一次
COLLECT_ALARMS_INTERVAL=30       # 告警：30秒一次
SYNC_TOPOLOGY_INTERVAL=300       # 拓扑：5分钟一次
```

### 前端更新策略

**推荐配置**:
- Socket.io 事件：立即更新（0延迟）
- 轮询备用：5-10秒一次
- 长时间无数据：自动重连

---

## 📋 实施清单

### 阶段1：完善现有功能
- [ ] 确认所有采集器都在广播事件
- [ ] 添加拓扑更新事件广播
- [ ] 测试 Socket.io 连接稳定性

### 阶段2：前端集成
- [ ] 创建 `useRealtimeData` hook
- [ ] 在主要组件中使用 Socket.io
- [ ] 移除不必要的轮询代码

### 阶段3：优化和测试
- [ ] 添加重连机制
- [ ] 处理离线场景
- [ ] 性能测试（1000+ 设备）
- [ ] 压力测试

---

## 🎯 总结

### 当前状态
- ✅ 后端实时数据采集：完善
- ✅ Socket.io 基础设施：完善
- ⚠️ 前端实时更新：部分实现
- ❌ 统一的实时更新策略：缺失

### 推荐方案
**优先使用 Socket.io 实现真正的实时更新**

好处：
1. 延迟低（< 1秒）
2. 服务器压力小
3. 用户体验好
4. 基础设施已完备，只需前端集成

### 实施优先级
1. **P0**: 设备性能指标实时更新（核心功能）
2. **P1**: 告警实时推送（已实现，优化）
3. **P2**: 拓扑变化实时更新
4. **P3**: 统计数据实时刷新

---

**版本**: 1.0.0
**日期**: 2026-02-05
**维护者**: Monitoring Dashboard Team
