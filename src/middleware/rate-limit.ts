/**
 * API 限流中间件
 * 使用 Redis 实现基于 IP 的请求限流
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Redis 客户端（延迟加载）
let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient) {
    try {
      // 动态导入 env 和 redis，避免在客户端执行
      const { env } = await import('@/lib/env');
      if (env.REDIS_URL) {
        const { redis } = await import('@/lib/redis');
        redisClient = redis;
      }
    } catch (error) {
      logger.warn('Redis not available for rate limiting', { error });
      return null;
    }
  }
  return redisClient;
}

interface RateLimitOptions {
  windowMs?: number; // 时间窗口（毫秒）
  max?: number; // 最大请求数
  message?: string; // 错误消息
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean; // 是否跳过失败请求
}

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 100 次请求
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

/**
 * 获取客户端 IP 地址
 */
function getClientIP(request: NextRequest): string {
  // 尝试从各种头部获取真实 IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 从 NextRequest 获取 IP
  const ip = request.ip || 'unknown';
  return ip;
}

/**
 * API 限流中间件
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const opts = { ...defaultOptions, ...options };
  const ip = getClientIP(request);
  const key = `rate-limit:${ip}`;

  // 如果没有 Redis，跳过限流（降级策略）
  const redis = await getRedisClient();
  if (!redis) {
    logger.debug('Rate limiting skipped: Redis not available');
    return null;
  }

  try {
    // 获取当前计数
    const count = await redis.incr(key);

    // 如果是第一次请求，设置过期时间
    if (count === 1) {
      await redis.expire(key, Math.ceil(opts.windowMs / 1000));
    }

    // 检查是否超过限制
    if (count > opts.max) {
      logger.warn('Rate limit exceeded', {
        ip,
        count,
        max: opts.max,
        path: request.nextUrl.pathname,
      });

      return NextResponse.json(
        {
          error: {
            message: opts.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(opts.windowMs / 1000),
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(opts.windowMs / 1000)),
            'X-RateLimit-Limit': String(opts.max),
            'X-RateLimit-Remaining': String(Math.max(0, opts.max - count)),
            'X-RateLimit-Reset': String(Date.now() + opts.windowMs),
          },
        }
      );
    }

    // 记录限流信息（用于调试）
    logger.debug('Rate limit check passed', {
      ip,
      count,
      max: opts.max,
      remaining: opts.max - count,
    });

    return null; // 继续处理请求
  } catch (error) {
    // Redis 错误时允许请求（降级策略）
    logger.error('Rate limit check failed', { error, ip });
    return null;
  }
}

/**
 * 创建限流器（支持不同限流配置）
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (request: NextRequest) => rateLimit(request, options);
}
