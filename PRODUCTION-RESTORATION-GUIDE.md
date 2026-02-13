# 生产环境大屏数据恢复指导手册 (Production Restoration Guide)

本手册旨在指导技术人员在生产环境下，通过手动执行脚本的方式，恢复大屏的数据采集与大屏显示功能。

---

## 📋 前置条件 (Prerequisites)

1. **源码同步**：确保生产服务器上的代码已同步为当前版本（包含 `scripts` 目录下的所有新脚本）。
2. **连接性**：服务器需能访问 OpManager 访问地址 `https://10.141.69.192:8061`。
3. **环境配置**：检查 `.env.local` 确保以下参数正确：

   ```env
   OPMANAGER_BASE_URL=https://10.141.69.192:8061
   OPMANAGER_API_KEY=42aa561c1e280e8a46a51a4f5e06f5b5
   OPMANAGER_TIMEOUT=30000
   ```

---

## 🛠️ 第一步：环境健康检查 (Diagnostic)

在开始任何修复前，请先运行诊断脚本，确认网络、API 认证及数据库状态。

**执行命令：**

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/production-diagnose.ts
```

* **预期结果**：
  * 步骤 1 & 2 必须为 ✅。
  * 如果步骤 3 显示“设备未监控”，请执行下一步。
  * 如果步骤 4 显示“指标未采集”，请确保后台 collector 服务已启动。

---

## ⚙️ 第二步：强制开启监控状态 (Repair Device Status)

如果诊断显示设备已同步但没有被监控（`isMonitored=false`），需要强制更新。

**执行命令：**

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/fix-isMonitored.ts
```

* **作用**：将数据库中所有已同步设备的 `isMonitored` 字段设为 `true`，以允许系统开始采集性能数据（CPU/内存等）。

---

## 🎨 第三步：大屏 UI 一键恢复 (Restore UI & Topology)

该步骤将自动探测 OpManager 中的业务视图名称，并同步拓扑连线。

**执行命令：**

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/production-restore-ui.ts
```

* **作用**：
    1. 自动发现 OpManager 中的业务视图内部名称。
    2. 在数据库中初始化视图配置。
    3. 强制同步所有节点（Nodes）和连线（Edges）。
* **注意**：执行完成后，请刷新大屏页面查看拓扑图。

---

## 🏷️ 第四步：设备自动打标 (Device Tagging)

大屏中的“硬件服务器”和“网络设备”页签依赖于标签（Tags）。

**执行命令：**

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/batch-tag-devices.ts
```

* **作用**：
  * 根据设备名称/描述中的关键词（如 "服务器", "核心", "交换机"）自动打上对应的标签。
  * 打标后，设备将自动出现在大屏对应的分类面板中。

---

## 🚀 持续运行 (Daemon)

确保数据采集服务在后台持续运行：

```bash
# 建议使用 pm2 或 screen 运行
npm run collector
```

---

## ❓ 常见问题 (Troubleshooting)

1. **拓扑图依然为空？**
    * 确认 `production-restore-ui.ts` 是否输出了“同步完成”且节点数大于 0。
    * 检查大屏页面的下拉菜单，确认是否选择了正确的视图名称。
2. **只有告警没有性能数据？**
    * 运行诊断脚本（第一步），确认“最近 5 分钟采集指标数”不为 0。
    * 确保 `isMonitored` 已按第二步修复。

---
*版本：1.0 | 修改建议请反馈至技术支持团队。*
