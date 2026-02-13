import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function run() {
  const byStatus = await prisma.device.groupBy({ by: ['status'], _count: true });
  console.log('\nDevice status distribution (after UNMANAGED fix):');
  byStatus.forEach((s) => console.log('  ', s.status, ':', s._count));
  const unmanaged = await prisma.device.findMany({
    where: { status: 'UNMANAGED' },
    select: { name: true, ipAddress: true, isMonitored: true },
  });
  console.log('\nUNMANAGED devices (OpManager 未管理, 本系统不再做其他处理):', unmanaged.length);
  unmanaged.forEach((d) => console.log('   ', d.name, d.ipAddress, 'isMonitored:', d.isMonitored));
  const offline = await prisma.device.findMany({
    where: { status: 'OFFLINE' },
    select: { name: true, ipAddress: true, isMonitored: true },
  });
  console.log('\nOFFLINE devices (仅 OpManager Down，真正离线):', offline.length);
  offline.forEach((d) => console.log('   ', d.name, d.ipAddress));
  await prisma.$disconnect();
}

run().catch(console.error);
