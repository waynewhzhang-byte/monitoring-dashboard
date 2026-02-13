# OpManager listDevices v2 API 分析文档

## 📋 API 概述

**API**: `v2/listDevices`  
**功能**: 列出 OpManager 监控的所有设备（增强版 v2 API，包含额外字段）  
**HTTP 方法**: `GET`  
**API 端点**: `/api/json/v2/device/listDevices`  
**限流规则**: 500 请求/分钟（超过限制将被阻止 1 分钟）

**参考文档**: [OpManager REST API - v2/listDevices](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#listDevices-v2)

---

## 📋 API 详细信息

### 请求格式

```
GET /api/json/v2/device/listDevices?category={category}&page={page}&rows={rows}
```

**完整 URL 示例**:
```
https://10.141.69.192:8061/api/json/v2/device/listDevices?category=Server&page=1&rows=50
```

### 主要参数说明

| 参数名 | 类型 | 必需 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `apiKey` | String | ✅ 是 | OpManager API 密钥 | 通过请求头传递（推荐） |
| `category` | String | ❌ 否 | 设备类别（英文） | `Server`, `Switch`, `Router`, `Printer` 等 |
| `page` | Integer | ❌ 否 | 页码（用于分页） | `1`, `2`, `3` |
| `rows` | Integer | ❌ 否 | 每页记录数（用于分页） | `50`, `100`, `200` |
| `type` | String | ❌ 否 | 设备类型 | `Windows 2019`, `Cisco2081` 等 |
| `vendorName` | String | ❌ 否 | 厂商名称 | `Microsoft`, `Huawei`, `Cisco` 等 |
| `severity` | String | ❌ 否 | 严重程度 | `1`(严重), `2`(问题), `5`(正常) |
| `deviceName` | String | ❌ 否 | 设备名称 | 精确匹配设备名称 |
| `sortByColumn` | String | ❌ 否 | 排序字段 | `displayName`, `ipaddress`, `type` 等 |
| `sortByType` | String | ❌ 否 | 排序方式 | `asc`, `desc` |

**注意**: `category` 参数使用**英文**值（如 `Server`），但返回的 `category` 字段可能是**中文**（如 `服务器`），这取决于 OpManager 的本地化设置。

### 认证方式

**推荐**: 通过请求头传递 API Key
```http
GET /api/json/v2/device/listDevices?category=Server&page=1&rows=50
Headers:
  apiKey: YOUR_API_KEY
```

**兼容方式**: 通过 URL 参数传递（已废弃）
```
GET /api/json/v2/device/listDevices?apiKey=YOUR_API_KEY&category=Server&page=1&rows=50
```

---

## 📊 返回数据格式（基于实际响应）

### 成功响应 (HTTP 200)

```json
{
  "total": 0,
  "page": 1,
  "rows": [
    {
      "isSNMP": true,
      "ipaddress": "10.141.69.123",
      "isSuppressed": false,
      "statusStr": "正常",
      "prettyTime": "41 天之前",
      "displayName": "P6_69.123",
      "isNew": false,
      "type": "Windows 2019",
      "vendorName": "Microsoft",
      "deviceName": "10.141.69.123.10000000001",
      "moid": 10000003506,
      "statusNum": "5",
      "addedTime": "18 11月 2025 02:54:32 下午 CST",
      "interfaceCount": 30,
      "id": "10000003506",
      "category": "服务器"
    },
    {
      "isSNMP": true,
      "ipaddress": "10.141.2.180",
      "isSuppressed": false,
      "statusStr": "正常",
      "prettyTime": "41 天之前",
      "displayName": "精密点检服务器",
      "isNew": false,
      "type": "Windows 2016",
      "vendorName": "Microsoft",
      "deviceName": "10.141.2.180.10000000001",
      "moid": 10000003463,
      "statusNum": "5",
      "addedTime": "18 11月 2025 01:48:10 下午 CST",
      "interfaceCount": 34,
      "id": "10000003463",
      "category": "服务器"
    }
  ],
  "records": 44
}
```

### 字段说明

#### 顶层字段

| 字段名 | 类型 | 说明 | 注意 |
|--------|------|------|------|
| `total` | Number | 总记录数（可能为 0） | ⚠️ 实际记录数看 `records` 字段 |
| `page` | Number | 当前页码 | |
| `rows` | Array | 设备数组 | |
| `records` | Number | **实际总记录数** | ✅ 使用此字段获取真实总数 |

#### 设备对象字段

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `id` | String | 设备 ID | `"10000003506"` |
| `moid` | Number | 管理对象 ID | `10000003506` |
| `deviceName` | String | 设备名称（Managed Entity name） | `"10.141.69.123.10000000001"` |
| `displayName` | String | 设备显示名称 | `"P6_69.123"`, `"精密点检服务器"` |
| `ipaddress` | String | IP 地址 | `"10.141.69.123"` |
| `type` | String | 设备类型/型号 | `"Windows 2019"`, `"Huawei-USG5550"` |
| `vendorName` | String | 厂商名称 | `"Microsoft"`, `"Huawei"` |
| `category` | String | 设备类别（**可能为中文**） | `"服务器"`, `"交换机"`, `"路由器"` |
| `statusNum` | String | 状态编号 | `"5"`(正常), `"2"`(问题), `"1"`(严重) |
| `statusStr` | String | 状态字符串（**可能为中文**） | `"正常"`, `"问题"`, `"严重"` |
| `isSNMP` | Boolean | 是否使用 SNMP | `true`, `false` |
| `isSuppressed` | Boolean | 是否被抑制 | `true`, `false` |
| `isNew` | Boolean | 是否为新设备 | `true`, `false` |
| `interfaceCount` | Number | 接口数量 | `30`, `34`, `24` |
| `addedTime` | String | 添加时间 | `"18 11月 2025 02:54:32 下午 CST"` |
| `prettyTime` | String | 友好时间显示 | `"41 天之前"`, `"5 小时之前"` |

### 状态值映射

#### statusNum 值

| 值 | 英文状态 | 中文状态 (statusStr) | 说明 |
|----|----------|---------------------|------|
| `"1"` | `"Critical"` | `"严重"` | 严重 |
| `"2"` | `"Trouble"` | `"问题"` | 问题 |
| `"3"` | `"Attention"` | `"注意"` | 注意 |
| `"4"` | `"Service Down"` | `"服务中断"` | 服务中断 |
| `"5"` | `"Clear"` | `"正常"` | 正常 ✅ |
| `"7"` | `"Unmanaged"` | `"未管理"` | 未管理 |

### 常见设备类别（category 参数值）

| 英文值 | 中文返回值 | 说明 |
|--------|-----------|------|
| `Server` | `"服务器"` | 服务器 |
| `Switch` | `"交换机"` | 交换机 |
| `Router` | `"路由器"` | 路由器 |
| `Printer` | `"打印机"` | 打印机 |
| `Desktop` | `"桌面"` | 桌面 |
| `Firewall` | `"防火墙"` | 防火墙 |
| `Wireless` | `"无线"` | 无线设备 |

---

## 💻 代码示例

### TypeScript / JavaScript

```typescript
import axios, { AxiosInstance } from 'axios';

interface Device {
  id: string;
  moid: number;
  deviceName: string;
  displayName: string;
  ipaddress: string;
  type: string;
  vendorName: string;
  category: string;
  statusNum: string;
  statusStr: string;
  isSNMP: boolean;
  isSuppressed: boolean;
  isNew: boolean;
  interfaceCount: number;
  addedTime: string;
  prettyTime: string;
}

interface ListDevicesResponse {
  total: number;
  page: number;
  rows: Device[];
  records: number; // 实际总记录数
}

class OpManagerDeviceClient {
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
   * 获取设备列表（支持分页和过滤）
   * @param options 查询选项
   */
  async listDevices(options: {
    category?: string;
    type?: string;
    vendorName?: string;
    severity?: string;
    deviceName?: string;
    page?: number;
    rows?: number;
    sortByColumn?: string;
    sortByType?: 'asc' | 'desc';
  } = {}): Promise<ListDevicesResponse> {
    const response = await this.client.get(
      '/api/json/v2/device/listDevices',
      {
        params: {
          category: options.category,
          type: options.type,
          vendorName: options.vendorName,
          severity: options.severity,
          deviceName: options.deviceName,
          page: options.page || 1,
          rows: options.rows || 50,
          sortByColumn: options.sortByColumn,
          sortByType: options.sortByType
        }
      }
    );

    return response.data;
  }

  /**
   * 获取所有设备（自动分页）
   * @param category 设备类别
   */
  async getAllDevices(category?: string): Promise<Device[]> {
    const allDevices: Device[] = [];
    let page = 1;
    const rows = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listDevices({
        category,
        page,
        rows
      });

      if (response.rows && response.rows.length > 0) {
        allDevices.push(...response.rows);
        
        // 使用 records 字段判断是否还有更多数据
        const totalRecords = response.records || 0;
        hasMore = allDevices.length < totalRecords;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allDevices;
  }

  /**
   * 按类别获取设备
   * @param category 设备类别（英文）
   */
  async getDevicesByCategory(category: string): Promise<Device[]> {
    return this.getAllDevices(category);
  }

  /**
   * 获取有问题的设备
   * @param category 设备类别（可选）
   */
  async getProblemDevices(category?: string): Promise<Device[]> {
    const allDevices = await this.getAllDevices(category);
    return allDevices.filter(
      device => device.statusNum !== '5' || device.statusStr !== '正常'
    );
  }

  /**
   * 获取设备统计信息
   * @param category 设备类别（可选）
   */
  async getDeviceStats(category?: string) {
    const devices = await this.getAllDevices(category);

    const stats = {
      total: devices.length,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byVendor: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      problemDevices: [] as Device[],
      totalInterfaces: 0
    };

    devices.forEach(device => {
      // 按状态统计
      const status = device.statusStr || 'Unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // 按类别统计
      const cat = device.category || 'Unknown';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

      // 按厂商统计
      const vendor = device.vendorName || 'Unknown';
      stats.byVendor[vendor] = (stats.byVendor[vendor] || 0) + 1;

      // 按类型统计
      const type = device.type || 'Unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 问题设备
      if (device.statusNum !== '5' || device.statusStr !== '正常') {
        stats.problemDevices.push(device);
      }

      // 接口总数
      stats.totalInterfaces += device.interfaceCount || 0;
    });

    return stats;
  }

  /**
   * 搜索设备
   * @param keyword 关键词（搜索 displayName, ipaddress, type）
   * @param category 设备类别（可选）
   */
  async searchDevices(keyword: string, category?: string): Promise<Device[]> {
    const allDevices = await this.getAllDevices(category);
    const lowerKeyword = keyword.toLowerCase();

    return allDevices.filter(
      device =>
        device.displayName?.toLowerCase().includes(lowerKeyword) ||
        device.ipaddress?.toLowerCase().includes(lowerKeyword) ||
        device.type?.toLowerCase().includes(lowerKeyword) ||
        device.vendorName?.toLowerCase().includes(lowerKeyword)
    );
  }
}

// 使用示例
const client = new OpManagerDeviceClient(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 示例 1: 获取服务器设备列表（第一页）
const result = await client.listDevices({
  category: 'Server',
  page: 1,
  rows: 50
});
console.log(`总记录数: ${result.records}`);
console.log(`当前页设备数: ${result.rows.length}`);

// 示例 2: 获取所有服务器设备
const allServers = await client.getAllDevices('Server');
console.log(`所有服务器设备数: ${allServers.length}`);

// 示例 3: 获取有问题的设备
const problemDevices = await client.getProblemDevices('Server');
console.log(`有问题的服务器: ${problemDevices.length}`);

// 示例 4: 获取设备统计
const stats = await client.getDeviceStats('Server');
console.log('设备统计:', stats);
console.log(`状态分布:`, stats.byStatus);
console.log(`厂商分布:`, stats.byVendor);

// 示例 5: 搜索设备
const searchResults = await client.searchDevices('Windows', 'Server');
console.log(`搜索结果: ${searchResults.length} 个设备`);

// 示例 6: 按厂商过滤
const microsoftDevices = await client.listDevices({
  category: 'Server',
  vendorName: 'Microsoft',
  page: 1,
  rows: 50
});
console.log(`Microsoft 服务器: ${microsoftDevices.rows.length}`);
```

### Python

```python
import requests
from typing import Dict, List, Any, Optional

class OpManagerDeviceClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({'apiKey': api_key})

    def list_devices(
        self,
        category: Optional[str] = None,
        type: Optional[str] = None,
        vendor_name: Optional[str] = None,
        severity: Optional[str] = None,
        device_name: Optional[str] = None,
        page: int = 1,
        rows: int = 50,
        sort_by_column: Optional[str] = None,
        sort_by_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取设备列表（支持分页和过滤）
        """
        response = self.session.get(
            f'{self.base_url}/api/json/v2/device/listDevices',
            params={
                'category': category,
                'type': type,
                'vendorName': vendor_name,
                'severity': severity,
                'deviceName': device_name,
                'page': page,
                'rows': rows,
                'sortByColumn': sort_by_column,
                'sortByType': sort_by_type
            }
        )
        response.raise_for_status()
        return response.json()

    def get_all_devices(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取所有设备（自动分页）"""
        all_devices = []
        page = 1
        rows = 50
        has_more = True

        while has_more:
            response = self.list_devices(category=category, page=page, rows=rows)
            devices = response.get('rows', [])
            
            if devices:
                all_devices.extend(devices)
                
                # 使用 records 字段判断是否还有更多数据
                total_records = response.get('records', 0)
                has_more = len(all_devices) < total_records
                page += 1
            else:
                has_more = False

        return all_devices

    def get_devices_by_category(self, category: str) -> List[Dict[str, Any]]:
        """按类别获取设备"""
        return self.get_all_devices(category)

    def get_problem_devices(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取有问题的设备"""
        all_devices = self.get_all_devices(category)
        return [
            device for device in all_devices
            if device.get('statusNum') != '5' or device.get('statusStr') != '正常'
        ]

    def get_device_stats(self, category: Optional[str] = None) -> Dict[str, Any]:
        """获取设备统计信息"""
        devices = self.get_all_devices(category)

        stats = {
            'total': len(devices),
            'byStatus': {},
            'byCategory': {},
            'byVendor': {},
            'byType': {},
            'problemDevices': [],
            'totalInterfaces': 0
        }

        for device in devices:
            # 按状态统计
            status = device.get('statusStr', 'Unknown')
            stats['byStatus'][status] = stats['byStatus'].get(status, 0) + 1

            # 按类别统计
            cat = device.get('category', 'Unknown')
            stats['byCategory'][cat] = stats['byCategory'].get(cat, 0) + 1

            # 按厂商统计
            vendor = device.get('vendorName', 'Unknown')
            stats['byVendor'][vendor] = stats['byVendor'].get(vendor, 0) + 1

            # 按类型统计
            type = device.get('type', 'Unknown')
            stats['byType'][type] = stats['byType'].get(type, 0) + 1

            # 问题设备
            if device.get('statusNum') != '5' or device.get('statusStr') != '正常':
                stats['problemDevices'].append(device)

            # 接口总数
            stats['totalInterfaces'] += device.get('interfaceCount', 0)

        return stats

    def search_devices(
        self,
        keyword: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """搜索设备"""
        all_devices = self.get_all_devices(category)
        lower_keyword = keyword.lower()

        return [
            device for device in all_devices
            if lower_keyword in device.get('displayName', '').lower() or
               lower_keyword in device.get('ipaddress', '').lower() or
               lower_keyword in device.get('type', '').lower() or
               lower_keyword in device.get('vendorName', '').lower()
        ]

# 使用示例
client = OpManagerDeviceClient(
    'https://10.141.69.192:8061',
    'YOUR_API_KEY'
)

# 获取所有服务器设备
all_servers = client.get_all_devices('Server')
print(f'所有服务器设备数: {len(all_servers)}')

# 获取设备统计
stats = client.get_device_stats('Server')
print(f'状态分布: {stats["byStatus"]}')
print(f'厂商分布: {stats["byVendor"]}')
```

---

## 🔍 实际使用场景

### 场景 1: 获取特定类别的所有设备

```typescript
const client = new OpManagerDeviceClient(baseUrl, apiKey);

// 获取所有服务器
const servers = await client.getDevicesByCategory('Server');
console.log(`服务器总数: ${servers.length}`);

// 获取所有交换机
const switches = await client.getDevicesByCategory('Switch');
console.log(`交换机总数: ${switches.length}`);
```

### 场景 2: 监控有问题的设备

```typescript
const problemDevices = await client.getProblemDevices('Server');

if (problemDevices.length > 0) {
  console.warn(`发现 ${problemDevices.length} 个有问题的服务器:`);
  problemDevices.forEach(device => {
    console.warn(`  ${device.displayName} (${device.ipaddress}): ${device.statusStr}`);
  });
}
```

### 场景 3: 生成设备统计报告

```typescript
const stats = await client.getDeviceStats('Server');

const report = {
  类别: '服务器',
  设备总数: stats.total,
  状态分布: stats.byStatus,
  厂商分布: stats.byVendor,
  类型分布: stats.byType,
  问题设备数: stats.problemDevices.length,
  接口总数: stats.totalInterfaces
};

console.log('设备统计报告:', JSON.stringify(report, null, 2));
```

### 场景 4: 搜索和过滤设备

```typescript
// 搜索包含 "Windows" 的服务器
const windowsServers = await client.searchDevices('Windows', 'Server');
console.log(`Windows 服务器: ${windowsServers.length}`);

// 按厂商过滤
const microsoftDevices = await client.listDevices({
  category: 'Server',
  vendorName: 'Microsoft',
  page: 1,
  rows: 50
});
```

### 场景 5: 分页获取设备

```typescript
// 获取第一页（50条）
const page1 = await client.listDevices({
  category: 'Server',
  page: 1,
  rows: 50
});

// 获取第二页
const page2 = await client.listDevices({
  category: 'Server',
  page: 2,
  rows: 50
});

console.log(`总记录数: ${page1.records}`);
console.log(`第1页: ${page1.rows.length} 条`);
console.log(`第2页: ${page2.rows.length} 条`);
```

---

## ⚠️ 注意事项

1. **total vs records 字段**:
   - `total` 字段可能为 `0`（即使有数据）
   - ✅ **使用 `records` 字段获取实际总记录数**
   - 这是 API 的一个已知行为

2. **本地化问题**:
   - `category` 参数使用**英文**值（如 `Server`）
   - 返回的 `category` 字段可能是**中文**（如 `"服务器"`）
   - `statusStr` 字段也可能是中文（如 `"正常"`, `"问题"`）
   - 建议使用 `statusNum` 进行状态判断（数值不受本地化影响）

3. **分页处理**:
   - 使用 `page` 和 `rows` 参数进行分页
   - 默认每页 50 条记录
   - 使用 `records` 字段判断总记录数，而不是 `total`

4. **限流控制**:
   - 限流：500 请求/分钟
   - 超过限制会被阻止 1 分钟
   - 建议实现请求重试和退避策略

5. **自动分页**:
   - 如果设备数量较多，使用 `getAllDevices` 方法自动处理分页
   - 注意控制请求频率以避免限流

6. **设备名称格式**:
   - `deviceName` 格式：`{IP地址}.{设备ID}`
   - 示例：`"10.141.69.123.10000000001"`
   - 可用于其他 API 调用（如 `getInterfaces`）

---

## 📊 数据示例分析

基于您提供的实际返回数据：

```json
{
  "total": 0,
  "page": 1,
  "rows": [...44个设备...],
  "records": 44
}
```

**分析**:
- ⚠️ `total` 为 `0`，但实际有 44 条记录
- ✅ `records` 为 `44`，这是真实的记录数
- 所有设备类别为 `"服务器"`（中文）
- 状态包括：`"正常"` (statusNum: "5") 和 `"问题"` (statusNum: "2")
- 设备类型包括：`"Windows 2019"`, `"Windows 2016"`, `"Huawei-USG5550"`

---

## 📚 参考

- [OpManager REST API 官方文档 - v2/listDevices](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#listDevices-v2)
- 已验证的 API URL: `https://10.141.69.192:8061/api/json/v2/device/listDevices?category=Server`

---

## ✅ 总结

**`v2/listDevices` API** 是获取设备列表的主要方式：

- ✅ 支持按类别、类型、厂商等过滤
- ✅ 支持分页（`page`, `rows`）
- ✅ 返回设备详细信息（包括接口数量、状态等）
- ⚠️ 注意 `total` 字段可能为 0，使用 `records` 获取真实总数
- ⚠️ 本地化问题：参数用英文，返回可能为中文

**使用建议**:
- 使用 `records` 字段获取总记录数
- 使用 `statusNum` 进行状态判断（避免本地化问题）
- 对于大量设备，使用自动分页方法
- 定期获取设备统计，监控问题设备
