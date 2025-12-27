import { prisma } from '../../lib/prisma';
import { opClient } from '../opmanager/client';
import { DeviceType, DeviceStatus } from '@prisma/client';

export class DeviceCollector {
    async syncDevices() {
        console.log('🔄 Starting Device Sync...');
        try {
            const opDevices = await opClient.getDevices();

            let syncedCount = 0;
            for (const opDev of opDevices) {
                // Map Status
                let status: DeviceStatus = DeviceStatus.ONLINE;
                if (opDev.status === 'Critical' || opDev.status === 'Trouble') {
                    status = DeviceStatus.ERROR;
                } else if (opDev.status === 'Attention') {
                    status = DeviceStatus.WARNING;
                } else if (opDev.status === 'down') { // handle possible variations
                    status = DeviceStatus.OFFLINE;
                }

                // Map Type
                let type: DeviceType = DeviceType.OTHER;
                const opType = opDev.type?.toLowerCase() || '';
                if (opType.includes('router')) type = DeviceType.ROUTER;
                else if (opType.includes('switch')) type = DeviceType.SWITCH;
                else if (opType.includes('server')) type = DeviceType.SERVER;
                else if (opType.includes('firewall')) type = DeviceType.FIREWALL;
                else if (opType.includes('printer')) type = DeviceType.PRINTER;
                else if (opType.includes('storage')) type = DeviceType.STORAGE;

                // Use correct field names from OpManager API
                const deviceId = (opDev as any).deviceName || opDev.name;
                const ipAddr = (opDev as any).ipaddress || opDev.ipAddress;

                if (!deviceId) {
                    console.warn('⚠️ Skipping device with no deviceName/name');
                    continue;
                }

                try {
                    await prisma.device.upsert({
                        where: { opmanagerId: deviceId },
                        update: {
                            displayName: opDev.displayName || deviceId,
                            type,
                            ipAddress: ipAddr || 'unknown',
                            status,
                            category: opDev.category,
                            vendor: opDev.vendorName,
                            isMonitored: (opDev.isManaged === 'true') || (opDev as any).isManaged === true,
                            lastSyncAt: new Date(),
                            availability: opDev.availability
                        },
                        create: {
                            opmanagerId: deviceId,
                            name: deviceId,
                            displayName: opDev.displayName || deviceId,
                            type,
                            ipAddress: ipAddr || 'unknown',
                            status,
                            category: opDev.category,
                            vendor: opDev.vendorName,
                            isMonitored: (opDev.isManaged === 'true') || (opDev as any).isManaged === true,
                            lastSyncAt: new Date(),
                            availability: opDev.availability
                        }
                    });
                    syncedCount++;
                } catch (upsertError) {
                    console.error(`❌ Failed to upsert device ${deviceId}:`, upsertError);
                }
            }
            console.log(`✅ Synced ${syncedCount} devices successfully.`);
        } catch (error) {
            console.error('❌ Device Sync Failed:', error);
        }
    }
}

export const deviceCollector = new DeviceCollector();
