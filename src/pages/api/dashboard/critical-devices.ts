import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

/**
 * 获取关键设备及其实时指标
 * GET /api/dashboard/critical-devices
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 尝试从缓存获取
        const cacheKey = 'dashboard:critical-devices';
        const cached = await getCache<any>(cacheKey);

        if (cached) {
            return res.status(200).json(cached);
        }

        // 查询关键设备（有告警或状态异常的设备），同时包含最新指标（避免 N+1）
        const criticalDevices = await prisma.device.findMany({
            where: {
                isMonitored: true,
                OR: [
                    { status: { in: ['WARNING', 'ERROR', 'OFFLINE'] } },
                    {
                        alarms: {
                            some: {
                                status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
                            }
                        }
                    }
                ]
            },
            take: 20,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                displayName: true,
                type: true,
                ipAddress: true,
                status: true,
                _count: {
                    select: {
                        alarms: {
                            where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
                        }
                    }
                },
                metrics: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                    select: {
                        cpuUsage: true,
                        memoryUsage: true,
                        diskUsage: true,
                        responseTime: true,
                        timestamp: true,
                    }
                }
            }
        });

        const devicesWithMetrics = criticalDevices.map((device) => ({
            id: device.id,
            name: device.name,
            displayName: device.displayName,
            type: device.type,
            ipAddress: device.ipAddress,
            status: device.status,
            alarmCount: device._count.alarms,
            metrics: device.metrics[0] ?? null,
        }));

        const result = {
            devices: devicesWithMetrics,
            count: devicesWithMetrics.length,
            timestamp: new Date().toISOString()
        };

        // 缓存30秒
        await setCache(cacheKey, result, 30);

        res.status(200).json(result);
    } catch (error) {
        console.error('Failed to fetch critical devices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
