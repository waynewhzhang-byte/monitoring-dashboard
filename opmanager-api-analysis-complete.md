# OpManager 接口查询 API 完整分析

## 📋 API 对比分析

OpManager 提供了**两个不同的 API** 来获取接口信息：

### 1. `listInterfaces` - 列出所有接口（支持过滤）

**API 端点**: `/api/json/device/listInterfaces`  
**功能**: 列出 OpManager 中所有被监控的接口（可跨设备）  
**限流**: 500 请求/分钟

**特点**:
- ✅ 支持分页（`page`, `rows`）
- ✅ 支持排序（`sortByColumn`, `sortByType`）
- ✅ 支持多种过滤器（`filters`, `severity`, `type`, `classification` 等）
- ❌ **不支持 `name` 参数**（会返回 `EXTRA_PARAM_FOUND` 错误）
- ❌ **不支持 `deviceName` 在 filters 中**（会返回 `PATTERN_NOT_MATCHED` 错误）
- ✅ **支持 `displayName` 在 filters 中**（用于按设备显示名称过滤）

### 2. `getInterfaces` - 获取指定设备的接口（推荐）⭐

**API 端点**: `/api/json/device/getInterfaces`  
**功能**: 获取指定设备的所有接口  
**限流**: 20 请求/分钟

**特点**:
- ✅ **支持 `name` 参数**（必需参数，指定设备名称）
- ✅ 专门用于获取单个设备的接口
- ✅ 返回格式更简洁
- ❌ 不支持分页（返回设备的所有接口）
- ❌ 不支持复杂的过滤条件

---

## ✅ 正确的解决方案

### 方案 1: 使用 `getInterfaces` API（推荐）⭐

这是**专门设计**用于获取指定设备接口的 API。

**API URL**:
```
https://10.141.69.192:8061/api/json/device/getInterfaces?name=1.1.1.45.10000000001
```

**参数说明**:
- `name` (必需): 设备名称
  - 可以是 Managed Entity name（设备快照页面 URL 中的名称）
  - 或 `listDevices` API 响应中的 `deviceName` 属性值
  - 示例: `1.1.1.45.10000000001` 或 `10.5.5.1`

**TypeScript 代码**:
```typescript
import axios from 'axios';

const baseUrl = 'https://10.141.69.192:8061';
const apiKey = 'YOUR_API_KEY';

async function getDeviceInterfaces(deviceName: string) {
  const response = await axios.get(`${baseUrl}/api/json/device/getInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params: {
      name: deviceName
    }
  });

  return response.data;
}

// 使用示例
const result = await getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`接口数量: ${result.interfaceCount}`);
console.log('接口列表:', result.interfaces);
```

**返回数据格式**:
```json
{
  "isSNMP": true,
  "downCount": "2",
  "interfaceCount": "2",
  "showPollingStatusColumn": true,
  "interfaces": [
    {
      "name": "IF-10.5.5.1-1808",
      "displayName": "Ethernet0-ifAlias",
      "ifIndex": "1",
      "ifType": "Ethernet",
      "ipAddress": "10.5.5.1",
      "statusNum": "7",
      "statusStr": "Unknown",
      "inSpeed": "10 M",
      "outSpeed": "10 M",
      "inTraffic": "NA",
      "outTraffic": "NA",
      "inUtil": "NA",
      "outUtil": "NA",
      "isSuppressed": false,
      "moid": "1808"
    }
  ]
}
```

---

### 方案 2: 使用 `listInterfaces` API + `displayName` 过滤

如果必须使用 `listInterfaces` API（例如需要分页或复杂过滤），可以使用 `displayName` 在 filters 中过滤。

**API URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22displayName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E7%94%9F%E4%BA%A7%E6%A5%BC5%E6%A5%BC%E8%BF%90%E8%A1%8C%E9%83%A8%E4%BA%A4%E6%8D%A2%E6%9C%BA%22%7D%5D%7D
```

**filters JSON**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "displayName",
      "op": "eq",
      "data": "生产楼5楼运行部交换机"
    }
  ]
}
```

**TypeScript 代码**:
```typescript
async function getDeviceInterfacesByDisplayName(displayName: string) {
  const filters = {
    groupOp: 'AND',
    rules: [
      {
        field: 'displayName',
        op: 'eq',
        data: displayName
      }
    ]
  };

  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params: {
      isFluidic: true,
      rows: 100,
      page: 1,
      filters: JSON.stringify(filters, { ensureAscii: false })
    }
  });

  return response.data;
}
```

---

## ❌ 错误的用法（会导致错误）

### 错误 1: 在 `listInterfaces` 中使用 `name` 参数

```
https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=100&page=1
```

**错误响应**:
```json
{
  "error": {
    "message": "请求中找到的非相关参数。",
    "errorcode": "EXTRA_PARAM_FOUND"
  }
}
```

**原因**: `listInterfaces` API 不支持 `name` 参数。

---

### 错误 2: 在 filters 中使用 `deviceName` 字段

```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22deviceName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%221.1.1.45.10000000001%22%7D%5D%7D
```

**错误响应**:
```json
{
  "error": {
    "message": "为参数field指定的输入与所需的模式不匹配。",
    "errorcode": "PATTERN_NOT_MATCHED"
  }
}
```

**原因**: `deviceName` 不在 filters 支持的字段列表中。

**filters 支持的字段**:
- `interfaceDisplayName`
- `displayName` ✅
- `adminStatus`
- `operStatus`
- `ipAddress`
- `type`
- `statusNum`
- `isSuppressed`
- `probeName`
- `UDF1-UDF12`

---

## 📊 两个 API 的对比

| 特性 | `listInterfaces` | `getInterfaces` |
|------|------------------|-----------------|
| **用途** | 列出所有接口（跨设备） | 获取指定设备的接口 |
| **按设备过滤** | 使用 `displayName` 在 filters 中 | 使用 `name` 参数 ✅ |
| **分页支持** | ✅ 支持 | ❌ 不支持 |
| **排序支持** | ✅ 支持 | ❌ 不支持 |
| **复杂过滤** | ✅ 支持多种过滤器 | ❌ 不支持 |
| **限流** | 500 请求/分钟 | 20 请求/分钟 |
| **返回格式** | `{ total, records, page, rows: [...] }` | `{ interfaceCount, interfaces: [...] }` |
| **推荐场景** | 需要跨设备查询、分页、复杂过滤 | 获取单个设备的所有接口 ⭐ |

---

## 🎯 使用建议

### 场景 1: 获取指定设备的所有接口

**推荐**: 使用 `getInterfaces` API

```typescript
const result = await getDeviceInterfaces('1.1.1.45.10000000001');
```

**优点**:
- ✅ 简单直接
- ✅ 专门为此设计
- ✅ 不需要复杂的过滤

---

### 场景 2: 获取指定设备的接口 + 状态过滤

**推荐**: 使用 `getInterfaces` API，然后在客户端过滤

```typescript
const result = await getDeviceInterfaces('1.1.1.45.10000000001');
const runningInterfaces = result.interfaces.filter(
  iface => iface.statusNum === '5' || iface.statusStr === '正常'
);
```

或者使用 `listInterfaces` + `displayName` + `operStatus` 过滤：

```typescript
const filters = {
  groupOp: 'AND',
  rules: [
    { field: 'displayName', op: 'eq', data: '生产楼5楼运行部交换机' },
    { field: 'operStatus', op: 'eq', data: '运行' }
  ]
};
```

---

### 场景 3: 跨设备查询接口（需要分页）

**推荐**: 使用 `listInterfaces` API

```typescript
const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
  headers: { 'apiKey': apiKey },
  params: {
    isFluidic: true,
    rows: 100,
    page: 1,
    severity: '1,2'  // 只获取 Critical 和 Trouble 的接口
  }
});
```

---

## 📝 完整的工具函数

```typescript
import axios, { AxiosInstance } from 'axios';

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
   * 获取指定设备的所有接口（推荐方法）
   * 使用 getInterfaces API
   */
  async getDeviceInterfaces(deviceName: string) {
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
    
    // 在客户端过滤运行中的接口
    // statusNum: 5 = Clear/正常, operStatus: 1 = Up
    return result.interfaces.filter(
      iface => iface.statusNum === '5' || 
               iface.ifOperStatus === '1' ||
               iface.statusStr === '正常' ||
               iface.statusStr === 'Clear'
    );
  }

  /**
   * 使用 listInterfaces API 按设备显示名称过滤
   * 适用于需要分页或复杂过滤的场景
   */
  async listInterfacesByDeviceDisplayName(
    displayName: string,
    options?: {
      page?: number;
      rows?: number;
      additionalFilters?: any;
    }
  ) {
    const rules: any[] = [
      {
        field: 'displayName',
        op: 'eq',
        data: displayName
      }
    ];

    if (options?.additionalFilters) {
      rules.push(...options.additionalFilters);
    }

    const filters = {
      groupOp: 'AND',
      rules
    };

    const response = await this.client.get('/api/json/device/listInterfaces', {
      params: {
        isFluidic: true,
        rows: options?.rows || 100,
        page: options?.page || 1,
        filters: JSON.stringify(filters, { ensureAscii: false })
      }
    });

    return response.data;
  }
}

// 使用示例
const client = new OpManagerInterfaceClient(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 方法 1: 使用 getInterfaces（推荐）
const interfaces1 = await client.getDeviceInterfaces('1.1.1.45.10000000001');

// 方法 2: 获取运行中的接口
const runningInterfaces = await client.getDeviceRunningInterfaces('1.1.1.45.10000000001');

// 方法 3: 使用 listInterfaces + displayName
const interfaces2 = await client.listInterfacesByDeviceDisplayName('生产楼5楼运行部交换机');
```

---

## 🔍 关键发现总结

1. **✅ 正确方法**: 使用 `getInterfaces` API + `name` 参数
   ```
   /api/json/device/getInterfaces?name=设备名称
   ```

2. **✅ 备选方法**: 使用 `listInterfaces` API + `displayName` 在 filters 中
   ```
   /api/json/device/listInterfaces?filters={"groupOp":"AND","rules":[{"field":"displayName","op":"eq","data":"设备显示名称"}]}
   ```

3. **❌ 错误方法 1**: 在 `listInterfaces` 中使用 `name` 参数
   - 错误: `EXTRA_PARAM_FOUND`

4. **❌ 错误方法 2**: 在 filters 中使用 `deviceName` 字段
   - 错误: `PATTERN_NOT_MATCHED`

---

## 📚 参考文档

- [OpManager REST API 官方文档 - listInterfaces](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#listInterfaces)
- [OpManager REST API 官方文档 - getInterfaces](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getInterfaces)
