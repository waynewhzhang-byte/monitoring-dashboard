# 智能监控大屏系统 - 开发计划任务书

## 📋 文档信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 智能监控大屏系统 |
| **版本** | v1.0.0 |
| **文档版本** | 1.0 |
| **创建日期** | 2024-12-15 |
| **项目经理** | TBD |
| **技术负责人** | TBD |
| **开发周期** | 11周 |

---

## 🎯 项目目标

构建一个基于 Next.js 14 的企业级网络监控大屏系统，实现：
- ✅ 对接 ManageEngine OpManager REST API
- ✅ 实时监控 1000+ 设备
- ✅ WebSocket 实时数据推送
- ✅ 网络拓扑可视化
- ✅ 多级告警管理
- ✅ 高性能大屏展示

---

## 🔧 开发环境配置

### 1. 基础环境要求

| 组件 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | 18.x / 20.x | 运行时环境 |
| npm | 9.x+ | 包管理器 |
| Git | 2.x+ | 版本控制 |
| VS Code | 最新版 | 开发IDE |
| PostgreSQL | 14+ | 数据库 |
| Redis | 7+ | 缓存和消息队列 |
| Docker | 20.x+ | 容器化（可选） |

### 2. 数据库配置

**PostgreSQL 连接信息**
```bash
Host: localhost
Port: 5432
Database: monitoring-dashboard
Username: postgres
Password: zww0625wh
```

**环境变量配置**
```bash
# .env.local
DATABASE_URL="postgresql://postgres:zww0625wh@localhost:5432/monitoring-dashboard?schema=public"
```

### 3. Redis 配置

```bash
# 使用 Docker 快速启动 Redis
docker run -d \
  --name monitoring-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes

# 或使用本地安装的 Redis
redis-server
```

**环境变量配置**
```bash
REDIS_URL=redis://localhost:6379
```

### 4. OpManager 测试环境

```bash
# OpManager 配置（需要客户提供）
OPMANAGER_BASE_URL=https://opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=10000
```

### 5. 完整环境变量文件

创建 `.env.local` 文件：

```bash
# ==================== 数据库配置 ====================
DATABASE_URL="postgresql://postgres:zww0625wh@localhost:5432/monitoring-dashboard?schema=public"

# ==================== Redis 配置 ====================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# ==================== OpManager 配置 ====================
OPMANAGER_BASE_URL=https://opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=10000

# ==================== WebSocket 配置 ====================
NEXT_PUBLIC_WS_URL=http://localhost:3000

# ==================== 应用配置 ====================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PORT=3000

# ==================== 数据采集配置 ====================
# 设备指标采集间隔（秒）
COLLECT_METRICS_INTERVAL=60

# 告警同步间隔（秒）
COLLECT_ALARMS_INTERVAL=30

# 设备列表同步间隔（秒）
SYNC_DEVICES_INTERVAL=600

# ==================== 数据保留策略 ====================
# 历史数据保留天数
DATA_RETENTION_DAYS=30

# ==================== 安全配置 ====================
JWT_SECRET=your-random-secret-key-here-change-in-production
API_RATE_LIMIT=100

# ==================== 日志配置 ====================
LOG_LEVEL=info
```

---

## 📅 开发阶段规划（11周）

### Phase 1: 基础设施搭建 (Week 1) - 2024/12/16 ~ 12/22

#### Task 1.1: 项目初始化 (2天)

**负责人**: 全栈工程师

**任务内容**:
1. 创建 Next.js 项目
2. 配置 TypeScript 和 ESLint
3. 配置 TailwindCSS
4. 安装核心依赖
5. 配置 Git 仓库

**执行步骤**:
```bash
# 1. 创建项目（如果已创建则跳过）
cd D:\monitoring-dashboard

# 2. 初始化项目（如果package.json不存在）
npm init -y

# 3. 安装 Next.js 和核心依赖
npm install next@14.0.4 react@18.2.0 react-dom@18.2.0
npm install -D typescript @types/react @types/node

# 4. 安装 TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 5. 安装其他依赖
npm install @prisma/client ioredis socket.io socket.io-client
npm install axios zod node-cron date-fns
npm install recharts reactflow zustand framer-motion
npm install -D prisma @types/node-cron eslint prettier
```

**配置文件**:

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#06b6d4',
        'bg-dark': '#0a0f1c',
        'card-bg': '#1e293b',
      },
    },
  },
  plugins: [],
}
```

`next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
}

module.exports = nextConfig
```

**验收标准**:
- ✅ `npm run dev` 成功启动
- ✅ TypeScript 编译无错误
- ✅ TailwindCSS 样式生效
- ✅ Git 仓库初始化完成

**预估工时**: 16小时

---

#### Task 1.2: 数据库设计和初始化 (3天)

**负责人**: 后端工程师

**任务内容**:
1. 设计 Prisma Schema
2. 创建数据库迁移
3. 配置 TimescaleDB 扩展
4. 编写种子数据脚本
5. 测试数据库连接

**执行步骤**:

**1. 初始化 Prisma**
```bash
npx prisma init
```

**2. 编写 Prisma Schema**

创建 `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 设备表 ====================
model Device {
  id            String    @id @default(cuid())
  opmanagerId   String    @unique
  name          String
  displayName   String?
  type          DeviceType
  category      String?
  ipAddress     String
  macAddress    String?
  vendor        String?
  model         String?
  serialNumber  String?
  osType        OSType?
  osVersion     String?
  location      String?
  status        DeviceStatus
  availability  Float?
  isMonitored   Boolean   @default(true)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastSyncAt    DateTime?

  // 关系
  interfaces    Interface[]
  metrics       DeviceMetric[]
  alarms        Alarm[]
  topologyNodes TopologyNode[]

  @@index([status])
  @@index([type])
  @@index([isMonitored])
}

enum DeviceType {
  ROUTER
  SWITCH
  FIREWALL
  SERVER
  LOAD_BALANCER
  STORAGE
  PRINTER
  OTHER
}

enum DeviceStatus {
  ONLINE
  OFFLINE
  WARNING
  ERROR
}

enum OSType {
  WINDOWS
  LINUX
  UNIX
  NETWORK_OS
  OTHER
}

// ==================== 设备指标表 ====================
model DeviceMetric {
  id              String    @id @default(cuid())
  deviceId        String

  cpuUsage        Float?
  cpuLoad1m       Float?
  cpuLoad5m       Float?
  cpuLoad15m      Float?

  memoryUsage     Float?
  memoryTotal     BigInt?
  memoryUsed      BigInt?
  memoryFree      BigInt?

  diskUsage       Float?
  diskTotal       BigInt?
  diskUsed        BigInt?
  diskFree        BigInt?

  responseTime    Float?
  packetLoss      Float?
  uptime          BigInt?
  temperature     Float?

  timestamp       DateTime

  // 关系
  device          Device    @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId, timestamp(sort: Desc)])
}

// ==================== 接口表 ====================
model Interface {
  id            String          @id @default(cuid())
  deviceId      String
  opmanagerId   String          @unique
  name          String
  displayName   String?
  description   String?
  type          String
  macAddress    String?
  speed         BigInt?
  mtu           Int?
  ipAddress     String?
  subnetMask    String?
  status        InterfaceStatus
  adminStatus   InterfaceStatus?
  ifIndex       Int?
  isMonitored   Boolean         @default(true)

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  lastSyncAt    DateTime?

  // 关系
  device        Device          @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  trafficMetrics TrafficMetric[]
  topologyEdges TopologyEdge[]

  @@index([deviceId])
  @@index([status])
}

enum InterfaceStatus {
  UP
  DOWN
  TESTING
  DORMANT
  UNKNOWN
}

// ==================== 流量指标表 ====================
model TrafficMetric {
  id              String    @id @default(cuid())
  interfaceId     String

  inOctets        BigInt    @default(0)
  outOctets       BigInt    @default(0)
  inPackets       BigInt    @default(0)
  outPackets      BigInt    @default(0)

  inBandwidth     BigInt?
  outBandwidth    BigInt?
  inUtilization   Float?
  outUtilization  Float?

  inErrors        BigInt?
  outErrors       BigInt?
  inDiscards      BigInt?
  outDiscards     BigInt?

  timestamp       DateTime

  // 关系
  interface       Interface @relation(fields: [interfaceId], references: [id], onDelete: Cascade)

  @@index([interfaceId, timestamp(sort: Desc)])
}

// ==================== 告警表 ====================
model Alarm {
  id              String        @id @default(cuid())
  opmanagerId     String?
  deviceId        String
  severity        AlarmSeverity
  category        String
  title           String
  message         String
  status          AlarmStatus

  acknowledgedBy  String?
  acknowledgedAt  DateTime?
  resolvedBy      String?
  resolvedAt      DateTime?
  clearedAt       DateTime?

  occurredAt      DateTime
  occurrenceCount Int           @default(1)
  lastOccurrence  DateTime?
  notes           String?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // 关系
  device          Device        @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId])
  @@index([severity])
  @@index([status])
  @@index([occurredAt(sort: Desc)])
}

enum AlarmSeverity {
  CRITICAL
  MAJOR
  MINOR
  WARNING
  INFO
}

enum AlarmStatus {
  ACTIVE
  ACKNOWLEDGED
  RESOLVED
  CLEARED
}

// ==================== 拓扑节点表 ====================
model TopologyNode {
  id          String    @id @default(cuid())
  deviceId    String?
  label       String
  type        String
  positionX   Float
  positionY   Float
  icon        String?
  metadata    Json?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 关系
  device      Device?   @relation(fields: [deviceId], references: [id], onDelete: SetNull)
  sourceEdges TopologyEdge[] @relation("SourceNode")
  targetEdges TopologyEdge[] @relation("TargetNode")
}

// ==================== 拓扑连接表 ====================
model TopologyEdge {
  id          String    @id @default(cuid())
  sourceId    String
  targetId    String
  label       String?
  type        String?
  interfaceId String?
  metadata    Json?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 关系
  source      TopologyNode @relation("SourceNode", fields: [sourceId], references: [id], onDelete: Cascade)
  target      TopologyNode @relation("TargetNode", fields: [targetId], references: [id], onDelete: Cascade)
  interface   Interface?   @relation(fields: [interfaceId], references: [id], onDelete: SetNull)
}
```

**3. 创建数据库和应用迁移**
```bash
# 推送 schema 到数据库
npx prisma db push

# 生成 Prisma Client
npx prisma generate
```

**4. 配置 TimescaleDB (可选，用于时序优化)**

连接到 PostgreSQL:
```sql
-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 将 DeviceMetric 转换为超表
SELECT create_hypertable('DeviceMetric', 'timestamp', if_not_exists => TRUE);

-- 将 TrafficMetric 转换为超表
SELECT create_hypertable('TrafficMetric', 'timestamp', if_not_exists => TRUE);

-- 设置数据保留策略（30天）
SELECT add_retention_policy('DeviceMetric', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('TrafficMetric', INTERVAL '30 days', if_not_exists => TRUE);

-- 创建连续聚合（5分钟）
CREATE MATERIALIZED VIEW device_metrics_5min
WITH (timescaledb.continuous) AS
SELECT
  "deviceId",
  time_bucket('5 minutes', timestamp) AS bucket,
  AVG("cpuUsage") AS avg_cpu,
  MAX("cpuUsage") AS max_cpu,
  AVG("memoryUsage") AS avg_memory,
  MAX("memoryUsage") AS max_memory,
  AVG("diskUsage") AS avg_disk
FROM "DeviceMetric"
GROUP BY "deviceId", bucket;

-- 设置自动刷新
SELECT add_continuous_aggregate_policy('device_metrics_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes',
  if_not_exists => TRUE);
```

**5. 编写种子数据脚本**

创建 `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建测试设备
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        opmanagerId: 'test-router-01',
        name: 'core-router-01.example.com',
        displayName: '核心路由器 01',
        type: 'ROUTER',
        ipAddress: '192.168.1.1',
        vendor: 'Cisco',
        model: 'ISR 4451',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
    prisma.device.create({
      data: {
        opmanagerId: 'test-switch-01',
        name: 'access-switch-01.example.com',
        displayName: '接入交换机 01',
        type: 'SWITCH',
        ipAddress: '192.168.1.10',
        vendor: 'Cisco',
        model: 'Catalyst 2960',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
    prisma.device.create({
      data: {
        opmanagerId: 'test-server-01',
        name: 'app-server-01.example.com',
        displayName: '应用服务器 01',
        type: 'SERVER',
        ipAddress: '192.168.1.100',
        osType: 'LINUX',
        status: 'ONLINE',
        isMonitored: true,
      },
    }),
  ]);

  console.log(`✅ Created ${devices.length} devices`);

  // 创建测试指标
  for (const device of devices) {
    await prisma.deviceMetric.create({
      data: {
        deviceId: device.id,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        diskUsage: Math.random() * 100,
        timestamp: new Date(),
      },
    });
  }

  console.log('✅ Created device metrics');

  // 创建测试告警
  await prisma.alarm.create({
    data: {
      deviceId: devices[0].id,
      severity: 'WARNING',
      category: 'Performance',
      title: 'CPU 使用率偏高',
      message: 'CPU 使用率达到 75%',
      status: 'ACTIVE',
      occurredAt: new Date(),
    },
  });

  console.log('✅ Created test alarm');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

在 `package.json` 添加脚本:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "scripts": {
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

运行种子数据:
```bash
npm run db:seed
```

**6. 创建 Prisma Client 工具**

创建 `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**验收标准**:
- ✅ 数据库表创建成功
- ✅ Prisma Client 生成成功
- ✅ 种子数据插入成功
- ✅ `npx prisma studio` 可以查看数据

**预估工时**: 24小时

---

#### Task 1.3: Redis 配置和工具类 (1天)

**负责人**: 后端工程师

**任务内容**:
1. 配置 Redis 连接
2. 创建 Redis 工具类
3. 测试缓存功能

**执行步骤**:

创建 `src/lib/redis.ts`:
```typescript
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// 工具方法
export async function getCache<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCache<T>(key: string, value: T, ttl: number = 60): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// 发布订阅
export async function publish(channel: string, message: any): Promise<void> {
  await redis.publish(channel, JSON.stringify(message));
}

export function subscribe(channel: string, handler: (message: any) => void): Redis {
  const subscriber = redis.duplicate();
  subscriber.subscribe(channel);
  subscriber.on('message', (ch, msg) => {
    if (ch === channel) {
      try {
        handler(JSON.parse(msg));
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });
  return subscriber;
}

export function getRedisClient(): Redis {
  return redis;
}
```

**测试脚本** `scripts/test-redis.ts`:
```typescript
import { redis, setCache, getCache } from '../src/lib/redis';

async function testRedis() {
  console.log('🧪 Testing Redis connection...');

  // 测试 PING
  const pong = await redis.ping();
  console.log('✅ PING:', pong);

  // 测试缓存
  await setCache('test:key', { hello: 'world' }, 10);
  const cached = await getCache('test:key');
  console.log('✅ Cache:', cached);

  // 测试 Pub/Sub
  const subscriber = redis.duplicate();
  subscriber.subscribe('test:channel');
  subscriber.on('message', (channel, message) => {
    console.log('✅ Received message:', message);
    subscriber.disconnect();
    redis.disconnect();
  });

  await redis.publish('test:channel', 'Hello Redis!');
}

testRedis().catch(console.error);
```

**验收标准**:
- ✅ Redis 连接成功
- ✅ 缓存读写正常
- ✅ Pub/Sub 功能正常

**预估工时**: 8小时

---

#### Task 1.4: 项目目录结构搭建 (1天)

**负责人**: 全栈工程师

**任务内容**:
1. 创建标准目录结构
2. 配置路径别名
3. 创建基础文件和配置

**目录结构**:
```
monitoring-dashboard/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── devices/
│   │   │   ├── alarms/
│   │   │   ├── topology/
│   │   │   └── stats/
│   │   ├── dashboard/            # 大屏页面
│   │   │   └── page.tsx
│   │   ├── admin/                # 管理后台
│   │   │   ├── devices/
│   │   │   ├── topology/
│   │   │   └── alarms/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/               # React组件
│   │   ├── dashboard/            # 大屏组件
│   │   ├── charts/               # 图表组件
│   │   └── ui/                   # 通用UI组件
│   │
│   ├── services/                 # 业务服务
│   │   ├── opmanager/            # OpManager集成
│   │   ├── collector/            # 数据采集
│   │   ├── realtime/             # 实时推送
│   │   ├── topology/             # 拓扑服务
│   │   └── alarm/                # 告警服务
│   │
│   ├── lib/                      # 工具库
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── validators.ts
│   │
│   ├── types/                    # TypeScript类型
│   │   ├── opmanager.ts
│   │   ├── device.ts
│   │   ├── metric.ts
│   │   ├── topology.ts
│   │   └── alarm.ts
│   │
│   ├── hooks/                    # React Hooks
│   │   ├── useWebSocket.ts
│   │   ├── useDevices.ts
│   │   ├── useMetrics.ts
│   │   └── useAlarms.ts
│   │
│   └── stores/                   # Zustand状态
│       ├── device-store.ts
│       ├── metric-store.ts
│       ├── topology-store.ts
│       └── alarm-store.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── scripts/                      # 脚本工具
│   ├── init-data.ts
│   └── test-opmanager.ts
│
├── public/                       # 静态资源
│   └── icons/
│
├── .env.local                    # 环境变量
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

**创建脚本** `scripts/create-structure.sh`:
```bash
#!/bin/bash

# 创建目录结构
mkdir -p src/app/api/{devices,alarms,topology,stats}
mkdir -p src/app/dashboard
mkdir -p src/app/admin/{devices,topology,alarms}
mkdir -p src/components/{dashboard,charts,ui}
mkdir -p src/services/{opmanager,collector,realtime,topology,alarm}
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p scripts
mkdir -p public/icons

# 创建占位文件
touch src/app/layout.tsx
touch src/app/page.tsx
touch src/app/globals.css
touch src/lib/utils.ts
touch src/lib/constants.ts
touch src/types/index.ts

echo "✅ Directory structure created!"
```

**验收标准**:
- ✅ 目录结构完整
- ✅ 路径别名配置生效
- ✅ 文件导入正常

**预估工时**: 8小时

---

### Phase 2: OpManager 集成 (Week 2) - 2024/12/23 ~ 12/29

#### Task 2.1: OpManager API 客户端开发 (3天)

**负责人**: 后端工程师

**任务内容**:
1. 实现 OpManager API 客户端
2. 实现认证和错误处理
3. 实现限流和重试机制
4. 编写单元测试

**交付文件**:
- `src/services/opmanager/official-client.ts`
- `src/services/opmanager/types.ts`
- `src/services/opmanager/client.test.ts`

**核心代码**: （参考 opmanager-official-api-integration.md）

**验收标准**:
- ✅ 成功连接 OpManager API
- ✅ 所有 API 方法实现完整
- ✅ 错误处理和重试机制正常
- ✅ 单元测试覆盖率 > 80%

**预估工时**: 24小时

---

#### Task 2.2: 数据采集服务开发 (2天)

**负责人**: 后端工程师

**任务内容**:
1. 实现设备采集器
2. 实现指标采集器
3. 实现告警采集器
4. 实现流量采集器

**交付文件**:
- `src/services/collector/device-collector.ts`
- `src/services/collector/metric-collector.ts`
- `src/services/collector/alarm-collector.ts`
- `src/services/collector/traffic-collector.ts`

**验收标准**:
- ✅ 成功采集设备列表
- ✅ 成功采集设备指标
- ✅ 成功采集告警信息
- ✅ 数据正确存储到数据库

**预估工时**: 16小时

---

#### Task 2.3: 定时任务调度器 (2天)

**负责人**: 后端工程师

**任务内容**:
1. 实现调度器框架
2. 配置定时任务
3. 实现任务监控
4. 编写启动脚本

**交付文件**:
- `src/services/collector/scheduler.ts`
- `src/services/collector/start.ts`

**验收标准**:
- ✅ 定时任务正常执行
- ✅ 任务失败自动重试
- ✅ 任务日志完整

**预估工时**: 16小时

---

### Phase 3: 实时通信 (Week 3) - 2024/12/30 ~ 2025/01/05

#### Task 3.1: Socket.io 服务器实现 (2天)

**负责人**: 后端工程师

**交付文件**:
- `src/services/realtime/socket-server.ts`
- `src/services/realtime/redis-pubsub.ts`

**验收标准**:
- ✅ WebSocket 连接正常
- ✅ 房间订阅机制工作
- ✅ Redis Pub/Sub 集成成功

**预估工时**: 16小时

---

#### Task 3.2: 前端 WebSocket Hook (1天)

**负责人**: 前端工程师

**交付文件**:
- `src/hooks/useWebSocket.ts`

**验收标准**:
- ✅ 自动连接和重连
- ✅ 订阅和消息接收正常
- ✅ 错误处理完善

**预估工时**: 8小时

---

#### Task 3.3: 实时数据推送集成测试 (2天)

**负责人**: 全栈工程师

**任务内容**:
1. 端到端测试数据流
2. 性能测试
3. 压力测试

**验收标准**:
- ✅ 数据推送延迟 < 5秒
- ✅ 支持 100+ 并发连接
- ✅ 无内存泄漏

**预估工时**: 16小时

---

### Phase 4: API 层开发 (Week 4) - 2025/01/06 ~ 01/12

#### Task 4.1: 设备管理 API (2天)

**交付文件**:
- `src/app/api/devices/route.ts`
- `src/app/api/devices/[id]/route.ts`
- `src/app/api/devices/[id]/metrics/route.ts`

**预估工时**: 16小时

---

#### Task 4.2: 告警管理 API (1天)

**交付文件**:
- `src/app/api/alarms/route.ts`
- `src/app/api/alarms/[id]/acknowledge/route.ts`
- `src/app/api/alarms/[id]/resolve/route.ts`

**预估工时**: 8小时

---

#### Task 4.3: 拓扑管理 API (1天)

**交付文件**:
- `src/app/api/topology/route.ts`
- `src/app/api/topology/save/route.ts`

**预估工时**: 8小时

---

#### Task 4.4: 统计数据 API (1天)

**交付文件**:
- `src/app/api/stats/route.ts`

**预估工时**: 8小时

---

### Phase 5: 前端组件开发 (Week 5-6) - 2025/01/13 ~ 01/26

#### Task 5.1: UI 组件库 (Week 5, 3天)

**交付文件**:
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Loading.tsx`

**预估工时**: 24小时

---

#### Task 5.2: 图表组件 (Week 5, 2天)

**交付文件**:
- `src/components/charts/LineChart.tsx`
- `src/components/charts/AreaChart.tsx`
- `src/components/charts/GaugeChart.tsx`

**预估工时**: 16小时

---

#### Task 5.3: 业务组件 (Week 6, 5天)

**交付文件**:
- `src/components/dashboard/DevicePanel.tsx`
- `src/components/dashboard/StatusOverview.tsx`
- `src/components/dashboard/AlarmList.tsx`
- `src/components/dashboard/TrafficChart.tsx`
- `src/components/dashboard/NetworkTopology.tsx`

**预估工时**: 40小时

---

### Phase 6-10: 继续开发... (Week 7-11)

（后续阶段任务详细拆分省略，与上述格式类似）

---

## 📊 任务依赖关系图

```mermaid
graph TD
    A[Task 1.1: 项目初始化] --> B[Task 1.2: 数据库设计]
    A --> C[Task 1.3: Redis配置]
    B --> D[Task 1.4: 目录结构]
    C --> D
    D --> E[Task 2.1: OpManager客户端]
    E --> F[Task 2.2: 数据采集服务]
    F --> G[Task 2.3: 定时调度器]
    G --> H[Task 3.1: Socket.io服务器]
    H --> I[Task 3.2: WebSocket Hook]
    I --> J[Task 3.3: 实时推送测试]
    J --> K[Task 4.1: 设备API]
    K --> L[Task 5.1: UI组件]
    L --> M[Task 5.3: 业务组件]
    M --> N[Task 6.1: 大屏页面]
```

---

## 🚀 快速启动指令

### 初始化项目
```bash
# 1. 进入项目目录
cd D:\monitoring-dashboard

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入数据库和OpManager配置

# 4. 初始化数据库
npx prisma db push
npx prisma generate

# 5. 运行种子数据
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

### 启动数据采集服务
```bash
# 新开终端窗口
cd D:\monitoring-dashboard
npm run collector
```

---

## ✅ 验收清单

### Week 1 验收
- [ ] 项目可以启动（`npm run dev`）
- [ ] 数据库连接成功
- [ ] Redis 连接成功
- [ ] 种子数据插入成功
- [ ] Prisma Studio 可以查看数据

### Week 2 验收
- [ ] OpManager API 连接成功
- [ ] 可以获取设备列表
- [ ] 可以获取设备指标
- [ ] 数据采集服务运行正常
- [ ] 数据正确存储到数据库

### Week 3 验收
- [ ] WebSocket 连接成功
- [ ] 前端可以接收实时推送
- [ ] Redis Pub/Sub 工作正常

### Week 4 验收
- [ ] 所有 API 端点可用
- [ ] API 返回数据正确
- [ ] API 文档完整

### Week 5-6 验收
- [ ] 所有组件渲染正常
- [ ] 组件交互功能完整
- [ ] 组件样式符合设计

---

## 🐛 常见问题

### Q1: 数据库连接失败
```bash
# 检查PostgreSQL是否启动
# Windows: 服务管理器查看PostgreSQL服务
# 检查连接字符串是否正确
DATABASE_URL="postgresql://postgres:zww0625wh@localhost:5432/monitoring-dashboard?schema=public"
```

### Q2: Redis 连接失败
```bash
# 检查Redis是否启动
redis-cli ping
# 应该返回 PONG

# 或使用Docker启动
docker run -d --name monitoring-redis -p 6379:6379 redis:7-alpine
```

### Q3: Prisma 迁移失败
```bash
# 清空数据库重新迁移
npx prisma migrate reset
npx prisma db push
```

---

## 📝 代码规范

### Git Commit 规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式化
refactor: 重构
test: 测试相关
chore: 构建工具或辅助工具
```

示例:
```bash
git commit -m "feat: 实现OpManager API客户端"
git commit -m "fix: 修复WebSocket断线重连问题"
```

### 代码审查清单
- [ ] 代码符合ESLint规则
- [ ] 没有TypeScript错误
- [ ] 添加了必要的注释
- [ ] 添加了单元测试
- [ ] 通过了所有测试

---

## 📞 联系方式

| 角色 | 负责内容 | 联系方式 |
|------|---------|---------|
| 项目经理 | 进度管理、资源协调 | TBD |
| 技术负责人 | 技术架构、代码审查 | TBD |
| 后端工程师 | API、数据采集、数据库 | TBD |
| 前端工程师 | 组件、页面、交互 | TBD |
| 测试工程师 | 测试、质量保证 | TBD |

---

**文档状态**: 待执行
**创建日期**: 2024-12-15
**最后更新**: 2024-12-15

---

*本任务书将随项目进展持续更新*
