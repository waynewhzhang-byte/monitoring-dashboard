
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTopology() {
    console.log('=== Topology & Business View 诊断 ===\n');

    const configs = await prisma.businessViewConfig.findMany();
    console.log(`[1] BusinessViewConfig (共 ${configs.length} 个):`);
    configs.forEach(c => {
        console.log(`    - ID: ${c.id}, Name: "${c.name}", DisplayName: "${c.displayName}", Active: ${c.isActive}`);
    });

    const nodeCounts = await prisma.topologyNode.groupBy({
        by: ['viewName'],
        _count: true
    });
    console.log(`\n[2] TopologyNode 分布:`);
    nodeCounts.forEach(nc => {
        console.log(`    - ViewName: "${nc.viewName}", Count: ${nc._count}`);
    });

    const nodes = await prisma.topologyNode.findMany({ take: 5 });
    if (nodes.length > 0) {
        console.log(`\n[3] 节点示例 (前5个):`);
        nodes.forEach(n => {
            console.log(`    - NodeID: ${n.id}, ViewName: ${n.viewName}, Label: ${n.label}, DeviceID: ${n.deviceId}`);
        });
    } else {
        console.log('\n[3] 警告: TopologyNode 表为空！');
    }

    const edges = await prisma.topologyEdge.count();
    console.log(`\n[4] TopologyEdge 总数: ${edges}`);

    await prisma.$disconnect();
}

checkTopology().catch(console.error);
