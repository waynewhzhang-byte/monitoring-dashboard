/**
 * 测试改进后的拓扑同步逻辑
 */

// 加载环境变量
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { topologyCollector } from '../src/services/collector/topology';

const prisma = new PrismaClient();

async function testImprovedSync(bvName: string = 'TEST2') {
  console.log('='.repeat(80));
  console.log(`🧪 测试改进后的拓扑同步逻辑 - ${bvName}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 步骤 1: 查看同步前状态
    console.log('1️⃣  同步前状态...');
    const edgesBefore = await prisma.topologyEdge.findMany({
      where: { viewName: bvName },
      include: { interface: true }
    });
    console.log(`   边数: ${edgesBefore.length}`);
    console.log(`   已关联接口: ${edgesBefore.filter(e => e.interface).length}`);
    console.log('');

    // 步骤 2: 执行同步
    console.log('2️⃣  执行拓扑同步（使用改进的匹配逻辑）...');
    const result = await topologyCollector.syncBusinessView(bvName);
    console.log(`   ✅ 同步完成`);
    console.log(`      - 节点: ${result.nodes}`);
    console.log(`      - 边: ${result.edges}`);
    console.log('');

    // 步骤 3: 查看同步后状态
    console.log('3️⃣  同步后状态...');
    const edgesAfter = await prisma.topologyEdge.findMany({
      where: { viewName: bvName },
      include: {
        interface: {
          include: {
            device: {
              select: { name: true, ipAddress: true }
            }
          }
        }
      }
    });

    const edgesWithInterface = edgesAfter.filter(e => e.interface);
    console.log(`   边数: ${edgesAfter.length}`);
    console.log(`   已关联接口: ${edgesWithInterface.length}`);
    console.log('');

    // 步骤 4: 详细显示匹配结果
    if (edgesWithInterface.length > 0) {
      console.log('✅ 成功关联的边:');
      console.log('─'.repeat(80));
      edgesWithInterface.forEach((edge: any) => {
        const metadata = edge.metadata as any;
        console.log(`   边: ${edge.sourceId} → ${edge.targetId}`);
        console.log(`      - 接口: ${edge.interface.name}`);
        console.log(`      - 设备: ${edge.interface.device.name} (${edge.interface.device.ipAddress})`);
        console.log(`      - OpManager objName: ${metadata?.objName || 'N/A'}`);
        console.log('');
      });
    }

    const edgesWithoutInterface = edgesAfter.filter(e => !e.interface);
    if (edgesWithoutInterface.length > 0) {
      console.log('⚠️  未关联接口的边（将使用 metadata 流量数据）:');
      console.log('─'.repeat(80));
      edgesWithoutInterface.forEach((edge: any) => {
        const metadata = edge.metadata as any;
        console.log(`   边: ${edge.sourceId} → ${edge.targetId}`);
        console.log(`      - OpManager objName: ${metadata?.objName || 'N/A'}`);
        console.log(`      - parentName (设备IP): ${metadata?.parentName || 'N/A'}`);
        console.log(`      - desc (接口描述): ${metadata?.desc || 'N/A'}`);
        console.log(`      - InTraffic: ${metadata?.InTraffic || 'N/A'}`);
        console.log(`      - OutTraffic: ${metadata?.OutTraffic || 'N/A'}`);
        console.log('');
      });

      console.log('💡 这些边将使用 metadata 中的流量数据显示：');
      console.log('   - 如果 metadata.InTraffic 存在，将显示该值');
      console.log('   - 否则显示接口名称 (intfDisplayName)');
    }

    // 步骤 5: 测试 API 响应
    console.log('');
    console.log('4️⃣  测试 API 响应...');
    const apiEdges = edgesAfter.map((edge: any) => {
      const metadata = edge.metadata as any;
      const latestMetric = edge.interface?.trafficMetrics?.[0];

      let trafficLabel = '';
      if (latestMetric && latestMetric.inBandwidth) {
        const bps = Number(latestMetric.inBandwidth);
        if (bps >= 1000000000) trafficLabel = `${(bps / 1000000000).toFixed(2)} Gbps`;
        else if (bps >= 1000000) trafficLabel = `${(bps / 1000000).toFixed(2)} Mbps`;
        else if (bps >= 1000) trafficLabel = `${(bps / 1000).toFixed(2)} Kbps`;
        else trafficLabel = `${bps.toFixed(0)} bps`;
      } else if (metadata?.InTraffic) {
        trafficLabel = metadata.InTraffic;
      } else if (metadata?.intfDisplayName || metadata?.ifName) {
        trafficLabel = metadata.intfDisplayName || metadata.ifName;
      }

      return {
        edge: `${edge.sourceId} → ${edge.targetId}`,
        label: trafficLabel || '(无数据)',
        source: edge.interface ? '实时流量' : 'OpManager metadata'
      };
    });

    console.log('   连线标签预览:');
    console.log('─'.repeat(80));
    apiEdges.forEach((item: any) => {
      console.log(`   ${item.edge}`);
      console.log(`      标签: "${item.label}" (来源: ${item.source})`);
    });

    // 步骤 6: 结果摘要
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 测试结果摘要:');
    console.log('─'.repeat(80));

    const improvement = edgesWithInterface.length - edgesBefore.filter(e => e.interface).length;
    if (improvement > 0) {
      console.log(`   ✅ 改进的匹配逻辑成功关联了 ${improvement} 条边`);
    } else if (improvement === 0 && edgesWithInterface.length > 0) {
      console.log(`   ✅ 保持了 ${edgesWithInterface.length} 条边的接口关联`);
    }

    if (edgesWithoutInterface.length > 0) {
      const withMetadataTraffic = edgesWithoutInterface.filter((e: any) => {
        const metadata = e.metadata as any;
        return metadata?.InTraffic || metadata?.OutTraffic;
      }).length;

      console.log(`   📊 ${edgesWithoutInterface.length} 条边未关联接口，但:`);
      console.log(`      - ${withMetadataTraffic} 条边有 metadata 流量数据 ✅`);
      console.log(`      - ${edgesWithoutInterface.length - withMetadataTraffic} 条边完全无数据 ⚠️`);
    }

    console.log('');
    console.log('🎯 下一步:');
    console.log('   1. 刷新 Dashboard: http://localhost:3000/dashboard');
    console.log('   2. 选择 TEST2 业务视图');
    console.log('   3. 查看连线是否显示流量数据');
    console.log('');
    console.log('   预期结果:');
    console.log('   - 如果接口关联成功，显示实时流量（每60秒更新）');
    console.log('   - 如果接口未关联，显示 OpManager metadata 流量（如 "10.806 Mbps"）');
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const bvName = process.argv[2] || 'TEST2';
testImprovedSync(bvName).catch(console.error);
