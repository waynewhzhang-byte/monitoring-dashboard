@echo off
REM 验证服务器和 API 端点

echo 🔍 验证开发服务器...
echo.

REM 1. 健康检查
echo 1. 测试健康检查端点...
curl -s http://localhost:3000/api/health
echo.
echo.

REM 2. Mock API - 设备列表
echo 2. 测试 Mock API - 设备列表...
curl -s "http://localhost:3000/api/mock/opmanager/devices?page=1&rows=5"
echo.
echo.

REM 3. Mock API - 业务视图
echo 3. 测试 Mock API - 业务视图...
curl -s "http://localhost:3000/api/mock/opmanager/businessview?bvName=出口业务&startPoint=0&viewLength=5"
echo.
echo.

REM 4. Mock API - 配置
echo 4. 测试 Mock API - 配置...
curl -s http://localhost:3000/api/mock/opmanager/config
echo.
echo.

echo ✅ 验证完成！
