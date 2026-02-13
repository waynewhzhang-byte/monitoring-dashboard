import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { Alarm, AlarmSeverity, AlarmStatus } from '@prisma/client';

/**
 * 告警去重服务
 * 基于 Redis 实现告警去重，避免短时间内产生重复告警
 */
export class AlarmDeduplicator {
    // 去重时间窗口（秒）
    private readonly DEDUPE_WINDOW = 300; // 5分钟

    /**
     * 生成去重键
     * 格式: alarm:dedupe:{deviceId}:{category}:{severity}
     */
    private generateDedupeKey(alarm: {
        deviceId: string;
        category: string;
        severity: AlarmSeverity;
    }): string {
        return `alarm:dedupe:${alarm.deviceId}:${alarm.category}:${alarm.severity}`;
    }

    /**
     * 检查告警是否重复
     * @returns 如果是重复告警，返回已存在的告警ID；否则返回null
     */
    async checkDuplicate(alarm: {
        deviceId: string;
        category: string;
        severity: AlarmSeverity;
    }): Promise<string | null> {
        const key = this.generateDedupeKey(alarm);
        const existingAlarmId = await redis.get(key);
        return existingAlarmId;
    }

    /**
     * 处理告警（包含去重逻辑）
     * @returns 处理后的告警对象，如果是重复告警则返回null
     */
    async processAlarm(alarmData: {
        opmanagerId?: string;
        deviceId: string;
        severity: AlarmSeverity;
        category: string;
        title: string;
        message: string;
        occurredAt: Date;
    }): Promise<Alarm | null> {
        const dedupeKey = this.generateDedupeKey(alarmData);
        const existingAlarmId = await this.checkDuplicate(alarmData);

        if (existingAlarmId) {
            // 告警重复，更新发生次数
            console.log(`⚠️ Duplicate alarm detected for device ${alarmData.deviceId}, updating occurrence count...`);

            const updatedAlarm = await prisma.alarm.update({
                where: { id: existingAlarmId },
                data: {
                    occurrenceCount: { increment: 1 },
                    lastOccurrence: new Date(),
                    updatedAt: new Date()
                }
            });

            // 刷新 Redis TTL
            await redis.expire(dedupeKey, this.DEDUPE_WINDOW);

            return null; // 返回null表示这是重复告警，不需要推送
        }

        // 新告警，创建记录
        const newAlarm = await prisma.alarm.create({
            data: {
                ...alarmData,
                status: AlarmStatus.ACTIVE,
                occurrenceCount: 1,
                lastOccurrence: alarmData.occurredAt
            },
            include: {
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        ipAddress: true
                    }
                }
            }
        });

        // 将告警ID存入Redis，设置过期时间
        await redis.setex(dedupeKey, this.DEDUPE_WINDOW, newAlarm.id);

        console.log(`✅ New alarm created: ${newAlarm.id} (${newAlarm.severity})`);

        return newAlarm;
    }

    /**
     * 清除告警的去重标记
     * 当告警被解决或清除时调用
     */
    async clearDedupeMarker(alarm: Alarm): Promise<void> {
        const key = this.generateDedupeKey(alarm);
        await redis.del(key);
    }
}

export const alarmDeduplicator = new AlarmDeduplicator();
