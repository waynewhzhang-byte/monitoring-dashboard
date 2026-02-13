/**
 * 批量修复有"核心"标签但未启用监控的服务器
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUnmonitoredCoreServers() {
  console.log('\n=== 批量修复有"核心"标签但未启用监控的服务器 ===\n');

  try {
    // 1. 查找所有符合条件的设备
    console.log('1. 查找有"核心"标签但 isMonitored=false 的服务器...\n');

    const problematicServers = await prisma.device.findMany({
      where: {
        tags: { has: '核心' },
        type: { in: ['SERVER', 'STORAGE', 'OTHER'] },
        isMonitored: false
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        ipAddress: true,
        type: true,
        status: true,
        tags: true
      }
    });

    if (problematicServers.length === 0) {
      console.log('✅ 没有找到需要修复的设备');
      console.log('   所有有"核心"标签的服务器都已启用监控\n');
      return;
    }

    console.log(`找到 ${problematicServers.length} 台需要修复的设备:\n`);

    problematicServers.forEach((device, index) => {
      console.log(`[${index + 1}] ${device.displayName || device.name}`);
      console.log(`    IP: ${device.ipAddress}`);
      console.log(`    类型: ${device.type}`);
      console.log(`    状态: ${device.status}`);
      console.log(`    当前监控状态: ❌ isMonitored=false`);
      console.log('');
    });

    // 2. 询问是否修复
    console.log('=== 修复操作 ===\n');
    console.log('将要执行的操作：');
    console.log(`  - 将以上 ${problematicServers.length} 台设备的 isMonitored 字段设置为 true`);
    console.log('  - 这样它们就会在"硬件服务器"页签中显示\n');

    // 3. 执行批量更新
    console.log('正在执行批量更新...\n');

    const result = await prisma.device.updateMany({
      where: {
        id: { in: problematicServers.map(d => d.id) }
      },
      data: {
        isMonitored: true
      }
    });

    console.log(`✅ 成功更新 ${result.count} 台设备\n`);

    // 4. 验证结果
    console.log('验证修复结果...\n');

    const updatedDevices = await prisma.device.findMany({
      where: {
        id: { in: problematicServers.map(d => d.id) }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        ipAddress: true,
        isMonitored: true
      }
    });

    updatedDevices.forEach((device, index) => {
      console.log(`[${index + 1}] ${device.displayName || device.name} (${device.ipAddress})`);
      console.log(`    监控状态: ${device.isMonitored ? '✅ 已启用' : '❌ 未启用'}`);
      console.log('');
    });

    // 5. 再次运行诊断确认
    console.log('\n=== 修复后诊断 ===\n');

    const nowVisibleServers = await prisma.device.findMany({
      where: {
        tags: { has: '核心' },
        type: { in: ['SERVER', 'STORAGE', 'OTHER'] },
        isMonitored: true
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        ipAddress: true,
        type: true
      }
    });

    console.log(`✅ 现在有 ${nowVisibleServers.length} 台服务器符合显示条件：\n`);
    nowVisibleServers.forEach((device, index) => {
      console.log(`   [${index + 1}] ${device.displayName || device.name} (${device.ipAddress})`);
    });

    console.log('\n=== 完成 ===\n');
    console.log('✅ 修复完成！');
    console.log('   请在浏览器中刷新页面（Ctrl+F5），然后：');
    console.log('   1. 打开 http://localhost:3000/dashboard');
    console.log('   2. 切换到"硬件服务器"页签');
    console.log('   3. 在标签选择器中选择"核心"');
    console.log('   4. 应该能看到以上设备了\n');

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUnmonitoredCoreServers();
