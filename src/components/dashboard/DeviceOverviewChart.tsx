import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Globe, Server, Network } from 'lucide-react';

interface DeviceOverviewChartProps {
  stats: any;
}

export const DeviceOverviewChart: React.FC<DeviceOverviewChartProps> = ({ stats }) => {
  const total = stats?.devices?.total || 0;
  const networkDevices = Math.round(total * 0.4); // Mock proportions
  const servers = Math.round(total * 0.3);
  const others = total - networkDevices - servers;

  const data = useMemo(() => [
    { name: '网络设备', value: networkDevices, color: '#0ea5e9' },
    { name: '服务器', value: servers, color: '#8b5cf6' },
    { name: '其他', value: others, color: '#64748b' },
  ], [networkDevices, servers, others]);

  return (
    <div className="cyber-panel rounded-lg flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">设备资产总览</span>
        <span className="text-[10px] font-mono text-slate-500">{total} UNITS</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <span className="text-2xl font-black text-white font-mono">{total}</span>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">总资产数</span>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  fillOpacity={0.8}
                  style={{ filter: `drop-shadow(0 0 8px ${entry.color}44)` }}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-1 p-3 bg-black/20">
        <div className="flex flex-col items-center p-1.5 rounded bg-white/5 border border-white/5">
          <Network className="w-3 h-3 text-cyan-400 mb-1" />
          <span className="text-[10px] font-black text-white">{networkDevices}</span>
          <span className="text-[7px] text-slate-500 font-bold uppercase">网络</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded bg-white/5 border border-white/5">
          <Server className="w-3 h-3 text-purple-400 mb-1" />
          <span className="text-[10px] font-black text-white">{servers}</span>
          <span className="text-[7px] text-slate-500 font-bold uppercase">服务器</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded bg-white/5 border border-white/5">
          <Globe className="w-3 h-3 text-slate-400 mb-1" />
          <span className="text-[10px] font-black text-white">{others}</span>
          <span className="text-[7px] text-slate-500 font-bold uppercase">其他</span>
        </div>
      </div>
    </div>
  );
};
