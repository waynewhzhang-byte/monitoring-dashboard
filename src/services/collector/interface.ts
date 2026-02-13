
import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { DeviceStatus, DeviceType, InterfaceStatus } from '@prisma/client';

export class InterfaceCollector {
    async syncInterfaces(
        trigger?: 'MANUAL' | 'AUTO'
    ): Promise<{
        devicesConsidered: number;
        devicesSkipped: number;
        devicesSkippedNonNetwork: number;
        devicesProcessed: number;
        interfacesFetched: number;
        interfacesUpserted: number;
        durationMs: number;
    }> {
        // SAFETY LOCK: Only allow manual synchronization
        // This prevents any accidental or scheduled syncs from overwriting manual changes
        if (trigger !== 'MANUAL') {
            console.warn('🚫 Interface sync blocked: Only manual synchronization is allowed.');
            console.warn(`   Trigger: ${trigger || 'undefined'} - Sync must be explicitly triggered via admin interface.`);
            console.warn('   To sync interfaces, use the manual sync button in the admin panel.');
            return {
                devicesConsidered: 0,
                devicesSkipped: 0,
                devicesSkippedNonNetwork: 0,
                devicesProcessed: 0,
                interfacesFetched: 0,
                interfacesUpserted: 0,
                durationMs: 0,
            };
        }

        console.log('🔄 Starting Interface Sync (MANUAL)...');
        const startedAt = Date.now();
        const stats = {
            devicesConsidered: 0,
            devicesSkipped: 0,
            devicesSkippedNonNetwork: 0,
            devicesProcessed: 0,
            interfacesFetched: 0,
            interfacesUpserted: 0,
            durationMs: 0,
        };
        try {
            // 1. Get devices from DB that are worth querying OpManager for
            /**
             * IMPORTANT: ONLINE 概念（避免后续逻辑混乱）
             *
             * WARNING/ERROR 不是“离线”，而是“在线但有故障/告警”——接口数据仍可能用于定位问题，
             * 因此不应跳过 WARNING/ERROR。
             *
             * 仅跳过：
             * - OFFLINE（OpManager Down：不可达/不可 Ping）
             * - UNMANAGED（OpManager UnManaged：未纳入监控）
             * - isMonitored=false（未纳入监控）
             *
             * 另外：接口同步仅面向“网络设备”（交换机/路由器/防火墙/负载均衡等），不拉服务器设备接口。
             */
            const NETWORK_DEVICE_TYPES: DeviceType[] = [
                DeviceType.SWITCH,
                DeviceType.ROUTER,
                DeviceType.FIREWALL,
                DeviceType.LOAD_BALANCER,
            ];
            const NETWORK_DEVICE_CATEGORIES = ['Switch', 'Router', 'Firewall', 'Wireless'];

            // Try multiple query strategies to find devices
            let devices = await prisma.device.findMany({
                where: {
                    ipAddress: { not: 'unknown' }, // Only devices with valid IP addresses
                    isMonitored: true,
                    status: { notIn: [DeviceStatus.OFFLINE, DeviceStatus.UNMANAGED] },
                    OR: [
                        { type: { in: NETWORK_DEVICE_TYPES } },
                        { category: { in: NETWORK_DEVICE_CATEGORIES } },
                    ],
                },
                select: { opmanagerId: true, name: true, id: true, ipAddress: true, displayName: true, isMonitored: true, status: true, type: true, category: true }
            });


            // Fallback: if no devices found with standard query, try to get all devices and filter manually
            if (devices.length === 0) {
                console.warn('⚠️  No devices found with standard query. Trying alternative query...');
                const allDevices = await prisma.device.findMany({
                    select: { opmanagerId: true, name: true, id: true, ipAddress: true, displayName: true, isMonitored: true, status: true, type: true, category: true }
                });
                devices = allDevices.filter(d =>
                    d.ipAddress &&
                    d.ipAddress !== 'unknown' &&
                    d.ipAddress.trim() !== '' &&
                    d.isMonitored === true &&
                    d.status !== DeviceStatus.OFFLINE &&
                    d.status !== DeviceStatus.UNMANAGED &&
                    (NETWORK_DEVICE_TYPES.includes(d.type) || (d.category ? NETWORK_DEVICE_CATEGORIES.includes(d.category) : false))
                );
                console.log(`📋 Alternative query found ${devices.length} devices with valid IP addresses`);
            }

            let totalSynced = 0;

            console.log(`📋 Found ${devices.length} devices with IP addresses to sync interfaces for`);

            for (const device of devices) {
                stats.devicesConsidered++;
                // Defensive: in case caller changes query, keep a runtime guard for “network devices only”
                // (不要拉服务器设备接口)
                const isNetworkType =
                    device.type === DeviceType.SWITCH ||
                    device.type === DeviceType.ROUTER ||
                    device.type === DeviceType.FIREWALL ||
                    device.type === DeviceType.LOAD_BALANCER ||
                    (device.category ? ['Switch', 'Router', 'Firewall', 'Wireless'].includes(device.category) : false);
                if (!isNetworkType) {
                    stats.devicesSkippedNonNetwork++;
                    continue;
                }
                try {
                    // Fetch interfaces for this device
                    // Prefer OpManager deviceName/opmanagerId (varies by environment), fallback to IP address.
                    if (!device.opmanagerId && !device.ipAddress) {
                        console.warn(`⚠️  Skipping device ${device.name}: opmanagerId and IP address are both missing`);
                        stats.devicesSkipped++;
                        continue;
                    }
                    
                    console.log(`🔍 Fetching interfaces for device: opmanagerId=${device.opmanagerId}, ip=${device.ipAddress}, name=${device.name}`);
                    
                    const interfaces = await opClient.getInterfaces({
                        deviceName: device.opmanagerId || undefined,
                        deviceIpAddress: device.ipAddress || undefined,
                    });

                    if (!interfaces || interfaces.length === 0) {
                        console.log(`⚠️  No interfaces found for device: ${device.displayName || device.name} (opmanagerId=${device.opmanagerId}, ip=${device.ipAddress})`);
                        stats.devicesProcessed++;
                        continue;
                    }

                    stats.devicesProcessed++;
                    stats.interfacesFetched += interfaces.length;

                    console.log(`📡 Found ${interfaces.length} interfaces for device IP: ${device.ipAddress} (${device.displayName || device.name})`);
                    
                    // Debug: Log if interface count seems low (might indicate pagination issue)
                    if (interfaces.length >= 100) {
                        console.warn(`⚠️  Device ${device.displayName || device.name} has ${interfaces.length} interfaces - API might have pagination limit`);
                    }

                    for (const iface of interfaces) {
                        try {
                            // Generate unique opmanagerId: deviceId + interface name/ifIndex
                            // This ensures uniqueness across all devices
                            // Handle both listInterfaces format (interfaceName) and getInterfaces format (name)
                            const interfaceName = iface.name || iface.interfaceName || iface.interfaceDisplayName || '';
                            const interfaceId = iface.ifIndex || iface.id || iface.interfaceId || interfaceName;
                            const uniqueOpManagerId = `${device.opmanagerId || device.name}_${interfaceId}`;
                            
                            if (!interfaceName) {
                                console.warn(`⚠️  Skipping interface with no name:`, iface);
                                continue;
                            }

                            // IMPORTANT: Interface name should be "设备名称+接口名称" to avoid confusion
                            // This ensures unique identification in UI and prevents tag confusion
                            const deviceDisplayName = device.displayName || device.name;
                            const fullInterfaceName = `${deviceDisplayName}-${interfaceName}`;

                            // Map Status - handle both status and statusStr fields
                            let status: InterfaceStatus = InterfaceStatus.UP;
                            const statusStr = (iface.status || iface.statusStr || iface.statusNum?.toString() || '').toLowerCase();
                            if (statusStr.includes('down') || statusStr.includes('critical') || statusStr.includes('stop') || statusStr === '2') {
                                status = InterfaceStatus.DOWN;
                            } else if (statusStr.includes('dormant')) {
                                status = InterfaceStatus.DORMANT;
                            } else if (statusStr.includes('testing')) {
                                status = InterfaceStatus.TESTING;
                            } else if (statusStr.includes('unknown') || statusStr === '' || statusStr === '0') {
                                status = InterfaceStatus.UNKNOWN;
                            }

                            // Extract speed from inSpeed or ifSpeed
                            let speed: bigint | null = null;
                            if (iface.inSpeed) {
                                const speedStr = String(iface.inSpeed).replace(/\D/g, '');
                                speed = speedStr ? BigInt(speedStr) : null;
                            } else if (iface.ifSpeed) {
                                speed = BigInt(iface.ifSpeed);
                            }

                            // Extract interface type
                            const interfaceType = iface.ifType || iface.type || 'ETHERNET';

                            // IMPORTANT: Tags are now MANUAL ONLY - no automatic tag generation
                            // All tags must be set manually via the admin interface
                            // This ensures users have full control over interface categorization
                            // Upsert Interface
                            const interfaceData = {
                                name: fullInterfaceName, // Use "设备名称+接口名称" format for unique identification
                                displayName: iface.displayName || iface.interfaceDisplayName || interfaceName,
                                status: status,
                                ipAddress: iface.ipAddress || null,
                                speed: speed,
                                macAddress: iface.macAddress || null,
                                mtu: iface.mtu || null,
                                ifIndex: typeof iface.ifIndex === 'number' ? iface.ifIndex : 
                                        (typeof iface.id === 'number' ? iface.id : 
                                        (typeof iface.interfaceId === 'number' ? iface.interfaceId : null)),
                                lastSyncAt: new Date(),
                                type: interfaceType
                            };

                            // IMPORTANT: Tags are MANUAL ONLY - never auto-generated
                            // Preserve existing tags for existing interfaces
                            // New interfaces start with empty tags array (must be set manually)
                            const interfaceRecord = await prisma.interface.upsert({
                                where: {
                                    opmanagerId: uniqueOpManagerId
                                },
                                update: {
                                    ...interfaceData,
                                    // DO NOT update tags for existing interfaces - preserve manual tags
                                    // Tags are only set via manual update via API
                                },
                                create: {
                                    ...interfaceData,
                                    opmanagerId: uniqueOpManagerId,
                                    deviceId: device.id,
                                    tags: [] // New interfaces start with no tags - must be set manually
                                }
                            });
                            
                            totalSynced++;
                            stats.interfacesUpserted++;
                            // Reduce log noise: only log occasionally
                            if (stats.interfacesUpserted % 50 === 0) {
                                console.log(`✅ Interfaces upserted so far: ${stats.interfacesUpserted}`);
                            }
                        } catch (ifaceError) {
                            console.error(`❌ Failed to sync interface ${iface.name || iface.interfaceName} for device ${device.opmanagerId || device.name}:`, ifaceError);
                        }
                    }
                } catch (deviceError: any) {
                    console.error(`❌ Failed to sync interfaces for device ${device.opmanagerId || device.name}:`, {
                        message: deviceError.message,
                        stack: deviceError.stack,
                        response: deviceError.response?.data
                    });
                    stats.devicesSkipped++;
                }
            }
            stats.durationMs = Date.now() - startedAt;
            console.log(`✅ Synced ${totalSynced} interfaces successfully in ${Math.round(stats.durationMs / 1000)}s.`);
            return stats;
        } catch (error) {
            console.error('❌ Interface Sync Failed:', error);
            stats.durationMs = Date.now() - startedAt;
            return stats;
        }
    }
}

export const interfaceCollector = new InterfaceCollector();
