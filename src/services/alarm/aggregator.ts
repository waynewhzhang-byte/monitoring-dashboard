import { prisma } from '@/lib/prisma';
import { AlarmSeverity, AlarmStatus } from '@prisma/client';

/**
 * 告警聚合服务
 * 提供告警的统计和聚合功能
 */
export class AlarmAggregator {
    /**
     * 获取告警统计信息
     */
    async getAlarmStats() {
        const [
            totalActive,
            criticalCount,
            majorCount,
            minorCount,
            warningCount,
            deviceAlarmCounts
        ] = await Promise.all([
            // 总活动告警数
            prisma.alarm.count({
                where: {
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                }
            }),

            // 严重告警数
            prisma.alarm.count({
                where: {
                    severity: AlarmSeverity.CRITICAL,
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                }
            }),

            // 重要告警数
            prisma.alarm.count({
                where: {
                    severity: AlarmSeverity.MAJOR,
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                }
            }),

            // 次要告警数
            prisma.alarm.count({
                where: {
                    severity: AlarmSeverity.MINOR,
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                }
            }),

            // 警告数
            prisma.alarm.count({
                where: {
                    severity: AlarmSeverity.WARNING,
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                }
            }),

            // 每个设备的告警数量（Top 10）
            prisma.alarm.groupBy({
                by: ['deviceId'],
                where: {
                    status: {
                        in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                    }
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 10
            })
        ]);

        return {
            total: totalActive,
            bySeverity: {
                critical: criticalCount,
                major: majorCount,
                minor: minorCount,
                warning: warningCount,
                info: 0 // 可以后续添加
            },
            topDevices: deviceAlarmCounts
        };
    }

    /**
     * 获取某个设备的所有活动告警（聚合显示）
     */
    async getDeviceAlarms(deviceId: string) {
        const alarms = await prisma.alarm.findMany({
            where: {
                deviceId,
                status: {
                    in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                }
            },
            orderBy: [
                { severity: 'desc' },
                { occurredAt: 'desc' }
            ]
        });

        return alarms;
    }

    /**
     * 获取告警趋势数据（按小时统计）
     * @param hours 统计的小时数，默认24小时
     */
    async getAlarmTrends(hours: number = 24) {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - hours);

        const alarms = await prisma.alarm.findMany({
            where: {
                occurredAt: {
                    gte: startTime
                }
            },
            select: {
                occurredAt: true,
                severity: true
            }
        });

        // 按小时分组统计
        const hourlyStats: Record<string, {
            total: number;
            critical: number;
            major: number;
            minor: number;
            warning: number;
        }> = {};

        alarms.forEach(alarm => {
            const hour = new Date(alarm.occurredAt);
            hour.setMinutes(0, 0, 0);
            const hourKey = hour.toISOString();

            if (!hourlyStats[hourKey]) {
                hourlyStats[hourKey] = {
                    total: 0,
                    critical: 0,
                    major: 0,
                    minor: 0,
                    warning: 0
                };
            }

            hourlyStats[hourKey].total++;

            switch (alarm.severity) {
                case AlarmSeverity.CRITICAL:
                    hourlyStats[hourKey].critical++;
                    break;
                case AlarmSeverity.MAJOR:
                    hourlyStats[hourKey].major++;
                    break;
                case AlarmSeverity.MINOR:
                    hourlyStats[hourKey].minor++;
                    break;
                case AlarmSeverity.WARNING:
                    hourlyStats[hourKey].warning++;
                    break;
            }
        });

        // 转换为数组并排序
        return Object.entries(hourlyStats)
            .map(([time, stats]) => ({
                time,
                ...stats
            }))
            .sort((a, b) => a.time.localeCompare(b.time));
    }

    /**
     * 按类别聚合告警
     */
    async getAlarmsByCategory() {
        const alarms = await prisma.alarm.groupBy({
            by: ['category'],
            where: {
                status: {
                    in: [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED]
                }
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });

        return alarms.map(item => ({
            category: item.category,
            count: item._count.id
        }));
    }
}

export const alarmAggregator = new AlarmAggregator();
