# OpManager API 调用诊断指南

## 🎯 问题描述

您遇到的问题：**Postman 手工调用 API 返回的数据与项目代码采集的数据不一致**

需要诊断的 API：
1. `GET /api/json/v2/device/listDevices` - 设备列表 V2 API
2. `GET /api/json/businessview/getBusinessDetailsView?bvName=出口业务` - 业务视图详情（含中文参数）

## 🚀 快速诊断

### 一键运行诊断

```bash
npm run diagnose:api-calls
```

这个命令会：
- ✅ 使用原始 HTTP 调用（模拟 Postman）
- ✅ 使用项目代码调用（OpManagerClient）
- ✅ 对比两种方式的请求参数和响应数据
- ✅ 分析数据差异
- ✅ 生成详细的对比报告

## 📋 诊断内容

### 测试 1-3: listDevices API

#### 测试 1: 原始 HTTP 调用（模拟 Postman）
- 直接使用 axios 发送 HTTP GET 请求
- URL: `https://10.141.69.192:8061/api/json/v2/device/listDevices`
- 参数: `apiKey`, `rows=10`, `page=1`
- 显示完整的请求配置和响应数据结构

#### 测试 2: OpManagerClient 调用
- 使用项目中的 `OpManagerClient.getDevicesPage()` 方法
- 相同的参数配置
- 显示客户端处理后的数据结构

#### 测试 3: 对比分析
- 对比两种方式返回的设备数量
- 对比响应数据结构
- 对比第一个设备的详细数据
- 识别任何差异

---

### 测试 4-6: getBusinessDetailsView API（中文参数）

#### 测试 4: 原始 HTTP 调用（模拟 Postman）
- 直接使用 axios 发送 HTTP GET 请求
- URL: `https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView`
- 参数: `apiKey`, `bvName=出口业务`, `startPoint=0`, `viewLength=50`
- **特别关注中文参数的 URL 编码处理**
- 显示完整的响应数据结构

#### 测试 5: OpManagerClient 调用
- 使用项目中的 `OpManagerClient.getBusinessDetailsView()` 方法
- 相同的中文参数 "出口业务"
- 显示客户端处理后的数据

#### 测试 6: 对比分析
- 对比两种方式返回的设备数量
- 对比响应数据结构
- 检查中文参数处理是否正确
- 识别任何差异

---

## 📊 诊断输出示例

### ✅ 成功的诊断（数据一致）

```
================================================================================
  测试 3: 对比分析 - listDevices 调用差异
================================================================================

📊 数据对比:

1️⃣ 原始 HTTP 调用:
   成功: ✅
   记录数: 150
   总数: 150

2️⃣ OpManagerClient 调用:
   成功: ✅
   记录数: 150
   总数: 150

------------------------------------------------------------
  一致性检查
------------------------------------------------------------

✅ 返回的设备数量一致: 150

📋 数据结构对比:
   原始调用字段: total, records, page, rows
   客户端调用字段: devices, total, records, page

🔍 第一个设备数据对比:
   原始调用:
     - name: core-router-01
     - ipAddress: 192.168.1.1
     - type: Router
     - status: up

   客户端调用:
     - name: core-router-01
     - ipAddress: 192.168.1.1
     - type: Router
     - status: up

✅ 第一个设备数据匹配
```

---

### ⚠️ 发现差异的诊断

```
================================================================================
  测试 6: 对比分析 - getBusinessDetailsView 调用差异
================================================================================

📊 数据对比:

1️⃣ 原始 HTTP 调用:
   成功: ✅
   设备数量: 25
   数据结构: result, devices

2️⃣ OpManagerClient 调用:
   成功: ✅
   设备数量: 20
   数据结构: devices

------------------------------------------------------------
  一致性检查
------------------------------------------------------------

⚠️  返回的设备数量不一致:
   原始调用: 25
   客户端调用: 20
   差异: 5

📋 响应结构对比:
   原始调用: result, devices
   客户端调用: devices

💡 可能的原因:
   - 客户端代码的数据解析逻辑可能遗漏了部分数据
   - 响应数据结构嵌套层级不同
   - 数据过滤逻辑存在差异
```

---

## 🔍 常见问题诊断

### 问题 1: 中文参数 URL 编码问题

**症状**:
```
❌ [getBusinessDetailsView] 请求失败
   HTTP 状态: 400 Bad Request
   或
   HTTP 状态: 404 Not Found
```

**诊断点**:
- 检查中文参数 "出口业务" 是否正确编码
- axios 应该自动处理 URL 编码：`出口业务` → `%E5%87%BA%E5%8F%A3%E4%B8%9A%E5%8A%A1`

**解决方案**:
```typescript
// 正确：axios 会自动编码
axios.get(url, {
  params: { bvName: '出口业务' }
});

// 错误：手动拼接 URL（未编码）
axios.get(`${url}?bvName=出口业务`); // ❌
```

---

### 问题 2: API Key 传递方式不一致

**症状**:
```
❌ [API] 请求失败
   HTTP 状态: 401 Unauthorized
```

**诊断点**:
诊断脚本会显示 API Key 的传递方式：
- Headers: `{ 'apiKey': 'xxx' }`
- Query Parameters: `{ apiKey: 'xxx' }`

**Postman 配置参考**:
```
方式 1: Query Parameters
GET https://10.141.69.192:8061/api/json/v2/device/listDevices?apiKey=YOUR_KEY

方式 2: Headers
GET https://10.141.69.192:8061/api/json/v2/device/listDevices
Header: apiKey: YOUR_KEY
```

项目代码同时使用了两种方式（推荐方式）。

---

### 问题 3: 响应数据结构解析差异

**症状**:
```
⚠️  返回的设备数量不一致
   原始调用: 150
   客户端调用: 100
```

**诊断点**:
诊断脚本会显示：
1. 响应数据的顶层字段
2. 数据嵌套结构（`data.rows` vs `data.devices` vs 直接数组）
3. 客户端代码的解析逻辑

**示例分析**:

```typescript
// API 返回格式 1: { rows: [...], total: 150 }
if (data.rows && Array.isArray(data.rows)) {
  devices = data.rows; // ✅ 正确
}

// API 返回格式 2: { result: { devices: [...] } }
if (data.result && data.result.devices) {
  devices = data.result.devices; // ✅ 正确
}

// API 返回格式 3: 直接数组 [...]
if (Array.isArray(data)) {
  devices = data; // ✅ 正确
}
```

如果代码只处理了一种格式，但 API 返回了另一种格式，就会导致数据丢失。

---

### 问题 4: 分页参数理解不一致

**症状**:
```
Postman: 返回 150 个设备
代码: 返回 10 个设备
```

**诊断点**:
- 检查 `rows` 参数（每页数量）
- 检查 `page` 参数（页码）
- 检查 API 返回的 `total` 字段

**示例**:
```bash
# Postman 可能未指定 rows，返回全部
GET /api/json/v2/device/listDevices?apiKey=xxx

# 代码指定了 rows=10，只返回前 10 个
GET /api/json/v2/device/listDevices?apiKey=xxx&rows=10&page=1
```

---

## 🔧 手动测试步骤

### 步骤 1: 运行诊断脚本

```bash
npm run diagnose:api-calls
```

### 步骤 2: 查看输出

重点关注：

1. **测试 1 和 2** - listDevices API
   ```
   ✅ 成功: 两种方式都成功
   📊 记录数: 是否一致
   🔍 第一个设备: 数据是否匹配
   ```

2. **测试 4 和 5** - getBusinessDetailsView API
   ```
   ✅ 成功: 两种方式都成功
   📊 设备数量: 是否一致
   🔍 中文参数: URL 编码是否正确
   ```

3. **最终报告**
   ```
   💡 诊断建议: 具体的修复建议
   📄 详细报告: JSON 文件路径
   ```

### 步骤 3: 查看详细报告

```bash
# 查看最新的诊断报告
ls -lt api-diagnosis-*.json | head -1 | xargs cat | jq .

# 查看特定 API 的结果
cat api-diagnosis-*.json | jq '.results[] | select(.api == "listDevices-v2")'
cat api-diagnosis-*.json | jq '.results[] | select(.api == "getBusinessDetailsView")'
```

### 步骤 4: 对比 Postman 结果

1. 在 Postman 中调用相同的 API
2. 复制 Postman 的响应 JSON
3. 对比诊断脚本输出的响应数据
4. 识别差异点

---

## 📌 Postman 配置参考

### API 1: listDevices V2

```
方法: GET
URL: https://10.141.69.192:8061/api/json/v2/device/listDevices

Query Parameters:
- apiKey: 42aa561c1e280e8a46a51a4f5e06f5b5
- rows: 10
- page: 1

Headers:
- Accept: application/json

SSL 证书验证: 关闭（如果是自签名证书）
```

### API 2: getBusinessDetailsView

```
方法: GET
URL: https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView

Query Parameters:
- apiKey: 42aa561c1e280e8a46a51a4f5e06f5b5
- bvName: 出口业务
- startPoint: 0
- viewLength: 50

Headers:
- Accept: application/json

注意事项:
- Postman 会自动对中文参数进行 URL 编码
- 确保 "出口业务" 是实际存在的 Business View 名称
```

---

## 🛠️ 修复建议

根据诊断结果，可能需要修改 `src/services/opmanager/client.ts`：

### 修复 1: 响应数据解析逻辑

如果发现数据结构不一致，需要更新解析代码：

```typescript
// 当前代码（可能不完整）
if (data && data.rows) {
    devices = data.rows;
}

// 改进后（处理多种格式）
let devices = [];
if (data && data.rows && Array.isArray(data.rows)) {
    devices = data.rows;
} else if (data && data.result && data.result.devices) {
    devices = data.result.devices;
} else if (Array.isArray(data)) {
    devices = data;
} else if (data && data.devices && Array.isArray(data.devices)) {
    devices = data.devices;
}
```

### 修复 2: 中文参数处理

确保中文参数正确传递：

```typescript
// ✅ 正确：使用 params 对象（axios 自动编码）
const response = await this.client.get('/api/json/businessview/getBusinessDetailsView', {
    params: {
        bvName: '出口业务',  // axios 会自动 URL 编码
        startPoint: 0,
        viewLength: 50
    }
});

// ❌ 错误：手动拼接 URL
const response = await this.client.get(
    `/api/json/businessview/getBusinessDetailsView?bvName=出口业务`
);
```

### 修复 3: 分页参数默认值

如果需要获取所有数据而不是分页：

```typescript
async getDevicesPage(options?: {
    rows?: number;  // 不指定则返回全部
    page?: number;
}) {
    const params: any = {};

    if (options?.rows !== undefined) {
        params.rows = options.rows;
        params.page = options.page || 1;
    }

    const response = await this.client.get('/api/json/v2/device/listDevices', {
        params
    });
    // ...
}
```

---

## 📞 需要帮助？

### 查看完整的 API 文档

- listDevices V2: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#listDevices-v2
- getBusinessDetailsView: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getBusinessDetailsView

### 检查项目代码

- OpManager 客户端: [src/services/opmanager/client.ts](src/services/opmanager/client.ts)
- 数据采集器: [src/services/collector/device.ts](src/services/collector/device.ts)

### 查看其他诊断工具

```bash
# 全面系统诊断
npm run diagnose:production

# OpManager API 快速验证
npm run diagnose:opmanager

# API 调用对比（当前工具）
npm run diagnose:api-calls
```

---

## 📝 报告示例

运行诊断后，会生成类似以下的报告：

```json
{
  "timestamp": "2024-01-23T10:30:00.000Z",
  "environment": {
    "opmanagerUrl": "https://10.141.69.192:8061",
    "useMockData": "false"
  },
  "summary": {
    "total": 6,
    "successful": 6,
    "failed": 0
  },
  "results": [
    {
      "api": "listDevices-v2",
      "method": "RAW-HTTP",
      "success": true,
      "statusCode": 200,
      "requestDetails": {
        "url": "https://10.141.69.192:8061/api/json/v2/device/listDevices",
        "params": {
          "apiKey": "***",
          "rows": 10,
          "page": 1
        }
      },
      "responseDetails": {
        "dataType": "object",
        "structureKeys": ["total", "records", "page", "rows"],
        "recordCount": 150
      }
    },
    // ... 其他测试结果
  ]
}
```

---

**最后更新**: 2024-01-23
**版本**: 1.0.0
