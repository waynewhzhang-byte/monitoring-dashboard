# 快速验证指南

## 🚀 快速开始（3 步完成验证）

### 1️⃣ 确认环境配置

```bash
# 检查 .env 文件是否存在
ls -la .env

# 查看关键配置（不会显示完整密钥）
cat .env | grep -E "DATABASE_URL|REDIS_URL|OPMANAGER_BASE_URL|OPMANAGER_API_KEY"
```

### 2️⃣ 运行验证脚本

```bash
npm run verify:data-flow
```

### 3️⃣ 查看结果

脚本会自动测试并显示结果：
- ✅ 绿色 = 通过
- ❌ 红色 = 失败
- ⚠️  黄色 = 警告

## 📋 典型使用场景

### 场景 1: 新部署验证

```bash
# 部署后立即验证
cd /path/to/monitoring-dashboard
npm install
npm run db:push
npm run verify:data-flow

# 如果全部通过，启动服务
npm run start &
npm run collector &
```

### 场景 2: 故障排查

```bash
# 用户报告数据不更新
npm run verify:data-flow

# 查看哪个环节出问题：
# - OpManager 连接失败？→ 检查网络和 API Key
# - 采集失败？→ 查看采集器日志
# - 数据库无数据？→ 检查数据库连接
# - API 失败？→ 检查 Next.js 服务
```

### 场景 3: 定期健康检查

```bash
# 设置每小时自动检查
crontab -e

# 添加以下行
0 * * * * cd /path/to/monitoring-dashboard && npm run verify:data-flow >> /var/log/health-check.log 2>&1
```

### 场景 4: 生产环境切换前验证

```bash
# 从开发环境切换到生产环境
cp .env.production .env

# 验证生产配置
npm run verify:data-flow

# 确认通过率 100% 后再切换流量
```

## 🔍 快速问题定位

### 问题 1: OpManager 连接失败

```
❌ OpManager Connection: Failed to connect
```

**快速修复**:
```bash
# 测试网络连通性
ping 10.141.69.192

# 测试 API 端点
curl -k "https://10.141.69.192:8061/api/json/device/listDevices_v2?apiKey=YOUR_KEY&limit=1"

# 如果 SSL 证书问题
echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> .env
```

### 问题 2: 数据库无数据

```
❌ Device Data in DB: No devices in database
```

**快速修复**:
```bash
# 手动触发一次数据采集
npm run collector &

# 等待 30 秒后重新验证
sleep 30
npm run verify:data-flow
```

### 问题 3: API 无法访问

```
❌ Devices List: Request failed
```

**快速修复**:
```bash
# 检查 Next.js 是否运行
ps aux | grep next

# 如果未运行，启动服务
npm run start &

# 等待服务启动
sleep 5
npm run verify:data-flow
```

### 问题 4: 数据过期

```
⚠️  Data might be stale (updated 45 minutes ago)
```

**快速修复**:
```bash
# 检查采集器是否运行
ps aux | grep collector

# 如果未运行，启动采集器
npm run collector &

# 等待采集完成
sleep 60
npm run verify:data-flow
```

## 📊 理解输出结果

### 完美状态（100% 通过）

```
测试结果汇总:
  总测试数: 15
✅   通过: 15
  通过率: 100.0%

🎉 所有测试通过！数据流运行正常。
```

**含义**: 系统完全正常，可以放心使用

### 部分通过（80-99%）

```
测试结果汇总:
  总测试数: 15
✅   通过: 13
❌   失败: 2
  通过率: 86.7%

⚠️  大部分测试通过，但存在一些问题需要关注。
```

**含义**: 核心功能正常，但有小问题需要修复

### 严重问题（<80%）

```
测试结果汇总:
  总测试数: 15
✅   通过: 8
❌   失败: 7
  通过率: 53.3%

❌ 多个测试失败，数据流可能存在严重问题。
```

**含义**: 系统存在重大问题，需要立即处理

## 🛠️ 常用命令组合

### 完整验证流程

```bash
# 1. 检查环境
npm run test:env

# 2. 验证 OpManager API
npm run verify:opmanager-apis

# 3. 完整数据流验证
npm run verify:data-flow

# 4. 检查数据库详情
npm run db:studio
```

### CI/CD 集成

```bash
#!/bin/bash
# deploy.sh

echo "Deploying monitoring dashboard..."

# 部署代码
git pull origin main
npm install
npm run build

# 数据库迁移
npm run db:migrate deploy

# 验证数据流
npm run verify:data-flow
if [ $? -ne 0 ]; then
  echo "❌ Data flow verification failed. Rollback deployment."
  exit 1
fi

# 重启服务
pm2 restart monitoring-dashboard
pm2 restart collector

echo "✅ Deployment completed successfully"
```

### 监控脚本

```bash
#!/bin/bash
# health-check.sh

while true; do
  echo "Running health check at $(date)"

  npm run verify:data-flow

  if [ $? -ne 0 ]; then
    # 发送告警（示例）
    echo "Health check failed" | mail -s "Alert: Monitoring Dashboard" admin@example.com
  fi

  # 每小时检查一次
  sleep 3600
done
```

## 💡 最佳实践

1. **部署后必验证**: 每次部署后立即运行 `verify:data-flow`
2. **定期检查**: 设置 cron job 每小时或每天运行一次
3. **问题优先级**:
   - OpManager 连接 > 数据采集 > 数据库 > API
   - 从源头开始排查
4. **保存日志**: 将输出重定向到日志文件便于回溯
5. **性能监控**: 关注响应时间，异常增长可能预示问题

## 📞 获取帮助

- 详细文档: [scripts/VERIFY-DATA-FLOW-README.md](VERIFY-DATA-FLOW-README.md)
- 查看脚本源码: [scripts/verify-production-data-flow.ts](verify-production-data-flow.ts)
- 相关诊断工具: 运行 `npm run` 查看所有可用命令

## ⚡ 一键修复常见问题

```bash
# 完整重启（谨慎使用）
pm2 stop all
npm run db:push          # 确保数据库 schema 最新
npm run start &          # 启动 Next.js
sleep 5
npm run collector &      # 启动采集器
sleep 60                 # 等待首次采集完成
npm run verify:data-flow # 验证

# 如果仍有问题
npm run diagnose:production  # 运行完整诊断
```

---

**提示**: 这个脚本是诊断工具的"瑞士军刀"，遇到任何数据问题都可以先跑一遍！
