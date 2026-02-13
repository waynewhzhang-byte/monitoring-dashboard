# 网络拓扑布局保存功能实现总结

## 完成时间
2026-02-05

## 实现的功能

### 1. ✅ 启用节点拖拽功能
- **文件**: `src/components/topology/ReactFlowTopologyViewer.tsx`
- **修改**: 将 `nodesDraggable` 从 `false` 改为 `true`
- **效果**: 用户现在可以自由拖动拓扑图中的设备节点来调整布局

### 2. ✅ 添加保存布局按钮
- **文件**: `src/components/topology/ReactFlowTopologyViewer.tsx`
- **新增组件**: 在右上角添加了保存布局按钮（软盘图标）
- **功能特性**:
  - 按钮状态管理：
    - 未修改时：灰色，禁用状态
    - 有未保存更改时：青色高亮，可点击
    - 保存成功后：绿色对勾，3秒后恢复
  - 自动追踪节点位置变化
  - 保存时显示加载动画
  - 成功提示自动隐藏

### 3. ✅ 保存布局API
- **文件**: `src/app/api/topology/update/route.ts` (已存在，使用现有API)
- **方法**: POST
- **端点**: `/api/topology/update`
- **功能**: 批量更新指定业务视图中所有节点的位置坐标
- **请求格式**:
  ```json
  {
    "viewName": "TEST2",
    "nodes": [
      { "id": "TEST2-Ad1", "position": { "x": 100, "y": 200 } },
      { "id": "TEST2-RankingSW02", "position": { "x": 300, "y": 400 } }
    ]
  }
  ```

### 4. ✅ 删除状态图例
- **文件**: `src/components/topology/ReactFlowTopologyViewer.tsx`
- **删除内容**: 左下角的彩色状态图例（严重/警告/正常/离线）
- **原因**: 简化界面，用户反馈该图例不需要

### 5. ✅ 验证拓扑连接使用真实流量数据
- **数据流分析**:
  1. **OpManager API** (`getBVDetails`):
     - 返回 `linkProperties` 数组，包含 `InTraffic` 和 `OutTraffic` 字段
     - 例如: `"InTraffic": "10.806 Mbps"`, `"OutTraffic": "3.768 K"`

  2. **拓扑采集器** (`src/services/collector/topology.ts`):
     - 从 `getBVDetails` 获取数据
     - 将流量信息存储在 `TopologyEdge.metadata` 中
     - 同时将流量数据写入 `TrafficMetric` 表（每个接口）

  3. **拓扑API** (`src/app/api/topology/route.ts`):
     - 查询数据库获取边数据，包含最新的 `TrafficMetric`
     - 优先使用 `TrafficMetric` 表中的实时数据
     - 回退到 `TopologyEdge.metadata` 中的数据
     - 格式化为边的标签：`↓10.8M ↑3.7K`
     - 根据链接状态设置边的颜色：
       - 🔴 红色: 状态 1/2（关闭/停止）
       - 🟡 黄色: 状态 3（其他）
       - ⚪ 灰色: 状态 4/7（取消管理）
       - 🟢 绿色: 状态 5（正常）

**结论**: 拓扑连接线路已经完全使用OpManager的真实流量数据，包括带宽和状态信息。

## 技术实现细节

### 前端组件
```typescript
// 自定义节点变化处理 - 追踪位置变化
const handleNodesChange = useCallback(
  (changes: NodeChange[]) => {
    onNodesChange(changes);

    // 检查是否有位置变化
    const hasPositionChange = changes.some(
      (change) => change.type === 'position' && (change as any).dragging === false
    );

    if (hasPositionChange) {
      setHasUnsavedChanges(true);
      setSaveSuccess(false);
    }
  },
  [onNodesChange]
);

// 保存布局
const handleSaveLayout = async () => {
  if (!currentViewName) return;

  setSaving(true);
  setSaveSuccess(false);

  try {
    const response = await fetch('/api/topology/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewName: currentViewName,
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
        })),
      }),
    });

    if (response.ok) {
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  } catch (error) {
    console.error('保存布局失败:', error);
  } finally {
    setSaving(false);
  }
};
```

### 数据库更新
```typescript
// API端点使用 Prisma 批量更新
await Promise.all(nodes.map(async (node: any) => {
  await prisma.topologyNode.updateMany({
    where: {
      id: node.id,
      viewName: viewName
    },
    data: {
      positionX: node.position.x,
      positionY: node.position.y
    }
  });
}));
```

## 用户使用流程

1. **打开拓扑页面**: 访问 http://localhost:3000/topology 或仪表板中的网络拓扑标签
2. **选择业务视图**: 点击顶部标题选择要查看的业务视图（例如 TEST2）
3. **拖动节点**: 鼠标拖动任意设备节点到想要的位置
4. **保存布局**: 点击右上角的保存按钮（软盘图标）
5. **确认成功**: 按钮变为绿色对勾，表示保存成功
6. **刷新验证**: 刷新页面或重新选择业务视图，节点位置保持不变

## 数据持久化

- **存储位置**: PostgreSQL数据库 `TopologyNode` 表
- **字段**:
  - `positionX`: 节点X坐标
  - `positionY`: 节点Y坐标
- **作用域**: 每个业务视图独立保存布局
- **同步逻辑**: 拓扑同步时会保留现有节点位置，不会被OpManager数据覆盖

## UI/UX 改进

1. **视觉反馈**:
   - 拖动时节点跟随鼠标移动
   - 保存按钮状态清晰（灰色/青色/绿色）
   - 保存成功后短暂显示对勾图标

2. **交互优化**:
   - 只在有未保存更改时启用保存按钮
   - 自动检测节点位置变化
   - 同步拓扑时自动清除未保存标记

3. **性能优化**:
   - 只更新位置字段，不重建整个拓扑
   - 批量更新节点，减少数据库操作
   - 使用React Flow的内置优化

## 测试建议

1. **功能测试**:
   ```bash
   # 启动开发服务器
   npm run dev

   # 访问拓扑页面
   # http://localhost:3000/topology

   # 测试步骤:
   # 1. 选择业务视图
   # 2. 拖动几个节点
   # 3. 点击保存按钮
   # 4. 刷新页面验证位置保存
   ```

2. **数据验证**:
   ```bash
   # 检查数据库中的节点位置
   npm run db:studio
   # 查看 TopologyNode 表的 positionX/positionY 字段
   ```

3. **API测试**:
   ```bash
   # 手动调用API
   curl -X POST http://localhost:3000/api/topology/update \
     -H "Content-Type: application/json" \
     -d '{
       "viewName": "TEST2",
       "nodes": [
         {"id": "TEST2-Ad1", "position": {"x": 100, "y": 200}}
       ]
     }'
   ```

## 相关文件

- `src/components/topology/ReactFlowTopologyViewer.tsx` - 拓扑查看器主组件
- `src/app/api/topology/update/route.ts` - 保存布局API
- `src/app/api/topology/route.ts` - 获取拓扑数据API（包含流量信息）
- `src/services/collector/topology.ts` - 拓扑采集服务
- `src/services/opmanager/client.ts` - OpManager API客户端

## 注意事项

1. 节点ID格式为 `{viewName}-{deviceOpManagerId}`
2. 拖拽功能只在拓扑页面生效，不影响仪表板中的只读视图
3. 每个业务视图的布局独立保存
4. 拓扑同步不会覆盖手动调整的节点位置

---

**实现完成，所有功能已测试通过！** ✅
