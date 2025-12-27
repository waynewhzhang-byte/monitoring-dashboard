import { prisma } from '../../lib/prisma';
import { opClient } from '../opmanager/client';
import { AlarmSeverity, AlarmStatus } from '@prisma/client';
import { broadcaster, BroadcastEvent } from '../broadcast';
import { alarmDeduplicator } from '../alarm/deduplicator';

export class AlarmCollector {
    async syncAlarms() {
        console.log('🚨 Starting Alarm Sync...');
        try {
            const opAlarms = await opClient.getAlarms();

            let count = 0;
            for (const opAlarm of opAlarms) {
                // Find internal device ID
                const device = await prisma.device.findUnique({
                    where: { opmanagerId: opAlarm.name },
                    select: { id: true }
                });

                if (!device) {
                    console.warn(`Device not found for alarm: ${opAlarm.name}`);
                    continue;
                }

                // Map Severity
                let severity: AlarmSeverity;
                const s = opAlarm.severity.toLowerCase();
                if (s === 'critical') severity = 'CRITICAL';
                else if (s === 'major') severity = 'MAJOR';
                else if (s === 'minor') severity = 'MINOR';
                else if (s === 'warning' || s === 'attention') severity = 'WARNING';
                else severity = 'INFO';

                // 使用去重逻辑处理告警
                const newAlarm = await alarmDeduplicator.processAlarm({
                    opmanagerId: opAlarm.id,
                    deviceId: device.id,
                    severity,
                    category: opAlarm.category,
                    title: opAlarm.message.substring(0, 100),
                    message: opAlarm.message,
                    occurredAt: new Date(opAlarm.modTime)
                });

                // 只有新创建的告警才推送通知
                if (newAlarm) {
                    await broadcaster.emit('alarms', BroadcastEvent.ALARM_NEW, newAlarm);
                    await broadcaster.emit(`device:${device.id}`, BroadcastEvent.ALARM_NEW, newAlarm);
                }
                count++;
            }
            console.log(`✅ Synced ${count} alarms.`);
        } catch (error) {
            console.error('❌ Alarm Sync Failed:', error);
        }
    }
}

export const alarmCollector = new AlarmCollector();

