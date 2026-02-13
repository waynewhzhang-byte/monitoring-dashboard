# 环境变量加载问题修复说明

> 修复时间: 2026-01-23
> 问题: `npm run verify:opmanager-apis` 无法读取 `.env` 文件

---

## 🐛 问题描述

在生产环境运行 `npm run verify:opmanager-apis` 时报错：

```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["DATABASE_URL"],
    "message": "Required"
  },
  ...
]
```

**症状**:
- ❌ `verify:opmanager-apis` 失败，提示环境变量缺失
- ✅ `test:env` 成功，能正确读取环境变量
- ✅ `diagnose:api-calls:prod` 成功，能正确读取环境变量

---

## 🔍 根本原因

**问题**: `verify-all-opmanager-apis.ts` 脚本在导入依赖环境变量的模块 **之前** 没有显式加载 `.env` 文件。

**对比**:

### ❌ 修复前（错误）

```typescript
// verify-all-opmanager-apis.ts
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';  // env.ts 使用 Zod 验证，如果环境变量缺失会抛出错误

// ...rest of code
```

**问题**: 当导入 `env` 模块时，`src/lib/env.ts` 会立即执行 Zod 验证。如果环境变量未加载，验证失败，脚本崩溃。

### ✅ 修复后（正确）

```typescript
// verify-all-opmanager-apis.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// CRITICAL: Load .env file BEFORE importing any modules
const envPath = path.resolve(__dirname, '../.env');
console.log('🔧 Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

// Now safe to import modules that depend on environment variables
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';
```

**修复**: 在导入任何依赖环境变量的模块之前，先使用 `dotenv.config()` 加载 `.env` 文件。

---

## ✅ 已修复的文件

### 1. **主脚本文件**

**文件**: [scripts/verify-all-opmanager-apis.ts](verify-all-opmanager-apis.ts)

**修改内容**:
- ✅ 在文件顶部添加 `dotenv` 导入和配置
- ✅ 在导入 `opClient` 和 `env` **之前** 加载环境变量
- ✅ 添加环境变量加载日志
- ✅ 优化 `printEnvironmentInfo()` 函数，添加错误处理

### 2. **使用文档**

**文件**: [scripts/VERIFY-OPMANAGER-API-README.md](VERIFY-OPMANAGER-API-README.md)

**修改内容**:
- ✅ 添加新的"问题 1: ZodError: Required"故障排查指南
- ✅ 更新后续问题编号（2-8）
- ✅ 提供环境变量验证步骤

---

## 🚀 验证修复

### 步骤 1: 确认 .env 文件存在

```bash
ls -la .env
# 应该看到 .env 文件（不是 .env.local 或 .env.example）
```

### 步骤 2: 验证环境变量加载

```bash
npm run test:env
```

**预期输出**:
```
Loading .env from: /opt/monitoring-app/.env
[dotenv@17.2.3] injecting env (18) from .env

环境变量检查:
================================================================================
✅ DATABASE_URL: postgresql://postgre...
✅ OPMANAGER_BASE_URL: https://10.141.69.19...
✅ OPMANAGER_API_KEY: 42aa561c1e280e8a46a5...
✅ REDIS_URL: redis://localhost:63...
✅ NODE_ENV: development
✅ PORT: 3000
================================================================================
```

### 步骤 3: 运行修复后的验证脚本

```bash
npm run verify:opmanager-apis
```

**预期输出**:
```
🔧 Loading environment variables from: /opt/monitoring-app/.env

================================================================================
  OpManager API 全面验证测试
================================================================================

◆ 环境配置
────────────────────────────────────────────────────────────────────────────────
  OpManager Base URL: https://10.141.69.192:8061
  API Key 配置状态:   ✅ 已配置 (42aa561c1e280e8a46a5...)
  超时时间:          30000ms
  Mock 模式:         ❌ 禁用
  Node 环境:         development
  数据库配置:        ✅ 已配置
...
```

---

## 📊 技术细节

### 为什么其他脚本正常工作？

对比其他脚本的实现：

#### ✅ test-env.ts（正常）

```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });  // ← 在导入 env 之前加载

// 后续逻辑...
```

#### ✅ diagnose-api-calls.ts（正常）

```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });  // ← 在导入 env 之前加载

import { opClient } from '@/services/opmanager/client';
```

#### ❌ verify-all-opmanager-apis.ts（修复前）

```typescript
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';  // ← 没有先加载环境变量！

// 导致 env.ts 中的 Zod 验证失败
```

---

## 🎯 最佳实践

### 规则: 脚本环境变量加载顺序

**所有 ts-node 脚本都应遵循此模式**:

```typescript
// 1️⃣ 首先: 导入 dotenv 和 path
import * as dotenv from 'dotenv';
import * as path from 'path';

// 2️⃣ 其次: 加载 .env 文件
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// 3️⃣ 最后: 导入依赖环境变量的模块
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
// ...其他导入
```

**为什么顺序重要？**

1. Node.js 在 `import` 时会立即执行模块代码
2. `@/lib/env.ts` 使用 Zod 在模块加载时验证环境变量
3. 如果环境变量未加载，Zod 验证失败，抛出 `ZodError`
4. 脚本崩溃，无法继续执行

---

## 📝 检查清单

修复后验证：

- [ ] `.env` 文件存在于项目根目录
- [ ] `.env` 包含所有必需变量（DATABASE_URL, OPMANAGER_BASE_URL, OPMANAGER_API_KEY, REDIS_URL）
- [ ] `npm run test:env` 成功显示所有环境变量
- [ ] `npm run verify:opmanager-apis` 能正常启动
- [ ] 看到 "🔧 Loading environment variables from: ..." 日志
- [ ] 看到 "环境配置" 部分显示正确的配置信息

---

## 🔄 相关修改

### Git Diff 摘要

```diff
// scripts/verify-all-opmanager-apis.ts

+ // CRITICAL: Load .env file BEFORE importing any modules
+ import * as dotenv from 'dotenv';
+ import * as path from 'path';
+
+ const envPath = path.resolve(__dirname, '../.env');
+ console.log('🔧 Loading environment variables from:', envPath);
+ dotenv.config({ path: envPath });
+
+ // Now import modules that depend on environment variables
  import { opClient } from '@/services/opmanager/client';
  import { env } from '@/lib/env';
```

---

## 🆘 如果修复后仍有问题

### 1. 确认 .env 文件位置

```bash
# 应该在项目根目录
pwd  # /opt/monitoring-app
ls -la .env  # 应该存在
```

### 2. 确认 dotenv 包已安装

```bash
npm list dotenv
# 应该显示 dotenv@17.2.3 或类似版本
```

### 3. 手动测试 dotenv 加载

```bash
node -e "require('dotenv').config({ path: '.env' }); console.log(process.env.OPMANAGER_BASE_URL)"
# 应该输出 OpManager URL
```

### 4. 检查文件权限

```bash
# .env 文件应该可读
ls -l .env
# 应该显示 -rw-r--r-- 或类似权限
```

---

## 📞 反馈

如果问题仍未解决，请提供：

1. **.env 文件检查**:
   ```bash
   ls -la .env
   head -1 .env  # 第一行（不包含敏感信息）
   ```

2. **环境变量测试输出**:
   ```bash
   npm run test:env
   ```

3. **完整错误日志**:
   ```bash
   npm run verify:opmanager-apis 2>&1
   ```

---

**修复完成时间**: 2026-01-23
**测试状态**: 待用户验证
**影响范围**: 仅 verify-all-opmanager-apis 脚本
