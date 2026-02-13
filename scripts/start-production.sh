#!/bin/bash
# 生产环境启动脚本
# 用途：在银河麒麟 Linux 上启动监控系统服务

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

echo -e "${CYAN}🚀 启动监控系统生产服务${NC}"
echo -e "${WHITE}==================================================${NC}"

# 1. 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 未找到 package.json${NC}"
    echo -e "${YELLOW}   请确保在项目根目录执行此脚本${NC}"
    exit 1
fi

# 2. 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 错误: 未找到 .env 文件${NC}"
    echo -e "${YELLOW}   请先配置生产环境变量${NC}"
    exit 1
fi

# 3. 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 pm2 命令${NC}"
    echo -e "${YELLOW}   请先安装 PM2: npm install -g pm2${NC}"
    exit 1
fi

# 4. 检查 ecosystem.config.js
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${YELLOW}⚠️  未找到 ecosystem.config.js，将使用命令行方式启动${NC}"
    USE_ECOSYSTEM=false
else
    # 更新 ecosystem.config.js 中的工作目录为当前目录
    CURRENT_DIR=$(pwd)
    sed -i "s|cwd: '/opt/monitoring-app'|cwd: '$CURRENT_DIR'|g" ecosystem.config.js
    USE_ECOSYSTEM=true
fi

# 5. 创建日志目录
mkdir -p logs

# 6. 启动服务
echo -e "${CYAN}📦 启动服务...${NC}"

if [ "$USE_ECOSYSTEM" = true ]; then
    # 使用 ecosystem.config.js
    echo -e "${WHITE}   使用 PM2 配置文件启动${NC}"
    pm2 start ecosystem.config.js
else
    # 使用命令行方式
    echo -e "${WHITE}   使用命令行方式启动${NC}"
    
    # 启动 Web 服务
    echo -e "${YELLOW}   启动 Web 服务...${NC}"
    pm2 start npm --name "monitoring-web" -- start
    
    # 启动采集服务
    echo -e "${YELLOW}   启动数据采集服务...${NC}"
    pm2 start npm --name "monitoring-collector" -- run collector
fi

# 7. 保存 PM2 配置（确保开机自启）
pm2 save

# 8. 显示状态
echo -e "${GREEN}✅ 服务启动完成！${NC}"
echo -e "${CYAN}📋 服务状态:${NC}"
pm2 list

echo -e "${CYAN}📋 常用命令:${NC}"
echo -e "${WHITE}   pm2 logs                    # 查看所有日志${NC}"
echo -e "${WHITE}   pm2 logs monitoring-web    # 查看 Web 服务日志${NC}"
echo -e "${WHITE}   pm2 logs monitoring-collector  # 查看采集服务日志${NC}"
echo -e "${WHITE}   pm2 monit                   # 监控面板${NC}"
echo -e "${WHITE}   pm2 restart all             # 重启所有服务${NC}"
echo -e "${WHITE}   pm2 stop all                # 停止所有服务${NC}"
echo -e "${WHITE}   pm2 delete all              # 删除所有服务${NC}"

# 9. 设置开机自启（可选）
read -p "是否设置开机自启? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 startup
    echo -e "${GREEN}✅ 已设置开机自启${NC}"
fi

echo -e "${GREEN}✨ 完成！${NC}"
