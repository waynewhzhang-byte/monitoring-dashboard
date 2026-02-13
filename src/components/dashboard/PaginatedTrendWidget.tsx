import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, HardDrive, Zap, ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginatedTrendWidgetProps {
  title: string;
  deviceId?: string;
  type?: 'node' | 'interface';
}

export const PaginatedTrendWidget: React.FC<PaginatedTrendWidgetProps> = ({ title, deviceId }) => {
  const [activeTab, setActiveTab] = useState<'traffic' | 'cpu' | 'mem' | 'disk'>('traffic');

  // Mock historical data
  const data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: `${17 + Math.floor(i / 6)}:${(i % 6) * 10}`,
      trafficIn: Math.random() * 80 + 20,
      trafficOut: Math.random() * 60 + 10,
      cpu: Math.random() * 30 + 10,
      mem: Math.random() * 40 + 20,
      disk: Math.random() * 20 + 5,
    }));
  }, [deviceId]);

  const tabs = [
    { id: 'traffic', label: '流量', icon: Zap, color: '#0ea5e9' },
    { id: 'cpu', label: 'CPU', icon: Cpu, color: '#3b82f6' },
    { id: 'mem', label: '内存', icon: Activity, color: '#a855f7' },
    { id: 'disk', label: '磁盘', icon: HardDrive, color: '#ec4899' },
  ] as const;

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="cyber-panel rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header with Tab Navigation */}
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{title}</span>
        </div>
        
        <div className="flex bg-black/40 p-0.5 rounded border border-white/5 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-0.5 rounded text-[8px] font-black transition-all flex items-center gap-1 ${
                activeTab === tab.id 
                ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-2.5 h-2.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 py-2 flex items-center gap-6 bg-black/10">
        <div className="flex flex-col">
          <span className="text-[7px] text-slate-500 font-bold uppercase">当前值</span>
          <span className="text-sm font-black text-white font-mono">
            {activeTab === 'traffic' ? `${data[11].trafficIn.toFixed(1)} Mbps` : `${data[11][activeTab].toFixed(1)}%`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] text-slate-500 font-bold uppercase">峰值 (1H)</span>
          <span className="text-[10px] font-bold text-slate-300 font-mono">
            {activeTab === 'traffic' ? '92.4 Mbps' : '45.2%'}
          </span>
        </div>
        <div className="flex-1" />
        <div className={`p-2 rounded-full border border-current/20 bg-current/5`} style={{ color: currentTab.color }}>
          <currentTab.icon className="w-4 h-4" />
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-0 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentTab.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={currentTab.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 8, fill: '#475569' }}
              interval={2}
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', borderRadius: '4px' }}
              itemStyle={{ fontSize: '9px' }}
            />
            <Area
              type="monotone"
              dataKey={activeTab === 'traffic' ? 'trafficIn' : activeTab}
              stroke={currentTab.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color-${activeTab})`}
              animationDuration={1500}
            />
            {activeTab === 'traffic' && (
              <Area
                type="monotone"
                dataKey="trafficOut"
                stroke="#a855f7"
                strokeWidth={2}
                fill="none"
                strokeDasharray="4 4"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
