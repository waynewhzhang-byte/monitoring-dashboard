/**
 * 生产环境诊断脚本
 * 验证 Redis Pub/Sub 推送和 OpManager API 数据获取
 *
 * 使用方法 (ts-node，生产环境适用):
 *   npm run diagnose:redis-opmanager
 *   或
 *   ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-redis-opmanager.ts
 */

// CRITICAL: 在导入依赖 env 的模块之前加载 .env
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { redis, subscribe, publish } from '../src/lib/redis';
import { opClient } from '../src/services/opmanager/client';
import { prisma } from '../src/lib/prisma';
import { broadcaster, BroadcastEvent } from '../src/services/broadcast';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
    console.log('\n' + '='.repeat(60));
    log(title, 'bright');
    console.log('='.repeat(60) + '\n');
}

// 诊断结果
interface DiagnosticResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    details?: any;
}

const results: DiagnosticResult[] = [];

function addResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    results.push({ name, status, message, details });
    const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    log(`[${status}] ${name}: ${message}`, color);
    if (details) {
        console.log('   Details:', JSON.stringify(details, null, 2));
    }
}

async function testRedisConnection(): Promise<boolean> {
    try {
        logSection('1. Redis 连接测试');
        
        // 测试基本连接
        const testKey = 'diagnostic:test';
        await redis.set(testKey, 'test-value', 'EX', 10);
        const value = await redis.get(testKey);
        
        if (value === 'test-value') {
            addResult('Redis 连接', 'PASS', 'Redis 连接正常');
            
            // 获取 Redis 信息
            const info = await redis.info('server');
            const versionMatch = info.match(/redis_version:([\d.]+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';
            addResult('Redis 版本', 'PASS', `Redis 版本: ${version}`);
            
            // 测试 Pub/Sub 功能
            let pubSubReceived = false;
            const testChannel = 'diagnostic:test-channel';
            const subscriber = subscribe(testChannel, (message) => {
                pubSubReceived = true;
                log(`   收到测试消息: ${JSON.stringify(message)}`, 'cyan');
            });
            
            // 等待订阅建立
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 发布测试消息
            await publish(testChannel, { test: 'message', timestamp: Date.now() });
            
            // 等待消息接收
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (subscriber) {
                subscriber.disconnect();
            }

            if (pubSubReceived) {
                addResult('Redis Pub/Sub', 'PASS', 'Pub/Sub 功能正常');
            } else {
                addResult('Redis Pub/Sub', 'WARN', 'Pub/Sub 测试消息未收到（可能是延迟）');
            }
            
            return true;
        } else {
            addResult('Redis 连接', 'FAIL', 'Redis 连接异常，无法读写数据');
            return false;
        }
    } catch (error: any) {
        addResult('Redis 连接', 'FAIL', `Redis 连接失败: ${error.message}`, error);
        return false;
    }
}

async function testOpManagerAPI(): Promise<boolean> {
    try {
        logSection('2. OpManager API 测试');
        
        // 测试获取设备列表
        log('测试获取设备列表...', 'cyan');
        const startTime = Date.now();
        const devices = await opClient.getDevices({ page: 1, rows: 5 });
        const duration = Date.now() - startTime;
        
        if (devices && devices.length > 0) {
            addResult('OpManager API - 获取设备', 'PASS', 
                `成功获取 ${devices.length} 个设备 (耗时: ${duration}ms)`,
                { 
                    sampleDevices: devices.slice(0, 3).map(d => ({
                        name: d.name,
                        ipAddress: d.ipAddress,
                        status: d.status
                    }))
                }
            );
            
            // 测试获取第一个设备的详情
            if (devices.length > 0) {
                const testDevice = devices[0];
                log(`测试获取设备详情: ${testDevice.name}...`, 'cyan');
                
                try {
                    const deviceSummaryStart = Date.now();
                    const summary = await opClient.getDeviceSummary(testDevice.name);
                    const deviceSummaryDuration = Date.now() - deviceSummaryStart;
                    
                    if (summary) {
                        addResult('OpManager API - 获取设备详情', 'PASS',
                            `成功获取设备详情 (耗时: ${deviceSummaryDuration}ms)`,
                            {
                                hasDials: !!summary.dials,
                                dialsCount: summary.dials?.length || 0,
                                hasCpu: !!summary.cpuUtilization || !!summary.cpu,
                                hasMemory: !!summary.memoryUtilization || !!summary.mem
                            }
                        );
                    } else {
                        addResult('OpManager API - 获取设备详情', 'WARN',
                            '设备详情为空（可能是设备未监控）');
                    }
                } catch (error: any) {
                    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                        addResult('OpManager API - 获取设备详情', 'FAIL',
                            `请求超时 (${error.config?.timeout}ms)`, error);
                    } else {
                        addResult('OpManager API - 获取设备详情', 'FAIL',
                            `获取失败: ${error.message}`, error);
                    }
                }
            }
            
            // 测试获取告警
            log('测试获取告警列表...', 'cyan');
            try {
                const alarmsStart = Date.now();
                const alarms = await opClient.getAlarms();
                const alarmsDuration = Date.now() - alarmsStart;
                
                addResult('OpManager API - 获取告警', 'PASS',
                    `成功获取 ${alarms.length} 个告警 (耗时: ${alarmsDuration}ms)`);
            } catch (error: any) {
                if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                    addResult('OpManager API - 获取告警', 'FAIL',
                        `请求超时 (${error.config?.timeout}ms)`, error);
                } else {
                    addResult('OpManager API - 获取告警', 'FAIL',
                        `获取失败: ${error.message}`, error);
                }
            }
            
            return true;
        } else {
            addResult('OpManager API - 获取设备', 'WARN', '设备列表为空');
            return false;
        }
    } catch (error: any) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            addResult('OpManager API', 'FAIL', 
                `API 请求超时 (超时设置: ${error.config?.timeout}ms)`, error);
        } else {
            addResult('OpManager API', 'FAIL', `API 调用失败: ${error.message}`, error);
        }
        return false;
    }
}

async function testDatabaseConnection(): Promise<boolean> {
    try {
        logSection('3. PostgreSQL 数据库测试');
        
        // 测试数据库连接
        const deviceCount = await prisma.device.count();
        addResult('数据库连接', 'PASS', `数据库连接正常，共有 ${deviceCount} 个设备`);
        
        // 检查最近的指标数据
        const recentMetrics = await prisma.deviceMetric.findMany({
            orderBy: { timestamp: 'desc' },
            take: 5,
            include: { device: { select: { name: true } } }
        });
        
        if (recentMetrics.length > 0) {
            const latestMetric = recentMetrics[0];
            const timeDiff = Date.now() - latestMetric.timestamp.getTime();
            const minutesAgo = Math.floor(timeDiff / 60000);
            
            addResult('数据库 - 指标数据', 'PASS',
                `最新指标数据: ${minutesAgo} 分钟前`,
                {
                    deviceName: latestMetric.device.name,
                    timestamp: latestMetric.timestamp.toISOString(),
                    cpuUsage: latestMetric.cpuUsage,
                    memoryUsage: latestMetric.memoryUsage
                }
            );
        } else {
            addResult('数据库 - 指标数据', 'WARN', '数据库中没有指标数据');
        }
        
        // 检查最近的告警数据
        const recentAlarms = await prisma.alarm.findMany({
            orderBy: { occurredAt: 'desc' },
            take: 5,
            include: { device: { select: { name: true } } }
        });
        
        if (recentAlarms.length > 0) {
            const latestAlarm = recentAlarms[0];
            const timeDiff = Date.now() - latestAlarm.occurredAt.getTime();
            const minutesAgo = Math.floor(timeDiff / 60000);
            
            addResult('数据库 - 告警数据', 'PASS',
                `最新告警: ${minutesAgo} 分钟前`,
                {
                    deviceName: latestAlarm.device.name,
                    severity: latestAlarm.severity,
                    status: latestAlarm.status,
                    occurredAt: latestAlarm.occurredAt.toISOString()
                }
            );
        } else {
            addResult('数据库 - 告警数据', 'WARN', '数据库中没有告警数据');
        }
        
        return true;
    } catch (error: any) {
        addResult('数据库连接', 'FAIL', `数据库连接失败: ${error.message}`, error);
        return false;
    }
}

async function testRedisPubSubMonitoring(): Promise<void> {
    logSection('4. Redis Pub/Sub 实时监控测试');
    
    log('开始监听 Redis Pub/Sub 消息（监听30秒）...', 'cyan');
    log('如果 Collector 正在运行，应该能看到实时推送的消息\n', 'yellow');
    
    let messageCount = 0;
    const messages: any[] = [];
    const startTime = Date.now();
    const monitorDuration = 30000; // 30秒
    
    // 订阅 events 频道（Collector 推送的频道）
    const subscriber = subscribe('events', (message) => {
        messageCount++;
        const timestamp = new Date().toISOString();
        messages.push({ ...message, receivedAt: timestamp });
        
        log(`\n[${timestamp}] 收到消息 #${messageCount}:`, 'green');
        console.log('   Room:', message.room);
        console.log('   Event:', message.event);
        console.log('   Data:', JSON.stringify(message.data, null, 2).substring(0, 200) + '...');
    });
    
    // 等待指定时间
    await new Promise(resolve => setTimeout(resolve, monitorDuration));

    if (subscriber) {
        subscriber.disconnect();
    }

    const duration = Date.now() - startTime;
    
    if (messageCount > 0) {
        addResult('Redis Pub/Sub 监控', 'PASS',
            `在 ${duration/1000} 秒内收到 ${messageCount} 条消息`,
            {
                messagesPerMinute: Math.round((messageCount / duration) * 60000),
                sampleMessages: messages.slice(0, 3)
            }
        );
    } else {
        addResult('Redis Pub/Sub 监控', 'WARN',
            `在 ${duration/1000} 秒内未收到任何消息`,
            {
                possibleReasons: [
                    'Collector 未运行',
                    'Collector 未采集到新数据',
                    'Redis Pub/Sub 配置问题',
                    '消息推送失败'
                ]
            }
        );
    }
}

async function testBroadcasterPush(): Promise<void> {
    logSection('5. Broadcaster 推送测试');
    
    log('测试手动推送消息到 Redis Pub/Sub...', 'cyan');
    
    try {
        // 测试推送
        await broadcaster.emit('test:room', 'test:event', {
            test: true,
            timestamp: Date.now(),
            message: 'This is a test message from diagnostic script'
        });
        
        addResult('Broadcaster 推送', 'PASS', '消息推送成功（检查 Redis 是否收到）');
        
        // 等待一下，看看是否能收到自己推送的消息
        log('\n等待2秒，检查是否能收到推送的消息...', 'cyan');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error: any) {
        addResult('Broadcaster 推送', 'FAIL', `推送失败: ${error.message}`, error);
    }
}

async function simulateCollectionFlow(): Promise<void> {
    logSection('6. 模拟采集流程测试');
    
    try {
        // 1. 获取一个监控中的设备
        const device = await prisma.device.findFirst({
            where: { isMonitored: true },
            select: { id: true, name: true }
        });
        
        if (!device) {
            addResult('模拟采集流程', 'WARN', '没有找到监控中的设备，跳过测试');
            return;
        }
        
        log(`使用设备进行测试: ${device.name} (ID: ${device.id})`, 'cyan');
        
        // 2. 从 OpManager 获取设备详情
        log('步骤1: 从 OpManager 获取设备详情...', 'cyan');
        const summary = await opClient.getDeviceSummary(device.name);
        
        if (!summary) {
            addResult('模拟采集流程 - 获取数据', 'WARN', 'OpManager 返回空数据');
            return;
        }
        
        addResult('模拟采集流程 - 获取数据', 'PASS', '成功从 OpManager 获取数据');
        
        // 3. 构造指标数据
        let cpu = 0, mem = 0, disk = 0;
        if (summary.dials && Array.isArray(summary.dials)) {
            const cpuDial = summary.dials.find((d: any) => d.displayName?.includes('CPU'));
            const memDial = summary.dials.find((d: any) => d.displayName?.includes('Memory'));
            const diskDial = summary.dials.find((d: any) => d.displayName?.includes('Disk'));
            
            if (cpuDial) cpu = parseFloat(cpuDial.value);
            if (memDial) mem = parseFloat(memDial.value);
            if (diskDial) disk = parseFloat(diskDial.value);
        } else {
            cpu = parseFloat(summary.cpuUtilization || summary.cpu || '0');
            mem = parseFloat(summary.memoryUtilization || summary.mem || '0');
        }
        
        const metricData = {
            deviceId: device.id,
            timestamp: new Date(),
            cpuUsage: isNaN(cpu) ? 0 : cpu,
            memoryUsage: isNaN(mem) ? 0 : mem,
            diskUsage: isNaN(disk) ? 0 : disk,
            responseTime: parseFloat(summary.responseTime || '0'),
            packetLoss: parseFloat(summary.packetLoss || '0'),
        };
        
        log('步骤2: 构造指标数据完成', 'cyan');
        console.log('   指标数据:', JSON.stringify(metricData, null, 2));
        
        // 4. 写入数据库
        log('步骤3: 写入数据库...', 'cyan');
        await prisma.deviceMetric.create({
            data: metricData
        });
        addResult('模拟采集流程 - 写入数据库', 'PASS', '指标数据已写入数据库');
        
        // 5. 推送实时更新
        log('步骤4: 推送实时更新到 Redis Pub/Sub...', 'cyan');
        await broadcaster.emit(`device:${device.id}`, BroadcastEvent.METRICS_UPDATE, {
            deviceId: device.id,
            metrics: metricData
        });
        addResult('模拟采集流程 - 推送更新', 'PASS', '实时更新已推送到 Redis Pub/Sub');
        
        log('\n✅ 完整采集流程测试完成！', 'green');
        log('   数据流: OpManager → 构造数据 → PostgreSQL → Redis Pub/Sub', 'cyan');
        
    } catch (error: any) {
        addResult('模拟采集流程', 'FAIL', `测试失败: ${error.message}`, error);
    }
}

async function generateReport(): Promise<void> {
    logSection('诊断报告总结');
    
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARN').length;
    
    console.log(`总测试项: ${results.length}`);
    log(`通过: ${passCount}`, 'green');
    log(`失败: ${failCount}`, failCount > 0 ? 'red' : 'reset');
    log(`警告: ${warnCount}`, warnCount > 0 ? 'yellow' : 'reset');
    
    console.log('\n详细结果:');
    results.forEach((result, index) => {
        const color = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';
        log(`${index + 1}. [${result.status}] ${result.name}: ${result.message}`, color);
    });
    
    // 生成建议
    console.log('\n' + '='.repeat(60));
    log('建议:', 'bright');
    
    if (failCount > 0) {
        log('⚠️  发现失败项，请检查:', 'yellow');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
    }
    
    if (warnCount > 0) {
        log('⚠️  发现警告项，建议检查:', 'yellow');
        results.filter(r => r.status === 'WARN').forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
    }
    
    // 检查 Redis Pub/Sub 是否有数据
    const pubSubResult = results.find(r => r.name.includes('Pub/Sub 监控'));
    if (pubSubResult && pubSubResult.status === 'WARN') {
        log('\n💡 Redis Pub/Sub 未收到消息的可能原因:', 'cyan');
        console.log('   1. Collector 进程未运行 (检查: pm2 status)');
        console.log('   2. Collector 正在运行但未采集到新数据');
        console.log('   3. Redis Pub/Sub 配置问题');
        console.log('   4. 网络连接问题');
        console.log('\n   建议: 运行 pm2 logs monitoring-collector 查看 Collector 日志');
    }
    
    // 检查 OpManager API 超时
    const apiTimeoutResults = results.filter(r => 
        r.name.includes('OpManager') && r.message.includes('超时')
    );
    if (apiTimeoutResults.length > 0) {
        log('\n💡 OpManager API 超时问题建议:', 'cyan');
        console.log('   1. 检查 OPMANAGER_TIMEOUT 环境变量（建议设置为 60000）');
        console.log('   2. 检查 OpManager 服务器性能和网络延迟');
        console.log('   3. 检查 OpManager API 是否正常响应');
        console.log('   4. 考虑减少并发请求数量');
    }
}

async function main() {
    log('\n' + '='.repeat(60), 'bright');
    log('生产环境诊断脚本', 'bright');
    log('验证 Redis Pub/Sub 推送和 OpManager API 数据获取', 'bright');
    log('='.repeat(60) + '\n', 'bright');
    
    try {
        // 1. Redis 连接测试
        const redisOk = await testRedisConnection();
        
        // 2. OpManager API 测试
        const opManagerOk = await testOpManagerAPI();
        
        // 3. 数据库连接测试
        await testDatabaseConnection();
        
        // 4. Redis Pub/Sub 监控（如果 Redis 正常）
        if (redisOk) {
            await testRedisPubSubMonitoring();
        }
        
        // 5. Broadcaster 推送测试
        if (redisOk) {
            await testBroadcasterPush();
        }
        
        // 6. 模拟完整采集流程
        if (redisOk && opManagerOk) {
            await simulateCollectionFlow();
        }
        
        // 7. 生成报告
        await generateReport();
        
    } catch (error: any) {
        log(`\n❌ 诊断过程发生错误: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        // 清理资源
        try {
            await prisma.$disconnect();
        } catch (e) {
            /* ignore */
        }
        try {
            await redis.quit();
        } catch (e) {
            /* ignore */
        }
    }
}

// 运行诊断
main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
