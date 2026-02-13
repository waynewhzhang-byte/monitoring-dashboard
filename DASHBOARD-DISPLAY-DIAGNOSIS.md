# 🔍 大屏无数据显示诊断指南

> 当大屏没有显示数据时，使用本指南快速定位问题

---

## 🚀 快速诊断（1 分钟）

```bash
# 运行自动诊断工具
npm run diagnose:display
```

这个命令会自动检查：
- ✅ 环境配置
- ✅ OpManager 连接
- ✅ 数据库数据
- ✅ Business View 配置（⭐ 关键）
- ✅ API 端点
- ✅ Redis 连接
- ✅ 采集器状态

---

## 📋 诊断流程图

```
大屏无数据？
    │
    ├─> 运行 npm run diagnose:display
    │
    ├─> 查看诊断报告
    │   ├─> ❌ 环境配置失败 → 检查 .env 文件
    │   ├─> ❌ OpManager 连接失败 → 检查网络和 API Key
    │   ├─> ❌ 数据库无数据 → 同步设备
    │   ├─> ❌ Business View 未配置 → 配置 BV（关键）
    │   ├─> ❌ 指标数据过期 → 启动采集器
    │   └─> ✅ 全部通过 → 检查前端代码
    │
    └─> 根据建议修复问题
```

---

## 🎯 常见问题和解决方案

### 问题 1: 环境配置失败 ❌

**症状**: `.env` 文件不存在或环境变量缺失

**解决方案**:
```bash
# 1. 复制示例配置
cp .env.example .env

# 2. 编辑 .env 文件，填入必需配置
# 必需变量：
# - DATABASE_URL
# - OPMANAGER_BASE_URL
# - OPMANAGER_API_KEY
```

---

### 问题 2: OpManager 连接失败 ❌

**症状**: API 请求返回 401、403、500 或超时

**可能原因和解决方案**:

#### 原因 A: API Key 错误
```bash
# 检查 OpManager API Key 是否正确
# 登录 OpManager → Admin → API → 获取 API Key
```

#### 原因 B: 网络不通
```bash
# 测试网络连通性
ping 10.141.69.192

# 测试 HTTPS 连接
curl -k https://10.141.69.192:8061/api/json/device/listDevices_v2
```

#### 原因 C: SSL 证书问题
```bash
# 在 .env 中添加（开发环境）
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

### 问题 3: 数据库中没有设备数据 ❌

**症状**: 诊断显示"设备数据: 数据库中没有设备数据"

**解决方案**:

#### 方式 1: 通过 Admin 面板同步（推荐）
```
1. 访问 http://localhost:3000/admin/devices
2. 点击 "Sync Devices from OpManager" 按钮
3. 等待同步完成（通常 30-60 秒）
```

#### 方式 2: 通过 API 同步
```bash
curl -X POST http://localhost:3000/api/devices/sync
```

#### 方式 3: 通过脚本同步
```bash
npm run check:sync
```

**验证同步成功**:
```bash
npm run check:all
# 应该显示设备数量 > 0
```

---

### 问题 4: Business View 未配置 ❌ (⭐ 最常见)

**症状**:
- 诊断显示"未配置任何 Business View"
- 或"没有激活的 Business View"
- 或"Business View 没有关联设备"

**为什么 Business View 是必需的？**

Business View 是连接 OpManager 和大屏的核心配置：
- 定义了设备的业务分组
- 拓扑图必须基于 Business View
- 采集器通过 Business View 同步设备关联

**解决方案**:

#### 步骤 1: 查看 OpManager 中的 Business Views
```bash
# 运行诊断查看可用的 BV
npm run diagnose:opmanager
# 记录输出的 Business View 名称
```

#### 步骤 2: 在 Admin 面板添加配置
```
1. 访问 http://localhost:3000/admin/topology
2. 添加 Business View:
   - OpManager View Name: 出口业务 （必须与 OpManager 完全一致！）
   - Display Name: 出口业务拓扑 （可选，用户友好名称）
   - 点击 "Add View"
3. 确保开关是激活状态 ✅
```

#### 步骤 3: 等待采集器同步
```bash
# 采集器每 5 分钟同步一次拓扑数据
# 或重启采集器立即同步
pm2 restart collector

# 验证 Business View 已关联设备
npm run check:all
```

**关键注意事项**:
- ⚠️ Business View 名称必须精确匹配 OpManager，包括空格和大小写
- ⚠️ 必须激活 Business View（isActive = true）
- ⚠️ 需要等待采集器同步设备关联（最多 5 分钟）

---

### 问题 5: 采集器未运行 ❌

**症状**:
- 诊断显示"没有指标数据"
- 或"最新数据是 X 分钟前，采集器可能未运行"

**解决方案**:

#### 方式 1: 启动采集器（前台）
```bash
npm run collector
# 保持终端运行
```

#### 方式 2: 使用 PM2（推荐生产环境）
```bash
# 安装 PM2
npm install -g pm2

# 启动采集器
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs collector
```

#### 方式 3: 使用 nohup（Linux）
```bash
nohup npm run collector > collector.log 2>&1 &
```

**验证采集器正在工作**:
```bash
# 等待 2-3 分钟后检查
npm run check:all

# 应该看到最新指标时间是 1-2 分钟前
```

---

### 问题 6: API 返回空数据 ⚠️

**症状**:
- API 响应成功 (200 OK)
- 但返回的数据为空或数量为 0

**可能原因和解决方案**:

#### 原因 A: 数据库中没有数据
```bash
# 检查数据库
npm run check:all

# 如果没有设备，回到"问题 3"同步设备
```

#### 原因 B: Business View 过滤导致
```bash
# 检查 Business View 配置
# 确认 Business View 已激活且关联了设备
```

#### 原因 C: 查询参数错误
```bash
# 检查前端代码中的 API 调用
# 例如：tags 过滤、businessView 过滤等
```

**调试步骤**:
```bash
# 1. 测试 API 端点
curl http://localhost:3000/api/devices
curl http://localhost:3000/api/dashboard/overview

# 2. 检查响应内容
# 如果返回 [], 说明数据库为空
# 如果返回 null, 说明查询逻辑有问题
```

---

### 问题 7: Redis 连接失败 ⚠️

**症状**: 诊断显示"Redis 连接失败"

**影响**: Redis 是可选的，但建议配置以提升性能

**解决方案**:

#### 选项 A: 不使用 Redis（快速）
```bash
# 在 .env 中注释或删除 REDIS_URL
# REDIS_URL="redis://localhost:6379"

# 系统会自动跳过 Redis，直接从数据库读取
```

#### 选项 B: 启动 Redis 服务（推荐）
```bash
# Docker 方式
docker run -d -p 6379:6379 redis:7-alpine

# 或使用 docker-compose
docker-compose up -d redis

# 验证 Redis 运行
redis-cli ping
# 应该返回 PONG
```

---

## 🛠️ 诊断工具对照表

| 工具命令 | 用途 | 何时使用 |
|---------|------|----------|
| `npm run diagnose:display` | 完整诊断链路 | ⭐ 大屏无数据时首先运行 |
| `npm run verify:data-flow` | 验证数据流 | 验证整体数据流是否正常 |
| `npm run diagnose:opmanager` | 检查 OpManager | OpManager 连接问题 |
| `npm run check:all` | 检查数据库数据 | 验证数据是否已同步 |
| `npm run check:sync` | 检查同步状态 | 设备同步问题 |
| `npm run check:interfaces` | 检查接口数据 | 接口采集问题 |
| `npm run check:alarms` | 检查告警数据 | 告警显示问题 |

---

## 📊 完整诊断流程（5-10 分钟）

### 第一步: 运行诊断工具
```bash
npm run diagnose:display
```

### 第二步: 根据诊断结果修复

#### 如果环境配置失败
```bash
# 1. 检查 .env 文件
cat .env

# 2. 对比必需变量
# DATABASE_URL, OPMANAGER_BASE_URL, OPMANAGER_API_KEY
```

#### 如果 OpManager 连接失败
```bash
# 1. 测试连接
npm run verify:opmanager-apis

# 2. 检查网络
ping <OpManager_IP>
```

#### 如果数据库无数据
```bash
# 1. 同步设备
访问 /admin/devices → 点击 Sync Devices

# 2. 验证
npm run check:all
```

#### 如果 Business View 未配置
```bash
# 1. 查看可用的 BV
npm run diagnose:opmanager

# 2. 在 /admin/topology 添加配置

# 3. 重启采集器
pm2 restart collector
```

#### 如果采集器未运行
```bash
# 启动采集器
pm2 start ecosystem.config.js

# 查看日志
pm2 logs collector
```

### 第三步: 验证修复
```bash
# 1. 重新运行诊断
npm run diagnose:display

# 2. 检查大屏
访问 http://localhost:3000/dashboards
```

---

## 🎯 典型场景示例

### 场景 1: 全新部署，大屏无数据

**诊断输出**:
```
❌ 设备数据: 数据库中没有设备数据
❌ Business View 配置: 未配置任何 Business View
❌ 指标数据: 数据库中没有指标数据
```

**修复步骤**:
1. 同步设备: 访问 `/admin/devices` → Sync Devices
2. 配置 BV: 访问 `/admin/topology` → 添加 Business View
3. 启动采集器: `pm2 start ecosystem.config.js`
4. 等待 5 分钟
5. 刷新大屏

---

### 场景 2: 曾经有数据，现在没有了

**诊断输出**:
```
✅ 设备数据: 共 50 台设备
✅ Business View 配置: 已配置 1 个 Business View
❌ 指标数据: 最新数据是 30 分钟前，采集器可能未运行
```

**修复步骤**:
1. 检查采集器状态: `pm2 status`
2. 如果未运行，启动: `pm2 start ecosystem.config.js`
3. 如果已运行但不采集，重启: `pm2 restart collector`
4. 查看日志排查问题: `pm2 logs collector`

---

### 场景 3: API 有数据，大屏不显示

**诊断输出**:
```
✅ 所有检查通过
✅ API 返回数据正常
```

**可能原因**: 前端代码问题

**排查步骤**:
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 是否有错误
3. 查看 Network 标签，检查 API 请求是否成功
4. 检查前端组件是否正确处理 API 响应

**常见前端问题**:
```typescript
// ❌ 没有处理空数据
const devices = data.devices; // 如果 data.devices 是 undefined 会报错

// ✅ 正确处理
const devices = data?.devices || [];
```

---

## 📞 获取帮助

### 如果问题仍未解决

1. **收集诊断信息**:
```bash
# 运行完整诊断并保存输出
npm run diagnose:display > diagnosis.txt 2>&1
```

2. **检查日志**:
```bash
# 采集器日志
pm2 logs collector --lines 100

# 应用日志
pm2 logs monitoring-dashboard --lines 100
```

3. **提供信息**:
- 诊断报告 (diagnosis.txt)
- 错误日志
- 浏览器控制台错误截图
- 具体的错误信息

---

## ✅ 成功标志

当以下条件都满足时，大屏应该正常显示数据：

- ✅ `npm run diagnose:display` 显示所有关键项通过
- ✅ 数据库中有设备数据（> 0 台）
- ✅ Business View 已配置且激活
- ✅ 采集器正在运行（最新指标 < 5 分钟前）
- ✅ API 返回非空数据
- ✅ 浏览器控制台无错误

---

## 📚 相关文档

- **[REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md)** - 必需 vs 可选配置
- **[QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)** - 快速启动清单
- **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** - 完整配置指南
- **[DIAGNOSIS-GUIDE.md](./DIAGNOSIS-GUIDE.md)** - 生产环境诊断
- **[CLAUDE.md](./CLAUDE.md)** - 开发者指南

---

**最后更新**: 2024-01-24
