import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TopRankingChartProps {
  title: string;
  metric: 'cpu' | 'mem' | 'traffic';
}

export const TopRankingChart: React.FC<TopRankingChartProps> = ({ title, metric }) => {
  // Mock data for multiple devices
  const data = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      time: `${15}: ${40 + i * 10}`,
      'PROD-DB-01': Math.random() * 40 + 20,
      'PROD-APP-02': Math.random() * 30 + 10,
      'COR-SW-01': Math.random() * 20 + 5,
      'WAF-EXT-01': Math.random() * 50 + 30,
    }));
  }, []);

  const devices = ['PROD-DB-01', 'PROD-APP-02', 'COR-SW-01', 'WAF-EXT-01'];
  const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e'];

  return (
    <div className="cyber-panel rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-cyan-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{title}排行榜</span>
        </div>
        <span className="text-[10px] font-black text-cyan-400 font-mono italic">TOP_4_ENTITIES</span>
      </div>

      <div className="flex-1 flex p-4 gap-4">
        {/* Large Percentage Display */}
        <div className="w-24 flex flex-col justify-center items-center border-r border-white/5 pr-4">
          <span className="text-4xl font-black text-cyan-400 font-mono italic leading-none">50<span className="text-xs ml-1">%</span></span>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-2 text-center">平均利用率</span>
        </div>

        {/* Multi-line Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 8, fill: '#475569' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 8, fill: '#475569' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={20} 
                iconType="circle" 
                iconSize={6}
                wrapperStyle={{ fontSize: '8px', paddingTop: '10px' }}
              />
              {devices.map((device, idx) => (
                <Line
                  key={device}
                  type="monotone"
                  dataKey={device}
                  stroke={colors[idx]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 1 }}
                  animationDuration={2000}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
