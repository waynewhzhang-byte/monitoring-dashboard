import { NextRequest } from 'next/server';
import { getMockDataStore } from '@/services/mock/opmanager-mock-data';
import { createGetHandler } from '@/middleware/api-handler';
import { ValidationError } from '@/lib/errors';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export const GET = createGetHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const bvName = searchParams.get('bvName');
    const startPoint = parseInt(searchParams.get('startPoint') || '0', 10);
    const viewLength = parseInt(searchParams.get('viewLength') || '50', 10);

    if (!bvName) {
      throw new ValidationError('bvName parameter is required');
    }

    const store = getMockDataStore();
    return store.getBusinessViewDevices(bvName, startPoint, viewLength);
  },
  {
    requireAuth: false,
    skipRateLimit: true,
  }
);
