import { prisma } from '@/lib/prisma';

/**
 * 趋势分析服务
 * 分析设备性能、告警等数据的趋势
 */
export class TrendAnalyzer {
    /**
     * 分析设备性能趋势
     * @param deviceId 设备ID
     * @param hours 分析的小时数
     */
    async analyzeDevicePerformance(deviceId: string, hours: number = 24) {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - hours);

        const metrics = await prisma.deviceMetric.findMany({
            where: {
                deviceId,
                timestamp: { gte: startTime }
            },
            orderBy: { timestamp: 'asc' }
        });

        if (metrics.length === 0) {
            return null;
        }

        // 计算平均值、最大值、最小值
        const cpuMetrics = metrics.map(m => m.cpuUsage).filter((v): v is number => v !== null);
        const memoryMetrics = metrics.map(m => m.memoryUsage).filter((v): v is number => v !== null);
        const diskMetrics = metrics.map(m => m.diskUsage).filter((v): v is number => v !== null);

        return {
            period: {
                start: startTime,
                end: new Date(),
                hours
            },
            cpu: this.calculateStats(cpuMetrics),
            memory: this.calculateStats(memoryMetrics),
            disk: this.calculateStats(diskMetrics),
            sampleCount: metrics.length
        };
    }

    /**
     * 预测未来趋势（简单线性回归）
     * @param deviceId 设备ID
     * @param metric 指标类型
     * @param forecastHours 预测的小时数
     */
    async predictTrend(
        deviceId: string,
        metric: 'cpu' | 'memory' | 'disk',
        forecastHours: number = 24
    ): Promise<{
        current: number;
        predicted: number;
        trend: 'INCREASING' | 'STABLE' | 'DECREASING';
        confidence: number;
    } | null> {
        // 获取最近48小时的数据用于预测
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - 48);

        const metrics = await prisma.deviceMetric.findMany({
            where: {
                deviceId,
                timestamp: { gte: startTime }
            },
            orderBy: { timestamp: 'asc' }
        });

        if (metrics.length < 10) {
            return null; // 数据点太少，无法预测
        }

        // 提取指标值
        const values = metrics.map(m => {
            const field = metric === 'cpu' ? 'cpuUsage' :
                         metric === 'memory' ? 'memoryUsage' :
                         'diskUsage';
            return m[field];
        }).filter((v): v is number => v !== null);

        if (values.length < 10) {
            return null;
        }

        // 简单线性回归
        const { slope, intercept } = this.linearRegression(values);

        const current = values[values.length - 1];
        const predicted = intercept + slope * (values.length + forecastHours);

        // 确定趋势
        let trend: 'INCREASING' | 'STABLE' | 'DECREASING';
        if (slope > 0.5) trend = 'INCREASING';
        else if (slope < -0.5) trend = 'DECREASING';
        else trend = 'STABLE';

        // 置信度 (基于数据点数量和方差)
        const variance = this.calculateVariance(values);
        const confidence = Math.max(0, Math.min(100, 100 - variance));

        return {
            current,
            predicted: Math.max(0, Math.min(100, predicted)),
            trend,
            confidence
        };
    }

    /**
     * 计算统计数据
     */
    private calculateStats(values: number[]) {
        if (values.length === 0) {
            return {
                avg: 0,
                max: 0,
                min: 0,
                latest: 0
            };
        }

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        const latest = values[values.length - 1];

        return {
            avg: Math.round(avg * 100) / 100,
            max,
            min,
            latest
        };
    }

    /**
     * 简单线性回归
     */
    private linearRegression(values: number[]): { slope: number; intercept: number } {
        const n = values.length;
        const xValues = Array.from({ length: n }, (_, i) => i);

        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * 计算方差
     */
    private calculateVariance(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}

export const trendAnalyzer = new TrendAnalyzer();
