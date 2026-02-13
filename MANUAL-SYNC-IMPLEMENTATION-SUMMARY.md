# 手工同步架构实施总结

## 实施完成的功能

### 1. 设备同步（手工触发）

#### API端点
- **路径**: `/api/devices/sync`
- **方法**: `POST`
- **功能**: 从OpManager LISTDEVICE API获取所有设备并同步到数据库
- **实现**: `src/pages/api/devices/sync.ts`

#### UI功能
- **位置**: `/admin/devices` 页面
- **功能**: 添加了"同步设备"按钮
- **行为**: 
  - 点击按钮触发设备同步
  - 显示同步进度（"同步中..."）
  - 同步完成后自动刷新设备列表
  - 显示成功/失败消息

### 2. 接口同步（基于数据库设备）

#### API端点
- **路径**: `/api/interfaces/sync`
- **方法**: `POST`
- **功能**: 基于数据库中已同步的设备列表，从OpManager获取每个设备的接口
- **实现**: `src/pages/api/interfaces/sync.ts`
- **逻辑**: 
  - 从Device表获取所有 `isMonitored=true` 的设备
  - 遍历每个设备，使用 `device.opmanagerId` 或 `device.name` 作为参数
  - 调用OpManager `getInterfaces` API获取接口
  - 同步接口到Interface表

#### UI功能
- **位置**: `/admin/interfaces` 页面
- **功能**: 更新了"同步接口"按钮说明
- **说明文字**: "接口同步基于数据库中已同步的设备列表"

### 3. 设备删除功能

#### API端点
- **路径**: `/api/devices/[id]`
- **方法**: `DELETE`
- **功能**: 删除设备及其关联数据（级联删除）
- **级联删除**: 
  - 接口 (interfaces)
  - 指标 (metrics)
  - 告警 (alarms)
  - 拓扑节点 (topologyNodes) - SetNull
  - 业务视图关系 (businessViews)

#### UI功能
- **位置**: `/admin/devices` 页面
- **功能**: 每个设备行添加了"删除"按钮
- **确认**: 显示删除确认对话框，说明将删除的所有关联数据

### 4. 接口删除功能

#### API端点
- **路径**: `/api/interfaces/[id]`
- **方法**: `DELETE`
- **功能**: 删除接口及其关联数据（级联删除）
- **级联删除**: 
  - 流量指标 (trafficMetrics)
  - 拓扑边 (topologyEdges) - SetNull

#### UI功能
- **位置**: `/admin/interfaces` 页面
- **功能**: 每个接口行添加了"删除"按钮
- **确认**: 显示删除确认对话框，说明将删除的关联数据

### 5. 业务视图管理优化

#### API端点更新
- **路径**: `/api/topology/views`
- **变更**: 从 `BusinessViewConfig` 表获取视图（而不是 `TopologyNode`）
- **筛选**: 只返回 `isActive=true` 的视图
- **返回格式**: `{ views: [{ name, displayName }] }`

#### ViewSelector组件更新
- **显示**: 使用 `displayName` 显示，使用 `name` 作为值
- **数据源**: 从 `BusinessViewConfig` 表获取

#### 拓扑同步逻辑更新
- **数据源**: 从 `BusinessViewConfig` 表动态获取激活的视图列表
- **实现**: `src/services/collector/start.ts`
- **行为**: 遍历所有激活的业务视图并同步

## 数据流架构

### 设备同步流程
```
用户点击"同步设备"
    ↓
POST /api/devices/sync
    ↓
DeviceCollector.syncDevices()
    ↓
OpManager LISTDEVICE API
    ↓
Device Table (upsert)
```

### 接口同步流程
```
用户点击"同步接口"
    ↓
POST /api/interfaces/sync
    ↓
InterfaceCollector.syncInterfaces()
    ↓
查询 Device 表 (isMonitored=true)
    ↓
遍历每个设备
    ↓
OpManager getInterfaces(deviceName)
    ↓
Interface Table (upsert)
```

### 业务视图同步流程
```
定时任务 / 手动触发
    ↓
查询 BusinessViewConfig (isActive=true)
    ↓
遍历每个视图
    ↓
TopologyCollector.syncBusinessView(viewName)
    ↓
OpManager getBVDetails(viewName)
    ↓
TopologyNode / TopologyEdge (upsert)
```

## 数据一致性保证

1. **设备表是数据源**: 接口同步基于Device表中的设备，确保数据一致性
2. **手工同步**: 所有同步操作由管理员手工触发，可控性强
3. **幂等性**: 使用upsert操作，多次同步不会产生重复数据
4. **级联删除**: 删除设备/接口时自动清理关联数据，保持数据完整性

## 使用说明

### 设备管理
1. **同步设备**: 点击"同步设备"按钮，从OpManager获取最新设备列表
2. **编辑设备**: 可以编辑设备的标签和业务视图关联
3. **删除设备**: 点击"删除"按钮，确认后删除设备及其所有关联数据

### 接口管理
1. **同步接口**: 点击"同步接口"按钮，基于数据库中的设备列表同步接口
2. **编辑接口**: 可以编辑接口的标签
3. **删除接口**: 点击"删除"按钮，确认后删除接口及其流量数据

### 业务视图管理
1. **创建视图**: 在 `/admin/topology` 页面创建业务视图配置
2. **视图同步**: 定时任务会自动同步所有激活的视图
3. **大屏显示**: 大屏的ViewSelector从BusinessViewConfig获取视图列表

## 注意事项

1. **顺序重要性**: 
   - 必须先同步设备
   - 然后才能同步接口（接口基于设备列表）

2. **数据删除**: 
   - 删除设备会级联删除所有关联数据
   - 删除接口会级联删除流量指标
   - 操作不可撤销，请谨慎操作

3. **业务视图**: 
   - 视图名称必须与OpManager中的名称完全匹配
   - 只有激活的视图（isActive=true）会被同步和显示
