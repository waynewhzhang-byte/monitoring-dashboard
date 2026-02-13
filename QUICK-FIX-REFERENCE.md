# Dashboard 修复快速参考

> **快速参考卡片** - 用于生产环境快速部署和验证

---

## 🚀 快速部署（5 分钟）

### 1. 上传文件

```bash
# 上传这个文件到生产服务器
src/pages/api/stats/business-view.ts
```

### 2. 重启服务

```bash
cd /path/to/monitoring-dashboard
npm run build && pm2 restart monitoring-dashboard
```

### 3. 验证

```bash
# 测试 API
curl http://localhost:3000/api/stats/business-view?bvName=

# 预期: 返回 JSON 数据，包含 devices 字段
```

---

## ✅ 诊断命令

```bash
# 数据库诊断
npm run diagnose:database

# API 诊断
npm run diagnose:dashboard

# 完整诊断
npm run diagnose:all
```

---

## 🔍 快速检查

### API 测试
```bash
curl -s http://localhost:3000/api/stats/business-view?bvName= | jq '.devices.totalAll'
# 预期: 返回设备总数（数字）
```

### 服务状态
```bash
pm2 status
pm2 logs monitoring-dashboard --lines 20
```

### 浏览器测试
```
1. 访问: http://your-ip:3000/dashboard
2. 打开开发者工具 (F12)
3. 检查 Network 面板: business-view 返回 200
4. 检查 Console: 无红色错误
5. 验证: 设备总览圆环图显示数据
```

---

## ❌ 常见问题

### 问题: API 返回 404
```bash
# 解决
ls -la src/pages/api/stats/business-view.ts  # 确认文件存在
npm run build                                  # 重新构建
pm2 restart monitoring-dashboard              # 重启服务
```

### 问题: 数据库无设备
```bash
# 解决
curl -X POST http://localhost:3000/api/devices/sync
# 等待 30 秒
curl http://localhost:3000/api/devices?limit=5
```

### 问题: 圆环图显示加载中
```bash
# 检查
# 1. 浏览器 Console 有错误？
# 2. Network 面板 API 返回 200？
# 3. 响应包含 devices.totalAll？

# 强制刷新浏览器
Ctrl+Shift+R (或 Cmd+Shift+R)
```

---

## 📊 成功标准

- ✅ `diagnose:database` 全部通过
- ✅ `diagnose:dashboard` 全部通过
- ✅ Dashboard 显示设备数据
- ✅ 三个 Tab 都有数据
- ✅ 无浏览器错误

---

## 📞 需要帮助？

提供这些信息：

1. 诊断输出
   ```bash
   npm run diagnose:all > diagnosis.txt 2>&1
   ```

2. 服务器日志
   ```bash
   pm2 logs monitoring-dashboard --lines 100 > logs.txt
   ```

3. 浏览器截图
   - Network 面板
   - Console 面板

---

**详细文档**: 见 `DASHBOARD-FIX-VERIFICATION.md`
