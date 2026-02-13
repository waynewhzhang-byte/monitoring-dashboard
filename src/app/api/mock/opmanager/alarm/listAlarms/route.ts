import { NextRequest } from 'next/server';
import { getMockDataStore } from '@/services/mock/opmanager-mock-data';
import { createGetHandler } from '@/middleware/api-handler';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export const GET = createGetHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const deviceName = searchParams.get('deviceName') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const alertType = searchParams.get('alertType') || undefined;

    const store = getMockDataStore();
    const alarms = store.getAlarms({ deviceName, severity, alertType });

    return { rows: alarms };
  },
  {
    requireAuth: false,
    skipRateLimit: true,
  }
);
