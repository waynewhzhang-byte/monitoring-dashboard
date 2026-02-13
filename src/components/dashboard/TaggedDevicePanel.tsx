import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, Activity } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

/** 来自 /api/devices：带 metrics 的本地设备 */
interface DeviceFromDevicesApi {
  id: string;
  displayName: string;
  status: string;
  ipAddress: string;
  type: string;
  metrics?: { cpuUsage: number; memoryUsage: number }[];
}

/** 来自 /api/dashboard/tagged-devices：带 cpuUtilization/memUtilization（OpManager 同源） */
interface DeviceFromTaggedApi {
  id: string;
  name: string;
  displayName: string;
  ipAddress: string;
  type: string;
  status: string;
  cpuUtilization: number;
  memUtilization: number;
  severity: string;
}

type Device = DeviceFromDevicesApi & Partial<DeviceFromTaggedApi>;

interface TaggedDevicePanelProps {
  tag?: string; // Optional: if empty/undefined, shows all devices
  title: string;
  compact?: boolean;
  hideHeader?: boolean;
  showDisk?: boolean;
  viewName?: string;
  isVisible?: boolean; // Whether this component is currently visible (for pausing updates)
}

export const TaggedDevicePanel: React.FC<TaggedDevicePanelProps> = ({ tag, title, compact, hideHeader, showDisk, viewName, isVisible = true }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // 订阅 WebSocket 实时更新
  const { lastUpdate } = useRealtimeUpdates();

  // 数据获取函数
  const fetchData = useCallback(async () => {
    if (!isVisible) return;

    try {
      setLoading(true);

      // 有 tag 时使用 tagged-devices（与「网络设备」同源 getBusinessDetailsView），带 CPU/内存
      if (tag && tag.trim() !== '') {
        const res = await fetch(
          `/api/dashboard/tagged-devices?tag=${encodeURIComponent(tag.trim())}&deviceType=all`
        );
        const json = await res.json();
        const list: DeviceFromTaggedApi[] = json.devices || [];
        setDevices(list as Device[]);
        return;
      }

      // 无 tag 时用 /api/devices（可能无 CPU/内存）
      const queryParams = new URLSearchParams({ limit: '8' });
      if (viewName && viewName.trim() !== '') queryParams.append('viewName', viewName);
      const res = await fetch(`/api/devices?${queryParams.toString()}`);
      const json = await res.json();
      let list = json.data || [];
      if (list.length === 0) {
        const fallback = await fetch(`/api/devices?limit=8`);
        const fallbackJson = await fallback.json();
        list = fallbackJson.data || [];
      }
      setDevices(list as Device[]);
    } catch (e) {
      console.error('[TaggedDevicePanel] Failed to fetch devices:', e);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [tag, viewName, isVisible]);

  // 初始加载和定时轮询
  useEffect(() => {
    if (!isVisible) return;

    fetchData();
    // 轮询降低到 60s，主要依靠 WebSocket 实时推送
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData, isVisible]);

  // WebSocket 实时更新 - 当收到 metrics:update 事件时刷新
  useEffect(() => {
    if (lastUpdate && isVisible) {
      console.log('🔄 Received device metrics update via WebSocket, refreshing...');
      fetchData();
    }
  }, [lastUpdate, fetchData, isVisible]);

  if (loading && devices.length === 0) return <div className="h-64 animate-pulse bg-slate-900/40 rounded-lg border border-slate-800" />;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${!hideHeader ? 'panel-card rounded-lg' : ''}`}>
      {!hideHeader && (
        <div className="panel-card-header px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest leading-none">{title}</h3>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            {devices.length} UNITS
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-2 py-1 text-[8px] font-black text-slate-500 uppercase tracking-tighter border-b border-white/5">
          <div className="col-span-4">名称</div>
          <div className="col-span-2 text-center">状态</div>
          <div className="col-span-6 text-right px-2">资源占用</div>
        </div>

        {devices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-2 opacity-50">
            <Activity className="w-6 h-6 stroke-1" />
            <span className="text-[8px] uppercase tracking-widest font-bold">无匹配资产数据</span>
          </div>
        ) : (
          devices.map(device => {
            // 优先用 tagged-devices 的 CPU/内存（与网络设备同源），否则用 /api/devices 的 metrics
            const cpuVal = Number(device.cpuUtilization ?? device.metrics?.[0]?.cpuUsage ?? 0);
            const memVal = Number(device.memUtilization ?? device.metrics?.[0]?.memoryUsage ?? 0);
            const cpu = Number.isFinite(cpuVal) ? Math.min(100, Math.max(0, cpuVal)) : 0;
            const mem = Number.isFinite(memVal) ? Math.min(100, Math.max(0, memVal)) : 0;
            const diskUsage = Math.round(Math.random() * 40 + 20); // Mock disk
            const statusColor = device.status === 'ONLINE' || device.status === 'Clear' ? 'bg-emerald-500' : 'bg-rose-500';

            return (
              <div key={device.id} className="grid grid-cols-12 items-center px-2 py-2 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
                <div className="col-span-4 min-w-0">
                  <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors uppercase">{device.displayName}</div>
                  <div className="text-[7px] text-slate-600 font-mono truncate">{device.ipAddress}</div>
                </div>

                <div className="col-span-2 flex justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shadow-[0_0_5px_currentColor]`} />
                </div>

                <div className="col-span-6 flex flex-col gap-1 pl-2">
                  {/* CPU Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[6px] text-slate-600 font-black w-3">C</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${cpu > 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
                        style={{ width: `${cpu}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-slate-400 w-5 text-right">{cpu}%</span>
                  </div>
                  {/* Mem Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[6px] text-slate-600 font-black w-3">M</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${mem > 80 ? 'bg-rose-500' : 'bg-purple-500'}`}
                        style={{ width: `${mem}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-slate-400 w-5 text-right">{mem}%</span>
                  </div>
                  {/* Disk Bar (Conditional) */}
                  {showDisk && (
                    <div className="flex items-center gap-2">
                      <span className="text-[6px] text-slate-600 font-black w-3">D</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 bg-pink-500"
                          style={{ width: `${diskUsage}%` }}
                        />
                      </div>
                      <span className="text-[7px] font-mono text-slate-400 w-5 text-right">{diskUsage}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!compact && (
        <div className="p-2 border-t border-white/5 bg-black/20">
          <button className="w-full py-1.5 flex items-center justify-center gap-2 text-[8px] font-black text-slate-500 hover:text-cyan-400 uppercase tracking-[0.2em] transition-all active:scale-95">
            资产详情看板 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
