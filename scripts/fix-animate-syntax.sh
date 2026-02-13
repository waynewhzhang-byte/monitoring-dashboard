#!/bin/bash
# 修复 HierarchicalTopologyViewer.tsx 中 animate 方法的语法错误
# 修复: }, { duration: 600, }  -> }, { duration: 600 });

set -e

FILE="src/components/topology/HierarchicalTopologyViewer.tsx"

if [ ! -f "$FILE" ]; then
    echo "❌ 错误: 文件不存在: $FILE"
    exit 1
fi

echo "🔧 修复 $FILE 的 animate 语法错误..."

# 备份
cp "$FILE" "$FILE.bak"
echo "✅ 已备份: $FILE.bak"

# 显示修复前的代码
echo ""
echo "修复前的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

# 修复1: 移除 duration 后面的逗号（如果存在）
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' "$FILE"

# 修复2: 修复 }, { duration: 600, } 这种格式（移除逗号和多余的 }）
# 使用更精确的模式匹配
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 修复3: 如果还有 }, { duration: 600 } 后面有多余的 }
sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*);/{
    N
    s/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*\n[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/
}' "$FILE"

# 修复4: 确保 animate 调用后添加 setTimeout（如果还没有）
if ! grep -A 15 "duration: 600" "$FILE" | grep -q "setTimeout"; then
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

# 显示修复后的代码
echo ""
echo "修复后的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

# 验证语法
echo ""
echo "检查语法错误："
if grep -n "duration:.*600.*," "$FILE" | grep -v "setTimeout" | grep -v "//"; then
    echo "⚠️  可能还有问题"
    grep -n "duration:.*600.*," "$FILE" | grep -v "setTimeout" | grep -v "//"
else
    echo "✅ 语法错误已修复"
fi

echo ""
echo "✅ 修复完成！"
