# 告警同步问题修复说明

## 问题描述

- **OpManager API** (`https://10.141.69.192:8061/api/json/alarm/listAlarms`) 返回 **153 条活动告警**
- **数据库**中活动告警数量为 **0**
- **Dashboard** 显示活动告警为 **0**

## 根本原因

告警同步时，使用 `opAlarm.name` 查找设备，但设备名称可能不匹配，导致所有告警被跳过。

## 修复内容

### 1. 改进设备匹配逻辑 (`src/services/collector/alarm.ts`)

**修复前**：只按 `name` 字段匹配
```typescript
const device = await prisma.device.findFirst({
    where: { name: opAlarm.name }
});
```

**修复后**：支持多种匹配方式
```typescript
// 1. 按 name 匹配
let device = await prisma.device.findFirst({
    where: { name: deviceName }
});

// 2. 按 opmanagerId 匹配（如果 name 匹配失败）
if (!device && deviceName) {
    device = await prisma.device.findFirst({
        where: { opmanagerId: deviceName }
    });
}

// 3. 按 displayName 模糊匹配（不区分大小写）
if (!device && deviceName) {
    device = await prisma.device.findFirst({
        where: { 
            displayName: {
                contains: deviceName,
                mode: 'insensitive'
            }
        }
    });
}
```

### 2. 增强调试日志

- 记录未匹配的设备名称
- 记录告警数据详情
- 记录匹配尝试过程

### 3. 创建诊断脚本

- `npm run check:alarms` - 检查告警同步状态
- `npm run test:alarm-sync` - 测试告警同步流程和设备匹配

## 验证步骤

### 步骤 1: 检查告警同步服务

确保 Collector 服务正在运行：

```bash
# 检查 Collector 进程
ps aux | grep collector

# 或者查看日志
tail -f logs/collector.log
```

Collector 服务应该每 30 秒自动同步一次告警。

### 步骤 2: 运行诊断脚本

在服务器上运行：

```bash
npm run test:alarm-sync
```

这个脚本会：
1. 测试 OpManager API 连接
2. 检查前 10 个告警的设备匹配情况
3. 显示匹配统计和未匹配的设备名称
4. 提供修复建议

### 步骤 3: 检查设备匹配情况

如果脚本显示有告警无法匹配设备，请：

1. **查看未匹配的设备名称**：
   ```
   未匹配的设备名称示例：
   - "10.141.0.252.10000000001"
   - "设备名称-IP"
   ```

2. **检查数据库中对应的设备**：
   ```bash
   # 使用数据库查询工具或运行
   npm run check:device
   ```

3. **确认设备名称格式**：
   - 告警中的设备名称格式
   - 数据库中的设备名称格式（`name`, `opmanagerId`, `displayName`）

### 步骤 4: 验证告警同步

等待 1-2 分钟后，运行：

```bash
npm run check:alarms
```

检查：
- OpManager API 返回的告警数量
- 数据库中的活动告警数量
- 设备匹配情况

### 步骤 5: 检查 Dashboard

运行：

```bash
npm run diagnose:dashboard
```

检查 "活动告警" 数量是否已更新。

## 如果问题仍然存在

### 情况 1: 设备匹配失败

如果 `npm run test:alarm-sync` 显示大量设备匹配失败：

1. **检查设备名称格式差异**：
   - 告警中的设备名称：`10.141.0.252.10000000001`
   - 数据库中的设备名称：`10.141.0.252` 或 `10.141.0.252.10000000001`

2. **解决方案**：
   - 如果设备名称包含后缀（如 `.10000000001`），需要调整匹配逻辑
   - 或者确保设备同步时使用正确的名称格式

### 情况 2: 告警同步服务未运行

如果 Collector 服务未运行：

```bash
# 启动 Collector 服务
npm run collector
```

### 情况 3: 告警被去重逻辑过滤

如果设备匹配成功但告警仍然没有同步：

1. **检查 Redis 连接**（告警去重使用 Redis）
2. **检查去重时间窗口**（默认 300 秒）
3. **查看 Collector 日志**中的去重信息

## 预期结果

修复后，应该能够：

1. ✅ 成功匹配告警中的设备（即使设备名称格式不完全一致）
2. ✅ 将 OpManager 的 153 条告警同步到数据库
3. ✅ Dashboard 显示正确的活动告警数量

## 相关文件

- `src/services/collector/alarm.ts` - 告警同步逻辑
- `src/services/opmanager/client.ts` - OpManager API 客户端
- `scripts/test-alarm-sync.ts` - 告警同步测试脚本
- `scripts/check-alarm-sync.ts` - 告警检查脚本

## 更新日志

- **2026-01-05**: 修复设备匹配逻辑，支持多种匹配方式
- **2026-01-05**: 添加详细的调试日志
- **2026-01-05**: 创建诊断和测试脚本
