# 大屏数据诊断报告

## 问题概述

大屏仪表盘除了告警数据外没有显示任何数据。需要确认：
1. 设备标签、接口标签、设备分类是否配置完成，是否有固定的标签需要定义
2. 数据采集是否成功从OPMANAGER实时采集，是否有日志记录或错误提示

---

## 诊断结果

### 1. 标签配置情况

#### 当前状态
- **设备标签（Device.tags）**: 
  - 字段类型：`String[]`（字符串数组）
  - 配置方式：**手动配置**（通过API或管理界面）
  - 自动生成：**否**（新设备会使用OpManager返回的标签，但已存在设备的标签不会被覆盖）
  - 固定标签定义：**无**（标签完全由用户自定义）

- **接口标签（Interface.tags）**:
  - 字段类型：`String[]`（字符串数组）
  - 配置方式：**手动配置**（通过API或管理界面）
  - 自动生成：**否**（新接口的tags为空数组，必须手动设置）
  - 固定标签定义：**无**（标签完全由用户自定义）

- **设备分类（Device.category）**:
  - 字段类型：`String?`（可选字符串）
  - 配置方式：从OpManager同步时自动设置
  - 固定分类定义：**无**（使用OpManager返回的category值）

- **设备分组（Device.group）**:
  - 字段类型：`String?`（可选字符串）
  - 配置方式：从OpManager同步时自动设置
  - 固定分组定义：**无**

#### 标签使用场景
从代码分析发现，标签主要用于：
1. **设备过滤** (`/api/devices?tags=xxx`)
2. **接口过滤** (`/api/interfaces?tags=xxx`)
3. **按标签获取设备** (`/api/dashboard/tagged-devices?tag=xxx`)
4. **设备分类辅助**（在`grouped-devices.ts`中，使用标签帮助分类OTHER类型的设备）

#### 建议的标签规范（可选）
虽然系统没有强制要求固定标签，但建议定义以下标签规范以便于管理：

**设备标签建议**:
- `核心设备` / `核心服务器` - 关键业务设备
- `服务器` / `Server` - 服务器设备
- `网络设备` / `Network` - 网络设备（交换机、路由器等）
- `防火墙` / `Firewall` - 防火墙设备
- `存储设备` / `Storage` - 存储设备

**接口标签建议**:
- `上联` - 上联接口
- `下联` - 下联接口
- `核心` - 核心接口
- `业务` - 业务接口
- `管理` - 管理接口

**注意**: 这些只是建议，系统不强制要求使用这些标签。

---

### 2. 数据采集状态

#### 数据采集服务架构

数据采集服务位于 `src/services/collector/start.ts`，包含以下定时任务：

1. **设备指标采集** (`MetricCollector`)
   - 频率：每1分钟（`*/1 * * * *`）
   - 采集内容：CPU使用率、内存使用率、磁盘使用率、响应时间、丢包率
   - 数据源：OPMANAGER API `getDeviceSummary(deviceName)`

2. **告警同步** (`AlarmCollector`)
   - 频率：每30秒（`*/30 * * * * *`）
   - 采集内容：告警信息
   - 数据源：OPMANAGER API `getAlarms()`

3. **拓扑同步** (`TopologyCollector`)
   - 频率：每5分钟（`*/5 * * * *`）
   - 采集内容：业务视图拓扑
   - 数据源：OPMANAGER API `getBusinessDetailsView()`

4. **设备同步** (`DeviceCollector`)
   - 方式：**手动触发**（通过 `/api/devices/sync`）
   - 采集内容：设备列表和基本信息

5. **接口同步** (`InterfaceCollector`)
   - 方式：**手动触发**（通过 `/api/interfaces/sync`）
   - 采集内容：接口列表和基本信息

#### ⚠️ 关键问题：数据采集服务未自动启动

**问题发现**：
- 数据采集服务 (`src/services/collector/start.ts`) 只在以下情况被导入：
  - `scripts/start-mock-collector.ts`（仅用于Mock模式）
- **Next.js应用启动时没有自动启动数据采集服务**

**影响**：
- 设备指标数据不会被自动采集
- 告警数据可能正常（如果通过其他方式同步）
- 大屏无法显示实时数据

#### 日志记录情况

**当前日志实现**：
1. **Winston日志系统** (`src/lib/logger.ts`)
   - 日志文件位置：`logs/error.log` 和 `logs/combined.log`
   - 日志级别：通过 `LOG_LEVEL` 环境变量控制
   - 开发环境：同时输出到控制台和文件
   - 生产环境：输出到控制台（用于容器日志）

2. **数据采集日志**：
   - `MetricCollector`: 使用 `console.log` 输出，部分日志被注释
   - `AlarmCollector`: 使用 `console.log` 输出
   - `DeviceCollector`: 使用 `console.log` 输出
   - `InterfaceCollector`: 使用 `console.log` 输出

3. **OPMANAGER API错误日志**：
   - 通过 `OpManagerClient` 的响应拦截器记录
   - 使用 `logger.error()` 记录到日志文件

**日志查看方式**：
```bash
# 查看错误日志
tail -f logs/error.log

# 查看综合日志
tail -f logs/combined.log

# 查看控制台输出（如果服务正在运行）
# 需要查看运行Next.js应用的终端或容器日志
```

---

## 解决方案

### 方案1：确保数据采集服务正在运行（推荐）

#### 选项A：单独运行数据采集服务（当前方式）

```bash
# 在单独的终端/进程中运行
npm run collector
```

**优点**：
- 服务独立，不影响Web应用
- 可以单独重启数据采集服务

**缺点**：
- 需要手动启动和管理
- 如果忘记启动，数据不会采集

#### 选项B：在Next.js启动时自动启动（推荐）

修改应用启动文件，在服务端启动时导入数据采集服务：

创建或修改 `src/app/api/health/route.ts` 或创建新的初始化文件：

```typescript
// src/lib/init-collector.ts
if (typeof window === 'undefined') {
  // 只在服务端执行
  import('@/services/collector/start').catch(console.error);
}
```

然后在 `src/app/layout.tsx` 中导入：

```typescript
// 在服务端自动启动数据采集
if (typeof window === 'undefined') {
  require('@/lib/init-collector');
}
```

### 方案2：增强日志记录

改进数据采集服务的日志记录，确保所有操作都有日志：

1. **在MetricCollector中启用详细日志**
2. **记录每次采集的成功/失败情况**
3. **记录OPMANAGER API调用情况**

### 方案3：添加数据采集状态监控

创建API端点检查数据采集服务状态：

```typescript
// src/pages/api/collector/status.ts
export default async function handler(req, res) {
  // 检查最近的数据采集时间
  // 检查是否有错误日志
  // 返回采集服务状态
}
```

---

## 诊断脚本使用

运行诊断脚本检查当前状态：

```bash
npm run diagnose:dashboard
```

或直接运行：

```bash
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-dashboard-data.ts
```

诊断脚本会检查：
1. 设备数据统计（总数、监控数、标签数等）
2. 接口数据统计
3. 设备指标数据（最近5分钟、1小时）
4. 流量指标数据
5. 告警数据（作为对比）
6. 数据同步时间戳
7. 问题总结和建议

---

## 立即行动项

### 1. 检查数据采集服务是否运行

```bash
# 检查是否有collector进程在运行
ps aux | grep collector
# 或
tasklist | findstr collector  # Windows
```

### 2. 运行诊断脚本

```bash
npm run diagnose:dashboard
```

### 3. 检查日志文件

```bash
# 查看最近的错误
tail -n 100 logs/error.log

# 查看综合日志
tail -n 100 logs/combined.log
```

### 4. 手动测试数据采集

```bash
# 测试指标采集
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/test-metric-collection.ts
```

### 5. 启动数据采集服务（如果未运行）

```bash
# 选项1：单独运行
npm run collector

# 选项2：修改代码使其自动启动（见方案1选项B）
```

---

## 总结

### 标签配置
- ✅ 标签字段已配置完成
- ⚠️ 没有固定的标签定义（这是设计选择，允许灵活配置）
- ✅ 标签可以通过API手动设置
- 💡 建议：根据业务需求定义标签规范（非强制）

### 数据采集
- ❌ **数据采集服务可能未运行**（需要确认）
- ✅ 日志系统已配置（Winston）
- ⚠️ 部分日志被注释，可能影响问题排查
- 💡 建议：确保数据采集服务正在运行，并增强日志记录

### 下一步
1. 运行诊断脚本确认当前状态
2. 检查数据采集服务是否运行
3. 查看日志文件确认是否有错误
4. 根据诊断结果采取相应措施
