# 跨平台部署指南

## 问题背景

在 Windows 和 Linux 环境下，相对路径导入可能导致构建失败。为了确保跨平台兼容性，我们统一使用 TypeScript 路径别名。

## 已完成的修复

### 1. 导入路径统一修复

所有组件文件中的相对路径导入已修复为路径别名：

| 文件                    | 修复内容                                                              |
| ----------------------- | --------------------------------------------------------------------- |
| `DeviceDetailPanel.tsx` | `../widgets/MetricChart` → `@/components/widgets/MetricChart`         |
| `WidgetRenderer.tsx`    | 所有 `../widgets/`, `../domain/`, `../traffic/` → `@/components/...`  |
| `TaggedDevicePanel.tsx` | `../widgets/MiniMetricChart` → `@/components/widgets/MiniMetricChart` |
| `TopologyViewer.tsx`    | `../topology/custom/...` → `@/components/topology/custom/...`         |

### 2. 数据库迁移修复

- ✅ 添加了 `Device.tags` 字段迁移
- ✅ 添加了 `Interface.tags` 字段迁移
- ✅ 迁移文件已包含在打包中

## 部署前准备

### Windows 环境

1. **修复导入路径**（如果需要）：

   ```powershell
   .\scripts\fix-all-relative-imports.ps1
   ```

2. **验证构建**：

   ```powershell
   npm run type-check
   npm run build
   ```

3. **重新打包**：
   ```powershell
   .\scripts\repackage-for-deployment.ps1
   ```

### 生成的文件

- `monitoring-dashboard-deploy.zip` - 应用包（包含所有修复）
- `monitoring-dashboard-db-backup.dump` - 数据库备份（包含 tags 字段）

## 银河麒麟 Linux 部署步骤

### 1. 上传文件

```bash
# 上传应用包和数据库备份到服务器
scp monitoring-dashboard-deploy.zip root@server:/opt/
scp monitoring-dashboard-db-backup.dump root@server:/opt/
```

### 2. 解压应用

```bash
cd /opt
unzip monitoring-dashboard-deploy.zip -d monitoring-app
cd monitoring-app
```

### 3. 导入数据库

```bash
chmod +x scripts/import-database.sh
./scripts/import-database.sh /opt/monitoring-dashboard-db-backup.dump
```

### 4. 安装依赖

```bash
npm install
```

### 5. 生成 Prisma Client

```bash
npm run db:generate
```

### 6. 应用数据库迁移

```bash
npx prisma migrate deploy
```

### 7. 构建项目

```bash
npm run build
```

**注意**：如果构建时出现导入路径错误，运行修复脚本：

```bash
chmod +x scripts/fix-import-paths.sh
./scripts/fix-import-paths.sh
npm run build
```

### 8. 启动服务

```bash
pm2 start ecosystem.config.js
```

## 验证清单

### 构建验证

- [ ] `npm run type-check` 通过
- [ ] `npm run build` 成功
- [ ] 无导入路径错误
- [ ] 无类型错误

### 数据库验证

- [ ] 数据库导入成功
- [ ] `Device.tags` 字段存在
- [ ] `Interface.tags` 字段存在
- [ ] 迁移状态正常

### 运行时验证

- [ ] Web 服务启动成功
- [ ] 数据采集服务启动成功
- [ ] API 接口正常
- [ ] 前端页面正常显示

## 常见问题

### Q1: 构建时出现 "Cannot find module '../widgets/...'"

**原因**：相对路径导入未修复

**解决**：

```bash
# Linux
./scripts/fix-import-paths.sh

# Windows
.\scripts\fix-all-relative-imports.ps1
```

### Q2: 数据库迁移失败

**原因**：迁移文件缺失或数据库连接问题

**解决**：

1. 检查 `prisma/migrations/` 目录是否包含所有迁移文件
2. 检查 `.env` 中的 `DATABASE_URL` 配置
3. 运行 `npx prisma migrate deploy`

### Q3: 构建时出现 "The column Device.tags does not exist"

**原因**：数据库迁移未应用

**解决**：

```bash
npx prisma migrate deploy
npm run db:generate
npm run build
```

## 路径别名配置

在 `tsconfig.json` 中已配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 最佳实践

### ✅ 推荐做法

```typescript
// 使用路径别名
import { MetricChart } from "@/components/widgets/MetricChart";
import { DeviceList } from "@/components/domain/DeviceList";
import { prisma } from "@/lib/prisma";
```

### ❌ 避免做法

```typescript
// 不要使用相对路径（跨平台可能失败）
import { MetricChart } from "../widgets/MetricChart";
import { DeviceList } from "../../components/domain/DeviceList";
```

## 相关文档

- `IMPORT-PATH-FIX-GUIDE.md` - 导入路径修复详细指南
- `DATABASE-TAGS-FIELD-FIX.md` - 数据库 tags 字段修复指南
- `PRODUCTION-STARTUP-GUIDE.md` - 生产环境启动指南
