# 🚀 快速诊断指南

## 一键检查命令

### 🎯 推荐：全面诊断（生产环境）

```bash
npm run diagnose:production
```

**功能**：
- ✅ 检查所有环境变量
- ✅ 测试数据库连接和数据
- ✅ 验证 OpManager API 调用
- ✅ 检查内部 API 端点
- ✅ 数据一致性验证
- ✅ 生成详细报告（JSON 文件）

**预期结果**：
```
总计: 25 项检查
✅ 成功: 22
⚠️  警告: 2
❌ 错误: 0
```

---

### ⚡ 快速：仅验证 OpManager API

```bash
npm run diagnose:opmanager
```

**功能**：
- 测试设备列表 API
- 测试告警列表 API
- 测试接口数据 API
- 验证返回的是真实数据（非 mock）

**适用于**：
- 快速确认 API 配置正确
- 验证 API Key 有效
- 检查数据真实性

---

### 🔬 深度：API 调用对比分析（新增）

```bash
npm run diagnose:api-calls
```

**功能**：
- 对比原始 HTTP 调用 vs 项目代码调用
- 测试 `listDevices` API（V2）
- 测试 `getBusinessDetailsView` API（含中文参数）
- 详细分析请求参数和响应数据差异
- 识别 Postman 调用和代码调用的不一致

**适用于**：
- 排查 Postman 调用和代码采集数据不一致的问题
- 验证 API 调用参数是否正确
- 分析响应数据解析逻辑
- 检查中文参数的 URL 编码

---

## 📋 使用步骤

### 1️⃣ 首次使用

```bash
# 1. 安装依赖（如果还没有）
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入真实的配置

# 3. 运行诊断
npm run diagnose:production
```

### 2️⃣ 日常检查

```bash
# 快速检查 OpManager API
npm run diagnose:opmanager

# 或完整检查
npm run diagnose:production
```

### 3️⃣ 查看报告

诊断完成后会生成报告文件：

```bash
# 全面诊断报告
diagnosis-report-[时间戳].json

# OpManager API 验证报告
opmanager-verification-[时间戳].json
```

---

## ✅ 成功案例

### 正常输出示例

```
█████████████████████████████████████████
█  生产环境全面诊断工具
█  时间: 2024-01-23T10:30:00.000Z
█████████████████████████████████████████

================================================================================
📋 步骤 1: 环境变量检查
================================================================================

✅ [环境变量] DATABASE_URL 已设置
✅ [环境变量] OPMANAGER_BASE_URL 已设置
✅ [环境变量] OPMANAGER_API_KEY 已设置

================================================================================
🗄️  步骤 2: 数据库连接检查
================================================================================

✅ [数据库连接] 数据库连接成功
✅ [数据库连接] 可以执行查询，当前设备数量: 150

================================================================================
📊 步骤 3: 数据库数据检查
================================================================================

✅ [数据库数据] 设备总数: 150, 在线设备: 145
✅ [数据库数据] 接口总数: 1200, 监控中接口: 800
✅ [数据库数据] 最近同步时间: 2 分钟前

================================================================================
🌐 步骤 4: OpManager API 连接检查
================================================================================

✅ [OpManager API] 成功获取设备列表，返回 150 个设备
✅ [OpManager API] 成功获取告警列表，返回 5 个告警

================================================================================
📝 诊断报告
================================================================================

总计: 25 项检查
✅ 成功: 25
⚠️  警告: 0
❌ 错误: 0

💡 诊断建议:
  ✅ 系统运行正常，所有检查通过！
```

---

## ❌ 问题排查

### 问题 1: OpManager API 连接失败

**错误信息**:
```
❌ [OpManager API] OpManager API 调用失败
   error: "connect ECONNREFUSED"
```

**解决**:
```bash
# 1. 检查 OpManager URL
echo $OPMANAGER_BASE_URL

# 2. 测试网络连接
ping opmanager.example.com

# 3. 测试 API
curl -k "https://opmanager.example.com/api/json/v2/device/listDevices?apiKey=YOUR_KEY"

# 4. 修改 .env 中的配置后重新运行
npm run diagnose:opmanager
```

---

### 问题 2: 返回模拟数据

**症状**:
```
⚠️  警告: 数据可能是模拟数据
```

**解决**:
```bash
# 1. 检查环境变量
grep USE_MOCK_DATA .env

# 2. 确保设置为 false
# .env 文件中:
USE_MOCK_DATA=false

# 3. 重启服务
npm run dev

# 4. 重新检查
npm run diagnose:opmanager
```

---

### 问题 3: 数据采集器未运行

**症状**:
```
⚠️  最近同步时间: 120 分钟前 - 采集器可能已停止
```

**解决**:
```bash
# 1. 启动采集器
npm run collector

# 2. 或使用 PM2
pm2 start ecosystem.config.js

# 3. 等待几分钟后重新检查
npm run diagnose:production
```

---

## 🔧 环境变量配置

### 最小配置（.env）

```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard"

# OpManager API
OPMANAGER_BASE_URL="https://your-opmanager-server.com"
OPMANAGER_API_KEY="your-api-key-here"

# 关闭 Mock 模式
USE_MOCK_DATA=false
```

### 验证配置

```bash
# 检查环境变量
node -e "console.log('DB:', process.env.DATABASE_URL ? '✅' : '❌')"
node -e "console.log('OpManager URL:', process.env.OPMANAGER_BASE_URL ? '✅' : '❌')"
node -e "console.log('API Key:', process.env.OPMANAGER_API_KEY ? '✅' : '❌')"
node -e "console.log('Mock:', process.env.USE_MOCK_DATA || 'false')"
```

---

## 📞 需要帮助？

### 1. 查看详细文档
```bash
# 完整诊断指南
cat DIAGNOSIS-GUIDE.md

# 项目规范
cat CLAUDE.md
```

### 2. 查看报告文件
```bash
# 查看最新诊断报告
ls -lt *.json | head -1 | xargs cat | jq .

# 查看错误详情
cat diagnosis-report-*.json | jq '.results[] | select(.status == "ERROR")'
```

### 3. 查看日志
```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# PM2 日志
pm2 logs
```

---

## ⏰ 定期检查建议

### 手动检查
- **部署后**：立即运行 `npm run diagnose:production`
- **每天**：运行 `npm run diagnose:opmanager` 检查 API
- **出现问题时**：运行完整诊断

### 自动检查（可选）
```bash
# 添加到 crontab
# 每 6 小时运行一次诊断
0 */6 * * * cd /path/to/project && npm run diagnose:production >> /var/log/diagnosis.log 2>&1
```

---

**提示**: 诊断脚本会生成 JSON 报告文件，保留这些报告有助于追踪历史问题。

**最后更新**: 2024-01-23
