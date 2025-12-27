import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface TrafficItem {
    interfaceId: string;
    interfaceName: string;
    displayName: string | null;
    deviceName: string;
    deviceIp: string;
    deviceType: string;
    speed: number | null;
    inBandwidth: number | null;
    outBandwidth: number | null;
    totalBandwidth: number;
    inUtilization: number | null;
    outUtilization: number | null;
    totalUtilization: number;
    timestamp: string;
}

interface TopTrafficListProps {
    limit?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

export const TopTrafficList: React.FC<TopTrafficListProps> = ({
    limit = 10,
    autoRefresh = true,
    refreshInterval = 30000
}) => {
    const [trafficData, setTrafficData] = useState<TrafficItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTopTraffic = async () => {
        try {
            const res = await fetch(`/api/traffic/top?limit=${limit}`);
            if (res.ok) {
                const data = await res.json();
                setTrafficData(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch top traffic:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopTraffic();

        if (autoRefresh) {
            const interval = setInterval(fetchTopTraffic, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [limit, autoRefresh, refreshInterval]);

    const formatBandwidth = (bandwidth: number): string => {
        if (bandwidth >= 1000000000) {
            return `${(bandwidth / 1000000000).toFixed(2)} Gbps`;
        } else if (bandwidth >= 1000000) {
            return `${(bandwidth / 1000000).toFixed(2)} Mbps`;
        } else if (bandwidth >= 1000) {
            return `${(bandwidth / 1000).toFixed(2)} Kbps`;
        } else {
            return `${bandwidth.toFixed(2)} bps`;
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-800/50 rounded-lg p-6">
                <div className="text-center text-slate-400 py-8">加载中...</div>
            </div>
        );
    }

    if (trafficData.length === 0) {
        return (
            <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">流量 Top {limit}</h3>
                <div className="text-center text-slate-400 py-8">暂无流量数据</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">流量 Top {limit}</h3>
                <button
                    onClick={fetchTopTraffic}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                    刷新
                </button>
            </div>

            <div className="space-y-3">
                {trafficData.map((item, index) => (
                    <div
                        key={item.interfaceId}
                        className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm">
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="font-medium text-white">
                                        {item.displayName || item.interfaceName}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {item.deviceName} • {item.deviceIp}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-cyan-400">
                                    {formatBandwidth(item.totalBandwidth)}
                                </div>
                                {item.totalUtilization !== null && (
                                    <div className={`text-xs ${
                                        item.totalUtilization > 80 ? 'text-red-400' :
                                        item.totalUtilization > 60 ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        利用率: {item.totalUtilization.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="text-green-400" size={16} />
                                <div>
                                    <div className="text-xs text-slate-400">入流量</div>
                                    <div className="text-sm font-medium text-white">
                                        {item.inBandwidth ? formatBandwidth(item.inBandwidth) : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-orange-400" size={16} />
                                <div>
                                    <div className="text-xs text-slate-400">出流量</div>
                                    <div className="text-sm font-medium text-white">
                                        {item.outBandwidth ? formatBandwidth(item.outBandwidth) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {item.speed && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Activity size={12} />
                                    <span>接口速率: {formatBandwidth(item.speed)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
