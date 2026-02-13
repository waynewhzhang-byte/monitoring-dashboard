# OpManager getInterfaces API 最终方案（已验证）

## ✅ 已验证的解决方案

**API**: `/api/json/device/getInterfaces`  
**功能**: 获取指定设备的所有网络接口  
**状态**: ✅ 已验证可用

---

## 📋 API 详细信息

### 请求格式

```
GET /api/json/device/getInterfaces?name={deviceName}
```

**完整 URL 示例**:
```
https://10.141.69.192:8061/api/json/device/getInterfaces?name=1.1.1.45.10000000001
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `name` | String | ✅ 是 | 设备名称<br>- Managed Entity name（设备快照页面 URL 中的名称）<br>- 或 `listDevices` API 响应中的 `deviceName` 属性值<br>- 示例: `1.1.1.45.10000000001` |

### 认证方式

**推荐**: 通过请求头传递 API Key
```http
GET /api/json/device/getInterfaces?name=1.1.1.45.10000000001
Headers:
  apiKey: YOUR_API_KEY
```

**兼容方式**: 通过 URL 参数传递（已废弃）
```
GET /api/json/device/getInterfaces?apiKey=YOUR_API_KEY&name=1.1.1.45.10000000001
```

### 限流规则

- **限流**: 20 请求/分钟
- **超限惩罚**: 超过限制将被阻止 1 分钟

---

## 📊 返回数据格式（基于实际响应）

### 成功响应 (HTTP 200)

```json
{
  "isSNMP": true,
  "downCount": "11",
  "interfaceCount": "33",
  "showPollingStatusColumn": true,
  "interfaces": [
    {
      "ifIndex": "1",
      "ifIndexNum": 1,
      "name": "IF-1.1.1.45.10000000001-10000006529",
      "displayName": "GigabitEthernet1/0/1-GigabitEthernet1/0/1 Interface",
      "trimmedDispName": "GigabitEthernet1/0/1-Gig...",
      "ifType": "Ethernet",
      "type": "Interface",
      "ipAddress": "",
      "statusNum": "5",
      "status": "5",
      "statusStr": "正常",
      "statusString": "Clear",
      "ifAdminStatus": "1",
      "ifOperStatus": "1",
      "inSpeed": "10 M",
      "outSpeed": "10 M",
      "inTraffic": "3.768 K",
      "outTraffic": "1.144 M",
      "inUtil": "0.04",
      "outUtil": "11.44",
      "errors": "0",
      "isSuppressed": false,
      "isSubInterface": "false",
      "nfEnabled": "false",
      "pollingStatus": "0",
      "moid": "10000006529",
      "imagePath": "/apiclient/ember/images/intfTypes/ifType6.gif",
      "bgColor": "00ff00",
      "RouterPortType": "",
      "connected-device": "",
      "suppressedMessage": ""
    }
  ]
}
```

### 字段说明

#### 顶层字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `isSNMP` | Boolean | 是否为 SNMP 设备 |
| `downCount` | String | 关闭/停止的接口数量 |
| `interfaceCount` | String | 接口总数 |
| `showPollingStatusColumn` | Boolean | 是否显示轮询状态列 |
| `interfaces` | Array | 接口列表 |

#### 接口对象字段

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `ifIndex` | String | 接口索引（SNMP） | `"1"` |
| `ifIndexNum` | Number | 接口索引（数字） | `1` |
| `name` | String | 接口唯一名称 | `"IF-1.1.1.45.10000000001-10000006529"` |
| `displayName` | String | 接口显示名称 | `"GigabitEthernet1/0/1-GigabitEthernet1/0/1 Interface"` |
| `trimmedDispName` | String | 截断的显示名称 | `"GigabitEthernet1/0/1-Gig..."` |
| `ifType` | String | 接口类型 | `"Ethernet"`, `"L3ipvlan"` |
| `type` | String | 接口类型（通用） | `"Interface"` |
| `ipAddress` | String | IP 地址 | `""`, `"10.141.0.29"` |
| `statusNum` | String | 状态编号 | `"5"` (正常), `"1"` (严重), `"2"` (问题) |
| `status` | String | 状态（同 statusNum） | `"5"` |
| `statusStr` | String | 状态字符串（中文） | `"正常"`, `"严重"`, `"问题"` |
| `statusString` | String | 状态字符串（英文） | `"Clear"`, `"Critical"`, `"Trouble"` |
| `ifAdminStatus` | String | 管理状态 | `"1"` (Up/运行), `"2"` (Down/停止) |
| `ifOperStatus` | String | 运行状态 | `"1"` (Up/运行), `"2"` (Down/停止) |
| `inSpeed` | String | 入站速度 | `"10 M"`, `"10 G"` |
| `outSpeed` | String | 出站速度 | `"10 M"`, `"100 M"`, `"10 G"` |
| `inTraffic` | String | 入站流量 | `"3.768 K"`, `"0 "` |
| `outTraffic` | String | 出站流量 | `"1.144 M"`, `"966.624 K"` |
| `inUtil` | String | 入站利用率（百分比） | `"0.04"`, `"0.0"` |
| `outUtil` | String | 出站利用率（百分比） | `"11.44"`, `"0.97"` |
| `errors` | String | 错误数 | `"0"`, `"13011"` |
| `isSuppressed` | Boolean | 是否被抑制 | `false` |
| `isSubInterface` | String | 是否为子接口 | `"false"`, `"true"` |
| `nfEnabled` | String | NetFlow 是否启用 | `"false"` |
| `pollingStatus` | String | 轮询状态 | `"0"` |
| `moid` | String | 管理对象 ID | `"10000006529"` |
| `imagePath` | String | 图标路径 | `"/apiclient/ember/images/intfTypes/ifType6.gif"` |
| `bgColor` | String | 背景颜色（十六进制） | `"00ff00"` (绿色), `"ff8000"` (橙色) |
| `RouterPortType` | String | 路由器端口类型 | `""`, `"Eth"` |
| `connected-device` | String | 连接的设备 | `""` |
| `suppressedMessage` | String | 抑制消息 | `""` |

### 状态值映射

#### statusNum / status 值

| 值 | 中文 (statusStr) | 英文 (statusString) | 说明 |
|----|------------------|---------------------|------|
| `"1"` | `"严重"` | `"Critical"` | 严重问题 |
| `"2"` | `"问题"` | `"Trouble"` | 存在问题 |
| `"3"` | `"注意"` | `"Attention"` | 需要注意 |
| `"4"` | `"服务中断"` | `"Service Down"` | 服务中断 |
| `"5"` | `"正常"` | `"Clear"` | 正常状态 ✅ |
| `"7"` | `"未知"` | `"Unknown"` | 未知状态 |

#### ifAdminStatus / ifOperStatus 值

| 值 | 说明 |
|----|------|
| `"1"` | Up / 运行 ✅ |
| `"2"` | Down / 停止 ❌ |

---

## 💻 代码示例

### TypeScript / JavaScript

```typescript
import axios, { AxiosInstance } from 'axios';

interface InterfaceResponse {
  isSNMP: boolean;
  downCount: string;
  interfaceCount: string;
  showPollingStatusColumn: boolean;
  interfaces: Array<{
    ifIndex: string;
    ifIndexNum: number;
    name: string;
    displayName: string;
    trimmedDispName: string;
    ifType: string;
    type: string;
    ipAddress: string;
    statusNum: string;
    status: string;
    statusStr: string;
    statusString: string;
    ifAdminStatus: string;
    ifOperStatus: string;
    inSpeed: string;
    outSpeed: string;
    inTraffic: string;
    outTraffic: string;
    inUtil: string;
    outUtil: string;
    errors: string;
    isSuppressed: boolean;
    isSubInterface: string;
    nfEnabled: string;
    pollingStatus: string;
    moid: string;
    imagePath: string;
    bgColor: string;
    RouterPortType: string;
    'connected-device': string;
    suppressedMessage: string;
  }>;
}

class OpManagerInterfaceClient {
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
   * 获取指定设备的所有接口
   * @param deviceName 设备名称（如：1.1.1.45.10000000001）
   */
  async getDeviceInterfaces(deviceName: string): Promise<InterfaceResponse> {
    const response = await this.client.get('/api/json/device/getInterfaces', {
      params: {
        name: deviceName
      }
    });

    return response.data;
  }

  /**
   * 获取指定设备的所有运行中的接口
   */
  async getDeviceRunningInterfaces(deviceName: string) {
    const result = await this.getDeviceInterfaces(deviceName);
    
    return result.interfaces.filter(
      iface => iface.ifOperStatus === '1' && iface.ifAdminStatus === '1'
    );
  }

  /**
   * 获取指定设备的所有正常状态的接口
   */
  async getDeviceNormalInterfaces(deviceName: string) {
    const result = await this.getDeviceInterfaces(deviceName);
    
    return result.interfaces.filter(
      iface => iface.statusNum === '5' || iface.statusStr === '正常'
    );
  }

  /**
   * 获取指定设备的所有有问题的接口
   */
  async getDeviceProblemInterfaces(deviceName: string) {
    const result = await this.getDeviceInterfaces(deviceName);
    
    return result.interfaces.filter(
      iface => iface.statusNum !== '5' && iface.statusStr !== '正常'
    );
  }

  /**
   * 获取指定设备的所有以太网接口
   */
  async getDeviceEthernetInterfaces(deviceName: string) {
    const result = await this.getDeviceInterfaces(deviceName);
    
    return result.interfaces.filter(
      iface => iface.ifType === 'Ethernet'
    );
  }

  /**
   * 获取指定设备的接口统计信息
   */
  async getDeviceInterfaceStats(deviceName: string) {
    const result = await this.getDeviceInterfaces(deviceName);
    
    const stats = {
      total: parseInt(result.interfaceCount),
      down: parseInt(result.downCount),
      up: parseInt(result.interfaceCount) - parseInt(result.downCount),
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    result.interfaces.forEach(iface => {
      // 按状态统计
      const status = iface.statusStr || iface.statusString;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // 按类型统计
      const type = iface.ifType || iface.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }
}

// 使用示例
const client = new OpManagerInterfaceClient(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 获取设备所有接口
const result = await client.getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`设备接口总数: ${result.interfaceCount}`);
console.log(`关闭的接口数: ${result.downCount}`);

// 获取运行中的接口
const runningInterfaces = await client.getDeviceRunningInterfaces('1.1.1.45.10000000001');
console.log(`运行中的接口数: ${runningInterfaces.length}`);

// 获取正常状态的接口
const normalInterfaces = await client.getDeviceNormalInterfaces('1.1.1.45.10000000001');
console.log(`正常状态的接口数: ${normalInterfaces.length}`);

// 获取接口统计信息
const stats = await client.getDeviceInterfaceStats('1.1.1.45.10000000001');
console.log('接口统计:', stats);
```

### Python

```python
import requests
from typing import Dict, List, Any

class OpManagerInterfaceClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({'apiKey': api_key})

    def get_device_interfaces(self, device_name: str) -> Dict[str, Any]:
        """
        获取指定设备的所有接口
        
        Args:
            device_name: 设备名称（如：1.1.1.45.10000000001）
        
        Returns:
            接口响应数据
        """
        response = self.session.get(
            f'{self.base_url}/api/json/device/getInterfaces',
            params={'name': device_name}
        )
        response.raise_for_status()
        return response.json()

    def get_device_running_interfaces(self, device_name: str) -> List[Dict[str, Any]]:
        """获取指定设备的所有运行中的接口"""
        result = self.get_device_interfaces(device_name)
        return [
            iface for iface in result['interfaces']
            if iface['ifOperStatus'] == '1' and iface['ifAdminStatus'] == '1'
        ]

    def get_device_normal_interfaces(self, device_name: str) -> List[Dict[str, Any]]:
        """获取指定设备的所有正常状态的接口"""
        result = self.get_device_interfaces(device_name)
        return [
            iface for iface in result['interfaces']
            if iface['statusNum'] == '5' or iface['statusStr'] == '正常'
        ]

    def get_device_interface_stats(self, device_name: str) -> Dict[str, Any]:
        """获取指定设备的接口统计信息"""
        result = self.get_device_interfaces(device_name)
        
        stats = {
            'total': int(result['interfaceCount']),
            'down': int(result['downCount']),
            'up': int(result['interfaceCount']) - int(result['downCount']),
            'byStatus': {},
            'byType': {}
        }

        for iface in result['interfaces']:
            # 按状态统计
            status = iface.get('statusStr') or iface.get('statusString', 'Unknown')
            stats['byStatus'][status] = stats['byStatus'].get(status, 0) + 1

            # 按类型统计
            if_type = iface.get('ifType') or iface.get('type', 'Unknown')
            stats['byType'][if_type] = stats['byType'].get(if_type, 0) + 1

        return stats

# 使用示例
client = OpManagerInterfaceClient(
    'https://10.141.69.192:8061',
    'YOUR_API_KEY'
)

# 获取设备所有接口
result = client.get_device_interfaces('1.1.1.45.10000000001')
print(f"设备接口总数: {result['interfaceCount']}")
print(f"关闭的接口数: {result['downCount']}")

# 获取运行中的接口
running = client.get_device_running_interfaces('1.1.1.45.10000000001')
print(f"运行中的接口数: {len(running)}")

# 获取接口统计信息
stats = client.get_device_interface_stats('1.1.1.45.10000000001')
print('接口统计:', stats)
```

---

## 🔍 实际使用场景

### 场景 1: 获取设备所有接口

```typescript
const result = await client.getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`接口总数: ${result.interfaceCount}`);
console.log(`关闭的接口: ${result.downCount}`);
```

### 场景 2: 过滤运行中的接口

```typescript
const runningInterfaces = result.interfaces.filter(
  iface => iface.ifOperStatus === '1' && iface.ifAdminStatus === '1'
);
console.log(`运行中的接口: ${runningInterfaces.length}`);
```

### 场景 3: 过滤正常状态的接口

```typescript
const normalInterfaces = result.interfaces.filter(
  iface => iface.statusNum === '5' || iface.statusStr === '正常'
);
console.log(`正常状态的接口: ${normalInterfaces.length}`);
```

### 场景 4: 获取高流量接口

```typescript
const highTrafficInterfaces = result.interfaces.filter(iface => {
  const outUtil = parseFloat(iface.outUtil || '0');
  return outUtil > 80; // 出站利用率超过 80%
});
console.log(`高流量接口: ${highTrafficInterfaces.length}`);
```

### 场景 5: 获取有错误的接口

```typescript
const errorInterfaces = result.interfaces.filter(
  iface => parseInt(iface.errors || '0') > 0
);
console.log(`有错误的接口: ${errorInterfaces.length}`);
```

---

## ⚠️ 注意事项

1. **限流控制**: 
   - 限流：20 请求/分钟
   - 超过限制会被阻止 1 分钟
   - 建议实现请求重试和退避策略

2. **设备名称格式**:
   - 使用完整的设备名称（如：`1.1.1.45.10000000001`）
   - 可以从 `listDevices` API 的 `deviceName` 字段获取

3. **状态值**:
   - 系统可能返回中文状态（`statusStr`）或英文状态（`statusString`）
   - 建议同时检查 `statusNum` 数字值（更可靠）

4. **性能考虑**:
   - 该 API 返回设备的所有接口，不支持分页
   - 如果设备接口数量很大，可能需要较长时间

5. **错误处理**:
   - 检查 HTTP 状态码
   - 处理限流错误（429）
   - 处理认证错误（401/403）
   - 处理设备不存在的情况

---

## 📚 参考

- [OpManager REST API 官方文档 - getInterfaces](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getInterfaces)
- 已验证的 API URL: `https://10.141.69.192:8061/api/json/device/getInterfaces?name=1.1.1.45.10000000001`

---

## ✅ 总结

**最终推荐方案**: 使用 `getInterfaces` API

- ✅ 简单直接，专门为获取设备接口设计
- ✅ 已验证可用
- ✅ 返回完整的接口信息
- ✅ 包含统计信息（interfaceCount, downCount）
- ⚠️ 限流较低（20 请求/分钟），需要注意控制请求频率
