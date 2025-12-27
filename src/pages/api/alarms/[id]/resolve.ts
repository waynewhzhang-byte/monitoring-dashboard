import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { alarmDeduplicator } from '@/services/alarm/deduplicator';
import { broadcaster, BroadcastEvent } from '@/services/broadcast';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;
    const { resolvedBy, notes } = req.body;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid alarm ID' });
    }

    if (!resolvedBy) {
        return res.status(400).json({ message: 'resolvedBy is required' });
    }

    try {
        // 检查告警是否存在
        const existingAlarm = await prisma.alarm.findUnique({
            where: { id }
        });

        if (!existingAlarm) {
            return res.status(404).json({ message: 'Alarm not found' });
        }

        // 检查告警是否已经解决
        if (existingAlarm.status === 'RESOLVED' || existingAlarm.status === 'CLEARED') {
            return res.status(400).json({ message: 'Alarm already resolved' });
        }

        // 更新告警状态为已解决
        const updatedAlarm = await prisma.alarm.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                resolvedBy: String(resolvedBy),
                resolvedAt: new Date(),
                notes: notes ? String(notes) : existingAlarm.notes,
                updatedAt: new Date()
            },
            include: {
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        ipAddress: true
                    }
                }
            }
        });

        // 清除告警的去重标记，允许相同告警再次产生
        await alarmDeduplicator.clearDedupeMarker(updatedAlarm);

        // 广播告警更新事件
        await broadcaster.emit('alarms', BroadcastEvent.ALARM_RESOLVED, updatedAlarm);
        await broadcaster.emit(`device:${updatedAlarm.deviceId}`, BroadcastEvent.ALARM_RESOLVED, updatedAlarm);

        res.status(200).json({
            message: 'Alarm resolved successfully',
            data: updatedAlarm
        });
    } catch (error) {
        console.error('Failed to resolve alarm:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
