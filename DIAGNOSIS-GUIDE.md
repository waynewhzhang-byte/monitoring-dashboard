# 生产环境诊断指南

## 概述

本项目提供了两个诊断脚本，用于检查生产环境中后端 API 调用和数据采集的状态。

## 诊断脚本

### 1. 全面诊断脚本 (推荐)

**文件**: `scripts/production-full-diagnosis.ts`

**功能**: 全面检查系统各个组件的状态

**检查项目**:
- ✅ 环境变量配置
- ✅ 数据库连接和数据完整性
- ✅ OpManager API 连接和数据
- ✅ 内部 API 端点
- ✅ 数据一致性验证
- ✅ 最后同步时间

**使用方法**:
```bash
# 方式 1: 使用 tsx 直接运行
npx tsx scripts/production-full-diagnosis.ts

# 方式 2: 如果已编译
node dist/scripts/production-full-diagnosis.js
```

**输出**:
- 控制台输出：实时显示检查进度和结果
- JSON 报告：`diagnosis-report-[时间戳].json`

**适用场景**:
- 首次部署后的完整检查
- 定期系统健康检查
- 故障排查

---

### 2. OpManager API 数据验证脚本

**文件**: `scripts/verify-opmanager-real-data.ts`

**功能**: 专门验证 OpManager API 是否返回真实的生产数据

**检查项目**:
- ✅ 设备列表 API (`listDevices`)
- ✅ 告警列表 API (`listAlarms`)
- ✅ 设备接口 API (`getInterfaces`)
- ✅ 原始 HTTP 请求测试

**使用方法**:
```bash
# 直接运行
npx tsx scripts/verify-opmanager-real-data.ts
```

**输出**:
- 控制台输出：详细的 API 调用结果和数据样例
- JSON 报告：`opmanager-verification-[时间戳].json`

**适用场景**:
- 验证 OpManager API 配置是否正确
- 确认返回的是真实数据而非模拟数据
- 快速检查 API 连接状态

---

## 使用前准备

### 1. 确保环境变量已配置

创建或编辑 `.env` 文件：

```bash
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard"

# OpManager API 配置
OPMANAGER_BASE_URL="https://opmanager.example.com"
OPMANAGER_API_KEY="your-api-key-here"
OPMANAGER_TIMEOUT=30000

# 关闭模拟数据模式
USE_MOCK_DATA=false

# 环境
NODE_ENV="production"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 确保可以连接到数据库和 OpManager

---

## 诊断步骤

### 方案 A: 快速验证 (5 分钟)

如果你只想快速确认 OpManager API 是否正常：

```bash
# 1. 验证 OpManager API 数据
npx tsx scripts/verify-opmanager-real-data.ts

# 2. 查看输出，确认：
#    - ✅ 所有 API 调用成功
#    - 📦 返回了真实数据（不是 mock 数据）
#    - 数据量合理（设备数、告警数等）
```

### 方案 B: 完整诊断 (10-15 分钟)

如果需要全面检查系统状态：

```bash
# 1. 运行完整诊断
npx tsx scripts/production-full-diagnosis.ts

# 2. 检查输出中的错误和警告
#    - ❌ 错误：必须解决的问题
#    - ⚠️  警告：建议处理的问题
#    - ✅ 成功：通过的检查

# 3. 根据诊断建议进行修复

# 4. 如果发现问题，修复后重新运行
```

---

## 常见问题排查

### ❌ 问题 1: OpManager API 连接失败

**症状**:
```
❌ [OpManager API] OpManager API 调用失败
   error: "connect ECONNREFUSED"
```

**解决方案**:
1. 检查 `OPMANAGER_BASE_URL` 是否正确
2. 确认 OpManager 服务正在运行
3. 测试网络连接：`curl https://opmanager.example.com/api/json/v2/device/listDevices?apiKey=YOUR_KEY`
4. 检查防火墙规则

---

### ❌ 问题 2: API Key 无效

**症状**:
```
❌ [OpManager API] OpManager API 调用失败
   status: 401 Unauthorized
```

**解决方案**:
1. 检查 `OPMANAGER_API_KEY` 是否正确
2. 在 OpManager 控制台验证 API Key 是否有效
3. 确认 API Key 有足够的权限（至少需要读取设备、告警、接口的权限）

---

### ⚠️ 问题 3: 返回的是模拟数据

**症状**:
```
⚠️  警告: 数据可能是模拟数据
```

**解决方案**:
1. 检查 `.env` 文件中 `USE_MOCK_DATA=false`
2. 重启应用服务器
3. 重新运行诊断脚本

---

### ❌ 问题 4: 数据库连接失败

**症状**:
```
❌ [数据库连接] 数据库连接失败
```

**解决方案**:
1. 检查 `DATABASE_URL` 配置是否正确
2. 确认 PostgreSQL 服务正在运行
3. 测试数据库连接：`psql $DATABASE_URL`
4. 检查数据库用户权限

---

### ⚠️ 问题 5: 数据采集器未运行

**症状**:
```
⚠️  最近同步时间: 120 分钟前 - 采集器可能已停止
```

**解决方案**:
1. 检查采集器进程是否在运行
2. 启动采集器：
   ```bash
   # 开发环境
   npm run collector

   # 生产环境
   node dist/services/collector/start.js

   # 使用 PM2
   pm2 start ecosystem.config.js
   ```
3. 检查采集器日志

---

### ⚠️ 问题 6: 内部 API 调用失败

**症状**:
```
❌ [内部 API] 设备列表 API 调用失败
   error: "connect ECONNREFUSED"
```

**解决方案**:
1. 确认应用服务器正在运行：
   ```bash
   # 开发环境
   npm run dev

   # 生产环境
   npm run build
   npm start
   ```
2. 检查端口配置（默认 3000）
3. 如果使用反向代理，检查配置

---

## 诊断报告解读

### 成功的诊断报告示例

```
总计: 25 项检查
✅ 成功: 22
⚠️  警告: 2
❌ 错误: 0
ℹ️  信息: 1

💡 诊断建议:
  ✅ 系统运行正常，所有检查通过！
```

**说明**: 系统健康，可以正常使用。少量警告是正常的（例如：当前没有告警数据）。

---

### 需要关注的诊断报告示例

```
总计: 25 项检查
✅ 成功: 15
⚠️  警告: 5
❌ 错误: 5
ℹ️  信息: 0

❌ 错误详情:
  - [OpManager API] OpManager API 调用失败
  - [数据库数据] 最近同步时间: 180 分钟前 - 采集器可能已停止

💡 诊断建议:
  3. 验证 OpManager API 配置（URL、API Key）是否正确
  5. 检查数据采集服务是否正在运行
```

**说明**: 发现严重问题，需要立即处理：
1. 修复 OpManager API 连接
2. 启动数据采集器

---

## 生产环境部署后的检查清单

部署到生产环境后，按以下顺序执行检查：

### 1️⃣ 环境配置检查
```bash
# 检查环境变量
cat .env | grep -v "PASSWORD\|KEY" | head -20

# 确认关键变量
echo $DATABASE_URL
echo $OPMANAGER_BASE_URL
echo $USE_MOCK_DATA  # 应该是 false
```

### 2️⃣ 数据库检查
```bash
# 运行数据库迁移
npx prisma migrate deploy

# 验证数据库连接
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Device\";"
```

### 3️⃣ OpManager API 检查
```bash
# 运行 API 验证脚本
npx tsx scripts/verify-opmanager-real-data.ts

# 预期结果：
# ✅ 设备列表 API: 返回真实设备数据
# ✅ 告警列表 API: 返回告警数据（或无告警）
# ✅ 接口 API: 返回接口数据
```

### 4️⃣ 启动服务
```bash
# 构建应用
npm run build

# 启动应用服务器
npm start &

# 启动数据采集器
npm run collector &

# 或使用 PM2
pm2 start ecosystem.config.js
```

### 5️⃣ 全面诊断
```bash
# 等待 5 分钟让采集器运行一次
sleep 300

# 运行完整诊断
npx tsx scripts/production-full-diagnosis.ts

# 检查报告
# - 所有 API 调用应该成功
# - 数据库应该有数据
# - 最后同步时间应该在 5 分钟内
```

### 6️⃣ 前端验证
```bash
# 打开浏览器访问
# http://your-server:3000

# 检查：
# - 设备列表显示数据
# - 仪表板显示统计
# - 告警列表显示告警
# - 拓扑图显示设备
```

---

## 自动化监控

### 使用 cron 定期运行诊断

添加到 crontab：

```bash
# 每小时运行一次诊断
0 * * * * cd /path/to/monitoring-dashboard && npx tsx scripts/production-full-diagnosis.ts >> /var/log/monitoring-diagnosis.log 2>&1

# 每 10 分钟检查 OpManager API
*/10 * * * * cd /path/to/monitoring-dashboard && npx tsx scripts/verify-opmanager-real-data.ts >> /var/log/opmanager-check.log 2>&1
```

### 使用 PM2 生态系统

在 `ecosystem.config.js` 中添加：

```javascript
module.exports = {
  apps: [
    // ... 其他应用配置 ...
    {
      name: 'diagnosis',
      script: 'npx',
      args: 'tsx scripts/production-full-diagnosis.ts',
      cron_restart: '0 */6 * * *',  // 每 6 小时运行
      autorestart: false,
    }
  ]
};
```

---

## 获取帮助

如果诊断脚本发现问题但不确定如何解决：

1. **查看详细报告**: 检查生成的 JSON 报告文件
2. **查看日志**:
   - 应用日志: `logs/combined.log`
   - 错误日志: `logs/error.log`
   - PM2 日志: `pm2 logs`
3. **检查文档**: 查看 `CLAUDE.md` 和 `README.md`
4. **联系支持**: 提供诊断报告和日志文件

---

## 附录: 环境变量完整列表

### 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:pass@localhost:5432/db` |
| `OPMANAGER_BASE_URL` | OpManager API 基础 URL | `https://opmanager.example.com` |
| `OPMANAGER_API_KEY` | OpManager API 密钥 | `your-api-key-here` |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `USE_MOCK_DATA` | 使用模拟数据（开发用） | `false` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 应用服务器端口 | `3000` |
| `OPMANAGER_TIMEOUT` | API 请求超时（毫秒） | `30000` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |
| `LOG_LEVEL` | 日志级别 | `info` |

---

**最后更新**: 2024-01-23
**版本**: 1.0.0
