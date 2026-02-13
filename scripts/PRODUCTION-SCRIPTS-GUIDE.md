# 生产服务器脚本使用指南

> **适用环境**: 只支持 `ts-node` 而不支持 `tsx` 的生产服务器

## 问题说明

在生产服务器上运行 TypeScript 脚本时遇到的常见问题：

1. **环境变量未加载**: `ts-node` 不会自动加载 `.env` 文件
2. **tsx 不可用**: 生产服务器只安装了 `ts-node`

## 解决方案

所有脚本已经更新为在运行前自动加载 `.env` 文件。

---

## 使用方法

### 1. 测试环境变量加载（推荐先运行）

验证 `.env` 文件中的环境变量是否正确配置：

```bash
# 使用 npm 脚本
npm run test:env

# 或直接运行
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/test-env.ts
```

**预期输出**:
```
Loading .env from: /opt/monitoring-app/.env

环境变量检查:
================================================================================
✅ DATABASE_URL: postgresql://postgr...
✅ OPMANAGER_BASE_URL: https://10.141.69.19...
✅ OPMANAGER_API_KEY: 42aa561c1e280e8a46a...
✅ REDIS_URL: redis://localhost:637...
✅ NODE_ENV: development
✅ PORT: 3000
================================================================================

✅ 所有必需的环境变量都已正确设置！
```

### 2. 运行 API 调用诊断

诊断 OpManager API 调用，对比原始 HTTP 调用和客户端封装调用的差异：

```bash
# 使用 npm 脚本（推荐）
npm run diagnose:api-calls:prod

# 或直接运行
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-api-calls.ts
```

**功能说明**:
- ✅ 测试 `listDevices` API (原始调用 vs 客户端调用)
- ✅ 测试 `getBusinessDetailsView` API (含中文参数)
- ✅ 对比两种调用方式的差异
- ✅ 生成详细的诊断报告 JSON 文件

---

## 其他可用的生产脚本

### 设备检查脚本

```bash
# 检查设备 isManaged 状态
npm run check:isManaged

# 检查设备同步状态
npm run check:sync

# 检查接口数量
npm run check:interfaces

# 检查设备标签
npm run check:tags

# 检查告警同步
npm run check:alarms
```

### 数据修复脚本

```bash
# 修复接口 isMonitored 字段
npm run fix:isMonitored
```

### 数据采集器

```bash
# 启动数据采集器（生产环境）
npm run collector

# 启动模拟数据采集器（测试环境）
npm run mock-collector
```

---

## 故障排查

### 问题 1: 环境变量未加载

**症状**:
```
❌ 环境变量验证失败:
  - DATABASE_URL: Required
  - OPMANAGER_BASE_URL: Required
  - OPMANAGER_API_KEY: Required
```

**解决方法**:
1. 确认 `.env` 文件存在于项目根目录
2. 检查 `.env` 文件内容是否正确
3. 运行 `npm run test:env` 验证环境变量

**检查 .env 文件**:
```bash
# 查看 .env 文件内容（隐藏敏感信息）
cat .env | grep -E "^(DATABASE_URL|OPMANAGER_BASE_URL|OPMANAGER_API_KEY)="
```

### 问题 2: 模块导入错误

**症状**:
```
Error: Cannot find module '@/services/...'
```

**解决方法**:
使用完整的 ts-node 命令（包含 tsconfig-paths）：
```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/xxx.ts
```

### 问题 3: TypeScript 编译错误

**症状**:
```
TSError: ⨯ Unable to compile TypeScript
```

**解决方法**:
1. 确认使用了正确的 tsconfig: `--project tsconfig.node.json`
2. 检查 TypeScript 版本: `npx tsc --version`
3. 重新安装依赖: `npm install`

---

## 环境变量配置参考

确保 `.env` 文件包含以下必需变量：

```bash
# 数据库
DATABASE_URL='postgresql://user:password@localhost:5432/monitoring-dashboard'

# Redis
REDIS_URL='redis://localhost:6379'

# OpManager API
OPMANAGER_BASE_URL='https://10.141.69.192:8061'
OPMANAGER_API_KEY='your-api-key-here'
OPMANAGER_TIMEOUT=10000

# 应用配置
NODE_ENV='development'
PORT=3000

# 数据采集配置
COLLECT_METRICS_INTERVAL=60
COLLECT_ALARMS_INTERVAL=30
SYNC_DEVICES_INTERVAL=600

# 日志配置
LOG_LEVEL='info'
```

---

## 生产环境最佳实践

### 1. 始终使用 npm 脚本

```bash
# ✅ 推荐
npm run diagnose:api-calls:prod

# ❌ 避免
tsx scripts/diagnose-api-calls.ts  # 生产服务器不支持
```

### 2. 定期检查环境变量

```bash
# 每次部署后运行
npm run test:env
```

### 3. 查看诊断报告

API 诊断脚本会生成 JSON 报告文件：
```bash
# 查找最新的诊断报告
ls -lt api-diagnosis-*.json | head -1

# 查看报告内容
cat api-diagnosis-*.json | jq .
```

### 4. 日志监控

脚本运行时的输出会详细记录：
- 请求配置（URL、参数、Headers）
- 响应状态和数据结构
- 错误信息和堆栈跟踪
- 数据对比分析

---

## 常见使用场景

### 场景 1: 新部署后验证

```bash
# 1. 测试环境变量
npm run test:env

# 2. 诊断 API 调用
npm run diagnose:api-calls:prod

# 3. 检查数据同步
npm run check:sync
```

### 场景 2: API 调用问题排查

```bash
# 运行诊断，对比代码调用和 Postman 调用
npm run diagnose:api-calls:prod

# 查看生成的报告
cat api-diagnosis-*.json | jq '.results[] | {api, method, success, error}'
```

### 场景 3: 设备数据验证

```bash
# 检查设备同步状态
npm run check:sync

# 检查接口数据
npm run check:interfaces

# 检查告警数据
npm run check:alarms
```

---

## 技术细节

### 为什么需要手动加载 .env？

- **Next.js 应用**: 自动加载 `.env`、`.env.local` 等文件
- **独立 ts-node 脚本**: 不会自动加载，需要手动使用 `dotenv`

### 脚本修改

所有生产脚本都在文件开头添加了：

```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') });
```

这确保了在导入任何其他模块之前，环境变量就已经被加载。

---

## 支持与反馈

遇到问题？请检查：

1. ✅ `.env` 文件存在且配置正确
2. ✅ 使用了 `npm run` 命令而不是直接运行 `tsx`
3. ✅ Node.js 和 npm 版本符合要求
4. ✅ 所有依赖已正确安装 (`npm install`)

如果问题仍然存在，请提供：
- 运行的完整命令
- 完整的错误信息
- `npm run test:env` 的输出
