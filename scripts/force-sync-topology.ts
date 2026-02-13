
import dotenv from 'dotenv';
import { resolve } from 'path';

// Force load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { topologyCollector } from '../src/services/collector/topology';
import { prisma } from '../src/lib/prisma';

async function forceSync() {
    const bvName = '核心业务视图';
    console.log(`🔄 [SYNC] 正在为 "${bvName}" 强制执行拓扑同步...`);

    try {
        await topologyCollector.syncBusinessView(bvName);

        const nodes = await prisma.topologyNode.count({ where: { viewName: bvName } });
        const edges = await prisma.topologyEdge.count({ where: { viewName: bvName } });

        console.log(`✅ [SYNC] 同步完成！`);
        console.log(`📊 [SYNC] 节点数: ${nodes}, 连线数: ${edges}`);

        if (nodes === 0) {
            console.warn('⚠️ [SYNC] 警告: 虽然同步成功，但节点数为 0。可能 OpManager 中没有匹配的拓扑。');
        }
    } catch (error: any) {
        console.error('❌ [SYNC] 失败:', error.message);
    }
}

forceSync()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
