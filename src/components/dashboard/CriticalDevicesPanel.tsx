import React from 'react';
import { StatusIndicator } from '@/components/widgets/StatusIndicator';
import { DeviceStatus } from '@prisma/client';

interface Device {
    id: string;
    name: string;
    displayName: string | null;
    type: string;
    ipAddress: string;
    status: DeviceStatus;
    alarmCount: number;
    metrics: {
        cpuUsage: number | null;
        memoryUsage: number | null;
        diskUsage: number | null;
        responseTime: number | null;
    } | null;
}

interface CriticalDevicesPanelProps {
    devices: Device[];
}

export const CriticalDevicesPanel: React.FC<CriticalDevicesPanelProps> = ({ devices }) => {
    if (devices.length === 0) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">关键设备监控</h3>
                <div className="text-center text-slate-400 py-8">
                    ✓ 所有设备运行正常
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">关键设备监控</h3>
                <span className="text-sm text-slate-400">{devices.length} 台异常</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {devices.map((device) => (
                    <div
                        key={device.id}
                        className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <StatusIndicator status={device.status} />
                                    <h4 className="font-medium text-white">
                                        {device.displayName || device.name}
                                    </h4>
                                    {device.alarmCount > 0 && (
                                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                            {device.alarmCount} 告警
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {device.type} • {device.ipAddress}
                                </div>
                            </div>
                        </div>

                        {device.metrics && (
                            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-700">
                                <div>
                                    <div className="text-xs text-slate-500">CPU</div>
                                    <div className={`text-sm font-semibold ${
                                        device.metrics.cpuUsage && device.metrics.cpuUsage > 80
                                            ? 'text-red-400'
                                            : device.metrics.cpuUsage && device.metrics.cpuUsage > 60
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }`}>
                                        {device.metrics.cpuUsage?.toFixed(1) || '--'}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">内存</div>
                                    <div className={`text-sm font-semibold ${
                                        device.metrics.memoryUsage && device.metrics.memoryUsage > 80
                                            ? 'text-red-400'
                                            : device.metrics.memoryUsage && device.metrics.memoryUsage > 60
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }`}>
                                        {device.metrics.memoryUsage?.toFixed(1) || '--'}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">磁盘</div>
                                    <div className={`text-sm font-semibold ${
                                        device.metrics.diskUsage && device.metrics.diskUsage > 80
                                            ? 'text-red-400'
                                            : device.metrics.diskUsage && device.metrics.diskUsage > 60
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }`}>
                                        {device.metrics.diskUsage?.toFixed(1) || '--'}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
