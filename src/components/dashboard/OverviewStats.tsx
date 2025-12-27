import React from 'react';
import { StatusIndicator } from '../widgets/StatusIndicator';

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
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 系统健康度 */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">系统健康度</span>
                    <StatusIndicator
                        status={
                            data.devices.healthScore >= 90 ? 'ONLINE' :
                            data.devices.healthScore >= 70 ? 'WARNING' :
                            'ERROR'
                        }
                    />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                    {data.devices.healthScore}
                    <span className="text-lg text-slate-400 ml-1">分</span>
                </div>
                <div className="text-xs text-slate-500">
                    可用性 {data.devices.availability}%
                </div>
            </div>

            {/* 总设备数 */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">监控设备</div>
                <div className="text-3xl font-bold text-white mb-1">
                    {data.devices.total}
                    <span className="text-lg text-slate-400 ml-1">台</span>
                </div>
                <div className="flex gap-4 text-xs mt-2">
                    <span className="text-green-400">
                        ✓ {data.devices.online}
                    </span>
                    <span className="text-yellow-400">
                        ⚠ {data.devices.warning}
                    </span>
                    <span className="text-red-400">
                        ✕ {data.devices.offline + data.devices.error}
                    </span>
                </div>
            </div>

            {/* 在线设备 */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">在线设备</div>
                <div className="text-3xl font-bold text-green-400 mb-1">
                    {data.devices.online}
                </div>
                <div className="text-xs text-slate-500">
                    {data.devices.total > 0
                        ? Math.round((data.devices.online / data.devices.total) * 100)
                        : 0
                    }% 在线率
                </div>
            </div>

            {/* 活动告警 */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">活动告警</div>
                <div className="text-3xl font-bold text-orange-400 mb-1">
                    {data.alarms.total}
                </div>
                <div className="text-xs text-red-400">
                    {data.alarms.critical > 0 && `${data.alarms.critical} 严重告警`}
                    {data.alarms.critical === 0 && '无严重告警'}
                </div>
            </div>
        </div>
    );
};
