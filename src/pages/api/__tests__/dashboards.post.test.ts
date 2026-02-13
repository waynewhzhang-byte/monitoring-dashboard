import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/dashboards/index';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dashboard: {
      upsert: jest.fn(),
    },
  },
}));

describe('/api/dashboards POST', () => {
  it('returns 400 if validation fails', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Incomplete Config' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 200 and saves the dashboard if validation passes', async () => {
    const validDashboard = {
      id: 'test-id',
      name: 'Test Dashboard',
      layout: { columns: 24, rowHeight: 80, gap: 16 },
      widgets: [],
    };

    (prisma.dashboard.upsert as jest.Mock).mockResolvedValue(validDashboard);

    const { req, res } = createMocks({
      method: 'POST',
      body: validDashboard,
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(prisma.dashboard.upsert).toHaveBeenCalled();
  });
});
