#!/bin/bash
# 修复所有构建问题的脚本
# 在银河麒麟 Linux 服务器上运行此脚本

set -e

echo "🔧 修复所有构建问题..."
echo ""

cd /opt/monitoring-app || { echo "❌ 错误: 请先进入项目目录"; exit 1; }

# 1. 修复所有 StatusIndicator 导入路径
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  修复 StatusIndicator 导入路径..."
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../widgets/StatusIndicator'|from '@/components/widgets/StatusIndicator'|g" {} \;
echo "✅ StatusIndicator 导入路径已修复"

# 2. 修复 layout.tsx（移除 Google Fonts）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  修复 layout.tsx（移除 Google Fonts）..."
if [ -f "src/app/layout.tsx" ]; then
    # 备份
    cp src/app/layout.tsx src/app/layout.tsx.bak
    
    # 移除 Google Fonts 导入
    sed -i "/import { Inter } from 'next\/font\/google'/d" src/app/layout.tsx
    sed -i "/const inter = Inter({ subsets: \['latin'\] })/d" src/app/layout.tsx
    
    # 修改 body 标签
    sed -i 's/className={inter.className}/className="font-sans antialiased"/g' src/app/layout.tsx
    
    echo "✅ layout.tsx 已修复"
else
    echo "⚠️  未找到 src/app/layout.tsx"
fi

# 3. 修复 HierarchicalTopologyViewer.tsx（Sigma.js animate 类型错误）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  修复 HierarchicalTopologyViewer.tsx..."
if [ -f "src/components/topology/HierarchicalTopologyViewer.tsx" ]; then
    # 备份
    cp src/components/topology/HierarchicalTopologyViewer.tsx src/components/topology/HierarchicalTopologyViewer.tsx.bak
    
    # 修复 animate 方法（移除 onComplete 回调及其内容，修复语法错误）
    # 使用 Python 或 Perl 进行更精确的多行替换
    python3 << 'PYTHON_SCRIPT'
import re

file_path = "src/components/topology/HierarchicalTopologyViewer.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 修复模式1: 移除 onComplete 回调（如果存在）
pattern1 = r',\s*\{\s*duration:\s*600,\s*onComplete:\s*\(\)\s*=>\s*\{[^}]*\}\s*\}'
replacement1 = ', { duration: 600 });\n                  \n                  // Update label positions after animation completes\n                  setTimeout(() => {\n                    if (sigmaRef.current && graphRef.current) {\n                      updateLabelPositions();\n                    }\n                  }, 650);'
content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# 修复模式2: 如果已经有正确的格式但缺少 setTimeout，添加它
if 'duration: 600' in content and 'setTimeout(() => {' not in content:
    # 查找 animate 调用后的位置
    pattern2 = r'(}, \{\s*duration: 600\s*\}\);)'
    replacement2 = r'\1\n                  \n                  // Update label positions after animation completes\n                  setTimeout(() => {\n                    if (sigmaRef.current && graphRef.current) {\n                      updateLabelPositions();\n                    }\n                  }, 650);'
    content = re.sub(pattern2, replacement2, content)

# 修复模式3: 修复多余的 } 括号（语法错误）
# 查找 }, { duration: 600, } 这种错误格式
pattern3 = r',\s*\{\s*duration:\s*600,\s*\}\s*\)'
replacement3 = ', { duration: 600 });'
content = re.sub(pattern3, replacement3, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 文件已修复")
PYTHON_SCRIPT
    
    if [ $? -eq 0 ]; then
        echo "✅ HierarchicalTopologyViewer.tsx 已修复"
    else
        # 如果 Python 不可用，使用 sed 备用方案
        echo "⚠️  Python 不可用，使用 sed 备用方案..."
        # 修复语法错误：移除多余的 } 和 onComplete
        sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*onComplete:[[:space:]]*()[[:space:]]*=>[[:space:]]*{[^}]*}[[:space:]]*}/}, { duration: 600 }/g' src/components/topology/HierarchicalTopologyViewer.tsx
        sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*);/a\                  \n                  // Update label positions after animation completes\n                  setTimeout(() => {\n                    if (sigmaRef.current && graphRef.current) {\n                      updateLabelPositions();\n                    }\n                  }, 650);' src/components/topology/HierarchicalTopologyViewer.tsx
        echo "✅ 已使用 sed 修复"
    fi
else
    echo "⚠️  未找到 src/components/topology/HierarchicalTopologyViewer.tsx"
fi

# 4. 验证修复
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  验证修复..."
echo ""
echo "检查是否还有相对路径导入 StatusIndicator："
if grep -r "from '../widgets/StatusIndicator'" src 2>/dev/null; then
    echo "⚠️  仍有文件使用相对路径，请手动检查"
else
    echo "✅ 所有 StatusIndicator 导入已修复"
fi

echo ""
echo "检查 layout.tsx："
if grep -q "font-sans antialiased" src/app/layout.tsx 2>/dev/null; then
    echo "✅ layout.tsx 已正确配置"
else
    echo "⚠️  layout.tsx 可能需要手动检查"
fi

# 5. 清理构建缓存
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  清理构建缓存..."
rm -rf .next
echo "✅ 构建缓存已清理"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 修复完成！"
echo ""
echo "下一步："
echo "  npm run build"
