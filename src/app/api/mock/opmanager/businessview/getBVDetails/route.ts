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

    if (!bvName) {
      throw new ValidationError('bvName parameter is required');
    }

    const store = getMockDataStore();
    const topology = store.getBusinessViewTopology(bvName);

    if (!topology) {
      return { linkProperties: [], deviceProperties: [], mapProperties: { name: '', label: '' } };
    }

    return topology;
  },
  {
    requireAuth: false,
    skipRateLimit: true,
  }
);
