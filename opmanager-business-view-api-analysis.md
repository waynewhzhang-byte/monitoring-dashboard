# OpManager Business View API 分析文档

## 📋 API 概述

**API**: `getBusinessDetailsView`  
**功能**: 获取业务视图中所有设备的详细信息（包括性能状况）  
**HTTP 方法**: `GET`  
**API 端点**: `/api/json/businessview/getBusinessDetailsView`  
**限流规则**: 100 请求/分钟（超过限制将被阻止 1 分钟）

**参考文档**: [OpManager REST API - getBusinessDetailsView](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getBusinessDetailsView)

---

## 📋 API 详细信息

### 请求格式

```
GET /api/json/businessview/getBusinessDetailsView?bvName={businessViewName}&startPoint={start}&viewLength={length}
```

**完整 URL 示例**:
```
https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView?bvName=出口业务&startPoint=0&viewLength=50
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `apiKey` | String | ✅ 是 | OpManager API 密钥 | 通过请求头传递（推荐） |
| `bvName` | String | ✅ 是 | 业务视图名称（与业务视图页面 URL 中显示的名称一致） | `出口业务` |
| `startPoint` | Integer | ✅ 是 | 起始索引（用于分页） | `0` |
| `viewLength` | Integer | ✅ 是 | 要获取的记录数 | `50` |

**注意**: 根据实际测试，即使不提供 `startPoint` 和 `viewLength` 参数，API 也可能返回数据，但建议提供这些参数以确保分页正常工作。

### 认证方式

**推荐**: 通过请求头传递 API Key
```http
GET /api/json/businessview/getBusinessDetailsView?bvName=出口业务&startPoint=0&viewLength=50
Headers:
  apiKey: YOUR_API_KEY
```

**兼容方式**: 通过 URL 参数传递（已废弃）
```
GET /api/json/businessview/getBusinessDetailsView?apiKey=YOUR_API_KEY&bvName=出口业务&startPoint=0&viewLength=50
```

---

## 📊 返回数据格式（基于实际响应）

### 成功响应 (HTTP 200)

```json
{
  "BusinessDetailsView": {
    "TotalRecords": "6",
    "Details": [
      {
        "severity": "5",
        "CPUUtilization": 0,
        "MemUtilization": 0,
        "displayName": "出口专线交换机",
        "name": "10.141.0.252.10000000001",
        "IpAddress": "10.141.0.252",
        "type": "H3C S5130S-28S-EI",
        "status": "Clear"
      },
      {
        "severity": "2",
        "CPUUtilization": 0,
        "MemUtilization": 0,
        "displayName": "管理区核心交换机",
        "name": "1.1.1.1.10000000001",
        "IpAddress": "1.1.1.1",
        "type": "H3C-S10508",
        "status": "Trouble"
      },
      {
        "severity": "5",
        "CPUUtilization": 14,
        "MemUtilization": 0,
        "displayName": "长源侧出口上网行为管理",
        "name": "10.141.1.34.10000000001",
        "IpAddress": "10.141.1.34",
        "type": "Sangfor AC1200",
        "status": "Clear"
      },
      {
        "severity": "5",
        "CPUUtilization": 10,
        "MemUtilization": 47,
        "displayName": "长源侧出口防火墙",
        "name": "10.141.0.251.10000000001",
        "IpAddress": "10.141.0.251",
        "type": "Linux",
        "status": "Clear"
      },
      {
        "severity": "5",
        "CPUUtilization": 2,
        "MemUtilization": 38,
        "displayName": "集团侧出口深信服防火墙",
        "name": "10.141.1.252.10000000001",
        "IpAddress": "10.141.1.252",
        "type": "Linux",
        "status": "Clear"
      },
      {
        "severity": "5",
        "CPUUtilization": 9,
        "MemUtilization": 0,
        "displayName": "集团出口全网行为管理",
        "name": "10.141.1.248.10000000001",
        "IpAddress": "10.141.1.248",
        "type": "Sangfor AC1200",
        "status": "Clear"
      }
    ]
  }
}
```

### 字段说明

#### 顶层字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `BusinessDetailsView` | Object | 业务视图详情对象 |
| `BusinessDetailsView.TotalRecords` | String | 设备总数 |
| `BusinessDetailsView.Details` | Array | 设备详情数组 |

#### 设备对象字段

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `name` | String | 设备名称（Managed Entity name） | `"10.141.0.252.10000000001"` |
| `displayName` | String | 设备显示名称 | `"出口专线交换机"` |
| `IpAddress` | String | IP 地址 | `"10.141.0.252"` |
| `type` | String | 设备类型/型号 | `"H3C S5130S-28S-EI"`, `"Linux"` |
| `severity` | String | 严重程度编号 | `"5"` (正常), `"2"` (问题), `"1"` (严重) |
| `status` | String | 状态字符串（英文） | `"Clear"`, `"Trouble"`, `"Critical"` |
| `CPUUtilization` | Number | CPU 利用率（百分比） | `0`, `14`, `10` |
| `MemUtilization` | Number | 内存利用率（百分比） | `0`, `47`, `38` |

### 状态值映射

#### severity 值

| 值 | 英文状态 (status) | 说明 |
|----|-------------------|------|
| `"1"` | `"Critical"` | 严重 |
| `"2"` | `"Trouble"` | 问题 |
| `"3"` | `"Attention"` | 注意 |
| `"4"` | `"Service Down"` | 服务中断 |
| `"5"` | `"Clear"` | 正常 ✅ |

---

## 💻 代码示例

### TypeScript / JavaScript

```typescript
import axios, { AxiosInstance } from 'axios';

interface BusinessViewDevice {
  name: string;
  displayName: string;
  IpAddress: string;
  type: string;
  severity: string;
  status: string;
  CPUUtilization: number;
  MemUtilization: number;
}

interface BusinessDetailsViewResponse {
  BusinessDetailsView: {
    TotalRecords: string;
    Details: BusinessViewDevice[];
  };
}

class OpManagerBusinessViewClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'apiKey': apiKey
      }
    });
  }

  /**
   * 获取业务视图中的设备列表（包含性能指标）
   * @param bvName 业务视图名称
   * @param startPoint 起始索引（默认 0）
   * @param viewLength 记录数（默认 50）
   */
  async getBusinessDetailsView(
    bvName: string,
    startPoint: number = 0,
    viewLength: number = 50
  ): Promise<BusinessDetailsViewResponse> {
    const response = await this.client.get(
      '/api/json/businessview/getBusinessDetailsView',
      {
        params: {
          bvName,
          startPoint,
          viewLength
        }
      }
    );

    return response.data;
  }

  /**
   * 获取业务视图中所有设备（自动分页）
   * @param bvName 业务视图名称
   */
  async getAllBusinessViewDevices(bvName: string): Promise<BusinessViewDevice[]> {
    const allDevices: BusinessViewDevice[] = [];
    let startPoint = 0;
    const viewLength = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getBusinessDetailsView(bvName, startPoint, viewLength);
      
      if (response.BusinessDetailsView.Details && response.BusinessDetailsView.Details.length > 0) {
        allDevices.push(...response.BusinessDetailsView.Details);
        startPoint += viewLength;

        const totalRecords = parseInt(response.BusinessDetailsView.TotalRecords || '0');
        hasMore = allDevices.length < totalRecords;
      } else {
        hasMore = false;
      }
    }

    return allDevices;
  }

  /**
   * 获取业务视图中设备的性能统计
   * @param bvName 业务视图名称
   */
  async getBusinessViewPerformanceStats(bvName: string) {
    const devices = await this.getAllBusinessViewDevices(bvName);

    const stats = {
      total: devices.length,
      byStatus: {} as Record<string, number>,
      avgCPU: 0,
      avgMemory: 0,
      maxCPU: 0,
      maxMemory: 0,
      highCPUDevices: [] as BusinessViewDevice[],
      highMemoryDevices: [] as BusinessViewDevice[]
    };

    let totalCPU = 0;
    let totalMemory = 0;

    devices.forEach(device => {
      // 按状态统计
      const status = device.status || 'Unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // CPU 统计
      const cpu = device.CPUUtilization || 0;
      totalCPU += cpu;
      if (cpu > stats.maxCPU) stats.maxCPU = cpu;
      if (cpu > 80) stats.highCPUDevices.push(device);

      // 内存统计
      const mem = device.MemUtilization || 0;
      totalMemory += mem;
      if (mem > stats.maxMemory) stats.maxMemory = mem;
      if (mem > 80) stats.highMemoryDevices.push(device);
    });

    stats.avgCPU = devices.length > 0 ? totalCPU / devices.length : 0;
    stats.avgMemory = devices.length > 0 ? totalMemory / devices.length : 0;

    return stats;
  }

  /**
   * 获取业务视图中有问题的设备
   * @param bvName 业务视图名称
   */
  async getBusinessViewProblemDevices(bvName: string) {
    const devices = await this.getAllBusinessViewDevices(bvName);
    
    return devices.filter(
      device => device.severity !== '5' || device.status !== 'Clear'
    );
  }

  /**
   * 获取业务视图中高负载设备
   * @param bvName 业务视图名称
   * @param cpuThreshold CPU 阈值（默认 80）
   * @param memThreshold 内存阈值（默认 80）
   */
  async getBusinessViewHighLoadDevices(
    bvName: string,
    cpuThreshold: number = 80,
    memThreshold: number = 80
  ) {
    const devices = await this.getAllBusinessViewDevices(bvName);
    
    return devices.filter(
      device => 
        (device.CPUUtilization || 0) > cpuThreshold ||
        (device.MemUtilization || 0) > memThreshold
    );
  }
}

// 使用示例
const client = new OpManagerBusinessViewClient(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 示例 1: 获取业务视图设备列表
const result = await client.getBusinessDetailsView('出口业务', 0, 50);
console.log(`设备总数: ${result.BusinessDetailsView.TotalRecords}`);
console.log(`当前页设备数: ${result.BusinessDetailsView.Details.length}`);

// 示例 2: 获取所有设备（自动分页）
const allDevices = await client.getAllBusinessViewDevices('出口业务');
console.log(`所有设备数: ${allDevices.length}`);

// 示例 3: 获取性能统计
const stats = await client.getBusinessViewPerformanceStats('出口业务');
console.log('性能统计:', stats);
console.log(`平均 CPU: ${stats.avgCPU.toFixed(2)}%`);
console.log(`平均内存: ${stats.avgMemory.toFixed(2)}%`);
console.log(`高 CPU 设备: ${stats.highCPUDevices.length}`);

// 示例 4: 获取有问题的设备
const problemDevices = await client.getBusinessViewProblemDevices('出口业务');
console.log(`有问题的设备: ${problemDevices.length}`);

// 示例 5: 获取高负载设备
const highLoadDevices = await client.getBusinessViewHighLoadDevices('出口业务');
console.log(`高负载设备: ${highLoadDevices.length}`);
```

### Python

```python
import requests
from typing import Dict, List, Any

class OpManagerBusinessViewClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({'apiKey': api_key})

    def get_business_details_view(
        self,
        bv_name: str,
        start_point: int = 0,
        view_length: int = 50
    ) -> Dict[str, Any]:
        """
        获取业务视图中的设备列表（包含性能指标）
        
        Args:
            bv_name: 业务视图名称
            start_point: 起始索引
            view_length: 记录数
        """
        response = self.session.get(
            f'{self.base_url}/api/json/businessview/getBusinessDetailsView',
            params={
                'bvName': bv_name,
                'startPoint': start_point,
                'viewLength': view_length
            }
        )
        response.raise_for_status()
        return response.json()

    def get_all_business_view_devices(self, bv_name: str) -> List[Dict[str, Any]]:
        """获取业务视图中所有设备（自动分页）"""
        all_devices = []
        start_point = 0
        view_length = 50
        has_more = True

        while has_more:
            response = self.get_business_details_view(bv_name, start_point, view_length)
            details = response.get('BusinessDetailsView', {}).get('Details', [])
            
            if details:
                all_devices.extend(details)
                start_point += view_length

                total_records = int(response.get('BusinessDetailsView', {}).get('TotalRecords', '0'))
                has_more = len(all_devices) < total_records
            else:
                has_more = False

        return all_devices

    def get_business_view_performance_stats(self, bv_name: str) -> Dict[str, Any]:
        """获取业务视图中设备的性能统计"""
        devices = self.get_all_business_view_devices(bv_name)

        stats = {
            'total': len(devices),
            'byStatus': {},
            'avgCPU': 0,
            'avgMemory': 0,
            'maxCPU': 0,
            'maxMemory': 0,
            'highCPUDevices': [],
            'highMemoryDevices': []
        }

        total_cpu = 0
        total_memory = 0

        for device in devices:
            # 按状态统计
            status = device.get('status', 'Unknown')
            stats['byStatus'][status] = stats['byStatus'].get(status, 0) + 1

            # CPU 统计
            cpu = device.get('CPUUtilization', 0)
            total_cpu += cpu
            if cpu > stats['maxCPU']:
                stats['maxCPU'] = cpu
            if cpu > 80:
                stats['highCPUDevices'].append(device)

            # 内存统计
            mem = device.get('MemUtilization', 0)
            total_memory += mem
            if mem > stats['maxMemory']:
                stats['maxMemory'] = mem
            if mem > 80:
                stats['highMemoryDevices'].append(device)

        if devices:
            stats['avgCPU'] = total_cpu / len(devices)
            stats['avgMemory'] = total_memory / len(devices)

        return stats

    def get_business_view_problem_devices(self, bv_name: str) -> List[Dict[str, Any]]:
        """获取业务视图中有问题的设备"""
        devices = self.get_all_business_view_devices(bv_name)
        return [
            device for device in devices
            if device.get('severity') != '5' or device.get('status') != 'Clear'
        ]

    def get_business_view_high_load_devices(
        self,
        bv_name: str,
        cpu_threshold: int = 80,
        mem_threshold: int = 80
    ) -> List[Dict[str, Any]]:
        """获取业务视图中高负载设备"""
        devices = self.get_all_business_view_devices(bv_name)
        return [
            device for device in devices
            if device.get('CPUUtilization', 0) > cpu_threshold or
               device.get('MemUtilization', 0) > mem_threshold
        ]

# 使用示例
client = OpManagerBusinessViewClient(
    'https://10.141.69.192:8061',
    'YOUR_API_KEY'
)

# 获取业务视图设备列表
result = client.get_business_details_view('出口业务', 0, 50)
print(f"设备总数: {result['BusinessDetailsView']['TotalRecords']}")

# 获取所有设备
all_devices = client.get_all_business_view_devices('出口业务')
print(f"所有设备数: {len(all_devices)}")

# 获取性能统计
stats = client.get_business_view_performance_stats('出口业务')
print(f"平均 CPU: {stats['avgCPU']:.2f}%")
print(f"平均内存: {stats['avgMemory']:.2f}%")
```

---

## 🔍 实际使用场景

### 场景 1: 获取业务视图所有设备的性能状况

```typescript
const client = new OpManagerBusinessViewClient(baseUrl, apiKey);
const devices = await client.getAllBusinessViewDevices('出口业务');

devices.forEach(device => {
  console.log(`${device.displayName}:`);
  console.log(`  CPU: ${device.CPUUtilization}%`);
  console.log(`  内存: ${device.MemUtilization}%`);
  console.log(`  状态: ${device.status}`);
});
```

### 场景 2: 监控高负载设备

```typescript
const highLoadDevices = await client.getBusinessViewHighLoadDevices('出口业务', 80, 80);

if (highLoadDevices.length > 0) {
  console.warn(`发现 ${highLoadDevices.length} 个高负载设备:`);
  highLoadDevices.forEach(device => {
    console.warn(`  ${device.displayName}: CPU=${device.CPUUtilization}%, 内存=${device.MemUtilization}%`);
  });
}
```

### 场景 3: 生成性能报告

```typescript
const stats = await client.getBusinessViewPerformanceStats('出口业务');

const report = {
  业务视图: '出口业务',
  设备总数: stats.total,
  状态分布: stats.byStatus,
  平均CPU利用率: `${stats.avgCPU.toFixed(2)}%`,
  平均内存利用率: `${stats.avgMemory.toFixed(2)}%`,
  最高CPU利用率: `${stats.maxCPU}%`,
  最高内存利用率: `${stats.maxMemory}%`,
  高CPU设备数: stats.highCPUDevices.length,
  高内存设备数: stats.highMemoryDevices.length
};

console.log('性能报告:', JSON.stringify(report, null, 2));
```

### 场景 4: 过滤正常状态的设备

```typescript
const devices = await client.getAllBusinessViewDevices('出口业务');
const normalDevices = devices.filter(
  device => device.severity === '5' && device.status === 'Clear'
);
console.log(`正常设备: ${normalDevices.length}/${devices.length}`);
```

---

## ⚠️ 注意事项

1. **分页参数**:
   - 虽然实际测试中不提供 `startPoint` 和 `viewLength` 也可能返回数据
   - 但官方文档要求这两个参数是必需的
   - 建议始终提供这些参数以确保分页正常工作

2. **限流控制**:
   - 限流：100 请求/分钟
   - 超过限制会被阻止 1 分钟
   - 建议实现请求重试和退避策略

3. **业务视图名称**:
   - 使用业务视图页面 URL 中显示的确切名称
   - 示例：`出口业务`（注意中文字符）

4. **性能指标**:
   - `CPUUtilization` 和 `MemUtilization` 可能为 `0`（如果设备不支持或未监控）
   - 某些设备类型可能不提供这些指标

5. **自动分页**:
   - 如果设备数量较多，使用 `getAllBusinessViewDevices` 方法自动处理分页
   - 注意控制请求频率以避免限流

---

## 📊 数据示例分析

基于您提供的实际返回数据：

```json
{
  "BusinessDetailsView": {
    "TotalRecords": "6",
    "Details": [
      {
        "severity": "5",
        "CPUUtilization": 0,
        "MemUtilization": 0,
        "displayName": "出口专线交换机",
        "name": "10.141.0.252.10000000001",
        "IpAddress": "10.141.0.252",
        "type": "H3C S5130S-28S-EI",
        "status": "Clear"
      },
      {
        "severity": "2",
        "CPUUtilization": 0,
        "MemUtilization": 0,
        "displayName": "管理区核心交换机",
        "name": "1.1.1.1.10000000001",
        "IpAddress": "1.1.1.1",
        "type": "H3C-S10508",
        "status": "Trouble"
      }
    ]
  }
}
```

**分析**:
- 业务视图 "出口业务" 包含 6 个设备
- 1 个设备状态为 "Trouble"（severity: "2"）
- 5 个设备状态为 "Clear"（severity: "5"）
- CPU 利用率范围：0-14%
- 内存利用率范围：0-47%

---

## 📚 参考

- [OpManager REST API 官方文档 - getBusinessDetailsView](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getBusinessDetailsView)
- 已验证的 API URL: `https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView?bvName=出口业务`

---

## ✅ 总结

**`getBusinessDetailsView` API** 是获取业务视图中设备性能状况的最佳方式：

- ✅ 直接返回设备的 CPU 和内存利用率
- ✅ 包含设备状态和基本信息
- ✅ 支持分页（`startPoint`, `viewLength`）
- ✅ 返回设备总数（`TotalRecords`）
- ⚠️ 限流较低（100 请求/分钟），需要注意控制请求频率

**使用建议**:
- 对于少量设备，直接调用 API
- 对于大量设备，使用自动分页方法
- 定期获取性能统计，监控高负载设备
