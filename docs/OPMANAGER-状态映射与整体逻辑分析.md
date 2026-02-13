# OpManager 状态映射与整体逻辑分析

**目的**：厘清「从 OpManager 同步就定义为 OFFLINE」「非被管理状态」「本系统不再做其他处理」之间的关系，避免把「未管理」错误等同于「离线」。

---

## 1. 问题陈述

- **OFFLINE** 在本系统中应表示：**设备离线、不可 Ping**，即 OpManager 反馈的「设备不可达」。
- **非被管理状态**（UnManaged）表示：**OpManager 未纳入监控**，与设备是否在线无关。
- 若在同步时把 UnManaged **直接映射为 OFFLINE**，相当于「本系统自己定义」设备为离线，而非如实反映 OpManager 的「未管理」——属于**逻辑错误**。
- 对接 OpManager 时应**只按 OpManager 的真实状态**做映射，不额外构造「离线」含义。

---

## 2. OpManager 状态含义（真实反馈）

| OpManager statusStr | 含义 | 本系统应表示 |
|---------------------|------|--------------|
| **Clear** | 正常、无告警 | 设备**在线且正常** → ONLINE |
| **Attention** | 需关注、轻故障 | 设备**在线但需关注** → WARNING |
| **Trouble** | 故障 | 设备**在线但有故障** → ERROR |
| **Critical** | 严重故障 | 设备**在线但严重故障** → ERROR |
| **Down** | 设备不可达/离线 | 设备**真正离线、不可 Ping** → OFFLINE |
| **UnManaged** | 未纳入 OpManager 监控 | **未管理** → 单独状态，不应映射为 OFFLINE |

要点：

- **OFFLINE** 应对应 OpManager 的 **Down**（不可达），而不是 UnManaged。
- **UnManaged** 是「是否被监控」的维度，不是「在线/离线」维度，故不应占用 OFFLINE。

---

## 3. 修正前的错误（若出现「12 台都 offline / Trouble 也变 offline」则属此类）

### 3.1 曾出现的错误映射

修正前（device 同步 / full-production-sync）曾出现：

```text
UnManaged → status = OFFLINE, isMonitored = false
Trouble   → 被某些实现误标为 OFFLINE
Down      → status = OFFLINE
```

问题：

- 把 **UnManaged** 和 **Down** 都写成 **OFFLINE**，且 **Trouble** 也曾被误定义为 OFFLINE。
- OpManager 的「未管理」并不等于「离线」；Trouble 表示「有故障」应映射为 ERROR。上述做法属于本系统自行构造含义，违背「真实反映 OpManager」的原则。

### 3.2 概念区分（正确语义）

| 概念 | 含义 | 错误做法（旧） | 正确做法（当前） |
|------|------|----------------|------------------|
| **离线 (OFFLINE)** | 被监控设备不可达、不可 Ping | Down + UnManaged + 甚至 Trouble 都标成 OFFLINE | 仅 **Down** → OFFLINE |
| **故障 (ERROR)** | 设备有 Trouble / Critical | 误标为 OFFLINE | **Trouble / Critical** → ERROR |
| **未管理 (UnManaged)** | OpManager 未监控该设备 | 用 OFFLINE + isMonitored=false 表示 | **UNMANAGED** + isMonitored=false |

「非管理状态、本系统不再做其他处理」应通过 **isMonitored=false** 与 **status=UNMANAGED** 表达，且 **Trouble 必须映射为 ERROR，不能为 OFFLINE**。

---

## 4. 整体数据流与职责划分

### 4.1 设备同步（唯一写入 status 的入口）

- **输入**：OpManager 的 `statusStr`（及可选 `isManaged`）。
- **职责**：  
  - 用 **status** 表示「设备健康/可达性」：只映射 Clear / Attention / Trouble / Critical / **Down**。  
  - 用 **isMonitored** 表示「是否被 OpManager 管理」：UnManaged → false，其余根据 OpManager 管理关系。
- **正确映射**：
  - Clear → `ONLINE`
  - Attention → `WARNING`
  - Trouble / Critical → `ERROR`
  - **Down** → `OFFLINE`（仅当 OpManager 明确表示设备不可达时）
  - **UnManaged** → `UNMANAGED`（新状态），**不**映射为 OFFLINE。

### 4.2 本系统「不再做其他处理」的落地方式

「非管理状态」下本系统不做采集、不参与统计与告警，**只应通过 isMonitored 与 status 语义区分**，而不是通过把 UnManaged 写成 OFFLINE。

| 维度 | 实现方式 | 说明 |
|------|----------|------|
| 指标采集 | `where: { isMonitored: true }` | 仅对被管理设备采指标 |
| 总览统计 | `where: { isMonitored: true }` | 总设备数、在线/离线/告警数均只算被管理设备 |
| 关键设备 | `where: { isMonitored: true, status in [WARNING, ERROR, OFFLINE] }` | 只关心「被管理且异常/离线」的设备 |
| 健康分 | `where: { isMonitored: true }` | 只基于被管理设备计算 |
| 告警关联 | 按 device 存在即可，不强制 isMonitored | 若 OpManager 仍下发了未管理设备的告警，可存为历史；本系统不主动去拉未管理设备 |

因此：

- **不再做其他处理** ≈ 所有「只处理被监控设备」的查询都带 `isMonitored: true`，UnManaged 设备自然被排除。
- **不应**再通过「把 UnManaged 标成 OFFLINE」来参与「离线数」「关键设备」等统计，否则会混淆「未管理」与「真正离线」。

### 4.3 下游使用 status 的规范

- **OFFLINE**：仅用于「被 OpManager 管理且当前为 Down（不可达）」的设备。
- **UNMANAGED**：仅用于「OpManager 明确为 UnManaged」的设备，表示「未纳入监控」，不表示离线。
- 大屏/报表中：
  - 「离线」数 = `isMonitored = true AND status = OFFLINE`。
  - 若需要展示「未管理设备数量」，可单独统计 `status = UNMANAGED` 或 `isMonitored = false`。

---

## 5. 修正方案摘要

1. **枚举**：在 `DeviceStatus` 中新增 **UNMANAGED**，专门表示「OpManager 未管理」。
2. **同步逻辑**：  
   - UnManaged → `status = UNMANAGED`，`isMonitored = false`。  
   - Down → `status = OFFLINE`（本系统 OFFLINE 仅此来源）。  
   - 其余保持：Clear→ONLINE，Attention→WARNING，Trouble/Critical→ERROR。
3. **下游**：  
   - 凡「离线数量」「关键设备中的离线」等，均使用 `status = OFFLINE`，且结合 `isMonitored = true` 的语义（只统计被管理设备）。  
   - 不对 UNMANAGED 做指标采集、健康分、拓扑主动发现等「其它处理」——沿用现有 `isMonitored` 过滤即可。
4. **展示**：  
   - OFFLINE → 展示为「离线」或「不可达」。  
   - UNMANAGED → 展示为「未监控」或「未管理」，与「离线」明确区分。

这样，从设备从 OpManager 同步起就不会再被**错误定义**为 OFFLINE；非管理状态只由 **UNMANAGED + isMonitored=false** 表示，并由现有「本系统不再做其他处理」的逻辑一致地排除在统计与采集之外。

---

## 6. 小结

- **OFFLINE** = OpManager 反馈的 **Down**（离线、不可 Ping），不要用 UnManaged 来填充。
- **UnManaged** = 未纳入监控，应映射为 **UNMANAGED**，不映射为 OFFLINE。
- 「非管理状态，本系统不再做其他处理」由 **isMonitored=false** 及仅对被管理设备的查询统一保证；不需要、也不应通过「把 UnManaged 标成 OFFLINE」来实现。

按上述方式调整后，整体逻辑与「真实反映 OpManager、不随意构造」的要求一致。

---

## 7. 修正后的验证结果（示例）

执行 `scripts/verify-unmanaged-status.ts` 或重新同步后，预期类似：

- **UNMANAGED**：仅对应 OpManager 的 UnManaged，且 `isMonitored = false`；本系统对其不做指标采集、不参与总览/关键设备/健康分。
- **OFFLINE**：仅对应 OpManager 的 Down（真正离线、不可 Ping）；当前若无 Down 设备，则 OFFLINE 数量为 0。
- **ONLINE / WARNING / ERROR**：与 OpManager 的 Clear / Attention / Trouble / Critical 一一对应。

由此可确认：状态来自 OpManager 的真实反馈，未将「未管理」或「Trouble」随意构造为「离线」。

---

## 8. 同步逻辑自检（确认同步后逻辑是否合理）

若您曾遇到「同步后 12 台设备都显示 offline、都纳入非管理状态，且 Trouble 也被定义为 offline」，说明当时跑的是**旧逻辑或旧部署**。当前代码已按本章档修正。

**自检方式**：在项目根目录执行：

```bash
npx tsx scripts/verify-sync-logic.ts
```

该脚本会：

1. 用与同步相同的接口从 OpManager 拉取设备列表；
2. 对每台设备打印：`statusStr` → 映射后的 `status`、`isMonitored`；
3. 汇总「按映射后 status」的统计，并与当前库内设备 status 分布对比。

**合理性的判定**：

- **Trouble** 设备的「→ status」应为 **ERROR**，库内也应为 ERROR；若出现 OFFLINE 则逻辑仍错。
- **UnManaged** 设备的「→ status」应为 **UNMANAGED**，库内也应为 UNMANAGED；若出现 OFFLINE 则逻辑仍错。
- **OFFLINE** 只应出现在 OpManager 的 **Down** 上；若无 Down 设备，则 OFFLINE 数量应为 0。

日常上线或变更同步逻辑后，建议跑一遍上述脚本，确认「同步后的逻辑是否合理」。
