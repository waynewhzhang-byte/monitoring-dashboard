import React, { useEffect, useState } from 'react';
import { Layers, Server, Network, Cpu, HardDrive } from 'lucide-react';
import { getSelectedTag, getSelectedBusinessViewName } from '@/components/dashboard/DeviceTagSelector';

interface GroupedDevice {
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

interface BusinessViewGroup {
  viewName: string;
  viewDisplayName: string | null;
  servers: GroupedDevice[];
  networkDevices: GroupedDevice[];
}

/** 与后端 /admin 及 Prisma DeviceType 一致：仅过滤硬件服务器类型 */
export type ServerTypeFilter = 'SERVER' | 'STORAGE';

interface BusinessViewGroupedPanelProps {
  deviceType: 'servers' | 'network';
  title: string;
  selectedTag?: string; // Optional tag filter
  /** 仅当 deviceType=servers 时生效：只展示 type 为 SERVER 或 STORAGE 的设备 */
  serverTypeFilter?: ServerTypeFilter;
  isVisible?: boolean;
}

export const BusinessViewGroupedPanel: React.FC<BusinessViewGroupedPanelProps> = ({
  deviceType,
  title,
  selectedTag,
  serverTypeFilter,
  isVisible = true,
}) => {
  const [groups, setGroups] = useState<BusinessViewGroup[]>([]);
  const [taggedDevices, setTaggedDevices] = useState<GroupedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const tagFilter = selectedTag ? getSelectedTag(selectedTag) : undefined;
    const viewNameFilter = selectedTag ? getSelectedBusinessViewName(selectedTag) : undefined;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (tagFilter !== undefined) {
          // 按标签筛选
          const response = await fetch(
            `/api/dashboard/tagged-devices?tag=${encodeURIComponent(tagFilter)}&deviceType=${deviceType}`
          );
          const data = await response.json();
          setTaggedDevices(data.devices || []);
          setGroups([]);
        } else {
          // 按业务视图（全部或单选一个视图）
          const response = await fetch('/api/dashboard/grouped-devices');
          const data = await response.json();
          const allGroups: BusinessViewGroup[] = data.groups || [];
          if (viewNameFilter && viewNameFilter.trim() !== '') {
            setGroups(allGroups.filter((g) => g.viewName === viewNameFilter.trim()));
          } else {
            setGroups(allGroups);
          }
          setTaggedDevices([]);
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error);
        setGroups([]);
        setTaggedDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedTag, deviceType, isVisible]);

  if (loading && groups.length === 0 && taggedDevices.length === 0) {
    return (
      <div className="h-full animate-pulse bg-slate-900/40 rounded-lg border border-slate-800 flex items-center justify-center">
        <span className="text-slate-600 text-sm">加载中...</span>
      </div>
    );
  }

  // 按标签筛选时展示标签设备列表（硬件服务器 tab 可再按类型 SERVER/STORAGE 过滤）
  const tagFilter = selectedTag ? getSelectedTag(selectedTag) : undefined;
  const displayTaggedDevices =
    deviceType === 'servers' && serverTypeFilter
      ? taggedDevices.filter((d) => d.type === serverTypeFilter)
      : taggedDevices;

  if (tagFilter !== undefined) {
    if (displayTaggedDevices.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-2 opacity-50">
          <Layers className="w-8 h-8 stroke-1" />
          <span className="text-xs uppercase tracking-widest font-bold">
            {taggedDevices.length === 0 ? '无匹配标签的设备' : `无类型为 ${serverTypeFilter} 的设备`}
          </span>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col overflow-hidden panel-card rounded-lg shadow-2xl">
        <div className="panel-card-header px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {deviceType === 'servers' ? (
              <Server className="w-4 h-4 text-cyan-400" />
            ) : (
              <Network className="w-4 h-4 text-cyan-400" />
            )}
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest leading-none">
              {title}
            </h3>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            {displayTaggedDevices.length} 设备
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {displayTaggedDevices.map((device) => {
            const statusColor = device.status === 'Clear' || device.severity === '5' 
              ? 'bg-emerald-500' 
              : device.severity === '2' 
              ? 'bg-yellow-500' 
              : 'bg-rose-500';

            return (
              <div
                key={device.id}
                className="grid grid-cols-12 items-center px-2 py-2 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 rounded"
              >
                <div className="col-span-5 min-w-0">
                  <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                    {device.displayName}
                  </div>
                  <div className="text-[7px] text-slate-600 font-mono truncate">
                    {device.ipAddress}
                  </div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shadow-[0_0_5px_currentColor]`} />
                </div>

                <div className="col-span-6 flex flex-col gap-1 pl-2">
                  {/* CPU Bar */}
                  {(() => {
                    const cpu = Number(device.cpuUtilization);
                    const cpuVal = Number.isFinite(cpu) ? Math.min(100, Math.max(0, cpu)) : 0;
                    return (
                      <div className="flex items-center gap-2">
                        <Cpu className="w-2.5 h-2.5 text-blue-400" />
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              cpuVal > 80 ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${cpuVal}%` }}
                          />
                        </div>
                        <span className="text-[7px] font-mono text-slate-400 w-6 text-right">
                          {cpuVal.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                  {/* Memory Bar */}
                  {(() => {
                    const mem = Number(device.memUtilization);
                    const memVal = Number.isFinite(mem) ? Math.min(100, Math.max(0, mem)) : 0;
                    return (
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-2.5 h-2.5 text-purple-400" />
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              memVal > 80 ? 'bg-rose-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${memVal}%` }}
                          />
                        </div>
                        <span className="text-[7px] font-mono text-slate-400 w-6 text-right">
                          {memVal.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 按业务视图分组；硬件服务器 tab 可再按类型 SERVER/STORAGE 过滤（与后端 /admin 类型一致）
  const getDevicesForGroup = (group: BusinessViewGroup): GroupedDevice[] =>
    deviceType === 'servers'
      ? (serverTypeFilter ? group.servers.filter((d) => d.type === serverTypeFilter) : group.servers)
      : group.networkDevices;

  const filteredGroups = groups.filter((group) => getDevicesForGroup(group).length > 0);

  if (filteredGroups.length === 0) {
    const hasViewsButNoDevices = groups.length > 0;
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 px-4 text-center">
        <Layers className="w-8 h-8 stroke-1" />
        <span className="text-xs uppercase tracking-widest font-bold">
          {hasViewsButNoDevices ? '已配置业务视图，当前暂无设备数据' : '暂无业务视图数据'}
        </span>
        {hasViewsButNoDevices ? (
          <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
            已配置：{groups.map(g => g.viewDisplayName || g.viewName).join('、')}。请确认 OpManager 中该视图下是否有设备，并已在 管理后台 → 设备管理 执行「同步设备」。
          </p>
        ) : (
          <p className="text-[10px] text-slate-500 max-w-[200px]">
            请到 管理后台 → 业务视图 添加视图名称（与 OpManager 一致）。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden panel-card rounded-lg shadow-2xl">
      <div className="panel-card-header px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {deviceType === 'servers' ? (
            <Server className="w-4 h-4 text-cyan-400" />
          ) : (
            <Network className="w-4 h-4 text-cyan-400" />
          )}
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest leading-none">
            {title}
          </h3>
        </div>
        <div className="text-[9px] font-mono text-slate-500">
          {filteredGroups.length} 视图
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {filteredGroups.map((group) => {
          const devices = getDevicesForGroup(group);
          if (devices.length === 0) return null;

          return (
            <div key={group.viewName} className="space-y-2">
              {/* Business View Header */}
              <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/50 rounded border border-slate-800/50">
                <Layers className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {group.viewDisplayName || group.viewName || '未命名视图'}
                </span>
                <span className="text-[8px] text-slate-600 font-mono ml-auto">
                  {devices.length} 设备
                </span>
              </div>

              {/* Device List */}
              <div className="space-y-1">
                {devices.map((device) => {
                  const statusColor = device.status === 'Clear' || device.severity === '5' 
                    ? 'bg-emerald-500' 
                    : device.severity === '2' 
                    ? 'bg-yellow-500' 
                    : 'bg-rose-500';

                  return (
                    <div
                      key={device.id}
                      className="grid grid-cols-12 items-center px-2 py-2 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 rounded"
                    >
                      <div className="col-span-5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                          {device.displayName}
                        </div>
                        <div className="text-[7px] text-slate-600 font-mono truncate">
                          {device.ipAddress}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shadow-[0_0_5px_currentColor]`} />
                      </div>

                      <div className="col-span-6 flex flex-col gap-1 pl-2">
                        {/* CPU Bar - 使用 ?? 0 避免 API 未返回时显示异常 */}
                        {(() => {
                          const cpu = Number(device.cpuUtilization);
                          const cpuVal = Number.isFinite(cpu) ? Math.min(100, Math.max(0, cpu)) : 0;
                          return (
                            <div className="flex items-center gap-2">
                              <Cpu className="w-2.5 h-2.5 text-blue-400" />
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-1000 ${
                                    cpuVal > 80 ? 'bg-rose-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${cpuVal}%` }}
                                />
                              </div>
                              <span className="text-[7px] font-mono text-slate-400 w-6 text-right">
                                {cpuVal.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                        {/* Memory Bar */}
                        {(() => {
                          const mem = Number(device.memUtilization);
                          const memVal = Number.isFinite(mem) ? Math.min(100, Math.max(0, mem)) : 0;
                          return (
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-2.5 h-2.5 text-purple-400" />
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-1000 ${
                                    memVal > 80 ? 'bg-rose-500' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${memVal}%` }}
                                />
                              </div>
                              <span className="text-[7px] font-mono text-slate-400 w-6 text-right">
                                {memVal.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
