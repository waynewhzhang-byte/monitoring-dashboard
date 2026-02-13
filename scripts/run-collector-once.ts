import { deviceCollector } from '@/services/collector/device';
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('🔄 Manual Device Sync Start');
    try {
        await deviceCollector.syncDevices('MANUAL');
        const count = await prisma.device.count();
        console.log(`✅ Manual Sync Complete. Device Count: ${count}`);
    } catch (error) {
        console.error('❌ Manual Sync Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
