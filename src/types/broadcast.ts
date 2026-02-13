/**
 * Broadcast event types
 * Shared between client and server
 */
export enum BroadcastEvent {
    METRICS_UPDATE = 'metrics:update',
    ALARM_NEW = 'alarm:new',
    ALARM_UPDATE = 'alarm:update',
    ALARM_RESOLVED = 'alarm:resolved',
    DEVICE_UPDATE = 'device:updated'
}
