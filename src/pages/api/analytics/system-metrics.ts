import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

/**
 * 系统整体指标API
 * GET /api/analytics/system-metrics
 * 返回系统平均CPU、内存、磁盘使用率
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 尝试从缓存获取
    const cacheKey = 'analytics:system-metrics';
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // 获取最近的设备指标
    const recentMetrics = await prisma.deviceMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentMetrics.length === 0) {
      const result = {
        avgCpu: 0,
        avgMemory: 0,
        avgDisk: 0,
        sampleCount: 0,
        timestamp: new Date().toISOString()
      };
      await setCache(cacheKey, result, 30);
      return res.status(200).json(result);
    }

    // 计算平均值
    const totalCpu = recentMetrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0);
    const totalMemory = recentMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0);
    const totalDisk = recentMetrics.reduce((sum, m) => sum + (m.diskUsage || 0), 0);

    const result = {
      avgCpu: Math.round((totalCpu / recentMetrics.length) * 10) / 10,
      avgMemory: Math.round((totalMemory / recentMetrics.length) * 10) / 10,
      avgDisk: Math.round((totalDisk / recentMetrics.length) * 10) / 10,
      sampleCount: recentMetrics.length,
      timestamp: new Date().toISOString()
    };

    // 缓存30秒
    await setCache(cacheKey, result, 30);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
}
