# Dashboard 数据展示问题修复验证指南

> **版本**: 1.0  
> **更新时间**: 2026-01-23  
> **适用环境**: 生产环境、测试环境

---

## 📋 问题概述

**现象**: `/dashboard` 页面无法展示数据，尽管已成功与 OpManager API 同步。

**根本原因**: 缺失 `/api/stats/business-view` API 端点。

**解决方案**: 已创建 `src/pages/api/stats/business-view.ts` 文件。

---

## 🔧 修复文件清单

### 新增文件

1. ✅ `src/pages/api/stats/business-view.ts` - 业务视图统计 API
2. ✅ `scripts/diagnose-dashboard-api.ts` - API 端点诊断脚本
3. ✅ `scripts/diagnose-database-data.ts` - 数据库数据诊断脚本
4. ✅ `DASHBOARD-FIX-VERIFICATION.md` - 本验证文档

### 无需修改的文件

- `src/app/dashboard/page.tsx` - 前端页面（已正确调用 API）
- 其他组件文件 - 逻辑正确，无需改动

---

## 🚀 部署步骤

### 步骤 1: 上传修复文件到生产环境

```bash
# 方式 1: 使用 Git（推荐）
git add src/pages/api/stats/business-view.ts
git add scripts/diagnose-dashboard-api.ts
git add scripts/diagnose-database-data.ts
git add DASHBOARD-FIX-VERIFICATION.md
git commit -m "fix: 添加缺失的 /api/stats/business-view API 端点"
git push

# 在生产服务器上
cd /path/to/monitoring-dashboard
git pull

# 方式 2: 手动上传（如果不使用 Git）
# 使用 scp、ftp 等工具上传以下文件:
# - src/pages/api/stats/business-view.ts
# - scripts/diagnose-dashboard-api.ts
# - scripts/diagnose-database-data.ts
```

### 步骤 2: 构建和重启服务

```bash
# 进入项目目录
cd /path/to/monitoring-dashboard

# 安装依赖（如果是首次部署）
npm install

# 构建生产版本
npm run build

# 重启服务
# 方式 A: 使用 PM2（推荐）
pm2 restart monitoring-dashboard

# 方式 B: 使用 systemd
sudo systemctl restart monitoring-dashboard

# 方式 C: 手动重启
# 先停止现有进程，然后
npm run start
# 或
node .next/standalone/server.js  # 如果使用 standalone 模式
```

### 步骤 3: 验证服务启动

```bash
# 检查服务状态
pm2 status
# 或
sudo systemctl status monitoring-dashboard

# 查看服务日志
pm2 logs monitoring-dashboard --lines 50
# 或
journalctl -u monitoring-dashboard -n 50 -f

# 确认端口监听
netstat -tlnp | grep 3000
# 或
ss -tlnp | grep 3000
```

**预期输出**: 应看到 Node.js 进程监听在 3000 端口（或你配置的端口）

---

## ✅ 验证步骤

### 验证 1: 运行数据库诊断脚本

```bash
# 在项目根目录执行
npx tsx scripts/diagnose-database-data.ts

# 或者如果已添加到 package.json
npm run diagnose:database
```

**预期输出示例**:

```
================================================================================
数据库数据诊断脚本
================================================================================
时间: 2026-01-23 15:30:00
================================================================================

📊 检查设备数据...
   设备状态分布:
   - ONLINE: 45
   - OFFLINE: 3
   - WARNING: 2
   
   设备类型分布:
   - SWITCH: 20
   - SERVER: 15
   - ROUTER: 10
   - OTHER: 5

📈 检查性能指标数据...
   25 个设备有性能指标数据

🚨 检查告警数据...
   活动告警严重性分布:
   - CRITICAL: 2
   - MAJOR: 5
   - MINOR: 8

🔌 检查网络接口数据...
   接口标签分布:
   - 上联: 12 个接口
   - 互联网出口: 4 个接口

🏢 检查业务视图配置...
   激活的业务视图:
   - 核心网络 (core-network)
   - 服务器集群 (server-cluster)

================================================================================
诊断结果汇总
================================================================================
✅ PASS [设备] 找到 50 个被监控的设备 (总计 50 个)
✅ PASS [设备状态] 设备状态统计完成
✅ PASS [设备类型] 设备类型统计完成
✅ PASS [设备标签] 30 个设备配置了标签
✅ PASS [业务视图] 40 个设备关联了业务视图
✅ PASS [性能指标] 找到 1250 个最近 1 小时的指标 (总计 45000 个)
✅ PASS [告警] 找到 15 个活动告警 (总计 150 个)
✅ PASS [网络接口] 找到 80 个被监控的接口 (总计 120 个)
✅ PASS [业务视图配置] 找到 2 个激活的业务视图 (总计 2 个)

================================================================================
统计
================================================================================
✅ 通过: 9
⚠️  警告: 0
❌ 失败: 0
总计: 9 个检查项

================================================================================
建议和解决方案
================================================================================
✅ 数据库数据完整，可以支持 dashboard 正常展示！
```

**如果出现警告或失败**:
- 参考脚本输出的"解决方案"部分
- 常见问题见下文"故障排查"章节

---

### 验证 2: 运行 API 诊断脚本

```bash
# 在项目根目录执行
npx tsx scripts/diagnose-dashboard-api.ts

# 或者如果已添加到 package.json
npm run diagnose:dashboard
```

**预期输出示例**:

```
================================================================================
Dashboard API 诊断脚本
================================================================================
API Base URL: http://localhost:3000
时间: 2026-01-23 15:35:00
================================================================================

Testing GET /api/stats/business-view?bvName=...
Testing GET /api/dashboard/overview...
Testing GET /api/dashboard/grouped-devices...
Testing GET /api/devices?limit=10...
Testing GET /api/alarms/stats...
Testing GET /api/interfaces?limit=5...

================================================================================
诊断结果
================================================================================

1. ✅ PASS GET /api/stats/business-view?bvName=
   状态码: 200
   消息: OK - Found 50 devices (network: 30, server: 15)

2. ✅ PASS GET /api/dashboard/overview
   状态码: 200
   消息: OK - 50 devices, 45 online

3. ✅ PASS GET /api/dashboard/grouped-devices
   状态码: 200
   消息: OK - Found 2 business view groups

4. ✅ PASS GET /api/devices?limit=10
   状态码: 200
   消息: OK - Found 50 devices

5. ✅ PASS GET /api/alarms/stats
   状态码: 200
   消息: OK - Active alarms: 15

6. ✅ PASS GET /api/interfaces?limit=5
   状态码: 200
   消息: OK - Found 80 interfaces

================================================================================
汇总统计
================================================================================
✅ 通过: 6
⚠️  警告: 0
❌ 失败: 0
总计: 6 个测试

================================================================================
诊断建议
================================================================================
✅ 所有 API 端点正常工作！
```

**如果出现失败**:
- 检查对应 API 的错误信息
- 参考脚本输出的"解决方案"
- 查看服务器日志: `pm2 logs monitoring-dashboard`

---

### 验证 3: 手动测试关键 API

```bash
# 测试 1: 统计 API（新增的）
curl -s http://localhost:3000/api/stats/business-view?bvName= | jq

# 预期响应:
# {
#   "devices": {
#     "totalAll": 50,
#     "online": 45,
#     "offline": 3,
#     "warning": 2,
#     "error": 0,
#     "availability": 90.0,
#     "healthScore": 94,
#     "byType": {
#       "network": 30,
#       "server": 15,
#       "other": 5
#     },
#     ...
#   },
#   "businessView": "global",
#   "timestamp": "2026-01-23T07:35:00.000Z"
# }

# 测试 2: 设备列表 API
curl -s "http://localhost:3000/api/devices?limit=5" | jq '.data | length'
# 预期: 5

# 测试 3: 业务视图分组 API
curl -s http://localhost:3000/api/dashboard/grouped-devices | jq '.groups | length'
# 预期: >= 1 (取决于配置的业务视图数量)
```

**如果 curl 命令返回错误**:
- 确认端口号正确（默认 3000）
- 检查防火墙规则
- 确认服务正在运行

---

### 验证 4: 浏览器测试

#### 4.1 打开 Dashboard 页面

```
访问: http://your-server-ip:3000/dashboard
```

#### 4.2 打开浏览器开发者工具

**Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I`  
**Firefox**: 按 `F12` 或 `Ctrl+Shift+K`

#### 4.3 检查 Network（网络）面板

1. 刷新页面（`Ctrl+R` 或 `F5`）
2. 在 Network 面板中搜索 `business-view`
3. 找到请求: `stats/business-view?bvName=`

**预期结果**:
- Status: `200 OK`
- Response 有 JSON 数据，包含 `devices` 字段
- Response 时间 < 2 秒

**如果看到 404**:
- API 文件未正确部署
- 检查 `src/pages/api/stats/business-view.ts` 是否存在
- 重新构建: `npm run build`

**如果看到 500**:
- 查看 Console 面板的错误信息
- 查看服务器日志: `pm2 logs monitoring-dashboard`
- 检查数据库连接

#### 4.4 检查 Console（控制台）面板

**预期结果**:
- 没有红色错误信息
- 可能有一些调试日志（蓝色/灰色）

**常见错误**:
```javascript
// ❌ 错误示例 1: API 404
Failed to load resource: the server responded with a status of 404 (Not Found)
// 解决: 确认 API 文件存在，重新构建

// ❌ 错误示例 2: JSON 解析错误
Unexpected token < in JSON at position 0
// 解决: API 返回了 HTML 而不是 JSON，检查服务器配置

// ❌ 错误示例 3: 网络错误
net::ERR_CONNECTION_REFUSED
// 解决: 服务未启动或端口错误
```

#### 4.5 验证数据展示

**Tab 0 - 全屏总览**:
- ✅ 左上角：设备总览圆环图显示数据（网络设备、服务器、其他）
- ✅ 左下角：核心资产状态列表显示设备
- ✅ 中间：拓扑图显示
- ✅ 右侧：实时告警滚动列表

**Tab 1 - 硬件服务器**:
- ✅ 左侧：业务视图分组的服务器列表
- ✅ 右侧：服务器性能趋势图

**Tab 2 - 网络设备**:
- ✅ 左侧：业务视图分组的网络设备列表
- ✅ 中间：核心网络设备性能趋势
- ✅ 右侧：上联/互联网出口流量监控

---

## 🔍 故障排查

### 问题 1: 数据库中没有设备

**症状**: 诊断脚本显示 "数据库中没有任何设备记录"

**解决方案**:

```bash
# 方式 1: 手动触发设备同步
curl -X POST http://localhost:3000/api/devices/sync

# 方式 2: 运行同步脚本（如果有）
npm run scripts:sync-devices

# 方式 3: 检查数据采集器是否运行
pm2 list
# 如果采集器未运行
pm2 restart collector
```

**验证**:
```sql
-- 在 PostgreSQL 中执行
SELECT COUNT(*) FROM devices;
-- 应返回 > 0
```

---

### 问题 2: 设备有数据但未被监控

**症状**: 有设备但 `isMonitored = false`

**解决方案**:

```sql
-- 批量设置所有设备为监控状态
UPDATE devices SET "isMonitored" = true;

-- 或只设置特定类型
UPDATE devices 
SET "isMonitored" = true 
WHERE type IN ('SWITCH', 'ROUTER', 'SERVER');
```

---

### 问题 3: 没有业务视图配置

**症状**: 诊断脚本显示 "没有配置业务视图"

**解决方案**:

```bash
# 运行初始化脚本
npm run scripts:init-business-views

# 或手动在数据库中插入
```

```sql
INSERT INTO "BusinessViewConfig" (name, "displayName", "isActive", "createdAt", "updatedAt")
VALUES 
  ('core-network', '核心网络', true, NOW(), NOW()),
  ('server-cluster', '服务器集群', true, NOW(), NOW());
```

---

### 问题 4: API 返回 500 错误

**症状**: `/api/stats/business-view` 返回 500

**排查步骤**:

```bash
# 1. 查看详细错误日志
pm2 logs monitoring-dashboard --lines 100 | grep "ERROR"

# 2. 检查数据库连接
# 在项目中创建测试脚本 test-db.ts
npx tsx test-db.ts
```

**常见原因**:
- 数据库连接失败 → 检查 `.env` 中的 `DATABASE_URL`
- Prisma schema 未同步 → 运行 `npx prisma generate`
- 权限问题 → 检查数据库用户权限

---

### 问题 5: 前端显示加载中但无数据

**症状**: 圆环图一直显示 "图表加载中..."

**排查步骤**:

1. 打开浏览器开发者工具 Console
2. 查找错误信息
3. 检查 Network 面板，确认 API 响应正常
4. 检查 React DevTools（如果安装）

**可能原因**:
```typescript
// 原因 1: stats 状态为 null
// 检查 DashboardPage 组件的 stats state

// 原因 2: API 响应格式不符合预期
// 确认响应包含 devices.totalAll 字段

// 原因 3: isVisible 属性问题
// 确认 activeTab === 0 时 isVisible 为 true
```

---

### 问题 6: 性能指标数据为空

**症状**: 设备显示但 CPU/内存为 0%

**解决方案**:

```bash
# 检查性能指标采集器是否运行
pm2 list | grep collector

# 手动触发一次采集
curl -X POST http://localhost:3000/api/metrics/collect
```

```sql
-- 检查最近的性能指标
SELECT 
  d.name,
  m."cpuUsage",
  m."memoryUsage",
  m.timestamp
FROM metrics m
JOIN devices d ON d.id = m."deviceId"
ORDER BY m.timestamp DESC
LIMIT 10;
```

---

## 📊 性能检查

### 检查 API 响应时间

```bash
# 测试 stats API 性能
time curl -s http://localhost:3000/api/stats/business-view?bvName= > /dev/null

# 预期: < 2 秒
```

**如果响应慢 (> 3 秒)**:
- 检查数据库查询性能
- 考虑添加 Redis 缓存
- 优化数据库索引

### 检查数据库查询性能

```sql
-- 启用查询计划
EXPLAIN ANALYZE 
SELECT COUNT(*) FROM devices WHERE "isMonitored" = true;

-- 检查缺失的索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'devices';
```

---

## 📝 验证检查清单

完成以下检查后，打勾确认：

### 部署前检查
- [ ] 已备份生产数据库
- [ ] 已在测试环境验证修复
- [ ] 已准备回滚方案

### 部署检查
- [ ] 文件已上传到生产服务器
- [ ] 已运行 `npm run build`
- [ ] 服务已重启并正常运行
- [ ] 端口正常监听（3000 或配置的端口）

### 功能验证
- [ ] ✅ 数据库诊断脚本全部通过
- [ ] ✅ API 诊断脚本全部通过
- [ ] ✅ `/api/stats/business-view` 返回 200 和数据
- [ ] ✅ `/api/devices` 返回设备列表
- [ ] ✅ `/api/dashboard/grouped-devices` 返回分组数据

### UI 验证
- [ ] ✅ Tab 0: 设备总览圆环图显示正确
- [ ] ✅ Tab 0: 核心资产状态列表有数据
- [ ] ✅ Tab 0: 拓扑图正常渲染
- [ ] ✅ Tab 0: 告警列表滚动显示
- [ ] ✅ Tab 1: 服务器列表按业务视图分组
- [ ] ✅ Tab 1: 服务器性能趋势图显示
- [ ] ✅ Tab 2: 网络设备列表按业务视图分组
- [ ] ✅ Tab 2: 流量监控图表显示

### 性能检查
- [ ] API 响应时间 < 2 秒
- [ ] 页面加载时间 < 3 秒
- [ ] 无浏览器控制台错误
- [ ] 无内存泄漏（长时间运行）

### 监控检查
- [ ] 服务器 CPU/内存使用正常
- [ ] 数据库连接数正常
- [ ] 无异常错误日志

---

## 🎯 成功标准

修复成功的标准：

1. **所有诊断脚本通过** ✅
   - 数据库诊断无失败项
   - API 诊断无失败项

2. **Dashboard 正常展示** ✅
   - 设备总览圆环图显示数据
   - 所有三个 Tab 页都有数据
   - 实时告警正常滚动

3. **性能符合要求** ✅
   - API 响应 < 2 秒
   - 页面加载 < 3 秒
   - 无控制台错误

4. **数据实时更新** ✅
   - 每 15-30 秒自动刷新
   - Tab 切换正常工作
   - 数据准确无误

---

## 📞 支持和联系

如果按照本文档执行后仍有问题，请提供以下信息：

1. **诊断脚本输出**
   - `diagnose-database-data.ts` 的完整输出
   - `diagnose-dashboard-api.ts` 的完整输出

2. **服务器日志**
   ```bash
   pm2 logs monitoring-dashboard --lines 200 > logs.txt
   ```

3. **浏览器控制台截图**
   - Network 面板（显示 API 请求）
   - Console 面板（显示错误信息）

4. **环境信息**
   - Node.js 版本: `node -v`
   - npm 版本: `npm -v`
   - 操作系统: `uname -a` (Linux) 或 `ver` (Windows)
   - 数据库版本: `SELECT version();` (PostgreSQL)

---

## 📚 相关文档

- [项目 README](./README.md)
- [API 文档](./docs/API.md)
- [数据库 Schema](./prisma/schema.prisma)
- [部署指南](./DEPLOYMENT.md)
- [问题诊断报告](./dashboard-data-issue-diagnosis.md) - 内存文件

---

**版本历史**:
- v1.0 (2026-01-23) - 初始版本，修复 /api/stats/business-view 缺失问题
