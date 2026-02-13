import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/dashboards/[id]';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dashboard: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/dashboards/[id] GET', () => {
  it('returns 404 if dashboard is not found', async () => {
    (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'non-existent' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Dashboard not found' });
  });

  it('returns 200 and the dashboard if found', async () => {
    const mockDashboard = {
      id: 'test-id',
      name: 'Test Dashboard',
      layout: { columns: 24 },
      widgets: [],
    };
    (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'test-id' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockDashboard);
  });
});