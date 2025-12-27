import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusIndicator } from '@/components/widgets/StatusIndicator';
import { MetricChart } from '@/components/widgets/MetricChart';
import { StatCard } from '@/components/widgets/StatCard';
import { Activity, Clock, Cpu, HardDrive } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { Device, Interface, DeviceMetric } from '@prisma/client';

type DeviceWithRelations = Device & {
    interfaces: Interface[];
    metrics: DeviceMetric[];
};

export default function DeviceDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const socket = useSocket();

    const [device, setDevice] = useState<DeviceWithRelations | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevice = async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/devices/${id}`);
            if (res.ok) {
                const data = await res.json();
                setDevice(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchHistory = async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/metrics/history?deviceId=${id}&range=1h`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (id) {
            Promise.all([fetchDevice(), fetchHistory()]).then(() => setLoading(false));
        }
    }, [id]);

    useEffect(() => {
        if (!socket || !id) return;

        // Listen for updates for this specific device
        const channel = `device:${id}`;
        socket.on(channel, (event: any, data: any) => {
            if (event === 'METRICS_UPDATE') {
                // Update current stats
                setDevice((prev) => prev ? ({
                    ...prev,
                    metrics: [data] // Only update latest
                }) : null);
                // Push to history
                setHistory(prev => [...prev.slice(-19), data]); // Keep last 20 points
            }
        });

        return () => { socket.off(channel); };
    }, [socket, id]);

    if (loading || !device) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">Loading...</div>
            </MainLayout>
        );
    }

    const latestMetric = device.metrics?.[0] || {};

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {device.displayName || device.name}
                            <StatusIndicator status={device.status} showLabel={false} />
                        </h1>
                        <p className="text-slate-400 mt-1">{device.ipAddress} • {device.type}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Settings</button>
                    </div>
                </div>

                {/* Real-time Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="CPU Load"
                        value={`${latestMetric.cpuUsage?.toFixed(1) || 0}%`}
                        icon={Cpu}
                        className="bg-slate-900"
                    />
                    <StatCard
                        label="Memory"
                        value={`${latestMetric.memoryUsage?.toFixed(1) || 0}%`}
                        icon={HardDrive}
                        className="bg-slate-900"
                    />
                    <StatCard
                        label="Response Time"
                        value={`${latestMetric.responseTime || 0}ms`}
                        icon={Clock}
                        className="bg-slate-900"
                    />
                    <StatCard
                        label="Uptime"
                        value={`${Math.floor(Number(latestMetric.uptime || 0) / 3600)}h`}
                        icon={Activity}
                        className="bg-slate-900"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-200 mb-4">CPU History</h3>
                        <MetricChart data={history} dataKey="cpuUsage" color="#3b82f6" height={250} />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-200 mb-4">Memory History</h3>
                        <MetricChart data={history} dataKey="memoryUsage" color="#10b981" height={250} />
                    </div>
                </div>

                {/* Interfaces */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="font-semibold text-slate-200">Interfaces</h3>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-400">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">MAC</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {device.interfaces?.map((iface: Interface) => (
                                <tr key={iface.id} className="hover:bg-slate-800/30">
                                    <td className="px-6 py-3 font-medium text-slate-200">{iface.name}</td>
                                    <td className="px-6 py-3 text-slate-400">{iface.type}</td>
                                    <td className="px-6 py-3 text-slate-500 font-mono">{iface.macAddress}</td>
                                    <td className="px-6 py-3">
                                        <span className={iface.status === 'UP' ? 'text-emerald-400' : 'text-slate-500'}>
                                            {iface.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}
