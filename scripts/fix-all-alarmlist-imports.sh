#!/bin/bash
# 修复所有 AlarmList.tsx 文件的导入路径
# 在银河麒麟 Linux 服务器上运行此脚本

set -e

echo "🔧 修复所有 AlarmList.tsx 文件的导入路径..."
echo ""

# 查找所有 AlarmList.tsx 文件
FILES=$(find . -name "AlarmList.tsx" -not -path "./node_modules/*" -not -path "./.next/*")

if [ -z "$FILES" ]; then
    echo "❌ 未找到任何 AlarmList.tsx 文件"
    exit 1
fi

# 修复每个文件
echo "$FILES" | while read file; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 处理文件: $file"
    
    # 检查是否需要修复
    if grep -q "from '../widgets/StatusIndicator'" "$file"; then
        # 备份原文件
        cp "$file" "$file.bak"
        echo "✅ 已备份: $file.bak"
        
        # 修复导入路径
        sed -i "s|from '../widgets/StatusIndicator'|from '@/components/widgets/StatusIndicator'|g" "$file"
        
        # 验证修复
        if grep -q "from '@/components/widgets/StatusIndicator'" "$file"; then
            echo "✅ 已修复导入路径"
            echo "   修复后: $(grep 'StatusIndicator' "$file" | head -1)"
        else
            echo "⚠️  修复可能失败，请手动检查"
        fi
    elif grep -q "from '@/components/widgets/StatusIndicator'" "$file"; then
        echo "✅ 导入路径已正确，无需修复"
    else
        echo "ℹ️  未找到 StatusIndicator 导入"
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 修复完成！"
echo ""
echo "下一步："
echo "  1. 清理构建缓存: rm -rf .next"
echo "  2. 重新构建: npm run build"
