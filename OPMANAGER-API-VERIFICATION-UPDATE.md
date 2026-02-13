# OpManager API 验证脚本 - ts-node 适配说明

> 更新时间: 2026-01-23
> 适配原因: 生产环境使用 ts-node 而非 tsx

---

## 📦 已完成的更改

### 1. 添加 npm script

**文件**: [package.json](package.json)

```json
"verify:opmanager-apis": "ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts"
```

**位置**: 在 `test:alarm-sync` 之后

---

### 2. 更新文档 - 使用指南

**文件**: [scripts/VERIFY-OPMANAGER-API-README.md](scripts/VERIFY-OPMANAGER-API-README.md)

**更改内容**:
- ✅ 添加推荐的 npm script 运行方式
- ✅ 添加 ts-node 直接运行方式
- ✅ 移除 npx tsx 命令引用
- ✅ 提供 Windows 和 Linux/Mac 两种平台的完整命令

---

### 3. 更新文档 - API 使用分析报告

**文件**: [OPMANAGER-API-USAGE-ANALYSIS.md](OPMANAGER-API-USAGE-ANALYSIS.md)

**更改内容**:
- ✅ 更新"快速运行测试"部分
- ✅ 使用 npm run 命令替代 npx tsx
- ✅ 添加 ts-node 直接运行选项

---

### 4. 新增快速开始指南

**文件**: [scripts/QUICK-START-VERIFY-API.md](scripts/QUICK-START-VERIFY-API.md)

**内容**:
- ⚡ 一键运行命令
- 📋 预检清单
- 🎯 预期结果示例
- ❌ 常见错误速查表
- 💡 快速诊断流程图

---

## 🚀 现在如何运行测试

### ✨ 推荐方式（最简单）

```bash
npm run verify:opmanager-apis
```

### 🔧 生产环境完整命令

```bash
# Linux/Mac
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Windows PowerShell
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
```

### 🧪 Mock 模式测试

```bash
# 使用 npm script
USE_MOCK_DATA=true npm run verify:opmanager-apis

# 或完整命令
USE_MOCK_DATA=true ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
```

---

## ✅ 兼容性保证

### TypeScript 配置

脚本使用项目已有的 TypeScript 配置：

- **tsconfig.node.json**: CommonJS 模块系统
- **tsconfig-paths/register**: 支持路径别名 `@/*`
- **模块解析**: Node.js 标准解析

### 依赖要求

所有依赖均为项目已安装包，无需额外安装：

- ✅ `ts-node`: 已安装（DevDependencies）
- ✅ `tsconfig-paths`: 已安装（DevDependencies）
- ✅ 其他依赖: 均为项目依赖

---

## 📊 测试脚本特性

### 测试覆盖

脚本测试 **8 个 OpManager REST API**：

| # | API 端点 | 功能 | 状态 |
|---|---------|------|------|
| 1 | `/api/json/v2/device/listDevices` | 设备列表（分页） | ✅ 已启用 |
| 2 | `/api/json/device/getInterfaces` | 设备接口 | ✅ 已启用 |
| 3 | `/api/json/alarm/listAlarms` | 活动告警 | ✅ 已启用 |
| 4 | `/api/json/device/getDeviceSummary` | 设备性能摘要 | ✅ 已启用 |
| 5 | `/api/json/device/getGraphData` | 图表数据 | ⚠️ 已定义未启用 |
| 6 | `/api/json/dashboard/getWidgetData` | 仪表板小部件 | ⚠️ 已定义未启用 |
| 7 | `/api/json/businessview/getBVDetails` | 业务视图拓扑 | ✅ 已启用 |
| 8 | `/api/json/businessview/getBusinessDetailsView` | 业务视图详情 | ✅ 已启用 |

### 输出特性

- ✅ **彩色终端输出**: 使用 ANSI 颜色代码，清晰易读
- ✅ **详细数据验证**: 检查字段完整性、数据格式
- ✅ **性能测量**: 记录每个 API 的响应时间
- ✅ **示例数据展示**: 显示返回数据的样本
- ✅ **汇总报告**: 成功率统计、错误/警告汇总
- ✅ **智能建议**: 根据测试结果提供修复建议

---

## 🔍 与其他脚本的一致性

项目中其他 ts-node 脚本采用相同格式：

```bash
# 设备同步检查
npm run check:sync
# 实际命令: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-device-sync-status.ts

# 告警同步检查
npm run check:alarms
# 实际命令: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-alarm-sync.ts

# API 验证（新增）
npm run verify:opmanager-apis
# 实际命令: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
```

**好处**:
- 命令格式统一
- 开发和生产环境一致
- 符合项目规范

---

## 📝 环境变量配置

脚本读取以下环境变量（通过 `.env` 文件）:

```bash
# OpManager API 配置
OPMANAGER_BASE_URL=https://your-opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=30000

# 可选: Mock 模式
USE_MOCK_DATA=false  # false=真实API, true=Mock数据
```

---

## 🎯 使用场景

### 1. 初次部署验证

```bash
# 部署完成后，验证 OpManager 连接
npm run verify:opmanager-apis
```

### 2. 环境迁移验证

```bash
# 切换到生产环境后
cd /path/to/monitoring-dashboard
npm run verify:opmanager-apis
```

### 3. 故障排查

```bash
# 数据采集异常时，快速定位问题
npm run verify:opmanager-apis
# 查看输出，找到失败的 API
# 根据错误信息进行修复
```

### 4. 定期健康检查

```bash
# 通过 cron 或定时任务
0 */6 * * * cd /path/to/monitoring-dashboard && npm run verify:opmanager-apis
```

---

## 🆚 tsx vs ts-node 对比

| 特性 | tsx | ts-node | 选择原因 |
|------|-----|---------|---------|
| 模块系统 | ESM 优先 | CommonJS 优先 | 生产环境使用 CommonJS |
| 启动速度 | 快 | 较慢 | 一次性脚本，速度影响小 |
| 配置复杂度 | 低 | 需要 tsconfig | 项目已配置 tsconfig.node.json |
| 生产环境支持 | 需要安装 | 已安装 | 生产环境限制 |
| 路径别名 | 自动支持 | 需 tsconfig-paths | 项目已配置 tsconfig-paths |

**结论**: 虽然 tsx 更快更简单，但生产环境限制要求使用 ts-node。

---

## 📚 相关文档

1. **完整使用指南**: [scripts/VERIFY-OPMANAGER-API-README.md](scripts/VERIFY-OPMANAGER-API-README.md)
   - 详细的测试说明
   - 7 个常见问题及解决方案
   - 自定义测试参数方法

2. **快速开始指南**: [scripts/QUICK-START-VERIFY-API.md](scripts/QUICK-START-VERIFY-API.md)
   - 5 分钟快速上手
   - 预检清单
   - 常见错误速查表

3. **API 使用分析**: [OPMANAGER-API-USAGE-ANALYSIS.md](OPMANAGER-API-USAGE-ANALYSIS.md)
   - 8 个 API 详细说明
   - 数据映射策略
   - 性能优化措施

4. **项目开发规范**: [CLAUDE.md](CLAUDE.md)
   - 项目特定规范
   - OpManager 集成规范

---

## ✅ 验证清单

部署前请确认：

- [ ] `package.json` 中有 `verify:opmanager-apis` script
- [ ] `.env` 文件已正确配置 OpManager 连接信息
- [ ] 运行 `npm run verify:opmanager-apis` 能成功执行
- [ ] 测试输出显示至少 6/8 API 成功（业务视图相关可能为空）
- [ ] 查看文档 [QUICK-START-VERIFY-API.md](scripts/QUICK-START-VERIFY-API.md)

---

## 🔄 后续优化建议

### 可选优化（未来）

1. **添加 JSON 输出模式**
   ```bash
   npm run verify:opmanager-apis -- --format=json > test-result.json
   ```

2. **集成到 CI/CD**
   ```yaml
   - name: Verify OpManager APIs
     run: npm run verify:opmanager-apis
   ```

3. **添加性能基准测试**
   - 记录每次测试的响应时间
   - 生成性能趋势报告

4. **告警阈值检查**
   - 响应时间 > 5s 告警
   - 失败率 > 25% 告警

---

**更新完成时间**: 2026-01-23
**适配状态**: ✅ 已完成
**验证状态**: 待用户验证

---

## 💬 反馈

如遇问题，请提供：
1. 完整的测试输出
2. `.env` 配置（脱敏后）
3. OpManager 版本信息
4. 操作系统和 Node.js 版本
