import React, { useEffect, useState } from 'react';
import { StatusIndicator } from '../widgets/StatusIndicator';
import { MetricChart } from '../widgets/MetricChart';
import { X, Activity, HardDrive, Cpu, MemoryStick, Clock, MapPin } from 'lucide-react';

interface DeviceDetailPanelProps {
    deviceId: string;
    onClose: () => void;
}

export const DeviceDetailPanel: React.FC<DeviceDetailPanelProps> = ({ deviceId, onClose }) => {
    const [device, setDevice] = useState<any>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [alarms, setAlarms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeviceDetails();
        const interval = setInterval(fetchDeviceDetails, 30000); // 每30秒刷新
        return () => clearInterval(interval);
    }, [deviceId]);

    const fetchDeviceDetails = async () => {
        try {
            // 并行获取设备信息、指标和告警
            const [deviceRes, metricsRes, alarmsRes] = await Promise.all([
                fetch(`/api/devices/${deviceId}`),
                fetch(`/api/metrics/history?deviceId=${deviceId}&limit=50`),
                fetch(`/api/alarms?deviceId=${deviceId}&limit=10`)
            ]);

            if (deviceRes.ok) {
                const deviceData = await deviceRes.json();
                setDevice(deviceData);
            }

            if (metricsRes.ok) {
                const metricsData = await metricsRes.json();
                setMetrics(metricsData.data || []);
            }

            if (alarmsRes.ok) {
                const alarmsData = await alarmsRes.json();
                setAlarms(alarmsData.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch device details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-white">加载中...</div>
                </div>
            </div>
        );
    }

    if (!device) {
        return null;
    }

    const latestMetric = metrics[0];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <StatusIndicator status={device.status} />
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {device.displayName || device.name}
                            </h2>
                            <p className="text-sm text-slate-400">{device.ipAddress}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="text-slate-400" size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                <Activity size={16} />
                                <span>类型</span>
                            </div>
                            <div className="text-white font-medium">{device.type}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                <MapPin size={16} />
                                <span>位置</span>
                            </div>
                            <div className="text-white font-medium">{device.location || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                <Activity size={16} />
                                <span>厂商</span>
                            </div>
                            <div className="text-white font-medium">{device.vendor || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                <Activity size={16} />
                                <span>型号</span>
                            </div>
                            <div className="text-white font-medium">{device.model || 'N/A'}</div>
                        </div>
                    </div>

                    {/* Current Metrics */}
                    {latestMetric && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">实时指标</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                        <Cpu size={16} />
                                        <span>CPU 使用率</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className={`text-3xl font-bold ${
                                            latestMetric.cpuUsage > 80 ? 'text-red-400' :
                                            latestMetric.cpuUsage > 60 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                            {latestMetric.cpuUsage?.toFixed(1) || '--'}
                                        </div>
                                        <div className="text-slate-400 pb-1">%</div>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                        <MemoryStick size={16} />
                                        <span>内存使用率</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className={`text-3xl font-bold ${
                                            latestMetric.memoryUsage > 80 ? 'text-red-400' :
                                            latestMetric.memoryUsage > 60 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                            {latestMetric.memoryUsage?.toFixed(1) || '--'}
                                        </div>
                                        <div className="text-slate-400 pb-1">%</div>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                        <HardDrive size={16} />
                                        <span>磁盘使用率</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className={`text-3xl font-bold ${
                                            latestMetric.diskUsage > 80 ? 'text-red-400' :
                                            latestMetric.diskUsage > 60 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                            {latestMetric.diskUsage?.toFixed(1) || '--'}
                                        </div>
                                        <div className="text-slate-400 pb-1">%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metric Charts */}
                    {metrics.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">性能趋势</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h4 className="text-sm text-slate-400 mb-2">CPU</h4>
                                    <MetricChart
                                        data={metrics.map(m => ({
                                            time: m.timestamp,
                                            value: m.cpuUsage
                                        }))}
                                        color="#06b6d4"
                                    />
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h4 className="text-sm text-slate-400 mb-2">内存</h4>
                                    <MetricChart
                                        data={metrics.map(m => ({
                                            time: m.timestamp,
                                            value: m.memoryUsage
                                        }))}
                                        color="#10b981"
                                    />
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h4 className="text-sm text-slate-400 mb-2">磁盘</h4>
                                    <MetricChart
                                        data={metrics.map(m => ({
                                            time: m.timestamp,
                                            value: m.diskUsage
                                        }))}
                                        color="#f59e0b"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alarms */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">相关告警</h3>
                        {alarms.length === 0 ? (
                            <div className="bg-slate-800/50 rounded-lg p-8 text-center text-slate-400">
                                ✓ 无活动告警
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alarms.map((alarm) => (
                                    <div
                                        key={alarm.id}
                                        className={`bg-slate-800/50 rounded-lg p-4 border-l-4 ${
                                            alarm.severity === 'CRITICAL'
                                                ? 'border-red-500'
                                                : alarm.severity === 'MAJOR'
                                                ? 'border-orange-500'
                                                : alarm.severity === 'MINOR'
                                                ? 'border-yellow-500'
                                                : 'border-blue-500'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-white">{alarm.title}</div>
                                                <div className="text-sm text-slate-400 mt-1">{alarm.message}</div>
                                                <div className="text-xs text-slate-500 mt-2">
                                                    {new Date(alarm.occurredAt).toLocaleString('zh-CN')}
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 text-xs rounded ${
                                                    alarm.severity === 'CRITICAL'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : alarm.severity === 'MAJOR'
                                                        ? 'bg-orange-500/20 text-orange-400'
                                                        : alarm.severity === 'MINOR'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                }`}
                                            >
                                                {alarm.severity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
