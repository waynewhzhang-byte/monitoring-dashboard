# Sigma.js 数据映射关系分析

## 数据流完整链路

### 1. 数据采集层 → 数据库

**文件**: `src/services/collector/topology.ts`

```typescript
TopologyCollector.syncBusinessView(bvName)
  ↓
opClient.getBVDetails(bvName) // 从 OpManager API 获取业务视图拓扑
  ↓
TopologyNode (数据库表)
  - id: `${bvName}-${opId}`
  - viewName: bvName
  - deviceId: device?.id (关联 Device 表)
  - label, type, positionX, positionY, icon
  - metadata: { ...dev, performance: perf }

TopologyEdge (数据库表)
  - id: `${bvName}-${link.source}-${link.dest}-${link.name}`
  - viewName: bvName
  - sourceId, targetId
  - interfaceId (关联 Interface 表)
  - metadata: link (包含 InTraffic, OutTraffic 等信息)
```

### 2. 数据库 → API 层

**文件**: `src/app/api/topology/route.ts`

```typescript
GET /api/topology?bvName=xxx
  ↓
Prisma 查询 (关联 Device, DeviceMetric, Interface, TrafficMetric)
  ↓
ReactFlow 格式返回:
  nodes: [
    {
      id: node.id,
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        type: node.type,
        icon: node.icon,
        status: node.device?.status,        // ← 从 Device 表关联
        ip: node.device?.ipAddress,         // ← 从 Device 表关联
        cpu: latestMetric?.cpuUsage,        // ← 从 DeviceMetric 表关联
        memory: latestMetric?.memoryUsage,  // ← 从 DeviceMetric 表关联
        metadata: node.metadata             // ← 原始 metadata 保留
      }
    }
  ],
  edges: [
    {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: metadata?.InTraffic,           // ← 从 edge.metadata 提取
      data: {
        inTraffic: metadata?.InTraffic,     // ← 从 edge.metadata 提取
        outTraffic: metadata?.OutTraffic,   // ← 从 edge.metadata 提取
        utilization: latestMetric?.inUtilization, // ← 从 TrafficMetric 关联
        smoothType: metadata?.smoothType
      },
      style: {
        stroke: metadata?.status === '2' ? '#ff0000' : '#00ff00'
      }
    }
  ]
```

### 3. API 层 → 适配器层

**文件**: `src/lib/topology/sigma-adapter.ts`

```typescript
convertReactFlowToGraphology(data)
  ↓
Graphology Graph:
  
  节点属性映射:
  - node.id → graph node key
  - node.position.x/y → x, y
  - node.data.label → label
  - node.data.type → nodeType
  - node.data.status → status (用于颜色计算)
  - node.data.ip → ip
  - node.data.cpu → cpu
  - node.data.memory → memory
  - node.data.metadata → metadata (完整保留)
  
  边属性映射:
  - edge.source/target → graph edge (source, target)
  - edge.data.inTraffic → label, inTraffic
  - edge.data.outTraffic → outTraffic
  - edge.data.utilization → utilization
  - edge.data.metadata → metadata (完整保留)
  - edge.style.stroke → color (#ef4444 或 #3b82f6)
```

### 4. 适配器层 → Sigma.js 渲染

**文件**: `src/components/topology/SigmaTopologyViewer.tsx`

```typescript
Sigma.js 读取 Graphology Graph 属性:
  - x, y → 节点位置
  - size → 节点大小 (根据 nodeType 计算)
  - color → 节点颜色 (根据 status 计算)
  - label → 节点标签文本
  - status, ip, cpu, memory, metadata → 存储用于详情面板显示
  
  边属性:
  - color → 边颜色
  - size → 边宽度
  - label → 边标签 (流量信息)
```

## 字段映射完整性检查

### ✅ 节点字段映射 (完整)

| 数据库字段 | API 字段 | 适配器字段 | Sigma 使用 | 状态 |
|-----------|---------|-----------|-----------|------|
| label | data.label | label | 显示标签 | ✅ |
| type | data.type | nodeType | 计算大小 | ✅ |
| device.status | data.status | status | 计算颜色 | ✅ |
| device.ipAddress | data.ip | ip | 详情面板 | ✅ |
| DeviceMetric.cpuUsage | data.cpu | cpu | 详情面板 | ✅ |
| DeviceMetric.memoryUsage | data.memory | memory | 详情面板 | ✅ |
| positionX/Y | position.x/y | x, y | 节点位置 | ✅ |
| metadata | data.metadata | metadata | 完整保留 | ✅ |

### ✅ 边字段映射 (完整)

| 数据库字段 | API 字段 | 适配器字段 | Sigma 使用 | 状态 |
|-----------|---------|-----------|-----------|------|
| metadata.InTraffic | data.inTraffic | inTraffic, label | 显示标签 | ✅ |
| metadata.OutTraffic | data.outTraffic | outTraffic | 保留 | ✅ |
| TrafficMetric.inUtilization | data.utilization | utilization | 保留 | ✅ |
| metadata.status | style.stroke | color | 边颜色 | ✅ |
| sourceId/targetId | source/target | source, target | 连接关系 | ✅ |

## 关联关系确认

### 节点关联
- ✅ `TopologyNode.deviceId` → `Device.id` (已关联)
- ✅ `Device` → `DeviceMetric` (最新一条记录，已关联)
- ✅ 数据通过 Prisma `include` 正确加载

### 边关联
- ✅ `TopologyEdge.interfaceId` → `Interface.id` (已关联)
- ✅ `Interface` → `TrafficMetric` (最新一条记录，已关联)
- ✅ 数据通过 Prisma `include` 正确加载

### 业务视图过滤
- ✅ `TopologyNode.viewName` = bvName (已过滤)
- ✅ `TopologyEdge.viewName` = bvName (已过滤)

## 结论

**✅ Sigma 控件与业务拓扑数据已完整关联映射**

数据流从数据采集 → 数据库 → API → 适配器 → Sigma.js 渲染的完整链路已经建立，所有关键字段都正确映射：

1. **节点数据**：设备信息、状态、指标、位置都正确传递
2. **边数据**：连接关系、流量信息、状态都正确传递
3. **关联关系**：Device、DeviceMetric、Interface、TrafficMetric 都通过 Prisma 正确关联
4. **业务视图**：通过 viewName 正确过滤

唯一需要注意的是：边标签中的流量数据来自 `edge.metadata.InTraffic`，这是从 OpManager API 的 linkProperties 中获取的原始数据，如果该字段不存在或格式不同，可能需要调整适配器中的字段提取逻辑。
