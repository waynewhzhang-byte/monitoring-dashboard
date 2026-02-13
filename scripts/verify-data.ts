
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '@/lib/redis';

const prisma = new PrismaClient();
const redis = getRedisClient();

async function verify() {
    console.log('🔍 Verifying Data Persistence...');

    // 1. Check Devices
    const deviceCount = await prisma.device.count();
    console.log(`📱 Devices in DB: ${deviceCount}`);

    if (deviceCount > 0) {
        const device = await prisma.device.findFirst({ include: { metrics: true } });
        console.log(`   Sample Device: ${device?.name} (${device?.ipAddress})`);
        console.log(`   Metrics Count for Sample: ${device?.metrics.length}`);
    }

    // 2. Check Alarms
    const alarmCount = await prisma.alarm.count();
    console.log(`🚨 Alarms in DB: ${alarmCount}`);

    // 3. Check Redis
    console.log('Testing Redis connection...');
    try {
        await redis.set('test-key', 'connected');
        const val = await redis.get('test-key');
        console.log(`✅ Redis Connected. Test Value: ${val}`);
    } catch (e) {
        console.error('❌ Redis Connection Failed:', e);
    }

    // 4. Check Metrics History
    const metricCount = await prisma.deviceMetric.count();
    console.log(`📈 Total Metrics Records: ${metricCount}`);

    await prisma.$disconnect();
    process.exit(0);
}

verify().catch(console.error);
