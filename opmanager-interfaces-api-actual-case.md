# OpManager Interfaces API 实际案例分析

## 实际 API URL 分析

### 提供的 URL（存在问题）

```
https://10.141.69.192：8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22Up%22%7D%5D%7D
```

### 问题分析

#### 1. URL 格式错误
- **问题**: 使用了中文冒号 `：` 而不是英文冒号 `:`
- **错误**: `https://10.141.69.192：8061`
- **正确**: `https://10.141.69.192:8061`

#### 2. 过滤器值不匹配（本地化问题）
- **问题**: 过滤器使用英文值 `"Up"`，但返回数据使用中文值 `"运行"`
- **实际返回的状态值**:
  - `operStatus: "运行"` (对应英文 "Up")
  - `operStatus: "停止"` (对应英文 "Down")
  - `adminStatus: "运行"` (对应英文 "Up")
  - `adminStatus: "停止"` (对应英文 "Down")
  - `statusStr: "正常"` (对应英文 "Clear")
  - `statusStr: "问题"` (对应英文 "Trouble")
  - `statusStr: "严重"` (对应英文 "Critical")

#### 3. 过滤器未生效
- **预期**: 只返回 `operStatus = "Up"` 的接口
- **实际**: 返回了 `operStatus = "停止"` 的接口（第1个和第4个）
- **原因**: 过滤器值 `"Up"` 与中文值 `"运行"` 不匹配

---

## 返回数据分析

### 实际返回的接口数据

```json
{
  "total": "0",
  "records": "0",
  "page": "1",
  "rows": [
    {
      "interfaceDisplayName": "Ten-GigabitEthernet1/0/25-link to 3Q 7503",
      "operStatus": "停止",  // ❌ 应该被过滤掉
      "adminStatus": "运行",
      "statusNum": 2,
      "statusStr": "问题"
    },
    {
      "interfaceDisplayName": "pcapif4-pcapif4",
      "operStatus": "运行",  // ✅ 符合条件
      "adminStatus": "运行",
      "statusNum": 5,
      "statusStr": "正常"
    },
    {
      "interfaceDisplayName": "Bridge-Aggregation23-HCI_10.141.68.83 YEWU",
      "operStatus": "运行",  // ✅ 符合条件
      "adminStatus": "运行",
      "statusNum": 5,
      "statusStr": "正常"
    },
    {
      "interfaceDisplayName": "GigabitEthernet1/0/16-GigabitEthernet1/0/16 Interface",
      "operStatus": "停止",  // ❌ 应该被过滤掉
      "adminStatus": "停止",
      "statusNum": 1,
      "statusStr": "严重"
    }
  ]
}
```

### 字段映射（中文 ↔ 英文）

| 中文值 | 英文值 | 说明 |
|--------|--------|------|
| `运行` | `Up` | 接口正常运行 |
| `停止` | `Down` | 接口停止/关闭 |
| `正常` | `Clear` | 状态正常 |
| `问题` | `Trouble` | 存在问题 |
| `严重` | `Critical` | 严重问题 |
| `注意` | `Attention` | 需要注意 |

---

## 修正后的 API URL

### 方案 1: 使用中文值（推荐）

**修正后的 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E8%BF%90%E8%A1%8C%22%7D%5D%7D
```

**filters 参数解码后**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "operStatus",
      "op": "eq",
      "data": "运行"  // ✅ 使用中文值
    }
  ]
}
```

### 方案 2: 使用 statusNum（数字值，不受本地化影响）

**URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22statusNum%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%225%22%7D%5D%7D
```

**filters 参数解码后**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "statusNum",
      "op": "eq",
      "data": "5"  // 5 = Clear/正常，表示运行中的接口
    }
  ]
}
```

**statusNum 值说明**:
- `1` - Critical（严重）
- `2` - Trouble（问题）
- `3` - Attention（注意）
- `4` - Service Down（服务中断）
- `5` - Clear（正常/运行中）
- `7` - Unmanaged（未管理）

---

## 完整的修正示例

### 示例 1: 只获取运行中的接口（使用中文值）

**JavaScript/TypeScript 代码**:
```typescript
import axios from 'axios';

const baseUrl = 'https://10.141.69.192:8061';
const apiKey = 'YOUR_API_KEY'; // 通过请求头传递

// 构建 filters 对象
const filters = {
  groupOp: 'AND',
  rules: [
    {
      field: 'operStatus',
      op: 'eq',
      data: '运行'  // 使用中文值
    }
  ]
};

// 发送请求
const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
  headers: {
    'apiKey': apiKey  // 推荐：通过请求头传递
  },
  params: {
    isFluidic: true,
    rows: 100,
    page: 1,
    filters: JSON.stringify(filters)  // 自动 URL 编码
  }
});

console.log('运行中的接口:', response.data.rows);
```

### 示例 2: 只获取运行中的接口（使用 statusNum）

```typescript
const filters = {
  groupOp: 'AND',
  rules: [
    {
      field: 'statusNum',
      op: 'eq',
      data: '5'  // 5 = Clear/正常
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
    filters: JSON.stringify(filters)
  }
});
```

### 示例 3: 组合多个条件（运行中 + 正常状态）

```typescript
const filters = {
  groupOp: 'AND',
  rules: [
    {
      field: 'operStatus',
      op: 'eq',
      data: '运行'
    },
    {
      field: 'adminStatus',
      op: 'eq',
      data: '运行'
    },
    {
      field: 'statusNum',
      op: 'eq',
      data: '5'  // 正常状态
    }
  ]
};
```

### 示例 4: 使用 severity 参数（更简单的方式）

```typescript
// 只获取正常状态的接口（severity=5）
const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
  headers: {
    'apiKey': apiKey
  },
  params: {
    isFluidic: true,
    rows: 100,
    page: 1,
    severity: '5',  // 5 = Clear/正常
    sortByColumn: 'statusNum',
    sortByType: 'desc'
  }
});
```

---

## Python 示例

```python
import requests
import json
from urllib.parse import urlencode

base_url = 'https://10.141.69.192:8061'
api_key = 'YOUR_API_KEY'

# 方案 1: 使用中文值
filters = {
    'groupOp': 'AND',
    'rules': [
        {
            'field': 'operStatus',
            'op': 'eq',
            'data': '运行'  # 使用中文值
        }
    ]
}

params = {
    'isFluidic': 'true',
    'rows': 100,
    'page': 1,
    'filters': json.dumps(filters, ensure_ascii=False)  # 保持中文字符
}

headers = {
    'apiKey': api_key
}

response = requests.get(
    f'{base_url}/api/json/device/listInterfaces',
    headers=headers,
    params=params
)

interfaces = response.json()
print(f'运行中的接口数量: {len(interfaces["rows"])}')
```

---

## 状态值映射表

### operStatus / adminStatus 映射

| 中文 | 英文 | statusNum | 说明 |
|------|------|-----------|------|
| `运行` | `Up` | - | 接口正常运行 |
| `停止` | `Down` | - | 接口停止/关闭 |

### statusStr 映射

| 中文 | 英文 | statusNum | 说明 |
|------|------|-----------|------|
| `正常` | `Clear` | `5` | 状态正常 |
| `问题` | `Trouble` | `2` | 存在问题 |
| `严重` | `Critical` | `1` | 严重问题 |
| `注意` | `Attention` | `3` | 需要注意 |
| `服务中断` | `Service Down` | `4` | 服务中断 |
| `未管理` | `Unmanaged` | `7` | 未管理 |

---

## 最佳实践建议

### 1. 使用 statusNum 进行过滤（推荐）

**优点**:
- ✅ 不受本地化影响（数字值）
- ✅ 更可靠
- ✅ 性能更好

**示例**:
```typescript
// 只获取正常运行的接口
severity: '5'  // 或使用 filters 中的 statusNum
```

### 2. 检测系统语言并适配

```typescript
async function detectLanguage(baseUrl: string, apiKey: string) {
  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: { 'apiKey': apiKey },
    params: { isFluidic: true, rows: 1 }
  });
  
  const firstInterface = response.data.rows[0];
  const isChinese = firstInterface?.operStatus === '运行' || 
                    firstInterface?.operStatus === '停止';
  
  return isChinese ? 'zh' : 'en';
}

// 使用
const lang = await detectLanguage(baseUrl, apiKey);
const operStatusValue = lang === 'zh' ? '运行' : 'Up';
```

### 3. 使用 severity 参数（简单场景）

对于简单的状态过滤，使用 `severity` 参数更简单：

```typescript
// 只获取正常状态的接口
params: {
  severity: '5',  // Clear/正常
  // ...
}
```

### 4. 组合使用多种过滤方式

```typescript
// 使用 severity 进行初步过滤，再用 filters 精确过滤
params: {
  severity: '5',  // 只获取正常状态的接口
  filters: JSON.stringify({
    groupOp: 'AND',
    rules: [
      { field: 'operStatus', op: 'eq', data: '运行' },
      { field: 'type', op: 'eq', data: 'Ethernet' }
    ]
  })
}
```

---

## 常见问题排查

### Q1: 过滤器不生效？

**可能原因**:
1. ✅ 值不匹配（英文 vs 中文）
2. ✅ URL 编码问题
3. ✅ JSON 格式错误

**解决方案**:
- 检查返回数据中的实际值（中文还是英文）
- 使用 `statusNum` 代替字符串值
- 确保 JSON 正确 URL 编码

### Q2: 如何确定系统使用的语言？

**方法**:
1. 先发送一个不带过滤器的请求
2. 检查返回数据中的状态值
3. 如果是中文，使用中文值；如果是英文，使用英文值

### Q3: 为什么返回了不符合条件的接口？

**原因**:
- 过滤器值不匹配（最常见）
- API 版本问题
- 过滤器格式错误

**解决方案**:
- 使用 `statusNum` 代替字符串值
- 验证过滤器 JSON 格式
- 检查 API 版本兼容性

---

## 完整的 TypeScript 工具函数

```typescript
interface InterfaceFilter {
  operStatus?: '运行' | '停止' | 'Up' | 'Down';
  adminStatus?: '运行' | '停止' | 'Up' | 'Down';
  statusNum?: number;
  type?: string;
  severity?: string | number;
}

async function listInterfaces(
  baseUrl: string,
  apiKey: string,
  filters?: InterfaceFilter,
  options?: {
    page?: number;
    rows?: number;
    sortByColumn?: string;
    sortByType?: 'asc' | 'desc';
  }
) {
  const params: any = {
    isFluidic: true,
    rows: options?.rows || 100,
    page: options?.page || 1,
  };

  // 添加排序
  if (options?.sortByColumn) {
    params.sortByColumn = options.sortByColumn;
    params.sortByType = options.sortByType || 'desc';
  }

  // 添加 severity 过滤（简单场景）
  if (filters?.severity) {
    params.severity = String(filters.severity);
  }

  // 构建 filters 对象（复杂场景）
  if (filters && (filters.operStatus || filters.adminStatus || filters.statusNum || filters.type)) {
    const filterRules: any[] = [];

    if (filters.operStatus) {
      filterRules.push({
        field: 'operStatus',
        op: 'eq',
        data: filters.operStatus
      });
    }

    if (filters.adminStatus) {
      filterRules.push({
        field: 'adminStatus',
        op: 'eq',
        data: filters.adminStatus
      });
    }

    if (filters.statusNum) {
      filterRules.push({
        field: 'statusNum',
        op: 'eq',
        data: String(filters.statusNum)
      });
    }

    if (filters.type) {
      filterRules.push({
        field: 'type',
        op: 'eq',
        data: filters.type
      });
    }

    if (filterRules.length > 0) {
      params.filters = JSON.stringify({
        groupOp: 'AND',
        rules: filterRules
      });
    }
  }

  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params
  });

  return response.data;
}

// 使用示例
const interfaces = await listInterfaces(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY',
  {
    operStatus: '运行',  // 或 'Up'（根据系统语言）
    statusNum: 5        // 推荐：使用数字值
  },
  {
    page: 1,
    rows: 100,
    sortByColumn: 'statusNum',
    sortByType: 'desc'
  }
);
```

---

## 按设备过滤接口

### 需求：获取指定设备的所有接口

根据实际返回数据，每个接口都包含 `deviceName` 字段（如：`"1.1.1.45.10000000001"`），可以使用 filters 参数进行过滤。

### 方案 1: 使用 deviceName 过滤（推荐）

**filters JSON**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "deviceName",
      "op": "eq",
      "data": "1.1.1.45.10000000001"
    }
  ]
}
```

**完整 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22deviceName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%221.1.1.45.10000000001%22%7D%5D%7D
```

### 方案 2: 使用 displayName 过滤（官方支持）

如果 deviceName 不支持，可以使用设备的显示名称：

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

### 方案 3: 组合过滤（设备 + 状态）

**filters JSON**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "deviceName",
      "op": "eq",
      "data": "1.1.1.45.10000000001"
    },
    {
      "field": "operStatus",
      "op": "eq",
      "data": "运行"
    }
  ]
}
```

**完整 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22deviceName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%221.1.1.45.10000000001%22%7D%2C%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E8%BF%90%E8%A1%8C%22%7D%5D%7D
```

### TypeScript 代码示例

```typescript
import axios from 'axios';

const baseUrl = 'https://10.141.69.192:8061';
const apiKey = 'YOUR_API_KEY';

async function getDeviceInterfaces(deviceName: string) {
  const filters = {
    groupOp: 'AND',
    rules: [
      {
        field: 'deviceName',
        op: 'eq',
        data: deviceName
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
      filters: JSON.stringify(filters)
    }
  });

  return response.data;
}

// 使用示例
const interfaces = await getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`设备接口数量: ${interfaces.rows.length}`);
```

**详细文档**: 请参考 `opmanager-filter-interfaces-by-device.md`

---

## 总结

### 关键修正点

1. ✅ **URL 格式**: 使用英文冒号 `:` 而不是中文冒号 `：`
2. ✅ **过滤器值**: 使用中文值 `"运行"` 而不是英文值 `"Up"`（或使用 `statusNum`）
3. ✅ **API Key**: 推荐通过请求头传递，而不是 URL 参数
4. ✅ **按设备过滤**: 使用 `deviceName` 或 `displayName` 字段在 filters 中过滤

### 推荐方案

**最佳实践**: 使用 `statusNum` 或 `severity` 参数进行过滤，避免本地化问题：

```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&severity=5
```

或使用 filters 配合 statusNum：

```
filters={"groupOp":"AND","rules":[{"field":"statusNum","op":"eq","data":"5"}]}
```

**按设备过滤**:

```
filters={"groupOp":"AND","rules":[{"field":"deviceName","op":"eq","data":"1.1.1.45.10000000001"}]}
```
