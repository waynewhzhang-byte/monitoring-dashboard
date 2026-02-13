# OpManager API 使用分析报告

> 生成时间: 2026-01-23
> 项目: Monitoring Dashboard
> 分析范围: 数据采集端 OpManager API 调用

---

## 📊 总览

本项目数据采集端共使用了 **8 个 OpManager REST API** 端点进行数据采集和监控。

---

## 🔍 API 端点详细清单

### 1. 设备列表 API
**方法**: `getDevices()` / `getDevicesPage()`
**端点**: `GET /api/json/v2/device/listDevices`
**用途**: 获取网络设备清单（支持分页）
**调用位置**:
- [src/services/collector/device.ts:39](src/services/collector/device.ts#L39) - DeviceCollector.syncDevices()

**参数支持**:
- `category` - 设备类别筛选
- `type` - 设备类型筛选
- `vendorName` - 厂商名称筛选
- `severity` - 严重性筛选
- `deviceName` - 设备名称筛选
- `page` - 页码（分页）
- `rows` - 每页行数（分页）
- `sortByColumn` - 排序列
- `sortByType` - 排序方式（asc/desc）

**返回数据**:
```typescript
{
  total: number,      // 总记录数
  page: number,       // 当前页码
  records: number,    // 记录数
  rows: [             // 设备数组
    {
      deviceName: string,
      displayName: string,
      ipAddress: string,
      type: string,
      status: string,
      category: string,
      vendorName: string,
      isManaged: boolean,
      availability: number,
      tags: string[]
    }
  ]
}
```

**采集频率**: 手动触发（MANUAL）- 已实施安全锁，防止自动同步覆盖手动修改

---

### 2. 接口列表 API
**方法**: `getInterfaces()`
**端点**: `GET /api/json/device/getInterfaces`
**用途**: 获取指定设备的网络接口信息
**调用位置**:
- [src/services/collector/interface.ts:56](src/services/collector/interface.ts#L56) - InterfaceCollector.syncInterfaces()
- [src/app/api/interfaces/realtime-traffic/route.ts:99](src/app/api/interfaces/realtime-traffic/route.ts#L99) - 实时流量查询
- [src/app/api/interfaces/tagged-traffic/route.ts:159](src/app/api/interfaces/tagged-traffic/route.ts#L159) - 标签流量查询

**参数要求**:
- `name` - **必需** 设备标识符，格式: `{ipAddress}.10000000001`（例如: `1.1.1.45.10000000001`）

**返回数据**:
```typescript
{
  interfaces: [
    {
      name: string,              // 接口名称
      displayName: string,       // 显示名称
      status: string,            // 状态（up/down）
      statusStr: string,         // 状态字符串
      ifIndex: number,           // 接口索引
      ipAddress: string,         // IP地址
      macAddress: string,        // MAC地址
      inTraffic: string,         // 入站流量
      outTraffic: string,        // 出站流量
      inSpeed: string,           // 入站速度
      outSpeed: string,          // 出站速度
      inUtil: string,            // 入站利用率
      outUtil: string,           // 出站利用率
      ifType: string,            // 接口类型
      mtu: number,               // MTU大小
      errors: string,            // 错误数
      pollingStatus: string      // 轮询状态
    }
  ]
}
```

**采集频率**: 手动触发（MANUAL）- 已实施安全锁

---

### 3. 告警列表 API
**方法**: `getAlarms()`
**端点**: `GET /api/json/alarm/listAlarms`
**用途**: 获取活动告警信息
**调用位置**:
- [src/services/collector/alarm.ts:11](src/services/collector/alarm.ts#L11) - AlarmCollector.syncAlarms()

**参数**: 无（获取所有活动告警）

**返回数据**:
```typescript
[
  {
    alarmId: string,           // 告警ID
    deviceName: string,        // 设备名称
    numericSeverity: number,   // 严重性等级（1-5）
    severityString: string,    // 严重性字符串
    message: string,           // 告警消息
    modTime: string,           // 修改时间
    modTimeLong: number,       // 修改时间戳
    category: string,          // 告警类别
    entity: string             // 实体名称
  }
]
```

**严重性映射**:
- `1` → CRITICAL（关键）
- `2` → MAJOR（主要）
- `3` → WARNING（警告）
- `4` → CRITICAL（服务停止，视为关键）
- `5` → INFO（正常/清除）

**采集频率**: 自动（周期性）

---

### 4. 设备摘要 API
**方法**: `getDeviceSummary()`
**端点**: `GET /api/json/device/getDeviceSummary`
**用途**: 获取设备性能指标快照
**调用位置**:
- [src/services/collector/metric.ts:39](src/services/collector/metric.ts#L39) - MetricCollector.collectMetrics()

**参数**:
- `name` - 设备名称（deviceName）

**返回数据**:
```typescript
{
  dials: [                    // 性能指标数组
    {
      displayName: string,    // 指标名称（CPU/Memory/Disk）
      value: string           // 指标值
    }
  ],
  // 或直接字段:
  cpuUtilization: string,     // CPU使用率
  memoryUtilization: string,  // 内存使用率
  responseTime: string,       // 响应时间
  packetLoss: string          // 丢包率
}
```

**采集频率**: 自动（周期性）
**批处理**: 10 个设备/批次，并行处理

---

### 5. 图表数据 API
**方法**: `getGraphData()`
**端点**: `GET /api/json/device/getGraphData`
**用途**: 获取特定设备的图表性能数据
**调用位置**: 定义于 [OpManagerClient](src/services/opmanager/client.ts#L332)，但**暂未在采集器中使用**

**参数**:
- `name` - 设备名称
- `graphName` - 图表名称
- `period` - 时间范围（如 'LastHour'）

**状态**: ⚠️ 已定义但未启用

---

### 6. 仪表板小部件数据 API
**方法**: `getWidgetData()`
**端点**: `GET /api/json/dashboard/getWidgetData`
**用途**: 获取OpManager仪表板小部件数据
**调用位置**: 定义于 [OpManagerClient](src/services/opmanager/client.ts#L350)，但**暂未在采集器中使用**

**参数**:
- `dashboardName` - 仪表板名称
- `widgetID` - 小部件ID
- `period` - 时间范围

**状态**: ⚠️ 已定义但未启用

---

### 7. 业务视图拓扑 API
**方法**: `getBVDetails()`
**端点**: `GET /api/json/businessview/getBVDetails`
**用途**: 获取业务视图拓扑结构（节点和链路）
**调用位置**:
- [src/services/collector/topology.ts:11](src/services/collector/topology.ts#L11) - TopologyCollector.syncBusinessView()

**参数**:
- `bvName` - 业务视图名称

**返回数据**:
```typescript
{
  deviceProperties: [         // 设备节点数组
    {
      objName: string,        // 对象名称
      name: string,           // 设备名称
      label: string,          // 显示标签
      displayName: string,    // 显示名称
      type: string,           // 设备类型
      x: string,              // X坐标
      y: string,              // Y坐标
      iconName: string        // 图标名称
    }
  ],
  linkProperties: [           // 链路连接数组
    {
      source: string,         // 源节点
      dest: string,           // 目标节点
      name: string,           // 链路名称
      objName: string,        // 对象名称（接口标识）
      intfDisplayName: string,// 接口显示名称
      ifName: string,         // 接口名称
      linkType: string        // 链路类型
    }
  ]
}
```

**采集频率**: 手动或周期性（按业务视图名称）

---

### 8. 业务视图设备详情 API
**方法**: `getBusinessDetailsView()`
**端点**: `GET /api/json/businessview/getBusinessDetailsView`
**用途**: 获取业务视图中设备的性能详情
**调用位置**:
- [src/services/collector/topology.ts:15](src/services/collector/topology.ts#L15) - TopologyCollector.syncBusinessView()

**参数**:
- `bvName` - 业务视图名称
- `startPoint` - 起始点（分页，默认 0）
- `viewLength` - 返回数量（分页，默认 50）

**返回数据**:
```typescript
{
  BusinessDetailsView: {
    Details: [
      {
        name: string,             // 设备名称
        CPUUtilization: string,   // CPU使用率
        MemUtilization: string    // 内存使用率
        // ... 其他性能指标
      }
    ]
  }
}
```

**采集频率**: 与拓扑同步时调用

---

## 📈 采集器架构

### 采集器清单

| 采集器 | 使用的 API | 采集频率 | 文件位置 |
|--------|-----------|---------|---------|
| **DeviceCollector** | getDevicesPage() | 手动触发 | [device.ts](src/services/collector/device.ts) |
| **InterfaceCollector** | getInterfaces() | 手动触发 | [interface.ts](src/services/collector/interface.ts) |
| **AlarmCollector** | getAlarms() | 自动（周期性） | [alarm.ts](src/services/collector/alarm.ts) |
| **MetricCollector** | getDeviceSummary() | 自动（周期性） | [metric.ts](src/services/collector/metric.ts) |
| **TopologyCollector** | getBVDetails()<br>getBusinessDetailsView() | 手动或周期性 | [topology.ts](src/services/collector/topology.ts) |

### 数据流架构

```
OpManager API
     ↓
OpManagerClient (client.ts)
     ↓
Collectors (5个采集器)
     ↓
Prisma ORM
     ↓
PostgreSQL Database
     ↓
API Routes (Next.js)
     ↓
React Components
```

---

## 🔐 安全特性

### 1. 手动同步安全锁
**设备和接口采集器**实施了安全锁机制：
```typescript
if (trigger !== 'MANUAL') {
    console.warn('🚫 Sync blocked: Only manual synchronization allowed.');
    return;
}
```
**目的**: 防止自动同步覆盖用户手动修改的数据（如设备标签、接口分类）

### 2. HTTPS 自签名证书支持
```typescript
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // 接受自签名证书
});
```

### 3. API 密钥认证
```typescript
config.headers['apiKey'] = apiKey;
config.params = { ...config.params, apiKey: apiKey };
```

### 4. 超时和错误处理
- 默认超时: 30秒 (可配置: `OPMANAGER_TIMEOUT`)
- 统一错误拦截和日志记录
- 失败时返回空数组/null，不中断流程

---

## 🎯 数据映射策略

### 设备状态映射
```typescript
OpManager Status → Database Status
─────────────────────────────────
"Critical"    → ERROR
"Trouble"     → ERROR
"Attention"   → WARNING
"down"        → OFFLINE
其他          → ONLINE
```

### 设备类型映射
```typescript
OpManager Type → Database DeviceType
──────────────────────────────────
"router"       → ROUTER
"switch"       → SWITCH
"server"       → SERVER
"firewall"     → FIREWALL
"printer"      → PRINTER
"storage"      → STORAGE
其他           → OTHER
```

### 告警严重性映射
```typescript
OpManager Severity → Database AlarmSeverity
───────────────────────────────────────
1 (Critical)       → CRITICAL
2 (Problem)        → MAJOR
3 (Attention)      → WARNING
4 (Service Down)   → CRITICAL
5 (Normal)         → INFO
```

### 接口状态映射
```typescript
OpManager Status → Database InterfaceStatus
─────────────────────────────────────────
"up" / "1"       → UP
"down" / "2"     → DOWN
"dormant"        → DORMANT
"testing"        → TESTING
"unknown" / "0"  → UNKNOWN
```

---

## 📊 性能优化

### 1. 分页策略
**设备采集**: 每页 100 条记录
```typescript
const rowsPerPage = 100;
while (hasMorePages) {
    const pageResult = await opClient.getDevicesPage({
        page: currentPage,
        rows: rowsPerPage
    });
    // ...
}
```

### 2. 批处理
**指标采集**: 10 个设备/批次，并行处理
```typescript
const BATCH_SIZE = 10;
const batches = chunkArray(devices, BATCH_SIZE);
for (const batch of batches) {
    await Promise.all(batch.map(async (device) => {
        // 并行处理批次内设备
    }));
}
```

### 3. 增量同步
**设备同步**: 检查现有记录，保留手动修改
```typescript
const existingDevice = await prisma.device.findUnique({
    where: { opmanagerId: deviceId }
});
// 保留现有 type（如非 OTHER）和 tags
```

### 4. 告警去重
**去重窗口**: 5 分钟
```typescript
const windowMs = 300000; // 5分钟
const key = `${alarm.deviceId}:${alarm.message}:${alarm.severity}`;
```

---

## 🔄 Mock 数据支持

所有 API 均支持 Mock 模式（开发/测试环境）：

```typescript
if (this.useMock) {
    const store = getMockDataStore();
    return store.getDevices(...);
}
```

**启用条件**:
- `USE_MOCK_DATA=true` 或
- `NODE_ENV=development` 且缺少 `OPMANAGER_API_KEY`

---

## 📝 配置参数

### 环境变量

| 变量名 | 用途 | 默认值 |
|-------|------|--------|
| `OPMANAGER_BASE_URL` | OpManager API 基础URL | `http://localhost:8061` |
| `OPMANAGER_API_KEY` | API 认证密钥 | - |
| `OPMANAGER_TIMEOUT` | API 请求超时时间（毫秒） | `30000` |
| `USE_MOCK_DATA` | 启用 Mock 数据 | `false` |

---

## ⚠️ 已知限制

### 1. 接口分页限制
**问题**: `getInterfaces` API 未实现分页，可能遗漏超过返回限制的接口
**影响**: 接口数量 ≥ 100 的设备可能不完整
**缓解**: 已记录警告日志

### 2. 设备匹配策略
**告警同步**: 使用多策略匹配（name → opmanagerId → displayName）
**原因**: OpManager 告警返回的设备名称可能与数据库不一致

### 3. 字段命名不一致
**问题**: OpManager API 返回字段名称不统一（如 `ipaddress` vs `ipAddress`）
**解决**: 客户端层面统一规范化字段名

---

## 🚀 未来优化建议

### 1. 启用未使用的 API
- ✅ `getGraphData()` - 可用于历史趋势分析
- ✅ `getWidgetData()` - 可集成 OpManager 原生仪表板

### 2. 增量告警同步
- 当前: 每次获取所有活动告警
- 建议: 支持基于时间戳的增量查询（如 OpManager 支持）

### 3. WebSocket 实时推送
- 当前: 周期性轮询
- 建议: 如 OpManager 提供 WebSocket，可用于实时告警

### 4. 缓存策略
- 当前: 每次实时查询 API
- 建议: 对频繁查询的数据（如设备列表）引入 Redis 缓存

---

## 🧪 API 验证测试

为确保所有 API 能正常返回业务数据，我们提供了全面的验证测试脚本：

**测试脚本**: [scripts/verify-all-opmanager-apis.ts](scripts/verify-all-opmanager-apis.ts)
**使用指南**: [scripts/VERIFY-OPMANAGER-API-README.md](scripts/VERIFY-OPMANAGER-API-README.md)

### 快速运行测试

```bash
# 推荐: 使用 npm script
npm run verify:opmanager-apis

# 或直接使用 ts-node
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Mock 模式
USE_MOCK_DATA=true npm run verify:opmanager-apis
```

测试脚本将：
- ✅ 逐一测试所有 8 个 API 端点
- ✅ 验证数据格式和完整性
- ✅ 显示详细的请求/响应信息
- ✅ 生成汇总测试报告
- ✅ 提供故障排查建议

---

## 📞 相关文档

- OpManager API 官方文档: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html
- 项目开发规范: [CLAUDE.md](CLAUDE.md)
- 数据库 Schema: [prisma/schema.prisma](prisma/schema.prisma)
- OpManager 客户端实现: [src/services/opmanager/client.ts](src/services/opmanager/client.ts)
- **API 验证测试指南**: [scripts/VERIFY-OPMANAGER-API-README.md](scripts/VERIFY-OPMANAGER-API-README.md)

---

**报告生成时间**: 2026-01-23
**分析者**: Claude Code Agent
**版本**: 1.0.0
