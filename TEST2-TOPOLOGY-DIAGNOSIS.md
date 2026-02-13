# TEST2 业务视图拓扑对象数量诊断报告

## 问题描述

**现象**: 在 http://localhost:3000/dashboard 全局总览中选择业务视图 TEST2 时，显示 24 个拓扑对象，但在 OpManager 中只配置了 8 个对象。

## 可能原因

### 1. OpManager getBVDetails API 实际返回了 24 个对象

OpManager 的 `getBVDetails` API 可能会返回以下额外对象：
- 设备的多个网络接口作为独立对象
- 虚拟节点或分组对象
- 隐藏的逻辑连接对象
- 重复的设备对象

### 2. 数据同步问题

- 历史数据未清理（虽然同步时会先删除，但可能有异常情况）
- 手动添加的额外节点
- 多次同步导致的数据重复

## 诊断步骤

### 步骤 1: 运行诊断脚本

```bash
npm run diagnose:bv-test2
```

这个脚本会：
1. 从 OpManager getBVDetails API 获取 TEST2 的实际数据
2. 从数据库查询 TEST2 的拓扑节点
3. 对比两者的差异
4. 列出所有对象的详细信息

### 步骤 2: 检查 OpManager API 原始响应

如果诊断脚本显示 OpManager 确实返回了 24 个对象，可以检查 API 的原始响应：

```bash
# 创建临时脚本查看原始响应
ts-node -r tsconfig-paths/register --project tsconfig.node.json -e "
import { opClient } from './src/services/opmanager/client.js';
opClient.getBVDetails('TEST2').then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
"
```

### 步骤 3: 在 OpManager 中检查业务视图配置

1. 登录 OpManager Web 界面
2. 导航到 **业务视图** → **TEST2**
3. 检查以下情况：
   - 查看视图中实际显示的对象数量
   - 是否有隐藏的对象或分组
   - 是否同一台设备的多个接口被单独显示
   - 是否有虚拟链接或逻辑节点

## 解决方案

### 方案 1: 重新同步拓扑数据（推荐）

如果诊断显示数据不一致，强制重新同步：

```bash
# 方法 1: 使用 API
curl -X POST http://localhost:3000/api/topology/sync?bvName=TEST2

# 方法 2: 在浏览器中点击同步按钮
# 访问 http://localhost:3000/dashboard
# 点击拓扑图右上角的刷新按钮
```

### 方案 2: 清理并重新同步

如果重新同步后仍有问题，手动清理数据库中的 TEST2 数据：

```bash
# 连接到数据库
npm run db:studio

# 在 Prisma Studio 中:
# 1. 打开 TopologyNode 表，删除 viewName = 'TEST2' 的所有记录
# 2. 打开 TopologyEdge 表，删除 viewName = 'TEST2' 的所有记录
# 3. 然后重新同步
```

或使用 SQL 脚本：

```sql
-- 连接到数据库后执行
DELETE FROM "TopologyEdge" WHERE "viewName" = 'TEST2';
DELETE FROM "TopologyNode" WHERE "viewName" = 'TEST2';
```

然后重新同步：
```bash
curl -X POST http://localhost:3000/api/topology/sync?bvName=TEST2
```

### 方案 3: 在 OpManager 中调整业务视图

如果 OpManager 确实返回了 24 个对象：

1. **检查是否需要所有对象**: 某些对象可能是中间节点或虚拟对象，可以在 OpManager 中移除
2. **重新配置 TEST2 视图**: 只包含需要监控的核心设备
3. **创建新的业务视图**: 如果 TEST2 无法修改，创建一个新的视图（如 TEST2_CORE）只包含核心 8 台设备

## 拓扑采集逻辑说明

根据代码分析 ([src/services/collector/topology.ts](src/services/collector/topology.ts:42-104))：

1. **同步时先清理**: 每次同步业务视图时，会先删除该视图的所有旧数据（节点和边）
   ```typescript
   await prisma.topologyEdge.deleteMany({ where: { viewName: bvName } });
   await prisma.topologyNode.deleteMany({ where: { viewName: bvName } });
   ```

2. **一对一映射**: 每个 `deviceProperties` 对象创建一个拓扑节点
   ```typescript
   for (const dev of deviceProperties) {
     await prisma.topologyNode.upsert({ ... });
   }
   ```

3. **节点 ID 格式**: `{bvName}-{objName}`
   - 例如: `TEST2-192.168.1.1`

因此，**数据库中的节点数量应该严格等于 OpManager getBVDetails API 返回的 deviceProperties 数组长度**。

## 验证结果

运行诊断后，应该得到以下明确答案之一：

### 情况 A: OpManager 返回 24 个，数据库也是 24 个 ✅
- **结论**: 数据一致，OpManager 业务视图确实包含 24 个对象
- **建议**: 在 OpManager 中调整 TEST2 视图，移除不需要的对象

### 情况 B: OpManager 返回 8 个，数据库是 24 个 ⚠️
- **结论**: 数据不同步
- **建议**: 运行同步命令清理并重新同步

### 情况 C: OpManager 返回 24 个，数据库是 8 个 ⚠️
- **结论**: 同步未完成或有错误
- **建议**: 检查同步日志，重新同步

## 快速检查清单

- [ ] 运行 `npm run diagnose:bv-test2`
- [ ] 检查诊断输出中的对象列表
- [ ] 对比 OpManager 和数据库的对象数量
- [ ] 在 OpManager 中查看 TEST2 业务视图实际配置
- [ ] 如果数据不一致，运行同步命令
- [ ] 刷新 Dashboard 页面验证

## 相关文件

- **拓扑采集器**: [src/services/collector/topology.ts](src/services/collector/topology.ts)
- **拓扑 API**: [src/app/api/topology/route.ts](src/app/api/topology/route.ts)
- **拓扑同步 API**: [src/app/api/topology/sync/route.ts](src/app/api/topology/sync/route.ts)
- **拓扑查看器**: [src/components/topology/ReactFlowTopologyViewer.tsx](src/components/topology/ReactFlowTopologyViewer.tsx)

## 技术支持

如果问题仍未解决，请提供以下信息：
1. `npm run diagnose:bv-test2` 的完整输出
2. OpManager 中 TEST2 业务视图的截图
3. OpManager getBVDetails API 的原始 JSON 响应
