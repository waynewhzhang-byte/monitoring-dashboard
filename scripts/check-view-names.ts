import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const views = await prisma.businessViewConfig.findMany();

  console.log('📋 业务视图列表:\n');
  views.forEach(v => {
    console.log(`名称: ${v.name}`);
    console.log(`显示名: ${v.displayName}`);
    console.log('---');
  });

  // 检查每个视图的节点数
  for (const view of views) {
    const nodeCount = await prisma.topologyNode.count({
      where: { viewName: view.name }
    });
    console.log(`\n${view.displayName} (${view.name}): ${nodeCount} 个节点`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
