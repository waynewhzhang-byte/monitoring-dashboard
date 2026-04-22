import { NextRequest, NextResponse } from 'next/server';
import { topologyCollector } from '@/services/collector/topology';

/**
 * POST /api/topology/sync
 * 手动同步指定业务视图的拓扑数据（从 OpManager getBVDetails 拉取并写入 DB）
 * Body: { bvName: string } 或 Query: ?bvName=xxx
 */
export async function POST(req: NextRequest) {
  try {
    let bvName: string | null = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const raw =
        typeof body.bvName === 'string'
          ? body.bvName
          : typeof (body as { viewName?: unknown }).viewName === 'string'
            ? (body as { viewName: string }).viewName
            : null;
      bvName = raw?.trim() || null;
    }
    if (!bvName) {
      bvName = req.nextUrl.searchParams.get('bvName')?.trim() || null;
    }
    if (!bvName) {
      return NextResponse.json(
        { success: false, error: 'bvName is required (body or query)' },
        { status: 400 }
      );
    }

    const result = await topologyCollector.syncBusinessView(bvName);
    return NextResponse.json({
      success: true,
      bvName,
      /** 写入 Prisma 的节点/边条数 */
      nodes: result.nodes,
      edges: result.edges,
      /**
       * OpManager getBVDetails 侧：是否拿到可解析 JSON、归一化后的 device/link 数组长度。
       * responded=false 或两计数为 0 时，说明与 OPM 交互失败或 bvName/视图无拓扑。
       */
      opm: result.opm,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error('[POST /api/topology/sync]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
