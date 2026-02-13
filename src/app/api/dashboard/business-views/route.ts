import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dashboard/business-views
 * 返回当前启用的业务视图列表，供大屏「标签筛选」下拉选择业务视图名称。
 */
export async function GET() {
  try {
    const views = await prisma.businessViewConfig.findMany({
      where: { isActive: true },
      orderBy: [{ displayName: 'asc' }, { name: 'asc' }],
      select: { name: true, displayName: true },
    });

    return NextResponse.json({
      views: views.map((v) => ({ name: v.name, displayName: v.displayName ?? v.name })),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to fetch business views:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
