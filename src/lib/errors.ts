/**
 * 统一错误处理
 * 定义应用错误类和错误处理工具
 */

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 客户端错误（4xx）
 */
export class ClientError extends AppError {
  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message, statusCode, code, true);
  }
}

/**
 * 服务器错误（5xx）
 */
export class ServerError extends AppError {
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message, statusCode, code, false);
  }
}

/**
 * 未授权错误
 */
export class UnauthorizedError extends ClientError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 禁止访问错误
 */
export class ForbiddenError extends ClientError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends ClientError {
  constructor(message: string = 'Not Found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 验证错误
 */
export class ValidationError extends ClientError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 外部 API 错误
 */
export class ExternalAPIError extends ServerError {
  constructor(
    message: string,
    public service: string,
    statusCode: number = 502
  ) {
    super(message, statusCode, 'EXTERNAL_API_ERROR');
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends ServerError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * 将错误转换为 JSON 响应格式
 */
export function errorToJSON(error: unknown): {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    fields?: Record<string, string>;
  };
} {
  if (error instanceof AppError) {
    const json: {
      error: {
        message: string;
        code?: string;
        statusCode: number;
        fields?: Record<string, string>;
      };
    } = {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
    };

    if (error instanceof ValidationError && error.fields) {
      json.error.fields = error.fields;
    }

    return json;
  }

  // 未知错误
  return {
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error instanceof Error
          ? error.message
          : 'Unknown error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
  };
}

/**
 * 检查是否为操作错误（可预期的错误）
 */
export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}
