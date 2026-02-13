#!/bin/bash
# 修复 HierarchicalTopologyViewer.tsx 的语法错误
# 专门修复 animate 方法的语法问题

set -e

FILE="src/components/topology/HierarchicalTopologyViewer.tsx"

if [ ! -f "$FILE" ]; then
    echo "❌ 错误: 文件不存在: $FILE"
    exit 1
fi

echo "🔧 修复 $FILE 的语法错误..."

# 备份
cp "$FILE" "$FILE.bak"
echo "✅ 已备份: $FILE.bak"

# 修复方法：使用 sed 精确修复语法错误
# 修复模式1: }, { duration: 600, }  -> }, { duration: 600 });
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 修复模式2: 如果有多余的 } 在 duration 后面
sed -i 's/duration:[[:space:]]*600,[[:space:]]*}/duration: 600/g' "$FILE"

# 修复模式3: 确保 animate 调用后添加 setTimeout（如果还没有）
if ! grep -q "setTimeout.*updateLabelPositions" "$FILE" 2>/dev/null; then
    # 在 animate 调用后添加 setTimeout
    sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\                  \n                  // Update label positions after animation completes\n                  setTimeout(() => {\n                    if (sigmaRef.current && graphRef.current) {\n                      updateLabelPositions();\n                    }\n                  }, 650);' "$FILE"
fi

# 验证修复
echo ""
echo "验证修复后的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

echo ""
echo "✅ 修复完成！"
