/**
 * 诊断 TEST2 业务视图的拓扑对象数量差异
 * 对比 OpManager API 实际返回 vs 数据库存储
 */

// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { OpManagerClient } from '../src/services/opmanager/client';
import { PrismaClient } from '@prisma/client';

const opClient = new OpManagerClient();
const prisma = new PrismaClient();

async function diagnoseBVTest2() {
  console.log('='.repeat(80));
  console.log('📊 TEST2 业务视图拓扑对象数量诊断');
  console.log('='.repeat(80));
  console.log('');

  const bvName = 'TEST2';

  try {
    // 1. 从 OpManager 获取实际数据
    console.log('1️⃣  从 OpManager getBVDetails API 获取 TEST2 数据...');
    const topologyData = await opClient.getBVDetails(bvName);

    if (!topologyData) {
      console.error('❌ 无法从 OpManager 获取 TEST2 数据');
      return;
    }

    const { deviceProperties, linkProperties } = topologyData;

    console.log('');
    console.log('📦 OpManager API 返回数据统计:');
    console.log('─'.repeat(80));
    console.log(`   设备对象 (deviceProperties): ${deviceProperties?.length || 0} 个`);
    console.log(`   链接对象 (linkProperties):   ${linkProperties?.length || 0} 个`);
    console.log('');

    // 详细列出所有设备对象
    if (deviceProperties && deviceProperties.length > 0) {
      console.log('📋 OpManager 返回的设备对象详细列表:');
      console.log('─'.repeat(80));
      deviceProperties.forEach((dev: any, index: number) => {
        console.log(`   ${index + 1}. ${dev.displayName || dev.label || dev.objName || dev.name}`);
        console.log(`      - objName: ${dev.objName || 'N/A'}`);
        console.log(`      - type: ${dev.type || 'N/A'}`);
        console.log(`      - 位置: (${dev.x || 0}, ${dev.y || 0})`);
      });
      console.log('');
    }

    // 2. 从数据库获取存储的数据
    console.log('2️⃣  从数据库查询 TEST2 拓扑数据...');
    const dbNodes = await prisma.topologyNode.findMany({
      where: { viewName: bvName },
      orderBy: { label: 'asc' }
    });

    const dbEdges = await prisma.topologyEdge.findMany({
      where: { viewName: bvName }
    });

    console.log('');
    console.log('💾 数据库存储数据统计:');
    console.log('─'.repeat(80));
    console.log(`   节点 (topologyNode): ${dbNodes.length} 个`);
    console.log(`   边 (topologyEdge):   ${dbEdges.length} 个`);
    console.log('');

    // 详细列出所有数据库节点
    if (dbNodes.length > 0) {
      console.log('📋 数据库中的节点详细列表:');
      console.log('─'.repeat(80));
      dbNodes.forEach((node: any, index: number) => {
        const metadata = node.metadata as any;
        console.log(`   ${index + 1}. ${node.label}`);
        console.log(`      - ID: ${node.id}`);
        console.log(`      - Type: ${node.type || 'N/A'}`);
        console.log(`      - OpManager objName: ${metadata?.objName || 'N/A'}`);
        console.log(`      - 位置: (${node.positionX}, ${node.positionY})`);
      });
      console.log('');
    }

    // 3. 对比分析
    console.log('🔍 对比分析:');
    console.log('─'.repeat(80));
    const opCount = deviceProperties?.length || 0;
    const dbCount = dbNodes.length;

    if (opCount === dbCount) {
      console.log(`✅ 数量一致: OpManager 和数据库都有 ${opCount} 个对象`);
    } else {
      console.log(`⚠️  数量不一致:`);
      console.log(`   - OpManager API 返回: ${opCount} 个设备对象`);
      console.log(`   - 数据库存储: ${dbCount} 个节点`);
      console.log(`   - 差异: ${Math.abs(opCount - dbCount)} 个对象`);

      if (dbCount > opCount) {
        console.log('');
        console.log('💡 可能原因:');
        console.log('   1. 数据库中有旧的数据未清理（理论上不应该，因为同步时会先删除）');
        console.log('   2. 手动添加了额外的节点');
        console.log('');
        console.log('🔧 建议操作:');
        console.log('   - 运行同步命令重新同步 TEST2:');
        console.log('     curl -X POST http://localhost:3000/api/topology/sync?bvName=TEST2');
      } else {
        console.log('');
        console.log('💡 这种情况不应该发生（数据库比 API 少）');
        console.log('🔧 建议操作:');
        console.log('   - 运行同步命令同步 TEST2:');
        console.log('     curl -X POST http://localhost:3000/api/topology/sync?bvName=TEST2');
      }
    }

    console.log('');

    // 4. OpManager 业务视图配置检查
    console.log('4️⃣  OpManager 业务视图配置建议:');
    console.log('─'.repeat(80));
    console.log('   请在 OpManager 中检查 TEST2 业务视图的配置:');
    console.log('   1. 登录 OpManager');
    console.log('   2. 导航到 "业务视图" → "TEST2"');
    console.log('   3. 检查视图中实际包含的设备数量');
    console.log('   4. 确认是否有以下情况:');
    console.log('      - 同一台设备的多个接口被单独显示');
    console.log('      - 包含了分组或虚拟节点');
    console.log('      - 有重复的设备对象');
    console.log('');

    // 5. 同步建议
    console.log('5️⃣  同步建议:');
    console.log('─'.repeat(80));
    console.log('   如果 OpManager 中确实只有 8 个设备:');
    console.log('   1. 检查 OpManager getBVDetails API 的实际响应');
    console.log('   2. 运行手动同步清理数据:');
    console.log('      npm run diagnose:bv-test2-sync');
    console.log('');

  } catch (error) {
    console.error('❌ 诊断过程出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseBVTest2().catch(console.error);
