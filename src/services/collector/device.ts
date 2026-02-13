import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { DeviceType, DeviceStatus } from '@prisma/client';

export class DeviceCollector {
    async syncDevices(trigger?: 'MANUAL' | 'AUTO') {
        // SAFETY LOCK: Only allow manual synchronization
        // This prevents any accidental or scheduled syncs from overwriting manual changes
        if (trigger !== 'MANUAL') {
            console.warn('🚫 Device sync blocked: Only manual synchronization is allowed.');
            console.warn(`   Trigger: ${trigger || 'undefined'} - Sync must be explicitly triggered via admin interface.`);
            console.warn('   To sync devices, use the manual sync button in the admin panel.');
            return;
        }

        console.log('🔄 Starting Device Sync (MANUAL)...');
        try {

            // Implement pagination to fetch ALL devices from OpManager
            // OpManager API v2/listDevices supports pagination with page and rows parameters
            // Response format: { total: number, page: number, rows: Array, records: number }
            const allOpDevices: any[] = [];
            let currentPage = 1;
            const rowsPerPage = 100; // Fetch 100 devices per page for efficiency
            let hasMorePages = true;
            let totalRecords = 0;

            console.log(`📋 Fetching devices from OpManager with pagination (${rowsPerPage} per page)...`);

            while (hasMorePages) {
                // Use getDevicesPage() to get pagination metadata
                // Note: getDevicesPage is a public method on OpManagerClient
                const pageResult = await (opClient as any).getDevicesPage({
                    page: currentPage,
                    rows: rowsPerPage
                });

                const pageDevices = pageResult.devices || [];

                // Update totalRecords from API response (use records field if available, otherwise total)
                if (pageResult.records !== undefined && pageResult.records > 0) {
                    totalRecords = pageResult.records;
                } else if (pageResult.total !== undefined && pageResult.total > 0) {
                    totalRecords = pageResult.total;
                }

                if (pageDevices.length > 0) {
                    allOpDevices.push(...pageDevices);
                    const progressInfo = totalRecords > 0
                        ? `(${allOpDevices.length}/${totalRecords} total)`
                        : `(Total so far: ${allOpDevices.length})`;
                    console.log(`  📄 Page ${currentPage}: Fetched ${pageDevices.length} devices ${progressInfo}`);

                    // Check if there are more pages
                    if (totalRecords > 0) {
                        // Use totalRecords from API response for accurate pagination
                        hasMorePages = allOpDevices.length < totalRecords;
                        if (!hasMorePages) {
                            console.log(`  ✅ Reached last page (fetched ${allOpDevices.length}/${totalRecords} devices)`);
                        }
                    } else {
                        // Fallback: If we got fewer devices than requested, we've reached the last page
                        if (pageDevices.length < rowsPerPage) {
                            hasMorePages = false;
                            console.log(`  ✅ Reached last page (got ${pageDevices.length} < ${rowsPerPage} devices)`);
                        } else {
                            currentPage++;
                        }
                    }

                    if (hasMorePages) {
                        currentPage++;
                    }
                } else {
                    hasMorePages = false;
                    console.log(`  ✅ No more devices found (page ${currentPage} returned empty)`);
                }

                // Safety limit: prevent infinite loops
                if (currentPage > 1000) {
                    console.warn(`  ⚠️  Safety limit reached: stopped pagination at page 1000`);
                    hasMorePages = false;
                }
            }

            const opDevices = allOpDevices;
            console.log(`📊 Total devices fetched from OpManager: ${opDevices.length}${totalRecords > 0 ? ` (API reported ${totalRecords} total)` : ''}`);

            if (opDevices.length === 0) {
                console.warn('⚠️ No devices found in OpManager. Database will not be updated.');
            }

            let syncedCount = 0;
            for (const opDev of opDevices) {
                // Map Status
                // Note: OpManager returns both 'status' and 'statusStr' fields
                // Use statusStr as primary source (more reliable)
                const opStatus = (opDev as any).statusStr || opDev.status || '';
                const statusLower = opStatus.toLowerCase();
                
                let status: DeviceStatus = DeviceStatus.ONLINE;
                
                /**
                 * IMPORTANT: ONLINE 概念（避免后续逻辑混乱）
                 *
                 * 本系统的 DeviceStatus 不是“是否在线”一个维度，而是“健康/可达性”合并后的枚举：
                 *
                 * - ONLINE / WARNING / ERROR：都表示“设备可达/在线（OpManager 仍在采集）”，区别仅在健康程度
                 *   - Clear      → ONLINE（在线且正常）
                 *   - Attention  → WARNING（在线但需关注）
                 *   - Trouble/Critical → ERROR（在线但故障/严重）
                 *
                 * - OFFLINE：仅对应 OpManager 的 Down（真正离线、不可达/不可 Ping）
                 *
                 * - UNMANAGED：仅对应 OpManager 的 UnManaged（未纳入监控）
                 *   此类设备不应继续拉性能/实时/接口数据（由 isMonitored=false 与下游过滤保证）
                 *
                 * 结论：WARNING/ERROR 不是“离线”，仍然属于“在线”；只有 OFFLINE/UNMANAGED 才应跳过进一步采集。
                 */
                // Priority: Critical > Trouble > Attention > Down > UnManaged > Clear/Up
                if (statusLower.includes('critical')) {
                    status = DeviceStatus.ERROR;
                } else if (statusLower.includes('trouble')) {
                    status = DeviceStatus.ERROR;
                } else if (statusLower.includes('attention') || statusLower.includes('warning')) {
                    status = DeviceStatus.WARNING;
                } else if (statusLower.includes('down')) {
                    status = DeviceStatus.OFFLINE;  // 仅 Down = 真正离线、不可 Ping
                } else if (statusLower.includes('unmanaged')) {
                    status = DeviceStatus.UNMANAGED;  // 未纳入监控，本系统不再做其他处理（由 isMonitored 保证）
                } else if (statusLower.includes('clear') || statusLower.includes('up')) {
                    status = DeviceStatus.ONLINE;
                }

                // 类型映射：来自 listDevices 的 type（如 "Windows 2019","Unknown"）和 category（如 "Server","交换机"），写入 DB 的 type 枚举与 category 原值
                let type: DeviceType = DeviceType.OTHER;
                const opType = (opDev.type ?? '').toString().toLowerCase();
                const opCategory = (opDev.category ?? '').toString().toLowerCase();
                if (opType.includes('router') || opCategory.includes('router') || opCategory.includes('路由器')) type = DeviceType.ROUTER;
                else if (opType.includes('switch') || opType.includes('catalyst') || opCategory.includes('switch') || opCategory.includes('交换机')) type = DeviceType.SWITCH;
                else if (opType.includes('server') || opType.includes('windows') || opType.includes('linux') || opCategory.includes('server') || opCategory.includes('服务器') || opCategory.includes('domaincontroller')) type = DeviceType.SERVER;
                else if (opType.includes('firewall') || opType.includes('asa') || opCategory.includes('firewall') || opCategory.includes('防火墙')) type = DeviceType.FIREWALL;
                else if (opType.includes('printer') || opCategory.includes('printer') || opCategory.includes('打印机')) type = DeviceType.PRINTER;
                else if (opType.includes('storage') || opType.includes('san') || opType.includes('nas') || opCategory.includes('storage')) type = DeviceType.STORAGE;
                else if (opType.includes('load') && opType.includes('balance')) type = DeviceType.LOAD_BALANCER;

                // Use correct field names from OpManager API
                // Note: client.ts already normalizes ipaddress -> ipAddress, so opDev.ipAddress should always exist
                const deviceId = (opDev as any).deviceName || opDev.name;
                // After normalization in client.ts, ipAddress should always be available (or 'unknown' if missing)
                const ipAddr = opDev.ipAddress || (opDev as any).ipaddress || 'unknown';

                if (!deviceId) {
                    console.warn('⚠️ Skipping device with no deviceName/name');
                    continue;
                }

                try {
                    // Check if device already exists to preserve manual changes
                    const existingDevice = await prisma.device.findUnique({
                        where: { opmanagerId: deviceId },
                        select: { id: true, type: true, tags: true, updatedAt: true, lastSyncAt: true }
                    });

                    // Preserve manual changes: keep existing type if it's not OTHER (manually set)
                    // Keep existing tags if they were manually set (non-empty array)
                    const finalType = existingDevice && existingDevice.type !== DeviceType.OTHER
                        ? existingDevice.type
                        : type;

                    // CRITICAL: Always preserve existing tags for existing devices
                    // Only use OpManager tags for NEW devices (devices that don't exist yet)
                    // This ensures manual tags are NEVER overwritten by sync operations
                    const opManagerTags = (opDev as any).tags || [];
                    let finalTags: string[];

                    if (existingDevice) {
                        // Device exists: ALWAYS preserve existing tags, even if empty
                        // This prevents sync from overwriting manually set tags
                        finalTags = existingDevice.tags;
                        if (finalTags.length > 0) {
                            console.log(`🔒 [DEVICE SYNC] Preserving manual tags for device ${deviceId}: ${JSON.stringify(finalTags)}`);
                            console.log(`   OpManager returned tags: ${JSON.stringify(opManagerTags)}`);
                            console.log(`   These OpManager tags will be IGNORED to preserve manual tags`);
                        } else if (opManagerTags.length > 0) {
                            console.log(`⚠️  [DEVICE SYNC] Device ${deviceId} has no existing tags, but OpManager returned tags: ${JSON.stringify(opManagerTags)}`);
                            console.log(`   Keeping empty tags array (manual tags only, no auto-tagging)`);
                        }
                    } else {
                        // New device: use OpManager tags
                        finalTags = opManagerTags;
                        if (opManagerTags.length > 0) {
                            console.log(`📝 [DEVICE SYNC] New device ${deviceId}, using OpManager tags: ${JSON.stringify(opManagerTags)}`);
                        }
                    }

                    // CRITICAL: Explicitly preserve tags for existing devices
                    // Prisma upsert update block only updates specified fields, but we need to be explicit
                    // to ensure tags are NEVER overwritten during sync
                    // CRITICAL: Robust isManaged detection
                    // Diagnostic showed real environment may return 'undefined' for isManaged
                    // Logic: If OpManager can return device data with status (not UnManaged), 
                    // it means the device IS being monitored
                    const opIsManagedRaw = (opDev as any).isManaged;
                    const opIsManaged = opIsManagedRaw === undefined
                        ? (opStatus.toLowerCase() !== 'unmanaged')  // 如果 isManaged 缺失，根据 status 判断
                        : (opIsManagedRaw === 'true' || opIsManagedRaw === true);

                    const updateData: any = {
                        displayName: opDev.displayName || deviceId,
                        type: finalType,  // Use preserved type if manually set
                        ipAddress: ipAddr || 'unknown',
                        status,
                        category: opDev.category,
                        vendor: opDev.vendorName,
                        isMonitored: opIsManaged,
                        lastSyncAt: new Date(),
                        availability: opDev.availability,
                    };

                    // CRITICAL: For existing devices, explicitly preserve tags
                    // DO NOT include tags in update block - this ensures manual tags are NEVER overwritten
                    // Tags should only be set via manual API calls, not during sync
                    if (existingDevice) {
                        // Explicitly log that we are preserving tags
                        if (existingDevice.tags.length > 0) {
                            console.log(`🔒 Preserving manual tags for device ${deviceId}: ${JSON.stringify(existingDevice.tags)}`);
                        }
                        // Do NOT add tags to updateData - Prisma will preserve existing value
                    }

                    await prisma.device.upsert({
                        where: { opmanagerId: deviceId },
                        update: updateData,
                        create: {
                            opmanagerId: deviceId,
                            name: deviceId,
                            displayName: opDev.displayName || deviceId,
                            type: finalType,
                            ipAddress: ipAddr || 'unknown',
                            status,
                            category: opDev.category ?? undefined,
                            vendor: opDev.vendorName,
                            isMonitored: opIsManaged,
                            lastSyncAt: new Date(),
                            availability: opDev.availability,
                            tags: finalTags  // For new devices, use OpManager tags (finalTags will be opManagerTags for new devices)
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
