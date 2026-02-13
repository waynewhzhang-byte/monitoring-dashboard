import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { InterfaceStatus } from '@prisma/client';
import { broadcaster } from '@/services/broadcast';

// Process interfaces in batches to control concurrency
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * 解析流量字符串为 bps (bits per second)
 * 支持格式: "10.806 Mbps", "3.768 K", "69.148 M (0.0%)", "0 bps", "NA"
 */
function parseTrafficToBps(trafficStr: string | undefined): bigint {
    if (!trafficStr || trafficStr.trim() === '' || trafficStr.trim().toUpperCase() === 'NA') {
        return BigInt(0);
    }
    const trafficOnly = trafficStr.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
    const parts = trafficOnly.split(/\s+/);
    if (parts.length < 2) return BigInt(0);
    const value = parseFloat(parts[0]);
    if (Number.isNaN(value)) return BigInt(0);
    const unit = (parts[1] || '').toUpperCase();
    let multiplier = 1;
    if (unit === 'K' || unit === 'KB' || unit === 'KBPS' || unit === 'Kbps') {
        multiplier = 1000;
    } else if (unit === 'M' || unit === 'MB' || unit === 'MBPS' || unit === 'Mbps') {
        multiplier = 1000 * 1000;
    } else if (unit === 'G' || unit === 'GB' || unit === 'GBPS' || unit === 'Gbps') {
        multiplier = 1000 * 1000 * 1000;
    } else if (unit === 'T' || unit === 'TB' || unit === 'TBPS') {
        multiplier = 1000 * 1000 * 1000 * 1000;
    } else if (unit === 'BPS' || unit === 'bps') {
        multiplier = 1;
    }
    return BigInt(Math.round(value * multiplier));
}

export class InterfaceTrafficCollector {
    async collectTraffic() {
        console.log('📡 Starting Interface Traffic & Status Collection...');
        try {
            // 获取所有有标签的接口（需要采集流量的接口）
            // 有标签 = 用户关心的接口，需要实时监控
            const interfaces = await prisma.interface.findMany({
                where: {
                    tags: { isEmpty: false },  // 只采集有标签的接口
                    isMonitored: true
                },
                include: {
                    device: {
                        select: { opmanagerId: true, name: true, ipAddress: true }
                    }
                }
            });

            if (interfaces.length === 0) {
                console.log('ℹ️  No tagged interfaces found for traffic collection.');
                return;
            }

            console.log(`📋 Found ${interfaces.length} tagged interfaces to collect traffic.`);

            const timestamp = new Date();
            let successCount = 0;
            let statusUpdateCount = 0;
            const trafficMetricsToInsert: any[] = [];
            const interfaceStatusUpdates: Array<{ id: string; status: InterfaceStatus }> = [];

            // 按设备分组，减少 API 调用次数
            const deviceInterfacesMap = new Map<string, typeof interfaces>();
            for (const intf of interfaces) {
                const deviceKey = intf.device.opmanagerId || intf.device.ipAddress;
                if (!deviceInterfacesMap.has(deviceKey)) {
                    deviceInterfacesMap.set(deviceKey, []);
                }
                deviceInterfacesMap.get(deviceKey)!.push(intf);
            }

            const devices = Array.from(deviceInterfacesMap.keys());
            const batches = chunkArray(devices, BATCH_SIZE);

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];

                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
                }

                await Promise.all(batch.map(async (deviceKey) => {
                    const deviceInterfaces = deviceInterfacesMap.get(deviceKey)!;
                    const device = deviceInterfaces[0].device;

                    try {
                        // 调用 getInterfaces 获取该设备所有接口的实时状态和流量
                        const opInterfaces = await opClient.getInterfaces({
                            deviceName: device.opmanagerId || undefined,
                            deviceIpAddress: device.ipAddress || undefined
                        });

                        if (!opInterfaces || opInterfaces.length === 0) {
                            return;
                        }

                        // 为每个标签接口匹配 OpManager 返回的数据
                        for (const localIntf of deviceInterfaces) {
                            // 通过接口名称匹配（去掉设备名前缀）
                            const interfaceName = localIntf.displayName || localIntf.name;
                            const shortName = interfaceName.replace(`${device.name}-`, '');

                            const opIntf = opInterfaces.find((op: any) =>
                                op.name === shortName ||
                                op.interfaceName === shortName ||
                                op.displayName === interfaceName ||
                                op.interfaceDisplayName === interfaceName
                            );

                            if (!opIntf) continue;

                            // 提取接口状态
                            let status: InterfaceStatus = InterfaceStatus.UP;
                            const statusStr = (opIntf.status || opIntf.statusStr || opIntf.statusNum?.toString() || '').toLowerCase();
                            if (statusStr.includes('down') || statusStr.includes('critical') || statusStr.includes('stop') || statusStr === '2') {
                                status = InterfaceStatus.DOWN;
                            } else if (statusStr.includes('dormant')) {
                                status = InterfaceStatus.DORMANT;
                            } else if (statusStr.includes('testing')) {
                                status = InterfaceStatus.TESTING;
                            } else if (statusStr.includes('unknown') || statusStr === '' || statusStr === '0') {
                                status = InterfaceStatus.UNKNOWN;
                            }

                            interfaceStatusUpdates.push({ id: localIntf.id, status });

                            // 提取流量数据
                            const inTrafficStr = opIntf.InTraffic || opIntf.inTraffic || opIntf.inBandwidth;
                            const outTrafficStr = opIntf.OutTraffic || opIntf.outTraffic || opIntf.outBandwidth;

                            const inBps = parseTrafficToBps(inTrafficStr);
                            const outBps = parseTrafficToBps(outTrafficStr);

                            // 提取利用率
                            const inUtil = parseFloat(opIntf.inUtilization || opIntf.InUtilization || '0');
                            const outUtil = parseFloat(opIntf.outUtilization || opIntf.OutUtilization || '0');

                            const trafficData = {
                                interfaceId: localIntf.id,
                                inBandwidth: inBps,
                                outBandwidth: outBps,
                                inUtilization: isNaN(inUtil) ? null : inUtil,
                                outUtilization: isNaN(outUtil) ? null : outUtil,
                                timestamp
                            };

                            trafficMetricsToInsert.push(trafficData);

                            // Broadcast traffic update for realtime dashboard
                            await broadcaster.emit('traffic', 'traffic:updated', {
                                interfaceId: localIntf.id,
                                deviceId: localIntf.deviceId,
                                traffic: trafficData,
                                status
                            });

                            successCount++;
                        }
                    } catch (error: any) {
                        console.error(`Failed to collect traffic for device ${deviceKey}:`, error.message || error);
                    }
                }));
            }

            // Bulk insert traffic metrics
            if (trafficMetricsToInsert.length > 0) {
                await prisma.trafficMetric.createMany({
                    data: trafficMetricsToInsert
                });
            }

            // Bulk update interface statuses
            if (interfaceStatusUpdates.length > 0) {
                for (const { id, status } of interfaceStatusUpdates) {
                    try {
                        await prisma.interface.update({
                            where: { id },
                            data: { status }
                        });
                        statusUpdateCount++;
                    } catch (error) {
                        console.error(`Failed to update status for interface ${id}:`, error);
                    }
                }
            }

            console.log(`✅ Collected traffic for ${successCount}/${interfaces.length} tagged interfaces.`);
            console.log(`✅ Updated status for ${statusUpdateCount} interfaces from getInterfaces.`);
        } catch (error) {
            console.error('❌ Interface Traffic Collection Failed:', error);
        }
    }
}

export const interfaceTrafficCollector = new InterfaceTrafficCollector();
