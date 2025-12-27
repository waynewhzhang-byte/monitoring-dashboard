# 🚀 监控大屏系统 - 快速开始指南

## 📚 文档导航

您已收到完整的技术方案文档包，共 **8个文档**：

| 文档 | 说明 | 优先级 |
|------|------|--------|
| **README.md** | 项目总览和快速开始 | ⭐⭐⭐ |
| **architecture-design.md** | 系统架构设计和核心模块 | ⭐⭐⭐ |
| **opmanager-official-api-integration.md** | **OpManager官方API集成（最新）** | ⭐⭐⭐ |
| **prisma-schema.prisma** | 数据库模型设计 | ⭐⭐ |
| **project-structure.md** | 项目结构和核心代码 | ⭐⭐ |
| **realtime-and-components.md** | WebSocket和前端组件 | ⭐⭐ |
| **deployment-guide.md** | 大屏页面和部署配置 | ⭐⭐ |
| **implementation-plan.md** | 11周完整实施计划 | ⭐ |

---

## 🎯 5分钟快速理解

### 系统概述

这是一个**企业级网络监控大屏系统**，通过 ManageEngine OpManager REST API 自动采集网络设备和服务器的监控数据，并在大屏上实时展示。

**核心功能：**
- 📊 实时设备监控（CPU、内存、磁盘）
- 🗺️ 可编辑的网络拓扑图
- 📈 接口流量实时图表
- 🚨 多级告警系统
- ⚡ WebSocket实时推送

**技术栈：**
```
前端: Next.js 14 + TypeScript + TailwindCSS + React Flow
后端: Next.js API Routes + Prisma + Redis
数据库: PostgreSQL + Redis
实时: Socket.io + Redis Pub/Sub
```

---

## 📖 阅读顺序建议

### 第一步：理解系统架构（30分钟）

1. **阅读 README.md**
   - 了解项目全貌
   - 查看核心特性
   - 理解技术选型

2. **阅读 architecture-design.md**
   - 理解系统架构图
   - 了解数据流设计
   - 掌握核心模块

3. **阅读 opmanager-official-api-integration.md** ⭐ **重要更新**
   - 基于 **OpManager 官方 REST API 文档** 编写
   - 包含完整的 API 端点说明
   - 提供准确的参数和响应格式
   - 实现了限流处理和自动重试

### 第二步：设置开发环境（1小时）

```bash
# 1. 创建项目
npx create-next-app@latest monitoring-dashboard --typescript --tailwind --app

# 2. 安装依赖
cd monitoring-dashboard
npm install @prisma/client ioredis socket.io socket.io-client
npm install axios zod node-cron date-fns
npm install recharts reactflow zustand framer-motion
npm install -D prisma @types/node-cron

# 3. 配置环境变量
cat > .env.local << EOF
# OpManager配置
OPMANAGER_BASE_URL=https://opmanager.yourdomain.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=10000

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard"

# Redis
REDIS_URL=redis://localhost:6379

# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:3000

# 数据保留
DATA_RETENTION_DAYS=30
EOF

# 4. 启动数据库
docker-compose up -d postgres redis

# 5. 初始化数据库
npx prisma db push
```

### 第三步：实现核心功能（2-3天）

**按照以下顺序实现：**

#### Day 1: OpManager 集成

参考 **opmanager-official-api-integration.md**：

```typescript
// src/services/opmanager/official-client.ts
// 复制文档中的完整实现

// 测试连接
import { getOpManagerClient } from './official-client';

const client = getOpManagerClient();
const health = await client.healthCheck();
console.log('OpManager health:', health);

// 测试获取设备
const devices = await client.listDevices();
console.log('Devices:', devices);
```

#### Day 2: 数据采集服务

参考 **project-structure.md**：

```typescript
// 1. 创建数据采集器
src/services/collector/device-collector.ts

// 2. 创建定时任务
src/services/collector/scheduler.ts

// 3. 启动采集
npm run collector
```

#### Day 3: 实时推送 + 前端组件

参考 **realtime-and-components.md**：

```typescript
// 1. 实现 WebSocket 服务
src/services/realtime/socket-server.ts

// 2. 创建前端组件
src/components/dashboard/DevicePanel.tsx
src/components/dashboard/NetworkTopology.tsx
src/components/dashboard/AlarmList.tsx

// 3. 创建大屏页面
src/app/dashboard/page.tsx
```

---

## 🔧 OpManager 集成重点

### 获取 API Key

1. 登录 OpManager
2. 点击右上角 **齿轮图标** → **Rest API Key**
3. 复制 API Key

### 启用 REST API 访问

⚠️ **重要**：从 OpManager 版本 127131 开始，REST API 默认**禁用**

**启用步骤：**
1. 以管理员身份登录 OpManager
2. 进入 **用户管理**
3. 编辑用户 → 启用 **Rest API Access**

### 核心 API 使用

```typescript
const client = getOpManagerClient();

// 1. 获取设备列表
const devices = await client.listDevices({
  category: 'Server',
  status: 'Up',
});

// 2. 获取设备性能
const summary = await client.getDeviceSummary('server01');
console.log({
  cpu: summary.cpuUtilization,
  memory: summary.memoryUtilization,
  disk: summary.diskUtilization,
});

// 3. 获取告警
const alarms = await client.listAlarms({
  severity: 1, // Critical
  alertType: 'ActiveAlarms',
});

// 4. 确认告警
await client.acknowledgeAlarm(alarm.entity);

// 5. 获取接口列表
const interfaces = await client.listInterfaces('router01');

// 6. 获取接口流量
const traffic = await client.getInterfaceGraphs({
  name: 'eth0',
  graphName: 'Traffic',
  period: 'Last24Hours',
});
```

### 限流处理

不同 API 有不同的限流规则：

| API | 限流 | 超限惩罚 |
|-----|------|---------|
| listAlarms | 100/分钟 | 阻止1分钟 |
| acknowledgeAlarm | 50/分钟 | 阻止1分钟 |
| getPingResponse | 500/分钟 | 阻止1分钟 |

**客户端已实现：**
- ✅ 自动检测 429 错误
- ✅ 智能重试（最多3次）
- ✅ 等待后自动重试

---

## 💡 开发技巧

### 1. 数据库模型使用

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 创建设备
const device = await prisma.device.create({
  data: {
    opmanagerId: 'device-123',
    name: 'server01.example.com',
    type: 'SERVER',
    ipAddress: '192.168.1.100',
    status: 'ONLINE',
  },
});

// 查询设备
const devices = await prisma.device.findMany({
  where: {
    status: 'ONLINE',
    isMonitored: true,
  },
  include: {
    interfaces: true,
    metrics: {
      orderBy: { timestamp: 'desc' },
      take: 1,
    },
  },
});
```

### 2. Redis 缓存使用

```typescript
import { getRedisClient } from '@/lib/redis';

const redis = getRedisClient();

// 缓存设备指标
await redis.setex(
  `metrics:device:${deviceId}`,
  60, // TTL: 60秒
  JSON.stringify(metrics)
);

// 读取缓存
const cached = await redis.get(`metrics:device:${deviceId}`);
if (cached) {
  return JSON.parse(cached);
}
```

### 3. WebSocket 使用

```typescript
// 前端订阅
import { useWebSocket } from '@/hooks/useWebSocket';

const { subscribeToDevices, on } = useWebSocket();

// 订阅设备更新
subscribeToDevices(['device-1', 'device-2']);

// 监听更新
on('metrics:update', (data) => {
  console.log('New metrics:', data);
});
```

---

## 🎨 大屏布局设计

参考您提供的大屏截图，系统实现了以下布局：

```
┌─────────────────────────────────────────────────────────┐
│                  页面标题 + 实时时间                      │
├─────────────┬─────────────────────┬──────────────────────┤
│             │                     │                      │
│  状态总览   │                     │    流量监控          │
│  ┌────────┐ │   网络拓扑图         │    ┌──────────┐     │
│  │健康度  │ │                     │    │ 流量图表 │     │
│  │  95%  │ │   ┌─┐  ┌─┐  ┌─┐     │    └──────────┘     │
│  └────────┘ │   │R├──┤S├──┤S│     │                      │
│             │   └─┘  └─┘  └─┘     │    实时告警          │
│  关键设备   │        │             │    ┌──────────┐     │
│  ┌────────┐ │   ┌───▼───┐         │    │🚨 严重   │     │
│  │CPU 45% │ │   │Server │         │    │⚠️  重要   │     │
│  │MEM 67% │ │   └───────┘         │    │⚡ 次要   │     │
│  └────────┘ │                     │    └──────────┘     │
│             │                     │                      │
└─────────────┴─────────────────────┴──────────────────────┘
```

---

## 📊 性能优化要点

### 1. 数据采集优化

```typescript
// 分级监控策略
const MONITORING_LEVELS = {
  CRITICAL: { interval: 30000, priority: 1 },   // 30秒
  NORMAL: { interval: 60000, priority: 2 },     // 60秒
  LOW: { interval: 300000, priority: 3 },       // 5分钟
};

// 批量采集
async function batchCollect(devices: Device[]) {
  const chunks = chunkArray(devices, 50);
  
  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map(device => collectMetrics(device))
    );
  }
}
```

### 2. 前端性能优化

```typescript
// 虚拟滚动 - 大量告警列表
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={alarms.length}
  itemSize={80}
>
  {AlarmRow}
</FixedSizeList>

// Canvas 渲染 - 复杂拓扑图
// React Flow 默认使用 SVG，大量节点时切换为 Canvas
```

### 3. 实时通信优化

```typescript
// 批量推送
const buffer: any[] = [];
let timer: NodeJS.Timeout;

function queueUpdate(data: any) {
  buffer.push(data);
  
  clearTimeout(timer);
  timer = setTimeout(() => {
    socket.emit('batch:update', buffer);
    buffer.length = 0;
  }, 100); // 100ms 批量
}
```

---

## 🐛 常见问题

### Q1: OpManager API 返回 401 错误？

**A**: 检查以下几点：
1. API Key 是否正确？
2. REST API 访问是否已启用？
3. 是否使用请求头传递 apiKey？

```typescript
headers: {
  'apiKey': 'your-api-key-here'  // ✅ 正确
}

// ❌ 错误（已废弃）
params: {
  apiKey: 'your-api-key-here'
}
```

### Q2: 限流错误 429？

**A**: 客户端已实现自动重试，但如果频繁出现：
1. 检查调用频率是否过高
2. 增加批量操作
3. 调整采集间隔

### Q3: WebSocket 连接失败？

**A**: 检查：
1. Socket.io 服务器是否启动？
2. 防火墙是否开放端口？
3. CORS 配置是否正确？

### Q4: 大屏显示不全？

**A**: 调整分辨率适配：
```css
/* 支持 1920x1080 和 4K */
@media (min-width: 3840px) {
  .dashboard {
    transform: scale(2);
  }
}
```

---

## 🚀 下一步

### 立即开始

1. **阅读核心文档**（1小时）
   - README.md
   - architecture-design.md
   - opmanager-official-api-integration.md

2. **设置环境**（1小时）
   - 安装依赖
   - 配置 OpManager 连接
   - 启动数据库

3. **测试连接**（30分钟）
   - 获取 API Key
   - 测试 API 调用
   - 验证数据采集

4. **开始开发**（2-3天）
   - 实现数据采集
   - 创建前端组件
   - 构建大屏页面

### 获取帮助

如有问题，请查看：
1. **implementation-plan.md** - 详细的11周实施计划
2. **deployment-guide.md** - 部署和运维指南
3. OpManager 官方文档：https://www.manageengine.com/network-monitoring/help/

---

## ✅ 检查清单

开始之前，确保：

- [ ] 已获取 OpManager API Key
- [ ] 已启用 REST API 访问权限
- [ ] 已安装 Node.js 18+
- [ ] 已安装 Docker（用于数据库）
- [ ] 已阅读核心文档
- [ ] 已配置环境变量
- [ ] 已测试 OpManager API 连接

---

**祝您开发顺利！** 🎉

如果遇到问题，请参考各个文档中的详细说明和示例代码。
