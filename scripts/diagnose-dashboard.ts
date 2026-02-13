#!/usr/bin/env ts-node

/**
 * Dashboard无显示问题诊断脚本
 * 
 * 用法: npm run diagnose:dashboard
 * 或: ts-node -r tsconfig-paths/register scripts/diagnose-dashboard.ts
 */

// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';

// 优先加载 .env.local，如果不存在则加载 .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';

interface DiagnosticResult {
    step: string;
    status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
    message: string;
    details?: any;
}

const results: DiagnosticResult[] = [];

async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        results.push({
            step: '数据库连接',
            status: '✅ PASS',
            message: '数据库连接正常'
        });
    } catch (error) {
        results.push({
            step: '数据库连接',
            status: '❌ FAIL',
            message: '数据库连接失败',
            details: error
        });
    }
}

async function checkDeviceStatus() {
    try {
        const totalDevices = await prisma.device.count();
        const monitoredDevices = await prisma.device.count({
            where: { isMonitored: true }
        });
        const onlineDevices = await prisma.device.count({
            where: { isMonitored: true, status: 'ONLINE' }
        });

        results.push({
            step: '设备状态检查',
            status: monitoredDevices > 0 ? '✅ PASS' : '❌ FAIL',
            message: `总设备: ${totalDevices}, 监控设备: ${monitoredDevices}, 在线设备: ${onlineDevices}`,
            details: {
                total: totalDevices,
                monitored: monitoredDevices,
                online: onlineDevices,
                issue: monitoredDevices === 0 ? '没有isMonitored=true的设备，Dashboard API不会返回任何数据' : undefined
            }
        });
    } catch (error) {
        results.push({
            step: '设备状态检查',
            status: '❌ FAIL',
            message: '查询设备失败',
            details: error
        });
    }
}

async function checkDeviceMetrics() {
    try {
        const totalMetrics = await prisma.deviceMetric.count();
        const recentMetrics = await prisma.deviceMetric.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
                }
            }
        });
        const latestMetric = await prisma.deviceMetric.findFirst({
            orderBy: { timestamp: 'desc' },
            include: { device: { select: { name: true } } }
        });

        const status = totalMetrics > 0 ? '✅ PASS' : '❌ FAIL';
        const warning = recentMetrics === 0 && totalMetrics > 0 ? '⚠️ WARNING' : status;

        results.push({
            step: '设备指标数据',
            status: warning as any,
            message: `总指标数: ${totalMetrics}, 最近5分钟: ${recentMetrics}`,
            details: {
                total: totalMetrics,
                recent: recentMetrics,
                latest: latestMetric ? {
                    deviceName: latestMetric.device.name,
                    timestamp: latestMetric.timestamp,
                    age: Math.round((Date.now() - latestMetric.timestamp.getTime()) / 1000 / 60) + ' 分钟前'
                } : null,
                issue: totalMetrics === 0 ? '没有指标数据，Collector可能未正常运行或未收集到数据' :
                       recentMetrics === 0 ? '指标数据过旧，Collector可能已停止运行' : undefined
            }
        });
    } catch (error) {
        results.push({
            step: '设备指标数据',
            status: '❌ FAIL',
            message: '查询指标失败',
            details: error
        });
    }
}

async function checkOpManagerConfig() {
    const useMock = typeof env.USE_MOCK_DATA !== 'undefined' ? env.USE_MOCK_DATA : false;
    const baseUrl = typeof env.OPMANAGER_BASE_URL !== 'undefined' ? env.OPMANAGER_BASE_URL : '';
    const apiKey = typeof env.OPMANAGER_API_KEY !== 'undefined' ? env.OPMANAGER_API_KEY : '';

    const hasConfig = baseUrl && apiKey;

    results.push({
        step: 'OpManager配置',
        status: useMock ? '⚠️ WARNING' : (hasConfig ? '✅ PASS' : '❌ FAIL'),
        message: useMock ? 'USE_MOCK_DATA=true，使用模拟数据' : 
                 (hasConfig ? 'OpManager配置正常' : 'OpManager配置缺失'),
        details: {
            useMock,
            baseUrl: baseUrl || '未设置',
            apiKey: apiKey ? '已设置' : '未设置',
            issue: useMock ? '如果希望使用真实OpManager，请设置USE_MOCK_DATA=false' :
                   !hasConfig ? '需要配置OPMANAGER_BASE_URL和OPMANAGER_API_KEY' : undefined
        }
    });
}

async function checkOpManagerAPI() {
    try {
        const devices = await opClient.getDevices({ page: 1, rows: 5 });
        
        if (devices.length > 0) {
            const testDevice = devices[0];
            const summary = await opClient.getDeviceSummary(testDevice.name);
            
            results.push({
                step: 'OpManager API测试',
                status: summary ? '✅ PASS' : '⚠️ WARNING',
                message: `API调用成功，获取到 ${devices.length} 个设备`,
                details: {
                    deviceCount: devices.length,
                    testDevice: testDevice.name,
                    hasSummary: !!summary,
                    summaryKeys: summary ? Object.keys(summary).slice(0, 10) : [],
                    issue: !summary ? `设备 ${testDevice.name} 的getDeviceSummary返回null，Collector无法收集指标` : undefined
                }
            });
        } else {
            results.push({
                step: 'OpManager API测试',
                status: '⚠️ WARNING',
                message: 'API调用成功，但没有设备数据',
                details: {
                    issue: 'OpManager中没有设备，或者API调用失败'
                }
            });
        }
    } catch (error: any) {
        results.push({
            step: 'OpManager API测试',
            status: '❌ FAIL',
            message: 'OpManager API调用失败',
            details: {
                error: error.message,
                stack: error.stack?.substring(0, 200),
                issue: '检查网络连接、API Key、Base URL配置'
            }
        });
    }
}

async function checkDashboardAPIData() {
    try {
        // 模拟Dashboard API的查询逻辑
        const totalDevices = await prisma.device.count({
            where: { isMonitored: true }
        });
        const onlineDevices = await prisma.device.count({
            where: {
                isMonitored: true,
                status: 'ONLINE'
            }
        });
        const activeAlarms = await prisma.alarm.count({
            where: {
                status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
            }
        });

        const hasData = totalDevices > 0;

        results.push({
            step: 'Dashboard API数据',
            status: hasData ? '✅ PASS' : '❌ FAIL',
            message: `监控设备: ${totalDevices}, 在线设备: ${onlineDevices}, 活动告警: ${activeAlarms}`,
            details: {
                totalDevices,
                onlineDevices,
                activeAlarms,
                issue: !hasData ? '/api/dashboard/overview 将返回零数据，因为isMonitored=true的设备数为0' : undefined
            }
        });
    } catch (error) {
        results.push({
            step: 'Dashboard API数据',
            status: '❌ FAIL',
            message: '查询Dashboard数据失败',
            details: error
        });
    }
}

async function printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Dashboard诊断报告');
    console.log('='.repeat(60) + '\n');

    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.step}: ${result.status}`);
        console.log(`   ${result.message}`);
        if (result.details?.issue) {
            console.log(`   ⚠️  问题: ${result.details.issue}`);
        }
        if (result.details && Object.keys(result.details).length > 1) {
            console.log(`   详情:`, JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   '));
        }
        console.log('');
    });

    console.log('='.repeat(60));
    console.log('📋 总结');
    console.log('='.repeat(60));

    const failures = results.filter(r => r.status === '❌ FAIL');
    const warnings = results.filter(r => r.status === '⚠️ WARNING');

    if (failures.length === 0 && warnings.length === 0) {
        console.log('✅ 所有检查通过！Dashboard应该可以正常显示数据。');
    } else {
        if (failures.length > 0) {
            console.log(`\n❌ 发现 ${failures.length} 个严重问题：`);
            failures.forEach(r => console.log(`   - ${r.step}: ${r.details?.issue || r.message}`));
        }
        if (warnings.length > 0) {
            console.log(`\n⚠️  发现 ${warnings.length} 个警告：`);
            warnings.forEach(r => console.log(`   - ${r.step}: ${r.details?.issue || r.message}`));
        }
        console.log('\n请参考 DATA-FLOW-ANALYSIS.md 了解详细的解决方案。');
    }
}

async function main() {
    console.log('🔍 开始诊断...\n');

    await checkDatabaseConnection();
    await checkDeviceStatus();
    await checkDeviceMetrics();
    await checkOpManagerConfig();
    await checkOpManagerAPI();
    await checkDashboardAPIData();

    await printResults();

    await prisma.$disconnect();
}

main().catch(console.error);
