import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 诊断业务视图数据整合情况\n');

  // 检查 TEST1 视图的节点（实际 viewName 是"新的业务视图"）
  const nodes = await prisma.topologyNode.findMany({
    where: { viewName: '新的业务视图' },
    include: { device: true },
    orderBy: { label: 'asc' },
  });

  console.log(`=== TEST1 (新的业务视图) 节点分析 (共 ${nodes.length} 个) ===\n`);

  for (const node of nodes) {
    console.log(`\n📍 节点: ${node.label}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   DeviceId: ${node.deviceId || '❌ 未关联'}`);

    if (node.device) {
      console.log(`   ✅ 关联设备: ${node.device.displayName}`);
      console.log(`   设备状态: ${node.device.status}`);
      console.log(`   设备类型: ${node.device.type}`);
      console.log(`   设备IP: ${node.device.ipAddress}`);
    } else {
      console.log(`   ❌ 无关联设备`);
    }

    // 分析 metadata 结构
    const metadata = node.metadata as any;
    console.log(`\n   Metadata 分析:`);

    // 检查多层嵌套
    let currentMeta = metadata;
    let depth = 0;
    const maxDepth = 10;

    while (currentMeta && depth < maxDepth) {
      const hasNestedMeta = currentMeta.metadata && typeof currentMeta.metadata === 'object';

      console.log(`   ${'  '.repeat(depth)}[层级 ${depth}]`);
      console.log(`   ${'  '.repeat(depth)}  status: ${currentMeta.status || 'N/A'}`);
      console.log(`   ${'  '.repeat(depth)}  statusStr: ${currentMeta.statusStr || 'N/A'}`);
      console.log(`   ${'  '.repeat(depth)}  objName: ${currentMeta.objName || 'N/A'}`);
      console.log(`   ${'  '.repeat(depth)}  ipAddress: ${currentMeta.ipAddress || currentMeta.IpAddress || 'N/A'}`);

      // 检查是否有 performance 数据（来自 getBusinessDetailsView）
      if (currentMeta.performance) {
        console.log(`   ${'  '.repeat(depth)}  ✅ 有 performance 数据:`);
        console.log(`   ${'  '.repeat(depth)}     displayName: ${currentMeta.performance.displayName}`);
        console.log(`   ${'  '.repeat(depth)}     IpAddress: ${currentMeta.performance.IpAddress}`);
        console.log(`   ${'  '.repeat(depth)}     status: ${currentMeta.performance.status}`);
        console.log(`   ${'  '.repeat(depth)}     CPUUtilization: ${currentMeta.performance.CPUUtilization}%`);
        console.log(`   ${'  '.repeat(depth)}     MemUtilization: ${currentMeta.performance.MemUtilization}%`);
      }

      if (!hasNestedMeta) break;
      currentMeta = currentMeta.metadata;
      depth++;
    }

    console.log(`   \n   总嵌套层级: ${depth + 1}`);
    console.log('   ' + '='.repeat(60));
  }

  console.log(`\n\n=== 总结 ===`);
  const linkedCount = nodes.filter(n => n.deviceId).length;
  const unlinkedCount = nodes.filter(n => !n.deviceId).length;

  console.log(`✅ 已关联设备: ${linkedCount} 个`);
  console.log(`❌ 未关联设备: ${unlinkedCount} 个`);

  if (unlinkedCount > 0) {
    console.log(`\n⚠️  问题: 有 ${unlinkedCount} 个节点未关联到设备，这会导致无法显示实时状态`);
    console.log(`📌 原因: 同步时 getBVDetails 返回的设备标识无法匹配数据库中的 Device 记录`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
