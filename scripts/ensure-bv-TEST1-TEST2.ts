/**
 * 在 DB 中 upsert 与 OpManager bvName 一致的业务视图：TEST1、TEST2。
 * 不删除其它 name；采集器会对所有 isActive 的 name 轮询同步。
 *
 * 用法: npm run bv:ensure-TEST1-TEST2
 * 或: npx tsx scripts/ensure-bv-TEST1-TEST2.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const views = [
    { name: 'TEST1', displayName: 'TEST1' },
    { name: 'TEST2', displayName: 'TEST2' },
  ] as const;

  for (const { name, displayName } of views) {
    await prisma.businessViewConfig.upsert({
      where: { name },
      create: {
        name,
        displayName,
        isActive: true,
        refreshInterval: 300,
      },
      update: {
        displayName,
        isActive: true,
      },
    });
    console.log(`✅ BusinessViewConfig upsert: name="${name}" (isActive=true)`);
  }

  const all = await prisma.businessViewConfig.findMany({
    select: { name: true, isActive: true },
    orderBy: { name: 'asc' },
  });
  console.log(
    '\n当前 BusinessViewConfig.name 列表:',
    all.map((v) => `${v.name}${v.isActive ? '' : '(inactive)'}`).join(', ')
  );
  console.log(
    '\n提示: 若仍同步到 0 节点，请看采集器日志 [TopologyCollector] OpManager getBVDetails("...")，' +
      '引号内须与 OpManager 业务视图标识完全一致（此处为 TEST1、TEST2）。'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
