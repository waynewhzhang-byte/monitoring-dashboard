# OpManager Mock Server 使用指南

## 📋 概述

Mock Server 用于模拟 OpManager API 的数据返回，支持：

1. ✅ **动态数据生成** - 基于真实 API 返回结果生成模拟数据
2. ✅ **自动更新** - 每 10 分钟自动更新数据，模拟真实设备运行
3. ✅ **配置管理** - 支持配置设备类型、业务视图名称等
4. ✅ **完整 API 模拟** - 模拟三个主要 API：
   - `listDevices` v2 - 设备基本信息
   - `getBusinessDetailsView` - 设备性能信息
   - `listInterfaces` - 设备接口信息

## 🚀 快速开始

### 1. 启动 Mock Server

Mock Server 会在 Next.js 服务器启动时自动启动。数据每 10 分钟自动更新一次。

### 2. 使用 Mock API

Mock API 的端点与真实 OpManager API 类似，但使用 `/api/mock/opmanager` 前缀：

#### 获取设备列表

```typescript
// 真实 API: /api/json/v2/device/listDevices
// Mock API: /api/mock/opmanager/devices

const response = await fetch('/api/mock/opmanager/devices?category=服务器&page=1&rows=50');
const data = await response.json();
```

#### 获取业务视图设备

```typescript
// 真实 API: /api/json/businessview/getBusinessDetailsView
// Mock API: /api/mock/opmanager/businessview

const response = await fetch('/api/mock/opmanager/businessview?bvName=出口业务&startPoint=0&viewLength=50');
const data = await response.json();
```

#### 获取接口列表

```typescript
// 真实 API: /api/json/device/listInterfaces
// Mock API: /api/mock/opmanager/interfaces

const response = await fetch('/api/mock/opmanager/interfaces?deviceName=10.141.69.123.10000000001&page=1&rows=100');
const data = await response.json();
```

## ⚙️ 配置管理

### 查看当前配置

```typescript
const response = await fetch('/api/mock/opmanager/config');
const { config, lastUpdateTime } = await response.json();

console.log('设备类别:', config.deviceCategories);
console.log('业务视图:', config.businessViews);
console.log('设备总数:', config.deviceCount);
```

### 更新配置

```typescript
const response = await fetch('/api/mock/opmanager/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      deviceCategories: ['服务器', '交换机', '路由器'],
      businessViews: ['出口业务', '核心业务', '办公网络'],
      deviceCount: 100, // 增加到 100 个设备
      interfaceCountPerDevice: 30,
    },
  }),
});

const result = await response.json();
console.log('配置已更新:', result);
```

### 配置项说明

```typescript
interface MockConfig {
  // 设备类别列表
  deviceCategories: string[];
  
  // 每个类别对应的设备类型
  deviceTypes: Record<string, string[]>;
  
  // 每个类别对应的厂商
  vendors: Record<string, string[]>;
  
  // 业务视图名称列表
  businessViews: string[];
  
  // 设备总数
  deviceCount: number;
  
  // 每个设备的平均接口数
  interfaceCountPerDevice: number;
}
```

## 🔄 数据更新

### 自动更新

Mock Server 默认每 10 分钟自动更新一次数据。可以通过环境变量配置：

```bash
# .env.local
MOCK_UPDATE_INTERVAL_MINUTES=10
```

### 手动更新

```typescript
// 触发数据更新（在现有数据基础上随机变化）
const response = await fetch('/api/mock/opmanager/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'update' }),
});
```

### 重新生成数据

```typescript
// 完全重新生成所有数据
const response = await fetch('/api/mock/opmanager/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'regenerate' }),
});
```

### 查看更新状态

```typescript
const response = await fetch('/api/mock/opmanager/update');
const { lastUpdateTime, schedulerRunning } = await response.json();

console.log('最后更新时间:', lastUpdateTime);
console.log('调度器运行中:', schedulerRunning);
```

## 📊 数据特性

### 1. 设备状态分布

- **70%** 的设备状态为"正常"
- **15%** 的设备状态为"问题"
- **10%** 的设备状态为"注意"
- **5%** 的设备状态为"严重"

### 2. 性能数据波动

- CPU 和内存利用率在原有基础上 **±5%** 范围内波动
- 每 10 分钟更新时，数据会随机变化
- 高利用率设备更容易触发告警状态

### 3. 接口状态

- **5%** 的接口状态可能变化
- 运行中的接口流量数据会动态更新
- 接口利用率在 **±10%** 范围内波动

## 💻 完整使用示例

### 示例 1: 在数据采集服务中使用 Mock API

```typescript
// src/services/opmanager/data-collector.ts

class OpManagerDataCollector {
  private useMock: boolean;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string, useMock: boolean = false) {
    this.useMock = useMock;
    this.baseUrl = useMock ? '' : baseUrl; // Mock 使用相对路径
    // ...
  }

  async listDevices(options: any) {
    const endpoint = this.useMock
      ? '/api/mock/opmanager/devices'
      : '/api/json/v2/device/listDevices';
    
    const response = await this.client.get(endpoint, { params: options });
    return response.data;
  }

  async getBusinessDetailsView(bvName: string, startPoint: number, viewLength: number) {
    const endpoint = this.useMock
      ? '/api/mock/opmanager/businessview'
      : '/api/json/businessview/getBusinessDetailsView';
    
    const response = await this.client.get(endpoint, {
      params: { bvName, startPoint, viewLength },
    });
    return response.data;
  }

  async listInterfaces(options: any) {
    const endpoint = this.useMock
      ? '/api/mock/opmanager/interfaces'
      : '/api/json/device/listInterfaces';
    
    const response = await this.client.get(endpoint, { params: options });
    return response.data;
  }
}

// 使用
const collector = new OpManagerDataCollector(
  'https://10.141.69.192:8061',
  'API_KEY',
  process.env.USE_MOCK === 'true' // 通过环境变量控制
);
```

### 示例 2: 配置 Mock Server

```typescript
// 初始化时配置 Mock Server
async function setupMockServer() {
  // 1. 设置配置
  await fetch('/api/mock/opmanager/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        deviceCategories: ['服务器', '交换机', '路由器'],
        businessViews: ['出口业务', '核心业务'],
        deviceCount: 50,
        deviceTypes: {
          服务器: ['Windows 2019', 'Windows 2016', 'Linux'],
          交换机: ['H3C S5130S-28S-EI', 'H3C-S10508'],
          路由器: ['H3C Router'],
        },
        vendors: {
          服务器: ['Microsoft', 'Huawei'],
          交换机: ['H3C', 'Cisco'],
          路由器: ['H3C'],
        },
      },
    }),
  });

  // 2. 手动触发一次更新
  await fetch('/api/mock/opmanager/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update' }),
  });
}
```

### 示例 3: 监控数据更新

```typescript
// 定期检查数据更新状态
setInterval(async () => {
  const response = await fetch('/api/mock/opmanager/update');
  const { lastUpdateTime } = await response.json();
  
  console.log('Mock 数据最后更新时间:', lastUpdateTime);
  
  // 如果数据超过 15 分钟未更新，发出警告
  const lastUpdate = new Date(lastUpdateTime);
  const now = new Date();
  const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;
  
  if (minutesSinceUpdate > 15) {
    console.warn('Mock 数据已超过 15 分钟未更新');
  }
}, 60000); // 每分钟检查一次
```

## 🔧 环境变量配置

```bash
# .env.local

# Mock Server 配置
MOCK_UPDATE_INTERVAL_MINUTES=10  # 数据更新间隔（分钟）

# 是否使用 Mock API（开发环境）
USE_MOCK=true

# 真实 OpManager API 配置（生产环境）
OPMANAGER_BASE_URL=https://10.141.69.192:8061
OPMANAGER_API_KEY=your_api_key_here
```

## 📝 API 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/mock/opmanager/devices` | GET | 获取设备列表 |
| `/api/mock/opmanager/businessview` | GET | 获取业务视图设备 |
| `/api/mock/opmanager/interfaces` | GET | 获取接口列表 |
| `/api/mock/opmanager/config` | GET | 获取配置 |
| `/api/mock/opmanager/config` | POST | 更新配置 |
| `/api/mock/opmanager/update` | GET | 获取更新状态 |
| `/api/mock/opmanager/update` | POST | 手动更新数据 |

## ⚠️ 注意事项

1. **数据一致性**: Mock 数据在每次更新时会在原有基础上波动，保持一定的连续性
2. **性能考虑**: 大量设备（>100）可能影响生成速度，建议合理设置 `deviceCount`
3. **状态分布**: 设备状态分布是随机的，但倾向于正常状态（70%）
4. **业务视图**: 每个业务视图包含 30%-70% 的设备（随机选择）
5. **接口数量**: 每个设备的接口数量在 `interfaceCount * 0.8` 到 `interfaceCount * 1.2` 之间

## 🎯 使用场景

1. **开发测试** - 无需连接真实 OpManager 服务器
2. **数据可视化** - 提供稳定的测试数据用于前端开发
3. **性能测试** - 测试大量数据处理能力
4. **演示展示** - 提供可控的演示数据

## ✅ 总结

Mock Server 提供了完整的 OpManager API 模拟功能，支持：

- ✅ 动态数据生成和更新
- ✅ 配置管理
- ✅ 自动定时更新
- ✅ 与真实 API 兼容的接口
- ✅ 基于真实数据模式的模拟

通过 Mock Server，您可以方便地进行开发和测试，无需依赖真实的 OpManager 服务器。
