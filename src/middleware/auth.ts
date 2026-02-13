/**
 * API 认证中间件
 * 支持 API Key 和 JWT 认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnauthorizedError, errorToJSON } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * API Key 认证
 */
export async function authenticateAPIKey(request: NextRequest): Promise<boolean> {
  // 动态导入 env，避免在客户端执行
  const { env } = await import('@/lib/env');
  
  // 如果未配置 API_KEY，跳过认证（开发环境）
  if (!env.API_KEY) {
    if (env.NODE_ENV === 'production') {
      logger.warn('API_KEY not configured in production environment');
      return false;
    }
    return true; // 开发环境允许
  }

  // 从请求头获取 API Key
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return false;
  }

  return apiKey === env.API_KEY;
}

/**
 * API 认证中间件
 */
export async function authenticate(
  request: NextRequest
): Promise<NextResponse | null> {
  // 检查是否通过认证
  if (!(await authenticateAPIKey(request))) {
    logger.warn('Unauthorized API request', {
      path: request.nextUrl.pathname,
      ip: request.ip || request.headers.get('x-forwarded-for'),
    });

    const error = new UnauthorizedError('Invalid or missing API key');
    const errorResponse = errorToJSON(error);

    return NextResponse.json(errorResponse, {
      status: error.statusCode,
      headers: {
        'WWW-Authenticate': 'ApiKey',
      },
    });
  }

  return null; // 继续处理请求
}

/**
 * 可选认证（不强制，但记录）
 */
export async function optionalAuth(request: NextRequest): Promise<boolean> {
  return await authenticateAPIKey(request);
}
