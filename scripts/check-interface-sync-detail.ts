// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { OpManagerClient } from '../src/services/opmanager/client';
import { env } from '../src/lib/env';

const prisma = new PrismaClient();
const opClient = new OpManagerClient();

async function main() {
  console.log('🔍 检查接口同步详细状态');
  console.log('============================================================\n');

  // 1. 获取所有设备
  const devices = await prisma.device.findMany({
    where: {
      ipAddress: { not: 'unknown' }
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      ipAddress: true,
      opmanagerId: true
    },
    orderBy: { displayName: 'asc' }
  });

  console.log(`📊 找到 ${devices.length} 个设备需要检查\n`);

  // 2. 统计数据库中每个设备的接口数量
  const deviceInterfaceCounts = await prisma.interface.groupBy({
    by: ['deviceId'],
    _count: { id: true }
  });

  const dbInterfaceMap = new Map<string, number>();
  deviceInterfaceCounts.forEach(item => {
    dbInterfaceMap.set(item.deviceId, item._count.id);
  });

  // 3. 从 OpManager API 获取每个设备的接口数量（采样前10个设备）
  console.log('📡 从 OpManager API 获取接口数量（采样前10个设备）...\n');
  
  let totalDbInterfaces = 0;
  let totalOpManagerInterfaces = 0;
  const discrepancies: Array<{
    device: string;
    dbCount: number;
    opManagerCount: number;
    difference: number;
  }> = [];

  for (let i = 0; i < Math.min(10, devices.length); i++) {
    const device = devices[i];
    const dbCount = dbInterfaceMap.get(device.id) || 0;
    totalDbInterfaces += dbCount;

    try {
      const opInterfaces = await opClient.getInterfaces({ deviceIpAddress: device.ipAddress });
      const opCount = opInterfaces.length;
      totalOpManagerInterfaces += opCount;

      console.log(`${i + 1}. ${device.displayName || device.name} (${device.ipAddress}):`);
      console.log(`   数据库: ${dbCount} 个接口`);
      console.log(`   OpManager API: ${opCount} 个接口`);
      
      if (dbCount !== opCount) {
        const diff = opCount - dbCount;
        console.log(`   ⚠️  差异: ${diff > 0 ? '+' : ''}${diff}`);
        discrepancies.push({
          device: device.displayName || device.name,
          dbCount,
          opManagerCount: opCount,
          difference: diff
        });
      } else {
        console.log(`   ✅ 数量一致`);
      }
      console.log('');
    } catch (error: any) {
      console.error(`   ❌ 获取失败: ${error.message}`);
      console.log('');
    }
  }

  // 4. 统计所有设备的接口数量
  console.log('\n📊 总体统计:');
  const allDbInterfaces = await prisma.interface.count();
  console.log(`   数据库总接口数: ${allDbInterfaces}`);
  console.log(`   采样设备数据库接口数: ${totalDbInterfaces}`);
  console.log(`   采样设备 OpManager 接口数: ${totalOpManagerInterfaces}`);
  
  if (discrepancies.length > 0) {
    console.log(`\n⚠️  发现 ${discrepancies.length} 个设备的接口数量不一致:`);
    discrepancies.forEach(d => {
      console.log(`   - ${d.device}: 数据库 ${d.dbCount}, OpManager ${d.opManagerCount}, 差异 ${d.difference > 0 ? '+' : ''}${d.difference}`);
    });
    console.log('\n💡 可能的原因:');
    console.log('   1. OpManager API 可能有分页限制（只返回前 N 个接口）');
    console.log('   2. 某些接口可能被过滤（如 suppressed 接口）');
    console.log('   3. 接口同步可能未完成');
    console.log('\n🔧 建议:');
    console.log('   1. 检查 OpManager API 文档，确认 getInterfaces 是否有分页参数');
    console.log('   2. 重新运行接口同步: 在 /admin/interfaces 页面点击"同步接口"');
    console.log('   3. 检查同步日志，查看是否有错误或警告');
  } else {
    console.log('\n✅ 采样设备的接口数量一致');
  }

  // 5. 检查接口数量最多的设备
  console.log('\n📈 接口数量最多的设备（数据库）:');
  const topDevices = await prisma.interface.groupBy({
    by: ['deviceId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  for (const item of topDevices) {
    const device = await prisma.device.findUnique({
      where: { id: item.deviceId },
      select: { displayName: true, name: true, ipAddress: true }
    });
    console.log(`   - ${device?.displayName || device?.name || item.deviceId}: ${item._count.id} 个接口`);
  }

  await prisma.$disconnect();
  console.log('\n✅ 检查完成！');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
