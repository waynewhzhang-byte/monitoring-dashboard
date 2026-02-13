# OpManager API 验证测试脚本使用指南

> 脚本文件: [verify-all-opmanager-apis.ts](verify-all-opmanager-apis.ts)
> 用途: 全面测试 8 个 OpManager API 端点，验证是否能正常返回业务数据

---

## 📋 快速开始

### 方式 1: 使用 npm script（推荐）

```bash
# 测试真实 OpManager API
npm run verify:opmanager-apis

# 测试 Mock 数据
USE_MOCK_DATA=true npm run verify:opmanager-apis
```

### 方式 2: 直接使用 ts-node

```bash
# Windows PowerShell - 真实 API
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Windows PowerShell - Mock 模式
$env:USE_MOCK_DATA="true"; ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Linux/Mac - 真实 API
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Linux/Mac - Mock 模式
USE_MOCK_DATA=true ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
```

---

## 🔍 测试内容

脚本将按顺序测试以下 8 个 OpManager API：

| # | API 名称 | 端点 | 状态 |
|---|---------|------|------|
| 1 | 设备列表 API | `GET /api/json/v2/device/listDevices` | ✅ 已启用 |
| 2 | 接口列表 API | `GET /api/json/device/getInterfaces` | ✅ 已启用 |
| 3 | 告警列表 API | `GET /api/json/alarm/listAlarms` | ✅ 已启用 |
| 4 | 设备摘要 API | `GET /api/json/device/getDeviceSummary` | ✅ 已启用 |
| 5 | 图表数据 API | `GET /api/json/device/getGraphData` | ⚠️ 已定义未启用 |
| 6 | 仪表板小部件 API | `GET /api/json/dashboard/getWidgetData` | ⚠️ 已定义未启用 |
| 7 | 业务视图拓扑 API | `GET /api/json/businessview/getBVDetails` | ✅ 已启用 |
| 8 | 业务视图详情 API | `GET /api/json/businessview/getBusinessDetailsView` | ✅ 已启用 |

---

## 📊 输出示例

```
================================================================================
  OpManager API 全面验证测试
================================================================================

◆ 环境配置
────────────────────────────────────────────────────────────────────────────────
  OpManager Base URL: https://opmanager.example.com
  API Key 配置状态:   ✅ 已配置
  超时时间:          30000ms
  Mock 模式:         ❌ 禁用
  Node 环境:         production

◆ 测试 1: 设备列表 API (分页)
────────────────────────────────────────────────────────────────────────────────
ℹ️  调用 API: getDevicesPage({ page: 1, rows: 10 })
✅ 成功获取 10 个设备
  响应时间: 245ms
  总记录数: 156
  当前页码: 1
  第一个设备示例数据:
{
  "deviceName": "core-router-01",
  "displayName": "核心路由器-01",
  "ipAddress": "192.168.1.1",
  "type": "Router",
  "status": "up",
  ...
}

  数据字段检查:
    ✅ deviceName/name: core-router-01
    ✅ ipAddress: 192.168.1.1
    ✅ type: Router
    ✅ status: up
    ✅ displayName: 核心路由器-01

...

================================================================================
  测试汇总报告
================================================================================

总测试数: 8
成功数:   6
失败数:   2
成功率:   75.0%

详细结果:
────────────────────────────────────────────────────────────────────────────────
序号 | 测试名称                      | 状态     | 响应时间    | 数据量    | 错误/警告
────────────────────────────────────────────────────────────────────────────────
1    | 设备列表 API                  | ✅ 成功  | 245ms      | 10       |
2    | 接口列表 API                  | ✅ 成功  | 189ms      | 24       |
3    | 告警列表 API                  | ✅ 成功  | 156ms      | 5        |
4    | 设备摘要 API                  | ✅ 成功  | 201ms      | N/A      |
5    | 图表数据 API                  | ❌ 失败  | 89ms       | N/A      | API 返回空数据
       ⚠️  此 API 已定义但未在采集器中启用
6    | 仪表板小部件数据 API          | ❌ 失败  | 102ms      | N/A      | 仪表板不存在
       ⚠️  此 API 已定义但未在采集器中启用
7    | 业务视图拓扑 API              | ✅ 成功  | 298ms      | 45       |
8    | 业务视图设备详情 API          | ✅ 成功  | 234ms      | 12       |
────────────────────────────────────────────────────────────────────────────────

◆ 推荐操作
────────────────────────────────────────────────────────────────────────────────
发现 2 个失败的测试:
  • 图表数据 API: API 返回空数据
  • 仪表板小部件数据 API: 仪表板不存在

建议检查:
  1. OpManager 服务是否正常运行
  2. API Key 是否正确配置
  3. 网络连接是否正常
  4. OpManager 中是否有相应数据（设备、业务视图等）
```

---

## 🔧 前置条件

### 1. 环境变量配置

确保 `.env` 文件配置正确：

```bash
# OpManager API 配置
OPMANAGER_BASE_URL=https://your-opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=30000

# 测试模式（可选）
USE_MOCK_DATA=false  # false=真实API, true=Mock数据
```

### 2. OpManager 服务状态

- OpManager 服务正常运行
- API 服务已启用
- 防火墙允许访问 OpManager API 端口

### 3. 数据准备

为获得最佳测试效果，建议在 OpManager 中准备：

- ✅ 至少 1 个已监控的设备
- ✅ 设备具有有效的 IP 地址
- ✅ 设备具有网络接口数据
- ⚠️ （可选）配置业务视图（用于拓扑测试）
- ⚠️ （可选）配置仪表板和小部件

---

## ⚠️ 常见问题排查

### 问题 1: 启动失败，报错 "ZodError: Required"

**原因**: 环境变量未加载或 `.env` 文件不存在

**错误示例**:
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["DATABASE_URL"],
    "message": "Required"
  }
]
```

**解决**:
1. 确认项目根目录存在 `.env` 文件（不是 `.env.local` 或 `.env.example`）
2. 确认 `.env` 文件包含所有必需变量：
   ```bash
   DATABASE_URL=postgresql://...
   OPMANAGER_BASE_URL=https://...
   OPMANAGER_API_KEY=...
   REDIS_URL=redis://...
   ```
3. 验证环境变量是否正确加载：
   ```bash
   npm run test:env
   ```
4. 如果 `test:env` 能成功但验证脚本失败，请报告此问题

---

### 问题 2: 所有测试失败，报错 "ECONNREFUSED"

**原因**: 无法连接到 OpManager 服务

**解决**:
1. 检查 `OPMANAGER_BASE_URL` 是否正确
2. 确认 OpManager 服务是否运行
3. 检查防火墙设置
4. 尝试在浏览器访问 OpManager Web UI

```bash
# 测试连接
curl -k https://your-opmanager.example.com/api/json/v2/device/listDevices?apiKey=your-key
```

---

### 问题 3: 所有测试失败，报错 "401 Unauthorized"

**原因**: API Key 无效或未配置

**解决**:
1. 检查 `.env` 中的 `OPMANAGER_API_KEY` 是否正确
2. 在 OpManager 中重新生成 API Key
3. 确认 API Key 有足够权限

**验证 API Key**:
```bash
# 在 OpManager Web UI 中
# 设置 -> API -> API Key 管理
```

---

### 问题 4: 设备列表测试成功，但接口列表测试失败

**原因**: 设备 IP 地址缺失或格式不正确

**解决**:
1. 检查 OpManager 中设备是否配置了有效 IP
2. 确认设备状态为"已管理"（isManaged = true）
3. 查看测试输出中的设备 IP 地址

---

### 问题 5: 业务视图测试失败

**原因**: OpManager 中未配置业务视图

**解决**:
1. 在 OpManager 中创建业务视图
   - 导航到: Inventory -> Business Views
   - 创建新的业务视图或使用默认视图
2. 修改测试脚本中的 `testBVName` 变量：
   ```typescript
   const testBVName = 'Your Business View Name';
   ```

---

### 问题 6: 设备摘要 API 成功但无性能数据

**原因**: OpManager 返回的数据格式与预期不符

**解决**:
1. 查看测试输出中的"摘要数据"完整结构
2. 根据实际返回格式调整 MetricCollector 解析逻辑
3. 参考脚本中的数据提取逻辑（`test4_DeviceSummary` 函数）

---

### 问题 7: 测试超时

**原因**: OpManager 响应缓慢或网络延迟高

**解决**:
1. 增加超时时间：
   ```bash
   OPMANAGER_TIMEOUT=60000  # 增加到 60 秒
   ```
2. 检查 OpManager 服务器性能
3. 检查网络连接质量

---

### 问题 8: HTTPS 证书错误

**原因**: OpManager 使用自签名证书

**解决**:
脚本已自动处理自签名证书（`rejectUnauthorized: false`），如仍有问题：

1. 检查 `src/services/opmanager/client.ts` 中的 HTTPS Agent 配置
2. 确认 OpManager URL 使用 `https://` 协议

---

## 🎯 解读测试结果

### 成功标准

- ✅ **完全成功**: API 返回数据，数据格式正确，包含预期字段
- ⚠️ **部分成功**: API 返回数据，但存在警告（如字段缺失、数据为空）
- ❌ **失败**: API 请求失败或返回异常数据

### 警告类型

| 警告信息 | 含义 | 影响 |
|---------|------|------|
| `字段 XXX 缺失` | API 返回数据缺少某个字段 | 可能影响数据完整性，需调整数据映射逻辑 |
| `返回数据为空` | API 成功但无数据 | 可能 OpManager 中无相应数据，或查询条件不匹配 |
| `可能存在分页限制` | 返回数据量达到上限 | 可能遗漏数据，需实现分页处理 |
| `此 API 已定义但未在采集器中启用` | 功能未启用 | 不影响当前系统运行 |

---

## 📝 自定义测试参数

如需测试特定设备或业务视图，可修改脚本中的参数：

### 修改业务视图名称

编辑 `verify-all-opmanager-apis.ts`，找到：

```typescript
// 测试 7 和 测试 8
const testBVName = 'Default View'; // 改为你的业务视图名称
```

### 修改设备查询数量

```typescript
// 测试 1
const response = await opClient.getDevicesPage({
    page: 1,
    rows: 10  // 改为你想要的数量
});
```

### 修改图表名称

```typescript
// 测试 5
const graphData = await opClient.getGraphData(deviceName, 'CPU'); // 改为实际图表名
```

---

## 🚀 持续集成建议

可将此测试脚本集成到 CI/CD 流程中：

### GitHub Actions 示例

```yaml
name: OpManager API Test

on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时运行一次
  workflow_dispatch:        # 手动触发

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx tsx scripts/verify-all-opmanager-apis.ts
        env:
          OPMANAGER_BASE_URL: ${{ secrets.OPMANAGER_URL }}
          OPMANAGER_API_KEY: ${{ secrets.OPMANAGER_KEY }}
```

---

## 📞 获取帮助

如遇到问题，请：

1. **查看详细错误信息**: 测试输出会显示 HTTP 状态码和错误详情
2. **检查 OpManager 日志**: OpManager 服务器日志可能有更多信息
3. **参考文档**:
   - [OpManager API 官方文档](https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html)
   - [项目 API 使用分析](../OPMANAGER-API-USAGE-ANALYSIS.md)
4. **提交 Issue**: 附上完整的测试输出和环境信息

---

## 📋 测试清单

运行测试前，请确认：

- [ ] OpManager 服务正常运行
- [ ] `.env` 文件配置完整且正确
- [ ] API Key 有效且权限充足
- [ ] 网络连接正常，可访问 OpManager
- [ ] OpManager 中有测试数据（设备、接口、告警等）
- [ ] （可选）已配置业务视图用于拓扑测试

---

**版本**: 1.0.0
**最后更新**: 2026-01-23
**维护者**: 项目团队
