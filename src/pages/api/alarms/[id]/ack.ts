import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { broadcaster, BroadcastEvent } from '@/services/broadcast';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;
    const { user } = req.body; // In real app, get from session

    try {
        const alarm = await prisma.alarm.update({
            where: { id: String(id) },
            data: {
                status: 'ACKNOWLEDGED',
                acknowledgedAt: new Date(),
                acknowledgedBy: user || 'system'
            }
        });

        // Broadcast update
        await broadcaster.emit('alarms', BroadcastEvent.ALARM_UPDATE, alarm);
        await broadcaster.emit(`device:${alarm.deviceId}`, BroadcastEvent.ALARM_UPDATE, alarm);

        res.status(200).json(alarm);
    } catch (error) {
        console.error('Failed to acknowledge alarm:', error);
        // Prisma P2025: Record not found
        res.status(500).json({ message: 'Internal server error' });
    }
}
