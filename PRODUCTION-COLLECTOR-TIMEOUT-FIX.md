# 生产环境采集器超时问题 - 完整解决方案

## 问题现象

- ✅ /admin 可以同步设备和接口
- ✅ 告警正常显示
- ❌ Dashboard 其他组件无数据
- ❌ PM2 日志显示 collector 大量超时

## 根本原因

### 1. 超时配置不合理
```bash
# 当前配置（可能）
OPMANAGER_TIMEOUT=30000  # 30秒

# 问题：如果 OpManager API 响应慢（5-10秒/设备），30秒不够
```

### 2. 采集性能瓶颈

假设有 **50 个监控设备**：

```
批次处理: 50 设备 ÷ 5 设备/批 = 10 批
批次延迟: 9 次 × 1 秒 = 9 秒
API 调用: 10 秒/设备 × 5 设备/批 = 50 秒/批
总耗时: 50 秒 × 10 批 + 9 秒 = 509 秒（8.5 分钟）

但采集周期只有 60 秒！❌
```

### 3. 采集积压问题

```
时间线:
00:00 - 第 1 轮采集开始
01:00 - 第 2 轮采集开始（第 1 轮还没完成！）
02:00 - 第 3 轮采集开始（第 1、2 轮都没完成！）
...
结果: 大量超时、数据库无法写入、Dashboard 无数据
```

---

## 🚀 快速修复方案（5 分钟）

### 步骤 1: 运行诊断脚本

在生产服务器上运行：

```bash
# 1. 进入项目目录
cd /path/to/monitoring-dashboard

# 2. 运行诊断
npm run build
node dist/scripts/diagnose-production-collector.js

# 或使用 ts-node
npx ts-node scripts/diagnose-production-collector.ts
```

诊断脚本会输出：
- 当前设备数量
- API 平均响应时间
- 预估采集总耗时
- **具体优化建议**

### 步骤 2: 调整环境变量

根据诊断结果，编辑生产服务器的 `.env` 文件：

```bash
# 示例优化配置（根据实际情况调整）

# 1. 增加 API 超时时间（建议 3-5 倍平均响应时间）
OPMANAGER_TIMEOUT=120000  # 120秒（从 30秒 增加到 120秒）

# 2. 增加采集间隔（如果设备很多）
COLLECT_METRICS_INTERVAL=120  # 120秒（从 60秒 增加到 120秒）

# 3. 其他配置保持不变
COLLECT_ALARMS_INTERVAL=30
SYNC_DEVICES_INTERVAL=600
```

### 步骤 3: 优化采集器批次大小

编辑 [src/services/collector/metric.ts](src/services/collector/metric.ts:7-8)：

```typescript
// 当前配置
const BATCH_SIZE = 5; // 批次大小
const BATCH_DELAY_MS = 1000; // 批次延迟

// 优化建议（如果设备很多且 API 很慢）
const BATCH_SIZE = 3; // 减少到 3（降低单批次耗时）
const BATCH_DELAY_MS = 2000; // 增加到 2 秒（给 OpManager 缓冲时间）
```

### 步骤 4: 重启采集器

```bash
# 使用 PM2
pm2 restart monitor-collector

# 或者手动重启
pkill -f "node.*collector"
npm run collector
```

### 步骤 5: 验证修复

等待 2-3 分钟后：

```bash
# 1. 检查 PM2 日志（应该没有超时了）
pm2 logs monitor-collector --lines 50

# 2. 检查数据库是否有新数据
npm run check:sync

# 3. 访问 Dashboard 查看是否有数据显示
```

---

## 📊 诊断命令参考

### 在生产服务器上运行

```bash
# 完整诊断流程
npm run diagnose:production

# 检查采集器性能
npx ts-node scripts/diagnose-production-collector.ts

# 检查数据流
npm run verify:data-flow

# 检查同步状态
npm run check:sync

# 查看 PM2 日志
pm2 logs monitor-collector --lines 100

# 查看 PM2 状态
pm2 status
```

---

## 🔧 高级优化方案

### 方案 1: 分级监控（推荐）

只监控**关键设备**的详细指标，其他设备只监控基本状态。

```sql
-- 1. 在数据库中标记关键设备
UPDATE "Device"
SET tags = ARRAY['critical']
WHERE name IN ('core-router-01', 'core-switch-01', ...);

-- 2. 修改采集器只采集关键设备
UPDATE "Device"
SET "isMonitored" = true
WHERE 'critical' = ANY(tags);

UPDATE "Device"
SET "isMonitored" = false
WHERE NOT ('critical' = ANY(tags));
```

修改 [src/services/collector/metric.ts](src/services/collector/metric.ts:24-27)：

```typescript
// 只采集关键设备
const devices = await prisma.device.findMany({
  where: {
    isMonitored: true,
    tags: { has: 'critical' } // 只采集带 critical 标签的设备
  },
  select: { id: true, name: true }
});
```

### 方案 2: 错峰采集

不同类型的设备在不同时间采集。

修改 [src/services/collector/start.ts](src/services/collector/start.ts:39-40)：

```typescript
// 原配置：每 60 秒采集所有设备
cron.schedule('*/1 * * * *', () => {
  metricCollector.collectMetrics();
});

// 优化：错峰采集
// 路由器和交换机: 每分钟
cron.schedule('*/1 * * * *', () => {
  metricCollector.collectMetrics({ category: 'Router,Switch' });
});

// 服务器: 每 2 分钟
cron.schedule('*/2 * * * *', () => {
  metricCollector.collectMetrics({ category: 'Server' });
});

// 其他设备: 每 5 分钟
cron.schedule('*/5 * * * *', () => {
  metricCollector.collectMetrics({ category: 'Other' });
});
```

### 方案 3: 增加采集进程

使用多个采集器进程并行采集。

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'web-server',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'collector-metrics',
      script: 'npm',
      args: 'run collector:metrics',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'collector-alarms',
      script: 'npm',
      args: 'run collector:alarms',
      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
```

### 方案 4: 跳过慢速设备

修改 [src/services/collector/metric.ts](src/services/collector/metric.ts:46-64)，添加超时控制：

```typescript
// 为每个设备设置单独的超时（比如 15 秒）
const DEVICE_TIMEOUT = 15000;

await Promise.all(batch.map(async (device) => {
  try {
    // 使用 Promise.race 实现超时控制
    const summary = await Promise.race([
      opClient.getDeviceSummary(device.name),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Device timeout')), DEVICE_TIMEOUT)
      )
    ]);

    // ... 处理数据
  } catch (error: any) {
    if (error.message === 'Device timeout') {
      console.warn(`⏱️ Device ${device.name} skipped (timeout > ${DEVICE_TIMEOUT}ms)`);
      // 不重试，直接跳过
      return;
    }
    // 处理其他错误...
  }
}));
```

---

## 📈 监控采集性能

### 添加性能日志

修改 [src/services/collector/metric.ts](src/services/collector/metric.ts:20-21)：

```typescript
export class MetricCollector {
  async collectMetrics() {
    const startTime = Date.now();
    console.log('📊 Starting Metric Collection...');

    try {
      // ... 采集逻辑

      const duration = Date.now() - startTime;
      console.log(
        `✅ Collected metrics for ${successCount}/${devices.length} devices in ${duration}ms (${Math.round(duration / 1000)}s)`
      );

      // 警告：如果采集时间超过周期的 80%
      const COLLECT_INTERVAL = 60000;
      if (duration > COLLECT_INTERVAL * 0.8) {
        console.warn(
          `⚠️ Collection time (${Math.round(duration / 1000)}s) exceeds 80% of interval (${COLLECT_INTERVAL / 1000}s)!`
        );
        console.warn('   Consider: increasing interval or reducing batch size');
      }
    } catch (error) {
      console.error('❌ Metric Collection Failed:', error);
    }
  }
}
```

### 设置告警阈值

```typescript
// 如果采集时间过长，发送告警（可选）
if (duration > COLLECT_INTERVAL * 0.8) {
  // 发送告警到监控系统
  await sendAlert({
    type: 'collector-slow',
    message: `Metric collection took ${Math.round(duration / 1000)}s`,
    severity: 'warning'
  });
}
```

---

## 🎯 推荐配置（根据设备数量）

### 小型部署（< 20 设备）
```bash
OPMANAGER_TIMEOUT=60000
COLLECT_METRICS_INTERVAL=60
BATCH_SIZE=5
BATCH_DELAY_MS=1000
```

### 中型部署（20-50 设备）
```bash
OPMANAGER_TIMEOUT=90000
COLLECT_METRICS_INTERVAL=90
BATCH_SIZE=3
BATCH_DELAY_MS=1500
```

### 大型部署（50-100 设备）
```bash
OPMANAGER_TIMEOUT=120000
COLLECT_METRICS_INTERVAL=120
BATCH_SIZE=3
BATCH_DELAY_MS=2000

# 推荐启用分级监控
```

### 超大型部署（> 100 设备）
```bash
OPMANAGER_TIMEOUT=180000
COLLECT_METRICS_INTERVAL=180
BATCH_SIZE=3
BATCH_DELAY_MS=2000

# 必须启用分级监控
# 建议使用多个采集器进程
# 考虑使用队列系统（如 Bull）
```

---

## ✅ 验证清单

修复后，确认以下所有项：

- [ ] 运行诊断脚本无警告
- [ ] PM2 日志无超时错误
- [ ] 数据库有新的 DeviceMetric 记录
- [ ] Dashboard 组件显示数据
- [ ] CPU/内存使用率正常
- [ ] OpManager 服务器负载正常

---

## 🆘 如果仍然超时

### 排查步骤

1. **检查 OpManager 服务器**
   ```bash
   # 测试单个设备的响应时间
   curl -H "apiKey: YOUR_API_KEY" \
     "https://opmanager:8061/api/json/device/getDeviceSummary?name=DEVICE_NAME"
   ```

   如果单个请求就很慢（> 10 秒），问题在 OpManager 侧：
   - OpManager 服务器负载过高
   - OpManager 数据库性能问题
   - 网络延迟

2. **检查网络连接**
   ```bash
   # 测试网络延迟
   ping -c 10 opmanager-server-ip

   # 测试 SSL 连接时间
   curl -w "@curl-format.txt" -o /dev/null -s \
     "https://opmanager:8061/api/json/device/listDevices"
   ```

3. **检查采集器并发**
   ```bash
   # 查看是否有多个采集器进程在运行
   ps aux | grep collector

   # 如果有多个，杀掉所有
   pkill -f "node.*collector"

   # 重新启动
   npm run collector
   ```

4. **降级方案：临时禁用 Metric 采集**
   ```bash
   # 编辑 .env
   COLLECT_METRICS_INTERVAL=0  # 禁用指标采集

   # 重启
   pm2 restart monitor-collector

   # Dashboard 仍可显示告警和拓扑数据
   ```

---

## 📞 需要帮助？

如果以上方案都无法解决，请收集以下信息：

```bash
# 1. 诊断报告
npm run diagnose:production > diagnosis.log 2>&1

# 2. PM2 日志
pm2 logs monitor-collector --lines 200 > collector.log

# 3. 环境信息
cat .env > env.log

# 4. 系统信息
uname -a > system.log
node -v >> system.log
npm -v >> system.log

# 打包所有日志
tar -czf debug-logs.tar.gz *.log
```

然后提供：
- 设备数量
- OpManager 版本
- 网络拓扑（应用服务器到 OpManager 的连接）
- 以上日志文件

---

**版本**: 1.0.0
**最后更新**: 2026-01-25
**适用版本**: monitoring-dashboard v2.0.0+
