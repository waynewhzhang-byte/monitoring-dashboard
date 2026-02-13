# getBVDetails 返回数据结构

**API**：`GET /api/json/businessview/getBVDetails?bvName={业务视图名称}`  

**本系统调用**：`opClient.getBVDetails(bvName)`，返回 `response.data`（即下文的根对象）。

---

## 1. 顶层结构

`getBVDetails` 返回一个对象，本系统主要使用以下字段：

```ts
{
  deviceProperties: DeviceSymbol[];   // 设备节点（拓扑上的“点”）
  linkProperties: LinkRaw[];          // 链路/连线（拓扑上的“边”）
  mapProperties?: {                   // 可选：视图元信息
    name: string;
    label: string;
    [key: string]: any;
  };
}
```

拓扑同步逻辑见：`src/services/collector/topology.ts`，用到的就是 `deviceProperties` 和 `linkProperties`。

---

## 2. deviceProperties（设备节点）

每一项对应拓扑上的一个设备节点，类型在项目中为 `OpManagerBVSymbolRaw`：

| 字段 | 类型 | 说明 |
|------|------|------|
| **objName** | string | 设备在 OpManager 中的对象名，通常与 `deviceName`/`opmanagerId` 一致，用于关联本系统设备与接口 |
| **name** | string | 设备名，部分实现里与 `objName` 等同；拓扑里用 `dev.objName \|\| dev.name` 做 id |
| **label** | string | 节点展示名 |
| **displayName** | string | 显示名，部分实现有；拓扑里用 `dev.label \|\| dev.displayName` |
| **type** | string | 设备类型/型号 |
| **ipAddress** | string | IP 地址 |
| **x** | string | 画布 X 坐标（字符串形式的数字） |
| **y** | string | 画布 Y 坐标（字符串形式的数字） |
| **status** | string | 状态编号（如 "5"=Clear） |
| **iconName** | string | 图标路径（如 `/Custom_DevIcon_xxx.png`） |

拓扑同步时：用 `objName/name` 查本系统 `Device`、生成节点 id、写入 `positionX/positionY` 等，并可从 `getBusinessDetailsView` 的性能数据里按 `name` 做补充。

---

## 3. linkProperties（链路/边）

每一项对应拓扑上的一条连线，类型在项目中为 `OpManagerBVLinkRaw`：

| 字段 | 类型 | 说明 |
|------|------|------|
| **source** | string | 源设备对象名，对应 `deviceProperties[].objName` |
| **dest** | string | 目标设备对象名 |
| **name** | string | 链路唯一名，用于生成边 id |
| **objName** | string | 接口/链路在 OpManager 中的对象名，用于关联本系统 `Interface`（opmanagerId） |
| **type** | string | 类型，如 `"Interface"` |
| **ifName** | string | 接口名 |
| **intfDisplayName** | string | 接口展示名 |
| **linkType** | string | 链路类型（如 `"1"`） |
| **InTraffic** | string | 入向流量（含单位，如 `"10.5 Mbps"`） |
| **OutTraffic** | string | 出向流量 |
| **InUtil** | string | 入向利用率（如 `"2.5"`） |
| **OutUtil** | string | 出向利用率 |
| **status** | string | 链路状态 |
| **parentDispName** | string | 源端设备显示名 |
| **destParentDispName** | string | 目标端设备显示名 |
| **destProps** | object? | 目标端接口/流量等详情 |

拓扑同步时：用 `source/dest` 拼出 `sourceId`/`targetId`，用 `name` 等拼出边 id，用 `intfDisplayName` 或 `ifName` 做边的 label，并用 `objName` 去匹配本系统接口。

---

## 4. 本系统中的使用方式

`src/services/collector/topology.ts` 中用法概括如下：

1. **设备节点**  
   - 遍历 `topologyData.deviceProperties`。  
   - 用 `dev.objName || dev.name` 作为 OpManager 设备标识，查本系统 `Device`、生成节点 id、写入 `positionX/positionY`、`label`、`type`、`icon` 等。  

2. **链路**  
   - 遍历 `topologyData.linkProperties`。  
   - 用 `link.source`、`link.dest` 与视图名拼出 `sourceId`、`targetId`。  
   - 用 `link.objName` 查本系统 `Interface` 做关联。  
   - 用 `link.intfDisplayName || link.ifName` 作为边的展示名。  

3. **性能数据**  
   - 性能不从 `getBVDetails` 取，而是来自 `getBusinessDetailsView(bvName)` 的 `BusinessDetailsView.Details`。  
   - 按设备 `name` 与 `deviceProperties[].objName` 对应后，写入节点 `metadata.performance` 或设备指标。

---

## 5. 类型定义位置

- 设备节点：`src/types/opmanager.ts` → `OpManagerBVSymbolRaw`  
- 链路：`src/types/opmanager.ts` → `OpManagerBVLinkRaw`  
- 整体响应：`src/types/opmanager.ts` → `OpManagerBVDetailsResponse`（`deviceProperties`、`linkProperties`、`mapProperties`）

以上即 **getBVDetails 在本项目中的具体返回数据含义与用法**。
