
/**
 * 生产环境一键诊断脚本
 * 用法: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/production-diagnose.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

async function diagnose() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀  生产环境数据采集与大屏状态诊断');
    console.log('='.repeat(60) + '\n');

    // 1. 核心环境变量检查
    console.log('【1/5】环境变量检查 (Environment Configuration)');
    const baseUrl = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;
    console.log(`- Base URL: ${baseUrl}`);
    console.log(`- API Key: ${apiKey ? '***' + apiKey.slice(-4) : '❌ 未设置'}`);

    if (!baseUrl || !apiKey || apiKey.includes('your-api-key')) {
        console.error('❌ 错误: 生产环境 OpManager 凭据未正确配置在 .env.local 中');
        console.log('👉 修复建议: 检查 .env.local 文件，确保 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY 已更新。');
        return;
    }
    console.log('✅ 环境变量格式检查通过。\n');

    // 2. 网络与 API 连通性
    console.log('【2/5】OpManager API 连通性 (Connectivity)');
    try {
        const start = Date.now();
        const result = await opClient.getDevices({ rows: 1 });
        const end = Date.now();
        console.log(`✅ 成功: API 响应时间 ${end - start}ms`);
        console.log(`✅ 认证: API Key 有效，已成功获取设备列表。`);
    } catch (error: any) {
        console.error(`❌ 连接/认证失败: ${error.message}`);
        console.log('👉 修复建议:');
        console.log('   - 确认服务器能 ping 通 ' + baseUrl);
        console.log('   - 确认 API Key 是否过期或输入错误');
        console.log('   - 检查防火墙是否允许访问 ' + baseUrl);
        return;
    }
    console.log('');

    // 3. 数据库同步状态
    console.log('【3/5】数据库设备同步状态 (Database Inventory)');
    try {
        const deviceCount = await prisma.device.count();
        const monitoredCount = await prisma.device.count({ where: { isMonitored: true } });

        console.log(`- 数据库总设备数: ${deviceCount}`);
        console.log(`- 监控中(isMonitored=true): ${monitoredCount}`);

        if (deviceCount === 0) {
            console.warn('⚠️ 数据库中没有设备。');
            console.log('👉 修复建议: 请在管理后台执行“手动同步设备”，或运行 ts-node ... scripts/fix-isMonitored.ts');
        } else if (monitoredCount === 0) {
            console.warn('⚠️ 设备已同步，但全部处于“不监控”状态。');
            console.log('👉 修复建议: 运行以下命令强制开启监控状态：');
            console.log('   npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/fix-isMonitored.ts');
        } else {
            console.log('✅ 设备同步状态正常。');
        }
    } catch (error: any) {
        console.error(`❌ 数据库查询错误: ${error.message}`);
    }
    console.log('');

    // 4. 实时指标采集
    console.log('【4/5】实时指标采集状态 (Metric Collection)');
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentMetrics = await prisma.deviceMetric.count({
            where: { timestamp: { gte: fiveMinutesAgo } }
        });
        const latestMetric = await prisma.deviceMetric.findFirst({
            orderBy: { timestamp: 'desc' }
        });

        console.log(`- 最近 5 分钟采集指标数: ${recentMetrics}`);
        if (latestMetric) {
            console.log(`- 最后一次采集时间: ${latestMetric.timestamp.toLocaleString()}`);
            console.log('✅ 指标采集服务正在正常运行。');
        } else {
            console.warn('⚠️ 最近没有采集到指标数据。');
            console.log('👉 修复建议: 确保后台采集服务 (collector) 已启动。');
            console.log('   运行: npm run collector');
        }
    } catch (error: any) {
        console.error(`❌ 指标查询错误: ${error.message}`);
    }
    console.log('');

    // 5. 大屏视图配置
    console.log('【5/5】大屏视图配置状态 (Dashboard Config)');
    try {
        const bvActive = await prisma.businessViewConfig.count({ where: { isActive: true } });
        const nodeCount = await prisma.topologyNode.count();
        const edgeCount = await prisma.topologyEdge.count();

        console.log(`- 已激活业务视图数: ${bvActive}`);
        console.log(`- 拓扑节点数: ${nodeCount}`);
        console.log(`- 拓扑连线数: ${edgeCount}`);

        if (bvActive === 0 || nodeCount === 0) {
            console.warn('⚠️ 大屏视图配置不完整，可能导致大屏显示为空。');
            console.log('👉 修复建议: 运行“UI 一键恢复脚本”：');
            console.log('   npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/production-restore-ui.ts');
        } else {
            console.log('✅ 大屏视图配置已就绪。');
        }
    } catch (error: any) {
        console.error(`❌ 视图查询错误: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 诊断完成');
    console.log('='.repeat(60) + '\n');
}

diagnose().catch(console.error).finally(() => prisma.$disconnect());
