/**
 * 检查 DeviceMetric 表中的实际数据
 * 验证 CPU/内存/磁盘使用率字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeviceMetrics() {
    console.log('🔍 检查 DeviceMetric 表数据...\n');

    try {
        // 1. 统计总记录数
        const totalCount = await prisma.deviceMetric.count();
        console.log(`📊 总记录数: ${totalCount}`);

        if (totalCount === 0) {
            console.log('\n⚠️  DeviceMetric 表为空，请先运行采集器采集数据');
            console.log('   运行命令: npm run collector\n');
            return;
        }

        // 2. 获取最新的 10 条记录
        console.log('\n📋 最新 10 条性能数据:\n');
        const latestMetrics = await prisma.deviceMetric.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        type: true,
                        ipAddress: true
                    }
                }
            }
        });

        // 打印表头
        console.log('═'.repeat(120));
        console.log(
            '设备名称'.padEnd(25) +
            'IP地址'.padEnd(18) +
            '类型'.padEnd(12) +
            'CPU%'.padEnd(10) +
            '内存%'.padEnd(10) +
            '磁盘%'.padEnd(10) +
            '采集时间'
        );
        console.log('═'.repeat(120));

        // 打印数据
        latestMetrics.forEach((metric) => {
            const deviceName = (metric.device.displayName || metric.device.name).substring(0, 23);
            const ip = metric.device.ipAddress.substring(0, 16);
            const type = metric.device.type.substring(0, 10);
            const cpu = metric.cpuUsage !== null ? metric.cpuUsage.toFixed(1) : '--';
            const mem = metric.memoryUsage !== null ? metric.memoryUsage.toFixed(1) : '--';
            const disk = metric.diskUsage !== null ? metric.diskUsage.toFixed(1) : '--';
            const time = metric.timestamp.toLocaleString('zh-CN');

            console.log(
                deviceName.padEnd(25) +
                ip.padEnd(18) +
                type.padEnd(12) +
                cpu.padEnd(10) +
                mem.padEnd(10) +
                disk.padEnd(10) +
                time
            );
        });
        console.log('═'.repeat(120));

        // 3. 统计各字段的非空率
        console.log('\n📈 字段统计:\n');

        const cpuCount = await prisma.deviceMetric.count({
            where: { cpuUsage: { not: null } }
        });

        const memoryCount = await prisma.deviceMetric.count({
            where: { memoryUsage: { not: null } }
        });

        const diskCount = await prisma.deviceMetric.count({
            where: { diskUsage: { not: null } }
        });

        console.log(`CPU 使用率    (cpuUsage):    ${cpuCount}/${totalCount} (${((cpuCount/totalCount)*100).toFixed(1)}%)`);
        console.log(`内存使用率    (memoryUsage): ${memoryCount}/${totalCount} (${((memoryCount/totalCount)*100).toFixed(1)}%)`);
        console.log(`磁盘使用率    (diskUsage):   ${diskCount}/${totalCount} (${((diskCount/totalCount)*100).toFixed(1)}%)`);

        // 4. 按设备类型分组统计
        console.log('\n📊 按设备类型统计 (最新指标):\n');

        const deviceTypes = await prisma.device.findMany({
            where: { isMonitored: true },
            select: { type: true },
            distinct: ['type']
        });

        for (const { type } of deviceTypes) {
            const devices = await prisma.device.findMany({
                where: {
                    isMonitored: true,
                    type: type
                },
                select: { id: true, name: true }
            });

            console.log(`\n【${type}】 (${devices.length} 台设备)`);

            for (const device of devices.slice(0, 3)) { // 只显示每种类型前3台
                const latestMetric = await prisma.deviceMetric.findFirst({
                    where: { deviceId: device.id },
                    orderBy: { timestamp: 'desc' }
                });

                if (latestMetric) {
                    const cpu = latestMetric.cpuUsage !== null ? `${latestMetric.cpuUsage.toFixed(1)}%` : 'null';
                    const mem = latestMetric.memoryUsage !== null ? `${latestMetric.memoryUsage.toFixed(1)}%` : 'null';
                    const disk = latestMetric.diskUsage !== null ? `${latestMetric.diskUsage.toFixed(1)}%` : 'null';

                    console.log(`  ${device.name.padEnd(30)} CPU: ${cpu.padEnd(8)} 内存: ${mem.padEnd(8)} 磁盘: ${disk}`);
                }
            }
        }

        // 5. 验证数据库 schema
        console.log('\n\n✅ 数据库 Schema 验证:\n');
        console.log('DeviceMetric 表包含以下性能字段:');
        console.log('  • cpuUsage     (Float?)  - CPU 使用率百分比');
        console.log('  • memoryUsage  (Float?)  - 内存使用率百分比');
        console.log('  • diskUsage    (Float?)  - 磁盘使用率百分比');
        console.log('\n说明: Float? 表示可为 null（如交换机没有磁盘，diskUsage 为 null）\n');

    } catch (error) {
        console.error('❌ 查询失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDeviceMetrics();
