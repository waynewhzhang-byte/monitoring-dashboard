#!/bin/bash
# 修复所有文件中 StatusIndicator 的相对路径导入
# 在银河麒麟 Linux 服务器上运行此脚本

set -e

echo "🔧 修复所有 StatusIndicator 导入路径..."
echo ""

# 查找所有包含相对路径导入 StatusIndicator 的文件
FILES=$(grep -r "from '../widgets/StatusIndicator'" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u)

if [ -z "$FILES" ]; then
    echo "✅ 未找到需要修复的文件"
    exit 0
fi

echo "找到以下文件需要修复："
echo "$FILES"
echo ""

# 修复每个文件
for file in $FILES; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 处理文件: $file"
    
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
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 修复完成！"
echo ""
echo "下一步："
echo "  1. 清理构建缓存: rm -rf .next"
echo "  2. 重新构建: npm run build"
