/**
 * Mock OpManager listDevices API
 * GET /api/mock/opmanager/devices
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
    const category = searchParams.get('category') || undefined;
    const tags = searchParams.get('tags') || undefined;
    
    const pageStr = searchParams.get('page') || '1';
    const rowsStr = searchParams.get('rows') || '50';
    
    const page = parseInt(pageStr, 10);
    const rows = parseInt(rowsStr, 10);

    // 参数验证
    if (isNaN(page) || page < 1) {
      throw new ValidationError('Invalid page parameter. Must be a positive integer.');
    }
    if (isNaN(rows) || rows < 1 || rows > 1000) {
      throw new ValidationError('Invalid rows parameter. Must be between 1 and 1000.');
    }

    const store = getMockDataStore();
    const response = store.getDevices({ category, tags, page, rows });

    return response;
  },
  {
    requireAuth: false, // Mock API 不需要认证
    skipRateLimit: false, // 仍然需要限流
  }
);
