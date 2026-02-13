#!/bin/bash
# 生产环境采集器诊断脚本（无需 tsx/ts-node）
# 使用构建后的 JavaScript 运行

set -e

echo "🔧 准备诊断采集器性能..."
echo ""

# 1. 检查是否已构建
if [ ! -d ".next" ]; then
    echo "⚠️  项目未构建，正在构建..."
    npm run build
fi

# 2. 构建诊断脚本
echo "📦 编译诊断脚本..."
npx tsc scripts/diagnose-production-collector.ts \
    --outDir dist/scripts \
    --module commonjs \
    --target es2020 \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck \
    --resolveJsonModule

# 3. 运行诊断
echo ""
echo "🔍 开始诊断..."
echo ""
node dist/scripts/diagnose-production-collector.js "$@"

echo ""
echo "✅ 诊断完成！"
