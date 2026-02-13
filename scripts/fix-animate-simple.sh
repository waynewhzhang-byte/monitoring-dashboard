#!/bin/bash
# 最简单直接的修复方法
# 修复 animate 方法的语法错误

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

# 显示问题区域
echo ""
echo "修复前的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

# 方法1: 直接修复 duration 后面的逗号
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' "$FILE"

# 方法2: 修复 }, { duration: 600, } 这种格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 方法3: 修复多行格式 }, { duration: 600, } 后面单独的 }
# 使用 perl 进行多行替换（如果可用）
if command -v perl &> /dev/null; then
    perl -i -pe '
        BEGIN { $/ = undef; }
        s/}, \{\s*duration:\s*600,\s*\}\s*\);/}, { duration: 600 });/g;
    ' "$FILE"
else
    # 使用 sed 处理多行（更复杂但可用）
    # 先修复单行格式
    sed -i ':a;N;$!ba;s/duration:\s*600,\s*\n\s*}\s*\n\s*);/duration: 600\n                  });/g' "$FILE"
fi

# 方法4: 确保 animate 调用后添加 setTimeout（如果还没有）
if ! grep -A 10 "duration: 600" "$FILE" | grep -q "setTimeout"; then
    # 在 }, { duration: 600 }); 后添加 setTimeout
    sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\
                  \
                  // Update label positions after animation completes\
                  setTimeout(() => {\
                    if (sigmaRef.current && graphRef.current) {\
                      updateLabelPositions();\
                    }\
                  }, 650);' "$FILE"
fi

echo ""
echo "修复后的代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

echo ""
echo "✅ 修复完成！"
