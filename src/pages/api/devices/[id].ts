import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;

    try {
        const device = await prisma.device.findUnique({
            where: { id: String(id) },
            include: {
                interfaces: true,
                alarms: {
                    where: { status: 'ACTIVE' },
                    orderBy: { occurredAt: 'desc' },
                    take: 5,
                },
                metrics: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            },
        });

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        res.status(200).json(device);
    } catch (error) {
        console.error('Failed to fetch device:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
