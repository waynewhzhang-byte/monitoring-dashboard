/**
 * 诊断硬件服务器标签过滤问题
 * 检查标签为"核心"的服务器为什么没有显示
 */

import { PrismaClient, DeviceType } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('\n=== 诊断硬件服务器标签过滤问题 ===\n');

  try {
    // 1. 查询所有包含"核心"标签的设备
    console.log('1. 查询所有包含"核心"标签的设备...\n');
    const devicesWithCoreTag = await prisma.device.findMany({
      where: {
        tags: { has: '核心' }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        ipAddress: true,
        tags: true,
        isMonitored: true,
        status: true
      }
    });

    console.log(`找到 ${devicesWithCoreTag.length} 台带有"核心"标签的设备:\n`);

    if (devicesWithCoreTag.length === 0) {
      console.log('❌ 没有找到任何带有"核心"标签的设备！');
      console.log('   请检查：');
      console.log('   1. 是否在 /admin 中正确添加了标签？');
      console.log('   2. 标签是否为"核心"（注意大小写）？\n');
    } else {
      devicesWithCoreTag.forEach((device, index) => {
        console.log(`[${index + 1}] ${device.displayName || device.name}`);
        console.log(`    ID: ${device.id}`);
        console.log(`    类型: ${device.type}`);
        console.log(`    IP: ${device.ipAddress}`);
        console.log(`    标签: ${device.tags.join(', ')}`);
        console.log(`    是否监控: ${device.isMonitored ? '✅ 是' : '❌ 否'}`);
        console.log(`    状态: ${device.status}`);
        console.log('');
      });
    }

    // 2. 查询符合"硬件服务器"页签条件的设备（deviceType='servers'）
    console.log('\n2. 查询符合"硬件服务器"页签条件的设备 (deviceType=servers, tag=核心)...\n');

    // 模拟 API 的查询逻辑
    const serverRelatedTags = ['核心服务器', '服务器', 'server', '核心', '核心设备', 'Server', 'SERVER'];
    const tag = '核心';
    const isServerRelatedTag = serverRelatedTags.some(st =>
      tag.includes(st) || tag.toLowerCase().includes(st.toLowerCase())
    );

    console.log(`   标签"${tag}"是否为服务器相关标签: ${isServerRelatedTag ? '✅ 是' : '❌ 否'}`);

    const typeFilter: DeviceType[] = isServerRelatedTag
      ? [DeviceType.SERVER, DeviceType.STORAGE, DeviceType.OTHER]
      : [DeviceType.SERVER, DeviceType.STORAGE];

    console.log(`   使用的类型过滤器: ${typeFilter.join(', ')}\n`);

    const apiQueryDevices = await prisma.device.findMany({
      where: {
        tags: { has: tag },
        isMonitored: true,
        type: { in: typeFilter }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        ipAddress: true,
        tags: true,
        isMonitored: true,
        status: true
      }
    });

    console.log(`API 查询结果: ${apiQueryDevices.length} 台设备\n`);

    if (apiQueryDevices.length === 0) {
      console.log('❌ API 查询没有返回任何设备！');
      console.log('\n可能的原因：');

      // 分析原因
      const reasonAnalysis = [];

      // 检查是否有设备但不满足条件
      const devicesWithTagButWrongType = devicesWithCoreTag.filter(
        d => !typeFilter.includes(d.type)
      );

      const devicesWithTagButNotMonitored = devicesWithCoreTag.filter(
        d => !d.isMonitored
      );

      if (devicesWithTagButWrongType.length > 0) {
        reasonAnalysis.push(`   ❌ 有 ${devicesWithTagButWrongType.length} 台设备标签正确，但类型不符合 (${typeFilter.join(', ')})`);
        devicesWithTagButWrongType.forEach(d => {
          reasonAnalysis.push(`      - ${d.displayName || d.name} (类型: ${d.type})`);
        });
      }

      if (devicesWithTagButNotMonitored.length > 0) {
        reasonAnalysis.push(`   ❌ 有 ${devicesWithTagButNotMonitored.length} 台设备标签正确，但 isMonitored=false`);
        devicesWithTagButNotMonitored.forEach(d => {
          reasonAnalysis.push(`      - ${d.displayName || d.name} (isMonitored: ${d.isMonitored})`);
        });
      }

      if (reasonAnalysis.length > 0) {
        console.log(reasonAnalysis.join('\n'));
      } else {
        console.log('   ⚠️  所有条件都满足，但仍然没有结果。可能是数据库同步问题。');
      }

    } else {
      apiQueryDevices.forEach((device, index) => {
        console.log(`[${index + 1}] ${device.displayName || device.name}`);
        console.log(`    ID: ${device.id}`);
        console.log(`    类型: ${device.type}`);
        console.log(`    IP: ${device.ipAddress}`);
        console.log(`    标签: ${device.tags.join(', ')}`);
        console.log(`    是否监控: ${device.isMonitored ? '✅ 是' : '❌ 否'}`);
        console.log('');
      });
    }

    // 3. 检查所有服务器类型的设备
    console.log('\n3. 检查所有服务器类型的设备...\n');
    const allServers = await prisma.device.findMany({
      where: {
        type: { in: ['SERVER', 'STORAGE', 'OTHER'] }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        tags: true,
        isMonitored: true
      }
    });

    console.log(`总共有 ${allServers.length} 台服务器类型设备:\n`);

    const serverTypeCount: Record<string, number> = {};
    const serverWithCoreTag = allServers.filter(s => s.tags.includes('核心'));
    const serverMonitored = allServers.filter(s => s.isMonitored);

    allServers.forEach(s => {
      serverTypeCount[s.type] = (serverTypeCount[s.type] || 0) + 1;
    });

    console.log('按类型统计:');
    Object.entries(serverTypeCount).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 台`);
    });

    console.log(`\n其中：`);
    console.log(`   - 有"核心"标签: ${serverWithCoreTag.length} 台`);
    console.log(`   - isMonitored=true: ${serverMonitored.length} 台`);
    console.log(`   - 同时满足两个条件: ${serverWithCoreTag.filter(s => s.isMonitored).length} 台`);

    // 4. 建议
    console.log('\n=== 诊断建议 ===\n');

    if (devicesWithCoreTag.length === 0) {
      console.log('🔧 建议：请在 /admin 面板中为服务器添加"核心"标签');
    } else if (apiQueryDevices.length === 0) {
      console.log('🔧 建议：');
      if (devicesWithCoreTag.some(d => !d.isMonitored)) {
        console.log('   1. 检查设备的 isMonitored 字段，确保为 true');
        console.log('      可以在 /admin 面板中启用设备监控');
      }
      if (devicesWithCoreTag.some(d => !['SERVER', 'STORAGE', 'OTHER'].includes(d.type))) {
        console.log('   2. 检查设备类型，确保是 SERVER、STORAGE 或 OTHER');
        console.log('      当前不支持的类型: ' + devicesWithCoreTag.filter(d => !['SERVER', 'STORAGE', 'OTHER'].includes(d.type)).map(d => d.type).join(', '));
      }
    } else {
      console.log('✅ 数据库查询正常，应该可以在界面上看到设备');
      console.log('   如果界面仍然看不到，可能是：');
      console.log('   1. 前端缓存问题（刷新页面）');
      console.log('   2. API 响应问题（检查浏览器 Network 面板）');
    }

  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
