// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

async function main() {
  console.log('🔍 检查设备和接口同步状态\n');
  console.log('='.repeat(60));

  // ==================== 设备统计 ====================
  console.log('\n📱 设备统计');
  console.log('-'.repeat(60));

  // 1. 数据库中的设备总数
  const totalDevices = await prisma.device.count();
  console.log(`\n📊 数据库中的设备总数: ${totalDevices}`);

  // 2. 按监控状态分类
  const monitoredDevices = await prisma.device.count({
    where: { isMonitored: true }
  });
  const unmonitoredDevices = await prisma.device.count({
    where: { isMonitored: false }
  });
  console.log(`   已启用监控: ${monitoredDevices}`);
  console.log(`   已禁用监控: ${unmonitoredDevices}`);

  // 3. 按状态分类
  const deviceStatusCounts = await prisma.device.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });
  console.log(`\n📊 设备状态分类:`);
  deviceStatusCounts.forEach(item => {
    console.log(`   ${item.status}: ${item._count.id}`);
  });

  // 4. 按类型分类
  const deviceTypeCounts = await prisma.device.groupBy({
    by: ['type'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });
  console.log(`\n📱 设备类型分类:`);
  deviceTypeCounts.forEach(item => {
    console.log(`   ${item.type}: ${item._count.id}`);
  });

  // 5. 检查 OpManager 中的设备数量（如果可连接）
  try {
    console.log(`\n📡 从 OpManager 获取设备总数...`);
    const firstPage = await (opClient as any).getDevicesPage({
      page: 1,
      rows: 1
    });
    
    const totalInOpManager = firstPage.total || firstPage.records || 0;
    console.log(`📊 OpManager 中的设备总数: ${totalInOpManager}`);
    
    if (totalInOpManager > totalDevices) {
      console.log(`\n⚠️  发现差异: OpManager 有 ${totalInOpManager} 个设备，但数据库只有 ${totalDevices} 个`);
      console.log(`   缺少 ${totalInOpManager - totalDevices} 个设备`);
      console.log(`   建议: 运行设备同步以确保所有设备都被同步`);
    } else if (totalInOpManager === totalDevices) {
      console.log(`\n✅ 设备数量一致`);
    } else {
      console.log(`\n⚠️  数据库中的设备数量 (${totalDevices}) 多于 OpManager (${totalInOpManager})`);
    }
  } catch (error: any) {
    console.log(`\n⚠️  无法连接到 OpManager: ${error.message}`);
    console.log(`   跳过 OpManager 设备数量检查`);
  }

  // ==================== 接口统计 ====================
  console.log('\n\n🔌 接口统计');
  console.log('-'.repeat(60));

  // 1. 数据库中的接口总数
  const totalInterfaces = await prisma.interface.count();
  console.log(`\n📊 数据库中的接口总数: ${totalInterfaces}`);

  // 2. 按监控状态分类
  const monitoredInterfaces = await prisma.interface.count({
    where: { isMonitored: true }
  });
  const unmonitoredInterfaces = await prisma.interface.count({
    where: { isMonitored: false }
  });
  console.log(`   已启用监控: ${monitoredInterfaces}`);
  console.log(`   已禁用监控: ${unmonitoredInterfaces}`);

  // 3. 按状态分类
  const interfaceStatusCounts = await prisma.interface.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });
  console.log(`\n📊 接口状态分类:`);
  interfaceStatusCounts.forEach(item => {
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
    take: 5
  });

  if (interfacesByDevice.length > 0) {
    console.log(`\n📡 接口数量最多的前5个设备:`);
    for (const item of interfacesByDevice) {
      const device = await prisma.device.findUnique({
        where: { id: item.deviceId },
        select: { name: true, displayName: true, ipAddress: true }
      });
      const deviceName = device?.displayName || device?.name || '未知设备';
      const deviceIp = device?.ipAddress || 'N/A';
      console.log(`   ${deviceName} (${deviceIp}): ${item._count.id} 个接口`);
    }
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
  console.log(`\n🏷️  接口标签统计:`);
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
    console.log(`\n   标签使用频率 (前10个):`);
    const sortedTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedTags.forEach(([tag, count]) => {
      console.log(`     "${tag}": ${count} 个接口`);
    });
  }

  // 6. 检查设备标签统计
  const devicesWithTags = await prisma.device.findMany({
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
  console.log(`\n🏷️  设备标签统计:`);
  console.log(`   有标签的设备: ${devicesWithTags.length}`);
  console.log(`   无标签的设备: ${totalDevices - devicesWithTags.length}`);

  // ==================== 同步状态 ====================
  console.log('\n\n🕐 同步状态');
  console.log('-'.repeat(60));

  // 设备同步状态
  const devicesNeverSynced = await prisma.device.count({
    where: {
      lastSyncAt: null
    }
  });
  console.log(`\n📱 设备同步状态:`);
  console.log(`   从未同步的设备: ${devicesNeverSynced}`);
  console.log(`   已同步的设备: ${totalDevices - devicesNeverSynced}`);

  // 接口同步状态
  const interfacesNeverSynced = await prisma.interface.count({
    where: {
      lastSyncAt: null
    }
  });
  console.log(`\n🔌 接口同步状态:`);
  console.log(`   从未同步的接口: ${interfacesNeverSynced}`);
  console.log(`   已同步的接口: ${totalInterfaces - interfacesNeverSynced}`);

  // ==================== 总结 ====================
  console.log('\n\n📋 总结');
  console.log('='.repeat(60));
  console.log(`\n✅ 设备总数: ${totalDevices}`);
  console.log(`✅ 接口总数: ${totalInterfaces}`);
  console.log(`✅ 已启用监控的设备: ${monitoredDevices}`);
  console.log(`✅ 已启用监控的接口: ${monitoredInterfaces}`);
  
  if (totalDevices === 0) {
    console.log(`\n⚠️  警告: 数据库中没有设备，请运行设备同步`);
  }
  if (totalInterfaces === 0) {
    console.log(`\n⚠️  警告: 数据库中没有接口，请运行接口同步`);
  }
  if (monitoredDevices === 0 && totalDevices > 0) {
    console.log(`\n⚠️  警告: 所有设备都未启用监控，Dashboard 将无法显示数据`);
  }
  if (monitoredInterfaces === 0 && totalInterfaces > 0) {
    console.log(`\n⚠️  警告: 所有接口都未启用监控`);
  }

  await prisma.$disconnect();
  console.log(`\n✅ 检查完成！`);
}

main().catch(console.error);
