/**
 * 快速检查脚本 - 验证 Redis 和 OpManager
 * 轻量级版本，用于快速诊断
 *
 * 使用方法 (ts-node，生产环境适用):
 *   npm run diagnose:redis-opmanager:quick
 *   或
 *   ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/quick-check-redis-opmanager.ts
 */

// CRITICAL: 在导入依赖 env 的模块之前加载 .env
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { redis } from '../src/lib/redis';
import { opClient } from '../src/services/opmanager/client';
import { prisma } from '../src/lib/prisma';

async function quickCheck() {
    console.log('\n🔍 快速诊断检查...\n');
    let redisOk = false;

    // 1. Redis 连接
    try {
        await redis.ping();
        console.log('✅ Redis 连接正常');
        redisOk = true;

        // 检查是否有 Pub/Sub 消息
        let messageReceived = false;
        const testChannel = 'quick-check:test';
        const sub = redis.duplicate();
        await sub.subscribe(testChannel);

        sub.on('message', () => {
            messageReceived = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
        await redis.publish(testChannel, JSON.stringify({ test: true }));
        await new Promise((resolve) => setTimeout(resolve, 1000));

        sub.disconnect();

        if (messageReceived) {
            console.log('✅ Redis Pub/Sub 功能正常');
        } else {
            console.log('⚠️  Redis Pub/Sub 测试未收到消息（可能是延迟）');
        }
    } catch (error: any) {
        console.log('❌ Redis 连接失败:', error.message);
    }

    // 2. OpManager API
    try {
        const startTime = Date.now();
        const devices = await opClient.getDevices({ page: 1, rows: 3 });
        const duration = Date.now() - startTime;
        
        if (devices && devices.length > 0) {
            console.log(`✅ OpManager API 正常 (${devices.length} 个设备, 耗时: ${duration}ms)`);
        } else {
            console.log('⚠️  OpManager API 返回空数据');
        }
    } catch (error: any) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            console.log(`❌ OpManager API 超时或连接失败 (${error.config?.timeout ?? '?'}ms)`);
        } else {
            console.log('❌ OpManager API 失败:', error.message);
        }
    }
    
    // 3. 数据库
    try {
        const deviceCount = await prisma.device.count();
        const metricCount = await prisma.deviceMetric.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
                }
            }
        });
        
        console.log(`✅ 数据库连接正常 (设备: ${deviceCount}, 最近5分钟指标: ${metricCount})`);
    } catch (error: any) {
        console.log('❌ 数据库连接失败:', error.message);
    }
    
    // 4. 监听 Redis Pub/Sub 10秒（仅当 Redis 正常时）
    if (redisOk) {
        console.log('\n📡 监听 Redis Pub/Sub 消息 (10秒)...');
        console.log('   如果 Collector 正在运行，应该能看到实时推送\n');

        let messageCount = 0;
        const subEvents = redis.duplicate();
        await subEvents.subscribe('events');

        subEvents.on('message', (channel: string, message: string) => {
            if (channel === 'events') {
                messageCount++;
                try {
                    const data = JSON.parse(message);
                    console.log(`[${new Date().toLocaleTimeString()}] 收到消息 #${messageCount}:`);
                    console.log(`   房间: ${data.room}`);
                    console.log(`   事件: ${data.event}`);
                } catch (e) {
                    console.log(`   原始消息: ${message.substring(0, 100)}...`);
                }
            }
        });

        await new Promise((resolve) => setTimeout(resolve, 10000));
        subEvents.disconnect();

        if (messageCount > 0) {
            console.log(`\n✅ 在10秒内收到 ${messageCount} 条消息`);
        } else {
            console.log('\n⚠️  10秒内未收到任何消息');
            console.log('   可能原因:');
            console.log('   - Collector 未运行 (检查: pm2 status)');
            console.log('   - Collector 未采集到新数据');
            console.log('   - 查看日志: pm2 logs monitoring-collector');
        }
    }

    // 清理
    try {
        await prisma.$disconnect();
    } catch (e) {
        // ignore
    }
    try {
        if (redisOk) await redis.quit();
    } catch (e) {
        // ignore
    }

    console.log('\n✅ 检查完成\n');
}

quickCheck()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
