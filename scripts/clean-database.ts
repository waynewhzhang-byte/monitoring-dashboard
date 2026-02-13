/**
 * 数据库清理脚本
 * 清空所有业务数据，保留 Schema 结构
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });

const prisma = new PrismaClient();

console.log('\n========================================');
console.log('数据库清理工具');
console.log('========================================\n');

async function cleanDatabase() {
  try {
    console.log('⚠️  警告: 此操作将删除所有数据！');
    console.log('   数据库: ' + process.env.DATABASE_URL?.split('@')[1]?.split('?')[0]);
    console.log('');

    // 显示当前数据统计
    console.log('📊 当前数据统计:');
    const currentStats = {
      devices: await prisma.device.count(),
      interfaces: await prisma.interface.count(),
      alarms: await prisma.alarm.count(),
      metrics: await prisma.deviceMetric.count(),
      traffic: await prisma.trafficMetric.count(),
      topologyNodes: await prisma.topologyNode.count(),
      topologyEdges: await prisma.topologyEdge.count(),
      businessViews: await prisma.businessViewConfig.count(),
    };

    console.log(`   设备: ${currentStats.devices}`);
    console.log(`   接口: ${currentStats.interfaces}`);
    console.log(`   告警: ${currentStats.alarms}`);
    console.log(`   设备指标: ${currentStats.metrics}`);
    console.log(`   流量指标: ${currentStats.traffic}`);
    console.log(`   拓扑节点: ${currentStats.topologyNodes}`);
    console.log(`   拓扑边: ${currentStats.topologyEdges}`);
    console.log(`   Business Views: ${currentStats.businessViews}`);
    console.log('');

    console.log('🔄 开始清理数据...\n');

    // 按照依赖关系的逆序删除数据
    console.log('步骤 1/8: 删除流量指标...');
    const deletedTraffic = await prisma.trafficMetric.deleteMany({});
    console.log(`   ✅ 删除 ${deletedTraffic.count} 条流量指标记录`);

    console.log('步骤 2/8: 删除设备指标...');
    const deletedMetrics = await prisma.deviceMetric.deleteMany({});
    console.log(`   ✅ 删除 ${deletedMetrics.count} 条设备指标记录`);

    console.log('步骤 3/8: 删除拓扑边...');
    const deletedEdges = await prisma.topologyEdge.deleteMany({});
    console.log(`   ✅ 删除 ${deletedEdges.count} 条拓扑边记录`);

    console.log('步骤 4/8: 删除拓扑节点...');
    const deletedNodes = await prisma.topologyNode.deleteMany({});
    console.log(`   ✅ 删除 ${deletedNodes.count} 条拓扑节点记录`);

    console.log('步骤 5/8: 删除 Business View 关联...');
    const deletedBVDevice = await prisma.deviceBusinessView.deleteMany({});
    console.log(`   ✅ 删除 ${deletedBVDevice.count} 条 Business View 关联记录`);

    console.log('步骤 6/8: 删除接口...');
    const deletedInterfaces = await prisma.interface.deleteMany({});
    console.log(`   ✅ 删除 ${deletedInterfaces.count} 条接口记录`);

    console.log('步骤 7/8: 删除告警...');
    const deletedAlarms = await prisma.alarm.deleteMany({});
    console.log(`   ✅ 删除 ${deletedAlarms.count} 条告警记录`);

    console.log('步骤 8/8: 删除设备...');
    const deletedDevices = await prisma.device.deleteMany({});
    console.log(`   ✅ 删除 ${deletedDevices.count} 条设备记录`);

    console.log('\n========================================');
    console.log('✅ 数据库清理完成！');
    console.log('========================================');

    console.log('\n📊 删除统计:');
    console.log(`   设备: ${deletedDevices.count}`);
    console.log(`   接口: ${deletedInterfaces.count}`);
    console.log(`   告警: ${deletedAlarms.count}`);
    console.log(`   设备指标: ${deletedMetrics.count}`);
    console.log(`   流量指标: ${deletedTraffic.count}`);
    console.log(`   拓扑节点: ${deletedNodes.count}`);
    console.log(`   拓扑边: ${deletedEdges.count}`);
    console.log(`   Business View 关联: ${deletedBVDevice.count}`);
    console.log('');

    // 验证清理结果
    console.log('🔍 验证清理结果...');
    const afterStats = {
      devices: await prisma.device.count(),
      interfaces: await prisma.interface.count(),
      alarms: await prisma.alarm.count(),
      metrics: await prisma.deviceMetric.count(),
      traffic: await prisma.trafficMetric.count(),
      topologyNodes: await prisma.topologyNode.count(),
      topologyEdges: await prisma.topologyEdge.count(),
    };

    const allEmpty = Object.values(afterStats).every(count => count === 0);
    if (allEmpty) {
      console.log('   ✅ 所有数据表已清空');
    } else {
      console.log('   ⚠️  部分数据表未完全清空:');
      Object.entries(afterStats).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`      ${table}: ${count} 条记录`);
        }
      });
    }

    console.log('\n💡 下一步:');
    console.log('   运行完整同步脚本从生产环境导入数据');
    console.log('   npx tsx scripts/full-production-sync.ts');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 清理失败:');
    console.error(`   错误信息: ${error.message}`);
    console.error(`   错误堆栈:\n${error.stack}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行清理
cleanDatabase().catch(console.error);
