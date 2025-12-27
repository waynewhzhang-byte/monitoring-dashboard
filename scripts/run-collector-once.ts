import { deviceCollector } from '../src/services/collector/device';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('🔄 Manual Device Sync Start');
    try {
        await deviceCollector.syncDevices();
        const count = await prisma.device.count();
        console.log(`✅ Manual Sync Complete. Device Count: ${count}`);
    } catch (error) {
        console.error('❌ Manual Sync Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
