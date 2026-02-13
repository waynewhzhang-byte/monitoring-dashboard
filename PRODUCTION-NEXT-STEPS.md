# 生产环境下一步操作指南

> **基于诊断结果**: 2026-01-23 03:40  
> **服务器**: 10.141.69.192  
> **当前状态**: ⚠️ 需要验证核心 API

---

## 📊 诊断结果总结

### ✅ 已确认正常的项目

| 检查项 | 状态 | 数据 |
|--------|------|------|
| 数据库连接 | ✅ 正常 | PostgreSQL 可用 |
| 设备数据 | ✅ 充足 | 174 个设备，全部在线 |
| 性能指标 | ✅ 正常 | 774,040 条记录 |
| 数据采集 | ✅ 工作中 | 最近 2 分钟有新数据 |
| Dashboard API | ✅ 响应 | 可以返回设备和告警数据 |

**结论**: 后端数据完整，数据采集正常运行 ✅

---

### ❓ 需要立即验证的项目

**关键问题**: `/api/stats/business-view` API 是否已部署？

这是 Dashboard 圆环图必需的 API，需要立即检查。

---

## 🚀 立即执行（5 步，10 分钟）

### 步骤 1: 检查核心文件是否存在 (30 秒)

```bash
cd /root/monitoring-app

# 检查 API 文件
ls -la src/pages/api/stats/business-view.ts

# 预期结果:
# 如果文件存在: 显示文件信息
# 如果不存在: No such file or directory
```

**如果文件不存在 → 跳转到步骤 2**  
**如果文件存在 → 跳转到步骤 3**

---

### 步骤 2: 上传核心 API 文件 (2 分钟)

#### 方式 A: 使用 Git（推荐）

```bash
cd /root/monitoring-app

# 拉取最新代码
git pull origin master

# 验证文件已下载
ls -la src/pages/api/stats/business-view.ts
```

#### 方式 B: 手动上传（如果 Git 不可用）

从开发环境上传文件：

```bash
# 在开发机器上执行
scp D:\monitoring-dashboard\src\pages\api\stats\business-view.ts \
    root@10.141.69.192:/root/monitoring-app/src/pages/api/stats/

# 输入密码后等待上传完成
```

**验证**:
```bash
# 在生产服务器上确认
ls -la /root/monitoring-app/src/pages/api/stats/business-view.ts
cat /root/monitoring-app/src/pages/api/stats/business-view.ts | head -20
```

---

### 步骤 3: 重新构建项目 (3 分钟)

```bash
cd /root/monitoring-app

# 构建生产版本
npm run build

# 等待构建完成，应看到:
# ✓ Compiled successfully
```

**预期输出**:
```
info  - Linting and checking validity of types...
info  - Creating an optimized production build...
info  - Compiled successfully
info  - Collecting page data...
info  - Generating static pages (X/X)
info  - Finalizing page optimization...

Route (pages)                              Size     First Load JS
┌ ○ /                                      XXX kB        XXX kB
├ ○ /404                                   XXX kB        XXX kB
├ ● /api/stats/business-view               0 B              0 B  ← 应该看到这个
...
```

---

### 步骤 4: 重启服务 (1 分钟)

```bash
# 重启 PM2 服务
pm2 restart monitoring-dashboard

# 等待几秒后检查状态
pm2 status

# 查看启动日志
pm2 logs monitoring-dashboard --lines 30
```

**预期输出**:
```
┌─────┬──────────────────────────┬─────────┬─────────┬──────────┬──────┐
│ id  │ name                     │ mode    │ ↺       │ status   │ cpu  │
├─────┼──────────────────────────┼─────────┼─────────┼──────────┼──────┤
│ 0   │ monitoring-dashboard     │ fork    │ X       │ online   │ 0%   │
└─────┴──────────────────────────┴─────────┴─────────┴──────────┴──────┘
```

**如果状态是 "errored"**:
```bash
# 查看错误日志
pm2 logs monitoring-dashboard --lines 50 --err

# 常见问题:
# - 端口被占用: 检查是否有其他进程使用 3000 端口
# - 环境变量缺失: 检查 .env.local 文件
```

---

### 步骤 5: 测试 API 端点 (1 分钟)

```bash
# 测试核心 API
curl http://localhost:3000/api/stats/business-view?bvName=

# 预期响应: JSON 数据
# {
#   "devices": {
#     "totalAll": 174,
#     "online": 174,
#     ...
#   },
#   "businessView": "global",
#   "timestamp": "..."
# }
```

**使用 jq 格式化输出**（如果安装了 jq）:
```bash
curl -s http://localhost:3000/api/stats/business-view?bvName= | jq '.devices'

# 预期输出:
# {
#   "totalAll": 174,
#   "online": 174,
#   "offline": 0,
#   "warning": 0,
#   "error": 0,
#   "availability": 100,
#   "healthScore": 100,
#   "byType": {
#     "network": 120,
#     "server": 54,
#     "other": 0
#   }
# }
```

**检查 HTTP 状态码**:
```bash
curl -I http://localhost:3000/api/stats/business-view?bvName=

# 预期: HTTP/1.1 200 OK
```

---

## ✅ 验证成功标准

所有以下条件都满足，说明修复成功：

1. ✅ `business-view.ts` 文件存在
2. ✅ `npm run build` 成功完成
3. ✅ `pm2 status` 显示 "online"
4. ✅ API 返回 200 状态码
5. ✅ 响应包含 `devices` 字段和完整数据

---

## 🌐 浏览器验证（关键步骤）

### 1. 访问 Dashboard

```
URL: http://10.141.69.192:3000/dashboard
```

### 2. 打开开发者工具

- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I`
- **Firefox**: 按 `F12` 或 `Ctrl+Shift+K`

### 3. 检查 Network 面板

1. 刷新页面 (`F5`)
2. 在 Filter 中输入: `business-view`
3. 找到请求: `business-view?bvName=`

**预期结果**:
- Status: `200`
- Type: `xhr` 或 `fetch`
- Size: 几 KB
- Time: < 2000 ms

**点击查看 Response**:
```json
{
  "devices": {
    "totalAll": 174,
    "online": 174,
    ...
  }
}
```

### 4. 检查 Console 面板

**预期结果**:
- ✅ 无红色错误
- ✅ 可能有蓝色/灰色的日志（正常）

**常见错误**:
```javascript
// ❌ 如果看到:
Failed to load resource: the server responded with a status of 404

// 说明: API 文件未正确部署
// 解决: 重新执行步骤 1-4
```

### 5. 验证数据显示

**Tab 0 - 全屏总览**:
- [ ] 左上角圆环图显示设备分布（网络设备、服务器）
- [ ] 中间显示总设备数（应该是 174）
- [ ] 设备类型标签下方显示数量

**如果圆环图为空或显示 "图表加载中..."**:
1. 检查 Network 面板的 API 响应
2. 检查 Console 是否有错误
3. 强制刷新浏览器 (`Ctrl+Shift+R`)

---

## 🔍 快速诊断工具

### 使用快速检查脚本（推荐）

```bash
cd /root/monitoring-app

# 添加执行权限
chmod +x scripts/quick-check-dashboard.sh

# 运行检查
./scripts/quick-check-dashboard.sh

# 预期输出:
# ✅ 通过: 6
# ❌ 失败: 0
# 🎉 所有关键检查通过！
```

**这个脚本会自动检查**:
1. 核心 API 文件是否存在
2. 服务是否运行
3. API 是否返回 200
4. 响应是否包含 devices 数据
5. 构建文件是否最新

---

## ❌ 故障排查

### 问题 1: API 返回 404

```bash
# 检查文件
ls -la src/pages/api/stats/business-view.ts

# 如果文件存在，重新构建
npm run build
pm2 restart monitoring-dashboard

# 测试
curl -I http://localhost:3000/api/stats/business-view?bvName=
```

### 问题 2: API 返回 500

```bash
# 查看错误日志
pm2 logs monitoring-dashboard --lines 50

# 常见原因:
# - 数据库连接失败
# - 环境变量缺失
# - TypeScript 编译错误

# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1;"
```

### 问题 3: 服务无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 3000
# 或
ss -tlnp | grep 3000

# 如果端口被占用，停止旧进程
kill -9 <PID>

# 重新启动
pm2 restart monitoring-dashboard
```

### 问题 4: 构建失败

```bash
# 查看完整构建日志
npm run build 2>&1 | tee build.log

# 常见原因:
# - TypeScript 类型错误
# - 依赖包缺失
# - 磁盘空间不足

# 检查磁盘空间
df -h

# 清理 node_modules 重新安装
rm -rf node_modules .next
npm install
npm run build
```

---

## 📞 需要帮助时

如果以上步骤无法解决问题，请收集以下信息：

```bash
# 1. 文件检查
ls -la src/pages/api/stats/business-view.ts > file-info.txt

# 2. API 测试
curl -v http://localhost:3000/api/stats/business-view?bvName= > api-test.txt 2>&1

# 3. 服务日志
pm2 logs monitoring-dashboard --lines 100 > pm2-logs.txt

# 4. 系统状态
pm2 status > pm2-status.txt
df -h > disk-usage.txt

# 5. 环境信息
node -v > env-info.txt
npm -v >> env-info.txt
cat .env.local | grep -v "PASSWORD\|KEY\|SECRET" >> env-info.txt

# 打包所有信息
tar -czf debug-info.tar.gz *-info.txt *-logs.txt *-test.txt
```

**然后分享 `debug-info.tar.gz`**

---

## 🎉 成功后的检查清单

部署完成后，确认以下所有项目：

- [ ] ✅ 文件 `src/pages/api/stats/business-view.ts` 存在
- [ ] ✅ `npm run build` 成功
- [ ] ✅ `pm2 status` 显示 "online"
- [ ] ✅ `curl` 测试返回 200 和 JSON 数据
- [ ] ✅ 浏览器访问 `/dashboard` 无错误
- [ ] ✅ Network 面板显示 API 返回 200
- [ ] ✅ Console 面板无红色错误
- [ ] ✅ 设备总览圆环图显示数据
- [ ] ✅ 三个 Tab 页都能正常切换
- [ ] ✅ 数据每 15-30 秒自动刷新

---

## 📚 相关文档

- `PRODUCTION-DIAGNOSIS-REPORT.md` - 完整诊断报告
- `QUICK-FIX-REFERENCE.md` - 快速参考
- `DASHBOARD-FIX-VERIFICATION.md` - 详细验证指南
- `scripts/quick-check-dashboard.sh` - 自动检查脚本

---

**预计完成时间**: 10 分钟  
**关键成功指标**: Dashboard 设备总览圆环图显示 174 个设备的分布数据
