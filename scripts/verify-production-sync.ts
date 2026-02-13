#!/usr/bin/env ts-node
/**
 * 生产环境数据同步验证脚本
 * 用于验证 OpManager 数据是否成功同步到监控系统数据库
 * 
 * 使用方法:
 *   npm run verify:production
 *   或直接运行: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-production-sync.ts
 */

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';

interface VerificationResult {
    category: string;
    status: 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
    details?: any;
}

const results: VerificationResult[] = [];

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function printHeader(text: string) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${text}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printResult(result: VerificationResult) {
    const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    const color = result.status === 'SUCCESS' ? colors.green : result.status === 'WARNING' ? colors.yellow : colors.red;

    console.log(`${icon} ${color}[${result.category}]${colors.reset} ${result.message}`);
    if (result.details) {
        console.log(`   ${colors.blue}详情:${colors.reset}`, JSON.stringify(result.details, null, 2));
    }
}

// 1. 检查环境配置
async function checkEnvironment() {
    printHeader('1. 环境配置检查');

    const requiredEnvVars = [
        'DATABASE_URL',
        'OPMANAGER_BASE_URL',
        'OPMANAGER_API_KEY',
    ];

    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            results.push({
                category: '环境变量',
                status: 'SUCCESS',
                message: `${envVar} 已配置`,
                details: envVar === 'OPMANAGER_API_KEY'
                    ? `${process.env[envVar]?.substring(0, 10)}...`
                    : process.env[envVar]
            });
        } else {
            results.push({
                category: '环境变量',
                status: 'ERROR',
                message: `${envVar} 未配置`,
            });
        }
    }
}

// 2. 测试 OpManager API 连接
async function testOpManagerConnection() {
    printHeader('2. OpManager API 连接测试');

    try {
        // 测试获取设备列表
        const devices = await opClient.getDevices();

        if (devices && devices.length > 0) {
            results.push({
                category: 'OpManager API',
                status: 'SUCCESS',
                message: `成功连接 OpManager API`,
                details: {
                    deviceCount: devices.length,
                    sampleDevice: devices[0]?.name || 'N/A'
                }
            });
        } else {
            results.push({
                category: 'OpManager API',
                status: 'WARNING',
                message: 'OpManager API 连接成功但未返回设备数据',
            });
        }
    } catch (error: any) {
        results.push({
            category: 'OpManager API',
            status: 'ERROR',
            message: `OpManager API 连接失败: ${error.message}`,
            details: {
                baseUrl: process.env.OPMANAGER_BASE_URL,
                error: error.toString()
            }
        });
    }
}

// 3. 检查数据库连接和数据
async function checkDatabase() {
    printHeader('3. 数据库连接和数据检查');

    try {
        // 测试数据库连接
        await prisma.$connect();
        results.push({
            category: '数据库',
            status: 'SUCCESS',
            message: '数据库连接成功',
        });

        // 检查设备数据
        const deviceCount = await prisma.device.count();
        const monitoredDeviceCount = await prisma.device.count({
            where: { isMonitored: true }
        });

        if (deviceCount > 0) {
            results.push({
                category: '设备数据',
                status: 'SUCCESS',
                message: `数据库中有 ${deviceCount} 台设备 (${monitoredDeviceCount} 台被监控)`,
                details: { total: deviceCount, monitored: monitoredDeviceCount }
            });
        } else {
            results.push({
                category: '设备数据',
                status: 'WARNING',
                message: '数据库中没有设备数据,可能尚未同步',
            });
        }

        // 检查接口数据
        const interfaceCount = await prisma.interface.count();
        const monitoredInterfaceCount = await prisma.interface.count({
            where: { isMonitored: true }
        });

        if (interfaceCount > 0) {
            results.push({
                category: '接口数据',
                status: 'SUCCESS',
                message: `数据库中有 ${interfaceCount} 个接口 (${monitoredInterfaceCount} 个被监控)`,
                details: { total: interfaceCount, monitored: monitoredInterfaceCount }
            });
        } else {
            results.push({
                category: '接口数据',
                status: 'WARNING',
                message: '数据库中没有接口数据',
            });
        }

        // 检查告警数据
        const alarmCount = await prisma.alarm.count();
        const recentAlarms = await prisma.alarm.count({
            where: {
                occurredAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
                }
            }
        });

        results.push({
            category: '告警数据',
            status: alarmCount > 0 ? 'SUCCESS' : 'WARNING',
            message: `数据库中有 ${alarmCount} 条告警 (最近24小时: ${recentAlarms} 条)`,
            details: { total: alarmCount, recent24h: recentAlarms }
        });

        // 检查指标数据
        const metricCount = await prisma.deviceMetric.count();
        const recentMetrics = await prisma.deviceMetric.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 10 * 60 * 1000) // 最近10分钟
                }
            }
        });

        if (recentMetrics > 0) {
            results.push({
                category: '性能指标',
                status: 'SUCCESS',
                message: `数据库中有 ${metricCount} 条指标记录 (最近10分钟: ${recentMetrics} 条)`,
                details: { total: metricCount, recent10min: recentMetrics }
            });
        } else if (metricCount > 0) {
            results.push({
                category: '性能指标',
                status: 'WARNING',
                message: `数据库中有历史指标数据,但最近10分钟没有新数据`,
                details: { total: metricCount, recent10min: 0 }
            });
        } else {
            results.push({
                category: '性能指标',
                status: 'WARNING',
                message: '数据库中没有性能指标数据',
            });
        }

        // 检查拓扑数据
        const topologyNodeCount = await prisma.topologyNode.count();
        const topologyEdgeCount = await prisma.topologyEdge.count();

        if (topologyNodeCount > 0 || topologyEdgeCount > 0) {
            results.push({
                category: '拓扑数据',
                status: 'SUCCESS',
                message: `拓扑数据: ${topologyNodeCount} 个节点, ${topologyEdgeCount} 条边`,
                details: { nodes: topologyNodeCount, edges: topologyEdgeCount }
            });
        } else {
            results.push({
                category: '拓扑数据',
                status: 'WARNING',
                message: '数据库中没有拓扑数据',
            });
        }

        // 检查 Business View 配置
        const bvCount = await prisma.businessViewConfig.count();
        const activeBvCount = await prisma.businessViewConfig.count({
            where: { isActive: true }
        });

        if (activeBvCount > 0) {
            const activeViews = await prisma.businessViewConfig.findMany({
                where: { isActive: true },
                select: { name: true }
            });
            results.push({
                category: 'Business View',
                status: 'SUCCESS',
                message: `配置了 ${bvCount} 个 Business View (${activeBvCount} 个激活)`,
                details: {
                    total: bvCount,
                    active: activeBvCount,
                    activeViews: activeViews.map(v => v.name)
                }
            });
        } else {
            results.push({
                category: 'Business View',
                status: 'WARNING',
                message: '没有激活的 Business View 配置',
            });
        }

    } catch (error: any) {
        results.push({
            category: '数据库',
            status: 'ERROR',
            message: `数据库连接失败: ${error.message}`,
        });
    }
}

// 4. 检查数据时效性
async function checkDataFreshness() {
    printHeader('4. 数据时效性检查');

    try {
        // 检查最新的设备指标时间
        const latestMetric = await prisma.deviceMetric.findFirst({
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });

        if (latestMetric) {
            const ageMinutes = Math.floor((Date.now() - latestMetric.timestamp.getTime()) / 60000);
            const status = ageMinutes < 5 ? 'SUCCESS' : ageMinutes < 15 ? 'WARNING' : 'ERROR';
            results.push({
                category: '数据时效性',
                status,
                message: `最新性能指标采集于 ${ageMinutes} 分钟前`,
                details: {
                    timestamp: latestMetric.timestamp.toISOString(),
                    ageMinutes
                }
            });
        }

        // 检查最新的告警时间
        const latestAlarm = await prisma.alarm.findFirst({
            orderBy: { occurredAt: 'desc' },
            select: { occurredAt: true }
        });

        if (latestAlarm) {
            const ageMinutes = Math.floor((Date.now() - latestAlarm.occurredAt.getTime()) / 60000);
            results.push({
                category: '告警时效性',
                status: 'SUCCESS',
                message: `最新告警记录于 ${ageMinutes} 分钟前`,
                details: {
                    timestamp: latestAlarm.occurredAt.toISOString(),
                    ageMinutes
                }
            });
        }

    } catch (error: any) {
        results.push({
            category: '数据时效性',
            status: 'ERROR',
            message: `时效性检查失败: ${error.message}`,
        });
    }
}

// 5. 生成总结报告
function printSummary() {
    printHeader('验证总结');

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;

    console.log(`${colors.green}✅ 成功: ${successCount}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  警告: ${warningCount}${colors.reset}`);
    console.log(`${colors.red}❌ 错误: ${errorCount}${colors.reset}`);

    console.log('\n详细结果:\n');
    results.forEach(printResult);

    console.log('\n');

    if (errorCount > 0) {
        console.log(`${colors.red}❌ 验证失败: 发现 ${errorCount} 个错误${colors.reset}`);
        console.log(`${colors.yellow}请检查上述错误信息并修复配置${colors.reset}\n`);
        process.exit(1);
    } else if (warningCount > 0) {
        console.log(`${colors.yellow}⚠️  验证通过但有警告: 发现 ${warningCount} 个警告${colors.reset}`);
        console.log(`${colors.yellow}建议检查警告信息以确保系统正常运行${colors.reset}\n`);
    } else {
        console.log(`${colors.green}✅ 验证完全通过! 系统运行正常${colors.reset}\n`);
    }
}

// 主函数
async function main() {
    console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║     生产环境数据同步验证工具                              ║
║     Production Data Sync Verification Tool                ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
        await checkEnvironment();
        await testOpManagerConnection();
        await checkDatabase();
        await checkDataFreshness();

        printSummary();

    } catch (error) {
        console.error(`${colors.red}验证过程中发生错误:${colors.reset}`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
