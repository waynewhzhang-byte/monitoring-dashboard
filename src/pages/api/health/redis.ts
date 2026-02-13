import { NextApiRequest, NextApiResponse } from 'next';
import { checkRedisHealth, getRedisStats, isRedisConnected } from '@/lib/redis';

/**
 * Redis 健康检查 API
 * GET /api/health/redis
 *
 * 返回 Redis 连接状态、延迟、内存使用等信息
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const [health, stats] = await Promise.all([
            checkRedisHealth(),
            getRedisStats(),
        ]);

        const isConnected = isRedisConnected();

        const response = {
            status: health.available ? 'healthy' : 'unhealthy',
            connected: isConnected,
            timestamp: new Date().toISOString(),
            details: {
                ...health,
                ...stats,
            },
        };

        const statusCode = health.available ? 200 : 503;
        res.status(statusCode).json(response);
    } catch (error) {
        console.error('Redis health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            connected: false,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
