# 接口流量数据架构说明

## 概述

根据需求，接口流量数据的获取方式分为两种：

1. **拓扑图流量数据**: 从数据库 `TrafficMetric` 表获取（由拓扑同步收集）
2. **其他接口流量显示**: 从 OpManager `listInterfaces` API 实时获取

## 架构设计

### 1. 拓扑图流量数据 (`/api/topology`)

**数据源**: 数据库 `TrafficMetric` 表

**实现位置**: `src/app/api/topology/route.ts`

**数据流**:
```
拓扑同步 → OpManager 业务视图API → 数据库 TrafficMetric 表 → /api/topology → 拓扑图显示
```

**特点**:
- 数据来自拓扑同步过程
- 存储在数据库中，查询速度快
- 用于拓扑图中的边（连线）流量显示

**代码示例**:
```typescript
// src/app/api/topology/route.ts
const edges = await prisma.topologyEdge.findMany({
  include: {
    interface: {
      include: {
        trafficMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }
  }
});

// 使用数据库中的流量数据
const latestMetric = edge.interface?.trafficMetrics[0];
```

### 2. 其他接口流量显示 (`/api/interfaces/tagged-traffic`)

**数据源**: OpManager `listInterfaces` API

**实现位置**: `src/app/api/interfaces/tagged-traffic/route.ts`

**数据流**:
```
UI请求 → /api/interfaces/tagged-traffic → OpManager listInterfaces API → 实时流量数据 → UI显示
```

**特点**:
- 实时从 OpManager API 获取
- 用于仪表板组件（如 `TaggedInterfaceTrafficWidget`）
- 不依赖数据库中的历史数据

**代码示例**:
```typescript
// src/app/api/interfaces/tagged-traffic/route.ts
const opInterfaces = await opClient.getInterfaces({
  deviceName: deviceKey,
  rows: 1000
});

// 解析 OpManager 返回的流量字符串（如 "3.768 K", "1.144 M"）
const parseTraffic = (trafficStr: string): number => {
  // 解析逻辑...
};
```

## API 端点

### `/api/topology`

**用途**: 获取拓扑图数据（节点和边）

**流量数据来源**: 数据库 `TrafficMetric` 表

**参数**:
- `bvName`: 业务视图名称

**返回**:
```json
{
  "nodes": [...],
  "edges": [
    {
      "id": "...",
      "label": "100.5 Mbps",  // 来自数据库 TrafficMetric
      "data": {
        "inTraffic": "100.5 Mbps",
        "utilization": 45.2
      }
    }
  ]
}
```

### `/api/interfaces/tagged-traffic`

**用途**: 获取标签接口的实时流量数据

**流量数据来源**: OpManager `listInterfaces` API

**参数**:
- `tag`: 接口标签

**返回**:
```json
{
  "interfaces": [
    {
      "id": "...",
      "name": "GigabitEthernet1/0/1",
      "inBandwidth": "100.5 M",
      "outBandwidth": "50.2 M",
      "inUtilization": 10.05,
      "outUtilization": 5.02,
      "status": "UP",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## OpManager API 使用

### `listInterfaces` API

**端点**: `/api/json/device/listInterfaces`

**用途**: 获取设备的接口列表和实时流量数据

**参数**:
- `deviceName`: 设备名称（可选，用于过滤）
- `page`: 页码
- `rows`: 每页行数

**返回字段**:
- `inTraffic`: 入站流量（字符串，如 "3.768 K", "1.144 M"）
- `outTraffic`: 出站流量（字符串）
- `inUtil`: 入站利用率（百分比字符串，如 "0.04"）
- `outUtil`: 出站利用率（百分比字符串）
- `statusStr`: 状态字符串（中文或英文）

**流量字符串解析**:
```typescript
// 解析 "3.768 K" → 3768 bps
// 解析 "1.144 M" → 1144000 bps
// 解析 "10 G" → 10000000000 bps
```

## 数据转换

### 流量字符串 → 数字（bps）

```typescript
const parseTraffic = (trafficStr: string): number => {
  if (!trafficStr || trafficStr.trim() === '' || trafficStr === '0') return 0;
  
  const parts = trafficStr.trim().split(/\s+/);
  if (parts.length < 2) return 0;
  
  const value = parseFloat(parts[0]);
  const unit = parts[1].toUpperCase();
  
  let multiplier = 1;
  if (unit === 'K' || unit === 'KB' || unit === 'KBPS') {
    multiplier = 1000;
  } else if (unit === 'M' || unit === 'MB' || unit === 'MBPS') {
    multiplier = 1000 * 1000;
  } else if (unit === 'G' || unit === 'GB' || unit === 'GBPS') {
    multiplier = 1000 * 1000 * 1000;
  }
  
  return value * multiplier;
};
```

### 利用率字符串 → 数字（百分比）

```typescript
const parseUtilization = (utilStr: string): number => {
  if (!utilStr) return 0;
  const value = parseFloat(utilStr);
  return isNaN(value) ? 0 : value;
};
```

## 性能优化

### 1. 按设备分组查询

为了减少 OpManager API 调用次数，接口按设备分组：

```typescript
// 按设备分组
const interfacesByDevice = new Map<string, Interface[]>();
interfaces.forEach(iface => {
  const deviceKey = iface.device.opmanagerId || iface.device.name;
  if (!interfacesByDevice.has(deviceKey)) {
    interfacesByDevice.set(deviceKey, []);
  }
  interfacesByDevice.get(deviceKey)!.push(iface);
});

// 每个设备只调用一次 API
for (const [deviceKey, deviceInterfaces] of interfacesByDevice.entries()) {
  const opInterfaces = await opClient.getInterfaces({ deviceName: deviceKey });
  // 匹配接口...
}
```

### 2. 接口匹配

使用接口名称和显示名称进行匹配：

```typescript
const opInterfaceMap = new Map<string, any>();
opInterfaces.forEach(opIface => {
  const key1 = opIface.name || '';
  const key2 = opIface.displayName || '';
  if (key1) opInterfaceMap.set(key1.toLowerCase(), opIface);
  if (key2) opInterfaceMap.set(key2.toLowerCase(), opIface);
});

// 匹配数据库接口
const opInterface = opInterfaceMap.get(interfaceName.toLowerCase()) ||
                   opInterfaceMap.get(dbInterface.name.toLowerCase());
```

## 错误处理

### 设备级别错误

如果某个设备的接口获取失败，继续处理其他设备：

```typescript
try {
  const opInterfaces = await opClient.getInterfaces({ deviceName: deviceKey });
  // 处理接口...
} catch (error) {
  console.error(`Failed to fetch interfaces for device ${deviceKey}:`, error);
  // 继续处理其他设备
}
```

### 接口未找到

如果数据库中的接口在 OpManager 中找不到，返回零流量数据：

```typescript
if (opInterface) {
  // 使用 OpManager 数据
} else {
  // 返回零流量数据
  interfaceTraffic.push({
    inBandwidth: '0 M',
    outBandwidth: '0 M',
    inUtilization: 0,
    outUtilization: 0,
    // ...
  });
}
```

## 监控状态过滤

只有 `isMonitored=true` 的接口才会被查询和显示：

```typescript
const interfaces = await prisma.interface.findMany({
  where: {
    tags: { has: tag },
    isMonitored: true  // 只查询已启用监控的接口
  }
});
```

## 总结

### 拓扑图流量数据
- ✅ 使用数据库 `TrafficMetric` 表
- ✅ 数据来自拓扑同步
- ✅ 查询速度快
- ✅ 用于拓扑图边显示

### 其他接口流量显示
- ✅ 使用 OpManager `listInterfaces` API
- ✅ 实时数据
- ✅ 用于仪表板组件
- ✅ 按设备分组优化性能

### 关键区别

| 特性 | 拓扑图流量 | 其他接口流量 |
|------|-----------|-------------|
| 数据源 | 数据库 `TrafficMetric` | OpManager `listInterfaces` API |
| 更新频率 | 拓扑同步频率 | 实时（每次请求） |
| 用途 | 拓扑图边显示 | 仪表板组件 |
| 性能 | 快速（数据库查询） | 较慢（API 调用） |
