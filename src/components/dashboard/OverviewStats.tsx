import React from 'react';
import { StatusIndicator } from '@/components/widgets/StatusIndicator';

interface OverviewStatsProps {
    data: {
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
        };
    };
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({ data }) => {
    if (!data) return <div className="grid grid-cols-2 gap-3 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-800/50 rounded-lg border border-slate-700" />)}
    </div>;

    return (
        <div className="grid grid-cols-2 gap-3 h-full">
            {/* 系统健康度 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-500 text-[8px] uppercase tracking-widest font-black">系统健康度</span>
                    <StatusIndicator
                        status={
                            data.devices.healthScore >= 90 ? 'ONLINE' :
                            data.devices.healthScore >= 70 ? 'WARNING' :
                            'ERROR'
                        }
                    />
                </div>
                <div className="flex items-baseline gap-1">
                    <div className={`text-2xl font-black font-mono ${
                        data.devices.healthScore >= 90 ? 'text-emerald-400' :
                        data.devices.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                        {data.devices.healthScore}
                    </div>
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">指数</span>
                </div>
                <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${
                            data.devices.healthScore >= 90 ? 'bg-emerald-500' :
                            data.devices.healthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${data.devices.healthScore}%` }}
                    />
                </div>
            </div>

            {/* 监控设备 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
                <div className="text-slate-500 text-[8px] uppercase tracking-widest font-black mb-1">活跃节点</div>
                <div className="text-2xl font-black text-white font-mono">
                    {data.devices.total}
                </div>
                <div className="flex gap-2 text-[7px] mt-1 font-black">
                    <span className="text-emerald-500 uppercase">{data.devices.online} 在线</span>
                    <span className="text-rose-500 uppercase">{data.devices.offline + data.devices.error} 离线</span>
                </div>
            </div>

            {/* SLA 可用性 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
                <div className="text-slate-500 text-[8px] uppercase tracking-widest font-black mb-1">可用性 SLA</div>
                <div className="text-2xl font-black text-cyan-400 font-mono italic">
                    {Math.round(data.devices.availability)}%
                </div>
                <div className="text-[7px] text-slate-600 uppercase font-black">目标: 99.9%</div>
            </div>

            {/* 告警统计 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
                <div className="text-slate-500 text-[8px] uppercase tracking-widest font-black mb-1">威胁计数</div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                    {data.alarms.total}
                </div>
                <div className="text-[7px] text-rose-500 font-black uppercase flex items-center gap-1">
                   <div className="w-1 h-1 rounded-full bg-rose-500" /> {data.alarms.critical} 紧急
                </div>
            </div>
        </div>
    );
};
