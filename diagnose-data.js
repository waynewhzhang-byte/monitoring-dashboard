
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log('=== OpManager 数据采集诊断报告 ===\n');

    // 1. 数据库基础统计
    const devices = await prisma.device.findMany();
    const monitored = devices.filter(d => d.isMonitored);
    const metrics = await prisma.deviceMetric.count();
    const traffic = await prisma.trafficMetric.count();
    const alarms = await prisma.alarm.count();

    console.log(`[1] 数据库统计:`);
    console.log(`    - 总设备数: ${devices.length}`);
    console.log(`    - 被监控设备数 (isMonitored=true): ${monitored.length}`);
    console.log(`    - 性能指标总数 (DeviceMetric): ${metrics}`);
    console.log(`    - 接口流量总数 (TrafficMetric): ${traffic}`);
    console.log(`    - 告警总数 (Alarm): ${alarms}`);

    if (monitored.length === 0 && devices.length > 0) {
        console.log('\n❌ 诊断结果: 虽然有设备，但没有一个设备开启了监控 (isMonitored=false)。');
        console.log('   原因: OpManager 同步时判定为 isManaged=false。');
        console.log('   解决: 您可以运行 UPDATE "Device" SET "isMonitored" = true; 来手动开启。');
    }

    // 2. 检查性能数据时效性
    if (metrics > 0) {
        const latest = await prisma.deviceMetric.findFirst({ orderBy: { timestamp: 'desc' } });
        console.log(`\n[2] 性能数据时效性:`);
        console.log(`    - 最新指标时间: ${latest.timestamp}`);
        const minutesOld = (new Date().getTime() - new Date(latest.timestamp).getTime()) / 60000;
        console.log(`    - 数据延迟: ${minutesOld.toFixed(1)} 分钟`);

        if (minutesOld > 10) {
            console.log('⚠️  警告: 性能数据已超过 10 分钟未更新，采集服务可能已停止或异常。');
        }
    } else {
        console.log('\n❌ 诊断结果: 数据库中没有任何性能指标数据。');
    }

    // 3. 环境变量与 Mock 模式检查
    const useMock = process.env.USE_MOCK_DATA === 'true' || (process.env.NODE_ENV === 'development' && !process.env.OPMANAGER_API_KEY);
    console.log(`\n[3] 环境配置:`);
    console.log(`    - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`    - OPMANAGER_API_KEY: ${process.env.OPMANAGER_API_KEY ? '已设置' : '未设置'}`);
    console.log(`    - 当前运行模式: ${useMock ? 'MOCK数据模式' : '真实API模式'}`);

    if (useMock && process.env.OPMANAGER_API_KEY) {
        console.log('⚠️  注意: 您虽然设置了 API KEY，但可能因环境判定回落到了 MOCK 模式。');
    }

    await prisma.$disconnect();
    console.log('\n=== 诊断结束 ===');
}

diagnose().catch(console.error);
