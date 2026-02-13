# 🚨 紧急修复指令

> **问题**: API 返回空数据  
> **原因**: API 设计错误，应该调用 OpManager 而不是查询数据库  
> **状态**: ✅ 已修复

---

## ❌ 问题现象

```bash
curl http://localhost:3000/api/stats/business-view?bvName=出口业务
# 返回: {"devices":{"total":0,"online":0,...}}  ← 错误！应该有 6 个设备
```

**OpManager 实际数据**:
```
https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView?bvName=出口业务
# 返回: 6 个设备（正确）
```

---

## ✅ 解决方案

### 问题根源

之前创建的 `business-view.ts` 错误地查询了**本地数据库**的 `businessViews` 字段，但该字段为空。

**正确做法**: 应该**直接调用 OpManager API** 获取业务视图数据。

---

## 🚀 立即执行（3 步，5 分钟）

### 步骤 1: 更新 API 文件 (2 分钟)

```bash
cd /root/monitoring-app

# 方式 A: 使用 Git 拉取最新代码（推荐）
git pull origin master

# 验证文件已更新
cat src/pages/api/stats/business-view.ts | head -30
# 应该看到: import { OpManagerDataCollector } from '@/services/opmanager/data-collector';
```

**方式 B: 手动替换文件**（如果 Git 不可用）

从开发环境上传更新后的文件：
```bash
# 在开发机器上
scp D:\monitoring-dashboard\src\pages\api\stats\business-view.ts \
    root@10.141.69.192:/root/monitoring-app/src/pages/api/stats/
```

---

### 步骤 2: 重新构建 (2 分钟)

```bash
cd /root/monitoring-app

# 构建项目
npm run build

# 等待构建成功
# 预期: ✓ Compiled successfully
```

---

### 步骤 3: 重启服务 (1 分钟)

```bash
# 重启 PM2 服务
pm2 restart monitoring-dashboard

# 等待 5 秒
sleep 5

# 检查状态
pm2 status
# 预期: status = online
```

---

## ✅ 验证修复

### 测试 1: 空参数（全局统计）

```bash
curl -s http://localhost:3000/api/stats/business-view?bvName= | jq

# 预期输出:
# {
#   "devices": {
#     "totalAll": 174,  ← 应该是总设备数
#     "online": 174,
#     "byType": {
#       "network": 120,
#       "server": 54,
#       ...
#     }
#   }
# }
```

### 测试 2: 指定业务视图

```bash
curl -s "http://localhost:3000/api/stats/business-view?bvName=出口业务" | jq

# 预期输出:
# {
#   "devices": {
#     "totalAll": 6,  ← 应该是 6 个设备
#     "online": 4,
#     "warning": 2,
#     "byType": {
#       "network": 4,
#       "server": 2,
#       ...
#     }
#   },
#   "businessView": "出口业务",
#   ...
# }
```

### 测试 3: 检查日志

```bash
pm2 logs monitoring-dashboard --lines 20

# 应该看到:
# [API /api/stats/business-view] Fetching business view: 出口业务
# [API /api/stats/business-view] Business view '出口业务': Found 6 devices
```

---

## 🎯 成功标准

修复成功的标志：

1. ✅ 空参数返回 174 个设备（全局）
2. ✅ `bvName=出口业务` 返回 6 个设备
3. ✅ 设备类型分布正确（network/server）
4. ✅ 在线/警告数量正确

---

## 📊 API 变化对比

### ❌ 旧版本（错误）

```typescript
// 错误：查询本地数据库
const whereCondition = {
  isMonitored: true,
  businessViews: { has: viewName }  // ← 这个字段为空！
};

const totalDevices = await prisma.device.count({ where: whereCondition });
// 结果：0 个设备
```

### ✅ 新版本（正确）

```typescript
// 正确：直接调用 OpManager API
const collector = new OpManagerDataCollector(baseUrl, apiKey);
const response = await collector.getBusinessDetailsView(viewName, 0, 1000);
const devices = response.BusinessDetailsView?.Details || [];
// 结果：6 个设备（来自 OpManager）
```

---

## 🔍 快速诊断命令

```bash
# 1. 检查 API 文件是否正确
grep -n "OpManagerDataCollector" src/pages/api/stats/business-view.ts
# 预期: 应该找到这行代码

# 2. 测试全局统计
curl -s http://localhost:3000/api/stats/business-view?bvName= | jq '.devices.totalAll'
# 预期: 174

# 3. 测试业务视图
curl -s "http://localhost:3000/api/stats/business-view?bvName=出口业务" | jq '.devices.totalAll'
# 预期: 6

# 4. 查看最近日志
pm2 logs monitoring-dashboard --lines 10
```

---

## 🌐 浏览器验证

修复后，访问 Dashboard：

```
URL: http://10.141.69.192:3000/dashboard
```

**预期效果**:
1. ✅ 设备总览圆环图显示 174 个设备
2. ✅ 网络设备/服务器分布正确
3. ✅ 数据实时更新（每 15 秒）

---

## ❓ 如果仍然失败

### 问题 1: 仍然返回 0

```bash
# 检查 OpManager 连接
curl -s "https://10.141.69.192:8061/api/json/businessview/getBusinessDetailsView?bvName=出口业务" \
  -H "apiKey: YOUR_API_KEY" | jq

# 如果这个失败，检查:
# 1. OPMANAGER_API_KEY 是否正确
# 2. 网络是否可达
# 3. API Key 权限
```

### 问题 2: API 500 错误

```bash
# 查看详细错误
pm2 logs monitoring-dashboard --err --lines 50

# 常见原因:
# - OpManagerDataCollector 导入失败
# - 环境变量缺失
# - TypeScript 编译错误
```

### 问题 3: 构建失败

```bash
# 清理重新构建
rm -rf .next
npm run build

# 如果仍然失败
npm install
npm run build
```

---

## 📞 需要协助

如果修复后仍有问题，提供：

```bash
# 1. API 测试结果
curl -v "http://localhost:3000/api/stats/business-view?bvName=出口业务" > api-test.txt 2>&1

# 2. 服务器日志
pm2 logs monitoring-dashboard --lines 100 > pm2-logs.txt

# 3. 文件验证
head -50 src/pages/api/stats/business-view.ts > file-content.txt

# 打包
tar -czf debug-fix.tar.gz *-test.txt *-logs.txt *-content.txt
```

---

## ⏱️ 预计时间

- 更新文件: 2 分钟
- 构建: 2 分钟
- 重启: 1 分钟
- 验证: 1 分钟
- **总计: 6 分钟**

---

**立即执行以上 3 个步骤，6 分钟内完成修复！** 🚀
