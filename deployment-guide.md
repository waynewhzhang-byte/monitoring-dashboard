# 大屏页面实现 & 部署指南

## 1. 主大屏页面

```typescript
// src/app/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { NetworkTopology } from '@/components/dashboard/NetworkTopology';
import { DevicePanel } from '@/components/dashboard/DevicePanel';
import { AlarmList } from '@/components/dashboard/AlarmList';
import { StatusOverview } from '@/components/dashboard/StatusOverview';
import { TrafficChart } from '@/components/dashboard/TrafficChart';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/devices?limit=6');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-500 text-2xl animate-pulse">系统加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
              智能监控大屏系统
            </h1>
            <p className="text-gray-400 mt-1">Network Monitoring Dashboard</p>
          </div>
          <div className="text-right">
            <div className="text-cyan-500 text-4xl font-bold tabular-nums">
              {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
            </div>
            <div className="text-gray-400 text-sm">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：设备监控 + 告警 */}
        <div className="col-span-3 space-y-6">
          {/* 状态总览 */}
          <StatusOverview />

          {/* 关键设备监控 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-cyan-500">关键设备</h2>
            {devices.slice(0, 3).map((device: any) => (
              <DevicePanel key={device.id} device={device} showChart={false} />
            ))}
          </div>
        </div>

        {/* 中间：网络拓扑 */}
        <div className="col-span-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-4 h-[800px] backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-cyan-500 mb-4">网络拓扑</h2>
            <div className="h-[calc(100%-3rem)]">
              <NetworkTopology editable={false} />
            </div>
          </motion.div>
        </div>

        {/* 右侧：流量监控 + 告警 */}
        <div className="col-span-3 space-y-6">
          {/* 流量图表 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-cyan-500 mb-4">核心流量</h2>
            <TrafficChart interfaceIds={['interface-1', 'interface-2']} />
          </motion.div>

          {/* 实时告警 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur"
          >
            <AlarmList limit={15} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
```

## 2. 状态总览组件

```typescript
// src/components/dashboard/StatusOverview.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SystemStats {
  totalDevices: number;
  onlineDevices: number;
  totalInterfaces: number;
  activeInterfaces: number;
  criticalAlarms: number;
  majorAlarms: number;
  healthScore: number;
}

export function StatusOverview() {
  const [stats, setStats] = useState<SystemStats>({
    totalDevices: 0,
    onlineDevices: 0,
    totalInterfaces: 0,
    activeInterfaces: 0,
    criticalAlarms: 0,
    majorAlarms: 0,
    healthScore: 100,
  });

  const { isConnected, on } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    // 监听统计更新
    on('stats:update', (data) => {
      setStats(data);
    });
  }, [isConnected]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const statCards = [
    {
      label: '网络设备',
      value: stats.onlineDevices,
      total: stats.totalDevices,
      icon: '🖥️',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: '活跃接口',
      value: stats.activeInterfaces,
      total: stats.totalInterfaces,
      icon: '🔌',
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: '严重告警',
      value: stats.criticalAlarms,
      icon: '🚨',
      color: 'from-red-500 to-orange-500',
    },
    {
      label: '重要告警',
      value: stats.majorAlarms,
      icon: '⚠️',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 健康度 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur"
      >
        <div className="text-center">
          <div className="text-gray-400 text-sm mb-2">系统健康度</div>
          <div className={`text-6xl font-bold ${getHealthColor(stats.healthScore)}`}>
            {stats.healthScore}%
          </div>
          <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.healthScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${
                stats.healthScore >= 90
                  ? 'from-green-500 to-emerald-500'
                  : stats.healthScore >= 70
                  ? 'from-yellow-500 to-orange-500'
                  : 'from-red-500 to-orange-500'
              }`}
            />
          </div>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              <div className={`text-2xl font-bold bg-gradient-to-r ${card.color} text-transparent bg-clip-text`}>
                {card.value}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {card.label}
              {card.total && ` (${card.total})`}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

## 3. Package.json

```json
{
  "name": "monitoring-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
    "collector": "ts-node src/services/collector/start.ts",
    "test": "jest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "@socket.io/redis-adapter": "^8.2.1",
    "axios": "^1.6.2",
    "date-fns": "^3.0.0",
    "framer-motion": "^10.16.16",
    "ioredis": "^5.3.2",
    "next": "14.0.4",
    "node-cron": "^3.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-flow": "^11.10.3",
    "recharts": "^2.10.3",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/node-cron": "^3.0.11",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.0.4",
    "postcss": "^8.4.32",
    "prisma": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

## 4. 数据采集服务启动脚本

```typescript
// src/services/collector/start.ts

import { scheduler } from './scheduler';
import { realtimeServer } from '../realtime/socket-server';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  console.log('🚀 Starting Monitoring Dashboard System...');

  // 准备Next.js应用
  await app.prepare();

  // 创建HTTP服务器
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // 初始化WebSocket服务
  realtimeServer.initialize(httpServer);

  // 启动HTTP服务器
  httpServer.listen(port, () => {
    console.log(`✅ Server running at http://${hostname}:${port}`);
  });

  // 启动数据采集调度器
  scheduler.start();
  console.log('✅ Data collector scheduler started');

  // 优雅关闭
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

async function gracefulShutdown() {
  console.log('⏳ Shutting down gracefully...');
  
  scheduler.stop();
  console.log('✅ Scheduler stopped');
  
  // 关闭其他资源...
  
  process.exit(0);
}

// 启动
main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
```

## 5. Docker部署配置

```dockerfile
# Dockerfile

FROM node:20-alpine AS base

# 依赖阶段
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建Next.js
RUN npm run build

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:16-alpine
    container_name: monitoring-postgres
    environment:
      POSTGRES_USER: monitoring
      POSTGRES_PASSWORD: monitoring123
      POSTGRES_DB: monitoring_dashboard
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - monitoring-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U monitoring"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: monitoring-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - monitoring-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 应用服务
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: monitoring-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://monitoring:monitoring123@postgres:5432/monitoring_dashboard
      REDIS_URL: redis://redis:6379
      OPMANAGER_BASE_URL: ${OPMANAGER_BASE_URL}
      OPMANAGER_API_KEY: ${OPMANAGER_API_KEY}
      NEXT_PUBLIC_WS_URL: http://localhost:3000
      NODE_ENV: production
    ports:
      - "3000:3000"
    networks:
      - monitoring-net
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  monitoring-net:
    driver: bridge
```

## 6. 部署指南

### 本地开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd monitoring-dashboard

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入OpManager配置

# 4. 启动数据库（使用Docker）
docker-compose up -d postgres redis

# 5. 初始化数据库
npm run db:push
npm run db:seed

# 6. 启动开发服务器
npm run dev

# 7. 启动数据采集服务（另开终端）
npm run collector
```

### 生产环境部署

```bash
# 使用Docker Compose一键部署
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

### Kubernetes部署

```yaml
# k8s/deployment.yaml

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
        image: monitoring-dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: monitoring-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: monitoring-secrets
              key: redis-url
        - name: OPMANAGER_API_KEY
          valueFrom:
            secretKeyRef:
              name: monitoring-secrets
              key: opmanager-api-key
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
apiVersion: v1
kind: Service
metadata:
  name: monitoring-dashboard
spec:
  selector:
    app: monitoring-dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 7. 监控和日志

```typescript
// src/lib/logger.ts

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

## 8. 性能优化建议

### 数据库优化
- 为常用查询字段添加索引
- 使用时序数据库（TimescaleDB）存储指标
- 定期归档历史数据

### Redis优化
- 使用Redis Stream处理实时数据流
- 合理设置TTL避免内存溢出
- 使用Redis Cluster实现高可用

### 前端优化
- 使用Web Worker处理大量数据计算
- 实现虚拟滚动优化长列表
- Canvas渲染复杂拓扑图
- 图片懒加载和预加载

### 监控优化
- 实现自适应采集频率
- 根据设备重要性分级监控
- 实施告警去重和聚合
- 使用CDN加速静态资源
