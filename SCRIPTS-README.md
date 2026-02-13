# 检查脚本使用说明

本目录包含多个用于检查和诊断系统状态的脚本。

## 快速开始

### 综合检查（推荐）

同时检查设备和接口的同步状态：

```bash
npm run check:all
```

这个脚本会显示：
- 设备总数和分类统计
- 接口总数和分类统计
- 监控状态统计
- 标签使用情况
- 同步状态
- OpManager 与数据库的对比

## 所有可用脚本

### 1. 综合检查脚本

```bash
npm run check:all
```

**功能**：同时检查设备和接口的同步状态，提供完整的系统概览。

**输出示例**：
```
📱 设备统计
📊 数据库中的设备总数: 50
   已启用监控: 50
   已禁用监控: 0

🔌 接口统计
📊 数据库中的接口总数: 5343
   已启用监控: 5343
   已禁用监控: 0
```

---

### 2. 设备检查脚本

#### 2.1 检查特定设备

```bash
npm run check:device
```

**功能**：检查指定 IP 地址的设备是否存在及其详细信息。

**用途**：当在 `/admin/devices` 页面找不到某个设备时使用。

---

#### 2.2 检查设备同步状态

```bash
npm run check:sync
```

**功能**：
- 对比数据库和 OpManager 中的设备数量
- 检查目标设备是否在 OpManager 中
- 显示设备同步时间

**用途**：诊断设备同步问题。

---

### 3. 接口检查脚本

```bash
npm run check:interfaces
```

**功能**：详细检查接口同步状态，包括：
- 接口总数和分类
- 监控状态统计
- 标签使用情况
- 按设备统计接口数量
- 同步时间记录

---

### 4. 其他诊断脚本

#### 4.1 Dashboard 诊断

```bash
npm run diagnose:dashboard
```

**功能**：全面诊断 Dashboard 显示问题，包括：
- 数据库连接
- 设备状态
- 指标数据
- OpManager 配置
- API 响应

---

#### 4.2 检查 OpManager isManaged 字段

```bash
npm run check:isManaged
```

**功能**：检查 OpManager API 返回的 `isManaged` 字段。

---

#### 4.3 修复设备监控状态

```bash
npm run fix:isMonitored
```

**功能**：将所有设备的 `isMonitored` 字段设置为 `true`。

**注意**：仅在确认需要时使用，会覆盖手动设置。

---

## 脚本列表总结

| 脚本命令 | 脚本文件 | 功能 |
|---------|---------|------|
| `npm run check:all` | `scripts/check-sync-status.ts` | **综合检查设备和接口** |
| `npm run check:device` | `scripts/check-device-by-ip.ts` | 检查特定设备 |
| `npm run check:sync` | `scripts/check-device-sync-status.ts` | 检查设备同步状态 |
| `npm run check:interfaces` | `scripts/check-interface-count.ts` | 检查接口统计 |
| `npm run diagnose:dashboard` | `scripts/diagnose-dashboard.ts` | Dashboard 诊断 |
| `npm run check:isManaged` | `scripts/check-opmanager-isManaged.ts` | 检查 OpManager 字段 |
| `npm run fix:isMonitored` | `scripts/fix-isMonitored.ts` | 修复设备监控状态 |

---

## 常见问题排查流程

### 问题：Dashboard 没有显示数据

1. **运行综合检查**：
   ```bash
   npm run check:all
   ```

2. **检查设备监控状态**：
   - 如果 `已启用监控的设备: 0`，运行 `npm run fix:isMonitored`

3. **检查设备同步**：
   - 如果设备数量不一致，在 `/admin/devices` 页面点击"同步设备"

4. **检查接口同步**：
   - 如果接口数量为 0，在 `/admin/interfaces` 页面点击"同步接口"

---

### 问题：在 /admin 页面找不到某个设备

1. **检查设备是否存在**：
   ```bash
   npm run check:device
   ```
   修改脚本中的 `targetIP` 变量为要查找的设备 IP

2. **检查设备同步状态**：
   ```bash
   npm run check:sync
   ```

3. **检查分页限制**：
   - 确认 `/admin/devices` 页面已使用 `limit=1000`
   - 如果设备超过 1000 个，考虑实现分页

---

### 问题：接口数量显示不全

1. **检查接口总数**：
   ```bash
   npm run check:interfaces
   ```

2. **检查分页设置**：
   - `/admin/interfaces` 页面已实现服务端分页（每页 100 条）
   - 使用底部分页控件浏览所有接口

---

## 注意事项

1. **环境变量**：所有脚本都会自动加载 `.env.local` 和 `.env` 文件
2. **数据库连接**：确保 `DATABASE_URL` 环境变量已正确配置
3. **OpManager 连接**：某些脚本需要 OpManager API 连接，如果无法连接会显示警告但不影响其他检查

---

## 输出解读

### 正常状态示例

```
✅ 设备总数: 164
✅ 接口总数: 5343
✅ 已启用监控的设备: 164
✅ 已启用监控的接口: 5343
```

### 警告状态示例

```
⚠️  警告: 数据库中没有接口，请运行接口同步
⚠️  警告: 所有设备都未启用监控，Dashboard 将无法显示数据
```

---

## 更新日志

- **2026-01-05**: 添加 `check:all` 综合检查脚本
- **2026-01-05**: 添加接口检查脚本
- **2026-01-05**: 添加设备检查脚本
