// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 检查接口同步状态\n');

  // 1. 检查数据库中的接口总数
  const totalInterfaces = await prisma.interface.count();
  console.log(`📊 数据库中的接口总数: ${totalInterfaces}`);

  // 2. 按监控状态分类
  const monitoredCount = await prisma.interface.count({
    where: { isMonitored: true }
  });
  const unmonitoredCount = await prisma.interface.count({
    where: { isMonitored: false }
  });
  console.log(`\n📈 监控状态分类:`);
  console.log(`   已启用监控: ${monitoredCount}`);
  console.log(`   已禁用监控: ${unmonitoredCount}`);

  // 3. 按状态分类
  const statusCounts = await prisma.interface.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });
  console.log(`\n📊 接口状态分类:`);
  statusCounts.forEach(item => {
    console.log(`   ${item.status}: ${item._count.id}`);
  });

  // 4. 按设备统计接口数量
  const interfacesByDevice = await prisma.interface.groupBy({
    by: ['deviceId'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  console.log(`\n📡 接口数量最多的前10个设备:`);
  for (const item of interfacesByDevice) {
    const device = await prisma.device.findUnique({
      where: { id: item.deviceId },
      select: { name: true, displayName: true, ipAddress: true }
    });
    const deviceName = device?.displayName || device?.name || '未知设备';
    const deviceIp = device?.ipAddress || 'N/A';
    console.log(`   ${deviceName} (${deviceIp}): ${item._count.id} 个接口`);
  }

  // 5. 检查有标签的接口数量
  const interfacesWithTags = await prisma.interface.findMany({
    where: {
      tags: {
        isEmpty: false
      }
    },
    select: {
      id: true,
      tags: true
    }
  });
  console.log(`\n🏷️  标签统计:`);
  console.log(`   有标签的接口: ${interfacesWithTags.length}`);
  console.log(`   无标签的接口: ${totalInterfaces - interfacesWithTags.length}`);

  // 统计所有标签的使用频率
  const tagFrequency = new Map<string, number>();
  interfacesWithTags.forEach(iface => {
    if (iface.tags && Array.isArray(iface.tags)) {
      iface.tags.forEach(tag => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      });
    }
  });

  if (tagFrequency.size > 0) {
    console.log(`\n   标签使用频率:`);
    const sortedTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedTags.forEach(([tag, count]) => {
      console.log(`     "${tag}": ${count} 个接口`);
    });
  }

  // 6. 检查最近同步的接口
  console.log(`\n🕐 最近同步的接口:`);
  const recentInterfaces = await prisma.interface.findMany({
    where: {
      lastSyncAt: {
        not: null
      }
    },
    select: {
      name: true,
      displayName: true,
      lastSyncAt: true,
      device: {
        select: {
          displayName: true,
          name: true
        }
      }
    },
    orderBy: {
      lastSyncAt: 'desc'
    },
    take: 5
  });

  if (recentInterfaces.length > 0) {
    recentInterfaces.forEach(iface => {
      const deviceName = iface.device.displayName || iface.device.name;
      const ifaceName = iface.displayName || iface.name;
      const syncTime = iface.lastSyncAt ? new Date(iface.lastSyncAt).toLocaleString('zh-CN') : '从未同步';
      console.log(`   ${deviceName} - ${ifaceName}: ${syncTime}`);
    });
  } else {
    console.log(`   暂无同步记录`);
  }

  // 7. 检查从未同步的接口数量
  const neverSyncedCount = await prisma.interface.count({
    where: {
      lastSyncAt: null
    }
  });
  console.log(`\n⚠️  同步状态:`);
  console.log(`   从未同步的接口: ${neverSyncedCount}`);
  console.log(`   已同步的接口: ${totalInterfaces - neverSyncedCount}`);

  // 8. 按设备类型统计接口数量
  const interfacesByDeviceType = await prisma.interface.findMany({
    select: {
      device: {
        select: {
          type: true
        }
      }
    }
  });

  const typeCounts = new Map<string, number>();
  interfacesByDeviceType.forEach(item => {
    const deviceType = item.device?.type || 'UNKNOWN';
    typeCounts.set(deviceType, (typeCounts.get(deviceType) || 0) + 1);
  });

  if (typeCounts.size > 0) {
    console.log(`\n📱 按设备类型统计接口数量:`);
    const sortedTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    sortedTypes.forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 个接口`);
    });
  }

  await prisma.$disconnect();
  console.log(`\n✅ 检查完成！`);
}

main().catch(console.error);
