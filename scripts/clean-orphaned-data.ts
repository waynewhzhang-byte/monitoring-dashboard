/**
 * 清理孤立数据（orphaned data）脚本
 *
 * 作用：清理数据库中存在但 OpManager 中已不存在的设备和接口
 * 策略：软删除（标记为 isMonitored: false）或硬删除
 *
 * 使用：
 *   npm run clean:orphaned -- --dry-run  # 预览模式（不实际删除）
 *   npm run clean:orphaned               # 软删除模式
 *   npm run clean:orphaned -- --hard     # 硬删除模式（危险）
 */

import { PrismaClient } from '@prisma/client';
import { opClient } from '../src/services/opmanager/client';

const prisma = new PrismaClient();

// 命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isHardDelete = args.includes('--hard');
const cleanDevices = !args.includes('--interfaces-only');
const cleanInterfaces = !args.includes('--devices-only');

interface CleanupStats {
    devicesOrphaned: number;
    devicesDeleted: number;
    interfacesOrphaned: number;
    interfacesDeleted: number;
}

async function main() {
    console.log('🧹 孤立数据清理工具\n');
    console.log('═'.repeat(80));
    console.log(`模式: ${isDryRun ? '🔍 预览模式（不实际删除）' : isHardDelete ? '❌ 硬删除模式（永久删除）' : '✅ 软删除模式（标记为不监控）'}`);
    console.log(`清理范围: ${cleanDevices ? '设备' : ''}${cleanDevices && cleanInterfaces ? ' + ' : ''}${cleanInterfaces ? '接口' : ''}`);
    console.log('═'.repeat(80) + '\n');

    if (isHardDelete && !isDryRun) {
        console.log('⚠️  警告：硬删除模式将永久删除数据，无法恢复！');
        console.log('建议：先运行 --dry-run 预览，确认无误后再执行\n');

        // 等待 5 秒给用户取消机会
        console.log('5 秒后开始执行，按 Ctrl+C 取消...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const stats: CleanupStats = {
        devicesOrphaned: 0,
        devicesDeleted: 0,
        interfacesOrphaned: 0,
        interfacesDeleted: 0,
    };

    // 1. 清理孤立设备
    if (cleanDevices) {
        await cleanOrphanedDevices(stats);
    }

    // 2. 清理孤立接口
    if (cleanInterfaces) {
        await cleanOrphanedInterfaces(stats);
    }

    // 3. 打印统计
    printSummary(stats);

    await prisma.$disconnect();
    process.exit(0);
}

/**
 * 清理孤立设备
 */
async function cleanOrphanedDevices(stats: CleanupStats) {
    console.log('📦 检查孤立设备...\n');

    try {
        // 1. 获取所有数据库中的设备
        const dbDevices = await prisma.device.findMany({
            select: {
                id: true,
                name: true,
                displayName: true,
                ipAddress: true,
                opmanagerId: true,
                isMonitored: true,
            },
        });

        console.log(`数据库中共有 ${dbDevices.length} 台设备`);

        // 2. 获取 OpManager 中的所有设备（分页）
        console.log('正在从 OpManager 获取设备列表...');
        const opDevices: any[] = [];
        let page = 1;
        const rowsPerPage = 100;
        let hasMore = true;

        while (hasMore) {
            const result = await (opClient as any).getDevicesPage({
                page,
                rows: rowsPerPage,
            });

            const devices = result.devices || [];
            if (devices.length > 0) {
                opDevices.push(...devices);
                console.log(`  已获取 ${opDevices.length} 台设备...`);
            }

            hasMore = devices.length === rowsPerPage;
            page++;
        }

        console.log(`OpManager 中共有 ${opDevices.length} 台设备\n`);

        // 3. 创建 OpManager 设备 ID 集合（用于快速查找）
        const opDeviceIds = new Set(opDevices.map(d => d.deviceId?.toString()));
        const opDeviceNames = new Set(opDevices.map(d => d.deviceName));
        const opDeviceIps = new Set(opDevices.map(d => d.ipAddress));

        // 4. 查找孤立设备
        const orphanedDevices = dbDevices.filter(dbDevice => {
            // 检查是否在 OpManager 中存在（按 ID、名称或 IP 匹配）
            const existsById = dbDevice.opmanagerId && opDeviceIds.has(dbDevice.opmanagerId);
            const existsByName = opDeviceNames.has(dbDevice.name);
            const existsByIp = opDeviceIps.has(dbDevice.ipAddress);

            return !existsById && !existsByName && !existsByIp;
        });

        stats.devicesOrphaned = orphanedDevices.length;

        if (orphanedDevices.length === 0) {
            console.log('✅ 未发现孤立设备\n');
            return;
        }

        // 5. 显示孤立设备列表
        console.log(`⚠️  发现 ${orphanedDevices.length} 台孤立设备:\n`);
        console.log('─'.repeat(80));
        console.log('名称'.padEnd(30) + 'IP地址'.padEnd(20) + '状态'.padEnd(15) + 'OpManager ID');
        console.log('─'.repeat(80));

        orphanedDevices.forEach(device => {
            const name = (device.displayName || device.name).substring(0, 28);
            const ip = device.ipAddress.substring(0, 18);
            const monitored = device.isMonitored ? '监控中' : '未监控';
            const opId = device.opmanagerId || 'N/A';

            console.log(
                name.padEnd(30) +
                ip.padEnd(20) +
                monitored.padEnd(15) +
                opId
            );
        });
        console.log('─'.repeat(80) + '\n');

        // 6. 执行删除
        if (!isDryRun) {
            console.log(`${isHardDelete ? '❌ 硬删除' : '✅ 软删除'}孤立设备...`);

            if (isHardDelete) {
                // 硬删除：永久删除设备及其关联数据
                const deleted = await prisma.device.deleteMany({
                    where: {
                        id: { in: orphanedDevices.map(d => d.id) },
                    },
                });
                stats.devicesDeleted = deleted.count;
                console.log(`✅ 已永久删除 ${deleted.count} 台设备及其关联数据\n`);
            } else {
                // 软删除：标记为不监控
                const updated = await prisma.device.updateMany({
                    where: {
                        id: { in: orphanedDevices.map(d => d.id) },
                    },
                    data: {
                        isMonitored: false,
                    },
                });
                stats.devicesDeleted = updated.count;
                console.log(`✅ 已标记 ${updated.count} 台设备为不监控\n`);
            }
        } else {
            console.log('🔍 预览模式：未实际删除数据\n');
        }
    } catch (error) {
        console.error('❌ 清理设备失败:', error);
    }
}

/**
 * 清理孤立接口
 */
async function cleanOrphanedInterfaces(stats: CleanupStats) {
    console.log('🔌 检查孤立接口...\n');

    try {
        // 1. 获取数据库中的所有接口
        const dbInterfaces = await prisma.interface.findMany({
            select: {
                id: true,
                name: true,
                deviceId: true,
                opmanagerId: true,
                isMonitored: true,
                device: {
                    select: {
                        name: true,
                        ipAddress: true,
                        opmanagerId: true,
                    },
                },
            },
        });

        console.log(`数据库中共有 ${dbInterfaces.length} 个接口`);

        // 2. 按设备分组
        const interfacesByDevice = new Map<string, typeof dbInterfaces>();
        dbInterfaces.forEach(iface => {
            const deviceId = iface.deviceId;
            if (!interfacesByDevice.has(deviceId)) {
                interfacesByDevice.set(deviceId, []);
            }
            interfacesByDevice.get(deviceId)!.push(iface);
        });

        console.log(`分布在 ${interfacesByDevice.size} 台设备上`);

        // 3. 逐设备检查接口
        const orphanedInterfaces: typeof dbInterfaces = [];
        let devicesChecked = 0;

        for (const [deviceId, interfaces] of interfacesByDevice) {
            const device = interfaces[0].device;
            devicesChecked++;

            if (devicesChecked % 10 === 0) {
                console.log(`  已检查 ${devicesChecked}/${interfacesByDevice.size} 台设备...`);
            }

            try {
                // 从 OpManager 获取该设备的接口列表
                const opInterfaces = await opClient.getInterfaces({
                    deviceName: device.opmanagerId || device.name,
                    deviceIpAddress: device.ipAddress,
                });

                // 创建 OpManager 接口名称集合
                const opInterfaceNames = new Set(
                    opInterfaces.map((i: any) => i.interfaceName || i.name)
                );

                // 查找孤立接口
                const orphaned = interfaces.filter(
                    iface => !opInterfaceNames.has(iface.name)
                );

                if (orphaned.length > 0) {
                    orphanedInterfaces.push(...orphaned);
                }
            } catch (error) {
                // OpManager API 调用失败，跳过该设备
                console.warn(`  ⚠️  设备 ${device.name} 接口获取失败，跳过`);
            }
        }

        stats.interfacesOrphaned = orphanedInterfaces.length;

        if (orphanedInterfaces.length === 0) {
            console.log('\n✅ 未发现孤立接口\n');
            return;
        }

        // 4. 显示孤立接口列表
        console.log(`\n⚠️  发现 ${orphanedInterfaces.length} 个孤立接口:\n`);
        console.log('─'.repeat(80));
        console.log('接口名称'.padEnd(30) + '设备'.padEnd(30) + '状态'.padEnd(20));
        console.log('─'.repeat(80));

        orphanedInterfaces.forEach(iface => {
            const name = iface.name.substring(0, 28);
            const deviceName = iface.device.name.substring(0, 28);
            const monitored = iface.isMonitored ? '监控中' : '未监控';

            console.log(
                name.padEnd(30) +
                deviceName.padEnd(30) +
                monitored.padEnd(20)
            );
        });
        console.log('─'.repeat(80) + '\n');

        // 5. 执行删除
        if (!isDryRun) {
            console.log(`${isHardDelete ? '❌ 硬删除' : '✅ 软删除'}孤立接口...`);

            if (isHardDelete) {
                // 硬删除：永久删除接口及其关联数据
                const deleted = await prisma.interface.deleteMany({
                    where: {
                        id: { in: orphanedInterfaces.map(i => i.id) },
                    },
                });
                stats.interfacesDeleted = deleted.count;
                console.log(`✅ 已永久删除 ${deleted.count} 个接口及其关联数据\n`);
            } else {
                // 软删除：标记为不监控
                const updated = await prisma.interface.updateMany({
                    where: {
                        id: { in: orphanedInterfaces.map(i => i.id) },
                    },
                    data: {
                        isMonitored: false,
                    },
                });
                stats.interfacesDeleted = updated.count;
                console.log(`✅ 已标记 ${updated.count} 个接口为不监控\n`);
            }
        } else {
            console.log('🔍 预览模式：未实际删除数据\n');
        }
    } catch (error) {
        console.error('❌ 清理接口失败:', error);
    }
}

/**
 * 打印清理统计
 */
function printSummary(stats: CleanupStats) {
    console.log('═'.repeat(80));
    console.log('📊 清理统计\n');

    console.log('设备:');
    console.log(`  孤立设备: ${stats.devicesOrphaned}`);
    console.log(`  已处理: ${stats.devicesDeleted}`);

    console.log('\n接口:');
    console.log(`  孤立接口: ${stats.interfacesOrphaned}`);
    console.log(`  已处理: ${stats.interfacesDeleted}`);

    console.log('\n总计:');
    console.log(`  孤立数据: ${stats.devicesOrphaned + stats.interfacesOrphaned}`);
    console.log(`  已处理: ${stats.devicesDeleted + stats.interfacesDeleted}`);

    console.log('\n' + '═'.repeat(80));

    if (isDryRun) {
        console.log('\n💡 提示：这是预览模式，未实际删除数据');
        console.log('   执行清理: npm run clean:orphaned');
        console.log('   硬删除: npm run clean:orphaned -- --hard (谨慎使用)');
    } else if (isHardDelete) {
        console.log('\n✅ 硬删除完成，数据已永久删除');
    } else {
        console.log('\n✅ 软删除完成，数据已标记为不监控');
        console.log('   恢复数据: 在 admin 面板中重新启用监控');
    }
}

// 执行清理
main().catch((error) => {
    console.error('❌ 清理失败:', error);
    process.exit(1);
});
