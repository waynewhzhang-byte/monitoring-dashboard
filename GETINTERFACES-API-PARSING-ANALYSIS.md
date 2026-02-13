# getInterfaces API 解析逻辑分析

## API 文档参考

官方文档：https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getInterfaces

## API 请求格式

```
GET /api/json/device/getInterfaces?name={ipAddress}.10000000001
```

**参数说明**：
- `name`: 设备的 IP 地址 + `.10000000001` 后缀
  - 示例：`1.1.1.45.10000000001`
  - 这是设备的 Managed Entity name，可以从 `listDevices` API 的 `deviceName` 字段获取

## API 响应格式

### 顶层结构

```json
{
  "isSNMP": true,
  "downCount": "11",
  "interfaceCount": "33",
  "showPollingStatusColumn": true,
  "interfaces": [...]
}
```

### 接口对象字段详解

基于实际 API 响应和官方文档，接口对象包含以下字段：

#### 1. 基本信息

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `name` | String | 接口唯一名称 | `"IF-1.1.1.45.10000000001-10000006529"` |
| `displayName` | String | 接口显示名称（完整） | `"GigabitEthernet1/0/1-GigabitEthernet1/0/1 Interface"` |
| `trimmedDispName` | String | 截断的显示名称 | `"GigabitEthernet1/0/1-Gig..."` |
| `moid` | String | 管理对象 ID（唯一标识符） | `"10000006529"` |

#### 2. 状态信息

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `statusNum` | String | 状态编号 | `"5"` (正常), `"1"` (严重), `"2"` (问题) |
| `status` | String | 状态（同 statusNum） | `"5"` |
| `statusStr` | String | 状态字符串（中文） | `"正常"`, `"严重"`, `"问题"` |
| `statusString` | String | 状态字符串（英文） | `"Clear"`, `"Critical"`, `"Trouble"` |
| `ifAdminStatus` | String | 管理状态 | `"1"` (Up/运行), `"2"` (Down/停止) |
| `ifOperStatus` | String | 运行状态 | `"1"` (Up/运行), `"2"` (Down/停止) |

#### 3. 流量数据

| 字段名 | 类型 | 说明 | 示例值 | 特殊值 |
|--------|------|------|--------|--------|
| `inTraffic` | String | 入站流量 | `"3.768 K"`, `"0 "` | `"NA"` (不可用) |
| `outTraffic` | String | 出站流量 | `"1.144 M"`, `"966.624 K"` | `"NA"` (不可用) |
| `inSpeed` | String | 入站速度 | `"10 M"`, `"10 G"` | `"0 "` (无数据) |
| `outSpeed` | String | 出站速度 | `"10 M"`, `"100 M"`, `"10 G"` | `"0 "` (无数据) |
| `inUtil` | String | 入站利用率（百分比） | `"0.04"`, `"0.0"` | `"NA"` (不可用) |
| `outUtil` | String | 出站利用率（百分比） | `"11.44"`, `"0.97"` | `"NA"` (不可用) |

**注意**：
- 流量数据字段可能包含 `"NA"` 值，表示该接口的数据不可用（通常是因为接口处于 Down 状态）
- 需要在使用时检查并处理 `"NA"` 值

#### 4. 接口索引

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `ifIndex` | String | 接口索引（SNMP，字符串格式） | `"1"`, `"632"` |
| `ifIndexNum` | Number | 接口索引（数字格式） | `1`, `632` |

#### 5. 网络信息

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `ipAddress` | String | IP 地址 | `""`, `"10.141.0.29"` |
| `macAddress` | String | MAC 地址 | `""` |
| `mtu` | String/Number | 最大传输单元 | `"1500"` |

#### 6. 接口类型

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `ifType` | String | 接口类型 | `"Ethernet"`, `"L3ipvlan"`, `"Software Loopback"` |
| `type` | String | 接口类型（通用） | `"Interface"` |

#### 7. 错误信息

| 字段名 | 类型 | 说明 | 示例值 | 特殊值 |
|--------|------|------|--------|--------|
| `errors` | String | 错误数 | `"0"`, `"13011"` | `"NA"` (不可用) |

#### 8. 其他字段

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `isSuppressed` | Boolean | 是否被抑制 | `false` |
| `isSubInterface` | String | 是否为子接口 | `"false"`, `"true"` |
| `nfEnabled` | String | NetFlow 是否启用 | `"false"` |
| `pollingStatus` | String | 轮询状态 | `"0"` |
| `imagePath` | String | 图标路径 | `"/apiclient/ember/images/intfTypes/ifType6.gif"` |
| `bgColor` | String | 背景颜色（十六进制） | `"00ff00"` (绿色), `"ff8000"` (橙色), `"ff0000"` (红色) |
| `RouterPortType` | String | 路由器端口类型 | `""`, `"Eth"` |
| `connected-device` | String | 连接的设备 | `""` |
| `suppressedMessage` | String | 抑制消息 | `""` |

## 解析逻辑优化

### 1. 字段映射策略

```typescript
{
  // 基础字段：直接映射
  name: iface.name || '',
  displayName: iface.displayName || iface.trimmedDispName || iface.name || '',
  
  // 状态字段：优先使用中文，回退到英文
  status: iface.statusStr || iface.statusString || '',
  statusStr: iface.statusStr || iface.statusString || '',
  statusNum: iface.statusNum || iface.status || '',
  
  // 索引字段：支持字符串和数字格式
  ifIndex: iface.ifIndex || (iface.ifIndexNum !== undefined ? iface.ifIndexNum.toString() : ''),
  ifIndexNum: iface.ifIndexNum !== undefined ? iface.ifIndexNum : (iface.ifIndex ? parseInt(iface.ifIndex, 10) : undefined),
  
  // ID 字段：优先使用 moid，回退到 ifIndex
  id: iface.moid || iface.ifIndex || (iface.ifIndexNum !== undefined ? iface.ifIndexNum.toString() : ''),
  interfaceId: iface.moid || iface.ifIndex || (iface.ifIndexNum !== undefined ? iface.ifIndexNum.toString() : ''),
  
  // 流量字段：可能包含 "NA"，需要后续处理
  inTraffic: iface.inTraffic || '0',
  outTraffic: iface.outTraffic || '0',
  inUtil: iface.inUtil || '0',
  outUtil: iface.outUtil || '0',
}
```

### 2. 特殊值处理

#### "NA" 值处理

当接口处于 Down 状态或数据不可用时，以下字段可能返回 `"NA"`：
- `inTraffic`
- `outTraffic`
- `inUtil`
- `outUtil`
- `errors`

**处理策略**：
- 在解析阶段，保留原始值（包括 "NA"）
- 在使用数据时（如计算、显示），检查是否为 "NA"，如果是则转换为 `0` 或 `null`

#### 布尔值处理

某些字段可能返回字符串 `"true"` / `"false"`，而不是布尔值：
- `isSubInterface`: `"false"` / `"true"`
- `nfEnabled`: `"false"` / `"true"`

**处理策略**：
```typescript
isSubInterface: iface.isSubInterface === 'true' || iface.isSubInterface === true,
nfEnabled: iface.nfEnabled === 'true' || iface.nfEnabled === true,
```

### 3. 类型转换

#### 数字类型转换

```typescript
// ifIndexNum: 保持数字类型，如果只有字符串格式则转换
ifIndexNum: iface.ifIndexNum !== undefined 
  ? iface.ifIndexNum 
  : (iface.ifIndex ? parseInt(iface.ifIndex, 10) : undefined),

// mtu: 转换为数字
mtu: iface.mtu ? parseInt(iface.mtu, 10) : undefined,
```

### 4. 默认值处理

所有字段都提供默认值，避免 `undefined` 或 `null` 导致的错误：

```typescript
// 字符串字段：默认空字符串
name: iface.name || '',
displayName: iface.displayName || iface.trimmedDispName || iface.name || '',

// 数字字段：默认 undefined（而不是 0，避免误判）
ifIndexNum: iface.ifIndexNum !== undefined ? iface.ifIndexNum : undefined,
mtu: iface.mtu ? parseInt(iface.mtu, 10) : undefined,

// 布尔字段：默认 false
isSuppressed: iface.isSuppressed || false,
```

## 使用建议

### 1. 流量数据处理

在处理流量数据时，需要检查 "NA" 值：

```typescript
function parseTrafficValue(trafficStr: string): number {
  if (!trafficStr || trafficStr.trim() === '' || trafficStr.trim().toUpperCase() === 'NA') {
    return 0;
  }
  // 解析流量字符串（如 "3.768 K", "1.144 M"）
  // ...
}
```

### 2. 状态判断

使用 `statusNum` 进行状态判断（更可靠）：

```typescript
const isUp = interface.statusNum === '5';  // 5 = Clear/正常
const isDown = ['1', '2', '3', '4'].includes(interface.statusNum);  // 1=严重, 2=问题, 3=注意, 4=服务中断
```

### 3. 接口过滤

根据实际需求过滤接口：

```typescript
// 只获取运行中的接口
const runningInterfaces = interfaces.filter(
  iface => iface.ifOperStatus === '1' && iface.ifAdminStatus === '1'
);

// 只获取正常状态的接口
const normalInterfaces = interfaces.filter(
  iface => iface.statusNum === '5'
);

// 排除子接口
const mainInterfaces = interfaces.filter(
  iface => !iface.isSubInterface
);
```

## 完整字段映射表

| API 字段 | 映射到 | 说明 |
|----------|--------|------|
| `name` | `name` | 接口唯一名称 |
| `displayName` / `trimmedDispName` | `displayName` | 显示名称（优先完整名称） |
| `statusStr` / `statusString` | `status` / `statusStr` | 状态字符串（优先中文） |
| `statusNum` / `status` | `statusNum` | 状态编号 |
| `ifAdminStatus` | `ifAdminStatus` | 管理状态 |
| `ifOperStatus` | `ifOperStatus` | 运行状态 |
| `inTraffic` | `inTraffic` | 入站流量（可能为 "NA"） |
| `outTraffic` | `outTraffic` | 出站流量（可能为 "NA"） |
| `inSpeed` | `inSpeed` | 入站速度 |
| `outSpeed` | `outSpeed` | 出站速度 |
| `inUtil` | `inUtil` | 入站利用率（可能为 "NA"） |
| `outUtil` | `outUtil` | 出站利用率（可能为 "NA"） |
| `ifIndex` / `ifIndexNum` | `ifIndex` / `ifIndexNum` | 接口索引 |
| `moid` | `id` / `interfaceId` / `moid` | 管理对象 ID（优先使用） |
| `ipAddress` | `ipAddress` | IP 地址 |
| `macAddress` | `macAddress` | MAC 地址 |
| `mtu` | `mtu` | 最大传输单元（转换为数字） |
| `ifType` / `type` | `ifType` / `type` | 接口类型 |
| `errors` | `errors` | 错误数（可能为 "NA"） |
| `isSuppressed` | `isSuppressed` | 是否被抑制 |
| `isSubInterface` | `isSubInterface` | 是否为子接口（转换为布尔值） |
| `nfEnabled` | `nfEnabled` | NetFlow 是否启用（转换为布尔值） |
