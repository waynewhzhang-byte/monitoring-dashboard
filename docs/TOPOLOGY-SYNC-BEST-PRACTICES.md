# 拓扑同步最佳实践 - 防止重复入库

## 问题背景

在 TEST2 业务视图同步中发现了重复入库问题：
- **预期**: 8 个设备对象
- **实际**: 24 个节点（重复 3 倍）

**根本原因**: 并发同步或异常中断导致数据未正确清理

## 重复入库的常见场景

### 1. 并发同步
```
时间线:
T0: 用户点击同步按钮 → 同步进程 A 启动
T1: 进程 A 删除旧数据
T2: 用户再次点击同步 → 同步进程 B 启动
T3: 进程 B 删除旧数据（此时进程 A 可能已创建了部分节点）
T4: 进程 A 创建 8 个节点
T5: 进程 B 创建 8 个节点
结果: 16 个节点（可能更多）
```

### 2. 定时采集器重叠
```
- Collector 1 (定时): 每 5 分钟同步 TEST2
- Collector 2 (手动): 用户手动触发同步
- 如果两者时间重叠 → 重复入库
```

### 3. 异常中断
```
进程 A:
1. 删除旧数据 ✅
2. 创建 4 个节点 ✅
3. 网络异常/进程被杀 ❌
4. 剩余 4 个节点未创建

进程 B (重试):
1. 删除旧数据 ✅（删除了 4 个）
2. 创建 8 个节点 ✅

结果: 8 个节点 ✅ (这种情况下是正确的)

但如果进程 A 没有正确回滚，可能导致数据不一致
```

## 解决方案

### 方案 1: 使用带锁的同步脚本（推荐）

我们创建了一个带 Redis 锁的安全同步脚本：

```bash
# 同步 TEST2（安全模式）
npm run sync:bv-safe TEST2

# 同步其他业务视图
npm run sync:bv-safe <业务视图名称>
```

**优势**:
- ✅ 防止并发同步
- ✅ 自动超时释放锁（60秒）
- ✅ 同步后自动验证数据一致性
- ✅ 详细的日志输出

**工作原理**:
1. 尝试获取 Redis 锁（key: `bv-sync-lock:TEST2`）
2. 如果锁已存在（其他进程正在同步），跳过本次同步
3. 获取锁后执行同步
4. 同步完成后验证数据
5. 释放锁

### 方案 2: API 同步（需要服务器运行）

```bash
# 通过 API 同步（API 内部没有锁机制，不推荐高频使用）
curl -X POST http://localhost:3000/api/topology/sync?bvName=TEST2
```

**注意**: API 路由没有并发控制，建议使用方案 1

### 方案 3: 手动清理 + 同步

如果已经出现重复数据：

```bash
# 1. 诊断问题
npm run diagnose:bv-test2

# 2. 使用安全同步脚本修复
npm run sync:bv-safe TEST2

# 3. 再次诊断验证
npm run diagnose:bv-test2
```

## 预防措施

### 1. 避免频繁手动同步

**不推荐**:
```bash
# 短时间内多次点击同步按钮
点击同步 → 等待 2 秒 → 再次点击 ❌
```

**推荐**:
```bash
# 等待第一次同步完成（通常 5-10 秒）
点击同步 → 等待完成提示 → 如需再次同步，至少等待 1 分钟 ✅
```

### 2. 检查定时采集器配置

查看 [src/services/collector/start.ts](../src/services/collector/start.ts) 中的拓扑采集频率：

```typescript
// 拓扑采集：每 5 分钟
cron.schedule('*/5 * * * *', async () => {
  // 同步所有业务视图
});
```

**建议**:
- 如果不需要实时更新，可以调整为 10 分钟或 15 分钟
- 如果手动同步较多，可以暂时禁用定时同步

### 3. 监控同步状态

定期运行诊断脚本检查数据一致性：

```bash
# 每天检查一次
npm run diagnose:bv-test2
```

### 4. 使用数据库唯一约束（长期方案）

修改 Prisma Schema 添加唯一约束：

```prisma
model TopologyNode {
  id         String  @id
  viewName   String
  // ... 其他字段

  @@unique([viewName, deviceId]) // 防止同一视图中重复设备
  @@index([viewName])
}
```

然后运行：
```bash
npm run db:push
```

**注意**: 这需要先清理现有重复数据

## 应急处理流程

如果发现拓扑对象数量异常：

```bash
# 1. 立即诊断
npm run diagnose:bv-test2

# 2. 如果确认重复，使用安全同步修复
npm run sync:bv-safe TEST2

# 3. 验证修复结果
npm run diagnose:bv-test2

# 4. 刷新 Dashboard 查看
# http://localhost:3000/dashboard
```

## 常见问题

### Q1: 为什么会出现 24 个节点（3 倍）？
**A**: 可能在短时间内触发了 3 次同步，每次创建 8 个节点

### Q2: 删除逻辑不是应该清理旧数据吗？
**A**: 是的，但如果多个进程并发执行，删除和创建之间有时间差，可能导致重复

### Q3: 可以直接在数据库中删除重复节点吗？
**A**: 可以，但推荐使用 `npm run sync:bv-safe` 自动修复，更安全

### Q4: 如何确认同步成功？
**A**:
1. 查看同步日志输出（节点和边的数量）
2. 运行 `npm run diagnose:bv-test2` 验证
3. 在 Dashboard 中查看拓扑图

### Q5: 安全同步脚本的锁会过期吗？
**A**: 会，60 秒后自动释放。如果同步超时，锁会自动失效，下次可以重新获取

## 监控脚本

创建定时任务监控拓扑数据一致性：

```bash
# 添加到 crontab
0 */6 * * * cd /path/to/monitoring-dashboard && npm run diagnose:bv-test2 >> /var/log/topology-check.log 2>&1
```

## 相关文件

- **诊断脚本**: [scripts/diagnose-bv-test2.ts](../scripts/diagnose-bv-test2.ts)
- **安全同步脚本**: [scripts/sync-bv-with-lock.ts](../scripts/sync-bv-with-lock.ts)
- **拓扑采集器**: [src/services/collector/topology.ts](../src/services/collector/topology.ts)
- **问题诊断报告**: [TEST2-TOPOLOGY-DIAGNOSIS.md](../TEST2-TOPOLOGY-DIAGNOSIS.md)

---

**版本**: 1.0.0
**最后更新**: 2026-01-30
**维护者**: Wayne Zhang
