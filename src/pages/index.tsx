import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/widgets/StatCard';
import { AlarmList } from '@/components/domain/AlarmList';
import { Server, AlertTriangle, Activity, Wifi } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { Alarm, Device } from '@prisma/client';

export default function Dashboard() {
    const socket = useSocket();
    const [stats, setStats] = useState({
        totalDevices: 0,
        onlineDevices: 0,
        activeAlarms: 0,
        avgResponseTime: 0
    });
    const [recentAlarms, setRecentAlarms] = useState<Alarm[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            // Parallel fetch for stats and alarms
            const [devicesRes, alarmsRes] = await Promise.all([
                fetch('/api/devices?limit=1000'), // Get all for simple stats count
                fetch('/api/alarms?status=ACTIVE&limit=5')
            ]);

            const devicesData = await devicesRes.json();
            const alarmsData = await alarmsRes.json();

            const total = devicesData.data.length;
            const online = devicesData.data.filter((d: Device) => d.status === 'ONLINE').length;
            // Calculate avg response time from devices that have it
            const totalTime = devicesData.data.reduce((acc: number, d: Device & { metrics?: any[] }) => acc + (d.metrics?.[0]?.responseTime || 0), 0);
            const avgTime = online > 0 ? Math.round(totalTime / online) : 0;

            setStats({
                totalDevices: total,
                onlineDevices: online,
                activeAlarms: alarmsData.meta.total,
                avgResponseTime: avgTime
            });
            setRecentAlarms(alarmsData.data);
        } catch (e) {
            console.error('Data fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Real-time listener
    useEffect(() => {
        if (!socket) return;

        socket.on('alarms:new', (alarm: Alarm) => {
            setRecentAlarms(prev => [alarm, ...prev].slice(0, 5));
            setStats(prev => ({ ...prev, activeAlarms: prev.activeAlarms + 1 }));
        });

        // We could also listen for 'metrics:update' to update response time
        // but for summary it might be too frequent.
    }, [socket]);

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">监控大屏</h1>
                    <p className="text-slate-400">实时网络监控状态总览</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        label="设备总数"
                        value={stats.totalDevices}
                        icon={Server}
                    />
                    <StatCard
                        label="在线设备"
                        value={stats.onlineDevices}
                        icon={Wifi}
                        trend={{ value: 100, isPositive: true }}
                    />
                    <StatCard
                        label="当前告警"
                        value={stats.activeAlarms}
                        icon={AlertTriangle}
                        className={stats.activeAlarms > 0 ? 'border-rose-500/50 bg-rose-500/5' : ''}
                    />
                    <StatCard
                        label="平均响应"
                        value={`${stats.avgResponseTime}ms`}
                        icon={Activity}
                    />
                </div>

                {/* Recent Alarms */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-semibold mb-4">最新告警</h2>
                        <AlarmList
                            alarms={recentAlarms}
                            onAcknowledge={async (id) => {
                                await fetch(`/api/alarms/${id}/ack`, { method: 'POST' });
                                fetchData(); // Refresh to remove or update status
                            }}
                            isLoading={loading}
                        />
                    </div>
                    {/* Context/Topology Helper could go here */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="font-semibold text-slate-200 mb-4">系统状态</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">采集服务</span>
                                <span className="text-emerald-400 font-medium">运行中</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">OpManager 连接</span>
                                <span className="text-emerald-400 font-medium">已连接</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">最后刷新</span>
                                <span className="text-slate-200">刚刚</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
