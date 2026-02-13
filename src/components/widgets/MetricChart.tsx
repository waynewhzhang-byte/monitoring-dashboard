import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface MetricChartProps {
    data: any[];
    dataKey?: string; // Optional, defaults to 'value'
    color?: string;
    height?: number;
    label?: string;
    type?: 'line' | 'area'; // Chart type
}

export const MetricChart: React.FC<MetricChartProps> = ({
    data,
    dataKey = 'value',
    color = '#3b82f6',
    height = 300,
    type = 'area'
}) => {
    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                        dataKey={data[0]?.time ? 'time' : 'timestamp'}
                        stroke="#64748b"
                        tickFormatter={(str) => {
                            const date = new Date(str);
                            return isNaN(date.getTime()) ? str : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }}
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                        itemStyle={{ color: '#f1f5f9' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    {type === 'area' ? (
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#gradient-${dataKey})`}
                        />
                    ) : (
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            fillOpacity={0}
                            fill="none"
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
