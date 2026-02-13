import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/interfaces/realtime-traffic?tag=__all__&limit=10
 * 获取所有接口的实时流量数据（Top N，从 TrafficMetric 表读取）
 *
 * 数据来源: TrafficMetric 表（由 interface-traffic.ts 采集器每 60 秒更新）
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;

    // 获取所有有标签的接口（有标签的接口才有流量数据）
    const interfaces = await prisma.interface.findMany({
      where: {
        tags: { isEmpty: false },  // 只查询有标签的接口
        isMonitored: true
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        tags: true,
        device: {
          select: {
            name: true,
            displayName: true,
            ipAddress: true
          }
        },
        trafficMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            inBandwidth: true,
            outBandwidth: true,
            inUtilization: true,
            outUtilization: true,
            timestamp: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 格式化并计算总流量
    const interfaceTraffic = interfaces
      .map(intf => {
        const latestMetric = intf.trafficMetrics[0];
        const inBps = latestMetric ? Number(latestMetric.inBandwidth || 0) : 0;
        const outBps = latestMetric ? Number(latestMetric.outBandwidth || 0) : 0;

        return {
          id: intf.id,
          name: intf.displayName || intf.name,
          deviceName: intf.device.displayName || intf.device.name,
          deviceIp: intf.device.ipAddress || '',
          inBandwidth: formatBandwidth(inBps),
          outBandwidth: formatBandwidth(outBps),
          inBandwidthRaw: inBps,
          outBandwidthRaw: outBps,
          inUtilization: latestMetric?.inUtilization || 0,
          outUtilization: latestMetric?.outUtilization || 0,
          status: intf.status,
          timestamp: latestMetric?.timestamp || new Date(),
          totalBandwidth: inBps + outBps
        };
      })
      .sort((a, b) => b.totalBandwidth - a.totalBandwidth)  // 按总流量排序
      .slice(0, limit);  // 取 Top N

    console.log(`📡 Realtime traffic: ${interfaceTraffic.length} interfaces (top ${limit})`);

    return NextResponse.json({ interfaces: interfaceTraffic });
  } catch (error) {
    console.error('Failed to fetch realtime traffic:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatBandwidth(bps: number): string {
  if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(1)} G`;
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} M`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(1)} K`;
  return `${bps.toFixed(0)}`;
}
