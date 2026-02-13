# 生产环境数据同步验证指南

## 生产环境信息

### OpManager API 配置

- **Base URL**: `https://10.141.69.192:8061`
- **API Key**: `42aa561c1e280e8a46a51a4f5e06f5b5`

### 主要 API 端点

- Business View 详情: `/api/json/businessview/getBusinessDetailsView?bvName=出口业务`
- 设备列表: `/api/json/v2/device/listDevices`

---

## 验证步骤

### 1. 环境配置检查

确保生产环境的 `.env` 文件配置正确:

```bash
# 查看当前环境配置
cat .env
```

**必需的环境变量**:

```env
# 数据库配置
DATABASE_URL="postgresql://用户名:密码@localhost:5432/monitoring-dashboard?schema=public"

# OpManager 配置
OPMANAGER_BASE_URL=https://10.141.69.192:8061
OPMANAGER_API_KEY=42aa561c1e280e8a46a51a4f5e06f5b5
OPMANAGER_TIMEOUT=30000

# 数据采集配置
COLLECT_METRICS_INTERVAL=60
COLLECT_ALARMS_INTERVAL=30
SYNC_DEVICES_INTERVAL=600
```

> [!IMPORTANT]
> 生产环境的 `OPMANAGER_TIMEOUT` 建议设置为 30000 (30秒) 以应对网络延迟

---

### 2. PM2 进程状态检查

检查 `monitor-web` 和 `monitor-collector` 两个进程是否正常运行:

```bash
# 查看所有 PM2 进程状态
pm2 status

# 查看详细信息
pm2 info monitoring-web
pm2 info monitoring-collector
```

**正常状态指标**:

- Status: `online` (运行中)
- Restarts: 应该较少,频繁重启说明有问题
- Uptime: 运行时长
- Memory: 内存使用情况

---

### 3. 查看 Collector 日志

检查数据采集器的运行日志,确认是否成功连接 OpManager:

```bash
# 实时查看 collector 日志
pm2 logs monitoring-collector --lines 100

# 查看错误日志
pm2 logs monitoring-collector --err

# 查看日志文件
tail -f logs/pm2-collector-out.log
tail -f logs/pm2-collector-error.log
```

**正常日志示例**:

```
🚀 Starting Data Collector Scheduler...
🔄 Syncing Business View: 出口业务...
✅ Business View 出口业务 synced.
📊 Collecting metrics for 50 devices...
✅ Metrics collected successfully
```

**异常日志示例**:

```
❌ Failed to sync Business View 出口业务: Error: connect ETIMEDOUT
❌ OpManager API request failed: 401 Unauthorized
❌ Database connection error
```

---

### 4. 运行验证脚本

使用自动化验证脚本检查数据同步状态:

```bash
# 运行验证脚本
npm run verify:production

# 或直接使用 ts-node
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-production-sync.ts
```

**验证内容**:

- ✅ 环境变量配置
- ✅ OpManager API 连接
- ✅ 数据库连接
- ✅ 设备数据同步状态
- ✅ 接口数据同步状态
- ✅ 告警数据同步状态
- ✅ 性能指标采集状态
- ✅ 拓扑数据同步状态
- ✅ 数据时效性检查

---

### 5. 数据库数据检查

直接查询数据库验证数据是否同步:

```bash
# 进入 PostgreSQL
psql -U postgres -d monitoring-dashboard

# 或使用 Prisma Studio
npm run db:studio
```

**关键查询**:

```sql
-- 检查设备数量
SELECT COUNT(*) as total_devices, 
       COUNT(*) FILTER (WHERE "isMonitored" = true) as monitored_devices
FROM "Device";

-- 检查接口数量
SELECT COUNT(*) as total_interfaces,
       COUNT(*) FILTER (WHERE "isMonitored" = true) as monitored_interfaces
FROM "Interface";

-- 检查最新的性能指标 (最近10分钟)
SELECT COUNT(*) as recent_metrics
FROM "DeviceMetric"
WHERE timestamp > NOW() - INTERVAL '10 minutes';

-- 检查最新的告警 (最近1小时)
SELECT COUNT(*) as recent_alarms
FROM "Alarm"
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- 检查拓扑数据
SELECT COUNT(*) as nodes FROM "TopologyNode";
SELECT COUNT(*) as edges FROM "TopologyEdge";

-- 检查 Business View 配置
SELECT name, "isActive", "lastSyncAt" 
FROM "BusinessViewConfig";
```

---

### 6. 手动触发同步 (如果需要)

如果发现数据未同步,可以手动触发同步:

```bash
# 重启 collector 进程
pm2 restart monitoring-collector

# 查看重启后的日志
pm2 logs monitoring-collector --lines 50
```

或通过管理面板手动同步:

1. 访问 `http://your-server:3000/admin/devices`
2. 点击 "同步设备" 按钮
3. 访问 `http://your-server:3000/admin/interfaces`
4. 点击 "同步接口" 按钮

---

## 常见问题排查

### 问题 1: OpManager API 连接失败

**症状**:

```
❌ OpManager API 连接失败: Error: connect ETIMEDOUT
```

**排查步骤**:

1. 检查网络连接: `ping 10.141.69.192`
2. 检查端口是否开放: `telnet 10.141.69.192 8061`
3. 检查 API Key 是否正确
4. 检查 SSL 证书问题 (如果是自签名证书)

**解决方案**:

```bash
# 如果是 SSL 证书问题,可以在环境变量中添加:
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

### 问题 2: 数据库中没有数据

**症状**:

```
⚠️ 数据库中没有设备数据,可能尚未同步
```

**排查步骤**:

1. 检查 collector 进程是否运行: `pm2 status monitoring-collector`
2. 查看 collector 日志是否有错误
3. 检查数据库连接是否正常
4. 检查 Business View 配置是否激活

**解决方案**:

```bash
# 手动触发设备同步
curl -X POST http://localhost:3000/api/devices/sync

# 手动触发接口同步
curl -X POST http://localhost:3000/api/interfaces/sync
```

---

### 问题 3: 数据不是最新的

**症状**:

```
⚠️ 最新性能指标采集于 15 分钟前
```

**排查步骤**:

1. 检查 collector 是否正常运行
2. 查看 collector 日志中是否有采集错误
3. 检查 cron 调度是否正常

**解决方案**:

```bash
# 重启 collector
pm2 restart monitoring-collector

# 检查重启后是否恢复正常
pm2 logs monitoring-collector --lines 20
```

---

### 问题 4: Business View 没有配置

**症状**:

```
⚠️ 没有激活的 Business View 配置
```

**解决方案**:

手动添加 Business View 配置:

```sql
-- 进入数据库
psql -U postgres -d monitoring-dashboard

-- 插入 Business View 配置
INSERT INTO "BusinessViewConfig" (name, "displayName", "isActive", "createdAt", "updatedAt")
VALUES ('出口业务', '出口业务', true, NOW(), NOW());
```

或使用 Prisma Studio:

```bash
npm run db:studio
# 在 BusinessViewConfig 表中添加记录
```

---

## 验证成功标准

当验证脚本显示以下结果时,说明系统运行正常:

```
✅ 成功: 15
⚠️  警告: 0
❌ 错误: 0

✅ 验证完全通过! 系统运行正常
```

**关键指标**:

- ✅ OpManager API 连接成功
- ✅ 数据库中有设备数据 (> 0)
- ✅ 数据库中有接口数据 (> 0)
- ✅ 最近10分钟内有新的性能指标
- ✅ 有激活的 Business View 配置
- ✅ 拓扑数据已同步

---

## 监控建议

### 日常监控

1. **定期检查 PM2 状态**:

   ```bash
   pm2 status
   ```

2. **监控日志文件大小**:

   ```bash
   du -h logs/
   ```

3. **定期运行验证脚本** (建议每天一次):

   ```bash
   npm run verify:production
   ```

### 告警设置

建议设置以下告警:

- PM2 进程异常退出
- 数据采集超过 10 分钟无新数据
- OpManager API 连接失败超过 3 次
- 数据库连接失败

---

## 快速诊断命令

```bash
# 一键检查所有状态
pm2 status && \
npm run verify:production && \
pm2 logs monitoring-collector --lines 20
```

---

## 联系支持

如果遇到无法解决的问题,请收集以下信息:

1. PM2 进程状态: `pm2 status`
2. Collector 日志: `pm2 logs monitoring-collector --lines 100`
3. 验证脚本输出: `npm run verify:production`
4. 环境配置 (隐藏敏感信息): `.env` 文件内容
5. 数据库查询结果

将以上信息提供给技术支持团队。
