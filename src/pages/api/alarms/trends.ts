import { NextApiRequest, NextApiResponse } from 'next';
import { alarmAggregator } from '@/services/alarm/aggregator';

/**
 * 获取告警趋势数据
 * GET /api/alarms/trends?hours=24
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const hours = Number(req.query.hours) || 24;

    if (hours < 1 || hours > 168) { // 最多7天
        return res.status(400).json({ message: 'Hours must be between 1 and 168' });
    }

    try {
        const trends = await alarmAggregator.getAlarmTrends(hours);
        res.status(200).json(trends);
    } catch (error) {
        console.error('Failed to fetch alarm trends:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
