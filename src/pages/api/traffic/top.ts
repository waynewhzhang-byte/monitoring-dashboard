import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * 获取流量Top N接口
 * GET /api/traffic/top?limit=10
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const limit = Number(req.query.limit) || 10;

    if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: 'Limit must be between 1 and 100' });
    }

    try {
        // 获取所有接口的最新流量数据
        const interfaces = await prisma.interface.findMany({
            where: {
                isMonitored: true,
                device: {
                    isMonitored: true
                }
            },
            include: {
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        ipAddress: true,
                        type: true
                    }
                }
            }
        });

        // 获取每个接口的最新流量指标
        const interfacesWithMetrics = await Promise.all(
            interfaces.map(async (iface) => {
                const latestMetric = await prisma.trafficMetric.findFirst({
                    where: { interfaceId: iface.id },
                    orderBy: { timestamp: 'desc' }
                });

                if (!latestMetric) {
                    return null;
                }

                // 计算总带宽（入+出）
                const totalBandwidth = (latestMetric.inBandwidth || 0) + (latestMetric.outBandwidth || 0);
                const totalUtilization = (latestMetric.inUtilization || 0) + (latestMetric.outUtilization || 0);

                return {
                    interfaceId: iface.id,
                    interfaceName: iface.name,
                    displayName: iface.displayName,
                    deviceName: iface.device.displayName || iface.device.name,
                    deviceIp: iface.device.ipAddress,
                    deviceType: iface.device.type,
                    speed: iface.speed,
                    inBandwidth: latestMetric.inBandwidth,
                    outBandwidth: latestMetric.outBandwidth,
                    totalBandwidth,
                    inUtilization: latestMetric.inUtilization,
                    outUtilization: latestMetric.outUtilization,
                    totalUtilization,
                    timestamp: latestMetric.timestamp
                };
            })
        );

        // 过滤掉null值并按总带宽排序
        const topInterfaces = interfacesWithMetrics
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.totalBandwidth - a.totalBandwidth)
            .slice(0, limit);

        res.status(200).json({
            data: topInterfaces,
            count: topInterfaces.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to fetch top traffic:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
