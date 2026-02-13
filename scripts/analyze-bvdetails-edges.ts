/**
 * 分析 getBVDetails 返回的边数据
 * 对比 linkProperties.objName 与 Interface 表的 opmanagerId
 */

// 加载环境变量
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { OpManagerClient } from '../src/services/opmanager/client';
import { PrismaClient } from '@prisma/client';

const opClient = new OpManagerClient();
const prisma = new PrismaClient();

async function analyzeBVDetailsEdges(bvName: string = 'TEST2') {
  console.log('='.repeat(80));
  console.log(`🔍 分析 ${bvName} getBVDetails 返回的边数据`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. 获取 OpManager getBVDetails 原始数据
    console.log('1️⃣  从 OpManager 获取 getBVDetails 数据...');
    const bvData = await opClient.getBVDetails(bvName);

    if (!bvData || !bvData.linkProperties) {
      console.log('❌ 无法获取 getBVDetails 数据或没有 linkProperties');
      return;
    }

    const { deviceProperties, linkProperties } = bvData;
    console.log(`   设备数: ${deviceProperties?.length || 0}`);
    console.log(`   边数: ${linkProperties?.length || 0}`);
    console.log('');

    // 2. 获取数据库中的所有接口
    console.log('2️⃣  查询数据库中的接口...');
    const interfaces = await prisma.interface.findMany({
      select: {
        id: true,
        opmanagerId: true,
        name: true,
        deviceId: true,
        device: {
          select: {
            name: true,
            opmanagerId: true
          }
        }
      }
    });
    console.log(`   数据库中有 ${interfaces.length} 个接口`);
    console.log('');

    // 3. 分析每条边
    console.log('3️⃣  详细分析每条边:');
    console.log('='.repeat(80));

    if (!linkProperties || linkProperties.length === 0) {
      console.log('⚠️  没有边数据');
      return;
    }

    linkProperties.forEach((link: any, index: number) => {
      console.log(`\n边 ${index + 1}:`);
      console.log('─'.repeat(80));

      // 显示边的原始数据
      console.log('📋 OpManager 返回的边数据:');
      console.log(`   source: ${link.source}`);
      console.log(`   dest: ${link.dest}`);
      console.log(`   objName: ${link.objName}`);
      console.log(`   name: ${link.name}`);
      console.log(`   ifName: ${link.ifName || 'N/A'}`);
      console.log(`   intfDisplayName: ${link.intfDisplayName || 'N/A'}`);
      console.log(`   status: ${link.status}`);
      console.log(`   InTraffic: ${link.InTraffic || 'N/A'}`);
      console.log(`   OutTraffic: ${link.OutTraffic || 'N/A'}`);

      // 尝试在接口表中查找匹配
      console.log('');
      console.log('🔍 在数据库中查找匹配的接口:');

      // 尝试多种匹配方式
      const matchByObjName = interfaces.find((i: any) => i.opmanagerId === link.objName);
      const matchByIfName = interfaces.find((i: any) => i.name === link.ifName);
      const matchByIntfDisplayName = interfaces.find((i: any) => i.name === link.intfDisplayName);

      if (matchByObjName) {
        console.log(`   ✅ 通过 objName 匹配到接口:`);
        console.log(`      - 接口 ID: ${matchByObjName.id}`);
        console.log(`      - 接口名称: ${matchByObjName.name}`);
        console.log(`      - 设备: ${matchByObjName.device?.name || 'N/A'}`);
      } else {
        console.log(`   ❌ 通过 objName (${link.objName}) 无法匹配`);
      }

      if (matchByIfName) {
        console.log(`   💡 通过 ifName 可以匹配到接口:`);
        console.log(`      - 接口 ID: ${matchByIfName.id}`);
        console.log(`      - OpManager ID: ${matchByIfName.opmanagerId}`);
        console.log(`      - 设备: ${matchByIfName.device?.name || 'N/A'}`);
      }

      if (matchByIntfDisplayName) {
        console.log(`   💡 通过 intfDisplayName 可以匹配到接口:`);
        console.log(`      - 接口 ID: ${matchByIntfDisplayName.id}`);
        console.log(`      - OpManager ID: ${matchByIntfDisplayName.opmanagerId}`);
        console.log(`      - 设备: ${matchByIntfDisplayName.device?.name || 'N/A'}`);
      }

      if (!matchByObjName && !matchByIfName && !matchByIntfDisplayName) {
        console.log('   ⚠️  无法通过任何方式匹配到接口');
        console.log('');
        console.log('   可能原因:');
        console.log('   1. 这个接口在 OpManager 中不存在');
        console.log('   2. 接口的 OpManager ID 格式不同');
        console.log('   3. 这是一个虚拟链接，不对应真实接口');
      }

      // 显示 JSON 格式（便于调试）
      console.log('');
      console.log('📄 完整 JSON 数据:');
      console.log(JSON.stringify(link, null, 2));
    });

    // 4. 统计和建议
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 统计摘要:');
    console.log('─'.repeat(80));

    const matchCounts = {
      byObjName: 0,
      byIfName: 0,
      byIntfDisplayName: 0,
      noMatch: 0
    };

    linkProperties.forEach((link: any) => {
      const matchByObjName = interfaces.find(i => i.opmanagerId === link.objName);
      const matchByIfName = interfaces.find(i => i.name === link.ifName);
      const matchByIntfDisplayName = interfaces.find(i => i.name === link.intfDisplayName);

      if (matchByObjName) matchCounts.byObjName++;
      else if (matchByIfName) matchCounts.byIfName++;
      else if (matchByIntfDisplayName) matchCounts.byIntfDisplayName++;
      else matchCounts.noMatch++;
    });

    console.log(`   总边数: ${linkProperties.length}`);
    console.log(`   可通过 objName 匹配: ${matchCounts.byObjName}`);
    console.log(`   可通过 ifName 匹配: ${matchCounts.byIfName}`);
    console.log(`   可通过 intfDisplayName 匹配: ${matchCounts.byIntfDisplayName}`);
    console.log(`   无法匹配: ${matchCounts.noMatch}`);
    console.log('');

    // 5. 解决方案建议
    console.log('💡 解决方案建议:');
    console.log('─'.repeat(80));

    if (matchCounts.byObjName === linkProperties.length) {
      console.log('   ✅ 所有边都可以通过 objName 匹配');
      console.log('   当前的关联逻辑应该可以工作');
      console.log('   问题可能在拓扑同步时接口查找的代码');
    } else if (matchCounts.byIfName > 0 || matchCounts.byIntfDisplayName > 0) {
      console.log('   ⚠️  部分边需要通过 ifName 或 intfDisplayName 匹配');
      console.log('');
      console.log('   需要修改拓扑采集器的接口查找逻辑:');
      console.log('   src/services/collector/topology.ts');
      console.log('');
      console.log('   当前逻辑:');
      console.log('   const intf = await prisma.interface.findUnique({');
      console.log('     where: { opmanagerId: link.objName }');
      console.log('   });');
      console.log('');
      console.log('   改进逻辑（多重匹配）:');
      console.log('   let intf = await prisma.interface.findFirst({');
      console.log('     where: {');
      console.log('       OR: [');
      console.log('         { opmanagerId: link.objName },');
      console.log('         { name: link.ifName },');
      console.log('         { name: link.intfDisplayName }');
      console.log('       ]');
      console.log('     }');
      console.log('   });');
    }

    if (matchCounts.noMatch > 0) {
      console.log('');
      console.log(`   ⚠️  有 ${matchCounts.noMatch} 条边无法匹配到接口`);
      console.log('   这些可能是虚拟链接或 OpManager 中不存在的接口');
      console.log('   可以考虑在拓扑中显示这些边，但不关联流量数据');
    }

    console.log('');

  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取业务视图名称
const bvName = process.argv[2] || 'TEST2';
analyzeBVDetailsEdges(bvName).catch(console.error);
