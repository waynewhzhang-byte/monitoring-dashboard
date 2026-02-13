import { PrismaClient } from '@prisma/client';
import { topologyCollector } from '../src/services/collector/topology';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 清理并重建拓扑数据\n');

  // 1. 获取所有业务视图
  const views = await prisma.businessViewConfig.findMany();
  console.log(`找到 ${views.length} 个业务视图\n`);

  for (const view of views) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 处理业务视图: ${view.displayName || view.name}`);
    console.log(`${'='.repeat(60)}\n`);

    // 2. 删除该视图的所有旧数据（包括污染的 metadata）
    console.log(`🗑️  删除旧数据...`);
    const deletedEdges = await prisma.topologyEdge.deleteMany({
      where: { viewName: view.name }
    });
    const deletedNodes = await prisma.topologyNode.deleteMany({
      where: { viewName: view.name }
    });
    console.log(`   删除了 ${deletedNodes.count} 个节点, ${deletedEdges.count} 条边\n`);

    // 3. 从 OpManager 重新同步（使用修复后的代码）
    console.log(`🔄 从 OpManager 重新同步...`);
    try {
      const result = await topologyCollector.syncBusinessView(view.name);
      console.log(`✅ 同步完成: ${result.nodes} 个节点, ${result.edges} 条边\n`);
    } catch (error) {
      console.error(`❌ 同步失败:`, error);
      continue;
    }

    // 4. 验证新数据（检查是否还有 metadata 嵌套）
    console.log(`🔍 验证数据质量...`);
    const newNodes = await prisma.topologyNode.findMany({
      where: { viewName: view.name },
      include: { device: true }
    });

    let hasNesting = false;
    let linkedCount = 0;
    let unlinkedCount = 0;

    for (const node of newNodes) {
      const metadata = node.metadata as any;

      // 检查是否有嵌套的 metadata
      if (metadata?.metadata) {
        hasNesting = true;
        console.log(`   ⚠️  节点 ${node.label} 仍有嵌套 metadata！`);
      }

      // 检查设备关联
      if (node.deviceId) {
        linkedCount++;
      } else {
        unlinkedCount++;
        console.log(`   ⚠️  节点 ${node.label} 未关联设备`);
      }
    }

    if (!hasNesting) {
      console.log(`   ✅ 无 metadata 嵌套问题`);
    }

    console.log(`   ✅ 已关联设备: ${linkedCount} / ${newNodes.length}`);
    if (unlinkedCount > 0) {
      console.log(`   ⚠️  未关联设备: ${unlinkedCount} / ${newNodes.length}`);
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✅ 清理和重建完成！`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📌 下一步:`);
  console.log(`   1. 刷新浏览器访问 http://localhost:3001/dashboard`);
  console.log(`   2. 验证设备状态颜色是否正确显示`);
  console.log(`   3. 如果有未关联设备，运行: npx tsx scripts/fix-topology-device-link.ts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
