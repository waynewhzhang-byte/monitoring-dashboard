#!/bin/bash
# 全面修复所有相对路径导入脚本
# 用于在银河麒麟 Linux 上修复所有导入路径问题

echo "🔧 全面修复所有导入路径..."
echo "=================================================="

# 项目根目录（自动检测）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1
echo "项目根目录: $PROJECT_ROOT"
echo ""

# 修复函数
fix_file() {
    local file="$1"
    local patterns="$2"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  文件不存在: $file"
        return
    fi
    
    echo "修复: $file"
    local fixed=false
    
    # 修复 ../../lib/ 路径
    if grep -q "from '../../lib/" "$file" 2>/dev/null; then
        sed -i "s|from '../../lib/prisma'|from '@/lib/prisma'|g" "$file"
        sed -i "s|from '../../lib/redis'|from '@/lib/redis'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../../lib/ 路径"
    fi
    
    # 修复 ../lib/ 路径
    if grep -q "from '../lib/" "$file" 2>/dev/null; then
        sed -i "s|from '../lib/prisma'|from '@/lib/prisma'|g" "$file"
        sed -i "s|from '../lib/redis'|from '@/lib/redis'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../lib/ 路径"
    fi
    
    # 修复 ../opmanager/ 路径
    if grep -q "from '../opmanager/" "$file" 2>/dev/null; then
        sed -i "s|from '../opmanager/client'|from '@/services/opmanager/client'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../opmanager/ 路径"
    fi
    
    # 修复 ../broadcast 路径
    if grep -q "from '../broadcast'" "$file" 2>/dev/null; then
        sed -i "s|from '../broadcast'|from '@/services/broadcast'|g" "$file"
        sed -i "s|from '../broadcast/'|from '@/services/broadcast/'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../broadcast 路径"
    fi
    
    # 修复 ../alarm/ 路径
    if grep -q "from '../alarm/" "$file" 2>/dev/null; then
        sed -i "s|from '../alarm/deduplicator'|from '@/services/alarm/deduplicator'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../alarm/ 路径"
    fi
    
    # 修复 ../types/ 路径
    if grep -q "from '../types/" "$file" 2>/dev/null; then
        sed -i "s|from '../types/dashboard-config'|from '@/types/dashboard-config'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../types/ 路径"
    fi
    
    # 修复 ../widgets/ 路径
    if grep -q "from '../widgets/" "$file" 2>/dev/null; then
        sed -i "s|from '../widgets/\([^']*\)'|from '@/components/widgets/\1'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../widgets/ 路径"
    fi
    
    # 修复 ../domain/ 路径
    if grep -q "from '../domain/" "$file" 2>/dev/null; then
        sed -i "s|from '../domain/\([^']*\)'|from '@/components/domain/\1'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../domain/ 路径"
    fi
    
    # 修复 ../topology/ 路径
    if grep -q "from '../topology/" "$file" 2>/dev/null; then
        sed -i "s|from '../topology/\([^']*\)'|from '@/components/topology/\1'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../topology/ 路径"
    fi
    
    # 修复 ../traffic/ 路径
    if grep -q "from '../traffic/" "$file" 2>/dev/null; then
        sed -i "s|from '../traffic/\([^']*\)'|from '@/components/traffic/\1'|g" "$file"
        fixed=true
        echo "  ✅ 修复 ../traffic/ 路径"
    fi
    
    if [ "$fixed" = true ]; then
        echo "  ✅ 文件已更新"
    else
        echo "  ℹ️  无需修复"
    fi
    echo ""
}

# 修复所有服务层文件
echo "📁 修复服务层文件..."
for file in src/services/collector/*.ts; do
    [ -f "$file" ] && fix_file "$file"
done

for file in src/services/alarm/*.ts; do
    [ -f "$file" ] && fix_file "$file"
done

for file in src/services/broadcast/*.ts; do
    [ -f "$file" ] && fix_file "$file"
done

# 修复 stores 文件
echo "📁 修复状态管理文件..."
for file in src/stores/*.ts; do
    [ -f "$file" ] && fix_file "$file"
done

# 修复组件文件
echo "📁 修复组件文件..."
find src/components -name "*.tsx" -o -name "*.ts" | while read -r file; do
    # 跳过测试文件
    if [[ "$file" != *"__tests__"* ]] && [[ "$file" != *".test."* ]]; then
        fix_file "$file"
    fi
done

echo "=================================================="
echo "✨ 所有导入路径修复完成！"
echo ""
echo "📋 下一步："
echo "   1. 运行 npm run type-check 验证类型"
echo "   2. 运行 npm run build 验证构建"
echo ""
