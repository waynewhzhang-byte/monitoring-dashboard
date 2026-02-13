import { prisma } from '@/lib/prisma';

describe('Dashboard Model', () => {
  it('should be able to create and retrieve a dashboard', async () => {
    // This test is expected to fail compilation initially because 'dashboard' does not exist on prisma client
    // @ts-ignore
    const dashboard = await prisma.dashboard.create({
      data: {
        name: 'Test Dashboard',
        description: 'A test dashboard',
        layout: { columns: 24, rowHeight: 80 },
        widgets: [],
        theme: { name: 'dark' }
      }
    });

    expect(dashboard).toBeDefined();
    expect(dashboard.name).toBe('Test Dashboard');
  });
});
