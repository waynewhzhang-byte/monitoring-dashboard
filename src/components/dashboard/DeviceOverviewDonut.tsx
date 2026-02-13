import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DeviceOverviewDonutProps {
  data: any;
  isVisible?: boolean; // Whether this component is currently visible (for preventing Recharts warnings)
}

export const DeviceOverviewDonut: React.FC<DeviceOverviewDonutProps> = ({ data, isVisible = true }) => {
  const chartData = useMemo(() => {
    if (!data?.devices) return [];
    
    // Use actual device type breakdown from API
    const byType = data.devices.byType || {};

    // Backward/forward compatibility:
    // - If backend provides byType, show the breakdown
    // - Otherwise fall back to a single-slice chart using total/totalAll (avoid blank donut)
    const hasByType =
      typeof byType.network === 'number' ||
      typeof byType.server === 'number' ||
      typeof byType.other === 'number';

    if (hasByType) {
      return [
        { name: '网络设备', value: byType.network || 0, color: '#0ea5e9' },
        { name: '硬件服务器', value: byType.server || 0, color: '#8b5cf6' },
        { name: '其他', value: byType.other || 0, color: '#64748b' },
      ].filter(item => item.value > 0); // Only show categories with devices
    }

    const total = data?.devices?.totalAll || data?.devices?.total || 0;
    return total > 0 ? [{ name: '设备总数', value: total, color: '#0ea5e9' }] : [];
  }, [data]);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex flex-col h-full panel-card rounded-lg overflow-hidden">
      <div className="panel-card-header px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">设备总览</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        {isVisible ? (
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(14, 165, 233, 0.2)', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-slate-500 text-[8px] uppercase tracking-widest">图表加载中...</div>
          </div>
        )}
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-white font-mono tracking-tight">{data?.devices?.totalAll || total}</span>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">TOTAL DEVICES</span>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        {chartData.map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[8px] text-slate-400 font-bold whitespace-nowrap">{item.name}</span>
            </div>
            <span className="text-[10px] font-mono text-white font-black">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
