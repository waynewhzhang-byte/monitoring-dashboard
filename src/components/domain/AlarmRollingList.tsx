import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { AlertCircle, AlertTriangle, Info, Bell, ShieldCheck } from 'lucide-react';

interface Alarm {
  id: string;
  severity: string;
  title: string;
  message: string;
  occurredAt: string;
  device: {
    displayName: string;
  };
}

interface AlarmRollingListProps {
  viewName?: string;
  isVisible?: boolean; // Whether this component is currently visible (for pausing updates)
}

export const AlarmRollingList: React.FC<AlarmRollingListProps> = ({ viewName, isVisible = true }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlarms = useCallback(async () => {
    // Skip data fetching if component is not visible
    if (!isVisible) {
      return;
    }

    try {
      // Use DB-backed alarms API (business-view endpoint may not exist / may differ by environment)
      // Note: viewName filtering is not applied here; the big-screen overview uses global rolling list.
      const response = await fetch('/api/alarms?limit=20');
      const data = await response.json();
      const items = Array.isArray(data?.data) ? data.data : [];
      const mapped: Alarm[] = items.map((a: any) => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        message: a.message,
        occurredAt: a.occurredAt,
        device: {
          displayName: a.device?.displayName || a.device?.name || 'Unknown',
        },
      }));
      setAlarms(mapped);
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
    } finally {
      setLoading(false);
    }
  }, [viewName, isVisible]);

  useEffect(() => {
    // Skip data fetching if component is not visible
    if (!isVisible) {
      return;
    }

    fetchAlarms();
    const interval = setInterval(() => {
      if (isVisible) {
        fetchAlarms();
      }
    }, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchAlarms, isVisible]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-3 h-3 text-rose-500" />;
      case 'MAJOR':
      case 'WARNING':
        return <AlertTriangle className="w-3 h-3 text-amber-500" />;
      default:
        return <Info className="w-3 h-3 text-sky-500" />;
    }
  };

  if (loading && alarms.length === 0) {
    return <div className="p-4 text-slate-500 text-[8px] font-bold uppercase tracking-widest h-full flex items-center justify-center">正在加载实时告警...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1">
        {alarms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-2 opacity-50">
            <ShieldCheck className="w-6 h-6 stroke-1" />
            <span className="text-[8px] uppercase tracking-widest font-black italic">系统运行正常</span>
          </div>
        ) : (
          alarms.map((alarm) => (
            <div
              key={alarm.id}
              className={`px-3 py-2 border-l-2 transition-all hover:bg-white/5 group ${alarm.severity === 'CRITICAL' ? 'border-l-rose-500' :
                  alarm.severity === 'MAJOR' ? 'border-l-amber-500' : 'border-l-cyan-500'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">{getSeverityIcon(alarm.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-200 truncate uppercase tracking-tighter">
                      {alarm.device.displayName}
                    </span>
                    <span className="text-[7px] font-mono text-slate-600">
                      {format(new Date(alarm.occurredAt), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-tight truncate">
                    {alarm.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
