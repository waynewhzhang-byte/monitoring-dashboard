import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 检查所有拓扑节点的设备关联状态\n');

  const nodes = await prisma.topologyNode.findMany({
    include: {
      device: true,
    },
    orderBy: {
      viewName: 'asc',
    },
  });

  console.log(`总共 ${nodes.length} 个拓扑节点\n`);

  // 按业务视图分组
  const viewGroups = new Map<string, typeof nodes>();
  nodes.forEach(node => {
    const viewName = node.viewName || '全局';
    if (!viewGroups.has(viewName)) {
      viewGroups.set(viewName, []);
    }
    viewGroups.get(viewName)!.push(node);
  });

  for (const [viewName, viewNodes] of viewGroups) {
    console.log(`\n=== ${viewName} ===`);

    let linkedCount = 0;
    let unlinkedCount = 0;

    viewNodes.forEach(node => {
      if (node.deviceId && node.device) {
        console.log(`✅ ${node.label} → ${node.device.displayName} (${node.device.status})`);
        linkedCount++;
      } else {
        console.log(`❌ ${node.label} - 未关联设备`);
        unlinkedCount++;
      }
    });

    console.log(`\n📊 统计: ${linkedCount} 个已关联, ${unlinkedCount} 个未关联`);
  }

  const totalLinked = nodes.filter(n => n.deviceId).length;
  const totalUnlinked = nodes.filter(n => !n.deviceId).length;

  console.log(`\n=== 总体统计 ===`);
  console.log(`✅ 已关联: ${totalLinked} 个 (${(totalLinked / nodes.length * 100).toFixed(1)}%)`);
  console.log(`❌ 未关联: ${totalUnlinked} 个 (${(totalUnlinked / nodes.length * 100).toFixed(1)}%)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
