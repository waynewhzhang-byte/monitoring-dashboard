/**
 * 环境变量验证和配置
 * 使用 Zod 验证所有环境变量，确保应用启动时配置正确
 */

import { z } from 'zod';

const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis（可选）
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // OpManager API
  OPMANAGER_BASE_URL: z.string().url('OPMANAGER_BASE_URL must be a valid URL'),
  OPMANAGER_API_KEY: z.string().min(1, 'OPMANAGER_API_KEY is required'),
  OPMANAGER_TIMEOUT: z
    .string()
    .default('60000') // 增加到60秒，适应生产环境慢速响应
    .transform((val) => parseInt(val, 10)),
  /** getInterfaces 调用间隔（毫秒），避免 OpManager URL_ROLLING_THROTTLES_LIMIT_EXCEEDED。默认 30000（30 秒） */
  OPMANAGER_GETINTERFACES_DELAY_MS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30000)),

  // 应用配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  HOSTNAME: z.string().default('0.0.0.0'),

  // 数据采集配置（单位：秒，均可通过环境变量后续调整）
  /** 设备采集实时性能间隔，默认 300（5 分钟） */
  COLLECT_METRICS_INTERVAL: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  /** 接口采集/同步间隔，默认 300（5 分钟），供定时任务或前端刷新参考 */
  COLLECT_INTERFACE_INTERVAL: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  COLLECT_ALARMS_INTERVAL: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10)),
  /** 拓扑/业务视图同步间隔（秒）。默认 300 秒（5 分钟） */
  SYNC_TOPOLOGY_INTERVAL: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  /** 接口流量采集间隔（秒）。默认 600 秒（10 分钟） */
  COLLECT_TRAFFIC_INTERVAL: z
    .string()
    .default('600')
    .transform((val) => parseInt(val, 10)),
  SYNC_DEVICES_INTERVAL: z
    .string()
    .default('2400')
    .transform((val) => parseInt(val, 10)),

  // Mock Server 配置
  USE_MOCK_DATA: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  MOCK_UPDATE_INTERVAL_MINUTES: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),

  // 日志配置
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info'),

  // 安全配置（可选）
  API_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),

  // 数据保留策略
  DATA_RETENTION_DAYS: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10)),

  // WebSocket 配置
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),

  // 监控配置（可选）
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

/**
 * 验证后的环境变量
 * 如果验证失败，应用将无法启动
 * 注意：只在服务端执行，客户端不会执行此验证
 */
export const env = (() => {
  // 只在服务端执行验证
  if (typeof window !== 'undefined') {
    // 客户端环境，返回一个安全的默认对象（不会实际使用）
    return {} as z.infer<typeof envSchema>;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 环境变量验证失败:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n请检查 .env.local 文件，确保所有必需的环境变量已正确配置。');
      console.error('参考 env.example.txt 文件了解所需的配置项。');
    }
    throw error;
  }
})();

/**
 * 类型安全的环境变量访问
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 检查生产环境必需的配置
 */
export function validateProductionConfig() {
  if (env.NODE_ENV === 'production') {
    const required = [
      { key: 'DATABASE_URL', value: env.DATABASE_URL },
      { key: 'OPMANAGER_BASE_URL', value: env.OPMANAGER_BASE_URL },
      { key: 'OPMANAGER_API_KEY', value: env.OPMANAGER_API_KEY },
    ];

    const missing = required.filter((item) => !item.value);
    if (missing.length > 0) {
      throw new Error(
        `生产环境缺少必需的配置: ${missing.map((m) => m.key).join(', ')}`
      );
    }

    // 生产环境建议使用 API Key
    if (!env.API_KEY) {
      console.warn(
        '⚠️  警告: 生产环境建议设置 API_KEY 以保护 API 端点'
      );
    }
  }
}

// 在模块加载时验证生产配置（只在服务端）
if (typeof window === 'undefined') {
  try {
    validateProductionConfig();
  } catch (error) {
    // 验证失败时记录错误，但不阻止模块加载（让应用启动以便显示错误）
    console.error('生产环境配置验证失败:', error);
  }
}
