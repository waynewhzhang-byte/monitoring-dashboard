import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/topology/views
 * Returns business views from BusinessViewConfig table (only active views)
 * This ensures views are manually maintained in /admin and match OpManager API names
 */
export async function GET() {
  try {
    const views = await prisma.businessViewConfig.findMany({
      where: { isActive: true },
      select: {
        name: true,
        displayName: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      views: views.map((v) => ({
        name: v.name, // OpManager API name (used as parameter)
        displayName: v.displayName || v.name, // Display name for UI
      })),
    });
  } catch (error) {
    console.error('Failed to fetch views:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
