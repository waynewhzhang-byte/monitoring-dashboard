# 🚀 快速启动指南 - 新 OpManager 配置

## ✅ 配置已完成

OpManager 后端已成功对接到：
```
https://ithelp.whrank.com:44443
```

## 📝 启动步骤

### 1. 启动数据采集服务（后台服务）

```powershell
npm run collector
```

这将启动：
- ⏱️ 每 60 秒采集设备指标
- ⏱️ 每 30 秒同步告警
- ⏱️ 每 5 分钟同步拓扑视图

**保持此窗口运行**

---

### 2. 启动前端开发服务（新窗口）

```powershell
npm run dev
```

访问: http://localhost:3000

---

## 🔍 验证数据

### 检查数据库数据

```powershell
# 查看设备数量
npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.device.count().then(c => console.log('设备数:', c)).finally(() => prisma.$disconnect())"

# 查看告警数量
npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.alarm.count({ where: { resolvedAt: null } }).then(c => console.log('活动告警:', c)).finally(() => prisma.$disconnect())"
```

### 测试 API 端点

```powershell
# 设备列表
curl http://localhost:3000/api/devices

# 告警列表
curl http://localhost:3000/api/alarms

# 概览统计
curl http://localhost:3000/api/dashboard/overview
```

---

## 📊 当前数据状态

- ✅ **设备**: 62 个
- ✅ **告警**: 113 个
- ✅ **Business Views**: 2 个 (TEST1, TEST2)

---

## 🛠️ 常用命令

### 数据同步

```powershell
# 手动触发设备同步
curl http://localhost:3000/api/devices/sync -X POST

# 手动触发接口同步
curl http://localhost:3000/api/interfaces/sync -X POST
```

### 数据库管理

```powershell
# 查看数据库
npm run db:studio

# 重置数据库（谨慎使用）
npm run db:push
```

---

## ⚠️ 注意事项

1. **数据采集器必须运行**: 否则数据不会更新
2. **设备同步为手动**: 需要通过管理面板或 API 手动触发
3. **监控日志**: 留意 collector 终端的日志输出，查看采集状态

---

## 🐛 遇到问题？

查看详细故障排查: [OPMANAGER-CONNECTION-SUCCESS-REPORT.md](./OPMANAGER-CONNECTION-SUCCESS-REPORT.md)

---

## 📝 配置文件位置

- 环境变量: `.env.local`
- 配置备份: `.env.local.backup`

---

**配置完成时间**: 2026-01-28 12:25 (UTC+8)

**配置人员**: AI Assistant (Claude)

---

## ✅ 检查清单

启动前检查：

- [x] ✅ OpManager API 连接测试通过
- [x] ✅ 设备数据同步成功
- [x] ✅ 告警数据同步成功
- [x] ✅ 环境变量配置正确
- [ ] ⬜ 启动数据采集服务
- [ ] ⬜ 启动前端服务
- [ ] ⬜ 访问前端页面验证

---

**准备好了吗？开始吧！** 🎉
