import { NextApiRequest, NextApiResponse } from 'next';
import { alarmAggregator } from '@/services/alarm/aggregator';

/**
 * 获取告警统计信息
 * GET /api/alarms/stats
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const stats = await alarmAggregator.getAlarmStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Failed to fetch alarm stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
