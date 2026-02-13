/**
 * Mock OpManager 手动更新数据 API
 * POST /api/mock/opmanager/update - 手动触发数据更新
 * GET /api/mock/opmanager/update - 获取调度器状态
 */

import { NextRequest } from 'next/server';
import { getMockDataStore } from '@/services/mock/opmanager-mock-data';
import { getMockScheduler } from '@/services/mock/mock-scheduler';
import { createGetHandler, createPostHandler } from '@/middleware/api-handler';
import { ValidationError } from '@/lib/errors';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export const GET = createGetHandler(
  async () => {
    const store = getMockDataStore();
    const scheduler = getMockScheduler();
    
    return {
      lastUpdateTime: store.getLastUpdateTime().toISOString(),
      schedulerRunning: scheduler ? true : false,
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
    const action = body.action || 'update';

    if (action === 'update') {
      // 手动更新数据
      const store = getMockDataStore();
      store.updateData();
      
      return {
        success: true,
        message: 'Data updated successfully',
        lastUpdateTime: store.getLastUpdateTime().toISOString(),
      };
    } else if (action === 'regenerate') {
      // 重新生成所有数据
      const store = getMockDataStore();
      const config = store.getConfig();
      store.updateConfig(config); // 使用相同配置重新生成
      
      return {
        success: true,
        message: 'Data regenerated successfully',
        lastUpdateTime: store.getLastUpdateTime().toISOString(),
      };
    } else {
      throw new ValidationError('Invalid action. Use "update" or "regenerate"');
    }
  },
  {
    requireAuth: false,
    skipRateLimit: false,
  }
);
