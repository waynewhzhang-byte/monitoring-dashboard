#!/bin/bash
# PostgreSQL 数据库导入脚本
# 用途：在银河麒麟 Linux 上导入 monitoring-dashboard 数据库

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🗄️  PostgreSQL 数据库导入工具${NC}"
echo -e "${WHITE}==================================================${NC}"

# 1. 检查参数
BACKUP_FILE="${1:-monitoring-dashboard-db-backup.dump}"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ 错误: 备份文件不存在: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}   用法: ./import-database.sh [备份文件路径]${NC}"
    echo -e "${YELLOW}   示例: ./import-database.sh monitoring-dashboard-db-backup.dump${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 找到备份文件: $BACKUP_FILE${NC}"

# 2. 检查 .env 文件
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 错误: 未找到 .env 文件${NC}"
    echo -e "${YELLOW}   请确保项目根目录存在 .env 文件，并包含 DATABASE_URL 配置${NC}"
    exit 1
fi

# 3. 读取 DATABASE_URL
echo -e "${YELLOW}📖 读取数据库配置...${NC}"
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2- | sed "s/^['\"]//;s/['\"]$//")

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ 错误: .env 文件中未找到 DATABASE_URL${NC}"
    exit 1
fi

# 4. 解析数据库连接信息
# DATABASE_URL 格式: postgresql://user:password@host:port/database?schema=public
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
# 提取数据库名称，去掉 ? 后面的查询参数
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^/]*/\([^?]*\).*|\1|p')

if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ 错误: 无法解析 DATABASE_URL${NC}"
    echo -e "${YELLOW}   期望格式: postgresql://user:password@host:port/database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 已读取数据库配置${NC}"
echo -e "${WHITE}   数据库: $DB_NAME${NC}"
echo -e "${WHITE}   主机: $DB_HOST:$DB_PORT${NC}"
echo -e "${WHITE}   用户: $DB_USER${NC}"

# 5. 检查 pg_restore 或 psql 是否可用
echo -e "${YELLOW}🔍 检查 PostgreSQL 工具...${NC}"

# 判断备份文件格式
if [[ "$BACKUP_FILE" == *.dump ]] || file "$BACKUP_FILE" | grep -q "PostgreSQL custom"; then
    # 自定义格式，使用 pg_restore
    if ! command -v pg_restore &> /dev/null; then
        echo -e "${RED}❌ 错误: 未找到 pg_restore 命令${NC}"
        echo -e "${YELLOW}   请安装 PostgreSQL 客户端工具${NC}"
        echo -e "${YELLOW}   sudo yum install postgresql -y  # 或 sudo apt install postgresql-client -y${NC}"
        exit 1
    fi
    RESTORE_CMD="pg_restore"
    echo -e "${GREEN}✅ 找到 pg_restore${NC}"
else
    # SQL 格式，使用 psql
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ 错误: 未找到 psql 命令${NC}"
        echo -e "${YELLOW}   请安装 PostgreSQL 客户端工具${NC}"
        exit 1
    fi
    RESTORE_CMD="psql"
    echo -e "${GREEN}✅ 找到 psql${NC}"
fi

# 6. 检查数据库连接
echo -e "${YELLOW}🔗 测试数据库连接...${NC}"
export PGPASSWORD="$DB_PASSWORD"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ 错误: 无法连接到 PostgreSQL 服务器${NC}"
    echo -e "${YELLOW}   请检查:" -e "${NC}"
    echo -e "${YELLOW}   1. PostgreSQL 服务是否运行${NC}"
    echo -e "${YELLOW}   2. 数据库连接信息是否正确${NC}"
    echo -e "${YELLOW}   3. 防火墙规则是否允许连接${NC}"
    unset PGPASSWORD
    exit 1
fi

echo -e "${GREEN}✅ 数据库连接成功${NC}"

# 7. 检查目标数据库是否存在
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠️  目标数据库 '$DB_NAME' 已存在${NC}"
    read -p "是否删除并重新创建? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  删除现有数据库...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" || {
            echo -e "${RED}❌ 删除数据库失败，可能需要先断开所有连接${NC}"
            echo -e "${YELLOW}   可以手动执行: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();\"${NC}"
            unset PGPASSWORD
            exit 1
        }
        echo -e "${GREEN}✅ 数据库已删除${NC}"
    else
        echo -e "${YELLOW}⚠️  将直接导入到现有数据库（可能覆盖数据）${NC}"
    fi
fi

# 8. 创建数据库（如果不存在）
if [ "$DB_EXISTS" != "1" ] || [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📝 创建数据库...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || {
        echo -e "${RED}❌ 创建数据库失败${NC}"
        unset PGPASSWORD
        exit 1
    }
    echo -e "${GREEN}✅ 数据库已创建${NC}"
fi

# 9. 执行导入
echo -e "${CYAN}📦 开始导入数据库...${NC}"
echo -e "${WHITE}   文件: $BACKUP_FILE${NC}"
echo -e "${WHITE}   目标: $DB_NAME${NC}"

if [ "$RESTORE_CMD" = "pg_restore" ]; then
    # 自定义格式导入
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --no-owner --no-privileges \
        "$BACKUP_FILE"
    RESTORE_EXIT_CODE=$?
else
    # SQL 格式导入
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$BACKUP_FILE"
    RESTORE_EXIT_CODE=$?
fi

unset PGPASSWORD

if [ $RESTORE_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 导入成功！${NC}"
    echo -e "${CYAN}📋 下一步操作:${NC}"
    echo -e "${WHITE}   1. 运行 Prisma 迁移确保架构同步: npx prisma migrate deploy${NC}"
    echo -e "${WHITE}   2. 生成 Prisma Client: npx prisma generate${NC}"
    echo -e "${WHITE}   3. 验证数据: npx prisma studio${NC}"
else
    echo -e "${RED}❌ 导入失败 (退出码: $RESTORE_EXIT_CODE)${NC}"
    exit 1
fi

echo -e "${GREEN}✨ 完成！${NC}"
