/**
 * Redis 独立诊断脚本（不依赖env.ts）
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// 解析 Redis URL
const redisHost = REDIS_URL.replace('redis://', '').split(':')[0] || 'localhost';
const redisPort = parseInt(REDIS_URL.split(':')[2] || '6379');

console.log('🔍 Redis 诊断工具\n');
console.log('═'.repeat(80));
console.log(`\n📡 连接信息`);
console.log('─'.repeat(80));
console.log(`地址: ${redisHost}:${redisPort}`);
console.log(`密码: ${REDIS_PASSWORD ? '******' : '(无)'}\n`);

const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: REDIS_PASSWORD,
    connectTimeout: 5000,
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
    },
});

async function checkRedis() {
    try {
        // 1. 连接测试
        console.log('💫 连接测试');
        console.log('─'.repeat(80));
        const pingStart = Date.now();
        const pong = await redis.ping();
        const pingLatency = Date.now() - pingStart;

        if (pong === 'PONG') {
            console.log(`✅ Redis 连接成功`);
            console.log(`延迟: ${pingLatency}ms\n`);
        }

        // 2. 版本信息
        console.log('📋 版本信息');
        console.log('─'.repeat(80));
        const serverInfo = await redis.info('server');
        const versionMatch = serverInfo.match(/redis_version:([^\r\n]+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        console.log(`Redis 版本: ${version}\n`);

        // 3. 内存信息
        console.log('💾 内存信息');
        console.log('─'.repeat(80));
        const memInfo = await redis.info('memory');
        const usedMemMatch = memInfo.match(/used_memory_human:([^\r\n]+)/);
        const peakMemMatch = memInfo.match(/used_memory_peak_human:([^\r\n]+)/);
        const fragMatch = memInfo.match(/mem_fragmentation_ratio:([^\r\n]+)/);

        console.log(`已用内存: ${usedMemMatch ? usedMemMatch[1] : 'N/A'}`);
        console.log(`峰值内存: ${peakMemMatch ? peakMemMatch[1] : 'N/A'}`);
        console.log(`碎片率: ${fragMatch ? fragMatch[1] : 'N/A'}\n`);

        // 4. 统计信息
        console.log('📊 统计信息');
        console.log('─'.repeat(80));
        const dbsize = await redis.dbsize();
        const clientsInfo = await redis.info('clients');
        const clientsMatch = clientsInfo.match(/connected_clients:([^\r\n]+)/);

        console.log(`总键数: ${dbsize}`);
        console.log(`连接客户端: ${clientsMatch ? clientsMatch[1] : 'N/A'}\n`);

        // 5. 性能测试
        console.log('⚡ 性能测试 (100次操作)');
        console.log('─'.repeat(80));

        const testCount = 100;
        const testData = { test: 'performance', timestamp: Date.now() };

        // 写入测试
        const writeStart = Date.now();
        for (let i = 0; i < testCount; i++) {
            await redis.set(`perf:test:${i}`, JSON.stringify(testData), 'EX', 60);
        }
        const writeTime = Date.now() - writeStart;
        const writeOps = Math.round((testCount / writeTime) * 1000);

        console.log(`写入: ${testCount} 次 / ${writeTime}ms = ${writeOps} ops/s`);

        // 读取测试
        const readStart = Date.now();
        for (let i = 0; i < testCount; i++) {
            await redis.get(`perf:test:${i}`);
        }
        const readTime = Date.now() - readStart;
        const readOps = Math.round((testCount / readTime) * 1000);

        console.log(`读取: ${testCount} 次 / ${readTime}ms = ${readOps} ops/s\n`);

        // 清理测试数据
        const keys = await redis.keys('perf:test:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }

        // 6. 缓存键分布
        console.log('🔑 缓存键分布');
        console.log('─'.repeat(80));
        const prefixes = ['dashboard', 'analytics', 'device', 'alarm', 'topology', 'metrics'];

        for (const prefix of prefixes) {
            const prefixKeys = await redis.keys(`${prefix}:*`);
            console.log(`${prefix.padEnd(15)}: ${prefixKeys.length} 个键`);
        }

        // 7. 健康评估
        console.log('\n💡 健康评估');
        console.log('─'.repeat(80));

        const issues = [];

        if (pingLatency > 50) {
            issues.push(`⚠️  延迟较高 (${pingLatency}ms)，建议使用本地 Redis`);
        }

        if (dbsize > 10000) {
            issues.push(`⚠️  键数量较多 (${dbsize})，建议设置合理的 TTL`);
        }

        if (writeOps < 1000 || readOps < 1000) {
            issues.push(`⚠️  性能较低，检查 Redis 配置和系统资源`);
        }

        if (issues.length === 0) {
            console.log('✅ Redis 运行正常，无明显问题');
        } else {
            issues.forEach(issue => console.log(issue));
        }

        console.log('\n' + '═'.repeat(80));
        console.log('✅ Redis 诊断完成\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Redis 连接失败:', error instanceof Error ? error.message : error);
        console.log('\n💡 排查建议:');
        console.log('   1. 检查 Redis 是否运行');
        console.log('      docker ps | grep redis');
        console.log('      systemctl status redis');
        console.log('\n   2. 启动 Redis');
        console.log('      docker run -d --name redis -p 6379:6379 redis:alpine');
        console.log('\n   3. 检查配置');
        console.log('      REDIS_URL=' + REDIS_URL);
        console.log('      REDIS_PASSWORD=' + (REDIS_PASSWORD ? '******' : '(无)'));
        console.log('\n   4. 测试连接');
        console.log('      redis-cli ping');
        console.log('');
        process.exit(1);
    } finally {
        await redis.quit();
    }
}

checkRedis();
