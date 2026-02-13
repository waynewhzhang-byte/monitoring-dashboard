import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

export const TemperatureWidget: React.FC = () => {
  const [temp, setTemp] = useState(24.5);
  const [humidity, setHumidity] = useState(45);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const generateHistory = () => {
      return Array.from({ length: 20 }, (_, i) => ({
        val: 24 + Math.random() * 2
      }));
    };
    setHistory(generateHistory());

    const timer = setInterval(() => {
      setTemp(prev => Math.max(22, Math.min(28, prev + (Math.random() - 0.5) * 0.2)));
      setHumidity(prev => Math.max(30, Math.min(60, prev + (Math.random() - 0.5) * 0.5)));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full cyber-panel rounded-lg overflow-hidden relative">
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">机房环境监测</span>
        <Wind className="w-3 h-3 text-slate-500 animate-pulse" />
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <Thermometer className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase">温度</div>
              <div className="text-xl font-black text-white font-mono">
                {temp.toFixed(1)}<span className="text-[10px] ml-0.5 text-slate-400">°C</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase">湿度</div>
              <div className="text-xl font-black text-white font-mono">
                {Math.round(humidity)}<span className="text-[10px] ml-0.5 text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Trend Area */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 opacity-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Area 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#fb923c" 
                  fill="#fb923c" 
                  strokeWidth={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[7px] font-black text-slate-600 uppercase">
             <span>ENVIRONMENTAL_STABILITY</span>
             <span className="text-emerald-500">OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
