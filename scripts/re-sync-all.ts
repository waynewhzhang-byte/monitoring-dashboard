/**
 * 完整数据库清理与重新同步脚本
 * 
 * 功能:
 * 1. 清理数据库中的所有业务数据 (设备、接口、告警、拓扑、指标)
 * 2. 从 OpManager 生产环境拉取最新数据并重新同步
 * 3. 自动同步所有 Business View 的拓扑结构
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 数据库全量重新同步工具');
    console.log('='.repeat(80) + '\n');

    const { prisma } = await import('../src/lib/prisma');
    const { opClient } = await import('../src/services/opmanager/client');
    const { topologyCollector } = await import('../src/services/collector/topology');

    try {
        // --- 1. 数据清理阶段 ---
        console.log('🧹 [第一阶段] 开始清理现有数据...');

        // 按照外键约束的反序进行删除
        const deletedTraffic = await prisma.trafficMetric.deleteMany({});
        console.log(`   ✅ 已删除流量指标: ${deletedTraffic.count}`);

        const deletedMetrics = await prisma.deviceMetric.deleteMany({});
        console.log(`   ✅ 已删除设备指标: ${deletedMetrics.count}`);

        const deletedEdges = await prisma.topologyEdge.deleteMany({});
        console.log(`   ✅ 已删除拓扑边: ${deletedEdges.count}`);

        const deletedNodes = await prisma.topologyNode.deleteMany({});
        console.log(`   ✅ 已删除拓扑节点: ${deletedNodes.count}`);

        const deletedBVDevice = await prisma.deviceBusinessView.deleteMany({});
        console.log(`   ✅ 已删除 Business View 关联: ${deletedBVDevice.count}`);

        const deletedInterfaces = await prisma.interface.deleteMany({});
        console.log(`   ✅ 已删除接口记录: ${deletedInterfaces.count}`);

        const deletedAlarms = await prisma.alarm.deleteMany({});
        console.log(`   ✅ 已删除告警记录: ${deletedAlarms.count}`);

        const deletedDevices = await prisma.device.deleteMany({});
        console.log(`   ✅ 已删除设备记录: ${deletedDevices.count}`);

        console.log('\n✨ 数据清理完成。\n');

        // --- 2. 设备与基础数据同步阶段 ---
        console.log('📡 [第二阶段] 开始从 OpManager 同步基础数据...');

        // 辅助映射函数
        const mapDeviceType = (type: string): any => {
            const typeStr = (type || '').toLowerCase();
            if (typeStr.includes('router')) return 'ROUTER';
            if (typeStr.includes('switch') || typeStr.includes('catalyst')) return 'SWITCH';
            if (typeStr.includes('firewall') || typeStr.includes('asa')) return 'FIREWALL';
            if (typeStr.includes('server') || typeStr.includes('windows') || typeStr.includes('linux')) return 'SERVER';
            if (typeStr.includes('load') && typeStr.includes('balance')) return 'LOAD_BALANCER';
            if (typeStr.includes('storage')) return 'STORAGE';
            if (typeStr.includes('printer')) return 'PRINTER';
            return 'OTHER';
        };

        const mapDeviceStatus = (status: string): any => {
            const s = (status || '').toLowerCase();
            if (s.includes('critical') || s.includes('trouble')) return 'ERROR';
            if (s.includes('attention') || s.includes('warning')) return 'WARNING';
            if (s.includes('down')) return 'OFFLINE';
            if (s.includes('unmanaged')) return 'UNMANAGED';
            return 'ONLINE';
        };

        // 获取设备列表
        const devicesRes = await opClient.getDevicesPage({ rows: 1000 });
        console.log(`   ✅ 获取到 ${devicesRes.devices.length} 个设备`);

        let deviceCount = 0;
        for (const dev of devicesRes.devices) {
            const statusStr = (dev as any).statusStr || dev.status || '';
            const isManaged = (dev as any).isManaged;
            const isMonitored = isManaged === undefined
                ? (statusStr.toLowerCase() !== 'unmanaged')
                : (String(isManaged).toLowerCase() === 'true');

            await prisma.device.upsert({
                where: { opmanagerId: dev.name || dev.ipAddress },
                update: {
                    name: dev.name,
                    displayName: dev.displayName || dev.name,
                    type: mapDeviceType(dev.type),
                    status: mapDeviceStatus(statusStr),
                    ipAddress: dev.ipAddress,
                    isMonitored,
                    lastSyncAt: new Date()
                },
                create: {
                    opmanagerId: dev.name || dev.ipAddress,
                    name: dev.name,
                    displayName: dev.displayName || dev.name,
                    type: mapDeviceType(dev.type),
                    status: mapDeviceStatus(statusStr),
                    ipAddress: dev.ipAddress,
                    isMonitored,
                }
            });
            deviceCount++;
            if (deviceCount % 50 === 0) process.stdout.write(`   设备同步中: ${deviceCount}/${devicesRes.devices.length}\r`);
        }
        console.log(`\n   ✅ 设备同步完成: ${deviceCount} 个`);

        // 同步接口
        console.log('   🔄 同步设备接口 (仅限已监控设备)...');
        const monitoredDevices = await prisma.device.findMany({ where: { isMonitored: true } });
        let interfaceCount = 0;
        for (const device of monitoredDevices) {
            try {
                const ifaces = await opClient.getInterfaces({ deviceIpAddress: device.ipAddress });
                for (const iface of ifaces) {
                    await prisma.interface.upsert({
                        where: { opmanagerId: `${device.opmanagerId}_${iface.ifIndex || iface.id}` },
                        update: {
                            status: (iface.status?.toUpperCase() === 'UP' ? 'UP' : 'DOWN') as any,
                            lastSyncAt: new Date()
                        },
                        create: {
                            deviceId: device.id,
                            opmanagerId: `${device.opmanagerId}_${iface.ifIndex || iface.id}`,
                            name: iface.name || '',
                            displayName: iface.displayName || iface.name,
                            type: iface.type || 'ETHERNET',
                            status: (iface.status?.toUpperCase() === 'UP' ? 'UP' : 'DOWN') as any,
                            ipAddress: iface.ipAddress,
                            ifIndex: iface.ifIndex ? parseInt(String(iface.ifIndex), 10) : undefined,
                        }
                    });
                    interfaceCount++;
                }
            } catch (e) {
                // Ignore single device interface failure
            }
        }
        console.log(`   ✅ 接口同步完成: ${interfaceCount} 个`);

        // 同步 Business View 配置
        console.log('   🔄 同步 Business View 配置...');
        const bvResponse = await opClient.getBusinessView();
        const activeBVs: string[] = [];
        if (bvResponse?.BusinessView?.Details) {
            for (const bv of bvResponse.BusinessView.Details) {
                const bvName = bv.name?.replace('_bv', '') || bv.displayName;
                await prisma.businessViewConfig.upsert({
                    where: { name: bvName },
                    update: { isActive: true },
                    create: { name: bvName, displayName: bv.displayName || bvName, isActive: true }
                });
                activeBVs.push(bvName);
            }
        }
        console.log(`   ✅ Business View 配置同步完成: ${activeBVs.length} 个`);

        // --- 3. 拓扑结构同步阶段 ---
        console.log('\n🕸️ [第三阶段] 开始同步拓扑结构...');
        for (const bvName of activeBVs) {
            console.log(`   🔄 正在同步拓扑: ${bvName}`);
            try {
                const result = await topologyCollector.syncBusinessView(bvName);
                console.log(`      ✅ 节点: ${result.nodes}, 连线: ${result.edges}`);
            } catch (err: any) {
                console.error(`      ❌ 拓扑同步失败 (${bvName}): ${err.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎉 所有数据已重新同步完成！');
        console.log('='.repeat(80) + '\n');

    } catch (error: any) {
        console.error('\n❌ 重新同步过程发生错误:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
