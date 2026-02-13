/**
 * Mock OpManager 配置管理 API
 * GET /api/mock/opmanager/config - 获取配置
 * POST /api/mock/opmanager/config - 更新配置
 */

import { NextRequest } from 'next/server';
import { getMockDataStore, MockConfig } from '@/services/mock/opmanager-mock-data';
import { createGetHandler, createPostHandler } from '@/middleware/api-handler';
import { ValidationError } from '@/lib/errors';

export const GET = createGetHandler(
  async () => {
    const store = getMockDataStore();
    const config = store.getConfig();
    const lastUpdateTime = store.getLastUpdateTime();

    return {
      config,
      lastUpdateTime: lastUpdateTime.toISOString(),
    };
  },
  {
    requireAuth: false,
    skipRateLimit: false,
  }
);

export const POST = createPostHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const config: Partial<MockConfig> = body.config || {};

    // 验证配置
    if (config.deviceCount !== undefined && (config.deviceCount < 1 || config.deviceCount > 10000)) {
      throw new ValidationError('deviceCount must be between 1 and 10000');
    }

    const store = getMockDataStore();
    store.updateConfig(config);

    return {
      success: true,
      message: 'Configuration updated',
      config: store.getConfig(),
    };
  },
  {
    requireAuth: false,
    skipRateLimit: false,
  }
);
