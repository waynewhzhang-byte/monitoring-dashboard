import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 验证 Dashboard 数据流\n');

  const viewName = '新的业务视图';

  // 1. 检查设备状态
  console.log('=== 1. 设备状态（Device 表）===\n');
  const devices = await prisma.device.findMany({
    where: { isMonitored: true },
    select: {
      id: true,
      displayName: true,
      ipAddress: true,
      status: true,
      type: true,
      updatedAt: true
    },
    orderBy: { displayName: 'asc' }
  });

  console.log(`找到 ${devices.length} 个监控设备：\n`);
  devices.forEach(d => {
    const statusEmoji =
      d.status === 'ERROR' ? '🔴' :
      d.status === 'WARNING' ? '🟡' :
      d.status === 'ONLINE' ? '🟢' :
      d.status === 'OFFLINE' ? '⚫' : '⚪';
    console.log(`${statusEmoji} ${d.displayName} (${d.ipAddress})`);
    console.log(`   状态: ${d.status} | 类型: ${d.type}`);
    console.log(`   更新时间: ${d.updatedAt.toLocaleString('zh-CN')}\n`);
  });

  // 2. 检查拓扑节点关联
  console.log('\n=== 2. 拓扑节点关联（TopologyNode → Device）===\n');
  const nodes = await prisma.topologyNode.findMany({
    where: { viewName },
    include: {
      device: {
        select: {
          displayName: true,
          status: true,
          type: true
        }
      }
    }
  });

  console.log(`业务视图 "${viewName}" 有 ${nodes.length} 个节点：\n`);
  let linkedCount = 0;
  let unlinkedCount = 0;

  nodes.forEach(n => {
    if (n.device) {
      linkedCount++;
      const statusEmoji =
        n.device.status === 'ERROR' ? '🔴' :
        n.device.status === 'WARNING' ? '🟡' :
        n.device.status === 'ONLINE' ? '🟢' :
        n.device.status === 'OFFLINE' ? '⚫' : '⚪';
      console.log(`✅ ${n.label}`);
      console.log(`   ${statusEmoji} 设备状态: ${n.device.status}`);
      console.log(`   设备类型: ${n.device.type}\n`);
    } else {
      unlinkedCount++;
      console.log(`❌ ${n.label} - 未关联设备\n`);
    }
  });

  console.log(`📊 关联统计: ${linkedCount} 个已关联, ${unlinkedCount} 个未关联\n`);

  // 3. 检查接口流量数据
  console.log('\n=== 3. 接口流量（TrafficMetric 表）===\n');
  const interfaces = await prisma.interface.findMany({
    where: {
      tags: { isEmpty: false }  // 只有有标签的接口
    },
    include: {
      device: {
        select: { displayName: true }
      },
      trafficMetrics: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    },
    take: 10
  });

  console.log(`有标签的接口数量: ${interfaces.length}`);
  console.log(`（显示前10个）\n`);

  interfaces.forEach(intf => {
    const latestMetric = intf.trafficMetrics[0];
    console.log(`📡 ${intf.name}`);
    console.log(`   设备: ${intf.device.displayName}`);
    console.log(`   标签: ${intf.tags.join(', ')}`);
    if (latestMetric) {
      const inMbps = Number(latestMetric.inBandwidth) / 1000000;
      const outMbps = Number(latestMetric.outBandwidth) / 1000000;
      console.log(`   ↓ 入: ${inMbps.toFixed(2)} Mbps | ↑ 出: ${outMbps.toFixed(2)} Mbps`);
      console.log(`   采集时间: ${latestMetric.timestamp.toLocaleString('zh-CN')}`);
    } else {
      console.log(`   ⚠️  暂无流量数据`);
    }
    console.log('');
  });

  // 4. 检查拓扑边的流量数据
  console.log('\n=== 4. 拓扑边流量（TopologyEdge → TrafficMetric）===\n');
  const edges = await prisma.topologyEdge.findMany({
    where: { viewName },
    include: {
      interface: {
        include: {
          trafficMetrics: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  console.log(`业务视图 "${viewName}" 有 ${edges.length} 条边：\n`);
  let trafficCount = 0;

  edges.forEach(edge => {
    const intf = edge.interface;
    const latestMetric = intf?.trafficMetrics[0];

    console.log(`🔗 ${edge.label || edge.id}`);
    if (intf) {
      console.log(`   接口: ${intf.name}`);
      console.log(`   标签: ${intf.tags.length > 0 ? intf.tags.join(', ') : '无标签'}`);
      if (latestMetric) {
        const inMbps = Number(latestMetric.inBandwidth) / 1000000;
        const outMbps = Number(latestMetric.outBandwidth) / 1000000;
        console.log(`   ↓ ${inMbps.toFixed(2)} Mbps | ↑ ${outMbps.toFixed(2)} Mbps`);
        console.log(`   采集时间: ${latestMetric.timestamp.toLocaleString('zh-CN')}`);
        trafficCount++;
      } else {
        console.log(`   ⚠️  无流量数据（可能接口无标签）`);
      }
    } else {
      console.log(`   ⚠️  未关联接口`);
      // 从 metadata 读取
      const metadata = edge.metadata as any;
      const inTraffic = metadata?.InTraffic || '—';
      const outTraffic = metadata?.OutTraffic || '—';
      console.log(`   metadata流量: ↓ ${inTraffic} | ↑ ${outTraffic}`);
    }
    console.log('');
  });

  console.log(`📊 流量数据统计: ${trafficCount} / ${edges.length} 条边有流量数据\n`);

  // 5. 总结
  console.log('\n=== 总结 ===\n');
  console.log(`✅ 设备状态: ${devices.length} 个设备`);
  console.log(`✅ 拓扑节点: ${linkedCount}/${nodes.length} 已关联`);
  console.log(`✅ 接口流量: ${interfaces.length} 个有标签接口`);
  console.log(`✅ 边流量: ${trafficCount}/${edges.length} 条边有数据\n`);

  if (unlinkedCount > 0) {
    console.log(`⚠️  问题: ${unlinkedCount} 个拓扑节点未关联设备`);
    console.log(`   解决: 运行 npx tsx scripts/fix-topology-device-link.ts\n`);
  }

  if (trafficCount < edges.length) {
    console.log(`⚠️  问题: ${edges.length - trafficCount} 条边无流量数据`);
    console.log(`   原因: 可能接口无标签，或采集器未运行`);
    console.log(`   解决: 1) 为接口添加标签  2) 确保采集器运行中\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
