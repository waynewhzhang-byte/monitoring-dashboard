# Dashboard 数据无法展示问题诊断报告

## 问题概述

生产环境中 `/app/dashboard/page.tsx` 页面无法正确展示数据，尽管已成功与后端 OpManager API 同步。

## 根本原因分析

### 1. **缺失的 API 端点** ⚠️ (P0 - 关键问题)

**位置**: `src/app/dashboard/page.tsx:56`

```typescript
const response = await fetch(`/api/stats/business-view?bvName=`);
```

**问题**: `/api/stats/business-view` API 端点**不存在**，导致前端无法获取统计数据。

**影响范围**:
- `DeviceOverviewDonut` 组件无法获取设备统计数据
- 设备总览圆环图显示为空或显示加载状态
- 设备类型分布数据缺失

### 2. 数据流架构

**当前数据流**:
```
OpManager API → 数据采集器 (Collector) → PostgreSQL → Next.js API → 前端组件
```

**关键 API 端点**:
- ✅ `/api/devices` - 设备列表
- ✅ `/api/dashboard/overview` - 大屏总览（已存在但未被使用）
- ✅ `/api/dashboard/grouped-devices` - 按业务视图分组的设备
- ✅ `/api/dashboard/tagged-devices` - 按标签筛选的设备
- ❌ `/api/stats/business-view` - **缺失**

## 解决方案

### ✅ 已实施的修复

**创建了缺失的 API**: `src/pages/api/stats/business-view.ts`

**功能特性**:
1. 支持全局统计（`bvName=''`）和业务视图过滤
2. 返回设备类型分布（网络设备、服务器、其他）
3. 返回设备状态统计（在线、离线、警告、错误）
4. 计算可用性百分比和健康度评分
5. 使用并行查询优化性能

**API 响应格式**:
```typescript
{
  "devices": {
    "totalAll": number,
    "online": number,
    "offline": number,
    "warning": number,
    "error": number,
    "availability": number,  // 百分比
    "healthScore": number,   // 0-100
    "byType": {
      "network": number,
      "server": number,
      "other": number
    },
    "byStatus": { ... },
    "typeBreakdown": { ... }
  },
  "businessView": string,
  "timestamp": string
}
```

## 验证步骤

### 1. 重启开发/生产服务器

```bash
# 开发环境
npm run dev

# 生产环境
npm run build && npm run start
```

### 2. 测试 API 端点

```bash
# 测试全局统计
curl http://localhost:3000/api/stats/business-view?bvName=

# 测试特定业务视图
curl http://localhost:3000/api/stats/business-view?bvName=核心网络
```

**预期响应**: 应返回完整的设备统计数据

### 3. 检查前端数据渲染

打开浏览器开发者工具，访问 `/dashboard`:

```javascript
// 在 Console 中检查
// 1. 检查 API 调用
// Network Tab → 查找 /api/stats/business-view 请求
// 应该返回 200 状态码和 JSON 数据

// 2. 检查组件状态
// React DevTools → 找到 DashboardPage 组件
// 查看 stats state 是否有数据
```

### 4. 验证数据库中有数据

```sql
-- 检查设备总数
SELECT COUNT(*) as total_devices FROM devices WHERE "isMonitored" = true;

-- 检查设备类型分布
SELECT type, COUNT(*) as count FROM devices 
WHERE "isMonitored" = true 
GROUP BY type;

-- 检查设备状态分布
SELECT status, COUNT(*) as count FROM devices 
WHERE "isMonitored" = true 
GROUP BY status;
```

## 潜在的其他问题

### 1. 数据库中无监控设备

**检查**:
```sql
SELECT COUNT(*) FROM devices WHERE "isMonitored" = true;
```

**如果返回 0**:
- 运行设备同步脚本: `npm run sync:devices`
- 或手动调用: `curl -X POST http://localhost:3000/api/devices/sync`

### 2. 业务视图配置缺失

**检查**:
```sql
SELECT * FROM "BusinessViewConfig" WHERE "isActive" = true;
```

**如果为空**:
- 确保已初始化业务视图配置
- 运行初始化脚本: `npm run scripts:init-business-views`

### 3. OpManager API 连接问题

**检查环境变量**:
```bash
# .env 或 .env.local
OPMANAGER_BASE_URL=http://your-opmanager-server:8061
OPMANAGER_API_KEY=your-api-key-here
```

**测试连接**:
```bash
npm run scripts:verify-opmanager
```

### 4. 前端组件的 isVisible 属性

Dashboard 页面使用 `isVisible` 属性来控制组件的数据获取和渲染：

```typescript
// 确保 activeTab 状态正确切换
<DeviceOverviewDonut data={stats} isVisible={activeTab === 0} />
```

## 性能优化建议

### 1. 启用 Redis 缓存

缓存统计数据以减少数据库查询：

```typescript
// 在 /api/stats/business-view.ts 中
const cacheKey = `stats:bv:${viewName || 'global'}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... 查询数据库 ...

await redis.set(cacheKey, JSON.stringify(data), 'EX', 60); // 60秒缓存
```

### 2. 使用 SWR 或 React Query

前端使用 SWR 进行自动重新验证和缓存：

```typescript
import useSWR from 'swr';

const { data: stats } = useSWR(
  '/api/stats/business-view?bvName=',
  fetcher,
  { refreshInterval: 15000 } // 15秒刷新
);
```

### 3. 监控 API 性能

```typescript
const startTime = Date.now();
// ... 查询逻辑 ...
const duration = Date.now() - startTime;
logger.info('Stats API performance', { duration, viewName });
```

## 监控和日志

### 生产环境监控

1. **启用结构化日志**:
   ```typescript
   logger.info('[API /api/stats/business-view] Request', {
     bvName: viewName,
     timestamp: new Date().toISOString()
   });
   ```

2. **错误追踪**:
   - 所有 API 错误已记录到 console.error
   - 建议集成 Sentry 或其他错误追踪服务

3. **性能监控**:
   - 监控 API 响应时间
   - 监控数据库查询性能
   - 设置告警阈值（如响应时间 > 2秒）

## 总结

**主要问题**: 缺失 `/api/stats/business-view` API 端点

**解决方案**: 已创建完整的 API 实现

**影响组件**:
- ✅ `DeviceOverviewDonut` - 设备总览圆环图
- ✅ `TaggedDevicePanel` - 标签设备面板（使用 /api/devices）
- ✅ `BusinessViewGroupedPanel` - 业务视图分组面板（使用 /api/dashboard/grouped-devices）

**下一步**:
1. ✅ 重启服务器应用新的 API
2. ⏳ 验证数据正确展示
3. ⏳ 检查所有三个 Tab 页的数据渲染
4. ⏳ 监控生产环境性能和错误

## 附加资源

- **API 文档**: 见项目 README.md
- **数据库 Schema**: `prisma/schema.prisma`
- **故障排查脚本**: `scripts/diagnose-dashboard-data.ts`
