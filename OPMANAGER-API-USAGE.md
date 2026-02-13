# OpManager API 使用说明

## 接口同步使用的API

### API端点
- **路径**: `/api/json/device/listInterfaces`
- **方法**: `GET`
- **实现位置**: `src/services/opmanager/client.ts` (第152行)

### 请求参数
```typescript
{
    deviceName: string,  // 设备名称（从数据库Device表获取的opmanagerId或name）
    page?: number,       // 页码（默认: 1）
    rows?: number        // 每页行数（默认: 100）
}
```

### 调用流程
```
/admin/interfaces 页面
    ↓ 用户点击"同步接口"按钮
POST /api/interfaces/sync
    ↓
InterfaceCollector.syncInterfaces()
    ↓
从数据库Device表查询所有 isMonitored=true 的设备
    ↓
遍历每个设备:
    deviceName = device.opmanagerId || device.name
    ↓
opClient.getInterfaces({ deviceName })
    ↓
GET /api/json/device/listInterfaces?deviceName={deviceName}&page=1&rows=100
    ↓
OpManager API 返回接口列表
    ↓
同步到 Interface 表
```

### 响应格式
```json
{
    "rows": [
        {
            "id": 1,
            "interfaceName": "GigabitEthernet0/0",
            "interfaceDisplayName": "GigabitEthernet0/0",
            "statusStr": "UP",
            "statusNum": 1,
            "inTraffic": "100.5 Mbps",
            "outTraffic": "50.2 Mbps",
            "inSpeed": "1000000000",
            "outSpeed": "1000000000",
            "ipAddress": "192.168.1.1",
            "macAddress": "00:11:22:33:44:55",
            "mtu": 1500,
            "ifType": "ETHERNET",
            "deviceName": "router-01"
        }
    ],
    "total": 10
}
```

### 关键点

1. **基于数据库设备**: 接口同步不是直接从OpManager获取设备列表，而是基于数据库中已同步的设备（`isMonitored=true`）

2. **设备名称参数**: 使用 `device.opmanagerId` 或 `device.name` 作为 `deviceName` 参数

3. **分页支持**: API支持分页，默认每页100条记录

4. **数据映射**: 返回的数据会被映射为统一的格式，包括：
   - `name`: 接口名称
   - `displayName`: 显示名称
   - `status`: 状态（UP/DOWN等）
   - `inTraffic` / `outTraffic`: 流量数据
   - `ifIndex`: 接口索引
   - `ipAddress`: IP地址
   - `macAddress`: MAC地址
   - 等等

## 设备同步使用的API

### API端点
- **路径**: `/api/json/device/listDevices` (或类似的LISTDEVICE端点)
- **方法**: `GET`
- **实现位置**: `src/services/opmanager/client.ts` (getDevices方法)

### 调用流程
```
/admin/devices 页面
    ↓ 用户点击"同步设备"按钮
POST /api/devices/sync
    ↓
DeviceCollector.syncDevices()
    ↓
opClient.getDevices()
    ↓
GET /api/json/device/listDevices (或类似端点)
    ↓
OpManager API 返回设备列表
    ↓
同步到 Device 表
```

## 注意事项

1. **API仅用于同步**: LISTDEVICE和listInterfaces API仅在手工同步时使用，后续的性能动态数据不需要这些接口

2. **数据一致性**: 接口同步必须基于数据库中已同步的设备，确保数据一致性

3. **错误处理**: 如果某个设备的接口获取失败，会记录错误但继续处理其他设备

4. **幂等性**: 使用upsert操作，可以多次同步而不会产生重复数据
