# OpManager API 验证 - 快速开始

> 5 分钟快速验证所有 OpManager API 是否正常工作

---

## ⚡ 一键运行

```bash
npm run verify:opmanager-apis
```

---

## 📋 预检清单

运行前确认：

- [ ] ✅ OpManager 服务正常运行
- [ ] ✅ `.env` 文件已配置 `OPMANAGER_BASE_URL` 和 `OPMANAGER_API_KEY`
- [ ] ✅ 网络可以访问 OpManager
- [ ] ✅ OpManager 中至少有 1 个设备

---

## 🎯 预期结果

### ✅ 成功输出示例

```
================================================================================
  OpManager API 全面验证测试
================================================================================

总测试数: 8
成功数:   6
失败数:   2
成功率:   75.0%

✅ 设备列表 API         - 245ms - 10 条数据
✅ 接口列表 API         - 189ms - 24 条数据
✅ 告警列表 API         - 156ms - 5 条数据
✅ 设备摘要 API         - 201ms - 成功
...
```

---

## ❌ 常见错误速查

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `ECONNREFUSED` | 无法连接 OpManager | 检查 URL 和服务状态 |
| `401 Unauthorized` | API Key 无效 | 检查 `.env` 中的 API Key |
| `设备列表为空` | OpManager 无设备 | 在 OpManager 中添加设备 |
| `业务视图不存在` | 未配置业务视图 | 创建业务视图或跳过此测试 |

---

## 🔄 其他运行方式

### Mock 模式（测试脚本功能）

```bash
USE_MOCK_DATA=true npm run verify:opmanager-apis
```

### 生产环境（完整路径）

```bash
# Linux/Mac
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts

# Windows PowerShell
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
```

---

## 📖 详细文档

- 完整使用指南: [VERIFY-OPMANAGER-API-README.md](VERIFY-OPMANAGER-API-README.md)
- API 使用分析: [../OPMANAGER-API-USAGE-ANALYSIS.md](../OPMANAGER-API-USAGE-ANALYSIS.md)

---

## 💡 快速诊断流程

```
1. 运行测试
   ↓
2. 检查成功率
   ↓
3a. 成功率 = 100% → ✅ API 工作正常
   ↓
3b. 成功率 < 100% → 查看失败测试的错误信息
   ↓
4. 根据错误信息参考"常见错误速查"
   ↓
5. 修复问题后重新运行测试
```

---

**建议**: 在生产部署前、环境变更后、或遇到数据采集问题时运行此测试。
