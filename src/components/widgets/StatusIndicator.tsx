import React from 'react';
import { DeviceStatus, AlarmSeverity } from '@prisma/client';

interface StatusIndicatorProps {
    status?: DeviceStatus | string;
    severity?: AlarmSeverity | string;
    showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, severity, showLabel = true }) => {

    if (status) {
        let color = 'bg-slate-500';
        let label = status;

        switch (status) {
            case 'ONLINE': color = 'bg-emerald-500'; break;
            case 'OFFLINE': color = 'bg-rose-500'; break;
            case 'WARNING': color = 'bg-amber-500'; break;
            case 'ERROR': color = 'bg-rose-600'; break;
        }

        return (
            <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color} animate-pulse`} />
                {showLabel && <span className="text-sm font-medium uppercase text-slate-300">{label}</span>}
            </div>
        );
    }

    if (severity) {
        let styles = 'bg-slate-500/10 text-slate-500 border-slate-500/20';

        switch (severity) {
            case 'CRITICAL': styles = 'bg-rose-500/10 text-rose-500 border-rose-500/20'; break;
            case 'MAJOR': styles = 'bg-orange-500/10 text-orange-500 border-orange-500/20'; break;
            case 'MINOR': styles = 'bg-amber-500/10 text-amber-500 border-amber-500/20'; break;
            case 'WARNING': styles = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; break;
            case 'INFO': styles = 'bg-blue-500/10 text-blue-500 border-blue-500/20'; break;
        }

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${styles}`}>
                {severity}
            </span>
        );
    }

    return null;
};
