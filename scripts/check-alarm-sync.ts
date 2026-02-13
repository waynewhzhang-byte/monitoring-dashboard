// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

async function main() {
  console.log('🔍 检查告警同步状态\n');
  console.log('='.repeat(60));

  // 1. 检查数据库中的告警数量
  const totalAlarms = await prisma.alarm.count();
  console.log(`\n📊 数据库中的告警总数: ${totalAlarms}`);

  // 2. 按状态分类
  const activeAlarms = await prisma.alarm.count({
    where: {
      status: {
        in: ['ACTIVE', 'ACKNOWLEDGED']
      }
    }
  });
  const resolvedAlarms = await prisma.alarm.count({
    where: {
      status: 'RESOLVED'
    }
  });
  console.log(`\n📊 告警状态分类:`);
  console.log(`   活动告警 (ACTIVE/ACKNOWLEDGED): ${activeAlarms}`);
  console.log(`   已解决告警 (RESOLVED): ${resolvedAlarms}`);

  // 3. 按严重程度分类
  const severityCounts = await prisma.alarm.groupBy({
    by: ['severity'],
    _count: {
      id: true
    }
  });
  console.log(`\n📊 告警严重程度分类:`);
  severityCounts.forEach(item => {
    console.log(`   ${item.severity}: ${item._count.id}`);
  });

  // 4. 检查 OpManager API 中的告警数量
  try {
    console.log(`\n📡 从 OpManager API 获取告警...`);
    const opAlarms = await opClient.getAlarms();
    console.log(`📊 OpManager API 返回的告警数量: ${opAlarms.length}`);
    
    if (opAlarms.length > 0) {
      console.log(`\n📋 OpManager 告警示例 (前3个):`);
      opAlarms.slice(0, 3).forEach((alarm: any, index: number) => {
        console.log(`\n   告警 ${index + 1}:`);
        console.log(`     ID: ${alarm.id || alarm.alarmId || 'N/A'}`);
        console.log(`     设备名称: ${alarm.name || alarm.deviceName || 'N/A'}`);
        console.log(`     严重程度: ${alarm.severity || alarm.numericSeverity || alarm.severityString || 'N/A'}`);
        console.log(`     消息: ${(alarm.message || '').substring(0, 50)}...`);
        console.log(`     修改时间: ${alarm.modTime || 'N/A'}`);
      });
    }

    // 5. 检查设备匹配情况
    console.log(`\n🔍 检查告警设备匹配情况...`);
    let matchedDevices = 0;
    let unmatchedDevices = 0;
    const unmatchedDeviceNames = new Set<string>();

    for (const alarm of opAlarms.slice(0, 20)) { // 只检查前20个以节省时间
      const deviceName = (alarm as any).name || (alarm as any).deviceName;
      if (!deviceName) continue;

      const device = await prisma.device.findFirst({
        where: { name: deviceName },
        select: { id: true, name: true }
      });

      if (device) {
        matchedDevices++;
      } else {
        unmatchedDevices++;
        unmatchedDeviceNames.add(deviceName);
      }
    }

    console.log(`   匹配的设备: ${matchedDevices}`);
    console.log(`   未匹配的设备: ${unmatchedDevices}`);
    if (unmatchedDeviceNames.size > 0) {
      console.log(`\n   未匹配的设备名称 (前10个):`);
      Array.from(unmatchedDeviceNames).slice(0, 10).forEach(name => {
        console.log(`     - ${name}`);
      });
    }

    // 6. 对比数据库和 OpManager
    console.log(`\n📊 对比分析:`);
    console.log(`   OpManager API 告警数: ${opAlarms.length}`);
    console.log(`   数据库活动告警数: ${activeAlarms}`);
    
    if (opAlarms.length > activeAlarms) {
      const diff = opAlarms.length - activeAlarms;
      console.log(`\n⚠️  发现差异: OpManager 有 ${opAlarms.length} 个告警，但数据库只有 ${activeAlarms} 个活动告警`);
      console.log(`   缺少 ${diff} 个告警`);
      
      if (unmatchedDevices > 0) {
        console.log(`\n   可能原因:`);
        console.log(`   - ${unmatchedDevices} 个告警的设备在数据库中找不到匹配的设备`);
        console.log(`   - 告警同步时跳过了这些告警`);
      }
    } else if (opAlarms.length === activeAlarms) {
      console.log(`\n✅ 告警数量一致`);
    } else {
      console.log(`\n⚠️  数据库中的活动告警 (${activeAlarms}) 多于 OpManager (${opAlarms.length})`);
    }

  } catch (error: any) {
    console.error(`\n❌ 无法从 OpManager 获取告警:`, error.message);
    console.log(`   跳过 OpManager 告警数量检查`);
  }

  // 7. 检查最近同步的告警
  console.log(`\n🕐 最近创建的告警 (前5个):`);
  const recentAlarms = await prisma.alarm.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    include: {
      device: {
        select: {
          name: true,
          displayName: true,
          ipAddress: true
        }
      }
    }
  });

  if (recentAlarms.length > 0) {
    recentAlarms.forEach((alarm, index) => {
      const deviceName = alarm.device.displayName || alarm.device.name;
      console.log(`\n   ${index + 1}. ${alarm.title?.substring(0, 40)}...`);
      console.log(`      设备: ${deviceName} (${alarm.device.ipAddress})`);
      console.log(`      严重程度: ${alarm.severity}, 状态: ${alarm.status}`);
      console.log(`      创建时间: ${alarm.createdAt.toLocaleString('zh-CN')}`);
    });
  } else {
    console.log(`   暂无告警记录`);
  }

  await prisma.$disconnect();
  console.log(`\n✅ 检查完成！`);
}

main().catch(console.error);
