// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';

async function main() {
  const targetIP = '10.141.0.252';
  
  console.log(`🔍 检查设备 IP: ${targetIP}\n`);

  // 1. 检查设备是否存在
  const device = await prisma.device.findFirst({
    where: { ipAddress: targetIP },
    select: {
      id: true,
      name: true,
      displayName: true,
      ipAddress: true,
      type: true,
      status: true,
      isMonitored: true,
      updatedAt: true,
      createdAt: true,
    }
  });

  if (!device) {
    console.log(`❌ 未找到 IP 为 ${targetIP} 的设备`);
    console.log(`\n📊 检查数据库中所有设备的 IP 地址...`);
    const allDevices = await prisma.device.findMany({
      select: { ipAddress: true, name: true, displayName: true },
      orderBy: { ipAddress: 'asc' }
    });
    console.log(`总设备数: ${allDevices.length}`);
    console.log(`\n前10个设备的IP:`);
    allDevices.slice(0, 10).forEach(d => {
      console.log(`  - ${d.ipAddress} (${d.displayName || d.name})`);
    });
    return;
  }

  console.log(`✅ 找到设备:`);
  console.log(`  ID: ${device.id}`);
  console.log(`  名称: ${device.name}`);
  console.log(`  显示名称: ${device.displayName || '(无)'}`);
  console.log(`  IP地址: ${device.ipAddress}`);
  console.log(`  类型: ${device.type}`);
  console.log(`  状态: ${device.status}`);
  console.log(`  是否监控: ${device.isMonitored}`);
  console.log(`  创建时间: ${device.createdAt}`);
  console.log(`  更新时间: ${device.updatedAt}`);

  // 2. 检查该设备在排序后的位置（按 updatedAt desc）
  const totalDevices = await prisma.device.count();
  const devicesBefore = await prisma.device.count({
    where: {
      updatedAt: {
        gt: device.updatedAt
      }
    }
  });
  const position = devicesBefore + 1;

  console.log(`\n📊 排序位置分析 (按 updatedAt DESC):`);
  console.log(`  总设备数: ${totalDevices}`);
  console.log(`  该设备位置: 第 ${position} 位`);
  console.log(`  是否在前1000个: ${position <= 1000 ? '✅ 是' : '❌ 否'}`);

  // 3. 检查如果使用 limit=1000 是否能获取到
  const devicesWithLimit = await prisma.device.findMany({
    where: {},
    skip: 0,
    take: 1000,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, ipAddress: true }
  });

  const isInFirst1000 = devicesWithLimit.some(d => d.id === device.id);
  console.log(`\n🔍 使用 limit=1000 查询结果:`);
  console.log(`  返回设备数: ${devicesWithLimit.length}`);
  console.log(`  是否包含目标设备: ${isInFirst1000 ? '✅ 是' : '❌ 否'}`);

  // 4. 检查搜索功能
  console.log(`\n🔍 搜索功能测试:`);
  const searchResults = await prisma.device.findMany({
    where: {
      OR: [
        { name: { contains: targetIP, mode: 'insensitive' } },
        { displayName: { contains: targetIP, mode: 'insensitive' } },
        { ipAddress: { contains: targetIP } },
      ]
    },
    select: { id: true, ipAddress: true, name: true, displayName: true }
  });
  console.log(`  搜索结果数量: ${searchResults.length}`);
  if (searchResults.length > 0) {
    console.log(`  找到的设备:`);
    searchResults.forEach(d => {
      console.log(`    - ${d.ipAddress} (${d.displayName || d.name})`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
