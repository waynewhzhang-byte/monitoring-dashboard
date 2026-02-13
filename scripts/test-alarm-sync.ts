// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

async function main() {
  console.log('🔍 测试告警同步流程\n');
  console.log('='.repeat(60));

  try {
    // 1. 测试 OpManager API 连接
    console.log('\n📡 步骤 1: 测试 OpManager API 连接...');
    const opAlarms = await opClient.getAlarms();
    console.log(`✅ OpManager API 返回 ${opAlarms.length} 条告警`);

    if (opAlarms.length === 0) {
      console.log('⚠️  警告: OpManager API 返回 0 条告警');
      console.log('   请检查:');
      console.log('   1. OpManager API 是否正常工作');
      console.log('   2. API Key 是否正确');
      console.log('   3. 是否有活动告警');
      await prisma.$disconnect();
      return;
    }

    // 2. 检查前10个告警的设备匹配情况
    console.log(`\n🔍 步骤 2: 检查设备匹配情况 (前10个告警)...`);
    const testAlarms = opAlarms.slice(0, 10);
    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedDetails: Array<{alarmId: string, deviceName: string, reason: string}> = [];

    for (const opAlarm of testAlarms) {
      const alarm = opAlarm as any;
      const deviceName = alarm.name || alarm.deviceName || '';
      
      console.log(`\n   检查告警: ${alarm.id || 'N/A'}`);
      console.log(`     设备名称: ${deviceName}`);
      console.log(`     严重程度: ${alarm.severity || alarm.numericSeverity || 'N/A'}`);

      // 尝试多种匹配方式
      let device = await prisma.device.findFirst({
        where: { name: deviceName },
        select: { id: true, name: true, opmanagerId: true, displayName: true }
      });

      if (device) {
        console.log(`     ✅ 匹配成功 (按 name): ${device.name} (ID: ${device.id})`);
        matchedCount++;
        continue;
      }

      // 尝试按 opmanagerId 匹配
      if (deviceName) {
        device = await prisma.device.findFirst({
          where: { opmanagerId: deviceName },
          select: { id: true, name: true, opmanagerId: true, displayName: true }
        });
        if (device) {
          console.log(`     ✅ 匹配成功 (按 opmanagerId): ${device.opmanagerId} -> ${device.name} (ID: ${device.id})`);
          matchedCount++;
          continue;
        }
      }

      // 尝试按 displayName 模糊匹配
      if (deviceName) {
        device = await prisma.device.findFirst({
          where: { 
            displayName: {
              contains: deviceName,
              mode: 'insensitive'
            }
          },
          select: { id: true, name: true, opmanagerId: true, displayName: true }
        });
        if (device) {
          console.log(`     ✅ 匹配成功 (按 displayName): ${device.displayName} -> ${device.name} (ID: ${device.id})`);
          matchedCount++;
          continue;
        }
      }

      // 所有匹配方式都失败
      console.log(`     ❌ 匹配失败: 数据库中找不到设备 "${deviceName}"`);
      unmatchedCount++;
      unmatchedDetails.push({
        alarmId: alarm.id || 'N/A',
        deviceName: deviceName,
        reason: '设备不存在'
      });

      // 显示数据库中类似的设备名称（用于调试）
      const similarDevices = await prisma.device.findMany({
        where: {
          OR: [
            { name: { contains: deviceName.substring(0, 10), mode: 'insensitive' } },
            { displayName: { contains: deviceName.substring(0, 10), mode: 'insensitive' } },
            { opmanagerId: { contains: deviceName.substring(0, 10), mode: 'insensitive' } }
          ]
        },
        select: { name: true, displayName: true, opmanagerId: true },
        take: 3
      });

      if (similarDevices.length > 0) {
        console.log(`     提示: 找到类似的设备名称:`);
        similarDevices.forEach(d => {
          console.log(`       - name: "${d.name}", displayName: "${d.displayName}", opmanagerId: "${d.opmanagerId}"`);
        });
      }
    }

    // 3. 统计结果
    console.log(`\n📊 步骤 3: 匹配结果统计`);
    console.log(`   总检查告警数: ${testAlarms.length}`);
    console.log(`   成功匹配: ${matchedCount}`);
    console.log(`   匹配失败: ${unmatchedCount}`);
    console.log(`   匹配率: ${((matchedCount / testAlarms.length) * 100).toFixed(1)}%`);

    // 4. 估算全部告警的匹配情况
    if (opAlarms.length > 10) {
      const estimatedMatched = Math.round((matchedCount / testAlarms.length) * opAlarms.length);
      const estimatedUnmatched = opAlarms.length - estimatedMatched;
      console.log(`\n📈 估算全部告警 (${opAlarms.length} 条):`);
      console.log(`   预计可同步: ~${estimatedMatched} 条`);
      console.log(`   预计被跳过: ~${estimatedUnmatched} 条`);
    }

    // 5. 检查数据库中的告警数量
    console.log(`\n📊 步骤 4: 检查数据库中的告警`);
    const dbActiveAlarms = await prisma.alarm.count({
      where: {
        status: {
          in: ['ACTIVE', 'ACKNOWLEDGED']
        }
      }
    });
    console.log(`   数据库中的活动告警: ${dbActiveAlarms}`);

    // 6. 建议
    console.log(`\n💡 建议:`);
    if (unmatchedCount > 0) {
      console.log(`   ⚠️  有 ${unmatchedCount} 个告警无法匹配设备，可能原因:`);
      console.log(`      1. 告警中的设备名称与数据库中的设备名称不匹配`);
      console.log(`      2. 设备尚未同步到数据库`);
      console.log(`      3. 设备名称格式不一致`);
      console.log(`\n   解决方案:`);
      console.log(`      1. 检查未匹配的设备名称，确认是否在数据库中`);
      console.log(`      2. 如果设备存在但名称不同，需要调整匹配逻辑`);
      console.log(`      3. 如果设备不存在，需要先同步设备`);
    }

    if (matchedCount > 0 && dbActiveAlarms === 0) {
      console.log(`   ⚠️  设备匹配成功但数据库中没有告警，可能原因:`);
      console.log(`      1. 告警同步服务未运行`);
      console.log(`      2. 告警同步时出错`);
      console.log(`      3. 告警被去重逻辑过滤`);
      console.log(`\n   解决方案:`);
      console.log(`      1. 检查 Collector 服务是否正在运行`);
      console.log(`      2. 查看 Collector 日志中的告警同步信息`);
      console.log(`      3. 手动触发告警同步测试`);
    }

    if (matchedCount === testAlarms.length && dbActiveAlarms > 0) {
      console.log(`   ✅ 设备匹配正常，告警同步应该可以正常工作`);
    }

  } catch (error: any) {
    console.error(`\n❌ 测试失败:`, error.message);
    console.error(`   错误详情:`, error.stack?.substring(0, 500));
  }

  await prisma.$disconnect();
  console.log(`\n✅ 测试完成！`);
}

main().catch(console.error);
