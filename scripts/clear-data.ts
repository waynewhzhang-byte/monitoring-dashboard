import { prisma } from '@/lib/prisma';

async function main() {
    console.log('🗑️ Clearing all device data...');

    // Delete in order to respect foreign keys
    await prisma.deviceMetric.deleteMany();
    await prisma.alarm.deleteMany();
    await prisma.interface.deleteMany();
    await prisma.device.deleteMany();

    console.log('✅ All devices and related data cleared.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
