# 大屏数据问题解决方案

## 诊断结果总结

### ✅ 已配置完成的部分

1. **设备标签配置** ✅
   - 总设备数：50
   - 有标签的设备：50个
   - 标签列表：`['服务器', '网络设备', '重要设备']`
   - **结论**：设备标签已配置完成，无需额外配置

2. **设备分类配置** ✅
   - 有分类的设备：50个
   - **结论**：设备分类已配置完成

3. **告警数据同步** ✅
   - 告警数据可以正常同步（虽然当前没有活动告警）

### ❌ 发现的问题

1. **设备指标数据缺失** ❌
   - 总指标记录数：0
   - 最近5分钟：0
   - 最近1小时：0
   - **影响**：大屏无法显示设备性能数据（CPU、内存、磁盘等）

2. **流量指标数据缺失** ❌
   - 总流量指标记录数：0
   - **影响**：大屏无法显示接口流量数据

3. **接口数据缺失** ⚠️
   - 总接口数：0
   - **影响**：无法显示接口相关数据

4. **数据采集服务未运行** ❌
   - 最后设备同步时间：约14.7天前（21143分钟前）
   - **结论**：数据采集服务可能未运行或未成功采集数据

---

## 解决方案

### 问题1：设备指标数据缺失

#### 原因分析
数据采集服务 (`MetricCollector`) 可能：
1. 未启动运行
2. 启动但OPMANAGER API连接失败
3. 启动但采集过程中出错

#### 解决步骤

**步骤1：检查数据采集服务是否运行**

```bash
# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.CommandLine -like "*collector*"}

# 或查看是否有collector相关的进程
tasklist | findstr node
```

**步骤2：启动数据采集服务**

```bash
# 在单独的终端窗口中运行
npm run collector
```

**步骤3：检查OPMANAGER配置**

确认 `.env.local` 或 `.env` 文件中的配置：

```env
OPMANAGER_BASE_URL=https://your-opmanager-server.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=30000
```

**步骤4：测试数据采集**

```bash
# 运行测试脚本
npm run test:metric-collection
# 或
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/test-metric-collection.ts
```

**步骤5：查看日志**

```bash
# 查看错误日志
Get-Content logs\error.log -Tail 50

# 查看综合日志
Get-Content logs\combined.log -Tail 50
```

#### 方案A：单独运行数据采集服务（当前方式）

**优点**：
- 服务独立，不影响Web应用
- 可以单独重启

**缺点**：
- 需要手动启动和管理
- 如果忘记启动，数据不会采集

**启动方式**：
```bash
# 在单独的终端/进程中运行
npm run collector
```

#### 方案B：在Next.js启动时自动启动（推荐）

**修改 `src/app/layout.tsx`**：

```typescript
import type { Metadata } from 'next'
import './globals.css'

// 在服务端自动启动数据采集服务
if (typeof window === 'undefined') {
  // 只在服务端执行，避免在客户端执行
  import('@/services/collector/start').catch((error) => {
    console.error('Failed to start data collector:', error);
  });
}

export const metadata: Metadata = {
  title: '智能监控大屏系统',
  description: '企业级网络监控可视化平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

**优点**：
- 自动启动，无需手动管理
- 与应用一起启动和停止

**缺点**：
- 如果采集服务出错，可能影响应用启动（可以通过错误处理避免）

---

### 问题2：流量指标数据缺失

#### 原因分析
1. 接口数据未同步（总接口数：0）
2. 即使有接口，流量数据采集可能未运行

#### 解决步骤

**步骤1：同步接口数据**

接口同步需要手动触发：

```bash
# 通过API触发接口同步
curl -X POST http://localhost:3000/api/interfaces/sync
```

或通过管理界面：
- 访问 `/admin/interfaces`
- 点击"同步接口"按钮

**步骤2：确认接口同步成功**

```bash
# 运行诊断脚本
npm run diagnose:dashboard
```

**步骤3：检查流量数据采集**

流量数据在接口同步时会自动创建 `TrafficMetric` 记录。如果接口同步后仍无流量数据，可能是：
- OPMANAGER API返回的流量数据为空
- 接口同步时未包含流量信息

---

### 问题3：增强日志记录

#### 当前问题
- 部分日志被注释（如 `MetricCollector` 中的一些调试日志）
- 错误信息可能不够详细

#### 改进方案

**修改 `src/services/collector/metric.ts`**：

```typescript
export class MetricCollector {
    async collectMetrics() {
        const logger = require('@/lib/logger').logger;
        logger.info('📊 Starting Metric Collection...');
        
        try {
            const devices = await prisma.device.findMany({
                where: { isMonitored: true },
                select: { id: true, name: true }
            });
            
            logger.info(`Found ${devices.length} monitored devices`);
            
            // ... 采集逻辑 ...
            
            if (metricsToInsert.length > 0) {
                await prisma.deviceMetric.createMany({
                    data: metricsToInsert
                });
                logger.info(`✅ Collected metrics for ${successCount}/${devices.length} devices.`);
            } else {
                logger.warn(`⚠️  No metrics collected for ${devices.length} devices.`);
            }
        } catch (error) {
            logger.error('❌ Metric Collection Failed:', error);
            throw error; // 重新抛出以便上层处理
        }
    }
}
```

---

## 立即执行的操作清单

### 优先级1：启动数据采集服务

```bash
# 1. 检查环境变量配置
cat .env.local | grep OPMANAGER

# 2. 启动数据采集服务
npm run collector

# 3. 等待1-2分钟后，检查是否有数据
npm run diagnose:dashboard
```

### 优先级2：同步接口数据

```bash
# 通过API同步接口
curl -X POST http://localhost:3000/api/interfaces/sync

# 或通过浏览器访问管理界面
# http://localhost:3000/admin/interfaces
```

### 优先级3：验证数据采集

```bash
# 运行测试脚本
npm run test:metric-collection

# 检查日志
Get-Content logs\combined.log -Tail 100
```

### 优先级4：检查大屏显示

1. 访问大屏页面
2. 检查是否显示设备指标数据
3. 检查是否显示流量数据

---

## 标签配置说明

### 当前标签状态

**设备标签**（已配置）：
- `服务器` - 服务器设备
- `网络设备` - 网络设备
- `重要设备` - 重要设备

**接口标签**（未配置，因为接口数据未同步）：
- 接口同步后，需要手动配置标签

### 标签使用建议

虽然系统没有强制要求固定标签，但建议使用以下标签规范：

**设备标签建议**：
- `核心设备` / `核心服务器` - 关键业务设备
- `服务器` / `Server` - 服务器设备
- `网络设备` / `Network` - 网络设备
- `防火墙` / `Firewall` - 防火墙设备
- `存储设备` / `Storage` - 存储设备

**接口标签建议**：
- `上联` - 上联接口
- `下联` - 下联接口
- `核心` - 核心接口
- `业务` - 业务接口

**注意**：这些只是建议，系统不强制要求使用这些标签。当前已配置的标签（`服务器`、`网络设备`、`重要设备`）可以继续使用。

---

## 数据采集服务状态监控

### 创建状态检查API

创建 `src/pages/api/collector/status.ts`：

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 检查最近的数据采集时间
    const recentMetrics = await prisma.deviceMetric.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });

    const recentAlarms = await prisma.alarm.findFirst({
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true }
    });

    const timeSinceLastMetric = recentMetrics
      ? Math.round((Date.now() - recentMetrics.timestamp.getTime()) / 1000 / 60)
      : null;

    const timeSinceLastAlarm = recentAlarms
      ? Math.round((Date.now() - recentAlarms.occurredAt.getTime()) / 1000 / 60)
      : null;

    // 判断服务状态
    const isHealthy = timeSinceLastMetric !== null && timeSinceLastMetric < 5; // 5分钟内

    res.status(200).json({
      healthy: isHealthy,
      metrics: {
        lastCollection: recentMetrics?.timestamp.toISOString() || null,
        minutesAgo: timeSinceLastMetric,
        status: timeSinceLastMetric === null ? 'never' : (timeSinceLastMetric < 5 ? 'active' : 'stale')
      },
      alarms: {
        lastSync: recentAlarms?.occurredAt.toISOString() || null,
        minutesAgo: timeSinceLastAlarm
      }
    });
  } catch (error) {
    console.error('Failed to check collector status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

访问 `http://localhost:3000/api/collector/status` 可以查看数据采集服务状态。

---

## 总结

### 关键发现

1. ✅ **标签配置已完成** - 设备标签已配置，无需额外操作
2. ❌ **数据采集服务未运行** - 这是导致大屏无数据的主要原因
3. ⚠️ **接口数据未同步** - 需要手动同步接口数据
4. ❌ **设备指标数据完全缺失** - 需要启动数据采集服务

### 立即行动

1. **启动数据采集服务**：`npm run collector`
2. **同步接口数据**：通过API或管理界面
3. **验证数据采集**：运行诊断脚本
4. **检查大屏显示**：确认数据是否正常显示

### 长期改进

1. **自动启动数据采集服务**：修改 `layout.tsx` 使其自动启动
2. **增强日志记录**：改进日志记录以便问题排查
3. **添加状态监控**：创建状态检查API
4. **定期运行诊断**：设置定期诊断任务
