# 监控大屏项目结构

## 项目目录结构

```
monitoring-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── opmanager/           # OpManager数据采集
│   │   │   │   ├── devices/route.ts
│   │   │   │   ├── metrics/route.ts
│   │   │   │   └── alarms/route.ts
│   │   │   ├── topology/            # 拓扑管理
│   │   │   │   ├── nodes/route.ts
│   │   │   │   ├── connections/route.ts
│   │   │   │   └── layout/route.ts
│   │   │   ├── realtime/            # 实时数据
│   │   │   │   └── websocket/route.ts
│   │   │   └── config/              # 配置管理
│   │   │       └── route.ts
│   │   ├── dashboard/               # 大屏页面
│   │   │   ├── page.tsx            # 主大屏
│   │   │   ├── network/page.tsx    # 网络监控视图
│   │   │   └── server/page.tsx     # 服务器监控视图
│   │   ├── admin/                   # 管理后台
│   │   │   ├── devices/page.tsx
│   │   │   ├── topology/page.tsx   # 拓扑编辑器
│   │   │   └── alarms/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/                   # React组件
│   │   ├── dashboard/               # 大屏组件
│   │   │   ├── NetworkTopology.tsx # 网络拓扑图
│   │   │   ├── DevicePanel.tsx     # 设备面板
│   │   │   ├── MetricsChart.tsx    # 指标图表
│   │   │   ├── AlarmList.tsx       # 告警列表
│   │   │   ├── TrafficChart.tsx    # 流量图表
│   │   │   └── StatusOverview.tsx  # 总览面板
│   │   ├── topology/                # 拓扑编辑器组件
│   │   │   ├── TopologyEditor.tsx
│   │   │   ├── NodeEditor.tsx
│   │   │   └── ConnectionEditor.tsx
│   │   ├── charts/                  # 图表组件
│   │   │   ├── LineChart.tsx
│   │   │   ├── AreaChart.tsx
│   │   │   ├── GaugeChart.tsx
│   │   │   └── HeatmapChart.tsx
│   │   └── ui/                      # 通用UI组件
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── Loading.tsx
│   │
│   ├── services/                     # 业务服务层
│   │   ├── opmanager/               # OpManager集成
│   │   │   ├── client.ts           # API客户端
│   │   │   ├── device-service.ts   # 设备服务
│   │   │   ├── metric-service.ts   # 指标服务
│   │   │   └── alarm-service.ts    # 告警服务
│   │   ├── collector/               # 数据采集服务
│   │   │   ├── device-collector.ts
│   │   │   ├── metric-collector.ts
│   │   │   └── scheduler.ts        # 定时任务
│   │   ├── realtime/                # 实时数据服务
│   │   │   ├── socket-server.ts    # Socket.io服务器
│   │   │   └── redis-pubsub.ts     # Redis发布订阅
│   │   ├── topology/                # 拓扑服务
│   │   │   ├── layout-engine.ts    # 布局引擎
│   │   │   └── topology-service.ts
│   │   └── alarm/                   # 告警服务
│   │       ├── rule-engine.ts      # 规则引擎
│   │       └── notification.ts     # 通知服务
│   │
│   ├── lib/                          # 工具库
│   │   ├── prisma.ts                # Prisma客户端
│   │   ├── redis.ts                 # Redis客户端
│   │   ├── utils.ts                 # 通用工具
│   │   ├── constants.ts             # 常量定义
│   │   └── validators.ts            # 数据验证
│   │
│   ├── types/                        # TypeScript类型定义
│   │   ├── opmanager.ts             # OpManager类型
│   │   ├── device.ts                # 设备类型
│   │   ├── metric.ts                # 指标类型
│   │   ├── topology.ts              # 拓扑类型
│   │   └── alarm.ts                 # 告警类型
│   │
│   ├── hooks/                        # React Hooks
│   │   ├── useWebSocket.ts          # WebSocket钩子
│   │   ├── useDevices.ts            # 设备数据钩子
│   │   ├── useMetrics.ts            # 指标数据钩子
│   │   └── useAlarms.ts             # 告警数据钩子
│   │
│   ├── stores/                       # Zustand状态管理
│   │   ├── device-store.ts
│   │   ├── metric-store.ts
│   │   ├── topology-store.ts
│   │   └── alarm-store.ts
│   │
│   └── styles/                       # 样式文件
│       ├── globals.css
│       └── dashboard.css
│
├── prisma/
│   ├── schema.prisma                # 数据库模型
│   ├── migrations/                  # 数据库迁移
│   └── seed.ts                      # 种子数据
│
├── scripts/                          # 脚本工具
│   ├── init-data.ts                 # 初始化数据
│   └── test-opmanager.ts           # 测试OpManager连接
│
├── public/                           # 静态资源
│   ├── icons/                       # 设备图标
│   └── images/
│
├── .env.local                        # 环境变量
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 核心模块实现

### 1. OpManager API客户端

```typescript
// src/services/opmanager/client.ts

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// OpManager API配置
const OpManagerConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  timeout: z.number().default(10000),
});

export type OpManagerConfig = z.infer<typeof OpManagerConfigSchema>;

export class OpManagerClient {
  private client: AxiosInstance;
  private config: OpManagerConfig;

  constructor(config: OpManagerConfig) {
    this.config = OpManagerConfigSchema.parse(config);
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'authToken': this.config.apiKey, // OpManager使用authToken
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[OpManager] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[OpManager] API Error:', error.message);
        throw new OpManagerAPIError(error.message, error.response?.status);
      }
    );
  }

  // ============ 设备管理 ============
  
  /**
   * 获取所有设备列表
   */
  async getDevices() {
    const response = await this.client.get('/api/json/device/list');
    return response.data;
  }

  /**
   * 获取单个设备详情
   */
  async getDevice(deviceId: string) {
    const response = await this.client.get(`/api/json/device/${deviceId}`);
    return response.data;
  }

  /**
   * 获取设备性能指标
   */
  async getDevicePerformance(deviceId: string, timeRange?: { start: number; end: number }) {
    const params: any = {};
    if (timeRange) {
      params.startTime = timeRange.start;
      params.endTime = timeRange.end;
    }
    
    const response = await this.client.get(
      `/api/json/device/${deviceId}/performance`,
      { params }
    );
    return response.data;
  }

  /**
   * 获取设备可用性
   */
  async getDeviceAvailability(deviceId: string) {
    const response = await this.client.get(`/api/json/device/${deviceId}/availability`);
    return response.data;
  }

  // ============ 接口管理 ============
  
  /**
   * 获取设备所有接口
   */
  async getDeviceInterfaces(deviceId: string) {
    const response = await this.client.get(`/api/json/device/${deviceId}/interfaces`);
    return response.data;
  }

  /**
   * 获取接口流量数据
   */
  async getInterfaceTraffic(interfaceId: string, timeRange?: { start: number; end: number }) {
    const params: any = { interfaceId };
    if (timeRange) {
      params.startTime = timeRange.start;
      params.endTime = timeRange.end;
    }
    
    const response = await this.client.get('/api/json/interface/traffic', { params });
    return response.data;
  }

  /**
   * 批量获取接口实时流量
   */
  async getBatchInterfaceTraffic(interfaceIds: string[]) {
    const response = await this.client.post('/api/json/interface/traffic/batch', {
      interfaceIds,
    });
    return response.data;
  }

  // ============ 告警管理 ============
  
  /**
   * 获取告警列表
   */
  async getAlarms(params?: {
    severity?: string;
    deviceId?: string;
    status?: string;
    limit?: number;
  }) {
    const response = await this.client.get('/api/json/alarms', { params });
    return response.data;
  }

  /**
   * 获取单个告警详情
   */
  async getAlarm(alarmId: string) {
    const response = await this.client.get(`/api/json/alarms/${alarmId}`);
    return response.data;
  }

  /**
   * 确认告警
   */
  async acknowledgeAlarm(alarmId: string, acknowledgedBy: string) {
    const response = await this.client.post(`/api/json/alarms/${alarmId}/acknowledge`, {
      acknowledgedBy,
    });
    return response.data;
  }

  /**
   * 清除告警
   */
  async clearAlarm(alarmId: string) {
    const response = await this.client.post(`/api/json/alarms/${alarmId}/clear`);
    return response.data;
  }

  // ============ 拓扑管理 ============
  
  /**
   * 获取网络拓扑
   */
  async getNetworkTopology() {
    const response = await this.client.get('/api/json/topology');
    return response.data;
  }

  /**
   * 获取设备连接关系
   */
  async getDeviceConnections(deviceId: string) {
    const response = await this.client.get(`/api/json/device/${deviceId}/connections`);
    return response.data;
  }

  // ============ 监控指标 ============
  
  /**
   * 获取CPU使用率
   */
  async getCPUUtilization(deviceId: string, duration: string = '1h') {
    const response = await this.client.get(`/api/json/device/${deviceId}/cpu`, {
      params: { duration },
    });
    return response.data;
  }

  /**
   * 获取内存使用率
   */
  async getMemoryUtilization(deviceId: string, duration: string = '1h') {
    const response = await this.client.get(`/api/json/device/${deviceId}/memory`, {
      params: { duration },
    });
    return response.data;
  }

  /**
   * 获取磁盘使用率
   */
  async getDiskUtilization(deviceId: string) {
    const response = await this.client.get(`/api/json/device/${deviceId}/disk`);
    return response.data;
  }

  // ============ 批量操作 ============
  
  /**
   * 批量获取设备性能
   */
  async getBatchDevicePerformance(deviceIds: string[]) {
    const promises = deviceIds.map(id => 
      this.getDevicePerformance(id).catch(err => {
        console.error(`Failed to fetch performance for device ${id}:`, err);
        return null;
      })
    );
    
    const results = await Promise.allSettled(promises);
    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<any>).value);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/json/health');
      return { healthy: true, response: response.data };
    } catch (error) {
      return { healthy: false, error: (error as Error).message };
    }
  }
}

// 自定义错误类
export class OpManagerAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OpManagerAPIError';
  }
}

// 单例实例
let opManagerClient: OpManagerClient | null = null;

export function getOpManagerClient(): OpManagerClient {
  if (!opManagerClient) {
    const config: OpManagerConfig = {
      baseUrl: process.env.OPMANAGER_BASE_URL!,
      apiKey: process.env.OPMANAGER_API_KEY!,
      timeout: parseInt(process.env.OPMANAGER_TIMEOUT || '10000'),
    };
    
    opManagerClient = new OpManagerClient(config);
  }
  
  return opManagerClient;
}
```

### 2. 数据采集服务

```typescript
// src/services/collector/device-collector.ts

import { PrismaClient } from '@prisma/client';
import { getOpManagerClient } from '../opmanager/client';
import { getRedisClient } from '@/lib/redis';
import { DeviceType, DeviceStatus, OSType } from '@prisma/client';

const prisma = new PrismaClient();
const redis = getRedisClient();

export class DeviceCollector {
  private opManager = getOpManagerClient();

  /**
   * 同步所有设备
   */
  async syncDevices() {
    console.log('[Collector] Starting device sync...');
    
    try {
      // 1. 从OpManager获取设备列表
      const opDevices = await this.opManager.getDevices();
      
      if (!opDevices?.devices) {
        console.warn('[Collector] No devices found in OpManager');
        return { synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      // 2. 批量同步设备
      for (const opDevice of opDevices.devices) {
        try {
          await this.syncSingleDevice(opDevice);
          synced++;
        } catch (error) {
          console.error(`[Collector] Failed to sync device ${opDevice.name}:`, error);
          errors++;
        }
      }

      console.log(`[Collector] Device sync completed. Synced: ${synced}, Errors: ${errors}`);
      return { synced, errors };
      
    } catch (error) {
      console.error('[Collector] Device sync failed:', error);
      throw error;
    }
  }

  /**
   * 同步单个设备
   */
  private async syncSingleDevice(opDevice: any) {
    const deviceData = {
      opmanagerId: opDevice.deviceId || opDevice.id,
      name: opDevice.name,
      displayName: opDevice.displayName || opDevice.name,
      type: this.mapDeviceType(opDevice.type || opDevice.category),
      category: opDevice.category,
      ipAddress: opDevice.ipAddress || opDevice.ip,
      macAddress: opDevice.macAddress,
      vendor: opDevice.vendor,
      model: opDevice.model,
      serialNumber: opDevice.serialNumber,
      osType: this.mapOSType(opDevice.osType),
      osVersion: opDevice.osVersion,
      location: opDevice.location,
      status: this.mapDeviceStatus(opDevice.status || opDevice.availability),
      isMonitored: opDevice.isMonitored !== false,
      lastSyncAt: new Date(),
    };

    // Upsert到数据库
    const device = await prisma.device.upsert({
      where: { opmanagerId: deviceData.opmanagerId },
      update: deviceData,
      create: deviceData,
    });

    // 同步接口信息
    await this.syncDeviceInterfaces(device.id, deviceData.opmanagerId);

    return device;
  }

  /**
   * 同步设备接口
   */
  private async syncDeviceInterfaces(deviceId: string, opmanagerId: string) {
    try {
      const opInterfaces = await this.opManager.getDeviceInterfaces(opmanagerId);
      
      if (!opInterfaces?.interfaces) {
        return;
      }

      for (const opInterface of opInterfaces.interfaces) {
        const interfaceData = {
          deviceId,
          opmanagerId: opInterface.id || opInterface.interfaceId,
          name: opInterface.name,
          displayName: opInterface.displayName || opInterface.name,
          description: opInterface.description,
          type: opInterface.type || 'ETHERNET',
          macAddress: opInterface.macAddress,
          speed: opInterface.speed ? BigInt(opInterface.speed) : null,
          mtu: opInterface.mtu,
          ipAddress: opInterface.ipAddress,
          subnetMask: opInterface.subnetMask,
          status: this.mapInterfaceStatus(opInterface.status),
          adminStatus: this.mapInterfaceStatus(opInterface.adminStatus),
          ifIndex: opInterface.ifIndex,
          isMonitored: opInterface.isMonitored !== false,
          lastSyncAt: new Date(),
        };

        await prisma.interface.upsert({
          where: { opmanagerId: interfaceData.opmanagerId },
          update: interfaceData,
          create: interfaceData,
        });
      }
    } catch (error) {
      console.error(`[Collector] Failed to sync interfaces for device ${deviceId}:`, error);
    }
  }

  /**
   * 采集设备指标
   */
  async collectDeviceMetrics(deviceId: string, opmanagerId: string) {
    try {
      const performance = await this.opManager.getDevicePerformance(opmanagerId);
      
      if (!performance) {
        return null;
      }

      const metrics = {
        deviceId,
        cpuUsage: performance.cpu?.usage || performance.cpuUsage,
        cpuLoad1m: performance.cpu?.load1m,
        cpuLoad5m: performance.cpu?.load5m,
        cpuLoad15m: performance.cpu?.load15m,
        memoryUsage: performance.memory?.usage || performance.memoryUsage,
        memoryTotal: performance.memory?.total ? BigInt(performance.memory.total) : null,
        memoryUsed: performance.memory?.used ? BigInt(performance.memory.used) : null,
        memoryFree: performance.memory?.free ? BigInt(performance.memory.free) : null,
        diskUsage: performance.disk?.usage || performance.diskUsage,
        diskTotal: performance.disk?.total ? BigInt(performance.disk.total) : null,
        diskUsed: performance.disk?.used ? BigInt(performance.disk.used) : null,
        diskFree: performance.disk?.free ? BigInt(performance.disk.free) : null,
        uptime: performance.uptime ? BigInt(performance.uptime) : null,
        temperature: performance.temperature,
        timestamp: new Date(),
      };

      // 保存到数据库
      const saved = await prisma.deviceMetric.create({ data: metrics });

      // 缓存到Redis（用于实时查询）
      await this.cacheMetricsToRedis(deviceId, metrics);

      return saved;
    } catch (error) {
      console.error(`[Collector] Failed to collect metrics for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * 批量采集所有设备指标
   */
  async collectAllDeviceMetrics() {
    const devices = await prisma.device.findMany({
      where: { isMonitored: true, status: 'ONLINE' },
      select: { id: true, opmanagerId: true, name: true },
    });

    console.log(`[Collector] Collecting metrics for ${devices.length} devices...`);

    const results = await Promise.allSettled(
      devices.map(device => 
        this.collectDeviceMetrics(device.id, device.opmanagerId)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Collector] Metrics collection completed. Success: ${successful}/${devices.length}`);

    return { total: devices.length, successful };
  }

  /**
   * 采集接口流量
   */
  async collectInterfaceTraffic(interfaceId: string, opmanagerId: string) {
    try {
      const traffic = await this.opManager.getInterfaceTraffic(opmanagerId);
      
      if (!traffic) {
        return null;
      }

      const metrics = {
        interfaceId,
        inOctets: BigInt(traffic.inOctets || 0),
        outOctets: BigInt(traffic.outOctets || 0),
        inPackets: BigInt(traffic.inPackets || 0),
        outPackets: BigInt(traffic.outPackets || 0),
        inBandwidth: traffic.inBandwidth ? BigInt(traffic.inBandwidth) : null,
        outBandwidth: traffic.outBandwidth ? BigInt(traffic.outBandwidth) : null,
        inUtilization: traffic.inUtilization,
        outUtilization: traffic.outUtilization,
        inErrors: traffic.inErrors ? BigInt(traffic.inErrors) : null,
        outErrors: traffic.outErrors ? BigInt(traffic.outErrors) : null,
        timestamp: new Date(),
      };

      // 保存到数据库
      const saved = await prisma.trafficMetric.create({ data: metrics });

      // 缓存到Redis
      await this.cacheTrafficToRedis(interfaceId, metrics);

      return saved;
    } catch (error) {
      console.error(`[Collector] Failed to collect traffic for interface ${interfaceId}:`, error);
      return null;
    }
  }

  /**
   * 缓存指标到Redis
   */
  private async cacheMetricsToRedis(deviceId: string, metrics: any) {
    const key = `metrics:device:${deviceId}`;
    await redis.setex(key, 60, JSON.stringify(metrics)); // TTL: 60秒
  }

  /**
   * 缓存流量到Redis
   */
  private async cacheTrafficToRedis(interfaceId: string, metrics: any) {
    const key = `metrics:interface:${interfaceId}`;
    await redis.setex(key, 60, JSON.stringify(metrics));
  }

  // ============ 辅助方法 ============

  private mapDeviceType(type: string): DeviceType {
    const typeMap: Record<string, DeviceType> = {
      'switch': 'SWITCH',
      'router': 'ROUTER',
      'firewall': 'FIREWALL',
      'server': 'SERVER',
      'loadbalancer': 'LOAD_BALANCER',
      'storage': 'STORAGE',
    };
    return typeMap[type?.toLowerCase()] || 'OTHER';
  }

  private mapDeviceStatus(status: string): DeviceStatus {
    const statusMap: Record<string, DeviceStatus> = {
      'up': 'ONLINE',
      'online': 'ONLINE',
      'down': 'OFFLINE',
      'offline': 'OFFLINE',
      'warning': 'WARNING',
      'error': 'ERROR',
      'critical': 'ERROR',
    };
    return statusMap[status?.toLowerCase()] || 'OFFLINE';
  }

  private mapOSType(osType: string): OSType | null {
    if (!osType) return null;
    
    const typeMap: Record<string, OSType> = {
      'windows': 'WINDOWS',
      'linux': 'LINUX',
      'unix': 'UNIX',
      'ios': 'NETWORK_OS',
      'junos': 'NETWORK_OS',
    };
    return typeMap[osType.toLowerCase()] || null;
  }

  private mapInterfaceStatus(status: string): any {
    const statusMap: Record<string, any> = {
      'up': 'UP',
      'down': 'DOWN',
      'testing': 'TESTING',
      'dormant': 'DORMANT',
      'unknown': 'UNKNOWN',
    };
    return statusMap[status?.toLowerCase()] || 'UNKNOWN';
  }
}

// 单例
export const deviceCollector = new DeviceCollector();
```

### 3. 定时任务调度器

```typescript
// src/services/collector/scheduler.ts

import cron from 'node-cron';
import { deviceCollector } from './device-collector';
import { alarmCollector } from './alarm-collector';

export class CollectorScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * 启动所有定时任务
   */
  start() {
    console.log('[Scheduler] Starting collector tasks...');

    // 任务1: 每60秒采集设备指标
    this.addTask('collect-metrics', '*/60 * * * * *', async () => {
      console.log('[Task] Collecting device metrics...');
      await deviceCollector.collectAllDeviceMetrics();
    });

    // 任务2: 每30秒采集告警
    this.addTask('collect-alarms', '*/30 * * * * *', async () => {
      console.log('[Task] Collecting alarms...');
      await alarmCollector.syncAlarms();
    });

    // 任务3: 每10分钟同步设备列表
    this.addTask('sync-devices', '0 */10 * * * *', async () => {
      console.log('[Task] Syncing devices...');
      await deviceCollector.syncDevices();
    });

    // 任务4: 每天凌晨清理历史数据
    this.addTask('cleanup-history', '0 0 2 * * *', async () => {
      console.log('[Task] Cleaning up history data...');
      await this.cleanupHistoryData();
    });

    console.log(`[Scheduler] ${this.tasks.size} tasks started`);
  }

  /**
   * 停止所有任务
   */
  stop() {
    console.log('[Scheduler] Stopping all tasks...');
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`[Scheduler] Stopped task: ${name}`);
    });
    this.tasks.clear();
  }

  /**
   * 添加任务
   */
  private addTask(name: string, schedule: string, handler: () => Promise<void>) {
    const task = cron.schedule(schedule, async () => {
      try {
        await handler();
      } catch (error) {
        console.error(`[Task] Error in ${name}:`, error);
      }
    });

    this.tasks.set(name, task);
    console.log(`[Scheduler] Added task: ${name} (${schedule})`);
  }

  /**
   * 清理历史数据
   */
  private async cleanupHistoryData() {
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 清理设备指标
    // 清理流量指标
    // 清理已关闭的告警
    
    console.log(`[Cleanup] History data older than ${retentionDays} days cleaned`);
  }
}

// 单例
export const scheduler = new CollectorScheduler();
```

继续下一部分：WebSocket实时推送、前端组件、环境变量配置等...
