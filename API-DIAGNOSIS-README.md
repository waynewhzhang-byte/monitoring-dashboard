# 🔬 API 调用诊断工具 - 快速指南

## 🎯 你的问题

> **Postman 手工调用 API 返回的数据和项目代码采集的数据不一致**

需要诊断的两个 API：
1. `https://10.141.69.192:8061/api/json/device/listDevices?apiKey=xxx`
2. `https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView?bvName=出口业务`

---

## ⚡ 快速开始（3 步）

### 步骤 1: 运行诊断

```bash
npm run diagnose:api-calls
```

### 步骤 2: 查看控制台输出

诊断脚本会自动：
- ✅ 模拟 Postman 的原始 HTTP 调用
- ✅ 运行项目代码的 OpManagerClient 调用
- ✅ 对比两种方式的请求和响应
- ✅ 指出任何差异

### 步骤 3: 查看生成的报告

```bash
# 查看最新报告
ls -lt api-diagnosis-*.json | head -1
```

---

## 📊 诊断输出示例

### ✅ 数据一致的情况

```
================================================================================
  测试 3: 对比分析 - listDevices 调用差异
================================================================================

📊 数据对比:

1️⃣ 原始 HTTP 调用:
   成功: ✅
   记录数: 150

2️⃣ OpManagerClient 调用:
   成功: ✅
   记录数: 150

✅ 返回的设备数量一致: 150
✅ 第一个设备数据匹配
```

### ⚠️ 数据不一致的情况

```
================================================================================
  测试 6: 对比分析 - getBusinessDetailsView 调用差异
================================================================================

📊 数据对比:

1️⃣ 原始 HTTP 调用:
   成功: ✅
   设备数量: 25

2️⃣ OpManagerClient 调用:
   成功: ✅
   设备数量: 20

⚠️  返回的设备数量不一致:
   原始调用: 25
   客户端调用: 20
   差异: 5

💡 可能原因:
   - 响应数据解析逻辑遗漏了部分数据
   - 数据过滤条件不同
```

---

## 🔍 诊断内容详解

### 测试 1: 原始 HTTP 调用 - listDevices

**模拟 Postman 的方式调用：**
```
GET https://10.141.69.192:8061/api/json/v2/device/listDevices
参数: apiKey=xxx&rows=10&page=1
```

**输出内容：**
- 完整的请求 URL 和参数
- HTTP 响应状态码
- 响应数据结构（顶层字段）
- 设备数量统计
- 前 2 个设备的详细数据
- 第一个设备的所有字段列表

### 测试 2: OpManagerClient 调用 - listDevices

**使用项目代码调用：**
```typescript
opClient.getDevicesPage({ rows: 10, page: 1 })
```

**输出内容：**
- 客户端方法调用参数
- 返回的数据结构
- 设备数量统计
- 前 2 个设备的详细数据

### 测试 3: 对比分析 - listDevices

**对比内容：**
- ✅ 设备数量是否一致
- ✅ 响应数据结构是否一致
- ✅ 第一个设备的详细数据是否匹配
- ⚠️ 识别任何差异并给出原因分析

---

### 测试 4: 原始 HTTP 调用 - getBusinessDetailsView

**模拟 Postman 调用（含中文参数）：**
```
GET https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView
参数: apiKey=xxx&bvName=出口业务&startPoint=0&viewLength=50
```

**特别关注：**
- 中文参数 "出口业务" 的 URL 编码
- 显示编码前: `出口业务`
- 显示编码后: `%E5%87%BA%E5%8F%A3%E4%B8%9A%E5%8A%A1`

### 测试 5: OpManagerClient 调用 - getBusinessDetailsView

**使用项目代码调用：**
```typescript
opClient.getBusinessDetailsView('出口业务', 0, 50)
```

### 测试 6: 对比分析 - getBusinessDetailsView

**对比内容：**
- ✅ 设备数量是否一致
- ✅ 响应数据结构是否一致
- ✅ 中文参数处理是否正确
- ⚠️ 识别任何差异

---

## 🛠️ 常见问题和修复

### 问题 1: 设备数量不一致

**诊断输出：**
```
⚠️  返回的设备数量不一致:
   原始调用: 150
   客户端调用: 100
```

**可能原因：**

1. **响应数据结构解析错误**
   ```typescript
   // API 可能返回: { rows: [...] }
   // 但代码只处理: { devices: [...] }
   ```

2. **分页参数不同**
   ```typescript
   // Postman: 未指定 rows，返回全部
   // 代码: rows=10，只返回 10 个
   ```

3. **数据过滤逻辑**
   ```typescript
   // 代码可能过滤掉了某些设备
   devices = devices.filter(d => d.isManaged)
   ```

**修复方法：** 查看诊断报告的 `responseDetails.structureKeys` 字段，确认数据结构，然后修改 `src/services/opmanager/client.ts` 中的解析逻辑。

---

### 问题 2: 中文参数处理失败

**诊断输出：**
```
❌ [getBusinessDetailsView] 请求失败
   HTTP 状态: 400 Bad Request
```

**可能原因：**
- 中文参数未正确 URL 编码
- Business View 名称不存在

**修复方法：**
```typescript
// ✅ 正确：使用 params 对象（axios 自动编码）
axios.get(url, {
  params: { bvName: '出口业务' }
});

// ❌ 错误：手动拼接 URL
axios.get(`${url}?bvName=出口业务`);
```

---

### 问题 3: 响应数据结构不同

**诊断输出：**
```
📋 响应结构对比:
   原始调用: result, devices
   客户端调用: devices
```

**可能原因：**
- API 返回的数据嵌套结构与预期不同
- 代码只解析了部分字段

**修复方法：**
```typescript
// 改进前（只处理一种格式）
const devices = data.rows;

// 改进后（处理多种格式）
let devices = [];
if (data.rows && Array.isArray(data.rows)) {
  devices = data.rows;
} else if (data.result?.devices) {
  devices = data.result.devices;
} else if (Array.isArray(data)) {
  devices = data;
}
```

---

## 📝 诊断报告文件

诊断完成后会生成 JSON 报告：

```bash
api-diagnosis-2024-01-23T10-30-00.json
```

**报告内容：**
```json
{
  "timestamp": "2024-01-23T10:30:00.000Z",
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
      "requestDetails": { ... },
      "responseDetails": { ... }
    },
    // ... 其他测试结果
  ]
}
```

**查看报告：**
```bash
# 格式化查看
cat api-diagnosis-*.json | jq .

# 查看特定 API 的结果
cat api-diagnosis-*.json | jq '.results[] | select(.api == "listDevices-v2")'

# 查看失败的测试
cat api-diagnosis-*.json | jq '.results[] | select(.success == false)'
```

---

## 🎯 与 Postman 对比的方法

### 1. 在 Postman 中调用 API

**API 1: listDevices**
```
方法: GET
URL: https://10.141.69.192:8061/api/json/v2/device/listDevices

Query Parameters:
  apiKey: 42aa561c1e280e8a46a51a4f5e06f5b5
  rows: 10
  page: 1

SSL 证书验证: 关闭
```

**API 2: getBusinessDetailsView**
```
方法: GET
URL: https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView

Query Parameters:
  apiKey: 42aa561c1e280e8a46a51a4f5e06f5b5
  bvName: 出口业务
  startPoint: 0
  viewLength: 50

SSL 证书验证: 关闭
```

### 2. 保存 Postman 响应

复制 Postman 的 Response Body（JSON 格式）

### 3. 对比诊断脚本输出

**对比点：**
- 响应数据的顶层字段（keys）
- 设备数量
- 第一个设备的详细数据
- 数据类型和结构

### 4. 识别差异

如果发现差异：
1. 检查请求参数是否完全一致
2. 检查响应数据结构是否相同
3. 检查数据解析逻辑是否正确

---

## 📚 相关文档

- **完整诊断指南**: [API-CALL-DIAGNOSIS.md](API-CALL-DIAGNOSIS.md)
- **快速诊断指南**: [QUICK-DIAGNOSIS.md](QUICK-DIAGNOSIS.md)
- **生产环境诊断**: [DIAGNOSIS-GUIDE.md](DIAGNOSIS-GUIDE.md)

## 🔗 OpManager API 官方文档

- listDevices V2: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#listDevices-v2
- getBusinessDetailsView: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getBusinessDetailsView

---

## 💡 快速命令参考

```bash
# API 调用对比诊断（推荐先运行这个）
npm run diagnose:api-calls

# 全面系统诊断
npm run diagnose:production

# OpManager API 快速验证
npm run diagnose:opmanager

# 查看最新诊断报告
ls -lt api-diagnosis-*.json | head -1 | xargs cat | jq .
```

---

**提示**: 运行 `npm run diagnose:api-calls` 后，诊断脚本会自动告诉你问题所在和修复建议！

**最后更新**: 2024-01-23
