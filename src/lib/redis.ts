/**
 * Redis 客户端配置（优化版）
 *
 * 功能：
 * 1. 连接池管理和重连策略
 * 2. 优雅降级（Redis 不可用时仍能工作）
 * 3. 缓存工具方法和键命名规范
 * 4. 发布订阅支持
 * 5. 健康检查和监控
 */

import Redis from 'ioredis';
import { env } from './env';

// 全局 Redis 实例
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisAvailable: boolean;
};

// Redis 可用性标志
let isRedisAvailable = true;

// 解析 Redis URL（安全处理各种格式：redis://、rediss://、带用户名密码等）
const parsedRedisUrl = (() => {
  if (!env.REDIS_URL) return null;
  try {
    return new URL(env.REDIS_URL);
  } catch {
    console.error('❌ REDIS_URL 格式无效，使用默认配置');
    return null;
  }
})();

// Redis 客户端配置
const redisConfig = {
  // 基础配置
  host: parsedRedisUrl?.hostname || 'localhost',
  port: parsedRedisUrl?.port ? parseInt(parsedRedisUrl.port) : 6379,
  password: env.REDIS_PASSWORD || parsedRedisUrl?.password || undefined,
  tls: parsedRedisUrl?.protocol === 'rediss:' ? {} : undefined,

  // 连接池配置
  maxRetriesPerRequest: 3,
  connectTimeout: 10000, // 10 秒连接超时
  commandTimeout: 5000, // 5 秒命令超时

  // 重连策略：指数退避，最大 2 秒
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('❌ Redis 连接失败次数过多，停止重连');
      isRedisAvailable = false;
      return null; // 停止重连
    }
    const delay = Math.min(times * 100, 2000);
    console.log(`🔄 Redis 重连中... (第 ${times} 次，延迟 ${delay}ms)`);
    return delay;
  },

  // 错误时重连
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED'];
    const shouldReconnect = targetErrors.some((e) => err.message.includes(e));
    if (shouldReconnect) {
      console.warn(`⚠️  Redis 错误，尝试重连: ${err.message}`);
      return true;
    }
    return false;
  },

  // 连接名称（便于监控）
  connectionName: `monitoring-dashboard-${env.NODE_ENV}`,

  // 启用离线队列（断线时缓存命令）
  enableOfflineQueue: true,

  // 自动流水线（性能优化）
  enableAutoPipelining: true,
};

// 创建 Redis 客户端
export const redis = globalForRedis.redis ?? new Redis(redisConfig);

// 连接事件监听
redis.on('connect', () => {
  console.log('✅ Redis 连接成功');
  isRedisAvailable = true;
});

redis.on('ready', () => {
  console.log('✅ Redis 已就绪');
  isRedisAvailable = true;
});

redis.on('error', (err) => {
  console.error('❌ Redis 错误:', err.message);
  isRedisAvailable = false;
});

redis.on('close', () => {
  console.warn('⚠️  Redis 连接已关闭');
  isRedisAvailable = false;
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis 重连中...');
});

// 开发环境下复用实例
if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// ==================== 缓存键命名规范 ====================
/**
 * 缓存键前缀，便于管理和清理
 */
export const CachePrefix = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  DEVICE: 'device',
  ALARM: 'alarm',
  TOPOLOGY: 'topology',
  METRICS: 'metrics',
} as const;

/**
 * 生成标准化的缓存键
 * 格式: prefix:subkey:id
 * 例如: dashboard:critical-devices, analytics:top-devices:cpu
 */
export function buildCacheKey(
  prefix: keyof typeof CachePrefix,
  ...parts: string[]
): string {
  return `${CachePrefix[prefix]}:${parts.join(':')}`;
}

// ==================== 缓存工具方法 ====================

/**
 * 获取缓存（带降级处理）
 * Redis 不可用时返回 null，不影响业务逻辑
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) {
    return null; // 优雅降级
  }

  try {
    const cached = await redis.get(key);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as T;
    } catch (parseError) {
      console.error(`❌ 缓存解析失败 (key: ${key}):`, parseError);
      await redis.del(key); // 删除损坏的缓存
      return null;
    }
  } catch (error) {
    console.error(`❌ 获取缓存失败 (key: ${key}):`, error);
    return null; // 降级：返回 null，业务继续
  }
}

/**
 * 设置缓存（带降级处理）
 * Redis 不可用时静默失败，不影响业务逻辑
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = 60
): Promise<boolean> {
  if (!isRedisAvailable) {
    return false; // 优雅降级
  }

  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`❌ 设置缓存失败 (key: ${key}):`, error);
    return false; // 降级：静默失败
  }
}

/**
 * 删除缓存
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisAvailable) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`❌ 删除缓存失败 (key: ${key}):`, error);
    return false;
  }
}

/**
 * 批量删除缓存（支持通配符）
 * 例如: deleteCachePattern('dashboard:*') 删除所有仪表板缓存
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!isRedisAvailable) {
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    const deleted = await redis.del(...keys);
    console.log(`🗑️  删除 ${deleted} 个缓存 (pattern: ${pattern})`);
    return deleted;
  } catch (error) {
    console.error(`❌ 批量删除缓存失败 (pattern: ${pattern}):`, error);
    return 0;
  }
}

/**
 * 获取或设置缓存（Cache-Aside 模式）
 * 如果缓存未命中，执行 fetcher 函数并缓存结果
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  // 尝试从缓存获取
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 缓存未命中，执行 fetcher
  const value = await fetcher();

  // 异步设置缓存（不阻塞）
  setCache(key, value, ttl).catch((err) => {
    console.error(`❌ 后台缓存设置失败 (key: ${key}):`, err);
  });

  return value;
}

// ==================== 发布订阅 ====================

/**
 * 发布消息到频道
 */
export async function publish(
  channel: string,
  message: unknown
): Promise<boolean> {
  if (!isRedisAvailable) {
    console.warn(`⚠️  Redis 不可用，无法发布消息到频道: ${channel}`);
    return false;
  }

  try {
    // ✅ 支持 BigInt 序列化：将 BigInt 转换为字符串
    const serialized = JSON.stringify(message, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    await redis.publish(channel, serialized);
    return true;
  } catch (error) {
    console.error(`❌ 发布消息失败 (channel: ${channel}):`, error);
    return false;
  }
}

/**
 * 订阅频道
 * 返回订阅者实例（需手动管理生命周期）
 */
export function subscribe(
  channel: string,
  handler: (message: unknown) => void
): Redis | null {
  if (!isRedisAvailable) {
    console.warn(`⚠️  Redis 不可用，无法订阅频道: ${channel}`);
    return null;
  }

  try {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);

    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(msg);
          handler(parsed);
        } catch (error) {
          console.error(`❌ 解析订阅消息失败 (channel: ${channel}):`, error);
        }
      }
    });

    subscriber.on('error', (err) => {
      console.error(`❌ 订阅者错误 (channel: ${channel}):`, err);
    });

    console.log(`📡 已订阅频道: ${channel}`);
    return subscriber;
  } catch (error) {
    console.error(`❌ 订阅失败 (channel: ${channel}):`, error);
    return null;
  }
}

// ==================== 健康检查和监控 ====================

/**
 * Redis 健康检查
 */
export async function checkRedisHealth(): Promise<{
  available: boolean;
  latency?: number;
  info?: string;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await redis.ping();
    const latency = Date.now() - startTime;

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      available: true,
      latency,
      info: `Redis ${version}`,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取 Redis 统计信息
 */
export async function getRedisStats(): Promise<{
  connected: boolean;
  keys?: number;
  memory?: string;
  clients?: number;
}> {
  try {
    const dbsize = await redis.dbsize();
    const info = await redis.info('memory');
    const clientsInfo = await redis.info('clients');

    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const clientsMatch = clientsInfo.match(/connected_clients:([^\r\n]+)/);

    return {
      connected: true,
      keys: dbsize,
      memory: memoryMatch ? memoryMatch[1] : 'unknown',
      clients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
    };
  } catch (error) {
    return { connected: false };
  }
}

/**
 * 获取 Redis 客户端实例
 * 用于高级操作（谨慎使用）
 */
export function getRedisClient(): Redis {
  return redis;
}

/**
 * 检查 Redis 是否可用
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redis.status === 'ready';
}

/**
 * 优雅关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('✅ Redis 连接已关闭');
  } catch (error) {
    console.error('❌ 关闭 Redis 连接失败:', error);
    redis.disconnect(); // 强制断开
  }
}
