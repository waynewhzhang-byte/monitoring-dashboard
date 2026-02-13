/**
 * Mock OpManager getInterfaces API
 * GET /api/mock/opmanager/getInterfaces
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
    const deviceName = searchParams.get('name');

    // 参数验证
    if (!deviceName) {
      throw new ValidationError('name parameter is required');
    }

    const store = getMockDataStore();
    const response = store.getInterfacesForDevice(deviceName);

    return response;
  },
  {
    requireAuth: false, // Mock API 不需要认证
    skipRateLimit: false, // 仍然需要限流
  }
);
