# OpManager 数据集成指南

## 📋 概述

本文档描述了如何将三个 OpManager API 整合为统一的数据采集接口：

1. **`listDevices` v2** - 获取设备基本信息（种类、类型、状态等）
2. **`getBusinessDetailsView`** - 获取设备性能信息（CPU、内存利用率等）
3. **`listInterfaces`** - 获取设备接口信息和性能

## 🏗️ 架构设计

### 数据流

```
┌─────────────────────────────────────────────────────────┐
│  OpManager API 层                                       │
│  ├── listDevices v2          → 设备基本信息            │
│  ├── getBusinessDetailsView   → 设备性能信息            │
│  └── listInterfaces           → 设备接口信息            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  数据映射层 (data-mapper.ts)                            │
│  ├── mapDeviceRawToInfo()                               │
│  ├── mapBusinessViewDeviceToPerformance()               │
│  └── mapInterfaceRawToInterface()                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  统一数据模型层 (types/opmanager.ts)                    │
│  ├── DeviceInfo          - 设备基本信息                │
│  ├── DevicePerformance   - 设备性能信息                │
│  ├── DeviceInterface     - 设备接口信息                │
│  └── Device              - 完整设备数据                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  数据采集服务层 (data-collector.ts)                     │
│  ├── getDeviceInfo()           - 获取设备基本信息      │
│  ├── getDevicePerformance()    - 获取设备性能信息      │
│  ├── getDeviceInterfacesInfo() - 获取设备接口信息      │
│  └── getCompleteDeviceData()   - 获取完整设备数据      │
└─────────────────────────────────────────────────────────┘
```

## 📊 数据模型

### 1. DeviceInfo - 设备基本信息

```typescript
interface DeviceInfo {
  // 标识信息
  id: string;
  moid: number;
  deviceName: string; // Managed Entity name
  displayName: string;
  ipAddress: string;

  // 分类信息
  category: string; // 设备类别（可能为中文）
  categoryEn: string; // 设备类别（英文，用于API调用）
  type: string; // 设备类型/型号
  vendorName: string; // 厂商名称

  // 状态信息
  status: DeviceStatus;
  statusText: string; // 状态文本（可能为中文）

  // 监控信息
  isSNMP: boolean;
  isSuppressed: boolean;
  isNew: boolean;
  interfaceCount: number;

  // 时间信息
  addedTime: string;
  prettyTime: string;

  // 性能信息（可选）
  performance?: DevicePerformance;
}
```

**数据来源**: `listDevices` v2 API

### 2. DevicePerformance - 设备性能信息

```typescript
interface DevicePerformance {
  cpuUtilization: number; // CPU 利用率（百分比）
  memUtilization: number; // 内存利用率（百分比）
  severity: DeviceStatus; // 严重程度
  statusText: string; // 状态文本（英文）
  lastUpdated?: Date; // 最后更新时间
}
```

**数据来源**: `getBusinessDetailsView` API

### 3. DeviceInterface - 设备接口信息

```typescript
interface DeviceInterface {
  // 标识信息
  id: string;
  interfaceName: string;
  interfaceDisplayName: string;
  deviceName: string; // 所属设备名称
  deviceDisplayName: string; // 所属设备显示名称

  // 类型信息
  type: string; // 接口类型

  // 状态信息
  operStatus: string; // 运行状态
  adminStatus: string; // 管理状态
  status: DeviceStatus;
  statusText: string;

  // 网络信息
  ipAddress: string;
  inSpeed: string; // 入站速度
  outSpeed: string; // 出站速度
  inTraffic: string; // 入站流量
  outTraffic: string; // 出站流量
  inUtilization?: number; // 入站利用率（百分比）
  outUtilization?: number; // 出站利用率（百分比）

  // 其他信息
  isSuppressed: boolean;
}
```

**数据来源**: `listInterfaces` API

### 4. Device - 完整设备数据

```typescript
interface Device {
  // 基本信息
  info: DeviceInfo;

  // 性能信息（可选）
  performance?: DevicePerformance;

  // 接口列表（可选）
  interfaces?: DeviceInterface[];
}
```

## 💻 使用示例

### 示例 1: 获取设备基本信息

```typescript
import { OpManagerDataCollector, DeviceCategory } from '@/services/opmanager';

const collector = new OpManagerDataCollector(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 获取所有服务器设备
const servers = await collector.getDeviceInfo(DeviceCategory.SERVER);

console.log(`服务器总数: ${servers.length}`);
servers.forEach(device => {
  console.log(`${device.displayName}: ${device.statusText}`);
});
```

### 示例 2: 获取设备性能信息

```typescript
// 获取业务视图中所有设备的性能信息
const performances = await collector.getDevicePerformance('出口业务');

performances.forEach((performance, deviceName) => {
  console.log(`${deviceName}:`);
  console.log(`  CPU: ${performance.cpuUtilization}%`);
  console.log(`  内存: ${performance.memUtilization}%`);
});
```

### 示例 3: 获取设备接口信息

```typescript
// 获取指定设备的所有接口
const deviceName = '10.141.69.123.10000000001';
const interfaces = await collector.getDeviceInterfaces(deviceName);

console.log(`设备 ${deviceName} 的接口数: ${interfaces.length}`);
interfaces.forEach(iface => {
  console.log(`${iface.interfaceDisplayName}: ${iface.statusText}`);
  console.log(`  入站: ${iface.inTraffic}, 出站: ${iface.outTraffic}`);
});
```

### 示例 4: 获取完整的设备数据（推荐）

```typescript
// 获取完整的设备数据（基本信息 + 性能信息 + 接口信息）
const devices = await collector.getCompleteDeviceData({
  category: DeviceCategory.SERVER,
  bvName: '出口业务', // 业务视图名称
  includeInterfaces: true,
});

devices.forEach(device => {
  console.log(`设备: ${device.info.displayName}`);
  console.log(`  类别: ${device.info.category}`);
  console.log(`  状态: ${device.info.statusText}`);
  
  if (device.performance) {
    console.log(`  CPU: ${device.performance.cpuUtilization}%`);
    console.log(`  内存: ${device.performance.memUtilization}%`);
  }
  
  if (device.interfaces) {
    console.log(`  接口数: ${device.interfaces.length}`);
  }
});
```

### 示例 5: 获取单个设备的完整数据

```typescript
const deviceName = '10.141.69.123.10000000001';
const device = await collector.getDeviceCompleteData(
  deviceName,
  '出口业务' // 业务视图名称（可选）
);

if (device) {
  console.log(`设备名称: ${device.info.displayName}`);
  console.log(`IP 地址: ${device.info.ipAddress}`);
  console.log(`设备类型: ${device.info.type}`);
  
  if (device.performance) {
    console.log(`CPU 利用率: ${device.performance.cpuUtilization}%`);
    console.log(`内存利用率: ${device.performance.memUtilization}%`);
  }
  
  if (device.interfaces) {
    console.log(`接口数量: ${device.interfaces.length}`);
    device.interfaces.forEach(iface => {
      console.log(`  - ${iface.interfaceDisplayName}: ${iface.statusText}`);
    });
  }
}
```

### 示例 6: 过滤和搜索设备

```typescript
// 获取特定厂商的设备
const microsoftDevices = await collector.getDeviceInfo(DeviceCategory.SERVER, {
  vendorName: 'Microsoft',
});

// 获取有问题的设备
const problemDevices = await collector.getDeviceInfo(DeviceCategory.SERVER, {
  severity: DeviceStatus.TROUBLE,
});

// 获取特定类型的设备
const windowsServers = await collector.getDeviceInfo(DeviceCategory.SERVER, {
  type: 'Windows 2019',
});
```

## 🔄 数据映射说明

### 状态值映射

| OpManager API 值 | 统一模型值 | 说明 |
|-----------------|-----------|------|
| `statusNum: "1"` | `DeviceStatus.CRITICAL` | 严重 |
| `statusNum: "2"` | `DeviceStatus.TROUBLE` | 问题 |
| `statusNum: "3"` | `DeviceStatus.ATTENTION` | 注意 |
| `statusNum: "4"` | `DeviceStatus.SERVICE_DOWN` | 服务中断 |
| `statusNum: "5"` | `DeviceStatus.CLEAR` | 正常 |
| `statusNum: "7"` | `DeviceStatus.UNMANAGED` | 未管理 |

### 设备类别映射

| 中文值 | 英文值（API参数） | 说明 |
|--------|-----------------|------|
| `"服务器"` | `"Server"` | 服务器 |
| `"交换机"` | `"Switch"` | 交换机 |
| `"路由器"` | `"Router"` | 路由器 |
| `"打印机"` | `"Printer"` | 打印机 |
| `"桌面"` | `"Desktop"` | 桌面 |
| `"防火墙"` | `"Firewall"` | 防火墙 |
| `"无线"` | `"Wireless"` | 无线设备 |

## ⚠️ 注意事项

### 1. API 限流

- `listDevices`: 500 请求/分钟
- `getBusinessDetailsView`: 100 请求/分钟
- `listInterfaces`: 500 请求/分钟

**建议**: 实现请求重试和退避策略，避免超过限流。

### 2. 分页处理

所有 API 都支持分页，`getCompleteDeviceData` 方法会自动处理分页。

### 3. 本地化问题

- `category` 和 `statusStr` 字段可能为中文
- 建议使用 `statusNum` 进行状态判断（数值不受本地化影响）
- `categoryEn` 字段提供英文值，用于 API 调用

### 4. 性能优化

- 如果只需要基本信息，使用 `getDeviceInfo()` 而不是 `getCompleteDeviceData()`
- 如果不需要接口信息，设置 `includeInterfaces: false`
- 使用过滤条件减少数据量

### 5. 数据匹配

- 设备匹配使用 `deviceName` 字段（格式: `{IP地址}.{设备ID}`）
- 确保 `deviceName` 格式一致

## 📚 API 参考

### OpManagerDataCollector 类

#### 方法列表

| 方法 | 说明 | 返回类型 |
|------|------|---------|
| `getDeviceInfo()` | 获取设备基本信息 | `Promise<DeviceInfo[]>` |
| `getDevicePerformance()` | 获取设备性能信息 | `Promise<Map<string, DevicePerformance>>` |
| `getDeviceInterfacesInfo()` | 获取设备接口信息 | `Promise<Map<string, DeviceInterface[]>>` |
| `getCompleteDeviceData()` | 获取完整设备数据 | `Promise<Device[]>` |
| `getDeviceCompleteData()` | 获取单个设备的完整数据 | `Promise<Device \| null>` |
| `getDeviceInterfaces()` | 获取指定设备的接口列表 | `Promise<DeviceInterface[]>` |

## 🔍 实际使用场景

### 场景 1: 监控大屏 - 设备总览

```typescript
// 获取所有设备的基本信息和状态
const devices = await collector.getDeviceInfo();

// 统计
const stats = {
  total: devices.length,
  byStatus: {},
  byCategory: {},
};

devices.forEach(device => {
  stats.byStatus[device.status] = (stats.byStatus[device.status] || 0) + 1;
  stats.byCategory[device.category] = (stats.byCategory[device.category] || 0) + 1;
});
```

### 场景 2: 性能监控 - 高负载设备

```typescript
// 获取业务视图中的设备性能
const performances = await collector.getDevicePerformance('出口业务');

// 找出高负载设备
const highLoadDevices: Array<{ deviceName: string; performance: DevicePerformance }> = [];
performances.forEach((performance, deviceName) => {
  if (performance.cpuUtilization > 80 || performance.memUtilization > 80) {
    highLoadDevices.push({ deviceName, performance });
  }
});
```

### 场景 3: 网络监控 - 接口状态

```typescript
// 获取所有接口
const allInterfaces = await collector.getAllInterfaces();

// 统计接口状态
const interfaceStats = {
  total: allInterfaces.length,
  byStatus: {},
  problemInterfaces: allInterfaces.filter(iface => iface.status !== DeviceStatus.CLEAR),
};
```

### 场景 4: 综合监控 - 完整设备视图

```typescript
// 获取完整的设备数据
const devices = await collector.getCompleteDeviceData({
  category: DeviceCategory.SERVER,
  bvName: '出口业务',
  includeInterfaces: true,
});

// 生成综合报告
devices.forEach(device => {
  const report = {
    name: device.info.displayName,
    status: device.info.statusText,
    cpu: device.performance?.cpuUtilization || 0,
    memory: device.performance?.memUtilization || 0,
    interfaceCount: device.interfaces?.length || 0,
    problemInterfaces: device.interfaces?.filter(
      iface => iface.status !== DeviceStatus.CLEAR
    ).length || 0,
  };
  
  console.log(JSON.stringify(report, null, 2));
});
```

## ✅ 总结

通过统一的数据采集接口，您可以：

1. ✅ **获取设备基本信息** - 使用 `getDeviceInfo()`
2. ✅ **获取设备性能信息** - 使用 `getDevicePerformance()`
3. ✅ **获取设备接口信息** - 使用 `getDeviceInterfacesInfo()`
4. ✅ **获取完整设备数据** - 使用 `getCompleteDeviceData()`（推荐）

所有数据都经过统一的数据模型映射，避免了本地化问题和数据格式不一致的问题。
