import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const viewName = req.nextUrl.searchParams.get('bvName');

    let deviceIds: string[] | undefined;

    // If viewName is provided, filter by business view
    if (viewName) {
      const nodes = await prisma.topologyNode.findMany({
        where: { viewName },
        select: { deviceId: true }
      });

      deviceIds = nodes.map(n => n.deviceId).filter(id => !!id) as string[];

      if (deviceIds.length === 0) {
        return NextResponse.json({ alarms: [] });
      }
    }
    // Otherwise, fetch all alarms (global view)

    // Fetch active alarms
    const alarms = await prisma.alarm.findMany({
      where: {
        ...(deviceIds && { deviceId: { in: deviceIds } }),
        status: 'ACTIVE'
      },
      include: {
        device: {
          select: {
            displayName: true,
            opmanagerId: true
          }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ alarms });
  } catch (error) {
    console.error('Failed to fetch business view alarms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
