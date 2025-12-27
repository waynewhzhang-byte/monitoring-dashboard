import React, { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { CriticalDevicesPanel } from '@/components/dashboard/CriticalDevicesPanel';
import { AlarmList } from '@/components/domain/AlarmList';

interface DashboardData {
    devices: {
        total: number;
        online: number;
        offline: number;
        warning: number;
        error: number;
        availability: number;
        healthScore: number;
    };
    alarms: {
        total: number;
        critical: number;
        recent: any[];
    };
    timestamp: string;
}

interface CriticalDevicesData {
    devices: any[];
    count: number;
    timestamp: string;
}

export default function DashboardPage() {
    const [overviewData, setOverviewData] = useState<DashboardData | null>(null);
    const [criticalDevices, setCriticalDevices] = useState<CriticalDevicesData | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);

    const socket = useSocket();

    // 获取总览数据
    const fetchOverviewData = async () => {
        try {
            const res = await fetch('/api/dashboard/overview');
            if (res.ok) {
                const data = await res.json();
                setOverviewData(data);
            }
        } catch (error) {
            console.error('Failed to fetch overview data:', error);
        }
    };

    // 获取关键设备数据
    const fetchCriticalDevices = async () => {
        try {
            const res = await fetch('/api/dashboard/critical-devices');
            if (res.ok) {
                const data = await res.json();
                setCriticalDevices(data);
            }
        } catch (error) {
            console.error('Failed to fetch critical devices:', error);
        }
    };

    // 初始加载
    useEffect(() => {
        Promise.all([
            fetchOverviewData(),
            fetchCriticalDevices()
        ]).finally(() => setLoading(false));

        // 每30秒刷新一次数据
        const interval = setInterval(() => {
            fetchOverviewData();
            fetchCriticalDevices();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // 更新时钟
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // WebSocket 实时更新
    useEffect(() => {
        if (!socket) return;

        // 订阅告警更新
        socket.emit('subscribe:alarms');

        // 监听新告警
        socket.on('alarm:new', () => {
            fetchOverviewData();
            fetchCriticalDevices();
        });

        // 监听告警解决
        socket.on('alarm:resolved', () => {
            fetchOverviewData();
        });

        // 监听设备更新
        socket.on('device:updated', () => {
            fetchOverviewData();
            fetchCriticalDevices();
        });

        return () => {
            socket.off('alarm:new');
            socket.off('alarm:resolved');
            socket.off('device:updated');
        };
    }, [socket]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white text-xl">加载中...</div>
            </div>
        );
    }

    if (!overviewData) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-red-400 text-xl">数据加载失败</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* 头部 */}
            <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 px-8 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            智能监控大屏系统
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Intelligent Monitoring Dashboard
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-cyan-400">
                            {currentTime.toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">
                            {currentTime.toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                            })}
                        </div>
                    </div>
                </div>
            </header>

            {/* 主内容区 */}
            <main className="p-8">
                {/* 总览统计 */}
                <div className="mb-8">
                    <OverviewStats data={overviewData} />
                </div>

                {/* 主要内容区域 - 三栏布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧 - 关键设备 */}
                    <div className="lg:col-span-1">
                        <CriticalDevicesPanel
                            devices={criticalDevices?.devices || []}
                        />
                    </div>

                    {/* 中间 - 网络拓扑或其他可视化 */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                网络拓扑
                            </h3>
                            <div className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-500">
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <p>网络拓扑视图</p>
                                    <a href="/topology" className="text-cyan-400 text-sm hover:underline mt-2 inline-block">
                                        查看详情 →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧 - 实时告警 */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                    实时告警
                                </h3>
                                <a href="/alarms" className="text-cyan-400 text-sm hover:underline">
                                    查看全部 →
                                </a>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {overviewData.alarms.recent.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8">
                                        ✓ 无活动告警
                                    </div>
                                ) : (
                                    overviewData.alarms.recent.map((alarm: any) => (
                                        <div
                                            key={alarm.id}
                                            className={`p-3 rounded-lg border ${
                                                alarm.severity === 'CRITICAL'
                                                    ? 'bg-red-500/10 border-red-500/30'
                                                    : alarm.severity === 'MAJOR'
                                                    ? 'bg-orange-500/10 border-orange-500/30'
                                                    : alarm.severity === 'MINOR'
                                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                                    : 'bg-blue-500/10 border-blue-500/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-white">
                                                        {alarm.title}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        {alarm.device.displayName || alarm.device.name}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                                        alarm.severity === 'CRITICAL'
                                                            ? 'bg-red-500 text-white'
                                                            : alarm.severity === 'MAJOR'
                                                            ? 'bg-orange-500 text-white'
                                                            : alarm.severity === 'MINOR'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-blue-500 text-white'
                                                    }`}
                                                >
                                                    {alarm.severity}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-2">
                                                {new Date(alarm.occurredAt).toLocaleString('zh-CN')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* 自定义滚动条样式 */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(30, 41, 59, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.5);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.7);
                }
            `}</style>
        </div>
    );
}
