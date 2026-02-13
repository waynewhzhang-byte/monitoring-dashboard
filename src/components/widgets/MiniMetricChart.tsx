import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface MiniMetricChartProps {
  data: { value: number }[];
  color?: string;
}

export const MiniMetricChart: React.FC<MiniMetricChartProps> = ({ data, color = '#3b82f6' }) => {
  return (
    <div className="w-full h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
