
import { prisma } from '../src/lib/prisma';

async function main() {
    const devices = await prisma.device.findMany({
        take: 10,
        select: {
            id: true,
            name: true,
            opmanagerId: true,
            type: true,
            ipAddress: true,
            tags: true,
            category: true
        }
    });
    console.log('Sample devices from DB:');
    console.log(JSON.stringify(devices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
