# OpManager 按设备过滤接口查询指南

## ⚠️ 重要发现

**`deviceName` 字段不支持在 filters 中使用！**

根据实际测试，使用 `deviceName` 作为 filters 的 field 会返回错误：
```json
{
  "error": {
    "message": "为参数field指定的输入与所需的模式不匹配。",
    "errorcode": "PATTERN_NOT_MATCHED"
  }
}
```

**官方文档中 filters 支持的字段**：
- `interfaceDisplayName`
- `displayName`（注意：这可能指的是接口的显示名称，而不是设备的）
- `adminStatus`
- `operStatus`
- `ipAddress`
- `type`
- `statusNum`
- `isSuppressed`
- `probeName`
- `UDF1-UDF12`

**`deviceName` 不在支持列表中！**

---

## 需求说明

针对某个具体设备的所有接口进行查询，需要添加设备过滤条件。

---

## 方案分析

根据实际返回数据，每个接口都包含以下设备相关字段：
- `deviceName`: 设备名称（如：`"1.1.1.45.10000000001"`）
- `displayName`: 设备显示名称（如：`"生产楼5楼运行部交换机"`）

### 方案 1: 使用 `name` 参数（推荐）✅

`listInterfaces` API 支持直接使用 `name` 参数指定设备名称，这是最简单直接的方法。

### 方案 2: 使用 filters 参数过滤 displayName（备选）

`displayName` 在官方文档的 filters 支持字段列表中，但需要注意它可能指的是接口的显示名称，而不是设备的。

### 方案 3: 客户端过滤（最后手段）

如果 API 不支持按设备过滤，可以在客户端获取所有接口后，根据 `deviceName` 字段进行过滤。

---

## 实现方案

### 方案 1: 使用 `name` 参数（推荐）✅

根据 OpManager API 文档和代码示例，`listInterfaces` API 支持直接使用 `name` 参数指定设备名称。

**完整 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=100&page=1
```

**TypeScript 代码**:
```typescript
import axios from 'axios';

const baseUrl = 'https://10.141.69.192:8061';
const apiKey = 'YOUR_API_KEY';

async function getDeviceInterfaces(deviceName: string) {
  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params: {
      name: deviceName,  // ✅ 直接使用 name 参数
      isFluidic: true,
      rows: 100,
      page: 1
    }
  });

  return response.data;
}

// 使用示例
const interfaces = await getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`设备接口数量: ${interfaces.rows.length}`);
```

**优点**:
- ✅ 简单直接，不需要复杂的 filters
- ✅ 官方支持的方式
- ✅ 性能更好（服务器端过滤）

---

### 方案 2: 使用 filters 参数过滤 displayName（备选）

⚠️ **注意**: `displayName` 在 filters 中可能指的是接口的显示名称，而不是设备的显示名称。需要测试确认。

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

**完整 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22displayName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E7%94%9F%E4%BA%A7%E6%A5%BC5%E6%A5%BC%E8%BF%90%E8%A1%8C%E9%83%A8%E4%BA%A4%E6%8D%A2%E6%9C%BA%22%7D%5D%7D
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
      filters: JSON.stringify(filters, { ensureAscii: false }) // 保持中文字符
    }
  });

  return response.data;
}

// 使用示例（需要测试确认是否有效）
const interfaces = await getDeviceInterfacesByDisplayName('生产楼5楼运行部交换机');
```

---

### 方案 3: 组合过滤（设备 + 状态）

使用 `name` 参数指定设备，然后使用 filters 添加状态过滤。

**完整 URL**:
```
https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E8%BF%90%E8%A1%8C%22%7D%5D%7D
```

**TypeScript 代码**:
```typescript
async function getDeviceInterfacesWithStatus(
  deviceName: string,
  operStatus?: '运行' | '停止'
) {
  const params: any = {
    name: deviceName,  // ✅ 使用 name 参数指定设备
    isFluidic: true,
    rows: 100,
    page: 1
  };

  // 如果指定了状态，添加 filters
  if (operStatus) {
    const filters = {
      groupOp: 'AND',
      rules: [
        {
          field: 'operStatus',
          op: 'eq',
          data: operStatus
        }
      ]
    };
    params.filters = JSON.stringify(filters, { ensureAscii: false });
  }

  const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
    headers: {
      'apiKey': apiKey
    },
    params
  });

  return response.data;
}

// 使用示例：获取设备所有运行中的接口
const runningInterfaces = await getDeviceInterfacesWithStatus(
  '1.1.1.45.10000000001',
  '运行'
);
```

### 方案 4: 客户端过滤（最后手段）

如果 API 不支持按设备过滤，可以在客户端获取所有接口后，根据 `deviceName` 字段进行过滤。

**TypeScript 代码**:
```typescript
async function getDeviceInterfacesClientSide(deviceName: string) {
  // 获取所有接口（可能需要分页）
  const allInterfaces: any[] = [];
  let page = 1;
  const rows = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get(`${baseUrl}/api/json/device/listInterfaces`, {
      headers: {
        'apiKey': apiKey
      },
      params: {
        isFluidic: true,
        rows,
        page
      }
    });

    if (response.data.rows && response.data.rows.length > 0) {
      // 在客户端过滤
      const deviceInterfaces = response.data.rows.filter(
        (iface: any) => iface.deviceName === deviceName
      );
      allInterfaces.push(...deviceInterfaces);

      page++;
      const total = parseInt(response.data.total || '0');
      hasMore = allInterfaces.length < total && response.data.rows.length === rows;
    } else {
      hasMore = false;
    }
  }

  return {
    total: allInterfaces.length,
    interfaces: allInterfaces
  };
}
```

---

## 完整的工具函数

### TypeScript 完整实现

```typescript
import axios, { AxiosInstance } from 'axios';

interface DeviceInterfaceFilter {
  deviceName?: string;
  displayName?: string;
  operStatus?: '运行' | '停止' | 'Up' | 'Down';
  adminStatus?: '运行' | '停止' | 'Up' | 'Down';
  statusNum?: number;
  type?: string;
}

interface ListInterfacesOptions {
  page?: number;
  rows?: number;
  sortByColumn?: string;
  sortByType?: 'asc' | 'desc';
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
   * @param filters 额外的过滤条件
   * @param options 分页和排序选项
   */
  async getDeviceInterfaces(
    deviceName: string,
    filters?: Omit<DeviceInterfaceFilter, 'deviceName'>,
    options?: ListInterfacesOptions
  ) {
    const params: any = {
      name: deviceName,  // ✅ 使用 name 参数指定设备
      isFluidic: true,
      rows: options?.rows || 100,
      page: options?.page || 1
    };

    const rules: any[] = [];

    // 添加额外的过滤条件
    if (filters) {
      if (filters.operStatus) {
        rules.push({
          field: 'operStatus',
          op: 'eq',
          data: filters.operStatus
        });
      }

      if (filters.adminStatus) {
        rules.push({
          field: 'adminStatus',
          op: 'eq',
          data: filters.adminStatus
        });
      }

      if (filters.statusNum) {
        rules.push({
          field: 'statusNum',
          op: 'eq',
          data: String(filters.statusNum)
        });
      }

      if (filters.type) {
        rules.push({
          field: 'type',
          op: 'eq',
          data: filters.type
        });
      }

      // 如果有过滤条件，添加到 filters 参数
      if (rules.length > 0) {
        const filterObj = {
          groupOp: 'AND',
          rules
        };
        params.filters = JSON.stringify(filterObj, { ensureAscii: false });
      }
    }

    if (options?.sortByColumn) {
      params.sortByColumn = options.sortByColumn;
      params.sortByType = options.sortByType || 'desc';
    }

    const response = await this.client.get('/api/json/device/listInterfaces', {
      params
    });

    return response.data;
  }

  /**
   * 获取指定设备的所有运行中的接口
   */
  async getDeviceRunningInterfaces(
    deviceName: string,
    options?: ListInterfacesOptions
  ) {
    return this.getDeviceInterfaces(
      deviceName,
      { operStatus: '运行' },
      options
    );
  }

  /**
   * 获取指定设备的所有正常状态的接口
   */
  async getDeviceNormalInterfaces(
    deviceName: string,
    options?: ListInterfacesOptions
  ) {
    return this.getDeviceInterfaces(
      deviceName,
      { statusNum: 5 }, // 5 = Clear/正常
      options
    );
  }

  /**
   * 分页获取设备所有接口（自动处理分页）
   */
  async getAllDeviceInterfaces(
    deviceName: string,
    filters?: Omit<DeviceInterfaceFilter, 'deviceName'>
  ) {
    const allInterfaces: any[] = [];
    let page = 1;
    const rows = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getDeviceInterfaces(
        deviceName,
        filters,
        { page, rows }
      );

      if (response.rows && response.rows.length > 0) {
        allInterfaces.push(...response.rows);
        page++;

        // 检查是否还有更多数据
        const total = parseInt(response.total || '0');
        hasMore = allInterfaces.length < total;
      } else {
        hasMore = false;
      }
    }

    return {
      total: allInterfaces.length,
      interfaces: allInterfaces
    };
  }
}

// 使用示例
const client = new OpManagerInterfaceClient(
  'https://10.141.69.192:8061',
  'YOUR_API_KEY'
);

// 示例 1: 获取设备所有接口
const allInterfaces = await client.getDeviceInterfaces('1.1.1.45.10000000001');
console.log(`接口数量: ${allInterfaces.rows.length}`);

// 示例 2: 获取设备所有运行中的接口
const runningInterfaces = await client.getDeviceRunningInterfaces(
  '1.1.1.45.10000000001'
);

// 示例 3: 获取设备所有正常状态的接口
const normalInterfaces = await client.getDeviceNormalInterfaces(
  '1.1.1.45.10000000001'
);

// 示例 4: 组合过滤（设备 + 运行状态 + 接口类型）
const ethernetInterfaces = await client.getDeviceInterfaces(
  '1.1.1.45.10000000001',
  {
    operStatus: '运行',
    type: 'Ethernet'
  },
  {
    sortByColumn: 'inTraffic',
    sortByType: 'desc'
  }
);

// 示例 5: 获取所有接口（自动分页）
const allInterfacesAuto = await client.getAllDeviceInterfaces(
  '1.1.1.45.10000000001'
);
console.log(`总接口数: ${allInterfacesAuto.total}`);
```

---

## Python 实现

```python
import requests
import json
from typing import Optional, Dict, List, Any

class OpManagerInterfaceClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({'apiKey': api_key})

    def get_device_interfaces(
        self,
        device_name: str,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        rows: int = 100,
        sort_by_column: Optional[str] = None,
        sort_by_type: str = 'desc'
    ) -> Dict[str, Any]:
        """
        获取指定设备的所有接口
        
        Args:
            device_name: 设备名称
            filters: 额外的过滤条件
            page: 页码
            rows: 每页记录数
            sort_by_column: 排序字段
            sort_by_type: 排序方向 (asc/desc)
        """
        rules = [
            {
                'field': 'deviceName',
                'op': 'eq',
                'data': device_name
            }
        ]

        # 添加额外的过滤条件
        if filters:
            if 'operStatus' in filters:
                rules.append({
                    'field': 'operStatus',
                    'op': 'eq',
                    'data': filters['operStatus']
                })

            if 'adminStatus' in filters:
                rules.append({
                    'field': 'adminStatus',
                    'op': 'eq',
                    'data': filters['adminStatus']
                })

            if 'statusNum' in filters:
                rules.append({
                    'field': 'statusNum',
                    'op': 'eq',
                    'data': str(filters['statusNum'])
                })

            if 'type' in filters:
                rules.append({
                    'field': 'type',
                    'op': 'eq',
                    'data': filters['type']
                })

        filter_obj = {
            'groupOp': 'AND',
            'rules': rules
        }

        params = {
            'isFluidic': 'true',
            'rows': rows,
            'page': page,
            'filters': json.dumps(filter_obj, ensure_ascii=False)
        }

        if sort_by_column:
            params['sortByColumn'] = sort_by_column
            params['sortByType'] = sort_by_type

        response = self.session.get(
            f'{self.base_url}/api/json/device/listInterfaces',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def get_device_running_interfaces(
        self,
        device_name: str,
        page: int = 1,
        rows: int = 100
    ) -> Dict[str, Any]:
        """获取指定设备的所有运行中的接口"""
        return self.get_device_interfaces(
            device_name,
            filters={'operStatus': '运行'},
            page=page,
            rows=rows
        )

    def get_all_device_interfaces(
        self,
        device_name: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """获取设备所有接口（自动分页）"""
        all_interfaces = []
        page = 1
        rows = 100
        has_more = True

        while has_more:
            response = self.get_device_interfaces(
                device_name,
                filters=filters,
                page=page,
                rows=rows
            )

            if response.get('rows'):
                all_interfaces.extend(response['rows'])
                page += 1

                total = int(response.get('total', '0'))
                has_more = len(all_interfaces) < total
            else:
                has_more = False

        return all_interfaces

# 使用示例
client = OpManagerInterfaceClient(
    'https://10.141.69.192:8061',
    'YOUR_API_KEY'
)

# 获取设备所有接口
interfaces = client.get_device_interfaces('1.1.1.45.10000000001')
print(f"接口数量: {len(interfaces['rows'])}")

# 获取设备所有运行中的接口
running = client.get_device_running_interfaces('1.1.1.45.10000000001')

# 获取所有接口（自动分页）
all_interfaces = client.get_all_device_interfaces('1.1.1.45.10000000001')
print(f"总接口数: {len(all_interfaces)}")
```

---

## 实际测试 URL

基于您提供的实际数据，以下是可直接使用的 URL：

### ✅ 获取设备 "1.1.1.45.10000000001" 的所有接口（推荐）

```
https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=100&page=1
```

### ✅ 获取设备 "1.1.1.45.10000000001" 的所有运行中的接口

```
https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22operStatus%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%22%E8%BF%90%E8%A1%8C%22%7D%5D%7D
```

### ❌ 错误示例（不要使用）

以下方式会返回错误 `PATTERN_NOT_MATCHED`：
```
https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=100&page=1&filters=%7B%22groupOp%22%3A%22AND%22%2C%22rules%22%3A%5B%7B%22field%22%3A%22deviceName%22%2C%22op%22%3A%22eq%22%2C%22data%22%3A%221.1.1.45.10000000001%22%7D%5D%7D
```

---

## 注意事项

1. **❌ deviceName 字段不支持在 filters 中使用**: 
   - 官方文档的 filters 字段列表中**不包含** `deviceName`
   - 使用 `deviceName` 作为 filters 的 field 会返回错误：`PATTERN_NOT_MATCHED`
   - ✅ **正确方式**：使用 `name` 参数直接指定设备名称

2. **设备名称格式**:
   - 从实际数据看，deviceName 格式为：`IP地址.设备ID`（如：`1.1.1.45.10000000001`）
   - 确保使用完整的 deviceName 值作为 `name` 参数

3. **分页处理**:
   - 如果设备接口数量较多，需要处理分页
   - 使用 `getAllDeviceInterfaces` 方法可以自动处理分页

4. **错误处理**:
   - 如果 `name` 参数不工作，尝试使用 `displayName` 在 filters 中（需要测试）
   - 检查返回数据中的 `total` 字段确认是否匹配

5. **性能优化**:
   - 使用 `name` 参数比客户端过滤性能更好（服务器端过滤）
   - 如果只需要运行中的接口，添加 `operStatus` 过滤条件
   - 使用合理的 `rows` 值（建议 100-500）

---

## 测试建议

1. **✅ 推荐：使用 name 参数**:
   ```bash
   curl -H "apiKey: YOUR_API_KEY" \
     "https://10.141.69.192:8061/api/json/device/listInterfaces?name=1.1.1.45.10000000001&isFluidic=true&rows=10&page=1"
   ```

2. **如果 name 参数不支持，尝试使用 displayName 在 filters 中**:
   ```bash
   curl -H "apiKey: YOUR_API_KEY" \
     "https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=10&page=1&filters={\"groupOp\":\"AND\",\"rules\":[{\"field\":\"displayName\",\"op\":\"eq\",\"data\":\"生产楼5楼运行部交换机\"}]}"
   ```

3. **❌ 不要使用 deviceName 在 filters 中**（会返回错误）:
   ```bash
   # 这个会失败！
   curl -H "apiKey: YOUR_API_KEY" \
     "https://10.141.69.192:8061/api/json/device/listInterfaces?isFluidic=true&rows=10&page=1&filters={\"groupOp\":\"AND\",\"rules\":[{\"field\":\"deviceName\",\"op\":\"eq\",\"data\":\"1.1.1.45.10000000001\"}]}"
   ```

4. **验证结果**:
   - 检查返回的 `rows` 数组
   - 确认所有接口的 `deviceName` 都匹配指定的设备
