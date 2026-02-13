import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * 数据清理服务
 * 定期清理过期的历史数据，保持数据库性能
 */
export class DataCleanupService {
    /**
     * 清理设备指标历史数据
     */
    async cleanupDeviceMetrics(): Promise<number> {
        const retentionDays = env.DATA_RETENTION_DAYS;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await prisma.deviceMetric.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
        });

        logger.info(`Cleaned up ${result.count} device metric records older than ${retentionDays} days`);
        return result.count;
    }

    /**
     * 清理流量指标历史数据
     */
    async cleanupTrafficMetrics(): Promise<number> {
        const retentionDays = env.DATA_RETENTION_DAYS;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await prisma.trafficMetric.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
        });

        logger.info(`Cleaned up ${result.count} traffic metric records older than ${retentionDays} days`);
        return result.count;
    }

    /**
     * 清理已解决的告警（固定保留 90 天）
     */
    async cleanupResolvedAlarms(): Promise<number> {
        const retentionDays = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await prisma.alarm.deleteMany({
            where: {
                status: { in: ['RESOLVED', 'CLEARED'] },
                resolvedAt: { lt: cutoffDate },
            },
        });

        logger.info(`Cleaned up ${result.count} resolved alarms older than ${retentionDays} days`);
        return result.count;
    }

    /**
     * 执行所有清理任务（各任务错误相互隔离，不影响其他任务）
     */
    async cleanupAll(): Promise<{ deviceMetrics: number; trafficMetrics: number; alarms: number; total: number }> {
        logger.info('Starting scheduled data cleanup...');

        const results = await Promise.allSettled([
            this.cleanupDeviceMetrics(),
            this.cleanupTrafficMetrics(),
            this.cleanupResolvedAlarms(),
        ]);

        const [metricsResult, trafficResult, alarmsResult] = results;
        const deviceMetrics = metricsResult.status === 'fulfilled' ? metricsResult.value : 0;
        const trafficMetrics = trafficResult.status === 'fulfilled' ? trafficResult.value : 0;
        const alarms = alarmsResult.status === 'fulfilled' ? alarmsResult.value : 0;

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const taskNames = ['deviceMetrics', 'trafficMetrics', 'alarms'];
                logger.error(`Cleanup task failed: ${taskNames[index]}`, { error: result.reason });
            }
        });

        const total = deviceMetrics + trafficMetrics + alarms;
        logger.info(`Data cleanup completed. Total records removed: ${total}`, { deviceMetrics, trafficMetrics, alarms });
        return { deviceMetrics, trafficMetrics, alarms, total };
    }
}

export const dataCleanupService = new DataCleanupService();
