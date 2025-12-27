import { prisma } from '../../lib/prisma';
import { opClient } from '../opmanager/client';
import { broadcaster, BroadcastEvent } from '../broadcast';

export class MetricCollector {
    async collectMetrics() {
        console.log('📊 Starting Metric Collection...');
        try {
            // Get all devices from database
            const devices = await prisma.device.findMany({
                select: { id: true, opmanagerId: true, name: true }
            });
            const timestamp = new Date();

            let count = 0;
            for (const device of devices) {
                try {
                    // Fetch device summary with metrics from OpManager
                    const summary = await opClient.getDeviceSummary(device.opmanagerId);

                    if (!summary || !summary.dials) {
                        console.warn(`⚠️ No metrics available for ${device.name}`);
                        continue;
                    }

                    // Extract metrics from dials array
                    const cpuDial = summary.dials.find((d: any) => d.displayName === 'CPU Utilization');
                    const memDial = summary.dials.find((d: any) => d.displayName === 'Memory Utilization');
                    const diskDial = summary.dials.find((d: any) => d.displayName === 'Disk Utilization');

                    const metric = await prisma.deviceMetric.create({
                        data: {
                            deviceId: device.id,
                            timestamp,
                            cpuUsage: cpuDial?.value || 0,
                            memoryUsage: memDial?.value || 0,
                            diskUsage: diskDial?.value || 0,
                            responseTime: parseFloat(summary.responseTime) || 0,
                            packetLoss: parseFloat(summary.packetLoss) || 0,
                        }
                    });

                    // Broadcast update
                    await broadcaster.emit(`device:${device.id}`, BroadcastEvent.METRICS_UPDATE, {
                        deviceId: device.id,
                        metrics: metric
                    });

                    count++;
                } catch (deviceError) {
                    console.error(`❌ Failed to collect metrics for ${device.name}:`, deviceError);
                }
            }
            console.log(`✅ Collected metrics for ${count} devices.`);
        } catch (error) {
            console.error('❌ Metric Collection Failed:', error);
        }
    }
}

export const metricCollector = new MetricCollector();
