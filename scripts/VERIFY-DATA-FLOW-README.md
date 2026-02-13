# 生产环境数据流验证脚本使用指南

## 概述

`verify-production-data-flow.ts` 是一个全面的数据流验证脚本，用于确保从 OpManager API 采集到前端 Dashboard 显示的完整数据链路正常工作。

## 验证流程

该脚本会依次执行以下测试：

```
1. 环境配置检查
   ├─ DATABASE_URL
   ├─ REDIS_URL
   ├─ OPMANAGER_BASE_URL
   └─ OPMANAGER_API_KEY

2. OpManager API 连接测试
   └─ 测试能否成功连接并获取数据

3. 数据采集测试
   ├─ 设备采集 (Device Collection)
   ├─ 接口采集 (Interface Collection)
   ├─ 指标采集 (Metric Collection)
   └─ 告警采集 (Alarm Collection)

4. 数据库数据验证
   ├─ 设备数据统计
   ├─ 接口数据统计
   ├─ 指标数据统计
   ├─ 告警数据统计
   └─ 数据更新时间检查

5. Dashboard API 端点测试
   ├─ GET /api/devices
   ├─ GET /api/dashboard/overview
   ├─ GET /api/alarms
   ├─ GET /api/traffic/top
   └─ GET /api/analytics/top-devices

6. 数据一致性检查
   ├─ 设备-接口关联关系
   ├─ 最近指标数据（5分钟内）
   └─ 设备状态分布
```

## 使用方法

### 前提条件

1. **环境变量配置**：确保 `.env` 文件已正确配置
2. **数据库连接**：PostgreSQL 和 Redis 服务正常运行
3. **OpManager 可访问**：网络能访问 OpManager API

### 运行命令

```bash
# 方式 1：使用 npm script（推荐）
npm run verify:data-flow

# 方式 2：直接使用 ts-node
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-production-data-flow.ts
```

### 在生产环境运行

```bash
# 1. SSH 连接到生产服务器
ssh user@production-server

# 2. 进入项目目录
cd /path/to/monitoring-dashboard

# 3. 确保环境变量已配置
cat .env  # 检查配置

# 4. 运行验证脚本
npm run verify:data-flow

# 5. 查看完整输出
# 脚本会显示彩色输出，包括：
# ✅ 绿色 - 测试通过
# ❌ 红色 - 测试失败
# ⚠️  黄色 - 警告信息
# ℹ️  蓝色 - 提示信息
```

## 输出示例

### 成功示例

```
============================================================
  1. 环境配置检查
============================================================
ℹ️  DATABASE_URL: postgresql://postgres:***@localhost:5432/monitoring_dashboard
ℹ️  REDIS_URL: redis://localhost:6379
ℹ️  OPMANAGER_BASE_URL: https://10.141.69.192:8061
ℹ️  OPMANAGER_API_KEY: ***b5b5
✅ Environment Check: All required variables present

============================================================
  2. OpManager API 连接测试
============================================================
ℹ️  Connecting to: https://10.141.69.192:8061
✅ OpManager Connection: Connected successfully (1245ms)

============================================================
  3. 数据采集测试
============================================================
ℹ️  Testing device collection...
✅ Device Collection: Devices synced successfully (3456ms)
ℹ️  Testing interface collection...
✅ Interface Collection: Interfaces synced successfully (2890ms)
ℹ️  Testing metric collection...
✅ Metric Collection: Metrics collected successfully (4123ms)
ℹ️  Testing alarm collection...
✅ Alarm Collection: Alarms synced successfully (1567ms)

============================================================
  4. 数据库数据验证
============================================================
✅ Devices in DB: 45 (42 monitored)
✅ Interfaces in DB: 234 (189 monitored)
✅ Metrics in DB: 5678
ℹ️  Latest metric: Router-Core-01 at 2026-01-24T08:30:45.000Z
✅ Alarms in DB: 23 (5 active)
ℹ️  Most recent device update: Switch-Edge-03 (2 minutes ago)

============================================================
  5. Dashboard API 端点测试
============================================================
✅ Devices List: OK (234ms) - 45 items
✅ Dashboard Overview: OK (456ms) - 8 fields
✅ Alarms List: OK (189ms) - 23 items
✅ Top Traffic: OK (312ms) - 10 items
✅ Analytics Top Devices: OK (278ms) - 10 items

============================================================
  6. 数据一致性检查
============================================================
✅ Found 5 devices with interfaces
ℹ️    Router-Core-01: 24 interfaces
ℹ️    Switch-Edge-03: 48 interfaces
✅ Found 145 metrics from the last 5 minutes
ℹ️  Device status distribution:
ℹ️    up: 40 devices
ℹ️    down: 3 devices
ℹ️    warning: 2 devices

============================================================
  📊 测试报告
============================================================

测试结果汇总:
  总测试数: 15
✅   通过: 15
  通过率: 100.0%

性能统计:
  总耗时: 14567ms
  平均耗时: 971ms

============================================================
🎉 所有测试通过！数据流运行正常。
============================================================
```

### 失败示例

```
============================================================
  2. OpManager API 连接测试
============================================================
❌ OpManager Connection: Failed to connect
  Error details: connect ETIMEDOUT 10.141.69.192:8061

============================================================
  📊 测试报告
============================================================

测试结果汇总:
  总测试数: 15
✅   通过: 8
❌   失败: 7
  通过率: 53.3%

❌ 失败的测试:
  • OpManager Connection: Failed to connect
    connect ETIMEDOUT 10.141.69.192:8061
  • Device Collection: Failed to sync devices
    OpManager client not available
  • Interface Collection: Failed to sync interfaces
    OpManager client not available

💡 建议:
⚠️    • 检查 OpManager 服务是否可访问
⚠️    • 验证 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY 是否正确

============================================================
❌ 多个测试失败，数据流可能存在严重问题。
============================================================
```

## 常见问题排查

### 1. OpManager 连接失败

**错误**: `OpManager Connection: Failed to connect`

**可能原因**:
- OpManager 服务未运行
- 网络不通（防火墙/路由问题）
- API Key 错误
- SSL 证书问题

**解决方法**:
```bash
# 检查网络连通性
curl -k https://10.141.69.192:8061/api/json/device/listDevices_v2?apiKey=YOUR_API_KEY

# 如果是 SSL 证书问题，临时添加到 .env
NODE_TLS_REJECT_UNAUTHORIZED=0

# 验证 API Key
npm run verify:opmanager-apis
```

### 2. 数据库无数据

**错误**: `No devices in database`

**可能原因**:
- 采集器从未运行过
- 采集器运行失败
- 数据库连接问题

**解决方法**:
```bash
# 手动运行一次采集器
npm run collector

# 或者手动触发同步
npm run check:sync

# 检查数据库连接
npm run db:studio
```

### 3. 数据过期

**警告**: `Data might be stale (updated 45 minutes ago)`

**可能原因**:
- 采集器未运行
- 采集器运行但失败
- OpManager 连接中断

**解决方法**:
```bash
# 检查采集器是否在运行
ps aux | grep collector
# 或
pm2 list

# 如果未运行，启动采集器
npm run collector
# 或
pm2 start ecosystem.config.js

# 查看采集器日志
pm2 logs collector
```

### 4. Dashboard API 失败

**错误**: `Devices List: Request failed`

**可能原因**:
- Next.js 服务未运行
- 端口被占用
- NEXT_PUBLIC_APP_URL 配置错误

**解决方法**:
```bash
# 检查 Next.js 是否运行
ps aux | grep next
# 或
pm2 list

# 检查端口占用
netstat -tulpn | grep 3000

# 启动服务
npm run start
# 或
pm2 start ecosystem.config.js

# 检查 .env 配置
echo $NEXT_PUBLIC_APP_URL
```

### 5. 无最近指标

**警告**: `No metrics from the last 5 minutes`

**可能原因**:
- 采集器刚启动（正常）
- 采集器配置的间隔太长
- Metric Collector 失败

**解决方法**:
```bash
# 等待 1-2 分钟后重新运行
sleep 120 && npm run verify:data-flow

# 检查采集器配置
cat .env | grep COLLECT_METRICS_INTERVAL

# 手动触发指标采集（需要修改代码暴露接口）
# 或重启采集器
pm2 restart collector
```

## 退出代码

脚本会根据测试结果返回不同的退出代码：

- **0**: 所有测试通过
- **1**: 至少一个测试失败或发生错误

这对于 CI/CD 流程很有用：

```bash
# 在部署脚本中使用
npm run verify:data-flow
if [ $? -eq 0 ]; then
  echo "Data flow verified, deployment can proceed"
else
  echo "Data flow verification failed, aborting deployment"
  exit 1
fi
```

## 定期监控

建议将此脚本集成到监控系统中：

### 使用 Cron 定期运行

```bash
# 编辑 crontab
crontab -e

# 每小时运行一次验证
0 * * * * cd /path/to/monitoring-dashboard && npm run verify:data-flow >> /var/log/data-flow-check.log 2>&1

# 每天早上 8 点运行
0 8 * * * cd /path/to/monitoring-dashboard && npm run verify:data-flow >> /var/log/data-flow-check.log 2>&1
```

### 集成到 PM2 健康检查

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'monitoring-dashboard',
      script: 'npm',
      args: 'run start',
      // ... 其他配置
    },
    {
      name: 'health-check',
      script: 'npm',
      args: 'run verify:data-flow',
      cron_restart: '0 * * * *', // 每小时运行
      autorestart: false,
      watch: false,
    },
  ],
};
```

## 相关命令

```bash
# 其他诊断命令
npm run diagnose:production      # 完整生产环境诊断
npm run diagnose:opmanager       # OpManager API 诊断
npm run check:all                # 检查所有数据
npm run verify:production        # 验证生产同步
npm run verify:opmanager-apis    # 验证所有 OpManager API

# 数据库检查
npm run db:studio                # 打开 Prisma Studio GUI

# 采集器管理
npm run collector                # 启动采集器
pm2 logs collector               # 查看采集器日志
pm2 restart collector            # 重启采集器
```

## 技术细节

### 测试覆盖范围

1. **环境层**: 验证所有必需的环境变量
2. **网络层**: 测试 OpManager API 连接和响应时间
3. **数据采集层**: 验证所有采集器能正常工作
4. **持久化层**: 检查数据是否正确写入数据库
5. **API 层**: 测试前端 API 端点是否可访问
6. **业务逻辑层**: 验证数据关联关系和一致性

### 性能指标

脚本会记录每个操作的耗时：
- OpManager API 响应时间
- 各采集器执行时间
- Dashboard API 响应时间
- 总体执行时间和平均耗时

### 依赖项

脚本依赖以下模块：
- `dotenv`: 加载环境变量
- `axios`: HTTP 请求
- `@/services/collector/*`: 数据采集服务
- `@/lib/prisma`: 数据库访问

## 总结

这个验证脚本是确保监控系统正常运行的关键工具。建议：

1. **部署后**: 立即运行验证整个数据流
2. **定期检查**: 每天或每小时运行一次
3. **故障排查**: 发现问题时第一时间运行
4. **性能监控**: 关注各环节的响应时间

如有问题，请查看详细的测试输出和错误信息，按照建议进行排查。
