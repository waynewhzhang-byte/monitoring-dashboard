import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 设备状态数据流诊断\n');

  // 1. 检查数据库中的设备状态
  console.log('=== 1. 数据库中的设备状态 ===');
  const devices = await prisma.device.findMany({
    select: {
      id: true,
      displayName: true,
      name: true,
      ipAddress: true,
      type: true,
      status: true,
      isMonitored: true,
    },
    take: 10,
  });

  console.log(`\n找到 ${devices.length} 个设备:\n`);
  devices.forEach((device, i) => {
    console.log(`${i + 1}. ${device.displayName || device.name}`);
    console.log(`   IP: ${device.ipAddress}`);
    console.log(`   类型: ${device.type}`);
    console.log(`   状态: ${device.status}`);
    console.log(`   监控: ${device.isMonitored ? '是' : '否'}`);
    console.log('');
  });

  // 2. 检查拓扑节点中的状态
  console.log('\n=== 2. 拓扑节点中的设备状态 ===');
  const topologyNodes = await prisma.topologyNode.findMany({
    select: {
      id: true,
      label: true,
      type: true,
      metadata: true,
      device: {
        select: {
          displayName: true,
          status: true,
          type: true,
        },
      },
    },
    take: 10,
  });

  console.log(`\n找到 ${topologyNodes.length} 个拓扑节点:\n`);
  topologyNodes.forEach((node, i) => {
    console.log(`${i + 1}. ${node.label}`);
    console.log(`   设备状态 (DB): ${node.device?.status || '无关联设备'}`);
    console.log(`   设备类型 (DB): ${node.device?.type || 'N/A'}`);

    const metadata = node.metadata as any;
    if (metadata) {
      console.log(`   metadata.status: ${metadata.status || 'N/A'}`);
      console.log(`   metadata.statusStr: ${metadata.statusStr || 'N/A'}`);
      console.log(`   metadata.severity: ${metadata.severity || 'N/A'}`);
    }
    console.log('');
  });

  // 3. 检查 OpManager 状态映射
  console.log('\n=== 3. OpManager 状态码映射 ===');
  console.log(`
OpManager 状态码说明：
  1 = Critical (严重告警) → ERROR
  2 = Trouble (故障) → WARNING
  3 = Attention (注意) → WARNING
  4 = Not Monitored (未监控) → UNMANAGED
  5 = Clear (正常) → ONLINE
  7 = UnManaged (未管理) → UNMANAGED
  `);

  // 4. 统计设备状态分布
  console.log('\n=== 4. 设备状态分布统计 ===');
  const statusCounts = await prisma.device.groupBy({
    by: ['status'],
    _count: true,
  });

  statusCounts.forEach((stat) => {
    console.log(`  ${stat.status}: ${stat._count} 个设备`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
