
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronRight, Cpu, Activity, HardDrive, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface MultiServerHistoryChartProps {
    viewName?: string;
    tag?: string; // Optional: if empty/undefined, shows all devices (deprecated, use internal tag selector)
    title: string;
    isVisible?: boolean; // Whether this component is currently visible (for pausing updates)
    limit?: number; // Number of devices to show (default 5)
    deviceTypes?: string[]; // Optional: filter by device types (e.g., ['SERVER', 'STORAGE'])
}

interface DeviceMetric {
    timestamp: string;
    value: number;
}

interface ChartDataPoint {
    time: string;
    [key: string]: number | string; // deviceName: value
}

export const MultiServerHistoryChart: React.FC<MultiServerHistoryChartProps> = ({
    viewName,
    tag: propTag,
    title,
    isVisible = true,
    limit = 5,
    deviceTypes
}) => {
    const [metricType, setMetricType] = useState<'cpu' | 'memory' | 'disk' | 'network'>('cpu');
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tags, setTags] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>(propTag || '');

    // Colors for different lines
    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

    // Fetch available device tags
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await fetch('/api/devices/tags');
                const data = await response.json();
                const availableTags = data.tags || [];
                setTags(availableTags);
                
                // Auto-select first tag if available and no tag is set
                if (availableTags.length > 0 && !selectedTag && !propTag) {
                    setSelectedTag(availableTags[0]);
                } else if (propTag) {
                    setSelectedTag(propTag);
                }
            } catch (error) {
                console.error('Failed to fetch device tags:', error);
            }
        };

        fetchTags();
    }, [propTag]);

    // 1. Fetch Top N Devices
    useEffect(() => {
        // Skip data fetching if component is not visible
        if (!isVisible) {
            return;
        }

        const fetchDevices = async () => {
            try {
                setLoading(true);
                const queryParams = new URLSearchParams({
                    limit: limit.toString()
                });

                const tag = selectedTag || propTag;
                // Only add tags parameter if tag is provided and not empty
                if (tag && tag.trim() !== '') {
                    queryParams.append('tags', tag);
                }

                // Add viewName if provided
                if (viewName && viewName.trim() !== '') {
                    queryParams.append('viewName', viewName);
                }

                // Add device type filter if provided
                if (deviceTypes && deviceTypes.length > 0) {
                    // API now supports multiple types (comma-separated)
                    queryParams.append('type', deviceTypes.join(','));
                }

                const res = await fetch(`/api/devices?${queryParams.toString()}`);
                const json = await res.json();
                setDevices(json.data || []);
            } catch (error) {
                console.error('Failed to fetch devices for chart:', error);
            }
        };
        fetchDevices();
    }, [viewName, selectedTag, propTag, isVisible]); // Add isVisible to dependencies

    // 2. Fetch History for these devices
    useEffect(() => {
        // Skip data fetching if component is not visible
        if (!isVisible) {
            return;
        }

        if (devices.length === 0) {
            setChartData([]);
            setLoading(false);
            return;
        }

        const fetchHistory = async () => {
            try {
                setLoading(true);
                const promises = devices.map(async (device) => {
                    const res = await fetch(`/api/metrics/history?deviceId=${device.id}&range=1h`);
                    const data = await res.json();
                    return {
                        name: device.displayName || device.name,
                        data: data
                    };
                });

                const results = await Promise.all(promises);

                // Merge data into a single timeline
                // Assuming milestones align roughly, or we use the timestamp of the first device as reference
                // For simplicity, we'll bucket by minute
                const timeMap = new Map<string, ChartDataPoint>();

                results.forEach((deviceResult, index) => {
                    deviceResult.data.forEach((point: any) => {
                        const timeKey = new Date(point.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

                        if (!timeMap.has(timeKey)) {
                            timeMap.set(timeKey, { time: timeKey });
                        }

                        const entry = timeMap.get(timeKey)!;

                        let val = 0;
                        switch (metricType) {
                            case 'cpu': val = point.cpuUsage || 0; break;
                            case 'memory': val = point.memoryUsage || 0; break;
                            case 'disk': val = point.diskUsage || 0; break;
                            case 'network': val = (point.inBandwidth || 0) / 1024 / 1024; break; // Mbps? Approximate
                        }

                        entry[deviceResult.name] = val;
                    });
                });

                const sortedData = Array.from(timeMap.values()).sort((a, b) => a.time.localeCompare(b.time));
                setChartData(sortedData);
            } catch (error) {
                console.error('Failed to fetch metrics history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        const interval = isVisible ? setInterval(fetchHistory, 60000) : null;
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [devices, metricType, isVisible]); // Add isVisible to dependencies

    const getMetricIcon = (type: string) => {
        switch (type) {
            case 'cpu': return <Cpu className="w-3 h-3" />;
            case 'memory': return <Activity className="w-3 h-3" />;
            case 'disk': return <HardDrive className="w-3 h-3" />;
            case 'network': return <Zap className="w-3 h-3" />;
            default: return null;
        }
    }

    const getMetricLabel = (type: string) => {
        switch (type) {
            case 'cpu': return 'CPU';
            case 'memory': return '内存';
            case 'disk': return '磁盘';
            case 'network': return '网络';
            default: return '';
        }
    }

    return (
        <div className="flex flex-col h-full w-full panel-card rounded-lg overflow-hidden flex-1 min-h-0 min-w-0">
            <div className="panel-card-header px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-cyan-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Tag Selector */}
                    {tags.length > 0 && (
                        <select
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[8px] font-bold text-cyan-400 uppercase tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all"
                        >
                            <option value="" className="bg-slate-900">全部</option>
                            {tags.map(tag => (
                                <option key={tag} value={tag} className="bg-slate-900">
                                    {tag}
                                </option>
                            ))}
                        </select>
                    )}
                    <div className="flex bg-slate-900/50 rounded p-0.5 border border-white/5">
                    {['cpu', 'memory', 'disk', 'network'].map(t => (
                        <button
                            key={t}
                            onClick={() => setMetricType(t as any)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${metricType === t
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            {getMetricIcon(t)}
                            {getMetricLabel(t)}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 min-h-0 relative flex items-center justify-center">
                {!isVisible ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-[9px] uppercase tracking-widest">
                        图表加载中...
                    </div>
                ) : loading && chartData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-[9px] uppercase tracking-widest animate-pulse">
                        Loading Metrics...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                            <defs>
                                {devices.map((d, i) => (
                                    <linearGradient key={d.id} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" fontSize={9} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis fontSize={9} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
                            <Tooltip
                                contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                                itemStyle={{ padding: 0 }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                                align="center"
                                verticalAlign="bottom"
                            />
                            {devices.map((d, i) => (
                                <Area
                                    key={d.id}
                                    type="monotone"
                                    dataKey={d.displayName || d.name}
                                    stroke={colors[i % colors.length]}
                                    fill={`url(#color-${i})`}
                                    fillOpacity={1}
                                    strokeWidth={2}
                                    stackId="0"
                                    isAnimationActive={true}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
