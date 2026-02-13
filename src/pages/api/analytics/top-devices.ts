import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

/**
 * Top设备API
 * GET /api/analytics/top-devices?metric=cpu&limit=5
 * 返回按指定指标排序的Top N设备
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metric = 'cpu', limit = '5' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (!['cpu', 'memory', 'disk'].includes(metric as string)) {
      return res.status(400).json({ error: 'Invalid metric. Use: cpu, memory, or disk' });
    }

    // 尝试从缓存获取
    const cacheKey = `analytics:top-devices:${metric}:${limitNum}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // 获取所有设备的最新指标
    const devices = await prisma.device.findMany({
      include: {
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // 过滤并排序
    const devicesWithMetrics = devices
      .filter(d => d.metrics.length > 0)
      .map(d => {
        const latestMetric = d.metrics[0];
        let value = 0;

        if (metric === 'cpu') {
          value = latestMetric.cpuUsage || 0;
        } else if (metric === 'memory') {
          value = latestMetric.memoryUsage || 0;
        } else if (metric === 'disk') {
          value = latestMetric.diskUsage || 0;
        }

        return {
          id: d.id,
          name: d.name,
          ip: d.ipAddress,
          type: d.type,
          status: d.status,
          [metric as string]: value,
          cpuUsage: latestMetric.cpuUsage,
          memoryUsage: latestMetric.memoryUsage,
          diskUsage: latestMetric.diskUsage,
          lastUpdate: latestMetric.timestamp
        };
      })
      .sort((a, b) => {
        const aValue = a[metric as keyof typeof a] as number;
        const bValue = b[metric as keyof typeof b] as number;
        return bValue - aValue;
      })
      .slice(0, limitNum);

    // 缓存30秒
    await setCache(cacheKey, devicesWithMetrics, 30);

    return res.status(200).json(devicesWithMetrics);
  } catch (error) {
    console.error('Error fetching top devices:', error);
    return res.status(500).json({ error: 'Failed to fetch top devices' });
  }
}
