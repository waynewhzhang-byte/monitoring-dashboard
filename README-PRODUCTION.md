# 生产环境使用指南

## 🚀 快速启动

### Windows

```powershell
.\start-production.ps1
```

选择启动模式：
1. **完整启动** - 采集器 + 前端（推荐）
2. **仅采集器** - 后台数据采集
3. **仅前端** - 前端展示
4. **验证配置** - 检查配置是否正确

### 手动启动

#### 终端 1: 数据采集服务
```powershell
npm run collector
```

#### 终端 2: 前端服务
```powershell
npm run dev
```

访问: http://localhost:3000

---

## 📊 当前配置

### OpManager 连接
- **URL**: `https://ithelp.whrank.com:44443`
- **API Key**: 已配置
- **MOCK 数据**: 已禁用 ✅

### 数据统计
- **设备**: 12 个
- **告警**: 108 个
- **Business View**: 2 个

### 采集间隔
- **设备指标**: 每 60 秒
- **告警同步**: 每 30 秒
- **拓扑同步**: 每 5 分钟

---

## 🔧 常用操作

### 验证系统配置
```powershell
npx tsx scripts/verify-production-setup.ts
```

### 手动同步数据

#### 同步设备
```powershell
curl http://localhost:3000/api/devices/sync -X POST
```

#### 同步接口
```powershell
curl http://localhost:3000/api/interfaces/sync -X POST
```

### 查看数据库数据

#### 启动 Prisma Studio
```powershell
npm run db:studio
```

访问: http://localhost:5555

#### 快速查询
```powershell
# 设备数量
npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.device.count().then(c => console.log('设备:', c)).finally(() => prisma.$disconnect())"

# 告警数量
npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.alarm.count({ where: { status: 'ACTIVE' } }).then(c => console.log('告警:', c)).finally(() => prisma.$disconnect())"
```

---

## 🐛 故障排查

### 问题 1: 采集器无法连接 OpManager

**症状**: 采集器日志显示连接错误

**解决方案**:
1. 检查 OpManager 是否在线: `https://ithelp.whrank.com:44443`
2. 验证 API Key 是否正确
3. 检查网络连接

### 问题 2: 前端显示无数据

**症状**: 大屏显示空白或无数据

**解决方案**:
1. 确认采集器正在运行
2. 检查数据库是否有数据:
   ```powershell
   npx tsx scripts/verify-production-setup.ts
   ```
3. 查看浏览器控制台错误

### 问题 3: MOCK 数据仍在显示

**症状**: 显示的是测试数据，不是真实数据

**解决方案**:
1. 检查 `.env.local` 中 `USE_MOCK_DATA=false`
2. 重启采集器和前端服务
3. 清理浏览器缓存

### 问题 4: 设备显示为 OFFLINE

**原因**: OpManager 中设备可能未启用监控

**解决方案**:
1. 登录 OpManager 管理界面
2. 将设备状态从 `UnManaged` 改为 `Managed`
3. 重新同步设备数据

---

## 📝 维护操作

### 完全重新同步

如果数据出现问题，可以完全重新同步：

```powershell
# 1. 清理数据库
npx tsx scripts/clean-database.ts

# 2. 完整同步
npx tsx scripts/full-production-sync.ts

# 3. 验证
npx tsx scripts/verify-production-setup.ts
```

### 数据库备份

```powershell
# 导出数据库
pg_dump -U postgres -d monitoring-dashboard > backup-$(Get-Date -Format "yyyy-MM-dd").sql
```

### 查看日志

采集器和前端的日志会显示在各自的终端窗口中。

---

## 🔐 安全建议

### 生产环境
1. ✅ 使用 HTTPS
2. ✅ 配置防火墙规则
3. ✅ 定期更新依赖包
4. ✅ 设置强密码
5. ⚠️ 建议配置 API Key 认证

### API Key 保护
- ❌ 不要提交 `.env.local` 到 Git
- ✅ 定期更换 API Key
- ✅ 限制 API Key 权限范围

---

## 📊 性能监控

### 监控指标
- **采集器响应时间**: < 10 秒为正常
- **数据库查询时间**: < 1 秒为正常
- **前端加载时间**: < 3 秒为正常

### 优化建议
1. 定期清理历史数据（保留 30 天）
2. 监控数据库大小
3. 定期重启采集器（每周）

---

## 📚 相关文档

- [完整报告](./PRODUCTION-SETUP-COMPLETE.md) - 配置完成详细报告
- [OpManager 对接报告](./OPMANAGER-CONNECTION-SUCCESS-REPORT.md) - API 测试结果
- [快速启动指南](./QUICK-START-NEW-OPMANAGER.md) - 新环境配置指南
- [项目 README](./README.md) - 项目总览
- [AGENTS.md](./AGENTS.md) - AI 开发指南

---

## 🆘 获取帮助

### 检查清单
- [ ] `.env.local` 配置正确
- [ ] `USE_MOCK_DATA=false`
- [ ] OpManager 可访问
- [ ] 数据库连接正常
- [ ] 采集器正在运行
- [ ] 前端服务正在运行

### 验证命令
```powershell
npx tsx scripts/verify-production-setup.ts
```

如果验证通过但仍有问题，请检查：
1. 浏览器控制台错误
2. 采集器终端日志
3. 数据库连接状态

---

**配置完成时间**: 2026-01-28 12:33 (UTC+8)

**系统状态**: ✅ 生产就绪
