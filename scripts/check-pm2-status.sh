#!/bin/bash
# PM2 进程状态检查脚本
# 用于快速检查监控系统的运行状态

echo "======================================"
echo "  监控系统 PM2 进程状态检查"
echo "======================================"
echo ""

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装,请先安装 PM2: npm install -g pm2"
    exit 1
fi

echo "📊 PM2 进程列表:"
echo "--------------------------------------"
pm2 status
echo ""

# 检查 monitoring-web 状态
echo "🌐 Web 服务状态:"
echo "--------------------------------------"
pm2 info monitoring-web | grep -E "status|uptime|restarts|memory"
echo ""

# 检查 monitoring-collector 状态
echo "📡 Collector 服务状态:"
echo "--------------------------------------"
pm2 info monitoring-collector | grep -E "status|uptime|restarts|memory"
echo ""

# 显示最近的日志
echo "📝 Collector 最近日志 (最后 20 行):"
echo "--------------------------------------"
pm2 logs monitoring-collector --lines 20 --nostream
echo ""

echo "✅ 状态检查完成"
echo ""
echo "💡 提示:"
echo "  - 查看实时日志: pm2 logs monitoring-collector"
echo "  - 重启服务: pm2 restart monitoring-collector"
echo "  - 查看详细信息: pm2 info monitoring-collector"
