#!/bin/bash
# Prisma Schema 同步脚本
# 用途：将数据库实际结构同步到 Prisma schema

echo "🔄 Prisma Schema 同步工具"
echo "=================================================="
echo ""

# 项目根目录（自动检测）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    exit 1
fi

echo "📋 选项："
echo "   1. 从数据库拉取结构到 Prisma schema (db pull)"
echo "   2. 检查数据库和 schema 的差异 (migrate diff)"
echo "   3. 生成迁移文件以同步差异 (migrate dev)"
echo "   4. 查看当前迁移状态 (migrate status)"
echo ""

read -p "请选择操作 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔄 从数据库拉取结构..."
        echo "⚠️  警告: 这将覆盖现有的 schema.prisma 文件"
        read -p "是否继续? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            # 备份现有 schema
            backup_file="prisma/schema.prisma.backup.$(date +%Y%m%d%H%M%S)"
            cp "prisma/schema.prisma" "$backup_file"
            echo "✅ 已备份现有 schema 到: $backup_file"
            
            # 执行 db pull
            npx prisma db pull
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Schema 同步成功！"
                echo "📝 请检查 prisma/schema.prisma 文件，确认更改是否正确"
                echo "📝 备份文件: $backup_file"
            else
                echo ""
                echo "❌ Schema 同步失败"
                echo "📝 已恢复备份文件"
                cp "$backup_file" "prisma/schema.prisma" -f
            fi
        else
            echo "操作已取消"
        fi
        ;;
    2)
        echo ""
        echo "🔍 检查数据库和 schema 的差异..."
        npx prisma migrate diff \
            --from-schema-datamodel prisma/schema.prisma \
            --to-schema-datasource prisma/schema.prisma \
            --script
        ;;
    3)
        echo ""
        echo "📝 生成迁移文件..."
        read -p "请输入迁移名称（例如: sync_database_changes）: " migration_name
        if [ -n "$migration_name" ]; then
            npx prisma migrate dev --name "$migration_name" --create-only
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ 迁移文件已创建"
                echo "📝 请检查生成的迁移文件，确认 SQL 语句正确"
                echo "📝 然后运行: npx prisma migrate deploy"
            else
                echo ""
                echo "❌ 迁移文件创建失败"
            fi
        else
            echo "迁移名称不能为空"
        fi
        ;;
    4)
        echo ""
        echo "📊 查看迁移状态..."
        npx prisma migrate status
        ;;
    *)
        echo "无效的选择"
        exit 1
        ;;
esac

echo ""
echo "✨ 完成！"
