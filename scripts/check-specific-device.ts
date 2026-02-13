/**
 * 检查特定设备的详细信息
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDevice(ipAddress: string) {
  console.log(`\n=== 检查设备 ${ipAddress} 的详细信息 ===\n`);

  try {
    // 查询该IP的设备
    const device = await prisma.device.findFirst({
      where: {
        ipAddress: ipAddress
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        ipAddress: true,
        opmanagerId: true,
        type: true,
        status: true,
        tags: true,
        isMonitored: true,
        businessViews: true,
        createdAt: true,
        updatedAt: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!device) {
      console.log(`❌ 数据库中没有找到 IP 为 ${ipAddress} 的设备\n`);

      // 查询所有设备看看有哪些
      const allDevices = await prisma.device.findMany({
        select: {
          id: true,
          name: true,
          displayName: true,
          ipAddress: true,
          type: true,
          tags: true,
          isMonitored: true
        },
        take: 10
      });

      console.log(`数据库中前10台设备：\n`);
      allDevices.forEach((d, i) => {
        console.log(`[${i + 1}] ${d.displayName || d.name}`);
        console.log(`    IP: ${d.ipAddress}`);
        console.log(`    类型: ${d.type}`);
        console.log(`    标签: ${d.tags.join(', ') || '无'}`);
        console.log(`    监控: ${d.isMonitored ? '✅' : '❌'}`);
        console.log('');
      });

      return;
    }

    console.log('✅ 找到设备:\n');
    console.log(`名称: ${device.name}`);
    console.log(`显示名称: ${device.displayName || '(无)'}`);
    console.log(`IP 地址: ${device.ipAddress}`);
    console.log(`OpManager ID: ${device.opmanagerId || '(无)'}`);
    console.log(`类型: ${device.type}`);
    console.log(`状态: ${device.status}`);
    console.log(`标签: ${device.tags.length > 0 ? device.tags.join(', ') : '(无标签)'}`);
    console.log(`是否监控: ${device.isMonitored ? '✅ 是' : '❌ 否'}`);
    console.log(`所属业务视图: ${device.businessViews.length > 0 ? device.businessViews.join(', ') : '(无)'}`);
    console.log(`创建时间: ${device.createdAt}`);
    console.log(`更新时间: ${device.updatedAt}`);

    if (device.metrics && device.metrics.length > 0) {
      const metric = device.metrics[0];
      console.log(`\n最近指标 (${metric.timestamp}):`);
      console.log(`  CPU: ${metric.cpuUsage}%`);
      console.log(`  内存: ${metric.memoryUsage}%`);
    }

    console.log('\n=== 为什么在"硬件服务器"页签看不到？===\n');

    // 检查是否符合条件
    const issues: string[] = [];

    // 检查1: 是否有"核心"标签
    if (!device.tags.includes('核心')) {
      issues.push('❌ 没有"核心"标签');
      console.log(`当前标签: [${device.tags.join(', ')}]`);
      console.log('需要添加"核心"标签（注意：必须是"核心"两个字，大小写要匹配）\n');
    } else {
      console.log('✅ 有"核心"标签\n');
    }

    // 检查2: 类型是否符合
    const serverTypes = ['SERVER', 'STORAGE', 'OTHER'];
    if (!serverTypes.includes(device.type)) {
      issues.push(`❌ 设备类型不符合 (当前: ${device.type}，需要: ${serverTypes.join(', ')})`);
      console.log(`设备类型: ${device.type}`);
      console.log(`硬件服务器页签只显示类型为: ${serverTypes.join(', ')} 的设备`);
      console.log(`当前设备类型 ${device.type} 不符合条件\n`);
    } else {
      console.log(`✅ 设备类型符合 (${device.type})\n`);
    }

    // 检查3: 是否启用监控
    if (!device.isMonitored) {
      issues.push('❌ 设备未启用监控 (isMonitored=false)');
      console.log('设备的 isMonitored 字段为 false');
      console.log('需要在 /admin/devices 中启用该设备的监控\n');
    } else {
      console.log('✅ 设备已启用监控\n');
    }

    // 总结
    console.log('=== 诊断总结 ===\n');
    if (issues.length === 0) {
      console.log('✅ 所有条件都满足，设备应该可以在"硬件服务器"页签显示');
      console.log('   如果仍然看不到，请：');
      console.log('   1. 刷新浏览器页面（Ctrl+F5 强制刷新）');
      console.log('   2. 检查浏览器 Network 面板，查看 API 响应');
      console.log('   3. 检查是否选择了其他类型过滤器（SERVER/STORAGE）\n');
    } else {
      console.log('❌ 发现以下问题：\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n🔧 修复建议：\n');

      if (!device.tags.includes('核心')) {
        console.log('   1. 去 /admin/devices 找到该设备');
        console.log('   2. 添加"核心"标签\n');
      }

      if (!serverTypes.includes(device.type)) {
        console.log('   2. 设备类型不符合要求');
        console.log(`      当前类型: ${device.type}`);
        console.log(`      该设备属于网络设备，应该在"网络设备"页签显示\n`);
      }

      if (!device.isMonitored) {
        console.log('   3. 启用设备监控：');
        console.log('      方法1: 在 /admin/devices 中点击启用监控');
        console.log('      方法2: 在 OpManager 中设置为 Managed 状态，然后同步\n');
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取IP，或使用默认值
const targetIP = process.argv[2] || '192.168.255.27';
checkDevice(targetIP);
