# OpManager REST API 集成实现（基于官方文档）

## 官方 API 文档要点

根据 OpManager 官方文档，关键信息：

### 1. API 认证
- **API Key 认证**：每个 OpManager 账户都有唯一的 API Key
- **传递方式**：从版本 128100 开始，推荐通过 **请求头** 传递（不再推荐 URL 参数）
- **请求头格式**：`apiKey: your-api-key-here`
- **启用/禁用**：从版本 127131 开始，REST API 访问默认禁用，需要管理员手动启用

### 2. 限流规则
不同 API 有不同的限流规则：
- `listAlarms`: 100 请求/分钟
- `listDevices`: 不同版本有不同限制
- `acknowledgeAlarm/clearAlarm`: 50 请求/分钟
- 超过限流将被阻止 1-5 分钟

### 3. 核心 API 端点

#### 设备管理
```
GET  /api/json/v2/device/listDevices        # 获取设备列表 (v2)
GET  /api/json/device/getDeviceInfo         # 获取设备详情
GET  /api/json/device/getDeviceSummary      # 获取设备摘要
GET  /api/json/device/getGraphData          # 获取图表数据
POST /api/json/device/setManaged            # 管理/取消管理设备
```

#### 告警管理
```
GET  /api/json/alarm/listAlarms             # 获取告警列表
GET  /api/json/alarm/alarmProperties        # 获取告警属性
POST /api/json/alarm/acknowledgeAlarm       # 确认告警
POST /api/json/alarm/clearAlarm             # 清除告警
POST /api/json/alarm/addNotes               # 添加告警备注
```

#### 接口管理
```
GET  /api/json/device/listInterfaces        # 获取接口列表
GET  /api/json/device/getInterfaceSummary   # 获取接口摘要
GET  /api/json/device/getInterfaceGraphs    # 获取接口图表
```

#### 可用性
```
GET  /api/json/device/getAvailabilityGraphData  # 获取可用性数据
POST /api/json/device/getPingResponse           # Ping 测试
GET  /api/json/discovery/getDownDevices         # 获取宕机设备
```

---

## 更新的 OpManager 客户端实现

```typescript
// src/services/opmanager/official-client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

// ==================== 配置Schema ====================

const OpManagerConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  timeout: z.number().default(10000),
});

export type OpManagerConfig = z.infer<typeof OpManagerConfigSchema>;

// ==================== 响应类型定义 ====================

// 设备列表响应
interface DeviceListResponse {
  devices: Array<{
    deviceId: string;
    name: string;
    displayName?: string;
    ipAddress: string;
    type?: string;
    category?: string;
    status?: string;
    availability?: number;
  }>;
  total?: number;
}

// 设备详情响应
interface DeviceInfoResponse {
  deviceId: string;
  name: string;
  displayName: string;
  ipAddress: string;
  macAddress?: string;
  type: string;
  category: string;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  osType?: string;
  osVersion?: string;
  location?: string;
  status: string;
  sysContact?: string;
  sysDescription?: string;
}

// 设备摘要响应
interface DeviceSummaryResponse {
  deviceName: string;
  ipAddress: string;
  availability: number;
  responseTime: number;
  packetLoss: number;
  lastBootTime?: string;
  uptime?: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  diskUtilization?: number;
}

// 告警列表响应
interface AlarmListResponse {
  alarmPresent: boolean;
  total: number;
  records: number;
  rows: Array<{
    alarmId: number;
    entity: string;
    deviceName: string;
    displayName: string;
    message: string;
    severity: string;
    statusStr: string;
    statusNum: number;
    category: string;
    eventtype: string;
    modTime: string;
    modTimeLong: number;
    technician: string;
    isSuppressed: boolean;
  }>;
  severityVsCount: Record<string, number>;
}

// 接口列表响应
interface InterfaceListResponse {
  interfaces: Array<{
    interfaceId: string;
    name: string;
    displayName?: string;
    description?: string;
    ifIndex?: number;
    type?: string;
    status?: string;
    adminStatus?: string;
    speed?: number;
    ipAddress?: string;
    macAddress?: string;
  }>;
}

// ==================== 错误处理 ====================

export class OpManagerAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimited?: boolean
  ) {
    super(message);
    this.name = 'OpManagerAPIError';
  }
}

// ==================== 主客户端类 ====================

export class OpManagerClient {
  private client: AxiosInstance;
  private config: OpManagerConfig;
  private rateLimitRetries = new Map<string, number>();

  constructor(config: OpManagerConfig) {
    this.config = OpManagerConfigSchema.parse(config);
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'apiKey': this.config.apiKey, // 官方推荐：通过请求头传递
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
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
      async (error: AxiosError) => {
        const endpoint = error.config?.url || 'unknown';
        
        // 处理限流错误
        if (error.response?.status === 429) {
          const retries = this.rateLimitRetries.get(endpoint) || 0;
          
          if (retries < 3) {
            this.rateLimitRetries.set(endpoint, retries + 1);
            
            // 等待 1 分钟后重试
            console.warn(`[OpManager] Rate limited on ${endpoint}, retry ${retries + 1}/3`);
            await this.delay(60000);
            
            return this.client.request(error.config!);
          }
          
          throw new OpManagerAPIError(
            `Rate limit exceeded for ${endpoint}`,
            429,
            true
          );
        }
        
        this.rateLimitRetries.delete(endpoint);
        
        throw new OpManagerAPIError(
          error.message || 'OpManager API request failed',
          error.response?.status
        );
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 设备管理 API ====================

  /**
   * 获取设备列表（使用 v2 API）
   * API: GET /api/json/v2/device/listDevices
   * 限流: 视具体版本而定
   */
  async listDevices(params?: {
    category?: string;
    type?: string;
    status?: string;
    location?: string;
  }): Promise<DeviceListResponse> {
    const response = await this.client.get('/api/json/v2/device/listDevices', {
      params,
    });
    return response.data;
  }

  /**
   * 获取设备详细信息
   * API: GET /api/json/device/getDeviceInfo
   */
  async getDeviceInfo(deviceName: string): Promise<DeviceInfoResponse> {
    const response = await this.client.get('/api/json/device/getDeviceInfo', {
      params: { name: deviceName },
    });
    return response.data;
  }

  /**
   * 获取设备摘要（包含性能指标）
   * API: GET /api/json/device/getDeviceSummary
   */
  async getDeviceSummary(deviceName: string): Promise<DeviceSummaryResponse> {
    const response = await this.client.get('/api/json/device/getDeviceSummary', {
      params: { name: deviceName },
    });
    return response.data;
  }

  /**
   * 获取设备图表数据
   * API: GET /api/json/device/getGraphData
   */
  async getGraphData(params: {
    name: string;        // 设备名称
    graphName: string;   // 图表名称
    period?: string;     // 时间段: Last24Hours, LastWeek, LastMonth, etc.
  }) {
    const response = await this.client.get('/api/json/device/getGraphData', {
      params,
    });
    return response.data;
  }

  /**
   * Ping 设备
   * API: POST /api/json/device/getPingResponse
   * 限流: 500 请求/分钟
   */
  async pingDevice(deviceName: string) {
    const response = await this.client.post('/api/json/device/getPingResponse', null, {
      params: { deviceName },
    });
    return response.data;
  }

  /**
   * 获取宕机设备列表
   * API: GET /api/json/discovery/getDownDevices
   * 限流: 100 请求/分钟
   */
  async getDownDevices() {
    const response = await this.client.get('/api/json/discovery/getDownDevices');
    return response.data;
  }

  /**
   * 管理/取消管理设备
   * API: POST /api/json/device/setManaged
   * 限流: 100 请求/分钟
   */
  async setDeviceManaged(deviceName: string, managed: boolean) {
    const response = await this.client.post('/api/json/device/setManaged', null, {
      params: {
        name: deviceName,
        manage: managed,
      },
    });
    return response.data;
  }

  // ==================== 告警管理 API ====================

  /**
   * 获取告警列表
   * API: GET /api/json/alarm/listAlarms
   * 限流: 100 请求/分钟
   */
  async listAlarms(params?: {
    deviceName?: string;
    severity?: 1 | 2 | 3 | 4 | 5;  // 1=Critical, 2=Trouble, 3=Attention, 4=Service Down, 5=Clear
    category?: string;
    alertType?: 'ActiveAlarms' | 'EventLogAlarms' | 'SyslogAlarms' | 'TrapAlarms';
    fromTime?: string;  // Format: yyyy-mm-dd HH:mm:ss
    toTime?: string;
  }): Promise<AlarmListResponse> {
    const response = await this.client.get('/api/json/alarm/listAlarms', {
      params,
    });
    return response.data;
  }

  /**
   * 获取告警属性
   * API: GET /api/json/alarm/alarmProperties
   * 限流: 50 请求/分钟
   */
  async getAlarmProperties(entity: string) {
    const response = await this.client.get('/api/json/alarm/alarmProperties', {
      params: { entity },
    });
    return response.data;
  }

  /**
   * 确认告警
   * API: POST /api/json/alarm/acknowledgeAlarm
   * 限流: 50 请求/分钟
   */
  async acknowledgeAlarm(entity: string | string[]) {
    const entityParam = Array.isArray(entity) ? entity.join(',') : entity;
    
    const response = await this.client.post('/api/json/alarm/acknowledgeAlarm', null, {
      params: { entity: entityParam },
    });
    return response.data;
  }

  /**
   * 取消确认告警
   * API: POST /api/json/alarm/unAcknowledgeAlarm
   * 限流: 50 请求/分钟
   */
  async unacknowledgeAlarm(entity: string | string[]) {
    const entityParam = Array.isArray(entity) ? entity.join(',') : entity;
    
    const response = await this.client.post('/api/json/alarm/unAcknowledgeAlarm', null, {
      params: { entity: entityParam },
    });
    return response.data;
  }

  /**
   * 清除告警
   * API: POST /api/json/alarm/clearAlarm
   * 限流: 50 请求/分钟
   */
  async clearAlarm(entity: string | string[]) {
    const entityParam = Array.isArray(entity) ? entity.join(',') : entity;
    
    const response = await this.client.post('/api/json/alarm/clearAlarm', null, {
      params: { entity: entityParam },
    });
    return response.data;
  }

  /**
   * 删除告警
   * API: POST /api/json/alarm/deleteAlarm
   * 限流: 50 请求/分钟
   */
  async deleteAlarm(entity: string | string[]) {
    const entityParam = Array.isArray(entity) ? entity.join(',') : entity;
    
    const response = await this.client.post('/api/json/alarm/deleteAlarm', null, {
      params: { entity: entityParam },
    });
    return response.data;
  }

  /**
   * 添加告警备注
   * API: POST /api/json/alarm/addNotes
   * 限流: 50 请求/分钟
   */
  async addAlarmNotes(entity: string, notes: string) {
    const response = await this.client.post('/api/json/alarm/addNotes', null, {
      params: { entity, notes },
    });
    return response.data;
  }

  /**
   * 获取告警备注
   * API: GET /api/json/alarm/getAnnotation
   * 限流: 100 请求/分钟
   */
  async getAlarmNotes(entity: string) {
    const response = await this.client.get('/api/json/alarm/getAnnotation', {
      params: { entity },
    });
    return response.data;
  }

  /**
   * 配置告警抑制
   * API: POST /api/json/device/ConfigureSuppressAlarm
   * 限流: 20 请求/分钟
   */
  async suppressAlarm(params: {
    name: string;  // 设备名称
    suppressInterval: number;  // 0=never, -1=forever, 3600000=1小时, -2=自定义
    startTime?: string;  // 格式: yyyy-MM-dd HH:mm
    endTime?: string;
  }) {
    const response = await this.client.post('/api/json/device/ConfigureSuppressAlarm', null, {
      params,
    });
    return response.data;
  }

  // ==================== 接口管理 API ====================

  /**
   * 获取设备接口列表
   * API: GET /api/json/device/listInterfaces
   */
  async listInterfaces(deviceName: string): Promise<InterfaceListResponse> {
    const response = await this.client.get('/api/json/device/listInterfaces', {
      params: { name: deviceName },
    });
    return response.data;
  }

  /**
   * 获取接口摘要
   * API: GET /api/json/device/getInterfaceSummary
   */
  async getInterfaceSummary(interfaceName: string) {
    const response = await this.client.get('/api/json/device/getInterfaceSummary', {
      params: { name: interfaceName },
    });
    return response.data;
  }

  /**
   * 获取接口图表
   * API: GET /api/json/device/getInterfaceGraphs
   */
  async getInterfaceGraphs(params: {
    name: string;        // 接口名称
    graphName?: string;
    period?: string;
  }) {
    const response = await this.client.get('/api/json/device/getInterfaceGraphs', {
      params,
    });
    return response.data;
  }

  /**
   * 管理/取消管理接口
   * API: POST /api/json/device/setManaged
   */
  async setInterfaceManaged(interfaceName: string, managed: boolean) {
    const response = await this.client.post('/api/json/device/setManaged', null, {
      params: {
        name: interfaceName,
        manage: managed,
        type: 'INTERFACE',
        isInterface: true,
      },
    });
    return response.data;
  }

  // ==================== 可用性 API ====================

  /**
   * 获取可用性图表数据
   * API: GET /api/json/device/getAvailabilityGraphData
   * 限流: 100 请求/分钟
   */
  async getAvailabilityGraph(params: {
    name: string;
    isFluidic: boolean;
    instance?: 'Interface' | 'URL' | 'winService' | 'service' | 'process';
    elementID?: number;
  }) {
    const response = await this.client.get('/api/json/device/getAvailabilityGraphData', {
      params: { ...params, isFluidic: true },
    });
    return response.data;
  }

  // ==================== Business Views API ====================

  /**
   * 获取业务视图列表
   * API: GET /api/json/businessview/getBusinessView
   * 限流: 200 请求/分钟
   */
  async listBusinessViews() {
    const response = await this.client.get('/api/json/businessview/getBusinessView');
    return response.data;
  }

  /**
   * 获取业务视图详情
   * API: GET /api/json/businessview/getBusinessDetailsView
   * 限流: 100 请求/分钟
   */
  async getBusinessViewDetails(bvName: string, startPoint: number = 0, viewLength: number = 50) {
    const response = await this.client.get('/api/json/businessview/getBusinessDetailsView', {
      params: { bvName, startPoint, viewLength },
    });
    return response.data;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取设备摘要
   */
  async getBatchDeviceSummary(deviceNames: string[]) {
    const promises = deviceNames.map(name =>
      this.getDeviceSummary(name).catch(err => {
        console.error(`Failed to fetch summary for ${name}:`, err);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter((r): r is PromiseFulfilledResult<DeviceSummaryResponse | null> => 
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value);
  }

  /**
   * 批量确认告警
   */
  async batchAcknowledgeAlarms(entities: string[]) {
    // OpManager API 支持逗号分隔的 entity 列表
    return this.acknowledgeAlarm(entities);
  }

  // ==================== 工具方法 ====================

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // 尝试获取设备列表作为健康检查
      await this.listDevices();
      return { healthy: true, message: 'OpManager API is accessible' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取 API 配置信息
   */
  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      // 不返回 apiKey 保证安全
    };
  }
}

// ==================== 单例导出 ====================

let clientInstance: OpManagerClient | null = null;

export function getOpManagerClient(): OpManagerClient {
  if (!clientInstance) {
    const config: OpManagerConfig = {
      baseUrl: process.env.OPMANAGER_BASE_URL!,
      apiKey: process.env.OPMANAGER_API_KEY!,
      timeout: parseInt(process.env.OPMANAGER_TIMEOUT || '10000'),
    };

    clientInstance = new OpManagerClient(config);
  }

  return clientInstance;
}

// ==================== 类型导出 ====================

export type {
  DeviceListResponse,
  DeviceInfoResponse,
  DeviceSummaryResponse,
  AlarmListResponse,
  InterfaceListResponse,
};
```

---

## 使用示例

```typescript
// src/services/collector/opmanager-collector.ts

import { getOpManagerClient } from './official-client';

const client = getOpManagerClient();

// 示例 1: 获取所有设备
const devices = await client.listDevices({
  category: 'Server',
  status: 'Up',
});

// 示例 2: 获取设备性能指标
const summary = await client.getDeviceSummary('server01.example.com');
console.log({
  cpu: summary.cpuUtilization,
  memory: summary.memoryUtilization,
  disk: summary.diskUtilization,
});

// 示例 3: 获取告警
const alarms = await client.listAlarms({
  severity: 1, // Critical
  alertType: 'ActiveAlarms',
});

// 示例 4: 批量确认告警
const entities = alarms.rows.map(alarm => alarm.entity);
await client.batchAcknowledgeAlarms(entities);

// 示例 5: 获取接口列表和流量
const interfaces = await client.listInterfaces('router01.example.com');
for (const iface of interfaces.interfaces) {
  const graphs = await client.getInterfaceGraphs({
    name: iface.name,
    graphName: 'Traffic',
    period: 'Last24Hours',
  });
  console.log(`Interface ${iface.name} traffic:`, graphs);
}

// 示例 6: 获取可用性数据
const availability = await client.getAvailabilityGraph({
  name: 'server01.example.com',
  isFluidic: true,
});
console.log('Uptime data:', availability.uptimeData);
```

---

## 关键改进

### 1. 认证方式
✅ 使用请求头传递 `apiKey`（官方推荐）
✅ 移除 URL 参数方式（已废弃）

### 2. 限流处理
✅ 自动检测 429 错误
✅ 智能重试（最多 3 次）
✅ 等待 1 分钟后重试

### 3. 完整的 API 覆盖
✅ 设备管理（v2 API）
✅ 告警管理（确认、清除、备注）
✅ 接口管理
✅ 可用性监控
✅ Business Views

### 4. 批量操作优化
✅ 支持批量确认告警
✅ 批量获取设备摘要
✅ 并发控制和错误处理

### 5. 类型安全
✅ 完整的 TypeScript 类型定义
✅ Zod 配置验证
✅ 响应数据类型

---

## 环境变量配置

```bash
# .env.local

# OpManager 配置
OPMANAGER_BASE_URL=https://opmanager.yourdomain.com
OPMANAGER_API_KEY=your-api-key-from-opmanager
OPMANAGER_TIMEOUT=10000
```

---

## 注意事项

1. **API Key 获取**：
   - 登录 OpManager
   - 点击右上角齿轮图标 > Rest API Key
   - 复制 API Key

2. **启用 REST API**：
   - 从版本 127131 开始，REST API 默认禁用
   - 管理员需要在用户管理中为用户启用 REST API 访问权限

3. **限流规则**：
   - 不同 API 有不同的限流规则
   - 超过限流会被阻止 1-5 分钟
   - 客户端已实现自动重试

4. **时间格式**：
   - 使用格式：`yyyy-MM-dd HH:mm:ss`
   - 示例：`2024-12-15 10:30:00`

5. **告警 Entity**：
   - Entity 是告警的唯一标识符
   - 格式通常为：`{deviceId}_{monitorType}`
   - 示例：`37_DiskUtilization`
