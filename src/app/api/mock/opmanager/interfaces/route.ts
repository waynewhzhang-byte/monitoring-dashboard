/**
 * Mock OpManager listInterfaces API
 * GET /api/mock/opmanager/interfaces
 */

import { NextRequest } from 'next/server';
import { getMockDataStore } from '@/services/mock/opmanager-mock-data';
import { createGetHandler } from '@/middleware/api-handler';
import { ValidationError } from '@/lib/errors';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export const GET = createGetHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const deviceName = searchParams.get('deviceName') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const rows = parseInt(searchParams.get('rows') || '100', 10);

    // 参数验证
    if (isNaN(page) || page < 1) {
      throw new ValidationError('Invalid page parameter. Must be a positive integer.');
    }
    if (isNaN(rows) || rows < 1 || rows > 1000) {
      throw new ValidationError('Invalid rows parameter. Must be between 1 and 1000.');
    }

    // 处理 filters 参数（如果提供）
    let filters: any = undefined;
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        filters = JSON.parse(decodeURIComponent(filtersParam));
        // 如果 filters 中包含 deviceName，使用它
        if (filters.rules) {
          const deviceNameRule = filters.rules.find(
            (r: any) => r.field === 'deviceName'
          );
          if (deviceNameRule && !deviceName) {
            // 从 filters 中提取 deviceName
            // 注意：这里简化处理，实际应该解析 filters
          }
        }
      } catch (e) {
        // 忽略 filters 解析错误（可选参数）
      }
    }

    const store = getMockDataStore();
    const response = store.getInterfaces({ deviceName, page, rows });

    return response;
  },
  {
    requireAuth: false, // Mock API 不需要认证
    skipRateLimit: false,
  }
);
