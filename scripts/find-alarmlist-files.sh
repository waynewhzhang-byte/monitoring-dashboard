#!/bin/bash
# 查找所有 AlarmList.tsx 文件并检查其导入路径
# 在银河麒麟 Linux 服务器上运行此脚本

echo "🔍 查找所有 AlarmList.tsx 文件..."
echo ""

# 查找所有 AlarmList.tsx 文件（排除 node_modules 和 .next）
find . -name "AlarmList.tsx" -not -path "./node_modules/*" -not -path "./.next/*" | while read file; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 文件: $file"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 显示文件前 10 行
    echo "前 10 行内容："
    head -10 "$file"
    echo ""
    
    # 检查导入路径
    if grep -q "StatusIndicator" "$file"; then
        echo "⚠️  包含 StatusIndicator 导入："
        grep "StatusIndicator" "$file"
        echo ""
        
        # 检查是否是错误的相对路径
        if grep -q "from '../widgets/StatusIndicator'" "$file"; then
            echo "❌ 发现错误的相对路径导入！"
            echo "   需要修复为: from '@/components/widgets/StatusIndicator'"
            echo ""
        elif grep -q "from '@/components/widgets/StatusIndicator'" "$file"; then
            echo "✅ 导入路径正确"
            echo ""
        fi
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 查找完成"
echo ""
echo "如果发现错误的导入路径，请运行修复脚本："
echo "  ./scripts/fix-alarmlist-import.sh"
