// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

async function main() {
  console.log('🔍 检查设备同步状态\n');

  // 1. 检查数据库中的设备数量
  const dbDeviceCount = await prisma.device.count();
  console.log(`📊 数据库中的设备数量: ${dbDeviceCount}`);

  // 2. 检查 OpManager 中的设备数量
  try {
    console.log('\n📡 从 OpManager 获取设备总数...');
    const firstPage = await (opClient as any).getDevicesPage({
      page: 1,
      rows: 1
    });
    
    const totalInOpManager = firstPage.total || firstPage.records || 0;
    console.log(`📊 OpManager 中的设备总数: ${totalInOpManager}`);
    
    if (totalInOpManager > dbDeviceCount) {
      console.log(`\n⚠️  发现差异: OpManager 有 ${totalInOpManager} 个设备，但数据库只有 ${dbDeviceCount} 个`);
      console.log(`   缺少 ${totalInOpManager - dbDeviceCount} 个设备`);
    } else if (totalInOpManager === dbDeviceCount) {
      console.log(`\n✅ 设备数量一致`);
    } else {
      console.log(`\n⚠️  数据库中的设备数量 (${dbDeviceCount}) 多于 OpManager (${totalInOpManager})`);
    }

    // 3. 尝试获取所有设备（前几页）来检查是否有目标设备
    console.log('\n🔍 检查目标设备 10.141.0.252 是否在 OpManager 中...');
    let foundInOpManager = false;
    let currentPage = 1;
    const rowsPerPage = 100;
    let hasMore = true;
    let checkedPages = 0;
    const maxPagesToCheck = 5; // 只检查前5页，避免太慢

    while (hasMore && checkedPages < maxPagesToCheck) {
      const pageResult = await (opClient as any).getDevicesPage({
        page: currentPage,
        rows: rowsPerPage
      });

      const devices = pageResult.devices || [];
      const targetDevice = devices.find((d: any) => {
        const ip = d.ipAddress || (d as any).ipaddress || '';
        return ip === '10.141.0.252';
      });

      if (targetDevice) {
        foundInOpManager = true;
        console.log(`✅ 在 OpManager 第 ${currentPage} 页找到目标设备:`);
        console.log(`   设备名称: ${targetDevice.name || targetDevice.deviceName || 'N/A'}`);
        console.log(`   IP地址: ${targetDevice.ipAddress || (targetDevice as any).ipaddress || 'N/A'}`);
        console.log(`   状态: ${targetDevice.status || 'N/A'}`);
        break;
      }

      checkedPages++;
      if (devices.length < rowsPerPage) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    if (!foundInOpManager) {
      console.log(`❌ 在前 ${checkedPages} 页中未找到目标设备 10.141.0.252`);
      console.log(`   建议: 运行完整同步以确保所有设备都被同步`);
    }

  } catch (error: any) {
    console.error('❌ 无法连接到 OpManager:', error.message);
  }

  // 4. 检查数据库中设备的更新时间
  console.log('\n📅 检查数据库中设备的同步时间...');
  const devicesWithSyncTime = await prisma.device.findMany({
    select: {
      ipAddress: true,
      name: true,
      lastSyncAt: true,
      updatedAt: true
    },
    orderBy: { lastSyncAt: 'desc' },
    take: 5
  });

  if (devicesWithSyncTime.length > 0) {
    console.log('最近同步的设备:');
    devicesWithSyncTime.forEach(d => {
      console.log(`  - ${d.ipAddress} (${d.name}) - 最后同步: ${d.lastSyncAt || '从未同步'}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
