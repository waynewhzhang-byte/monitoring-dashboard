# 🚨 生产环境采集器超时 - 快速修复指南

> **适用场景**：Dashboard 无数据、PM2 日志显示大量超时

---

## ⚡ 1 分钟快速诊断

在生产服务器 Ubuntu 上运行：

```bash
cd /path/to/monitoring-dashboard

# 方法 1：使用纯 JavaScript 版本（推荐 ⭐）
node scripts/diagnose-collector-prod.js

# 方法 2：使用 npm 命令
npm run diagnose:collector:prod

# 方法 3：如果安装了 ts-node
npm run diagnose:collector
```

诊断脚本会输出：
- ✅ OpManager API 连接性验证
- ✅ API 调用成功率和数据质量
- ✅ 当前设备数量
- ✅ API 平均响应时间
- ✅ 预估采集总耗时
- ✅ **具体的配置建议**（照着做即可）

诊断输出示例：
```
0️⃣ 测试 OpManager API 连接...
   ✅ 连接成功 (234ms)
   ✅ API Key 有效

0️⃣.5 测试 listDevices API 返回数据...
   ✅ 成功获取设备列表
   ✅ 返回 10 个设备数据

2️⃣ 测试 OpManager API 性能和数据质量...
   ✅ core-router-01: 3456ms (成功)
      📊 包含 5 个指标 (CPU: ✓, Memory: ✓)
   ⚠️ access-switch-02: 4521ms (数据不完整)
      ℹ️  返回数据但缺少 dials 字段

3️⃣ 分析采集性能...
   平均响应时间: 3988ms
   成功率: 10/10 (100%)
   有效数据率: 8/10 (80%)
```

---

## 🔧 根据诊断结果修复

### 情况 1：超时配置过短

诊断输出示例：
```
⚠️  超时配置过短！建议设置为 OPMANAGER_TIMEOUT=150000 （当前: 30000ms）
```

**修复步骤**：
```bash
# 1. 编辑环境变量
vi .env  # 或 nano .env

# 2. 修改以下行（根据诊断建议调整数值）
OPMANAGER_TIMEOUT=150000  # 改为诊断建议的值

# 3. 保存并退出

# 4. 重启采集器
pm2 restart monitor-collector

# 5. 验证（等待 2-3 分钟）
pm2 logs monitor-collector --lines 50
```

### 情况 2：采集时间超过周期

诊断输出示例：
```
⚠️  采集时间超过周期！预估 85秒 > 60秒周期的 80%
   建议: 将采集间隔改为 COLLECT_METRICS_INTERVAL=120 或 减少批次大小到 3
```

**修复步骤**：

#### 方案 A：增加采集间隔（简单 ⭐）
```bash
# 编辑 .env
vi .env

# 添加或修改以下行
COLLECT_METRICS_INTERVAL=120  # 改为 120 秒

# 重启
pm2 restart monitor-collector
```

#### 方案 B：减少批次大小（如果设备很多）
```bash
# 编辑采集器代码
vi src/services/collector/metric.ts

# 找到第 7-8 行，修改为：
const BATCH_SIZE = 3;  # 从 5 改为 3
const BATCH_DELAY_MS = 2000;  # 从 1000 改为 2000

# 保存后重启
pm2 restart monitor-collector
```

### 情况 3：API 成功率过低

诊断输出示例：
```
❌ API 成功率过低 (40%)！检查:
   - OpManager 服务器状态
   - 设备名称是否正确（数据库中的 name 字段必须与 OpManager 一致）
   - API Key 权限是否足够
```

**修复步骤**：

#### A. 检查 OpManager 服务器状态
```bash
# 1. 测试 OpManager 连接
curl -k "https://opmanager-ip:8061"

# 2. 检查 OpManager 服务
# (在 OpManager 服务器上)
systemctl status opmanager  # Linux
# 或检查 Windows 服务
```

#### B. 检查设备名称一致性
```bash
# 在生产服务器上
npm run check:sync

# 输出会显示数据库中的设备名称
# 确保这些名称与 OpManager 中的完全一致
```

如果设备名称不匹配：
1. 访问 `/admin` 重新同步设备
2. 或手动修正数据库中的设备名称

#### C. 检查 API Key 权限
```bash
# 测试 API Key
curl -k -H "apiKey: YOUR_API_KEY" \
  "https://opmanager-ip:8061/api/json/v2/device/listDevices?rows=1"

# 应该返回设备列表，而不是 401/403 错误
```

### 情况 4：数据完整性低

诊断输出示例：
```
⚠️  数据完整性低 (50% 设备有有效指标)！
   - OpManager 可能未采集某些设备的性能数据
   - 某些设备可能不支持 SNMP 或 WMI
   - 检查 OpManager 中设备的监控状态
```

**修复步骤**：

1. **登录 OpManager 检查设备监控状态**
   - 查看设备是否正常被监控
   - 检查设备的 SNMP/WMI 配置是否正确

2. **排除不支持监控的设备**
```bash
# 在数据库中标记不监控
# 或通过 /admin 面板取消监控
```

### 情况 5：设备过多（> 50 个）

诊断输出示例：
```
⚠️  监控设备过多 (87个)！建议:
   - 在 src/services/collector/metric.ts 中将 BATCH_SIZE 改为 3
   - 在 .env 中设置 COLLECT_METRICS_INTERVAL=120
   - 或者只监控关键设备
```

**修复步骤**：

同时执行方案 A 和 方案 B：

```bash
# 1. 修改 .env
vi .env

# 添加以下配置
OPMANAGER_TIMEOUT=120000
COLLECT_METRICS_INTERVAL=120

# 2. 修改代码
vi src/services/collector/metric.ts

# 第 7-8 行改为：
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

# 3. 重启
pm2 restart monitor-collector
```

---

## ✅ 验证修复成功

### 1. 查看 PM2 日志（应该没有超时了）
```bash
pm2 logs monitor-collector --lines 50

# 正常输出应该是：
# ✅ Collected metrics for 50/50 devices in 85000ms (85s)
```

### 2. 检查数据库是否有新数据
```bash
npm run check:sync

# 应该看到最近的 DeviceMetric 记录
```

### 3. 访问 Dashboard
打开浏览器访问 `http://your-server:3000/dashboard`

应该能看到：
- ✅ CPU/内存/磁盘使用率图表
- ✅ 设备列表
- ✅ 实时数据更新

---

## 🎯 推荐配置（根据设备数量）

### 20-50 个设备
```bash
# .env
OPMANAGER_TIMEOUT=90000
COLLECT_METRICS_INTERVAL=90
```

### 50-100 个设备
```bash
# .env
OPMANAGER_TIMEOUT=120000
COLLECT_METRICS_INTERVAL=120

# src/services/collector/metric.ts (第 7-8 行)
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;
```

### 100+ 个设备
```bash
# .env
OPMANAGER_TIMEOUT=180000
COLLECT_METRICS_INTERVAL=180

# src/services/collector/metric.ts
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

# 建议启用分级监控（只监控关键设备）
# 详见: PRODUCTION-COLLECTOR-TIMEOUT-FIX.md
```

---

## 🆘 如果仍然有问题

### 检查 OpManager 服务器性能
```bash
# 手动测试单个设备的响应时间
time curl -k -H "apiKey: YOUR_API_KEY" \
  "https://opmanager-ip:8061/api/json/device/getDeviceSummary?name=DEVICE_NAME"

# 如果单个请求 > 10 秒，问题在 OpManager 侧
```

### 检查网络连接
```bash
# 测试延迟
ping -c 10 opmanager-server-ip

# 应该 < 10ms
```

### 检查是否有多个采集器在运行
```bash
# 查看采集器进程
ps aux | grep collector

# 如果有多个，全部杀掉
pkill -f collector

# 重新启动一个
pm2 start ecosystem.config.js --only monitor-collector
```

### 临时禁用 Metric 采集（降级方案）
```bash
# 编辑 .env，禁用指标采集
COLLECT_METRICS_INTERVAL=0

# 重启
pm2 restart monitor-collector

# Dashboard 仍可显示告警和拓扑数据
```

---

## 📞 收集诊断信息

如果以上都无法解决，请运行：

```bash
# 收集完整诊断信息
node scripts/diagnose-collector-prod.js > diagnosis.log 2>&1
pm2 logs monitor-collector --lines 200 > collector.log
cat .env > env.log

# 打包发送
tar -czf debug-info.tar.gz *.log

# 然后提供：
# - 设备数量
# - OpManager 版本
# - debug-info.tar.gz 文件
```

---

## 📚 更多信息

- **完整解决方案**：[PRODUCTION-COLLECTOR-TIMEOUT-FIX.md](PRODUCTION-COLLECTOR-TIMEOUT-FIX.md)
- **诊断场景速查**：[PRODUCTION-DIAGNOSTIC-SCENARIOS.md](PRODUCTION-DIAGNOSTIC-SCENARIOS.md) ⭐ 新增
- **高级优化**：分级监控、错峰采集、多进程等
- **项目文档**：[CLAUDE.md](CLAUDE.md)

---

**最后更新**: 2026-01-25
