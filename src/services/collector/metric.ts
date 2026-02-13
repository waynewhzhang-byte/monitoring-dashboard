import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { broadcaster, BroadcastEvent } from '@/services/broadcast';
import { DeviceStatus } from '@prisma/client';

// Process devices in batches to control concurrency
// 减少批次大小以避免同时发送过多请求导致OpManager超时
const BATCH_SIZE = 5; // 从10减少到5，降低并发压力
const BATCH_DELAY_MS = 1000; // 批次之间延迟1秒

// Helper to chunk array without external dependency
function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export class MetricCollector {
    async collectMetrics() {
        console.log('📊 Starting Metric & Status Collection...');
        try {
            // Get monitored & reachable devices with their names
            /**
             * IMPORTANT: ONLINE 概念（避免后续逻辑混乱）
             *
             * WARNING/ERROR 不是"离线"，而是"在线但有故障/告警"——仍应继续拉取性能数据。
             * 只有：
             * - OFFLINE（OpManager Down：不可达/不可 Ping）
             * - UNMANAGED（OpManager UnManaged：未纳入监控）
             * 才应跳过进一步采集，避免无意义请求导致超时/卡住。
             */
            const devices = await prisma.device.findMany({
                where: {
                    isMonitored: true,
                    status: { notIn: [DeviceStatus.OFFLINE, DeviceStatus.UNMANAGED] },
                },
                select: {
                    id: true,
                    name: true,
                    opmanagerId: true,  // 企业版需要（可能包含后缀）
                    ipAddress: true      // 作为备选标识
                }
            });
            const timestamp = new Date();

            let successCount = 0;
            let statusUpdateCount = 0;
            const metricsToInsert: any[] = [];
            const deviceStatusUpdates: Array<{ id: string; status: DeviceStatus }> = [];
            
            // Split devices into batches
            const batches = chunkArray(devices, BATCH_SIZE);

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                
                // 批次之间添加延迟，避免连续请求导致OpManager过载
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
                }
                
                // Process batch in parallel
                await Promise.all(batch.map(async (device) => {
                    try {
                        // Fetch device summary using device NAME and IP (with fallback)
                        // 添加重试机制，最多重试2次
                        let summary = null;
                        let retries = 2;
                        while (retries >= 0 && !summary) {
                            try {
                                summary = await opClient.getDeviceSummary({
                                    deviceName: device.opmanagerId || device.name || undefined,
                                    deviceIpAddress: device.ipAddress || undefined
                                });
                                break;
                            } catch (error: any) {
                                if (retries > 0 && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
                                    console.warn(`⚠️ Timeout fetching metrics for ${device.name}, retrying... (${retries} retries left)`);
                                    retries--;
                                    await new Promise(resolve => setTimeout(resolve, 2000)); // 重试前等待2秒
                                } else {
                                    throw error; // 非超时错误直接抛出
                                }
                            }
                        }

                        if (!summary) {
                            // console.debug(`ℹ️ No summary returned for ${device.name}`); // Reduce noise
                            return;
                        }

                        // Extract device status from getDeviceSummary
                        // getDeviceSummary 返回设备的实时状态（statusStr 或 status 字段）
                        // 支持中英文状态（生产环境可能返回中文）
                        const summaryStatus = summary.statusStr || summary.status || '';
                        const statusLower = summaryStatus.toLowerCase();

                        let deviceStatus: DeviceStatus = DeviceStatus.ONLINE;
                        // 错误/严重状态（中英文）
                        if (statusLower.includes('critical') || statusLower.includes('严重') || statusLower.includes('危险')) {
                            deviceStatus = DeviceStatus.ERROR;
                        } else if (statusLower.includes('trouble') || statusLower.includes('故障')) {
                            deviceStatus = DeviceStatus.ERROR;
                        // 警告/注意状态（中英文）
                        } else if (statusLower.includes('attention') || statusLower.includes('warning') ||
                                   statusLower.includes('警告') || statusLower.includes('注意')) {
                            deviceStatus = DeviceStatus.WARNING;
                        // 离线/宕机状态（中英文）
                        } else if (statusLower.includes('down') || statusLower.includes('离线') ||
                                   statusLower.includes('宕机') || statusLower.includes('不可达')) {
                            deviceStatus = DeviceStatus.OFFLINE;
                        // 未管理状态（中英文）
                        } else if (statusLower.includes('unmanaged') || statusLower.includes('未管理') ||
                                   statusLower.includes('未监控')) {
                            deviceStatus = DeviceStatus.UNMANAGED;
                        // 正常/在线状态（中英文）
                        } else if (statusLower.includes('clear') || statusLower.includes('up') ||
                                   statusLower.includes('正常') || statusLower.includes('运行') ||
                                   statusLower.includes('在线')) {
                            deviceStatus = DeviceStatus.ONLINE;
                        }

                        // 记录状态更新
                        deviceStatusUpdates.push({ id: device.id, status: deviceStatus });

                        // Extract metrics safely from dials or summary fields
                        // OpManager Summary often has direct fields or a 'dials' array
                        // 使用 null 表示"无数据"，使用 0 表示"实际值为 0"
                        let cpu: number | null = null;
                        let mem: number | null = null;
                        let disk: number | null = null;

                        if (summary.dials && Array.isArray(summary.dials)) {
                            // 支持中英文字段名（生产环境可能返回中文）
                            const cpuDial = summary.dials.find((d: any) =>
                                d.displayName?.includes('CPU') || d.displayName?.includes('cpu') ||
                                d.displayName?.includes('CPU利用率') || d.displayName?.includes('CPU使用率') ||
                                d.displayName?.includes('处理器')
                            );
                            const memDial = summary.dials.find((d: any) =>
                                d.displayName?.includes('Memory') || d.displayName?.includes('memory') ||
                                d.displayName?.includes('内存') || d.displayName?.includes('RAM')
                            );
                            const diskDial = summary.dials.find((d: any) =>
                                d.displayName?.includes('Disk') || d.displayName?.includes('disk') ||
                                d.displayName?.includes('磁盘') || d.displayName?.includes('硬盘')
                            );

                            // 只有找到对应的 dial 才设置值，否则保持 null
                            if (cpuDial) cpu = parseFloat(cpuDial.value);
                            if (memDial) mem = parseFloat(memDial.value);
                            if (diskDial) disk = parseFloat(diskDial.value);
                        } else {
                            // Fallback: try direct properties if API structure differs
                            const cpuVal = summary.cpuUtilization || summary.cpu;
                            const memVal = summary.memoryUtilization || summary.mem;
                            if (cpuVal !== undefined) cpu = parseFloat(cpuVal);
                            if (memVal !== undefined) mem = parseFloat(memVal);
                        }

                        const metricData = {
                            deviceId: device.id,
                            timestamp,
                            // 保持 null 表示无数据，只在 NaN 时转为 null
                            cpuUsage: cpu !== null && !isNaN(cpu) ? cpu : null,
                            memoryUsage: mem !== null && !isNaN(mem) ? mem : null,
                            diskUsage: disk !== null && !isNaN(disk) ? disk : null,
                            responseTime: parseFloat(summary.responseTime || '0'),
                            packetLoss: parseFloat(summary.packetLoss || '0'),
                        };

                        metricsToInsert.push(metricData);

                        // Broadcast update immediately for real-time feel
                        await broadcaster.emit(`device:${device.id}`, BroadcastEvent.METRICS_UPDATE, {
                            deviceId: device.id,
                            metrics: metricData
                        });

                        successCount++;
                    } catch (deviceError: any) {
                        // 只记录非超时错误，超时错误已在重试逻辑中记录
                        if (!deviceError.code || deviceError.code !== 'ECONNABORTED') {
                            console.error(`❌ Failed to collect metrics for ${device.name}:`, deviceError.message || deviceError);
                        }
                    }
                }));
            }

            // Bulk insert all collected metrics
            if (metricsToInsert.length > 0) {
                await prisma.deviceMetric.createMany({
                    data: metricsToInsert
                });
            }

            // Bulk update device statuses
            // 批量更新设备状态（从 getDeviceSummary 获取的实时状态）
            if (deviceStatusUpdates.length > 0) {
                for (const { id, status } of deviceStatusUpdates) {
                    try {
                        await prisma.device.update({
                            where: { id },
                            data: { status }
                        });
                        statusUpdateCount++;
                    } catch (error) {
                        console.error(`Failed to update status for device ${id}:`, error);
                    }
                }
            }

            console.log(`✅ Collected metrics for ${successCount}/${devices.length} devices.`);
            console.log(`✅ Updated status for ${statusUpdateCount} devices from getDeviceSummary.`);
        } catch (error) {
            console.error('❌ Metric Collection Failed:', error);
        }
    }
}

export const metricCollector = new MetricCollector();
