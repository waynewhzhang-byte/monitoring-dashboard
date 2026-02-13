# 拓扑流量标签显示修复

## 问题描述
拓扑页面虽然已经从OpManager获取了真实流量数据，但边的流量标签没有在页面上显示出来。

## 根本原因
在 `ReactFlowTopologyViewer.tsx` 的边格式转换代码中，虽然API返回的边数据包含了 `label` 字段（流量标签），但在前端转换时没有将其包含在ReactFlow的Edge对象中。

### 修复前的代码
```typescript
const formattedEdges: Edge[] = data.edges.map((edge: any) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: 'straight',
  animated: false,
  style: {
    stroke: '#475569',  // 固定灰色，没有使用API返回的颜色
    strokeWidth: 1.5,
  },
  data: edge.data,
  // ❌ 缺少 label 字段
}));
```

### 修复后的代码
```typescript
const formattedEdges: Edge[] = data.edges.map((edge: any) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: 'straight',
  label: edge.label, // ✅ 显示流量标签 (↓10.8M ↑3.7K)
  animated: edge.animated || false,
  style: edge.style || {  // ✅ 使用API返回的状态颜色
    stroke: '#475569',
    strokeWidth: 1.5,
  },
  labelStyle: {  // ✅ 标签文字样式
    fill: '#94a3b8',
    fontSize: 11,
    fontWeight: 500,
  },
  labelBgStyle: {  // ✅ 标签背景样式
    fill: '#0a0e1a',
    fillOpacity: 0.8,
  },
  data: edge.data,
}));
```

## 数据流验证

使用 `scripts/check-topology-edge-labels.ts` 验证了API返回的数据：

```
✅ 所有边都有流量标签！

示例边数据:
- Label: ↓117.298 ↑40.055K
- Style: {"stroke":"#22c55e","strokeWidth":2}  (绿色=正常)
- Status: 5 (正常状态)
```

## 流量标签格式

- **格式**: `↓{下载流量} ↑{上传流量}`
- **单位**: 自动换算（bps → K → M → G）
- **示例**:
  - `↓117.298 ↑40.055K` - 有流量
  - `↓0 ↑0` - 无流量
  - `↓10.8M ↑3.7K` - 高流量

## 边的颜色状态

边的颜色由OpManager的链接状态决定：

| 状态码 | 含义 | 颜色 | Hex |
|--------|------|------|-----|
| 1, 2 | 关闭/停止 | 🔴 红色 | #ef4444 |
| 3 | 注意 | 🟡 黄色 | #eab308 |
| 4, 7 | 取消管理 | ⚪ 灰色 | #6b7280 |
| 5 | 正常 | 🟢 绿色 | #22c55e |

## 完整数据流

```
1. OpManager getBVDetails API
   ↓ linkProperties: [{ InTraffic, OutTraffic, status }]

2. TopologyCollector (topology.ts)
   ↓ 存储到 TopologyEdge.metadata + TrafficMetric表

3. GET /api/topology (route.ts)
   ↓ 格式化边数据:
     - label: "↓117.298 ↑40.055K"
     - style: { stroke: "#22c55e", strokeWidth: 2 }
     - animated: utilization > 70%

4. ReactFlowTopologyViewer (已修复)
   ↓ 显示边标签和颜色

5. 页面渲染 ✅
   显示流量标签和状态颜色
```

## 视觉效果

修复后，拓扑页面会显示：

1. **边的标签**: 流量信息浮动在连接线上方
2. **标签样式**:
   - 文字颜色: 浅灰色 (#94a3b8)
   - 字体大小: 11px
   - 字体粗细: 500 (中等)
   - 背景: 半透明深色 (防止与背景重叠难以阅读)

3. **边的颜色**: 根据链接状态显示不同颜色
4. **动画效果**: 高利用率(>70%)的边会有动画流动效果

## 测试验证

```bash
# 1. 检查API返回的边数据
npx tsx scripts/check-topology-edge-labels.ts TEST2

# 2. 启动开发服务器
npm run dev

# 3. 访问拓扑页面
# http://localhost:3000/topology

# 4. 选择业务视图 TEST2
# 5. 观察边的流量标签显示
```

## 相关文件

- `src/components/topology/ReactFlowTopologyViewer.tsx` - 拓扑查看器（已修复）
- `src/app/api/topology/route.ts` - 拓扑数据API（提供流量标签）
- `scripts/check-topology-edge-labels.ts` - 边标签验证脚本

## 修复时间
2026-02-05

---

**流量标签现在正确显示在拓扑图的连接线上！** ✅
