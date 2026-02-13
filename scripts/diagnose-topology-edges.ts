/**
 * 诊断拓扑边（连线）的流量数据问题
 * 检查为什么连线没有显示流量信息
 */

// 加载环境变量
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { OpManagerClient } from '../src/services/opmanager/client';

const prisma = new PrismaClient();
const opClient = new OpManagerClient();

async function diagnoseTopologyEdges(bvName: string = 'TEST2') {
  console.log('='.repeat(80));
  console.log(`🔍 诊断 ${bvName} 拓扑边（连线）数据`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. 查询数据库中的边
    console.log('1️⃣  查询数据库中的拓扑边...');
    const edges = await prisma.topologyEdge.findMany({
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

    console.log(`   找到 ${edges.length} 条边`);
    console.log('');

    if (edges.length === 0) {
      console.log('⚠️  数据库中没有边数据，请先同步拓扑');
      return;
    }

    // 2. 详细分析每条边
    console.log('2️⃣  边数据详细分析:');
    console.log('─'.repeat(80));

    let edgesWithTraffic = 0;
    let edgesWithInterface = 0;
    let edgesWithMetadata = 0;

    edges.forEach((edge: any, index: number) => {
      const metadata = edge.metadata as any;
      const hasInterface = !!edge.interface;
      const hasTrafficMetric = edge.interface?.trafficMetrics?.length > 0;
      const hasMetadataTraffic = !!(metadata?.InTraffic || metadata?.OutTraffic);

      console.log(`\n边 ${index + 1}: ${edge.label || edge.id}`);
      console.log(`   源: ${edge.sourceId} → 目标: ${edge.targetId}`);

      // 接口关联
      if (hasInterface) {
        edgesWithInterface++;
        console.log(`   ✅ 已关联接口: ${edge.interface.name} (ID: ${edge.interface.id})`);
        console.log(`      - OpManager ID: ${edge.interface.opmanagerId}`);
        console.log(`      - 监控状态: ${edge.interface.isMonitored ? '已监控' : '未监控'}`);
      } else {
        console.log(`   ❌ 未关联接口`);
        console.log(`      - 原因: metadata.objName (${metadata?.objName}) 在 Interface 表中未找到`);
      }

      // 流量指标
      if (hasTrafficMetric) {
        edgesWithTraffic++;
        const metric = edge.interface.trafficMetrics[0];
        console.log(`   ✅ 有流量指标:`);
        console.log(`      - 入带宽: ${metric.inBandwidth || 0} bps`);
        console.log(`      - 出带宽: ${metric.outBandwidth || 0} bps`);
        console.log(`      - 入利用率: ${metric.inUtilization || 0}%`);
        console.log(`      - 时间戳: ${metric.timestamp.toLocaleString()}`);
      } else if (hasInterface) {
        console.log(`   ⚠️  接口存在但无流量指标`);
        console.log(`      - 可能原因: 流量采集器未运行或接口未监控`);
      } else {
        console.log(`   ❌ 无流量指标（接口未关联）`);
      }

      // Metadata 中的流量信息
      if (hasMetadataTraffic) {
        edgesWithMetadata++;
        console.log(`   📊 Metadata 流量信息:`);
        console.log(`      - InTraffic: ${metadata.InTraffic || 'N/A'}`);
        console.log(`      - OutTraffic: ${metadata.OutTraffic || 'N/A'}`);
        console.log(`      - 状态: ${metadata.status || 'N/A'}`);
      } else {
        console.log(`   ⚠️  Metadata 中无流量信息`);
      }

      // 最终显示的标签
      let displayLabel = '';
      if (hasTrafficMetric) {
        const bps = Number(edge.interface.trafficMetrics[0].inBandwidth);
        if (bps >= 1000000000) displayLabel = `${(bps / 1000000000).toFixed(2)} Gbps`;
        else if (bps >= 1000000) displayLabel = `${(bps / 1000000).toFixed(2)} Mbps`;
        else if (bps >= 1000) displayLabel = `${(bps / 1000).toFixed(2)} Kbps`;
        else displayLabel = `${bps.toFixed(0)} bps`;
      } else if (metadata?.InTraffic) {
        displayLabel = metadata.InTraffic;
      } else if (metadata?.intfDisplayName || metadata?.ifName) {
        displayLabel = metadata.intfDisplayName || metadata.ifName;
      } else {
        displayLabel = '(无数据)';
      }

      console.log(`   🏷️  最终显示标签: "${displayLabel}"`);
    });

    // 3. 统计摘要
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 统计摘要:');
    console.log('─'.repeat(80));
    console.log(`   总边数: ${edges.length}`);
    console.log(`   已关联接口: ${edgesWithInterface} (${((edgesWithInterface / edges.length) * 100).toFixed(1)}%)`);
    console.log(`   有流量指标: ${edgesWithTraffic} (${((edgesWithTraffic / edges.length) * 100).toFixed(1)}%)`);
    console.log(`   Metadata有流量: ${edgesWithMetadata} (${((edgesWithMetadata / edges.length) * 100).toFixed(1)}%)`);
    console.log('');

    // 4. 问题诊断
    console.log('🔧 问题诊断:');
    console.log('─'.repeat(80));

    if (edgesWithTraffic === edges.length) {
      console.log('   ✅ 所有边都有流量数据，显示正常');
    } else if (edgesWithInterface < edges.length) {
      console.log(`   ⚠️  有 ${edges.length - edgesWithInterface} 条边未关联接口`);
      console.log('   原因: 拓扑边的 metadata.objName 与 Interface 表的 opmanagerId 不匹配');
      console.log('   解决: 运行接口同步 - npm run sync:interfaces');
    }

    if (edgesWithInterface > 0 && edgesWithTraffic === 0) {
      console.log('   ⚠️  接口已关联但无流量指标');
      console.log('   原因: 流量采集器未运行或接口未设置为监控');
      console.log('   解决:');
      console.log('      1. 检查采集器运行状态');
      console.log('      2. 确保接口 isMonitored = true');
      console.log('      3. 等待流量采集（每 60 秒一次）');
    }

    if (edgesWithMetadata > 0 && edgesWithTraffic === 0) {
      console.log('   💡 Metadata 中有流量数据，可以作为临时显示');
      console.log('   说明: 虽然没有实时流量指标，但 OpManager 返回的 Metadata 包含流量信息');
    }

    // 5. 建议操作
    console.log('');
    console.log('💡 建议操作:');
    console.log('─'.repeat(80));
    console.log('   1. 同步接口数据（确保边能关联到接口）:');
    console.log('      curl -X POST http://localhost:3000/api/interfaces/sync');
    console.log('');
    console.log('   2. 检查流量采集器是否运行:');
    console.log('      # 查看采集器日志');
    console.log('      pm2 logs collector');
    console.log('');
    console.log('   3. 手动触发一次流量采集（仅用于测试）:');
    console.log('      npm run test:metric-collection');
    console.log('');
    console.log('   4. 重新同步拓扑（刷新边的 metadata）:');
    console.log('      npm run sync:bv-safe TEST2');
    console.log('');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取业务视图名称
const bvName = process.argv[2] || 'TEST2';
diagnoseTopologyEdges(bvName).catch(console.error);
