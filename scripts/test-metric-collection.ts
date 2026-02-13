process.env.OPMANAGER_BASE_URL = "http://124.71.204.145:8060";
process.env.OPMANAGER_API_KEY = "d1fb36f09d460e2319bb953b543e317a";

import { metricCollector } from '@/services/collector/metric';
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('Testing metric collection...\n');

    // First, show current devices
    const devices = await prisma.device.findMany({
        select: { id: true, name: true, opmanagerId: true }
    });
    console.log('Devices in database:', JSON.stringify(devices, null, 2));
    console.log('\n');

    // Run metric collection
    await metricCollector.collectMetrics();

    // Check collected metrics
    const metrics = await prisma.deviceMetric.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { device: { select: { name: true } } }
    });

    console.log('\nLatest metrics:');
    console.log(JSON.stringify(metrics, null, 2));

    await prisma.$disconnect();
}

main();
