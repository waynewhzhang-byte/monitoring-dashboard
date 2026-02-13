# 构建问题修复总结

## ✅ 已修复的问题

### 1. StatusIndicator 导入路径问题

**问题**：多个文件使用相对路径 `'../widgets/StatusIndicator'`，导致构建时类型检查失败。

**修复**：将所有相对路径改为使用 TypeScript 路径别名 `'@/components/widgets/StatusIndicator'`。

**修复的文件**：
- `src/components/domain/AlarmList.tsx`
- `src/components/domain/DeviceList.tsx`
- `src/components/dashboard/CriticalDevicesPanel.tsx`
- `src/components/dashboard/OverviewStats.tsx`
- `src/components/device/DeviceDetailPanel.tsx`

### 2. Sigma.js animate 类型错误

**问题**：`HierarchicalTopologyViewer.tsx` 中使用了不支持的 `onComplete` 回调。

**修复**：移除 `onComplete` 回调，使用 `setTimeout` 延迟执行。

**修复位置**：`src/components/topology/HierarchicalTopologyViewer.tsx` 第 236-247 行

### 3. Google Fonts 连接超时

**问题**：构建时尝试从 Google Fonts 下载字体，但服务器无法访问外网。

**修复**：移除 Google Fonts 依赖，使用系统默认字体。

**修复位置**：`src/app/layout.tsx`

---

## 🚀 在服务器上应用修复

### 方法 1：使用修复脚本（推荐）

```bash
cd /opt/monitoring-app

# 给脚本添加执行权限
chmod +x scripts/fix-all-build-issues.sh

# 运行修复脚本
./scripts/fix-all-build-issues.sh

# 重新构建
npm run build
```

### 方法 2：手动修复

```bash
cd /opt/monitoring-app

# 1. 修复所有 StatusIndicator 导入
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../widgets/StatusIndicator'|from '@/components/widgets/StatusIndicator'|g" {} \;

# 2. 修复 layout.tsx
sed -i "/import { Inter } from 'next\/font\/google'/d" src/app/layout.tsx
sed -i "/const inter = Inter({ subsets: \['latin'\] })/d" src/app/layout.tsx
sed -i 's/className={inter.className}/className="font-sans antialiased"/g' src/app/layout.tsx

# 3. 清理并重建
rm -rf .next
npm run build
```

---

## 📋 验证修复

修复后，运行以下命令验证：

```bash
# 检查是否还有相对路径导入
grep -r "from '../widgets/StatusIndicator'" src || echo "✅ 所有文件已修复"

# 检查 layout.tsx
grep "font-sans" src/app/layout.tsx && echo "✅ layout.tsx 已修复"

# 运行构建
npm run build
```

---

## ⚠️ 注意事项

1. **数据库字段问题**：构建时可能看到数据库字段不存在的警告（如 `Interface.tags`），这是正常的，因为构建时尝试访问数据库。确保生产环境数据库已正确迁移。

2. **动态路由警告**：构建时可能看到 "Dynamic server usage" 警告，这是正常的，因为这些 API 路由需要在运行时动态处理。

3. **API_KEY 警告**：生产环境建议设置 `API_KEY` 环境变量以保护 API 端点。

---

## ✅ 构建成功标志

构建成功后，应该看到：

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (X/X)
✓ Finalizing page optimization
```

如果看到这些标志，说明构建成功！
