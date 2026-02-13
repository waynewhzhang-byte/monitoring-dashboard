#!/bin/bash
# 修复 AlarmList.tsx 的导入路径问题
# 在银河麒麟 Linux 服务器上运行此脚本

set -e

echo "🔧 修复 AlarmList.tsx 导入路径..."

# 文件路径
FILE="src/components/domain/AlarmList.tsx"

# 检查文件是否存在
if [ ! -f "$FILE" ]; then
    echo "❌ 错误: 文件不存在: $FILE"
    exit 1
fi

# 备份原文件
cp "$FILE" "$FILE.bak"
echo "✅ 已备份原文件: $FILE.bak"

# 修复导入路径
sed -i "s|from '../widgets/StatusIndicator'|from '@/components/widgets/StatusIndicator'|g" "$FILE"

# 验证修改
if grep -q "@/components/widgets/StatusIndicator" "$FILE"; then
    echo "✅ 导入路径已修复"
    echo ""
    echo "修复后的第 3 行："
    sed -n '3p' "$FILE"
else
    echo "⚠️  警告: 可能没有找到需要修复的内容"
    echo "当前文件内容："
    head -5 "$FILE"
fi

echo ""
echo "✨ 完成！现在可以运行 npm run build"
