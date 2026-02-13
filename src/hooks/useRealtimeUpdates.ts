import { useEffect, useCallback, useState } from 'react';
import { useSocket } from './useSocket';
import { BroadcastEvent } from '@/types/broadcast';

/**
 * 实时数据更新 Hook
 * 监听 Socket.io 事件，自动更新设备、接口、告警等数据
 */
export function useRealtimeUpdates() {
    const socket = useSocket();
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const [isConnected, setIsConnected] = useState(false);

    // 强制刷新触发器（通过更新时间戳触发重新渲染）
    const triggerRefresh = useCallback(() => {
        setLastUpdate(Date.now());
    }, []);

    useEffect(() => {
        if (!socket) return;

        console.log('🔌 Setting up realtime updates...');

        // 连接状态监听
        socket.on('connect', () => {
            console.log('✅ Socket connected - realtime updates active');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected - realtime updates paused');
            setIsConnected(false);
        });

        // 1. 设备指标更新（CPU、内存、磁盘等）
        socket.on(BroadcastEvent.METRICS_UPDATE, (data) => {
            console.log('📊 Metrics update received:', data);
            triggerRefresh();
        });

        // 2. 设备状态更新
        socket.on(BroadcastEvent.DEVICE_UPDATE, (data) => {
            console.log('🖥️ Device update received:', data);
            triggerRefresh();
        });

        // 3. 告警更新
        socket.on(BroadcastEvent.ALARM_NEW, (alarm) => {
            console.log('🚨 New alarm:', alarm);
            triggerRefresh();
        });

        socket.on(BroadcastEvent.ALARM_UPDATE, (alarm) => {
            console.log('🔄 Alarm updated:', alarm);
            triggerRefresh();
        });

        socket.on(BroadcastEvent.ALARM_RESOLVED, (alarm) => {
            console.log('✅ Alarm resolved:', alarm);
            triggerRefresh();
        });

        // 4. 拓扑更新
        socket.on('topology:updated', (data) => {
            console.log('🗺️ Topology updated:', data);
            triggerRefresh();
        });

        // 5. 接口流量更新
        socket.on('traffic:updated', (data) => {
            console.log('📈 Traffic updated:', data);
            triggerRefresh();
        });

        // 6. 统计数据更新
        socket.on('stats:updated', (data) => {
            console.log('📊 Stats updated:', data);
            triggerRefresh();
        });

        // 清理监听器
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off(BroadcastEvent.METRICS_UPDATE);
            socket.off(BroadcastEvent.DEVICE_UPDATE);
            socket.off(BroadcastEvent.ALARM_NEW);
            socket.off(BroadcastEvent.ALARM_UPDATE);
            socket.off(BroadcastEvent.ALARM_RESOLVED);
            socket.off('topology:updated');
            socket.off('traffic:updated');
            socket.off('stats:updated');
        };
    }, [socket, triggerRefresh]);

    return {
        isConnected,
        lastUpdate,      // 用于触发组件重新获取数据
        triggerRefresh,  // 手动触发刷新
    };
}

/**
 * 设备详情实时更新 Hook
 * 监听特定设备的更新事件
 */
export function useDeviceRealtimeUpdates(deviceId: string | null) {
    const socket = useSocket();
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    useEffect(() => {
        if (!socket || !deviceId) return;

        const deviceChannel = `device:${deviceId}`;
        console.log(`🔌 Subscribing to device updates: ${deviceChannel}`);

        // 订阅特定设备的更新
        socket.emit('subscribe:device', deviceId);

        // 监听设备特定的事件
        socket.on(deviceChannel, (data) => {
            console.log(`📊 Device ${deviceId} update:`, data);
            setLastUpdate(Date.now());
        });

        // 监听设备指标更新
        socket.on(`${deviceChannel}:metrics`, (data) => {
            console.log(`📈 Device ${deviceId} metrics:`, data);
            setLastUpdate(Date.now());
        });

        // 监听设备告警
        socket.on(`${deviceChannel}:alarm`, (alarm) => {
            console.log(`🚨 Device ${deviceId} alarm:`, alarm);
            setLastUpdate(Date.now());
        });

        return () => {
            socket.emit('unsubscribe:device', deviceId);
            socket.off(deviceChannel);
            socket.off(`${deviceChannel}:metrics`);
            socket.off(`${deviceChannel}:alarm`);
        };
    }, [socket, deviceId]);

    return { lastUpdate };
}

/**
 * 业务视图实时更新 Hook
 * 监听特定业务视图的拓扑变化
 */
export function useBusinessViewRealtimeUpdates(viewName: string | null) {
    const socket = useSocket();
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    useEffect(() => {
        if (!socket || !viewName) return;

        const viewChannel = `business-view:${viewName}`;
        console.log(`🔌 Subscribing to business view: ${viewChannel}`);

        socket.emit('subscribe:business-view', viewName);

        socket.on(viewChannel, (data) => {
            console.log(`🗺️ Business view ${viewName} updated:`, data);
            setLastUpdate(Date.now());
        });

        return () => {
            socket.emit('unsubscribe:business-view', viewName);
            socket.off(viewChannel);
        };
    }, [socket, viewName]);

    return { lastUpdate };
}
