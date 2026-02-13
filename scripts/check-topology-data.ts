import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 检查所有业务视图的拓扑数据
  const views = await prisma.businessViewConfig.findMany();

  console.log('🔍 业务视图拓扑数据统计:\n');

  for (const view of views) {
    const nodes = await prisma.topologyNode.count({ where: { viewName: view.name } });
    const edges = await prisma.topologyEdge.count({ where: { viewName: view.name } });

    console.log(`📋 ${view.displayName || view.name} (${view.name}):`);
    console.log(`   节点: ${nodes} 个`);
    console.log(`   连线: ${edges} 个`);
    console.log('');
  }

  // 检查全局拓扑数据（没有业务视图）
  const globalNodes = await prisma.topologyNode.count({ where: { viewName: '' } });
  const globalEdges = await prisma.topologyEdge.count({ where: { viewName: '' } });

  console.log(`📋 全局视图 (无业务视图):`);
  console.log(`   节点: ${globalNodes} 个`);
  console.log(`   连线: ${globalEdges} 个`);
  console.log('');

  // 总计
  const totalNodes = await prisma.topologyNode.count();
  const totalEdges = await prisma.topologyEdge.count();

  console.log(`📊 数据库总计:`);
  console.log(`   所有节点: ${totalNodes} 个`);
  console.log(`   所有连线: ${totalEdges} 个`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
