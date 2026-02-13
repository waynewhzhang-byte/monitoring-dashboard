#!/bin/bash

# Dashboard 快速检查脚本
# 用于快速验证 Dashboard 所需的核心文件和 API

echo "========================================================================"
echo "Dashboard 快速检查脚本"
echo "========================================================================"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查结果统计
PASS=0
FAIL=0

# 1. 检查核心 API 文件是否存在
echo "1️⃣  检查核心 API 文件..."
if [ -f "src/pages/api/stats/business-view.ts" ]; then
    echo -e "   ${GREEN}✅ PASS${NC} - business-view.ts 文件存在"
    PASS=$((PASS + 1))
else
    echo -e "   ${RED}❌ FAIL${NC} - business-view.ts 文件不存在"
    echo "   解决方案: 上传 src/pages/api/stats/business-view.ts"
    FAIL=$((FAIL + 1))
fi
echo ""

# 2. 检查诊断脚本是否存在
echo "2️⃣  检查诊断脚本..."
DIAG_MISSING=0

if [ -f "scripts/diagnose-dashboard-api.ts" ]; then
    echo -e "   ${GREEN}✅${NC} diagnose-dashboard-api.ts 存在"
else
    echo -e "   ${YELLOW}⚠️${NC}  diagnose-dashboard-api.ts 缺失"
    DIAG_MISSING=$((DIAG_MISSING + 1))
fi

if [ -f "scripts/diagnose-database-data.ts" ]; then
    echo -e "   ${GREEN}✅${NC} diagnose-database-data.ts 存在"
else
    echo -e "   ${YELLOW}⚠️${NC}  diagnose-database-data.ts 缺失"
    DIAG_MISSING=$((DIAG_MISSING + 1))
fi

if [ $DIAG_MISSING -eq 0 ]; then
    echo -e "   ${GREEN}✅ PASS${NC} - 诊断脚本完整"
    PASS=$((PASS + 1))
else
    echo -e "   ${YELLOW}⚠️  WARNING${NC} - $DIAG_MISSING 个诊断脚本缺失"
    echo "   影响: 无法使用 npm run diagnose:database 等命令"
fi
echo ""

# 3. 检查 package.json 中的诊断命令
echo "3️⃣  检查 package.json 诊断命令..."
if grep -q '"diagnose:database"' package.json; then
    echo -e "   ${GREEN}✅ PASS${NC} - package.json 包含诊断命令"
    PASS=$((PASS + 1))
else
    echo -e "   ${YELLOW}⚠️  WARNING${NC} - package.json 缺少诊断命令"
    echo "   影响: npm run diagnose:database 无法使用"
fi
echo ""

# 4. 检查服务是否运行
echo "4️⃣  检查服务状态..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "monitoring-dashboard"; then
        STATUS=$(pm2 list | grep "monitoring-dashboard" | awk '{print $10}')
        if [ "$STATUS" = "online" ]; then
            echo -e "   ${GREEN}✅ PASS${NC} - 服务运行中 (PM2)"
            PASS=$((PASS + 1))
        else
            echo -e "   ${RED}❌ FAIL${NC} - 服务状态: $STATUS"
            echo "   解决方案: pm2 restart monitoring-dashboard"
            FAIL=$((FAIL + 1))
        fi
    else
        echo -e "   ${YELLOW}⚠️  WARNING${NC} - PM2 未找到 monitoring-dashboard"
    fi
else
    # 检查端口 3000 是否被监听
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "   ${GREEN}✅ PASS${NC} - 端口 3000 正在监听"
        PASS=$((PASS + 1))
    elif ss -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "   ${GREEN}✅ PASS${NC} - 端口 3000 正在监听"
        PASS=$((PASS + 1))
    else
        echo -e "   ${RED}❌ FAIL${NC} - 端口 3000 未监听"
        echo "   解决方案: npm run start 或 pm2 start"
        FAIL=$((FAIL + 1))
    fi
fi
echo ""

# 5. 测试核心 API
echo "5️⃣  测试核心 API 端点..."

# 检查 curl 是否可用
if ! command -v curl &> /dev/null; then
    echo -e "   ${YELLOW}⚠️  WARNING${NC} - curl 未安装，跳过 API 测试"
else
    # 测试 /api/stats/business-view
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/stats/business-view?bvName= 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ PASS${NC} - /api/stats/business-view 返回 200"
        
        # 检查响应内容
        RESPONSE=$(curl -s http://localhost:3000/api/stats/business-view?bvName= 2>/dev/null)
        if echo "$RESPONSE" | grep -q '"devices"'; then
            echo -e "   ${GREEN}✅ PASS${NC} - 响应包含 devices 字段"
            PASS=$((PASS + 2))
        else
            echo -e "   ${RED}❌ FAIL${NC} - 响应缺少 devices 字段"
            FAIL=$((FAIL + 1))
        fi
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "   ${RED}❌ FAIL${NC} - /api/stats/business-view 返回 404"
        echo "   原因: API 文件未部署或服务未重启"
        echo "   解决方案:"
        echo "      1. 确认文件存在: ls -la src/pages/api/stats/business-view.ts"
        echo "      2. 重新构建: npm run build"
        echo "      3. 重启服务: pm2 restart monitoring-dashboard"
        FAIL=$((FAIL + 1))
    elif [ "$HTTP_CODE" = "500" ]; then
        echo -e "   ${RED}❌ FAIL${NC} - /api/stats/business-view 返回 500"
        echo "   原因: API 内部错误"
        echo "   解决方案: pm2 logs monitoring-dashboard --lines 50"
        FAIL=$((FAIL + 1))
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "   ${RED}❌ FAIL${NC} - 无法连接到服务器"
        echo "   原因: 服务未启动或端口错误"
        echo "   解决方案: 检查服务是否运行"
        FAIL=$((FAIL + 1))
    else
        echo -e "   ${YELLOW}⚠️  WARNING${NC} - 未知状态码: $HTTP_CODE"
    fi
fi
echo ""

# 6. 检查 .next 构建目录
echo "6️⃣  检查构建文件..."
if [ -d ".next" ]; then
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID)
        BUILD_TIME=$(stat -c %y .next/BUILD_ID 2>/dev/null || stat -f "%Sm" .next/BUILD_ID 2>/dev/null)
        echo -e "   ${GREEN}✅ PASS${NC} - .next 构建目录存在"
        echo "   Build ID: $BUILD_ID"
        echo "   构建时间: $BUILD_TIME"
        PASS=$((PASS + 1))
    else
        echo -e "   ${YELLOW}⚠️  WARNING${NC} - .next 目录存在但缺少 BUILD_ID"
    fi
else
    echo -e "   ${RED}❌ FAIL${NC} - .next 构建目录不存在"
    echo "   解决方案: npm run build"
    FAIL=$((FAIL + 1))
fi
echo ""

# 汇总结果
echo "========================================================================"
echo "检查结果汇总"
echo "========================================================================"
echo -e "${GREEN}✅ 通过: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ 失败: $FAIL${NC}"
fi
echo "========================================================================"
echo ""

# 给出建议
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 所有关键检查通过！${NC}"
    echo ""
    echo "下一步:"
    echo "  1. 访问 http://localhost:3000/dashboard"
    echo "  2. 检查设备总览圆环图是否显示数据"
    echo "  3. 按 F12 打开开发者工具检查是否有错误"
else
    echo -e "${RED}⚠️  发现 $FAIL 个问题需要修复${NC}"
    echo ""
    echo "建议操作顺序:"
    echo "  1. 上传缺失的文件（如果有）"
    echo "  2. 运行 npm run build"
    echo "  3. 重启服务 pm2 restart monitoring-dashboard"
    echo "  4. 重新运行本脚本验证"
fi
echo ""

# 返回退出码
exit $FAIL
