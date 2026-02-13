/**
 * 带锁机制的业务视图同步脚本
 * 防止并发同步导致重复入库
 */

// 加载环境变量
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { topologyCollector } from '../src/services/collector/topology';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const LOCK_KEY_PREFIX = 'bv-sync-lock:';
const LOCK_TTL = 60; // 锁过期时间：60秒

async function syncWithLock(bvName: string) {
  const lockKey = `${LOCK_KEY_PREFIX}${bvName}`;

  console.log('='.repeat(80));
  console.log(`🔒 尝试获取同步锁: ${bvName}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 尝试获取锁（NX：仅在键不存在时设置，EX：过期时间）
    const lockAcquired = await redis.set(lockKey, Date.now().toString(), 'EX', LOCK_TTL, 'NX');

    if (!lockAcquired) {
      console.log('⚠️  另一个同步进程正在运行，跳过本次同步');
      const lockValue = await redis.get(lockKey);
      if (lockValue) {
        const lockTime = new Date(parseInt(lockValue));
        console.log(`   锁创建时间: ${lockTime.toLocaleString()}`);
      }
      return;
    }

    console.log('✅ 成功获取同步锁，开始同步...');
    console.log('');

    // 执行同步
    const startTime = Date.now();
    const result = await topologyCollector.syncBusinessView(bvName);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ 同步完成');
    console.log('='.repeat(80));
    console.log(`   业务视图: ${bvName}`);
    console.log(`   节点数量: ${result.nodes}`);
    console.log(`   边数量: ${result.edges}`);
    console.log(`   耗时: ${duration} 秒`);
    console.log('');

    // 验证结果
    const dbNodes = await prisma.topologyNode.count({ where: { viewName: bvName } });
    const dbEdges = await prisma.topologyEdge.count({ where: { viewName: bvName } });

    console.log('📊 数据库验证:');
    console.log(`   节点: ${dbNodes} 个`);
    console.log(`   边: ${dbEdges} 个`);

    if (dbNodes === result.nodes && dbEdges === result.edges) {
      console.log('   ✅ 数据一致');
    } else {
      console.log('   ⚠️  数据不一致，可能需要重新同步');
    }

  } catch (error) {
    console.error('❌ 同步失败:', error);
    throw error;
  } finally {
    // 释放锁
    await redis.del(lockKey);
    console.log('');
    console.log('🔓 已释放同步锁');

    // 清理连接
    await prisma.$disconnect();
    await redis.quit();
  }
}

// 从命令行参数获取业务视图名称
const bvName = process.argv[2] || 'TEST2';

syncWithLock(bvName).catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
