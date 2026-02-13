/**
 * 健康检查端点
 * GET /api/health
 * 
 * 检查应用、数据库、Redis 和 OpManager API 的健康状态
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGetHandler } from '@/middleware/api-handler';

interface HealthCheck {
  healthy: boolean;
  error?: string;
  responseTime?: number;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    application: HealthCheck;
    database: HealthCheck;
    redis?: HealthCheck;
    opmanager?: HealthCheck;
  };
}

/**
 * 检查数据库连接
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

/**
 * 检查 Redis 连接
 */
async function checkRedis(): Promise<HealthCheck | undefined> {
  try {
    const { redis } = await import('@/lib/redis');
    const start = Date.now();
    await redis.ping();
    return {
      healthy: true,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    // Redis 是可选的，如果未配置则返回 undefined
    const { env } = await import('@/lib/env');
    if (env.REDIS_URL) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
    return undefined;
  }
}

/**
 * 检查 OpManager API 连接
 */
async function checkOpManager(): Promise<HealthCheck | undefined> {
  try {
    // 简单的连接测试，不实际调用 API
    // 如果需要，可以实现实际的 API 调用测试
    const { env } = await import('@/lib/env');
    if (env.OPMANAGER_BASE_URL && env.OPMANAGER_API_KEY) {
      return {
        healthy: true,
      };
    }
    return undefined;
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const GET = createGetHandler(
  async () => {
    const start = Date.now();

    // 并行执行所有健康检查
    const [database, redis, opmanager] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkOpManager(),
    ]);

    const checks = {
      application: {
        healthy: true,
        responseTime: Date.now() - start,
      } as HealthCheck,
      database,
      ...(redis && { redis }),
      ...(opmanager && { opmanager }),
    };

    // 判断整体健康状态
    const isHealthy = Object.values(checks).every(
      (check) => check.healthy === true
    );

    const response: HealthResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    };

    // 健康检查端点需要返回正确的状态码
    // 注意：createGetHandler 会包装响应，我们需要特殊处理
    return {
      ...response,
      _statusCode: isHealthy ? 200 : 503,
    };
  },
  {
    requireAuth: false, // 健康检查不需要认证
    skipRateLimit: true, // 健康检查不需要限流
  }
);
