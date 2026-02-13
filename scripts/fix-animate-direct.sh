#!/bin/bash
# 直接修复 animate 语法错误
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

# 显示问题区域
echo ""
echo "当前代码（第 236-250 行）："
sed -n '236,250p' "$FILE"

# 使用 awk 进行精确修复
awk '
/}, \{/ && /duration: 600/ {
    # 找到 animate 调用
    in_animate = 1
    print
    getline
    # 修复 duration 行
    if (/duration:[[:space:]]*600,[[:space:]]*$/) {
        gsub(/duration:[[:space:]]*600,/, "duration: 600")
    }
    print
    getline
    # 如果下一行是单独的 }，跳过它
    if (/^[[:space:]]*\}[[:space:]]*$/) {
        getline
    }
    # 打印 });
    if (/^[[:space:]]*\}\);[[:space:]]*$/) {
        print
        # 检查是否需要添加 setTimeout
        if (!added_settimeout) {
            print "                  "
            print "                  // Update label positions after animation completes"
            print "                  setTimeout(() => {"
            print "                    if (sigmaRef.current && graphRef.current) {"
            print "                      updateLabelPositions();"
            print "                    }"
            print "                  }, 650);"
            added_settimeout = 1
        }
        next
    }
}
{ print }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 更简单的方法：直接使用 sed 修复常见错误
# 修复1: 移除 duration 后面的逗号
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' "$FILE"

# 修复2: 修复 }, { duration: 600, } 格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' "$FILE"

# 修复3: 如果 }, { duration: 600 } 后面还有单独的 }
sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*$/{
    N
    s/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}\n[[:space:]]*\}[[:space:]]*);/}, { duration: 600 });/
}' "$FILE"

# 修复4: 确保有 setTimeout
if ! grep -A 10 "duration: 600" "$FILE" | grep -q "setTimeout"; then
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
