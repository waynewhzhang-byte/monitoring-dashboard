#!/bin/bash
# 修复 HierarchicalTopologyViewer.tsx 的语法错误（简单版本）
# 直接修复 animate 方法的语法问题

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

# 修复1: 移除 duration 后面的逗号和多余的 }
sed -i 's/duration:[[:space:]]*600,[[:space:]]*}/duration: 600/g' "$FILE"

# 修复2: 修复 }, { duration: 600, } 这种格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 修复3: 确保 animate 调用格式正确
# 查找并修复所有可能的错误格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 修复4: 如果 animate 调用后没有 setTimeout，添加它
if ! grep -A 10 "duration: 600" "$FILE" | grep -q "setTimeout"; then
    # 在 animate 调用后添加 setTimeout
    sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\
                  \
                  // Update label positions after animation completes\
                  setTimeout(() => {\
                    if (sigmaRef.current && graphRef.current) {\
                      updateLabelPositions();\
                    }\
                  }, 650);' "$FILE"
fi

# 验证修复
echo ""
echo "验证修复后的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

echo ""
echo "检查是否还有语法错误："
if grep -n "duration:.*600.*," "$FILE" | grep -v "setTimeout"; then
    echo "⚠️  可能还有问题，请检查"
else
    echo "✅ 语法错误已修复"
fi

echo ""
echo "✅ 修复完成！"
