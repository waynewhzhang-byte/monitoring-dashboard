// Script to check monitored status of interfaces with "上联" tag
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInterfaceMonitoredStatus() {
  try {
    // Find all interfaces with "上联" tag
    const interfacesWithTag = await prisma.interface.findMany({
      where: {
        tags: {
          has: '上联'
        }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        opmanagerId: true,
        tags: true,
        isMonitored: true,
        status: true,
        device: {
          select: {
            name: true,
            displayName: true,
            ipAddress: true
          }
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    console.log(`\n📊 检查结果：找到 ${interfacesWithTag.length} 个带有"上联"标签的接口\n`);
    console.log('='.repeat(100));
    
    const monitored = interfacesWithTag.filter(i => i.isMonitored);
    const unmonitored = interfacesWithTag.filter(i => !i.isMonitored);
    
    console.log(`\n✅ 已启用监控: ${monitored.length} 个`);
    console.log(`❌ 未启用监控: ${unmonitored.length} 个\n`);
    console.log('='.repeat(100));
    
    if (unmonitored.length > 0) {
      console.log(`\n❌ 未启用监控的接口（这些接口不会在"关键接口流量监控"中显示）：\n`);
      unmonitored.forEach((iface, index) => {
        console.log(`${index + 1}. ${iface.displayName || iface.name}`);
        console.log(`   设备: ${iface.device.displayName || iface.device.name} (${iface.device.ipAddress})`);
        console.log(`   opmanagerId: ${iface.opmanagerId}`);
        console.log(`   状态: ${iface.status}`);
        console.log(`   标签: ${JSON.stringify(iface.tags)}`);
        console.log(`   isMonitored: ${iface.isMonitored}`);
        console.log('');
      });
    }
    
    if (monitored.length > 0) {
      console.log(`\n✅ 已启用监控的接口（这些接口会在"关键接口流量监控"中显示）：\n`);
      monitored.forEach((iface, index) => {
        console.log(`${index + 1}. ${iface.displayName || iface.name}`);
        console.log(`   设备: ${iface.device.displayName || iface.device.name} (${iface.device.ipAddress})`);
        console.log(`   opmanagerId: ${iface.opmanagerId}`);
        console.log(`   状态: ${iface.status}`);
        console.log(`   标签: ${JSON.stringify(iface.tags)}`);
        console.log(`   isMonitored: ${iface.isMonitored}`);
        console.log('');
      });
    }
    
    // Also check the specific interface mentioned by user
    console.log('\n' + '='.repeat(100));
    console.log('\n🔍 检查用户提到的特定接口：\n');
    const specificInterface = await prisma.interface.findFirst({
      where: {
        opmanagerId: {
          contains: '10000000009-10000000047'
        }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        opmanagerId: true,
        tags: true,
        isMonitored: true,
        status: true,
        device: {
          select: {
            name: true,
            displayName: true,
            ipAddress: true
          }
        }
      }
    });
    
    if (specificInterface) {
      console.log(`接口: ${specificInterface.displayName || specificInterface.name}`);
      console.log(`设备: ${specificInterface.device.displayName || specificInterface.device.name} (${specificInterface.device.ipAddress})`);
      console.log(`opmanagerId: ${specificInterface.opmanagerId}`);
      console.log(`标签: ${JSON.stringify(specificInterface.tags)}`);
      console.log(`isMonitored: ${specificInterface.isMonitored ? '✅ 已启用' : '❌ 未启用'}`);
      console.log(`状态: ${specificInterface.status}`);
      if (!specificInterface.isMonitored) {
        console.log(`\n⚠️  此接口未启用监控，因此不会在"关键接口流量监控"中显示！`);
        console.log(`   请在接口管理页面启用此接口的监控功能。`);
      }
    } else {
      console.log('未找到 opmanagerId 包含 "10000000009-10000000047" 的接口');
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('\n📝 总结：');
    console.log(`   - 总共有 ${interfacesWithTag.length} 个接口带有"上联"标签`);
    console.log(`   - 其中 ${monitored.length} 个已启用监控（会在UI中显示）`);
    console.log(`   - 其中 ${unmonitored.length} 个未启用监控（不会在UI中显示）`);
    if (unmonitored.length > 0) {
      console.log(`\n💡 建议：在接口管理页面 (/admin/interfaces) 启用这些接口的监控功能，`);
      console.log(`   这样它们就会在"关键接口流量监控"组件中显示。`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInterfaceMonitoredStatus();
