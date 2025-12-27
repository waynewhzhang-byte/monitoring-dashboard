import { prisma } from '@/lib/prisma';
import cron from 'node-cron';

/**
 * 数据清理服务
 * 定期清理过期的历史数据，保持数据库性能
 */
export class DataCleanupService {
    /**
     * 清理设备指标历史数据
     * 保留策略: 30天
     */
    async cleanupDeviceMetrics() {
        const retentionDays = Number(process.env.DATA_RETENTION_DAYS) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        try {
            const result = await prisma.deviceMetric.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`✅ Cleaned up ${result.count} device metric records older than ${retentionDays} days`);
            return result.count;
        } catch (error) {
            console.error('❌ Failed to cleanup device metrics:', error);
            throw error;
        }
    }

    /**
     * 清理流量指标历史数据
     * 保留策略: 30天
     */
    async cleanupTrafficMetrics() {
        const retentionDays = Number(process.env.DATA_RETENTION_DAYS) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        try {
            const result = await prisma.trafficMetric.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`✅ Cleaned up ${result.count} traffic metric records older than ${retentionDays} days`);
            return result.count;
        } catch (error) {
            console.error('❌ Failed to cleanup traffic metrics:', error);
            throw error;
        }
    }

    /**
     * 清理已解决的告警
     * 保留策略: 90天
     */
    async cleanupResolvedAlarms() {
        const retentionDays = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        try {
            const result = await prisma.alarm.deleteMany({
                where: {
                    status: {
                        in: ['RESOLVED', 'CLEARED']
                    },
                    resolvedAt: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`✅ Cleaned up ${result.count} resolved alarms older than ${retentionDays} days`);
            return result.count;
        } catch (error) {
            console.error('❌ Failed to cleanup alarms:', error);
            throw error;
        }
    }

    /**
     * 执行所有清理任务
     */
    async cleanupAll() {
        console.log('🧹 Starting data cleanup...');

        const metrics = await this.cleanupDeviceMetrics();
        const traffic = await this.cleanupTrafficMetrics();
        const alarms = await this.cleanupResolvedAlarms();

        console.log(`🎉 Cleanup completed! Total records cleaned: ${metrics + traffic + alarms}`);

        return {
            deviceMetrics: metrics,
            trafficMetrics: traffic,
            alarms: alarms,
            total: metrics + traffic + alarms
        };
    }

    /**
     * 启动定时清理任务
     * 每天凌晨2点执行
     */
    startScheduler() {
        console.log('📅 Starting data cleanup scheduler (runs daily at 2:00 AM)...');

        // 每天凌晨2点执行清理
        cron.schedule('0 2 * * *', async () => {
            console.log('⏰ Running scheduled cleanup task...');
            await this.cleanupAll();
        });

        console.log('✅ Data cleanup scheduler started');
    }
}

export const dataCleanupService = new DataCleanupService();
