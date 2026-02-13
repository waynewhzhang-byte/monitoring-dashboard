# 业务视图架构分析

## 当前架构分析

### 1. 业务视图名称管理

#### 当前实现

- **管理界面**: `/admin/topology` 页面可以创建/删除业务视图配置
- **数据存储**: `BusinessViewConfig` 表存储视图配置（name, displayName, isActive等）
- **API端点**: `/api/admin/views` (Pages Router) 提供CRUD操作
- **问题**: 大屏的 `ViewSelector` 组件从 `/api/topology/views` 获取视图列表，该API从 `TopologyNode` 表获取，而不是从 `BusinessViewConfig` 表

#### 应该的实现

- 大屏应该从 `BusinessViewConfig` 表获取视图配置
- 使用 `BusinessViewConfig.name` 作为API参数获取拓扑数据
- 在UI中显示 `BusinessViewConfig.displayName`（如果存在）或 `name`

### 2. 设备同步与关联

#### 当前实现

- **数据来源**: 从 `LISTDEVICE` API (OpManager) 获取设备列表
- **同步逻辑**: `DeviceCollector.syncDevices()`
- **存储字段**:
  - `opmanagerId`: OpManager设备名称（唯一标识）
  - `name`: 设备名称（通常等于opmanagerId）
  - `ipAddress`: IP地址
  - `displayName`: 显示名称
- **关联方式**:
  - 告警通过 `device.name` 关联
  - 指标通过 `device.name` 关联（调用 `getDeviceSummary(device.name)`）

#### 应该的实现（Redis数据关联）

- Redis中的动态数据应该通过以下方式关联到Device：
  1. **通过IP地址**: `device.ipAddress` 匹配
  2. **通过设备名称**: `device.opmanagerId` 或 `device.name` 匹配
- 需要在数据关联逻辑中实现匹配机制

### 3. 接口同步与关联

#### 当前实现

- **数据来源**: 从 `getInterfaces` API (OpManager) 获取接口列表
- **同步逻辑**: `InterfaceCollector.syncInterfaces()`
- **存储字段**:
  - `opmanagerId`: `${device.opmanagerId}_${interfaceId}` (唯一标识)
  - `deviceId`: 关联到Device表
  - `name`: 接口名称
  - `ipAddress`: 接口IP（如果有）
  - `ifIndex`: SNMP接口索引
- **关联方式**:
  - 通过 `interface.deviceId` 关联到Device
  - 流量指标通过 `TrafficMetric.interfaceId` 关联到Interface

#### 应该的实现

- 接口已经正确同步并存储在Interface表中
- 后续动态数据（如实时流量）应该通过以下方式关联：
  1. **通过接口ID**: `interface.id` 或 `interface.opmanagerId`
  2. **通过设备+接口名称**: `${device.name}_${interface.name}`
  3. **通过接口IP**: `interface.ipAddress`（如果接口有独立IP）

## 需要改进的地方

### 1. 更新 `/api/topology/views` API

**当前**:

```typescript
// src/app/api/topology/views/route.ts
const views = await prisma.topologyNode.findMany({
  distinct: ["viewName"],
  select: { viewName: true },
});
```

**应该改为**:

```typescript
// 从BusinessViewConfig表获取，只返回isActive=true的视图
const views = await prisma.businessViewConfig.findMany({
  where: { isActive: true },
  select: { name: true, displayName: true },
  orderBy: { createdAt: "asc" },
});
```

### 2. 更新 ViewSelector 组件

**当前**: 使用 `viewName` 字符串数组
**应该**: 使用包含 `name` 和 `displayName` 的对象数组，在UI中显示 `displayName || name`

### 3. 更新拓扑数据获取逻辑

**当前**: 硬编码视图名称（如'出口业务', 'TEST'）调用 `syncBusinessView()`
**应该**: 从 `BusinessViewConfig` 表获取所有激活的视图，动态调用 `syncBusinessView(bvConfig.name)`

### 4. 设备数据关联（Redis）

需要在Redis数据关联逻辑中实现：

- 通过 `device.ipAddress` 匹配
- 通过 `device.opmanagerId` 或 `device.name` 匹配
- 需要创建关联工具函数

### 5. 接口数据关联

接口关联已经实现，但需要确保：

- 实时流量数据正确关联到 `interface.id`
- 通过 `TrafficMetric` 表关联接口流量指标

## 数据流图

```
┌─────────────────┐
│  Admin Page     │
│  /admin/topology│
└────────┬────────┘
         │ Create/Update
         ▼
┌─────────────────────────┐
│ BusinessViewConfig      │
│ - name (OpManager名称)  │
│ - displayName (显示名)  │
│ - isActive              │
└────────┬────────────────┘
         │
         │ Query (isActive=true)
         ▼
┌─────────────────────────┐
│ /api/topology/views     │
│ 返回视图列表             │
└────────┬────────────────┘
         │
         │ 用户选择视图
         ▼
┌─────────────────────────┐
│ ViewSelector            │
│ 显示 displayName        │
└────────┬────────────────┘
         │
         │ viewName = bvConfig.name
         ▼
┌─────────────────────────┐
│ TopologyCollector       │
│ syncBusinessView(name)  │
└────────┬────────────────┘
         │
         │ 调用OpManager API
         │ getBVDetails(bvName)
         ▼
┌─────────────────────────┐
│ TopologyNode            │
│ viewName = bvName       │
└─────────────────────────┘
```

## 设备关联流程图

```
┌─────────────────────┐
│ LISTDEVICE API      │
│ (OpManager)         │
└──────────┬──────────┘
           │
           │ syncDevices()
           ▼
┌─────────────────────┐
│ Device Table        │
│ - opmanagerId       │
│ - name              │
│ - ipAddress         │
└──────────┬──────────┘
           │
           │ 后续数据关联
           ├─────────────────┐
           │                 │
           ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │ Redis    │      │ Metrics  │
    │ Data     │      │ API      │
    └────┬─────┘      └────┬─────┘
         │                 │
         │ Match by:       │ Match by:
         │ - IP            │ - name
         │ - opmanagerId   │ - opmanagerId
         │ - name          │
         ▼                 ▼
    ┌──────────────────────────┐
    │ Device (关联成功)        │
    └──────────────────────────┘
```

## 接口关联流程图

```
┌─────────────────────┐
│ getInterfaces API   │
│ (OpManager)         │
└──────────┬──────────┘
           │
           │ syncInterfaces()
           ▼
┌─────────────────────┐
│ Interface Table     │
│ - opmanagerId       │
│ - deviceId          │
│ - name              │
│ - ipAddress         │
└──────────┬──────────┘
           │
           │ 后续数据关联
           ├─────────────────┐
           │                 │
           ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │ Traffic  │      │ Real-time│
    │ Metrics  │      │ Data     │
    └────┬─────┘      └────┬─────┘
         │                 │
         │ Match by:       │ Match by:
         │ - interfaceId   │ - interface.id
         │                 │ - opmanagerId
         │                 │ - device+name
         ▼                 ▼
    ┌──────────────────────────┐
    │ Interface (关联成功)     │
    └──────────────────────────┘
```
