import React from 'react';
import { Alarm } from '@prisma/client';
import { StatusIndicator } from '@/components/widgets/StatusIndicator';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AlarmListProps {
    alarms: (Alarm & { device?: { name: string } })[];
    onAcknowledge?: (id: string) => void;
    isLoading?: boolean;
    compact?: boolean;
}

export const AlarmList: React.FC<AlarmListProps> = ({ 
    alarms, 
    onAcknowledge = () => {}, 
    isLoading = false,
    compact = false 
}) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                <h3 className="font-semibold text-slate-200">实时告警列表</h3>
            </div>
            <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">加载中...</div>
                ) : alarms.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">当前无活动告警，系统运行正常</div>
                ) : (
                    alarms.map(alarm => (
                        <div key={alarm.id} className="p-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors">
                            <div className="mt-1">
                                <StatusIndicator severity={alarm.severity} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-slate-200 truncate">{alarm.title}</span>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(alarm.occurredAt), { addSuffix: true, locale: zhCN })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-2">{alarm.message}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <span>设备: <span className="text-slate-300">{alarm.device?.name || '未知设备'}</span></span>
                                    <span>•</span>
                                    <span>ID: {alarm.opmanagerId}</span>
                                </div>
                            </div>
                            {alarm.status === 'ACTIVE' && (
                                <button
                                    onClick={() => onAcknowledge(alarm.id)}
                                    title="确认告警"
                                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                >
                                    <CheckCircle2 size={18} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
