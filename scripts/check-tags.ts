import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Device Tags Check ---');
    const taggedDevices = await prisma.device.findMany({
        where: {
            tags: {
                has: '重要设备'
            }
        },
        select: {
            name: true,
            displayName: true,
            tags: true
        }
    });

    console.log(`Found ${taggedDevices.length} devices with tag '重要设备':`);
    taggedDevices.forEach(d => {
        console.log(`- ${d.displayName} (${d.name}): [${d.tags.join(', ')}]`);
    });

    const allDevicesCount = await prisma.device.count();
    console.log(`Total devices in DB: ${allDevicesCount}`);
    
    await prisma.$disconnect();
}

main().catch(console.error);
