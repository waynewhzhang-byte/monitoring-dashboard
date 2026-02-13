# 数据清理指南

## 🎯 问题说明

当设备或接口从 OpManager 中删除后，数据库中的相关记录不会自动删除，会产生**孤立数据（orphaned data）**。

### 什么是孤立数据？

- **孤立设备**: 数据库中存在，但 OpManager 中已不存在的设备
- **孤立接口**: 数据库中存在，但 OpManager 中已不存在的接口

### 为什么会产生孤立数据？

当前的同步逻辑使用**增量更新**策略：
```typescript
// 设备/接口同步只做 upsert（更新或插入）
await prisma.device.upsert({
    where: { ... },
    update: { ... },
    create: { ... }
});
```

**优点**: 安全，不会误删数据
**缺点**: OpManager 中删除的设备/接口不会自动从数据库清除

## 🧹 清理方案

### 清理模式

| 模式 | 命令 | 说明 | 安全性 |
|------|------|------|--------|
| **预览模式** | `--dry-run` | 只显示将被删除的数据，不实际删除 | ✅ 最安全 |
| **软删除** | 默认 | 标记为 `isMonitored: false`，数据保留 | ✅ 安全 |
| **硬删除** | `--hard` | 永久删除数据及关联记录 | ⚠️ 危险 |

### 推荐流程

```bash
# 步骤 1: 预览将被清理的数据（必做）
npm run clean:orphaned -- --dry-run

# 步骤 2: 确认无误后，执行软删除（推荐）
npm run clean:orphaned

# 步骤 3: 如需永久删除，执行硬删除（谨慎）
npm run clean:orphaned -- --hard
```

## 📝 使用示例

### 示例 1: 预览孤立数据

```bash
npm run clean:orphaned -- --dry-run
```

输出：
```
🧹 孤立数据清理工具
═══════════════════════════════════════
模式: 🔍 预览模式（不实际删除）
清理范围: 设备 + 接口
═══════════════════════════════════════

📦 检查孤立设备...
数据库中共有 125 台设备
OpManager 中共有 120 台设备

⚠️  发现 5 台孤立设备:
───────────────────────────────────────
名称                          IP地址              状态
───────────────────────────────────────
Old-Switch-01                172.16.1.100        监控中
Test-Router                  192.168.1.1         监控中
...
───────────────────────────────────────

🔌 检查孤立接口...
数据库中共有 1500 个接口
分布在 125 台设备上

⚠️  发现 30 个孤立接口:
───────────────────────────────────────
接口名称                      设备                        状态
───────────────────────────────────────
GigabitEthernet0/0/1         Switch-01                   监控中
...
───────────────────────────────────────

📊 清理统计
设备: 孤立 5, 已处理 0
接口: 孤立 30, 已处理 0
总计: 孤立 35, 已处理 0

💡 提示：这是预览模式，未实际删除数据
```

### 示例 2: 软删除孤立数据（推荐）

```bash
npm run clean:orphaned
```

结果：
- ✅ 设备/接口标记为 `isMonitored: false`
- ✅ 数据保留在数据库中
- ✅ 不再显示在监控大屏
- ✅ 可以在 admin 面板中恢复

### 示例 3: 硬删除孤立数据（谨慎）

```bash
npm run clean:orphaned -- --hard
```

⚠️ **警告**：
- ❌ 数据永久删除，无法恢复
- ❌ 关联数据（指标、告警等）一并删除
- ✅ 节省数据库空间

### 示例 4: 只清理设备或接口

```bash
# 只清理孤立设备
npm run clean:orphaned -- --interfaces-only --dry-run

# 只清理孤立接口
npm run clean:orphaned -- --devices-only --dry-run
```

## 🔍 孤立数据识别逻辑

### 设备识别

设备被视为孤立，当且仅当：
```
数据库中存在 && OpManager 中不存在
```

匹配条件（任一匹配即视为存在）：
1. **opmanagerId** 匹配
2. **deviceName** 匹配
3. **ipAddress** 匹配

### 接口识别

接口被视为孤立，当且仅当：
```
数据库中存在 && 该设备在 OpManager 中的接口列表中不存在
```

匹配条件：
- **interfaceName** 匹配

## ⚙️ 清理策略对比

### 软删除 vs 硬删除

| 特性 | 软删除 | 硬删除 |
|------|--------|--------|
| **数据保留** | ✅ 保留 | ❌ 删除 |
| **可恢复** | ✅ 可恢复 | ❌ 不可恢复 |
| **关联数据** | ✅ 保留 | ❌ 删除 |
| **数据库空间** | ⚠️ 占用 | ✅ 释放 |
| **推荐场景** | 日常维护 | 数据库清理 |

### 软删除详情

```sql
-- 软删除设备
UPDATE Device
SET isMonitored = false
WHERE id IN (orphaned_device_ids);

-- 效果：
-- ✅ 数据保留
-- ✅ 不再显示在大屏
-- ✅ 可在 admin 面板恢复
```

### 硬删除详情

```sql
-- 硬删除设备（级联删除关联数据）
DELETE FROM Device
WHERE id IN (orphaned_device_ids);

-- 同时删除：
-- ❌ DeviceMetric (性能指标)
-- ❌ Alarm (告警记录)
-- ❌ Interface (接口)
-- ❌ TrafficMetric (流量数据)
-- ❌ TopologyNode (拓扑节点)
```

## 🗓️ 维护建议

### 定期清理

建议每月执行一次孤立数据清理：

```bash
# 每月 1 号执行
# 1. 预览
npm run clean:orphaned -- --dry-run

# 2. 软删除
npm run clean:orphaned

# 3. 备份数据库
# 参考：DATABASE-MIGRATION-GUIDE.md
```

### 自动化清理（可选）

如果希望自动化清理，可以使用 cron（Linux）或计划任务（Windows）：

```bash
# Linux crontab
# 每月 1 号凌晨 2 点执行软删除
0 2 1 * * cd /path/to/monitoring-dashboard && npm run clean:orphaned >> /var/log/cleanup.log 2>&1
```

### 清理前检查

在执行清理前，建议检查：

1. **备份数据库**
   ```bash
   # PostgreSQL 备份
   pg_dump monitoring-dashboard > backup-$(date +%Y%m%d).sql
   ```

2. **确认 OpManager 连接正常**
   ```bash
   npm run verify:opmanager-apis
   ```

3. **检查同步状态**
   ```bash
   npm run check:sync
   ```

## 🔧 恢复误删除的数据

### 软删除恢复

软删除的数据可以在 admin 面板中恢复：

1. 访问 `/admin/devices` 或 `/admin/interfaces`
2. 筛选 `isMonitored: false` 的记录
3. 勾选需要恢复的记录
4. 点击"启用监控"

### 硬删除恢复

硬删除的数据只能通过数据库备份恢复：

```bash
# 恢复数据库备份
psql monitoring-dashboard < backup-20260204.sql
```

## 📊 清理影响分析

### 对系统的影响

| 影响 | 软删除 | 硬删除 |
|------|--------|--------|
| **大屏显示** | 不显示 | 不显示 |
| **数据库大小** | 不变 | 减小 |
| **查询性能** | 略微影响 | 提升 |
| **API 响应** | 无影响 | 无影响 |

### 数据库空间估算

```sql
-- 查看设备和接口数量
SELECT
    (SELECT COUNT(*) FROM "Device") as devices,
    (SELECT COUNT(*) FROM "Interface") as interfaces,
    (SELECT COUNT(*) FROM "DeviceMetric") as metrics,
    (SELECT COUNT(*) FROM "TrafficMetric") as traffic;
```

典型空间占用：
- 1 台设备 ≈ 1KB
- 1 个接口 ≈ 500B
- 1 条指标记录 ≈ 200B
- 1 条流量记录 ≈ 300B

## 🆘 常见问题

### Q: 软删除后数据还占用空间吗？
A: 是的，软删除只标记为不监控，数据仍在数据库中。如需释放空间，使用硬删除。

### Q: 硬删除后能恢复吗？
A: 不能，除非有数据库备份。建议先软删除，确认无误后再硬删除。

### Q: 清理会影响正在运行的系统吗？
A: 软删除无影响。硬删除可能短暂影响性能，建议在低峰期执行。

### Q: 如何判断数据是否真的孤立？
A: 脚本会从 OpManager 获取最新数据进行对比。建议先运行 `--dry-run` 预览。

### Q: 多久清理一次合适？
A: 建议每月清理一次。如果设备变动频繁，可每周清理。

## 📚 相关命令

```bash
# 清理孤立数据
npm run clean:orphaned -- --dry-run      # 预览
npm run clean:orphaned                   # 软删除
npm run clean:orphaned -- --hard         # 硬删除

# 检查数据状态
npm run check:sync                       # 检查同步状态
npm run check:metrics                    # 检查性能数据
npm run check:all                        # 检查所有数据

# 同步数据
# 在 admin 面板中手动同步设备和接口
```

## 📖 总结

**推荐工作流**：
1. ✅ 每月执行 `--dry-run` 预览孤立数据
2. ✅ 确认无误后执行软删除
3. ✅ 季度性执行硬删除释放空间
4. ✅ 清理前务必备份数据库

**核心原则**：
- 🔍 预览优先
- 🛡️ 软删除为主
- ⚠️ 硬删除谨慎
- 💾 定期备份

---

**更新日期**: 2026-02-04
