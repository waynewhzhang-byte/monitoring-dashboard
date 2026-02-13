// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 检查设备标签状态');
  console.log('============================================================\n');

  // 1. 检查带"重要设备"标签的设备数量
  const devicesWithImportantTag = await prisma.device.count({
    where: {
      tags: { has: '重要设备' }
    }
  });
  console.log(`📊 带"重要设备"标签的设备数量: ${devicesWithImportantTag}`);

  // 2. 列出所有带"重要设备"标签的设备
  if (devicesWithImportantTag > 0) {
    console.log('\n📋 带"重要设备"标签的设备列表:');
    const devices = await prisma.device.findMany({
      where: {
        tags: { has: '重要设备' }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        ipAddress: true,
        type: true,
        status: true,
        tags: true,
        isMonitored: true
      },
      take: 20
    });
    devices.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.displayName || d.name} (${d.ipAddress}) - ${d.type} - ${d.status}`);
      console.log(`     标签: [${d.tags.join(', ')}]`);
    });
  } else {
    console.log('\n⚠️  没有设备带有"重要设备"标签');
  }

  // 3. 检查所有设备的标签分布
  console.log('\n📊 所有设备的标签统计:');
  const allDevices = await prisma.device.findMany({
    select: { tags: true }
  });
  
  const tagCounts = new Map<string, number>();
  allDevices.forEach(device => {
    device.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  if (tagCounts.size > 0) {
    console.log('   标签分布:');
    Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([tag, count]) => {
        console.log(`     - "${tag}": ${count} 个设备`);
      });
  } else {
    console.log('   ⚠️  没有设备有任何标签');
  }

  // 4. 检查监控状态
  const monitoredWithTag = await prisma.device.count({
    where: {
      tags: { has: '重要设备' },
      isMonitored: true
    }
  });
  console.log(`\n📈 带"重要设备"标签且已启用监控的设备: ${monitoredWithTag}`);

  // 5. 建议
  console.log('\n💡 建议:');
  if (devicesWithImportantTag === 0) {
    console.log('   1. 需要在 /admin/devices 中为设备添加"重要设备"标签');
    console.log('   2. 添加标签后，Dashboard 的"核心资产状态"面板会显示这些设备');
    console.log('   3. 建议为核心网络设备、关键服务器等添加此标签');
  } else if (monitoredWithTag === 0) {
    console.log('   ⚠️  有设备带有"重要设备"标签，但未启用监控');
    console.log('   建议在 /admin/devices 中启用这些设备的监控');
  } else {
    console.log(`   ✅ 有 ${monitoredWithTag} 个设备带有"重要设备"标签且已启用监控`);
    console.log('   如果 Dashboard 仍然显示为空，请检查：');
    console.log('   1. 浏览器 Console 中的错误信息');
    console.log('   2. API 请求是否成功 (/api/devices?tags=重要设备)');
    console.log('   3. 设备是否有最新的指标数据');
  }

  await prisma.$disconnect();
  console.log('\n✅ 检查完成！');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
