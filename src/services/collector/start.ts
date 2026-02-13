import { metricCollector } from './metric';
import { alarmCollector } from './alarm';
import { topologyCollector } from './topology';
import { interfaceTrafficCollector } from './interface-traffic';
import { env } from '@/lib/env';

async function startScheduler() {
    console.log('🚀 Starting Data Collector Scheduler...');

    // Helper function to sync all active business views
    const syncAllActiveViews = async () => {
        const { prisma } = await import('@/lib/prisma');
        const activeViews = await prisma.businessViewConfig.findMany({
            where: { isActive: true },
            select: { name: true },
        });

        for (const view of activeViews) {
            await topologyCollector.syncBusinessView(view.name);
        }
    };

    // Initial Sync
    // Note: Device and interface syncs are manual-only via admin panel buttons
    await syncAllActiveViews(); // Sync all active business views (topology structure)
    await metricCollector.collectMetrics(); // Collect device metrics & status
    await alarmCollector.syncAlarms(); // Sync alarms
    await interfaceTrafficCollector.collectTraffic(); // Collect traffic for tagged interfaces

    // Device and interface syncs removed - use manual sync buttons in admin panels
    // Manual sync endpoints: /api/devices/sync and /api/interfaces/sync

    const topologyIntervalSeconds = env.SYNC_TOPOLOGY_INTERVAL;
    const metricsIntervalSeconds = env.COLLECT_METRICS_INTERVAL;
    const alarmsIntervalSeconds = env.COLLECT_ALARMS_INTERVAL;
    const trafficIntervalSeconds = env.COLLECT_METRICS_INTERVAL; // 与 metrics 相同频率（60秒）

    console.log('🕒 Scheduler intervals (seconds):', {
        topology: topologyIntervalSeconds,
        metrics: metricsIntervalSeconds,
        alarms: alarmsIntervalSeconds,
        traffic: trafficIntervalSeconds,
    });

    // Avoid overlapping runs if a job takes longer than its interval
    let topologyRunning = false;
    let metricsRunning = false;
    let alarmsRunning = false;
    let trafficRunning = false;

    const topologyTimer = setInterval(async () => {
        if (topologyRunning) return;
        topologyRunning = true;
        try {
            await syncAllActiveViews();
        } catch (error) {
            console.error('❌ Topology sync failed:', error);
        } finally {
            topologyRunning = false;
        }
    }, Math.max(5, topologyIntervalSeconds) * 1000);

    const metricsTimer = setInterval(async () => {
        if (metricsRunning) return;
        metricsRunning = true;
        try {
            await metricCollector.collectMetrics();
        } catch (error) {
            console.error('❌ Metrics collection failed:', error);
        } finally {
            metricsRunning = false;
        }
    }, Math.max(5, metricsIntervalSeconds) * 1000);

    const alarmsTimer = setInterval(async () => {
        if (alarmsRunning) return;
        alarmsRunning = true;
        try {
            await alarmCollector.syncAlarms();
        } catch (error) {
            console.error('❌ Alarm sync failed:', error);
        } finally {
            alarmsRunning = false;
        }
    }, Math.max(5, alarmsIntervalSeconds) * 1000);

    const trafficTimer = setInterval(async () => {
        if (trafficRunning) return;
        trafficRunning = true;
        try {
            await interfaceTrafficCollector.collectTraffic();
        } catch (error) {
            console.error('❌ Interface traffic collection failed:', error);
        } finally {
            trafficRunning = false;
        }
    }, Math.max(5, trafficIntervalSeconds) * 1000);

    console.log('🕒 Scheduler running.');

    // Handle shutdown
    const shutdown = () => {
        console.log('🛑 Stopping scheduler...');
        clearInterval(topologyTimer);
        clearInterval(metricsTimer);
        clearInterval(alarmsTimer);
        clearInterval(trafficTimer);
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

startScheduler().catch(console.error);
