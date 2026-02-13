# 从 Mock Server 切换到真实 OpManager API 指南

本指南说明如何将项目从使用 Mock Server 切换到连接真实的 OpManager API。

---

## ✅ 快速答案

**是的，基本正确！** 但需要注意以下几点：

1. ✅ 设置 `USE_MOCK_DATA="false"`（注意是字符串，带引号）
2. ⚠️ 确保 `NODE_ENV="production"` 或配置了 `OPMANAGER_API_KEY`
3. ✅ 确保 `OPMANAGER_BASE_URL` 和 `OPMANAGER_API_KEY` 已正确配置

---

## 📋 完整配置步骤

### 1. 修改 `.env` 文件

在项目根目录的 `.env` 文件中，确保以下配置：

```bash
# ==================== OpManager API 配置 ====================
# OpManager 服务器地址（真实环境）
OPMANAGER_BASE_URL="http://your-opmanager-server:8060"
# OpManager API Key（从 OpManager 管理界面获取）
OPMANAGER_API_KEY="your-real-api-key-here"
# API 请求超时（毫秒）
OPMANAGER_TIMEOUT="30000"

# ==================== 应用配置 ====================
# 运行环境：生产环境建议设置为 production
NODE_ENV="production"

# ==================== Mock Server 配置 ====================
# 禁用 Mock 数据（使用真实 OpManager API）
USE_MOCK_DATA="false"
```

**重要提示：**
- `USE_MOCK_DATA` 必须是字符串 `"false"`（带引号），不是布尔值
- 如果设置为 `"true"` 或未设置，系统会使用 Mock 数据

---

## 🔍 Mock 模式判断逻辑

系统会根据以下条件决定是否使用 Mock 数据：

```typescript
// 在 src/services/opmanager/client.ts 中
this.useMock = useMockData === true || 
    (nodeEnv === 'development' && !apiKey);
```

**Mock 模式会在以下情况启用：**
1. ✅ `USE_MOCK_DATA="true"`（明确启用）
2. ⚠️ `NODE_ENV="development"` **且** `OPMANAGER_API_KEY` 未设置（开发环境后备逻辑）

**Mock 模式会在以下情况禁用：**
1. ✅ `USE_MOCK_DATA="false"` **且** `NODE_ENV="production"`
2. ✅ `USE_MOCK_DATA="false"` **且** `NODE_ENV="development"` **且** `OPMANAGER_API_KEY` 已设置

---

## 🚀 生产环境推荐配置

### 方式 1：使用 `NODE_ENV="production"`（推荐）

```bash
# .env 文件
NODE_ENV="production"
USE_MOCK_DATA="false"
OPMANAGER_BASE_URL="http://your-opmanager-server:8060"
OPMANAGER_API_KEY="your-real-api-key"
```

**优点：**
- 明确标识为生产环境
- 即使忘记设置 `USE_MOCK_DATA`，也不会因为缺少 API Key 而启用 Mock

### 方式 2：开发环境但配置了 API Key

```bash
# .env 文件
NODE_ENV="development"
USE_MOCK_DATA="false"
OPMANAGER_BASE_URL="http://your-opmanager-server:8060"
OPMANAGER_API_KEY="your-real-api-key"
```

**适用场景：**
- 在开发环境中测试真实 OpManager API
- 需要同时支持 Mock 和真实 API 切换

---

## ✅ 验证配置

### 1. 检查环境变量

启动服务后，查看控制台输出：

```
🔧 OpManagerClient initialized - Mock Mode: ❌ DISABLED
   Connecting to OpManager at: http://your-opmanager-server:8060
```

如果看到 `✅ ENABLED`，说明仍在使用 Mock 数据。

### 2. 测试 API 连接

```bash
# 在项目根目录执行
npm run dev
# 或
npm start
```

查看日志，确认：
- ✅ 没有 "Using Mock Data Store" 的提示
- ✅ 有 "Connecting to OpManager at: ..." 的提示
- ✅ API 请求成功（没有连接错误）

### 3. 检查数据采集

查看数据采集服务的日志：

```bash
# 如果使用 PM2
pm2 logs monitoring-collector

# 应该看到类似输出：
# 🔍 Fetching interfaces for device IP: 1.1.1.45
# 📡 Found 33 interfaces for device IP: 1.1.1.45
```

如果看到 "Mock" 相关的日志，说明仍在使用 Mock 数据。

---

## 🔧 故障排查

### 问题 1：设置了 `USE_MOCK_DATA="false"` 但仍使用 Mock

**可能原因：**
1. `NODE_ENV="development"` 且 `OPMANAGER_API_KEY` 未设置
2. 环境变量未正确加载（需要重启服务）

**解决方案：**
```bash
# 方案 A：设置 NODE_ENV="production"
NODE_ENV="production"
USE_MOCK_DATA="false"
OPMANAGER_API_KEY="your-api-key"

# 方案 B：确保 OPMANAGER_API_KEY 已设置
NODE_ENV="development"
USE_MOCK_DATA="false"
OPMANAGER_API_KEY="your-api-key"  # 必须设置

# 然后重启服务
pm2 restart all
```

### 问题 2：API 连接失败

**检查清单：**
- ✅ `OPMANAGER_BASE_URL` 是否正确（包含协议 `http://` 或 `https://`）
- ✅ `OPMANAGER_API_KEY` 是否有效
- ✅ OpManager 服务器是否可访问（网络连接）
- ✅ OpManager REST API 是否已启用（在 OpManager 用户管理中）

**测试连接：**
```bash
# 使用 curl 测试
curl -k -H "apiKey: your-api-key" \
     "http://your-opmanager-server:8060/api/json/device/listDevices?start=0&size=1"
```

### 问题 3：环境变量未生效

**可能原因：**
- `.env` 文件位置不正确（应在项目根目录）
- 服务未重启（环境变量只在启动时加载）
- 使用了 `.env.local` 或其他环境文件

**解决方案：**
```bash
# 1. 确认 .env 文件位置
ls -la .env

# 2. 检查环境变量是否加载
node -e "require('dotenv').config(); console.log(process.env.USE_MOCK_DATA)"

# 3. 重启服务
pm2 restart all
# 或
npm run dev
```

---

## 📝 配置示例

### 开发环境（使用 Mock）

```bash
NODE_ENV="development"
USE_MOCK_DATA="true"
# OPMANAGER_API_KEY 可以不设置
```

### 开发环境（测试真实 API）

```bash
NODE_ENV="development"
USE_MOCK_DATA="false"
OPMANAGER_BASE_URL="http://test-opmanager:8060"
OPMANAGER_API_KEY="test-api-key"
```

### 生产环境（使用真实 API）

```bash
NODE_ENV="production"
USE_MOCK_DATA="false"
OPMANAGER_BASE_URL="http://production-opmanager:8060"
OPMANAGER_API_KEY="production-api-key"
OPMANAGER_TIMEOUT="30000"
```

---

## 🎯 总结

**切换到真实 OpManager API 的完整步骤：**

1. ✅ 在 `.env` 文件中设置 `USE_MOCK_DATA="false"`
2. ✅ 配置 `OPMANAGER_BASE_URL`（真实 OpManager 服务器地址）
3. ✅ 配置 `OPMANAGER_API_KEY`（从 OpManager 管理界面获取）
4. ✅ 建议设置 `NODE_ENV="production"`（生产环境）
5. ✅ 重启服务（PM2 或 npm）
6. ✅ 验证日志，确认 Mock 模式已禁用

**关键点：**
- `USE_MOCK_DATA` 必须是字符串 `"false"`（带引号）
- 如果 `NODE_ENV="development"` 且没有 `OPMANAGER_API_KEY`，仍会使用 Mock
- 生产环境建议同时设置 `NODE_ENV="production"` 和 `USE_MOCK_DATA="false"`

---

## 🔗 相关文档

- 生产环境启动指南：`PRODUCTION-STARTUP-GUIDE.md`
- 数据库迁移指南：`DATABASE-MIGRATION-GUIDE.md`
- OpManager API 集成文档：`opmanager-official-api-integration.md`
