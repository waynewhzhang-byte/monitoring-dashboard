/**
 * Redis 连接和性能诊断脚本
 * 检查 Redis 连接状态、延迟、内存使用等
 */

import { redis, checkRedisHealth, getRedisStats, isRedisConnected } from '../src/lib/redis';

async function checkRedis() {
    console.log('🔍 Redis 诊断工具\n');
    console.log('═'.repeat(80));

    // 1. 连接状态
    console.log('\n📡 连接状态');
    console.log('─'.repeat(80));
    const isConnected = isRedisConnected();
    console.log(`状态: ${isConnected ? '✅ 已连接' : '❌ 未连接'}`);
    console.log(`Redis 实例状态: ${redis.status}`);

    if (!isConnected) {
        console.log('\n⚠️  Redis 未连接，请检查:');
        console.log('   1. Redis 服务是否启动');
        console.log('   2. REDIS_URL 配置是否正确');
        console.log('   3. 网络连接是否正常');
        console.log('\n启动 Redis:');
        console.log('   Windows: docker run -d -p 6379:6379 redis:alpine');
        console.log('   Linux:   sudo systemctl start redis');
        process.exit(1);
    }

    // 2. 健康检查
    console.log('\n❤️  健康检查');
    console.log('─'.repeat(80));
    const health = await checkRedisHealth();

    if (health.available) {
        console.log(`✅ Redis 可用`);
        console.log(`版本信息: ${health.info}`);
        console.log(`延迟: ${health.latency}ms`);

        if (health.latency && health.latency > 100) {
            console.log(`⚠️  延迟较高 (>${health.latency}ms)，可能影响性能`);
        }
    } else {
        console.log(`❌ Redis 不可用`);
        console.log(`错误: ${health.error}`);
        process.exit(1);
    }

    // 3. 统计信息
    console.log('\n📊 统计信息');
    console.log('─'.repeat(80));
    const stats = await getRedisStats();

    if (stats.connected) {
        console.log(`总键数: ${stats.keys}`);
        console.log(`内存使用: ${stats.memory}`);
        console.log(`连接客户端数: ${stats.clients}`);
    }

    // 4. 性能测试
    console.log('\n⚡ 性能测试');
    console.log('─'.repeat(80));

    const testCount = 100;
    const testData = { test: 'performance', timestamp: Date.now() };

    // 写入测试
    const writeStart = Date.now();
    for (let i = 0; i < testCount; i++) {
        await redis.set(`perf:test:${i}`, JSON.stringify(testData), 'EX', 60);
    }
    const writeTime = Date.now() - writeStart;
    const writeOpsPerSec = Math.round((testCount / writeTime) * 1000);

    console.log(`写入测试: ${testCount} 次写入耗时 ${writeTime}ms (${writeOpsPerSec} ops/s)`);

    // 读取测试
    const readStart = Date.now();
    for (let i = 0; i < testCount; i++) {
        await redis.get(`perf:test:${i}`);
    }
    const readTime = Date.now() - readStart;
    const readOpsPerSec = Math.round((testCount / readTime) * 1000);

    console.log(`读取测试: ${testCount} 次读取耗时 ${readTime}ms (${readOpsPerSec} ops/s)`);

    // 清理测试数据
    const keys = await redis.keys('perf:test:*');
    if (keys.length > 0) {
        await redis.del(...keys);
    }

    // 5. 缓存键统计
    console.log('\n🔑 缓存键分布');
    console.log('─'.repeat(80));

    const prefixes = ['dashboard', 'analytics', 'device', 'alarm', 'topology', 'metrics'];

    for (const prefix of prefixes) {
        const prefixKeys = await redis.keys(`${prefix}:*`);
        console.log(`${prefix.padEnd(15)}: ${prefixKeys.length} 个键`);
    }

    // 6. 内存分析
    console.log('\n💾 内存详情');
    console.log('─'.repeat(80));
    const memoryInfo = await redis.info('memory');

    const memoryStats = {
        'used_memory_human': '已用内存',
        'used_memory_peak_human': '峰值内存',
        'used_memory_rss_human': 'RSS内存',
        'mem_fragmentation_ratio': '碎片率',
    };

    for (const [key, label] of Object.entries(memoryStats)) {
        const match = memoryInfo.match(new RegExp(`${key}:([^\\r\\n]+)`));
        if (match) {
            console.log(`${label.padEnd(15)}: ${match[1]}`);
        }
    }

    // 7. 配置建议
    console.log('\n💡 配置建议');
    console.log('─'.repeat(80));

    const keyCount = stats.keys || 0;
    if (keyCount > 10000) {
        console.log('⚠️  键数量较多，建议:');
        console.log('   - 设置合理的 TTL 避免键堆积');
        console.log('   - 定期清理过期数据');
    }

    if (health.latency && health.latency > 50) {
        console.log('⚠️  延迟较高，建议:');
        console.log('   - 检查网络连接');
        console.log('   - 考虑使用本地 Redis 实例');
        console.log('   - 启用 Redis 持久化可能影响性能');
    }

    if (writeOpsPerSec < 1000 || readOpsPerSec < 1000) {
        console.log('⚠️  性能较低，建议:');
        console.log('   - 检查 Redis 配置（maxmemory, maxclients）');
        console.log('   - 考虑升级 Redis 版本');
        console.log('   - 检查系统资源（CPU、内存）');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Redis 诊断完成\n');

    process.exit(0);
}

// 执行诊断
checkRedis().catch((error) => {
    console.error('❌ 诊断失败:', error);
    process.exit(1);
});
