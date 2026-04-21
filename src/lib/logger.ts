/**
 * 统一日志系统
 * 使用 Winston 进行结构化日志记录
 * 客户端安全：在客户端使用 console，在服务端使用 Winston
 */

import winston from 'winston';

// 检查是否在服务端
const isServer = typeof window === 'undefined';

// 服务端：初始化 Winston logger
let serverLogger: winston.Logger | null = null;

if (isServer) {
  // 动态导入，避免在客户端执行
  import('path').then((path) => {
    import('fs').then((fs) => {
      // 延迟导入 env，避免循环依赖和客户端执行问题
      import('@/lib/env').then(({ env }) => {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }

        serverLogger = winston.createLogger({
          level: env.LOG_LEVEL,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
          defaultMeta: { service: 'monitoring-dashboard' },
          transports: [
            // 错误日志文件
            new winston.transports.File({
              filename: path.join(logsDir, 'error.log'),
              level: 'error',
              maxsize: 10485760, // 10MB
              maxFiles: 10,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
            }),
            // 综合日志文件
            new winston.transports.File({
              filename: path.join(logsDir, 'combined.log'),
              maxsize: 10485760, // 10MB
              maxFiles: 10,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
            }),
          ],
        });

        // 开发环境添加控制台输出
        const nodeEnv = env.NODE_ENV || 'development';
        if (nodeEnv !== 'production') {
          serverLogger.add(
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta, null, 2)
                    : '';
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
              ),
            })
          );
        } else {
          // 生产环境也输出到控制台（用于容器日志）
          serverLogger.add(
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
            })
          );
        }
      }).catch(() => {
        // 如果 env 加载失败，创建基本 logger
        serverLogger = winston.createLogger({
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console({
              format: winston.format.simple(),
            }),
          ],
        });
      });
    });
  });
}

/**
 * 统一的日志接口
 * 服务端使用 Winston，客户端使用 console
 */
export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    if (isServer && serverLogger) {
      serverLogger.error(message, meta);
    } else {
      console.error(`[ERROR] ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (isServer && serverLogger) {
      serverLogger.warn(message, meta);
    } else {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isServer && serverLogger) {
      serverLogger.info(message, meta);
    } else {
      console.info(`[INFO] ${message}`, meta || '');
    }
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (isServer && serverLogger) {
      serverLogger.debug(message, meta);
    } else {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
} as winston.Logger;
