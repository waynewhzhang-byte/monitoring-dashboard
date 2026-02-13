# 本系统对 OpManager 的 API 调用清单与返回约定

**目的**：确认所有对 OpManager 的 API 调用**都有返回结果**、**没有未处理的报错**，且调用方按约定使用返回值。

---

## 1. 调用来源与使用的 API

本系统通过 **`@/services/opmanager/client`** 的 `opClient` 调用 OpManager，主要使用以下接口：

| 序号 | OpManager API | 本系统方法 | 调用方 | 说明 |
|------|----------------|------------|--------|------|
| 1 | `/api/json/v2/device/listDevices` | `getDevicesPage()` | 设备同步、full-production-sync、verify-sync-logic | 设备列表（分页） |
| 2 | `/api/json/alarm/listAlarms` | `getAlarms()` | 告警同步 AlarmCollector | 活动告警列表 |
| 3 | `/api/json/device/getDeviceSummary` | `getDeviceSummary(name)` | 指标采集 MetricCollector | 单设备快照/指标 |
| 4 | `/api/json/device/getInterfaces` | `getInterfaces({ deviceIpAddress })` | 接口同步、realtime-traffic、tagged-traffic | 单设备接口列表 |
| 5 | `/api/json/businessview/getBusinessView` | `getBusinessView()` | 业务视图列表（同步 BV 时） | 业务视图列表 |
| 6 | `/api/json/businessview/getBVDetails` | `getBVDetails(bvName)` | 拓扑同步 TopologyCollector | 拓扑节点/连边 |
| 7 | `/api/json/businessview/getBusinessDetailsView` | `getBusinessDetailsView(bvName, start, len)` | 拓扑同步 TopologyCollector | 业务视图内设备详情 |

另有 **`/api/stats/business-view`** 使用 **`OpManagerDataCollector`**（`@/services/opmanager/data-collector`）的 `listDevices` / `getBusinessDetailsView`，走独立 HTTP，不经过 `opClient`。若需统一校验，需在环境中对该 DataCollector 的 baseUrl/apiKey 一并验证。

---

## 2. 返回与报错约定（opClient）

所有方法在 **捕获到异常时均不向调用方抛错**，而是返回「安全默认值」并在内部打日志，因此不会出现「未处理的报错」导致进程挂掉。

| 方法 | 成功时返回 | 失败/异常时返回 | 调用方注意点 |
|------|------------|------------------|--------------|
| `getDevicesPage()` | `{ devices, total?, records?, page? }`，`devices` 为数组 | `{ devices: [], total: 0, records: 0, page }` | 使用 `result.devices ?? []` 即可 |
| `getAlarms()` | `OpManagerAlarm[]` | `[]` | 无法区分「接口报错」与「本当无告警」，若有重试需求需在调用方用超时/重试包装 |
| `getDeviceSummary(name)` | 快照对象（含 `dials` 等） | `null` | 判空后再用，例如 `if (!summary) return` |
| `getInterfaces({ deviceIpAddress })` | 接口对象数组 | `[]` | 无 `deviceIpAddress` 时直接返回 `[]`，不发起请求 |
| `getBusinessView()` | 业务视图列表对象 | `null` | 判空后再取 `BusinessView.Details` 等 |
| `getBVDetails(bvName)` | 拓扑详情对象 | `null` | 拓扑同步中已做 `if (!topologyData) return { nodes: 0, edges: 0 }` |
| `getBusinessDetailsView(bvName, start, len)` | 业务视图设备详情对象 | `null` | 使用前判空及 `BusinessDetailsView?.Details` |

因此：**从「有没有返回、会不会抛错」的角度，所有上述调用都「有返回结果」且「没有未处理报错」**；若某次调用实际失败，会得到上表中的默认值并被记入日志。

---

## 3. 如何自检「是否都有返回、有无报错」

在项目根目录执行：

```bash
npx tsx scripts/verify-opmanager-api-calls.ts
```

该脚本会：

1. 使用与业务相同的 `opClient` 依次调用：  
   `getDevicesPage`、`getAlarms`、`getBusinessView`  
  以及依赖首台设备的 `getDeviceSummary`、`getInterfaces`，  
  以及依赖业务视图名称的 `getBVDetails`、`getBusinessDetailsView`。
2. 对每次调用检查：是否有返回、类型是否符合预期（对象/数组）、是否出现未捕获异常。
3. 在末尾输出汇总：全部 ✅ 即表示当前环境下的上述 OpManager API 调用**均有返回、未出现未处理报错**。

建议在部署或变更 OpManager 地址/权限后跑一次，以确认本系统对 OpManager 的调用处于「都有返回、没有报错被忽略」的状态。

---

## 4. 与「错误根源已修复」的关系

- **状态映射逻辑**（Trouble/UnManaged 等）的修复见：`docs/OPMANAGER-状态映射与整体逻辑分析.md`。
- **API 调用是否有返回、是否报错** 以本文及 `scripts/verify-opmanager-api-calls.ts` 为准；二者相互独立，共同保证「对接 OpManager」行为可预期、可核查。
