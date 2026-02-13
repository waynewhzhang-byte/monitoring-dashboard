/**
 * API 请求处理包装器
 * 统一处理认证、限流和错误处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rate-limit';
import { authenticate, optionalAuth } from './auth';
import { AppError, errorToJSON, isOperationalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface ApiHandlerOptions {
  requireAuth?: boolean; // 是否需要认证
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  skipRateLimit?: boolean; // 是否跳过限流（用于健康检查等）
}

/**
 * API 处理包装器
 */
export function createApiHandler<T = any>(
  handler: (request: NextRequest) => Promise<T>,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // 1. 认证检查
      if (options.requireAuth) {
        const authResponse = await authenticate(request);
        if (authResponse) {
          return authResponse;
        }
      } else {
        // 可选认证（记录但不阻止）
        await optionalAuth(request);
      }

      // 2. 限流检查
      if (!options.skipRateLimit) {
        const rateLimitResponse = await rateLimit(request, options.rateLimit);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // 3. 执行处理函数
      const result = await handler(request);

      // 4. 记录成功请求
      const duration = Date.now() - startTime;
      logger.info('API request completed', {
        path: request.nextUrl.pathname,
        method: request.method,
        duration,
        status: 200,
      });

      // 5. 返回响应
      if (result instanceof NextResponse) {
        return result;
      }

      // 处理特殊状态码（用于健康检查等）
      if (result && typeof result === 'object' && '_statusCode' in result) {
        const statusCode = (result as any)._statusCode;
        const cleanResult = { ...result };
        delete (cleanResult as any)._statusCode;
        return NextResponse.json(cleanResult, { status: statusCode });
      }

      return NextResponse.json(result);
    } catch (error) {
      // 错误处理
      const duration = Date.now() - startTime;
      const errorResponse = errorToJSON(error);
      const statusCode = error instanceof AppError ? error.statusCode : 500;

      // 记录错误日志
      if (statusCode >= 500) {
        logger.error('API request failed', {
          path: request.nextUrl.pathname,
          method: request.method,
          duration,
          status: statusCode,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        logger.warn('API client error', {
          path: request.nextUrl.pathname,
          method: request.method,
          duration,
          status: statusCode,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

/**
 * 便捷函数：创建 GET 处理函数
 */
export function createGetHandler<T = any>(
  handler: (request: NextRequest) => Promise<T>,
  options?: ApiHandlerOptions
) {
  return createApiHandler(handler, options);
}

/**
 * 便捷函数：创建 POST 处理函数
 */
export function createPostHandler<T = any>(
  handler: (request: NextRequest) => Promise<T>,
  options?: ApiHandlerOptions
) {
  return createApiHandler(handler, options);
}
