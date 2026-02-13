/**
 * 数据源状态
 * GET /api/data-source
 *
 * 返回当前是否使用真实 OpManager 数据、设备数、最近同步时间等，
 * 供大屏展示“真实数据 / Mock”提示及操作指引。
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const useMockData =
      typeof env.USE_MOCK_DATA !== 'undefined' ? env.USE_MOCK_DATA === true : false;

    const [deviceCount, lastSyncRow, activeViewsCount] = await Promise.all([
      prisma.device.count({ where: { isMonitored: true } }),
      prisma.device.findFirst({
        where: { isMonitored: true, lastSyncAt: { not: null } },
        orderBy: { lastSyncAt: 'desc' },
        select: { lastSyncAt: true },
      }),
      prisma.businessViewConfig.count({ where: { isActive: true } }),
    ]);

    const lastDeviceSyncAt = lastSyncRow?.lastSyncAt
      ? lastSyncRow.lastSyncAt.toISOString()
      : null;

    return NextResponse.json({
      dataSource: useMockData ? 'mock' : 'opmanager',
      deviceCount,
      lastDeviceSyncAt,
      activeTopologyViews: activeViewsCount,
      hints: {
        useRealData:
          !useMockData &&
          deviceCount > 0 &&
          '当前为 OpManager 真实数据。',
        useMockData:
          useMockData &&
          '当前为 Mock 数据。要展示真实 OpManager 数据，请在 .env 中设置 USE_MOCK_DATA=false 并重启服务与采集器。',
        noDevices:
          !useMockData &&
          deviceCount === 0 &&
          '尚未同步设备。请到 管理后台 → 设备管理 点击「同步设备」，并确保采集器 (npm run collector) 已运行。',
        noTopologyViews:
          !useMockData &&
          activeViewsCount === 0 &&
          '未配置业务视图。请到 管理后台 → 拓扑/业务视图 添加并启用业务视图名（与 OpManager 中名称一致），再点击「同步」拉取拓扑。',
      },
    });
  } catch (error) {
    console.error('[GET /api/data-source]', error);
    return NextResponse.json(
      { error: 'Failed to get data source status' },
      { status: 500 }
    );
  }
}
