import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

/**
 * 系统趋势分析API
 * GET /api/analytics/system-trend?metric=cpu&hours=24
 * 返回指定时间范围内的系统平均指标趋势
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metric = 'cpu', hours = '24' } = req.query;
    const hoursNum = parseInt(hours as string, 10);

    if (!['cpu', 'memory', 'disk'].includes(metric as string)) {
      return res.status(400).json({ error: 'Invalid metric. Use: cpu, memory, or disk' });
    }

    // 尝试从缓存获取
    const cacheKey = `analytics:system-trend:${metric}:${hoursNum}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    // 获取时间范围内的所有指标
    const metrics = await prisma.deviceMetric.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (metrics.length === 0) {
      return res.status(200).json([]);
    }

    // 按时间段分组（每小时）
    const intervalMs = 60 * 60 * 1000; // 1小时
    const dataPoints: { timestamp: string; value: number; count: number }[] = [];

    // 创建时间桶
    const buckets = new Map<number, { sum: number; count: number }>();

    metrics.forEach(m => {
      const bucketTime = Math.floor(m.timestamp.getTime() / intervalMs) * intervalMs;

      let value = 0;
      if (metric === 'cpu') {
        value = m.cpuUsage || 0;
      } else if (metric === 'memory') {
        value = m.memoryUsage || 0;
      } else if (metric === 'disk') {
        value = m.diskUsage || 0;
      }

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { sum: 0, count: 0 });
      }

      const bucket = buckets.get(bucketTime)!;
      bucket.sum += value;
      bucket.count += 1;
    });

    // 转换为数组并计算平均值
    buckets.forEach((bucket, time) => {
      dataPoints.push({
        timestamp: new Date(time).toISOString(),
        value: Math.round((bucket.sum / bucket.count) * 10) / 10,
        count: bucket.count
      });
    });

    // 按时间排序
    dataPoints.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 缓存60秒
    await setCache(cacheKey, dataPoints, 60);

    return res.status(200).json(dataPoints);
  } catch (error) {
    console.error('Error fetching system trend:', error);
    return res.status(500).json({ error: 'Failed to fetch system trend' });
  }
}
