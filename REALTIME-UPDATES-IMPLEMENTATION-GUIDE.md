# 实时数据更新实施指南

## 📋 概述

本文档说明如何在监控大屏系统中实现设备和接口的实时动态更新，包括性能数据、流量数据和状态更新。

**实施日期**: 2026-02-05
**影响范围**: Dashboard、设备列表、拓扑、告警、接口流量

---

## ✅ 已完成的实施

### 1. 实时数据管理 Hook

**文件**: `src/hooks/useRealtimeUpdates.ts`

```typescript
// 使用方式
const { isConnected, lastUpdate } = useRealtimeUpdates();

// isConnected: WebSocket 连接状态
// lastUpdate: 最后更新时间戳（变化时触发重新渲染）
```

**监听的事件**:
- `metrics:update` - 设备性能指标更新（CPU、内存、磁盘）
- `device:updated` - 设备状态更新
- `alarm:new` / `alarm:update` / `alarm:resolved` - 告警事件
- `topology:updated` - 拓扑变化
- `traffic:updated` - 接口流量更新
- `stats:updated` - 统计数据更新

### 2. 数据采集器广播增强

#### 设备指标采集器（已完善）

**文件**: `src/services/collector/metric.ts`
- ✅ 每60秒采集一次设备性能数据
- ✅ 采集后立即广播 `metrics:update` 事件
- ✅ 包含 CPU、内存、磁盘、响应时间等

#### 接口流量采集器（已增强）

**文件**: `src/services/collector/interface-traffic.ts`
- ✅ 每60秒采集一次接口流量
- ✅ 新增广播 `traffic:updated` 事件
- ✅ 包含接口状态、入站/出站流量、利用率

#### 拓扑采集器（已增强）

**文件**: `src/services/collector/topology.ts`
- ✅ 每5分钟同步一次拓扑
- ✅ 新增广播 `topology:updated` 事件
- ✅ 包含节点、边、流量数据

### 3. Dashboard 实时更新

**文件**: `src/components/dashboard-builder/DashboardRenderer.tsx`

**改进**:
- ✅ 集成 `useRealtimeUpdates` hook
- ✅ 显示实时连接状态指示器
- ✅ 通过 `lastUpdate` 触发所有 widgets 重新获取数据
- ✅ Socket.io 断线自动重连

### 4. Widget 数据自动刷新

**文件**: `src/hooks/useWidgetData.ts`

**改进**:
- ✅ 支持 `realtimeKey` 参数触发刷新
- ✅ 保留原有的定时轮询机制（作为备用）
- ✅ 支持 WebSocket 事件监听

### 5. 实时状态指示器

**文件**: `src/components/widgets/RealtimeStatusIndicator.tsx`

**功能**:
- ✅ 显示 WebSocket 连接状态
- ✅ 连接时绿色脉冲动画
- ✅ 断开时灰色静态图标
- ✅ 显示在大屏右上角

---

## 🎯 实时更新流程

### 完整数据流

```
OpManager API
    ↓
采集器 (60秒/30秒/5分钟)
    ↓
写入 PostgreSQL
    ↓
通过 broadcaster 发送 Socket.io 事件
    ↓
Redis Pub/Sub (多实例支持)
    ↓
Socket.io Server
    ↓
WebSocket 连接
    ↓
前端 useRealtimeUpdates Hook
    ↓
更新 lastUpdate 时间戳
    ↓
触发所有 Widgets 重新获取数据
    ↓
Dashboard 自动刷新 🎉
```

### 采集和广播频率

| 数据类型 | 采集频率 | 广播事件 | 延迟 |
|---------|---------|---------|------|
| 设备指标 | 60秒 | `metrics:update` | < 1秒 |
| 接口流量 | 60秒 | `traffic:updated` | < 1秒 |
| 告警 | 30秒 | `alarm:new` | < 1秒 |
| 拓扑 | 300秒 | `topology:updated` | < 1秒 |

---

## 🚀 使用指南

### 1. 启动服务

```bash
# 1. 启动 Web 服务
pm2 start ecosystem.config.js --only monitoring-web

# 2. 启动数据采集器（重要！）
pm2 start ecosystem.config.js --only monitoring-collector

# 3. 查看状态
pm2 status

# 4. 查看日志
pm2 logs
```

### 2. 验证实时更新

#### 前端验证

1. 打开浏览器访问大屏: `http://localhost:3000/dashboards/[id]`
2. 查看右上角状态指示器：
   - ✅ 绿色脉冲 + "实时更新" = 连接成功
   - ❌ 灰色静态 + "连接中..." = 未连接

3. 打开浏览器控制台 (F12)，应该看到：
   ```
   🔌 Setting up realtime updates...
   ✅ Socket connected - realtime updates active
   ```

4. 当有数据更新时，控制台会显示：
   ```
   📊 Metrics update received: {...}
   📈 Traffic updated: {...}
   🗺️ Topology updated: {...}
   ```

#### 后端验证

查看采集器日志：

```bash
# 查看采集器日志
pm2 logs monitoring-collector --lines 50

# 应该看到类似输出：
# 📊 Starting Metric & Status Collection...
# ✅ Collected metrics for 50/50 devices
# 📡 Starting Interface Traffic & Status Collection...
# ✅ Collected traffic for 20/20 tagged interfaces
```

### 3. 测试实时更新

**方法 1: 等待自动采集**
- 等待 60 秒（指标采集周期）
- Dashboard 应自动更新设备数据

**方法 2: 手动触发采集**
- 访问 Admin 面板
- 点击"同步设备"或"同步接口"按钮
- 观察大屏是否立即更新

**方法 3: 检查 Socket.io 事件**
- 打开浏览器控制台
- 运行: `window.socket = io()`
- 监听事件: `window.socket.on('metrics:update', console.log)`
- 等待事件触发

---

## 🔧 配置和调优

### 调整采集频率

在 `.env` 文件中配置：

```bash
# 设备指标采集间隔（秒）
COLLECT_METRICS_INTERVAL=60      # 推荐: 30-300

# 告警同步间隔（秒）
COLLECT_ALARMS_INTERVAL=30       # 推荐: 15-120

# 拓扑同步间隔（秒）
SYNC_TOPOLOGY_INTERVAL=300       # 推荐: 180-600
```

**重启采集器以应用更改**:
```bash
pm2 restart monitoring-collector --update-env
```

### WebSocket 连接问题

如果实时更新不工作，检查：

1. **防火墙**: 确保 WebSocket 端口未被阻止
   ```bash
   sudo ufw allow 3000/tcp
   ```

2. **Nginx 反向代理**: 如果使用 Nginx，添加 WebSocket 支持
   ```nginx
   location /api/socket/io {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. **Redis 连接**: 确保 Redis 正常运行
   ```bash
   redis-cli ping  # 应返回 PONG
   ```

---

## 📊 性能优化

### 1. 减少服务器压力

**当前配置** (60秒采集):
- 50 设备 = 每分钟 50 次 API 调用
- 20 接口 = 每分钟 4 次 API 调用
- 总计: ~54 次/分钟

**优化建议**:
- 关键设备: 30秒采集
- 普通设备: 60-120秒采集
- 拓扑: 5-10分钟采集

### 2. 只采集关注的数据

**接口流量**:
- 只采集有标签的接口（已实现）
- 不采集未使用的接口

**设备**:
- 只采集 `isMonitored: true` 的设备（已实现）
- 跳过 OFFLINE 和 UNMANAGED 设备（已实现）

### 3. 批量处理

**已实现**:
- 每批处理 5 个设备
- 批次间延迟 1 秒
- 防止 OpManager 超时

---

## 🐛 故障排查

### 问题 1: Dashboard 不自动更新

**排查步骤**:

1. 检查 Socket.io 连接状态
   ```javascript
   // 浏览器控制台
   console.log('Connected:', socket.connected);
   ```

2. 检查采集器是否运行
   ```bash
   pm2 status
   pm2 logs monitoring-collector --lines 20
   ```

3. 检查 Redis 连接
   ```bash
   redis-cli ping
   ```

**解决方案**:
```bash
# 重启所有服务
pm2 restart all

# 清除 Redis 缓存
redis-cli FLUSHALL

# 重新构建项目
npm run build
pm2 restart all
```

### 问题 2: 连接状态一直显示"连接中..."

**可能原因**:
- WebSocket 端口被阻止
- Next.js 服务未正确启动
- CORS 配置问题

**解决方案**:
```bash
# 检查 Next.js 是否监听 0.0.0.0
netstat -tuln | grep 3000

# 应该看到 0.0.0.0:3000 而不是 127.0.0.1:3000

# 如果不是，检查环境变量
cat .env | grep HOSTNAME
# 应该是 HOSTNAME=0.0.0.0

# 重启服务
pm2 restart monitoring-web --update-env
```

### 问题 3: 数据更新延迟很高

**检查延迟**:
```javascript
// 浏览器控制台
const start = Date.now();
socket.emit('ping', () => {
    console.log('Latency:', Date.now() - start, 'ms');
});
```

**正常延迟**: < 100ms
**高延迟**: > 1000ms

**解决方案**:
- 检查网络连接
- 检查 Redis 性能
- 优化采集频率
- 考虑使用本地 Redis

---

## 📈 监控和日志

### 查看实时更新日志

```bash
# 采集器日志（查看数据采集情况）
pm2 logs monitoring-collector --lines 100

# Web 服务日志（查看 Socket.io 连接）
pm2 logs monitoring-web --lines 100

# 实时监控
pm2 monit
```

### 关键日志关键词

- `✅` - 成功操作
- `❌` - 失败操作
- `⚠️` - 警告
- `📊` - 数据采集
- `🔌` - Socket.io 连接
- `📈` - 流量更新
- `🗺️` - 拓扑更新

---

## 🎓 开发指南

### 添加新的实时事件

1. **在采集器中广播事件**:
```typescript
// src/services/collector/your-collector.ts
import { broadcaster } from '@/services/broadcast';

await broadcaster.emit('room-name', 'event-name', {
    // 事件数据
});
```

2. **在 useRealtimeUpdates hook 中监听**:
```typescript
// src/hooks/useRealtimeUpdates.ts
socket.on('event-name', (data) => {
    console.log('New event:', data);
    triggerRefresh();
});
```

3. **清理监听器**:
```typescript
return () => {
    socket.off('event-name');
};
```

### 为特定 Widget 添加实时更新

```typescript
// 在 Widget 组件中
const { lastUpdate } = useRealtimeUpdates();

useEffect(() => {
    // 当 lastUpdate 改变时重新获取数据
    fetchData();
}, [lastUpdate]);
```

---

## 📚 相关文档

- [REALTIME-DATA-UPDATE-ANALYSIS.md](./REALTIME-DATA-UPDATE-ANALYSIS.md) - 实时数据更新分析报告
- [CLAUDE.md](./CLAUDE.md) - 项目开发指南
- [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) - 完整配置指南

---

## ✅ 验收清单

- [ ] 采集器正常运行（pm2 status 显示 online）
- [ ] Web 服务绑定到 0.0.0.0（允许外部访问）
- [ ] Dashboard 显示实时状态指示器
- [ ] 状态指示器显示绿色脉冲（已连接）
- [ ] 浏览器控制台显示 Socket.io 连接成功
- [ ] 等待 60 秒后数据自动更新
- [ ] 设备性能数据实时变化
- [ ] 接口流量数据实时变化
- [ ] 告警能够实时显示
- [ ] 拓扑变化能够实时反映

---

## 🎯 总结

### 实施效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| **数据更新方式** | 手动刷新 | 自动实时更新 |
| **更新延迟** | 需要刷新页面 | < 1秒 |
| **服务器请求** | 用户刷新时 | 后台定时采集 |
| **用户体验** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **实时性** | ❌ | ✅ |

### 核心优势

1. **真正的实时**: WebSocket 推送，延迟 < 1秒
2. **服务器友好**: 不增加 API 压力
3. **用户友好**: 无需手动刷新
4. **可扩展**: 支持多实例部署（Redis Adapter）
5. **易维护**: 统一的实时更新架构

---

**版本**: 1.0.0
**维护者**: Monitoring Dashboard Team
**更新时间**: 2026-02-05
