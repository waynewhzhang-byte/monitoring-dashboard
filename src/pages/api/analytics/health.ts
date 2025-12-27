import { NextApiRequest, NextApiResponse } from 'next';
import { healthScoreService } from '@/services/analytics/health-score';
import { getCache, setCache } from '@/lib/redis';

/**
 * 获取系统健康度分析
 * GET /api/analytics/health
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 尝试从缓存获取（缓存60秒）
        const cacheKey = 'analytics:health';
        const cached = await getCache<any>(cacheKey);

        if (cached) {
            return res.status(200).json(cached);
        }

        // 计算健康度
        const [health, availability] = await Promise.all([
            healthScoreService.calculateSystemHealth(),
            healthScoreService.calculateAvailability()
        ]);

        const result = {
            ...health,
            availability,
            timestamp: new Date().toISOString()
        };

        // 缓存结果
        await setCache(cacheKey, result, 60);

        res.status(200).json(result);
    } catch (error) {
        console.error('Failed to calculate health score:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
