import { NextApiRequest, NextApiResponse } from 'next';
import { trendAnalyzer } from '@/services/analytics/trend-analyzer';

/**
 * 获取设备性能趋势分析
 * GET /api/analytics/device-trend?deviceId=xxx&hours=24
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { deviceId, hours } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: 'deviceId is required' });
    }

    const analysisHours = hours ? Number(hours) : 24;

    if (analysisHours < 1 || analysisHours > 168) {
        return res.status(400).json({ message: 'hours must be between 1 and 168' });
    }

    try {
        const trend = await trendAnalyzer.analyzeDevicePerformance(deviceId, analysisHours);

        if (!trend) {
            return res.status(404).json({ message: 'No data available for this device' });
        }

        res.status(200).json(trend);
    } catch (error) {
        console.error('Failed to analyze device trend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
