/**
 * 一键修复拓扑边（连线）数据问题
 * 自动同步接口数据，确保边能关联到接口并显示流量
 */

// 加载环境变量
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { interfaceCollector } from '../src/services/collector/interface';
import { topologyCollector } from '../src/services/collector/topology';

const prisma = new PrismaClient();

async function fixTopologyEdges(bvName: string = 'TEST2') {
  console.log('='.repeat(80));
  console.log(`🔧 一键修复 ${bvName} 拓扑边数据`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 步骤 1: 诊断当前状态
    console.log('1️⃣  诊断当前状态...');
    const edgesBefore = await prisma.topologyEdge.findMany({
      where: { viewName: bvName },
      include: { interface: true }
    });
    const edgesWithInterfaceBefore = edgesBefore.filter(e => e.interface).length;
    console.log(`   总边数: ${edgesBefore.length}`);
    console.log(`   已关联接口: ${edgesWithInterfaceBefore}`);
    console.log(`   未关联接口: ${edgesBefore.length - edgesWithInterfaceBefore}`);
    console.log('');

    if (edgesWithInterfaceBefore === edgesBefore.length) {
      console.log('✅ 所有边都已关联接口，无需修复');
      console.log('');
      console.log('💡 如果仍然没有流量数据，可能是：');
      console.log('   1. 流量采集器未运行');
      console.log('   2. 接口未设置为监控（isMonitored = false）');
      console.log('   3. 等待流量采集（每 60 秒一次）');
      return;
    }

    // 步骤 2: 同步接口数据
    console.log('2️⃣  同步接口数据（这可能需要几分钟）...');
    console.log('   正在从 OpManager 获取所有设备的接口...');
    const syncStats = await interfaceCollector.syncInterfaces('MANUAL');
    console.log(`   ✅ 接口同步完成`);
    console.log(`      - 考虑的设备: ${syncStats.devicesConsidered || 0}`);
    console.log(`      - 处理的设备: ${syncStats.devicesProcessed || 0}`);
    console.log(`      - 获取的接口: ${syncStats.interfacesFetched || 0}`);
    console.log(`      - 同步的接口: ${syncStats.interfacesUpserted || 0}`);
    console.log('');

    // 步骤 3: 重新同步拓扑（刷新边的关联）
    console.log('3️⃣  重新同步拓扑...');
    const topoResult = await topologyCollector.syncBusinessView(bvName);
    console.log(`   ✅ 拓扑同步完成`);
    console.log(`      - 节点: ${topoResult.nodes}`);
    console.log(`      - 边: ${topoResult.edges}`);
    console.log('');

    // 步骤 4: 验证修复结果
    console.log('4️⃣  验证修复结果...');
    const edgesAfter = await prisma.topologyEdge.findMany({
      where: { viewName: bvName },
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

    const edgesWithInterfaceAfter = edgesAfter.filter(e => e.interface).length;
    const edgesWithTraffic = edgesAfter.filter(
      e => e.interface?.trafficMetrics && e.interface.trafficMetrics.length > 0
    ).length;

    console.log(`   总边数: ${edgesAfter.length}`);
    console.log(`   已关联接口: ${edgesWithInterfaceAfter}`);
    console.log(`   有流量数据: ${edgesWithTraffic}`);
    console.log('');

    // 步骤 5: 结果摘要
    console.log('='.repeat(80));
    console.log('📊 修复结果摘要:');
    console.log('─'.repeat(80));

    const improvement = edgesWithInterfaceAfter - edgesWithInterfaceBefore;
    if (improvement > 0) {
      console.log(`   ✅ 成功修复 ${improvement} 条边的接口关联`);
    }

    if (edgesWithInterfaceAfter === edgesAfter.length) {
      console.log(`   ✅ 所有 ${edgesAfter.length} 条边都已关联接口`);
    } else {
      const remaining = edgesAfter.length - edgesWithInterfaceAfter;
      console.log(`   ⚠️  仍有 ${remaining} 条边未关联接口`);
      console.log('');
      console.log('   可能原因:');
      console.log('   1. OpManager 中这些边对应的接口不存在');
      console.log('   2. 边的 metadata.objName 与接口 opmanagerId 不匹配');
      console.log('');
      console.log('   建议: 运行详细诊断查看具体问题');
      console.log('   npm run diagnose:topology-edges');
    }

    if (edgesWithTraffic > 0) {
      console.log(`   ✅ ${edgesWithTraffic} 条边有流量数据`);
    } else {
      console.log('   ⚠️  暂无流量数据（等待采集器运行）');
      console.log('');
      console.log('   流量数据采集说明:');
      console.log('   - 流量采集器每 60 秒自动采集一次');
      console.log('   - 请等待 1-2 分钟后刷新 Dashboard 查看');
      console.log('   - 或运行: npm run test:metric-collection');
    }

    console.log('');
    console.log('🎯 下一步:');
    console.log('─'.repeat(80));
    console.log('   1. 刷新 Dashboard: http://localhost:3000/dashboard');
    console.log('   2. 选择业务视图 TEST2');
    console.log('   3. 查看连线是否显示流量数据');
    console.log('   4. 如仍有问题，运行: npm run diagnose:topology-edges');
    console.log('');

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取业务视图名称
const bvName = process.argv[2] || 'TEST2';
fixTopologyEdges(bvName).catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
