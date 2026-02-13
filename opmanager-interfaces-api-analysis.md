# OpManager Interfaces API 分析文档

## API 概述

**接口名称**: `listInterfaces`  
**功能**: 列出 OpManager 中所有被监控的接口  
**HTTP 方法**: `GET`  
**API 端点**: `/api/json/device/listInterfaces`  
**限流规则**: 500 请求/分钟（超过限制将被阻止 1 分钟）

---

## 完整 API URL 格式

```
https://{host}:{port}/api/json/device/listInterfaces?apiKey={apiKey}&{其他参数}
```

**示例基础 URL**:
```
https://localhost:8060/api/json/device/listInterfaces?apiKey=***************&isFluidic=true&rows=100&page=1&sortByColumn=statusNum&sortByType=desc
```

---

## 参数详细说明

### 必需参数

| 参数名 | 类型 | 说明 | 允许值 |
|--------|------|------|--------|
| `apiKey` | String | OpManager API 密钥 | 从 OpManager 设置中获取 |
| `rows` | Integer | 每页返回的记录数（用于分页） | 1-20000 |

### 可选参数 - 分页和排序

| 参数名 | 类型 | 说明 | 允许值 | 示例 |
|--------|------|------|--------|------|
| `page` | Integer | 页码（与 `rows` 配合使用） | 1-5000 | `page=1` |
| `sortByType` | String | 排序方向 | `asc`, `desc` | `sortByType=desc` |
| `sortByColumn` | String | 排序字段 | 见下方字段列表 | `sortByColumn=statusNum` |

**sortByColumn 允许的字段**:
- `statusNum` - 状态编号
- `interfaceDisplayName` - 接口显示名称
- `displayName` - 显示名称
- `adminStatus` - 管理状态
- `operStatus` - 运行状态
- `ipAddress` - IP 地址
- `type` - 接口类型
- `inSpeed` - 入站速度
- `outSpeed` - 出站速度
- `inTraffic` - 入站流量
- `outTraffic` - 出站流量
- `isSuppressed` - 是否被抑制
- `probeName` - 探针名称
- `UDF1`, `UDF2`, ... `UDF12` - 自定义字段

### 可选参数 - 过滤器

| 参数名 | 类型 | 说明 | 允许值 | 示例 |
|--------|------|------|--------|------|
| `filters` | JSONObject | 自定义过滤条件（高级过滤） | 见下方详细说明 | 见示例 |
| `severity` | String | 按严重程度过滤 | `1-11`，可用逗号分隔多个值 | `severity=1,2` |
| `type` | String | 按接口类型过滤 | 接口类型名称 | `type=Ethernet` |
| `classification` | String | 按设备分类过滤 | 见下方分类列表 | `classification=Router` |
| `isIdleInterface` | Boolean | 仅显示空闲/非活动接口 | `true`, `false` | `isIdleInterface=true` |
| `intfGroupID` | Long | 按接口组 ID 过滤 | 长整型数字 | `intfGroupID=12345` |
| `customFields` | String | 按自定义字段过滤 | 字符串 | `customFields=value` |

**severity 值说明**:
- `1` - Critical（严重）
- `2` - Trouble（故障）
- `3` - Attention（注意）
- `4` - Service Down（服务中断）
- `5` - Clear（正常）
- `7` - Unmanaged（未管理）

**classification 允许值**:
- `Network`
- `Router`
- `Switch`
- `Printer`
- `Server`
- `PhysicalServer`
- `Windows`
- `Linux`
- `MSSQL`
- `Exchange`
- `DomainController`
- `Wireless`
- `Firewall`
- `IPMI`
- `MonitoringAgent`

### 可选参数 - 其他

| 参数名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `isFluidic` | Boolean | 内部用途标志 | `true`（建议设置） |
| `_search` | Boolean | 是否为搜索查询 | `false` |
| `nd` | Long | 请求时间戳 | 当前时间戳 |
| `intfProps` | Boolean | 是否获取额外属性（ifName, moid, physAddress） | `false` |
| `isAPlus` | Boolean | 高级接口监控标志 | `false` |

### filters 参数详细说明（高级过滤）

`filters` 是一个 JSON 对象，支持复杂的过滤条件组合：

**结构**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "字段名",
      "op": "操作符",
      "data": "值"
    }
  ]
}
```

**groupOp 允许值**:
- `AND` - 所有条件必须同时满足

**rules 数组中的字段 (field)**:
- `interfaceDisplayName` - 接口显示名称
- `displayName` - 显示名称
- `adminStatus` - 管理状态
- `operStatus` - 运行状态
- `ipAddress` - IP 地址
- `type` - 接口类型
- `statusNum` - 状态编号
- `isSuppressed` - 是否被抑制
- `probeName` - 探针名称
- `UDF1`, `UDF2`, ... `UDF12` - 自定义字段

**操作符 (op)**:
- `cn` - contains（包含）
- `eq` - equals（等于）

**注意**: `data` 字段不支持正则表达式

---

## 返回数据格式

### 成功响应 (HTTP 200)

```json
{
  "total": "总记录数",
  "records": "当前页记录数",
  "page": "当前页码",
  "rows": [
    {
      "id": "接口ID",
      "interfaceName": "接口名称（如：IF-10.5.5.1-494）",
      "interfaceDisplayName": "接口显示名称（如：Switch loopback interface-lo0）",
      "displayName": "设备显示名称（如：10.5.5.1）",
      "deviceName": "设备名称",
      "ipAddress": "IP地址",
      "type": "接口类型（如：Software Loopback, Proprietary Virtual）",
      "adminStatus": "管理状态（如：Up, Down）",
      "operStatus": "运行状态（如：Up, Down）",
      "statusNum": 状态编号（1-7）,
      "statusStr": "状态字符串（如：Trouble, Clear）",
      "interfaceStatus": 接口状态编号,
      "inSpeed": "入站速度（如：0 bps）",
      "outSpeed": "出站速度（如：0 bps）",
      "inTraffic": "入站流量（如：67.446 M (0.0%)）",
      "outTraffic": "出站流量（如：72.513 M (0.0%)）",
      "isSuppressed": false,
      "suppressedMessage": "抑制消息",
      "adminStatusImg": "管理状态图标路径",
      "operStatusImg": "运行状态图标路径",
      "iconPath": "接口图标路径（如：images/intfTypes/anonIfType.gif）"
    }
  ]
}
```

### 错误响应

参考 [OpManager 通用错误响应文档](https://www.manageengine.com/network-monitoring/help/common-json-errors.html)

---

## 带过滤器的 API URL 示例

### 示例 1: 基础查询（分页和排序）

```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&sortByColumn=statusNum&sortByType=desc
```

**说明**:
- 获取第 1 页，每页 100 条记录
- 按状态编号降序排序
- 返回所有接口

---

### 示例 2: 按严重程度过滤

```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=200&page=1&severity=1,2&sortByColumn=statusNum&sortByType=desc
```

**说明**:
- 只返回 Critical (1) 和 Trouble (2) 状态的接口
- 每页 200 条记录

---

### 示例 3: 按设备分类和接口类型过滤

```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&classification=Router&type=Ethernet&sortByColumn=inTraffic&sortByType=desc
```

**说明**:
- 只返回路由器设备上的以太网接口
- 按入站流量降序排序

---

### 示例 4: 使用 filters 参数（高级过滤）

**URL**:
```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&filters={"groupOp":"AND","rules":[{"field":"operStatus","op":"eq","data":"Up"},{"field":"adminStatus","op":"eq","data":"Up"}]}
```

**URL 编码后的 filters 参数**:
```
filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22Up%22%7D%2C%7B%22field%22%3A%22adminStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22Up%22%7D%5D%7D
```

**完整 URL**:
```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22Up%22%7D%2C%7B%22field%22%3A%22adminStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22Up%22%7D%5D%7D
```

**说明**:
- 只返回运行状态和管理状态都为 "Up" 的接口
- 使用 AND 逻辑组合多个条件

---

### 示例 5: 组合多个过滤器

```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&severity=1,2&classification=Switch&isIdleInterface=false&sortByColumn=outTraffic&sortByType=desc&intfProps=true
```

**说明**:
- 只返回交换机设备上非空闲的 Critical/Trouble 接口
- 按出站流量降序排序
- 包含额外属性（ifName, moid, physAddress）

---

### 示例 6: 按 IP 地址范围过滤（使用 filters）

**filters JSON**:
```json
{
  "groupOp": "AND",
  "rules": [
    {
      "field": "ipAddress",
      "op": "cn",
      "data": "192.168.1"
    }
  ]
}
```

**URL 编码后的完整 URL**:
```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22ipAddress%22%2C%22op%22%3A%22cn%22%2C%22data%22%3A%22192.168.1%22%7D%5D%7D
```

**说明**:
- 只返回 IP 地址包含 "192.168.1" 的接口（如 192.168.1.x）

---

### 示例 7: 按接口组过滤

```
https://localhost:8060/api/json/device/listInterfaces?apiKey=YOUR_API_KEY&isFluidic=true&rows=100&page=1&intfGroupID=12345&sortByColumn=interfaceDisplayName&sortByType=asc
```

**说明**:
- 只返回属于接口组 ID 12345 的接口
- 按接口显示名称升序排序

---

## 使用建议

### 1. API Key 传递方式

**推荐方式（版本 128100+）**: 通过请求头传递
```http
GET /api/json/device/listInterfaces?rows=100&page=1
Headers:
  apiKey: YOUR_API_KEY
```

**兼容方式**: 通过 URL 参数传递（已废弃，但部分版本仍支持）
```
GET /api/json/device/listInterfaces?apiKey=YOUR_API_KEY&rows=100&page=1
```

### 2. 分页最佳实践

- 使用合理的 `rows` 值（建议 100-500）
- 通过 `page` 参数逐页获取数据
- 使用 `total` 字段确定总页数

### 3. 性能优化

- 使用 `severity`、`classification`、`type` 等简单过滤器减少返回数据量
- 避免使用 `isIdleInterface=false` 获取所有非空闲接口（数据量大）
- 使用 `intfProps=true` 仅在需要额外属性时启用

### 4. filters 参数使用

- 对于复杂过滤条件，使用 `filters` 参数
- 确保 JSON 正确 URL 编码
- 使用 `cn`（包含）操作符进行模糊匹配
- 使用 `eq`（等于）操作符进行精确匹配

---

## 代码示例

### JavaScript/TypeScript 示例

```typescript
import axios from 'axios';

// 基础查询
async function listInterfaces(apiKey: string, baseUrl: string) {
  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey  // 推荐方式：通过请求头传递
    },
    params: {
      isFluidic: true,
      rows: 100,
      page: 1,
      sortByColumn: 'statusNum',
      sortByType: 'desc'
    }
  });
  return response.data;
}

// 带过滤器的查询
async function listInterfacesWithFilters(
  apiKey: string,
  baseUrl: string,
  filters: {
    severity?: string;
    classification?: string;
    type?: string;
    customFilters?: any;
  }
) {
  const params: any = {
    isFluidic: true,
    rows: 100,
    page: 1,
    sortByColumn: 'statusNum',
    sortByType: 'desc'
  };

  if (filters.severity) params.severity = filters.severity;
  if (filters.classification) params.classification = filters.classification;
  if (filters.type) params.type = filters.type;
  if (filters.customFilters) params.filters = JSON.stringify(filters.customFilters);

  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params
  });
  return response.data;
}

// 使用示例
const interfaces = await listInterfacesWithFilters(
  'YOUR_API_KEY',
  'https://localhost:8060',
  {
    severity: '1,2',
    classification: 'Router',
    customFilters: {
      groupOp: 'AND',
      rules: [
        { field: 'operStatus', op: 'eq', data: 'Up' },
        { field: 'adminStatus', op: 'eq', data: 'Up' }
      ]
    }
  }
);
```

### Python 示例

```python
import requests
import json
from urllib.parse import urlencode

def list_interfaces(api_key: str, base_url: str, **filters):
    """
    获取接口列表
    
    Args:
        api_key: OpManager API 密钥
        base_url: OpManager 服务器地址
        **filters: 过滤参数
    """
    url = f"{base_url}/api/json/device/listInterfaces"
    
    params = {
        'isFluidic': 'true',
        'rows': filters.get('rows', 100),
        'page': filters.get('page', 1),
        'sortByColumn': filters.get('sortByColumn', 'statusNum'),
        'sortByType': filters.get('sortByType', 'desc')
    }
    
    # 添加可选过滤器
    if 'severity' in filters:
        params['severity'] = filters['severity']
    if 'classification' in filters:
        params['classification'] = filters['classification']
    if 'type' in filters:
        params['type'] = filters['type']
    if 'customFilters' in filters:
        params['filters'] = json.dumps(filters['customFilters'])
    
    headers = {
        'apiKey': api_key  # 推荐方式：通过请求头传递
    }
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

# 使用示例
interfaces = list_interfaces(
    api_key='YOUR_API_KEY',
    base_url='https://localhost:8060',
    severity='1,2',
    classification='Router',
    customFilters={
        'groupOp': 'AND',
        'rules': [
            {'field': 'operStatus', 'op': 'eq', 'data': 'Up'},
            {'field': 'adminStatus', 'op': 'eq', 'data': 'Up'}
        ]
    }
)
```

---

## 注意事项

1. **API Key 安全**: 
   - 不要在代码中硬编码 API Key
   - 使用环境变量或配置文件
   - 推荐通过请求头传递（更安全）

2. **限流控制**:
   - 限流：500 请求/分钟
   - 超过限制会被阻止 1 分钟
   - 实现请求重试和退避策略

3. **分页处理**:
   - `rows` 参数是必需的
   - 最大值为 20000
   - 建议使用较小的值（100-500）以提高性能

4. **filters 参数编码**:
   - JSON 对象需要正确 URL 编码
   - 使用编程语言的 URL 编码函数

5. **错误处理**:
   - 检查 HTTP 状态码
   - 处理限流错误（429）
   - 处理认证错误（401/403）

---

## 参考链接

- [OpManager REST API 官方文档](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#Interfaces)
- [通用错误响应文档](https://www.manageengine.com/network-monitoring/help/common-json-errors.html)
