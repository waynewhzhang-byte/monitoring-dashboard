#!/bin/bash
# 修复导入路径脚本 - 用于在银河麒麟 Linux 上修复导入路径问题
# 修复组件和服务层文件中的相对路径导入

echo "🔧 修复导入路径..."
echo "=================================================="

# 项目根目录（如果从脚本目录运行，自动检测）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1
echo "项目根目录: $PROJECT_ROOT"

# 修复 DeviceDetailPanel.tsx
if [ -f "src/components/device/DeviceDetailPanel.tsx" ]; then
    echo "修复 DeviceDetailPanel.tsx..."
    sed -i "s|from '../widgets/MetricChart'|from '@/components/widgets/MetricChart'|g" \
        src/components/device/DeviceDetailPanel.tsx
    echo "✅ DeviceDetailPanel.tsx 已修复"
fi

# 修复 WidgetRenderer.tsx
if [ -f "src/components/dashboard-builder/WidgetRenderer.tsx" ]; then
    echo "修复 WidgetRenderer.tsx..."
    sed -i "s|from '../widgets/StatCard'|from '@/components/widgets/StatCard'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    sed -i "s|from '../widgets/MetricChart'|from '@/components/widgets/MetricChart'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    sed -i "s|from '../domain/DeviceList'|from '@/components/domain/DeviceList'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    sed -i "s|from '../domain/AlarmList'|from '@/components/domain/AlarmList'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    sed -i "s|from '../domain/TopologyViewer'|from '@/components/domain/TopologyViewer'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    sed -i "s|from '../traffic/TopTrafficList'|from '@/components/traffic/TopTrafficList'|g" \
        src/components/dashboard-builder/WidgetRenderer.tsx
    echo "✅ WidgetRenderer.tsx 已修复"
fi

# 修复 TaggedDevicePanel.tsx
if [ -f "src/components/dashboard/TaggedDevicePanel.tsx" ]; then
    echo "修复 TaggedDevicePanel.tsx..."
    sed -i "s|from '../widgets/MiniMetricChart'|from '@/components/widgets/MiniMetricChart'|g" \
        src/components/dashboard/TaggedDevicePanel.tsx
    echo "✅ TaggedDevicePanel.tsx 已修复"
fi

# 修复服务层文件
echo ""
echo "修复服务层文件..."

# 修复 collector 文件
for file in alarm.ts device.ts interface.ts topology.ts metric.ts; do
    if [ -f "src/services/collector/$file" ]; then
        echo "修复 src/services/collector/$file..."
        sed -i "s|from '../../lib/prisma'|from '@/lib/prisma'|g" \
            "src/services/collector/$file"
        sed -i "s|from '../opmanager/client'|from '@/services/opmanager/client'|g" \
            "src/services/collector/$file"
        sed -i "s|from '../broadcast'|from '@/services/broadcast'|g" \
            "src/services/collector/$file"
        sed -i "s|from '../alarm/deduplicator'|from '@/services/alarm/deduplicator'|g" \
            "src/services/collector/$file"
        echo "✅ src/services/collector/$file 已修复"
    fi
done

# 修复 alarm/deduplicator.ts
if [ -f "src/services/alarm/deduplicator.ts" ]; then
    echo "修复 src/services/alarm/deduplicator.ts..."
    sed -i "s|from '../../lib/redis'|from '@/lib/redis'|g" \
        src/services/alarm/deduplicator.ts
    sed -i "s|from '../../lib/prisma'|from '@/lib/prisma'|g" \
        src/services/alarm/deduplicator.ts
    echo "✅ src/services/alarm/deduplicator.ts 已修复"
fi

# 修复 broadcast/index.ts
if [ -f "src/services/broadcast/index.ts" ]; then
    echo "修复 src/services/broadcast/index.ts..."
    sed -i "s|from '../../lib/redis'|from '@/lib/redis'|g" \
        src/services/broadcast/index.ts
    echo "✅ src/services/broadcast/index.ts 已修复"
fi

# 修复 stores/useDashboardStore.ts
if [ -f "src/stores/useDashboardStore.ts" ]; then
    echo "修复 src/stores/useDashboardStore.ts..."
    sed -i "s|from '../types/dashboard-config'|from '@/types/dashboard-config'|g" \
        src/stores/useDashboardStore.ts
    echo "✅ src/stores/useDashboardStore.ts 已修复"
fi

# 修复 opmanager/client.ts
if [ -f "src/services/opmanager/client.ts" ]; then
    echo "修复 src/services/opmanager/client.ts..."
    sed -i "s|from '../mock/opmanager-mock-data'|from '@/services/mock/opmanager-mock-data'|g" \
        src/services/opmanager/client.ts
    echo "✅ src/services/opmanager/client.ts 已修复"
fi

echo ""
echo "✨ 所有导入路径已修复！"
echo ""
echo "下一步：运行 npm run build"
