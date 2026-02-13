# 生产环境诊断场景速查表

> **快速诊断命令**：`node scripts/diagnose-collector-prod.js`

---

## 🔍 诊断输出解读

### ✅ 正常状态

```
0️⃣ 测试 OpManager API 连接...
   ✅ 连接成功 (150ms)
   ✅ API Key 有效

2️⃣ 测试 OpManager API 性能和数据质量...
   ✅ device-01: 2345ms (成功)
      📊 包含 5 个指标 (CPU: ✓, Memory: ✓)

3️⃣ 分析采集性能...
   平均响应时间: 2500ms
   成功率: 10/10 (100%)
   有效数据率: 10/10 (100%)

📋 诊断结果:
✅ 采集器配置合理，OpManager API 响应正常，数据质量良好！
```

**无需操作**

---

## ❌ 异常场景速查

| 问题现象 | 诊断输出 | 根本原因 | 快速修复 |
|---------|---------|---------|---------|
| **连接失败** | `❌ 连接失败: ECONNREFUSED` | 无法连接到 OpManager | 检查网络、防火墙、OpManager 服务状态 |
| **API Key 无效** | `⚠️  API Key 无效或权限不足 (401/403)` | API Key 错误或过期 | 检查 `.env` 中的 `OPMANAGER_API_KEY` |
| **超时** | `⚠️  超时 - OpManager 响应过慢` | OpManager 负载高或网络慢 | 增加 `OPMANAGER_TIMEOUT` |
| **成功率低** | `❌ API 成功率过低 (40%)` | 设备名称不匹配或设备离线 | 重新同步设备、检查 OpManager |
| **数据不完整** | `⚠️  数据完整性低 (50%)` | 设备不支持 SNMP 或未配置监控 | 检查 OpManager 设备配置 |
| **采集过慢** | `⚠️  采集时间超过周期` | 设备太多或 API 响应慢 | 增加采集间隔或减少批次大小 |

---

## 📊 详细场景分析

### 场景 1: 连接失败 ❌

**诊断输出**：
```
0️⃣ 测试 OpManager API 连接...
   ❌ 连接失败: connect ECONNREFUSED
   ⚠️  无法连接到 OpManager 服务器

📋 诊断结果:
❌ OpManager API 连接失败！请检查网络、URL 和 API Key
```

**排查步骤**：
1. ✅ 检查 OpManager 服务是否运行
2. ✅ 检查防火墙规则（端口 8061）
3. ✅ 测试网络连通性：`ping opmanager-ip`
4. ✅ 检查 `.env` 中的 `OPMANAGER_BASE_URL` 是否正确

**修复**：
```bash
# 检查 OpManager 服务
curl -k https://opmanager-ip:8061

# 检查环境变量
cat .env | grep OPMANAGER
```

---

### 场景 2: API Key 无效 🔑

**诊断输出**：
```
0️⃣ 测试 OpManager API 连接...
   ❌ 连接失败: Request failed with status code 401
   ⚠️  API Key 无效或权限不足

📋 诊断结果:
❌ OpManager API 连接失败！请检查网络、URL 和 API Key
```

**排查步骤**：
1. ✅ 检查 `.env` 中的 `OPMANAGER_API_KEY`
2. ✅ 登录 OpManager 验证 API Key 是否有效
3. ✅ 检查 API Key 是否有足够权限

**修复**：
```bash
# 测试 API Key
curl -k -H "apiKey: YOUR_KEY" \
  "https://opmanager-ip:8061/api/json/v2/device/listDevices?rows=1"

# 应该返回 200 和设备数据
```

---

### 场景 3: 超时 ⏱️

**诊断输出**：
```
2️⃣ 测试 OpManager API 性能和数据质量...
   ❌ device-01: 30001ms (失败: 超时)
   ❌ device-02: 30001ms (失败: 超时)

📋 诊断结果:
⚠️  超时配置过短！建议设置为 OPMANAGER_TIMEOUT=90000 （当前: 30000ms）
```

**排查步骤**：
1. ✅ 检查 OpManager 服务器负载
2. ✅ 检查网络延迟：`ping -c 10 opmanager-ip`
3. ✅ 检查 OpManager 是否正在处理大量请求

**修复**：
```bash
# 编辑 .env
vi .env

# 增加超时时间
OPMANAGER_TIMEOUT=120000  # 120 秒

# 重启采集器
pm2 restart monitor-collector
```

---

### 场景 4: API 成功率低 📉

**诊断输出**：
```
3️⃣ 分析采集性能...
   平均响应时间: 3500ms
   成功率: 4/10 (40%)
   有效数据率: 3/10 (30%)

📋 诊断结果:
❌ API 成功率过低 (40%)！检查:
   - OpManager 服务器状态
   - 设备名称是否正确（数据库中的 name 字段必须与 OpManager 一致）
   - API Key 权限是否足够
```

**常见原因**：
1. **设备名称不匹配**（最常见 🔥）
   - 数据库中的设备名与 OpManager 中的不一致
   - 例如：数据库是 `router-01`，OpManager 是 `Router-01`

2. **设备已删除或离线**
   - 设备在 OpManager 中已被删除
   - 设备状态为 Down

3. **API 权限不足**
   - API Key 没有查询设备详情的权限

**修复**：
```bash
# 1. 检查数据库中的设备名称
npm run check:sync

# 2. 重新同步设备（确保名称一致）
# 访问 /admin，点击"同步设备"

# 3. 验证 OpManager 中的设备状态
# 登录 OpManager 查看设备列表
```

---

### 场景 5: 数据完整性低 📊

**诊断输出**：
```
2️⃣ 测试 OpManager API 性能和数据质量...
   ✅ device-01: 3456ms (成功)
      📊 包含 5 个指标 (CPU: ✓, Memory: ✓)
   ⚠️ device-02: 2345ms (数据不完整)
      ℹ️  返回数据但缺少 dials 字段
   ⚠️ device-03: 3210ms (数据不完整)
      📊 包含 2 个指标 (CPU: ✗, Memory: ✗)

3️⃣ 分析采集性能...
   成功率: 10/10 (100%)
   有效数据率: 5/10 (50%)

📋 诊断结果:
⚠️  数据完整性低 (50% 设备有有效指标)！
   - OpManager 可能未采集某些设备的性能数据
   - 某些设备可能不支持 SNMP 或 WMI
   - 检查 OpManager 中设备的监控状态
```

**常见原因**：
1. **设备不支持 SNMP**
   - 某些设备（如打印机）不提供 CPU/Memory 指标

2. **OpManager 未配置监控**
   - 设备已添加但未启用性能监控

3. **SNMP 配置错误**
   - SNMP Community String 错误
   - SNMP 版本不匹配

**修复**：
```bash
# 1. 登录 OpManager 检查设备监控配置
# 2. 对于不支持监控的设备，取消监控
# 访问 /admin，取消勾选"监控"复选框

# 3. 或在数据库中标记不监控
UPDATE "Device"
SET "isMonitored" = false
WHERE name IN ('printer-01', 'camera-02');
```

---

### 场景 6: 采集时间过长 🐌

**诊断输出**：
```
3️⃣ 分析采集性能...
   批次数: 10 (每批 5 个设备)
   预估每批耗时: 25000ms
   预估总耗时: 259秒

📋 诊断结果:
⚠️  采集时间超过周期！预估 259秒 > 60秒周期的 80%
   建议: 将采集间隔改为 COLLECT_METRICS_INTERVAL=300 或 减少批次大小到 3
```

**原因分析**：
- 监控设备太多（> 50 个）
- API 响应时间慢（> 3 秒/设备）
- 采集周期设置太短（60 秒）

**修复方案**：

#### 方案 A: 增加采集间隔（推荐 ⭐）
```bash
# 编辑 .env
COLLECT_METRICS_INTERVAL=120  # 改为 120 秒或更长
```

#### 方案 B: 减少批次大小
```bash
# 编辑 src/services/collector/metric.ts
const BATCH_SIZE = 3;  # 从 5 改为 3
const BATCH_DELAY_MS = 2000;  # 从 1000 改为 2000
```

#### 方案 C: 只监控关键设备
```bash
# 在数据库中只保留关键设备
UPDATE "Device"
SET "isMonitored" = true
WHERE tags @> ARRAY['critical'];

UPDATE "Device"
SET "isMonitored" = false
WHERE NOT (tags @> ARRAY['critical']);
```

---

## 💡 最佳实践

### 定期诊断
```bash
# 每周运行一次诊断
node scripts/diagnose-collector-prod.js

# 记录结果
node scripts/diagnose-collector-prod.js > weekly-diagnosis-$(date +%Y%m%d).log
```

### 性能监控
```bash
# 查看采集器日志
pm2 logs monitor-collector --lines 100

# 监控采集时间
# 正常输出应该是：
# ✅ Collected metrics for 50/50 devices in 45000ms (45s)
```

### 配置优化
根据设备数量和响应时间，参考以下配置：

| 设备数 | API 响应 | TIMEOUT | INTERVAL | BATCH_SIZE |
|-------|---------|---------|----------|------------|
| < 20  | < 2s    | 60s     | 60s      | 5          |
| 20-50 | 2-3s    | 90s     | 90s      | 3          |
| 50-100| 3-5s    | 120s    | 120s     | 3          |
| > 100 | > 5s    | 180s    | 180s     | 3 + 分级监控 |

---

## 🆘 紧急联系清单

诊断后仍无法解决，请提供：

```bash
# 1. 运行完整诊断
node scripts/diagnose-collector-prod.js > diagnosis.log 2>&1

# 2. 收集环境信息
cat .env > env.log
pm2 logs monitor-collector --lines 200 > collector.log
npm run check:sync > sync-status.log

# 3. 打包发送
tar -czf debug-$(date +%Y%m%d-%H%M%S).tar.gz *.log
```

提供信息：
- 设备总数和监控设备数
- OpManager 版本
- 网络拓扑（应用服务器 ↔ OpManager）
- debug 日志包

---

**最后更新**: 2026-01-25
