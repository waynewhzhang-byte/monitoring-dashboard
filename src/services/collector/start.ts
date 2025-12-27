import cron from 'node-cron';
import { deviceCollector } from './device';
import { metricCollector } from './metric';
import { alarmCollector } from './alarm';

async function startScheduler() {
    console.log('🚀 Starting Data Collector Scheduler...');

    // Initial Sync
    await deviceCollector.syncDevices();
    await metricCollector.collectMetrics();
    await alarmCollector.syncAlarms();

    // Schedule Device Sync (Every 10 minutes)
    cron.schedule('*/10 * * * *', () => {
        deviceCollector.syncDevices();
    });

    // Schedule Metrics Collection (Every 60 seconds)
    cron.schedule('*/1 * * * *', () => {
        metricCollector.collectMetrics();
    });

    // Schedule Alarm Sync (Every 30 seconds)
    cron.schedule('*/30 * * * * *', () => {
        alarmCollector.syncAlarms();
    });

    console.log('🕒 Scheduler running.');
}

// Handle shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Stopping scheduler...');
    process.exit(0);
});

startScheduler().catch(console.error);
