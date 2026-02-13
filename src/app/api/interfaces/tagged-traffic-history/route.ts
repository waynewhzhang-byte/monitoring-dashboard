import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subHours } from 'date-fns';

/**
 * GET /api/interfaces/tagged-traffic-history?tag=<tagName>&range=1h&tagType=device|interface
 * Fetches historical traffic metrics for interfaces
 * - If tagType=device (default): finds devices with the tag, then gets all their interfaces
 * - If tagType=interface: finds interfaces directly with the tag
 * Returns aggregated data points for chart display
 */
// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tag = req.nextUrl.searchParams.get('tag');
    const range = req.nextUrl.searchParams.get('range') || '1h';
    const tagType = req.nextUrl.searchParams.get('tagType') || 'device'; // 'device' or 'interface'

    if (!tag) {
      return NextResponse.json({ error: 'tag parameter is required' }, { status: 400 });
    }

    // Calculate start time based on range
    let startTime = new Date();
    const hours = range === '1h' ? 1 : range === '6h' ? 6 : range === '24h' ? 24 : 1;
    startTime = subHours(new Date(), hours);

    let interfaceIds: string[] = [];

    if (tagType === 'device') {
      // Find devices with the tag, then get all their interfaces
      const devices = await prisma.device.findMany({
        where: {
          tags: {
            has: tag
          }
        },
        select: {
          id: true
        }
      });

      if (devices.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const deviceIds = devices.map(d => d.id);

      // Get all interfaces for these devices
      const interfaces = await prisma.interface.findMany({
        where: {
          deviceId: { in: deviceIds },
          isMonitored: true
        },
        select: {
          id: true
        }
      });

      interfaceIds = interfaces.map(iface => iface.id);
    } else {
      // Find interfaces directly with the tag
      const interfaces = await prisma.interface.findMany({
        where: {
          tags: {
            has: tag
          },
          isMonitored: true
        },
        select: {
          id: true
        }
      });

      interfaceIds = interfaces.map(iface => iface.id);
    }

    if (interfaceIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch historical traffic metrics for these interfaces
    const metrics = await prisma.trafficMetric.findMany({
      where: {
        interfaceId: { in: interfaceIds },
        timestamp: { gte: startTime }
      },
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        timestamp: true,
        inBandwidth: true,
        outBandwidth: true,
        inUtilization: true,
        outUtilization: true
      }
    });

    // Aggregate metrics by time intervals (5-minute intervals)
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const aggregated = new Map<number, {
      time: Date;
      inBandwidth: number;
      outBandwidth: number;
      inUtilization: number;
      outUtilization: number;
      count: number;
    }>();

    metrics.forEach(metric => {
      const timestamp = metric.timestamp.getTime();
      const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;

      if (!aggregated.has(intervalStart)) {
        aggregated.set(intervalStart, {
          time: new Date(intervalStart),
          inBandwidth: 0,
          outBandwidth: 0,
          inUtilization: 0,
          outUtilization: 0,
          count: 0
        });
      }

      const agg = aggregated.get(intervalStart)!;
      agg.inBandwidth += Number(metric.inBandwidth || 0);
      agg.outBandwidth += Number(metric.outBandwidth || 0);
      agg.inUtilization += metric.inUtilization || 0;
      agg.outUtilization += metric.outUtilization || 0;
      agg.count += 1;
    });

    // Calculate averages and format data
    const data = Array.from(aggregated.values())
      .map(agg => {
        const count = agg.count || 1;
        // Convert bandwidth from bps to Mbps
        const inMbps = (agg.inBandwidth / count) / (1000 * 1000);
        const outMbps = (agg.outBandwidth / count) / (1000 * 1000);
        
        return {
          time: agg.time.toLocaleTimeString('zh-CN', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          value: Math.round(inMbps), // Inbound traffic in Mbps
          value2: Math.round(outMbps), // Outbound traffic in Mbps
          inUtilization: agg.inUtilization / count,
          outUtilization: agg.outUtilization / count
        };
      })
      .sort((a, b) => {
        // Sort by time
        const timeA = aggregated.get(
          Math.floor(new Date(a.time).getTime() / intervalMs) * intervalMs
        )?.time.getTime() || 0;
        const timeB = aggregated.get(
          Math.floor(new Date(b.time).getTime() / intervalMs) * intervalMs
        )?.time.getTime() || 0;
        return timeA - timeB;
      });

    // If no historical data, return empty array
    // The widget can fall back to real-time data
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch tagged traffic history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
