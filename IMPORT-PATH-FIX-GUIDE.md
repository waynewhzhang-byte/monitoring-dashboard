# 导入路径修复指南

## 问题描述

在 Windows 和 Linux 环境下，相对路径导入可能导致构建失败，因为：
1. **路径分隔符不同**：Windows 使用 `\`，Linux 使用 `/`
2. **路径解析差异**：不同操作系统对相对路径的解析可能不同
3. **构建工具兼容性**：Next.js 在跨平台构建时可能无法正确解析相对路径

## 解决方案

**统一使用 TypeScript 路径别名**，而不是相对路径。

### 路径别名配置

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

### 修复规则

| 相对路径 | 路径别名 |
|---------|---------|
| `from '../widgets/...'` | `from '@/components/widgets/...'` |
| `from '../domain/...'` | `from '@/components/domain/...'` |
| `from '../topology/...'` | `from '@/components/topology/...'` |
| `from '../traffic/...'` | `from '@/components/traffic/...'` |
| `from '../../lib/...'` | `from '@/lib/...'` |
| `from '../../types/...'` | `from '@/types/...'` |

## 已修复的文件

### 组件文件
1. ✅ `src/components/device/DeviceDetailPanel.tsx`
   - `../widgets/MetricChart` → `@/components/widgets/MetricChart`

2. ✅ `src/components/dashboard-builder/WidgetRenderer.tsx`
   - `../widgets/StatCard` → `@/components/widgets/StatCard`
   - `../widgets/MetricChart` → `@/components/widgets/MetricChart`
   - `../domain/DeviceList` → `@/components/domain/DeviceList`
   - `../domain/AlarmList` → `@/components/domain/AlarmList`
   - `../domain/TopologyViewer` → `@/components/domain/TopologyViewer`
   - `../traffic/TopTrafficList` → `@/components/traffic/TopTrafficList`

3. ✅ `src/components/dashboard/TaggedDevicePanel.tsx`
   - `../widgets/MiniMetricChart` → `@/components/widgets/MiniMetricChart`

4. ✅ `src/components/domain/TopologyViewer.tsx`
   - `../topology/custom/CustomNode` → `@/components/topology/custom/CustomNode`
   - `../topology/custom/CustomEdge` → `@/components/topology/custom/CustomEdge`

## 修复脚本

### Windows (PowerShell)
```powershell
.\scripts\fix-all-relative-imports.ps1
```

### Linux (Bash)
```bash
chmod +x scripts/fix-import-paths.sh
./scripts/fix-import-paths.sh
```

## 验证修复

### 1. 类型检查
```bash
npm run type-check
```

### 2. 构建验证
```bash
npm run build
```

### 3. 检查相对路径
```bash
# Windows PowerShell
Select-String -Path "src\components\**\*.tsx" -Pattern "from ['\"]\.\.\/" -Recurse

# Linux/Mac
grep -r "from ['\"]\.\.\/" src/components/
```

## 最佳实践

### ✅ 推荐做法
```typescript
// 使用路径别名
import { MetricChart } from '@/components/widgets/MetricChart';
import { DeviceList } from '@/components/domain/DeviceList';
import { prisma } from '@/lib/prisma';
```

### ❌ 避免做法
```typescript
// 不要使用相对路径
import { MetricChart } from '../widgets/MetricChart';
import { DeviceList } from '../../components/domain/DeviceList';
```

## 注意事项

1. **服务层文件**：`src/services/` 中的文件可以使用相对路径，因为它们不在组件目录中
2. **测试文件**：`__tests__/` 中的文件可以使用相对路径导入被测试的文件
3. **API 路由**：`src/pages/api/` 中的文件可以使用相对路径

## 跨平台兼容性

使用路径别名后：
- ✅ Windows 构建正常
- ✅ Linux 构建正常
- ✅ Mac 构建正常
- ✅ CI/CD 环境兼容

## 相关文件

- `tsconfig.json` - TypeScript 路径别名配置
- `scripts/fix-all-relative-imports.ps1` - Windows 修复脚本
- `scripts/fix-import-paths.sh` - Linux 修复脚本
