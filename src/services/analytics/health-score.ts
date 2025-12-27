import { prisma } from '@/lib/prisma';
import { DeviceStatus } from '@prisma/client';

/**
 * 健康度计算服务
 * 基于设备状态、告警等级、性能指标计算系统整体健康度
 */
export class HealthScoreService {
    /**
     * 计算系统整体健康度 (0-100)
     */
    async calculateSystemHealth(): Promise<{
        score: number;
        grade: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'POOR' | 'CRITICAL';
        details: {
            deviceHealth: number;
            alarmImpact: number;
            performanceHealth: number;
        };
    }> {
        // 1. 计算设备健康度 (40%权重)
        const deviceHealth = await this.calculateDeviceHealth();

        // 2. 计算告警影响 (30%权重)
        const alarmImpact = await this.calculateAlarmImpact();

        // 3. 计算性能健康度 (30%权重)
        const performanceHealth = await this.calculatePerformanceHealth();

        // 加权计算总分
        const score = Math.round(
            deviceHealth * 0.4 +
            alarmImpact * 0.3 +
            performanceHealth * 0.3
        );

        // 确定等级
        let grade: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'POOR' | 'CRITICAL';
        if (score >= 90) grade = 'EXCELLENT';
        else if (score >= 75) grade = 'GOOD';
        else if (score >= 60) grade = 'WARNING';
        else if (score >= 40) grade = 'POOR';
        else grade = 'CRITICAL';

        return {
            score,
            grade,
            details: {
                deviceHealth,
                alarmImpact,
                performanceHealth
            }
        };
    }

    /**
     * 计算设备健康度
     */
    private async calculateDeviceHealth(): Promise<number> {
        const devices = await prisma.device.groupBy({
            by: ['status'],
            where: { isMonitored: true },
            _count: true
        });

        const statusCounts = devices.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {} as Record<string, number>);

        const total = devices.reduce((sum, item) => sum + item._count, 0);

        if (total === 0) return 100;

        // 计算分数：在线100分，警告50分，错误0分，离线0分
        const score = (
            (statusCounts[DeviceStatus.ONLINE] || 0) * 100 +
            (statusCounts[DeviceStatus.WARNING] || 0) * 50 +
            (statusCounts[DeviceStatus.ERROR] || 0) * 0 +
            (statusCounts[DeviceStatus.OFFLINE] || 0) * 0
        ) / total;

        return Math.round(score);
    }

    /**
     * 计算告警影响分数
     */
    private async calculateAlarmImpact(): Promise<number> {
        const alarms = await prisma.alarm.groupBy({
            by: ['severity'],
            where: {
                status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
            },
            _count: true
        });

        const severityCounts = alarms.reduce((acc, item) => {
            acc[item.severity] = item._count;
            return acc;
        }, {} as Record<string, number>);

        // 不同严重程度的扣分
        const criticalPenalty = (severityCounts['CRITICAL'] || 0) * 15; // 每个严重告警扣15分
        const majorPenalty = (severityCounts['MAJOR'] || 0) * 10;       // 每个重要告警扣10分
        const minorPenalty = (severityCounts['MINOR'] || 0) * 5;        // 每个次要告警扣5分
        const warningPenalty = (severityCounts['WARNING'] || 0) * 2;    // 每个警告扣2分

        const totalPenalty = criticalPenalty + majorPenalty + minorPenalty + warningPenalty;

        // 基础分100，扣除告警分数，最低0分
        const score = Math.max(0, 100 - totalPenalty);

        return Math.round(score);
    }

    /**
     * 计算性能健康度
     * 基于最近的设备指标
     */
    private async calculatePerformanceHealth(): Promise<number> {
        // 获取所有监控设备的最新指标
        const devices = await prisma.device.findMany({
            where: { isMonitored: true },
            select: { id: true }
        });

        if (devices.length === 0) return 100;

        let totalScore = 0;
        let deviceCount = 0;

        for (const device of devices) {
            const latestMetric = await prisma.deviceMetric.findFirst({
                where: { deviceId: device.id },
                orderBy: { timestamp: 'desc' }
            });

            if (!latestMetric) continue;

            // 计算单个设备的性能分数
            const cpuScore = this.calculateMetricScore(latestMetric.cpuUsage);
            const memoryScore = this.calculateMetricScore(latestMetric.memoryUsage);
            const diskScore = this.calculateMetricScore(latestMetric.diskUsage);

            const deviceScore = (cpuScore + memoryScore + diskScore) / 3;
            totalScore += deviceScore;
            deviceCount++;
        }

        if (deviceCount === 0) return 100;

        return Math.round(totalScore / deviceCount);
    }

    /**
     * 计算单个指标的分数 (0-100)
     * usage越低分数越高
     */
    private calculateMetricScore(usage: number | null): number {
        if (usage === null) return 100;

        if (usage >= 90) return 20;      // 90%以上：20分
        else if (usage >= 80) return 50; // 80-90%：50分
        else if (usage >= 70) return 70; // 70-80%：70分
        else if (usage >= 60) return 85; // 60-70%：85分
        else return 100;                 // 60%以下：100分
    }

    /**
     * 计算设备可用性 (%)
     */
    async calculateAvailability(): Promise<number> {
        const total = await prisma.device.count({
            where: { isMonitored: true }
        });

        const online = await prisma.device.count({
            where: {
                isMonitored: true,
                status: DeviceStatus.ONLINE
            }
        });

        if (total === 0) return 100;

        return Math.round((online / total) * 10000) / 100; // 保留两位小数
    }
}

export const healthScoreService = new HealthScoreService();
