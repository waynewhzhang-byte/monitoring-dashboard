import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { subHours, subDays } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { deviceId, range = '1h' } = req.query;

    if (!deviceId) {
        return res.status(400).json({ message: 'Missing deviceId' });
    }

    let startTime = new Date();
    switch (range) {
        case '1h': startTime = subHours(new Date(), 1); break;
        case '6h': startTime = subHours(new Date(), 6); break;
        case '24h': startTime = subHours(new Date(), 24); break;
        case '7d': startTime = subDays(new Date(), 7); break;
        default: startTime = subHours(new Date(), 1);
    }

    try {
        const metrics = await prisma.deviceMetric.findMany({
            where: {
                deviceId: String(deviceId),
                timestamp: { gte: startTime }
            },
            orderBy: { timestamp: 'asc' },
            select: {
                timestamp: true,
                cpuUsage: true,
                memoryUsage: true,
                responseTime: true
            }
        });

        res.status(200).json(metrics);
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
