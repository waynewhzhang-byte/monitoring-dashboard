# 生产就绪性快速修复指南

基于生产就绪性评估报告，本指南提供快速修复步骤，使项目达到生产部署标准。

---

## 🚀 快速开始（30分钟）

### Step 1: 创建环境变量文件

创建 `.env.local` 文件（参考 `.env.example`）：

```bash
# 复制模板（如果存在）
cp .env.example .env.local

# 或手动创建
touch .env.local
```

**必需配置**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/monitoring-dashboard"
OPMANAGER_BASE_URL="https://your-opmanager-server.com"
OPMANAGER_API_KEY="your-api-key"
NODE_ENV="production"
```

### Step 2: 更新导入语句

在需要使用环境变量的地方，更新导入：

```typescript
// 旧方式
const baseUrl = process.env.OPMANAGER_BASE_URL;

// 新方式
import { env } from '@/lib/env';
const baseUrl = env.OPMANAGER_BASE_URL;
```

### Step 3: 更新错误处理

在 API 路由中使用统一错误处理：

```typescript
// src/app/api/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError, errorToJSON } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 你的业务逻辑
    const devices = await fetchDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    // 统一错误处理
    const errorResponse = errorToJSON(error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    
    // 记录错误日志
    if (statusCode >= 500) {
      logger.error('API error', { error, path: request.url });
    } else {
      logger.warn('Client error', { error, path: request.url });
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
```

### Step 4: 验证健康检查

启动应用后，访问健康检查端点：

```bash
curl http://localhost:3000/api/health
```

应该返回：
```json
{
  "status": "healthy",
  "timestamp": "2024-12-15T10:00:00.000Z",
  "checks": {
    "application": { "healthy": true },
    "database": { "healthy": true },
    "redis": { "healthy": true },
    "opmanager": { "healthy": true }
  }
}
```

---

## 📋 完整修复清单

### P0 - 必须完成（生产部署前）

- [x] **环境变量验证** - 已创建 `src/lib/env.ts`
- [x] **统一错误处理** - 已创建 `src/lib/errors.ts`
- [x] **健康检查端点** - 已创建 `src/app/api/health/route.ts`
- [ ] **创建 `.env.example`** - 手动创建（参考上面的内容）
- [ ] **更新所有 API 路由** - 使用统一错误处理
- [ ] **更新环境变量使用** - 使用 `env` 而不是 `process.env`
- [ ] **API 安全** - 添加认证和限流（见下方）

### P1 - 强烈建议（生产稳定性）

- [ ] **统一日志系统** - 替换所有 `console.log` 为 `logger`
- [ ] **添加测试** - 至少为核心服务添加单元测试
- [ ] **数据采集重试** - 添加重试机制

---

## 🔧 详细修复步骤

### 1. API 安全（限流和认证）

创建限流中间件：

```typescript
// src/middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 分钟
const RATE_LIMIT_MAX = 100; // 每个 IP 100 次请求

export async function rateLimit(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit:${ip}`;
  
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW / 1000);
    }
    
    if (count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' } },
        { status: 429 }
      );
    }
  } catch (error) {
    // Redis 失败时允许请求（降级策略）
    console.error('Rate limit check failed:', error);
  }
  
  return null; // 继续处理请求
}
```

在 API 路由中使用：

```typescript
export async function GET(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = await rateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // 业务逻辑
  // ...
}
```

### 2. 统一日志系统

创建日志工具：

```typescript
// src/lib/logger.ts
import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}
```

替换所有 `console.log`:

```bash
# 使用 VS Code 全局搜索替换
# 搜索: console\.(log|error|warn|info)
# 替换为: logger.$1
```

### 3. 数据采集重试机制

更新数据采集服务：

```typescript
// src/services/opmanager/data-collector.ts
async listDevices(options = {}) {
  const maxRetries = 3;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await this.client.get('/api/json/v2/device/listDevices', {
        params: options,
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, i); // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay));
        logger.warn(`Retrying listDevices (attempt ${i + 1}/${maxRetries})`);
      }
    }
  }
  
  logger.error('Failed to fetch devices after retries', { error: lastError });
  throw new ExternalAPIError('Failed to fetch devices', 'OpManager');
}
```

---

## ✅ 验证清单

部署前验证：

- [ ] 环境变量验证通过（应用启动无错误）
- [ ] 健康检查端点返回 `healthy`
- [ ] 所有 API 路由使用统一错误处理
- [ ] 日志系统正常工作
- [ ] 数据采集服务有重试机制
- [ ] API 限流正常工作（测试 429 响应）

---

## 📚 参考文档

- [生产就绪性评估报告](./PRODUCTION-READINESS-ASSESSMENT.md)
- [环境变量配置](./.env.example)（需要手动创建）
- [错误处理指南](./src/lib/errors.ts)
- [健康检查实现](./src/app/api/health/route.ts)

---

## 🆘 遇到问题？

1. **环境变量验证失败**: 检查 `.env.local` 文件，确保所有必需变量已配置
2. **健康检查失败**: 检查数据库、Redis 和 OpManager 连接
3. **API 错误**: 查看日志文件 `logs/error.log` 和 `logs/combined.log`

---

**完成时间估算**: 
- P0 修复: 1-2 天
- P1 修复: 2-3 天
- 总计: 3-5 天
