import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const node = await prisma.topologyNode.findFirst({
    where: { label: 'RankingSW02' },
  });

  console.log('节点:', node?.label);
  console.log('deviceId:', node?.deviceId);
  console.log('\nmetadata:');
  console.log(JSON.stringify(node?.metadata, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
