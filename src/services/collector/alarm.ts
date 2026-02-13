import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { AlarmSeverity, AlarmStatus } from '@prisma/client';
import { broadcaster, BroadcastEvent } from '@/services/broadcast';
import { alarmDeduplicator } from '@/services/alarm/deduplicator';

export class AlarmCollector {
    async syncAlarms() {
        console.log('🚨 Starting Alarm Sync...');
        try {
            // 添加重试机制，最多重试2次
            let opAlarms: any[] = [];
            let retries = 2;
            while (retries >= 0 && opAlarms.length === 0) {
                try {
                    opAlarms = await opClient.getAlarms();
                    if (opAlarms.length > 0) break;
                } catch (error: any) {
                    if (retries > 0 && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
                        console.warn(`⚠️ Timeout fetching alarms, retrying... (${retries} retries left)`);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 2000)); // 重试前等待2秒
                    } else {
                        throw error; // 非超时错误直接抛出
                    }
                }
            }
            
            if (opAlarms.length === 0 && retries < 0) {
                console.error('❌ Failed to fetch alarms after all retries');
                return;
            }

            let count = 0;
            let skippedCount = 0;
            for (const _opAlarm of opAlarms) {
                const opAlarm = _opAlarm as any;
                
                // Find internal device ID using name (which should match deviceName from OpManager)
                // Try multiple matching strategies:
                // 1. Match by name (deviceName from OpManager)
                // 2. Match by opmanagerId (if alarm has deviceName that matches opmanagerId)
                // 3. Match by displayName (fallback)
                const deviceName = opAlarm.name || (opAlarm as any).deviceName || '';
                let device = null;

                // Try matching by name first
                device = await prisma.device.findFirst({
                    where: { name: deviceName },
                    select: { id: true, name: true, opmanagerId: true, displayName: true }
                });

                // If not found by name, try matching by opmanagerId
                if (!device && deviceName) {
                    device = await prisma.device.findFirst({
                        where: { opmanagerId: deviceName },
                        select: { id: true, name: true, opmanagerId: true, displayName: true }
                    });
                }

                // If still not found, try matching by displayName (case-insensitive)
                if (!device && deviceName) {
                    device = await prisma.device.findFirst({
                        where: { 
                            displayName: {
                                contains: deviceName,
                                mode: 'insensitive'
                            }
                        },
                        select: { id: true, name: true, opmanagerId: true, displayName: true }
                    });
                }

                if (!device) {
                    console.warn(`⚠️ Device not found for alarm: ${deviceName} (alarmId: ${opAlarm.id})`);
                    console.warn(`   Alarm data:`, JSON.stringify({
                        id: opAlarm.id,
                        name: opAlarm.name,
                        deviceName: (opAlarm as any).deviceName,
                        severity: opAlarm.severity,
                        message: opAlarm.message?.substring(0, 50)
                    }));
                    skippedCount++;
                    continue;
                }

                // Map Severity (Handle both numeric and string values)
                // Real API returns numericSeverity: 1=Critical, 2=Problem, 3=Attention, 4=Service Down, 5=Normal
                let severity: AlarmSeverity;
                const s = opAlarm.severity.toString().toLowerCase();

                if (s === '1' || s === 'critical') severity = 'CRITICAL';
                else if (s === '2' || s === 'trouble' || s === 'major' || s === '问题') severity = 'MAJOR';
                else if (s === 'minor') severity = 'MINOR';
                else if (s === '3' || s === 'attention' || s === 'warning' || s === '注意') severity = 'WARNING';
                else if (s === '4' || s === 'service down') severity = 'CRITICAL'; // Service down treated as critical
                else if (s === '5' || s === 'normal' || s === '正常') severity = 'INFO'; // Normal/Clear alarms
                else severity = 'INFO';

                // 使用去重逻辑处理告警
                const newAlarm = await alarmDeduplicator.processAlarm({
                    opmanagerId: opAlarm.id, // This should be alarmId from real API
                    deviceId: device.id,
                    severity,
                    category: opAlarm.category,
                    title: opAlarm.message.substring(0, 100),
                    message: opAlarm.message,
                    occurredAt: new Date(opAlarm.modTime) // modTime should be ISO string from getAlarms()
                });

                // 只有新创建的告警才推送通知
                if (newAlarm) {
                    await broadcaster.emit('alarms', BroadcastEvent.ALARM_NEW, newAlarm);
                    await broadcaster.emit(`device:${device.id}`, BroadcastEvent.ALARM_NEW, newAlarm);
                    count++;
                }
            }
            console.log(`✅ Synced ${count} alarms.${skippedCount > 0 ? ` Skipped ${skippedCount} alarms (device not found).` : ''}`);
        } catch (error: any) {
            console.error('❌ Alarm Sync Failed:', error);
        }
    }
}

export const alarmCollector = new AlarmCollector();

