# 数据清理快速参考

## ⚡ 快速开始

```bash
# 1. 预览孤立数据（推荐先运行）
npm run clean:orphaned -- --dry-run

# 2. 软删除孤立数据（标记为不监控，可恢复）
npm run clean:orphaned

# 3. 硬删除孤立数据（永久删除，谨慎使用）
npm run clean:orphaned -- --hard
```

## 📊 清理模式对比

| 模式 | 命令 | 数据保留 | 可恢复 | 用途 |
|------|------|---------|--------|------|
| 预览 | `--dry-run` | ✅ | - | 查看将被删除的数据 |
| 软删除 | 默认 | ✅ | ✅ | 日常维护（推荐） |
| 硬删除 | `--hard` | ❌ | ❌ | 释放数据库空间 |

## 🎯 常用命令

```bash
# 预览所有孤立数据
npm run clean:orphaned -- --dry-run

# 只预览设备
npm run clean:orphaned -- --dry-run --interfaces-only

# 只预览接口
npm run clean:orphaned -- --dry-run --devices-only

# 软删除所有孤立数据
npm run clean:orphaned

# 硬删除（⚠️ 危险）
npm run clean:orphaned -- --hard
```

## 🔄 推荐工作流

### 每月维护

```bash
# 步骤 1: 预览（必做）
npm run clean:orphaned -- --dry-run

# 步骤 2: 检查输出，确认要删除的数据

# 步骤 3: 执行软删除
npm run clean:orphaned

# 步骤 4: 验证结果
npm run check:sync
```

### 季度大清理

```bash
# 步骤 1: 备份数据库
pg_dump monitoring-dashboard > backup-$(date +%Y%m%d).sql

# 步骤 2: 预览
npm run clean:orphaned -- --dry-run

# 步骤 3: 软删除
npm run clean:orphaned

# 步骤 4: 确认无误后，硬删除释放空间
npm run clean:orphaned -- --hard

# 步骤 5: 验证
npm run check:all
```

## 📋 输出示例

### 预览模式

```
🧹 孤立数据清理工具
═══════════════════════════════════════
模式: 🔍 预览模式（不实际删除）
═══════════════════════════════════════

📦 检查孤立设备...
数据库: 125 台 | OpManager: 120 台

⚠️  发现 5 台孤立设备:
Old-Switch-01     172.16.1.100
Test-Router       192.168.1.1
...

🔌 检查孤立接口...
数据库: 1500 个 | 分布在 125 台设备

⚠️  发现 30 个孤立接口:
GigabitEthernet0/0/1  (Switch-01)
...

📊 清理统计:
孤立设备: 5 | 孤立接口: 30
```

## 🆘 常见场景

### 场景 1: 日常维护（每月）
```bash
npm run clean:orphaned -- --dry-run  # 预览
npm run clean:orphaned               # 软删除
```

### 场景 2: 数据库清理（每季度）
```bash
# 备份 → 预览 → 软删除 → 硬删除
pg_dump ... > backup.sql
npm run clean:orphaned -- --dry-run
npm run clean:orphaned
npm run clean:orphaned -- --hard
```

### 场景 3: 只清理设备
```bash
npm run clean:orphaned -- --interfaces-only --dry-run
npm run clean:orphaned -- --interfaces-only
```

### 场景 4: 恢复误删数据

**软删除恢复**：
1. 访问 `/admin/devices`
2. 筛选 `isMonitored: false`
3. 勾选设备 → 启用监控

**硬删除恢复**：
```bash
psql monitoring-dashboard < backup.sql
```

## ⚠️ 注意事项

| 注意事项 | 说明 |
|----------|------|
| ✅ 先预览 | 务必先运行 `--dry-run` |
| ✅ 确认连接 | 确保 OpManager 连接正常 |
| ✅ 低峰期 | 硬删除建议在低峰期执行 |
| ⚠️ 硬删除 | 永久删除，无法恢复 |
| 💾 备份 | 硬删除前务必备份 |

## 📞 获取帮助

```bash
# 查看完整文档
cat docs/DATA-CLEANUP-GUIDE.md

# 检查系统状态
npm run check:all

# 验证 OpManager 连接
npm run verify:opmanager-apis
```

## 🎓 清理原理

**孤立数据**：
- 数据库中存在 ✅
- OpManager 中不存在 ❌

**识别方法**：
1. 获取数据库所有设备/接口
2. 获取 OpManager 所有设备/接口
3. 对比找出差异

**软删除** (推荐):
```sql
UPDATE Device SET isMonitored = false
```

**硬删除** (谨慎):
```sql
DELETE FROM Device CASCADE
```

---

**详细文档**: [docs/DATA-CLEANUP-GUIDE.md](docs/DATA-CLEANUP-GUIDE.md)
