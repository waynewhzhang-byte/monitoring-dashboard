import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('🔍 检查流量数据和拓扑边关联\n');

  // Check latest TrafficMetric record
  const latest = await prisma.trafficMetric.findFirst({
    orderBy: { timestamp: 'desc' },
    include: { interface: { select: { name: true, deviceId: true } } }
  });

  console.log('=== 最新 TrafficMetric 记录 ===');
  if (latest) {
    const inMbps = Number(latest.inBandwidth) / 1000000;
    const outMbps = Number(latest.outBandwidth) / 1000000;
    console.log(`接口: ${latest.interface.name}`);
    console.log(`时间: ${latest.timestamp.toLocaleString('zh-CN')}`);
    console.log(`流量: ↓ ${inMbps.toFixed(2)} Mbps | ↑ ${outMbps.toFixed(2)} Mbps\n`);
  } else {
    console.log('❌ 没有找到任何 TrafficMetric 记录\n');
  }

  // Check all TrafficMetric count
  const totalMetrics = await prisma.trafficMetric.count();
  console.log(`TrafficMetric 总记录数: ${totalMetrics}\n`);

  // Check topology edges
  console.log('=== 拓扑边关联情况 ===');
  const edges = await prisma.topologyEdge.findMany({
    where: { viewName: '新的业务视图' },
    include: {
      interface: {
        select: { id: true, name: true, displayName: true }
      }
    }
  });

  console.log(`拓扑边总数: ${edges.length}\n`);

  let linkedCount = 0;
  edges.forEach(e => {
    const meta = e.metadata as any;
    if (e.interface) {
      linkedCount++;
      console.log(`✅ ${e.label || e.id}`);
      console.log(`   已关联接口: ${e.interface.displayName || e.interface.name}`);
    } else {
      console.log(`❌ ${e.label || e.id}`);
      console.log(`   未关联接口`);
      console.log(`   metadata: sourcePort=${meta?.sourcePort}, targetPort=${meta?.targetPort}`);
    }
    console.log('');
  });

  console.log(`\n📊 统计: ${linkedCount}/${edges.length} 条边已关联接口\n`);

  // Check interfaces with tags
  const taggedInterfaces = await prisma.interface.findMany({
    where: { tags: { isEmpty: false } },
    select: { id: true, name: true, displayName: true, tags: true }
  });

  console.log('=== 有标签的接口 ===');
  console.log(`总数: ${taggedInterfaces.length}\n`);
  taggedInterfaces.forEach(intf => {
    console.log(`📡 ${intf.displayName || intf.name}`);
    console.log(`   标签: ${intf.tags.join(', ')}\n`);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
