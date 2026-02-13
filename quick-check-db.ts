
import { prisma } from './src/lib/prisma';

async function check() {
    const deviceCount = await prisma.device.count();
    const monitoredCount = await prisma.device.count({ where: { isMonitored: true } });
    const metricsCount = await prisma.deviceMetric.count();
    const trafficCount = await prisma.trafficMetric.count();
    const alarmCount = await prisma.alarm.count();

    console.log(`Devices: ${deviceCount}`);
    console.log(`Monitored: ${monitoredCount}`);
    console.log(`DeviceMetrics: ${metricsCount}`);
    console.log(`TrafficMetrics: ${trafficCount}`);
    console.log(`Alarms: ${alarmCount}`);

    if (deviceCount > 0) {
        const devices = await prisma.device.findMany({ take: 5 });
        console.log('Sample devices:', JSON.stringify(devices, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));
    }

    if (metricsCount > 0) {
        const latestMetric = await prisma.deviceMetric.findFirst({ orderBy: { timestamp: 'desc' } });
        console.log('Latest DeviceMetric:', latestMetric);
    }

    await prisma.$disconnect();
}

check();
