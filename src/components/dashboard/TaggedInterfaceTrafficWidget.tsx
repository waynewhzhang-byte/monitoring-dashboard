'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ListChecks, Activity } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

interface InterfaceTraffic {
  id: string;
  name: string;
  deviceName: string;
  deviceIp: string;
  inBandwidth: string;
  outBandwidth: string;
  inBandwidthRaw: number;
  outBandwidthRaw: number;
  inUtilization: number;
  outUtilization: number;
  status: string;
  timestamp: Date;
}

interface TaggedInterfaceTrafficWidgetProps {
  title?: string;
  defaultTag?: string;
  className?: string;
  isVisible?: boolean; // Whether this component is currently visible (for pausing updates)
}

export const TaggedInterfaceTrafficWidget: React.FC<TaggedInterfaceTrafficWidgetProps> = ({
  title = "关键接口流量监控",
  defaultTag = '',
  className,
  isVisible = true
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(defaultTag);
  const [interfaces, setInterfaces] = useState<InterfaceTraffic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>('');

  // 订阅 WebSocket 实时更新
  const { lastUpdate } = useRealtimeUpdates();

  // Update selectedTag if defaultTag changes
  useEffect(() => {
    if (defaultTag) {
      setSelectedTag(defaultTag);
    }
  }, [defaultTag]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/interfaces/tags');
        const data = await response.json();
        const availableTags: string[] = data.tags || [];
        console.log(`[TaggedInterfaceTrafficWidget] Available tags:`, availableTags);
        // Ensure defaultTag is still selectable even if not yet present in DB tags list
        const merged = Array.from(new Set([
          ...availableTags,
          ...(defaultTag ? [defaultTag] : []),
          ...(selectedTag ? [selectedTag] : []),
        ])).filter(Boolean).sort();
        setTags(merged);

        // Auto-select first tag if available, or use defaultTag if provided
        if (defaultTag && (availableTags.includes(defaultTag) || merged.includes(defaultTag))) {
          setSelectedTag(defaultTag);
        } else if (merged.length > 0 && !selectedTag) {
          setSelectedTag(merged[0]);
        } else if (defaultTag && !selectedTag) {
          // Even if tag is not in list, try to use defaultTag (might be added later)
          setSelectedTag(defaultTag);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, [defaultTag]);

  // 数据获取函数
  const fetchTaggedTraffic = useCallback(async () => {
    if (!isVisible) return;

    const shouldFetchAll = !selectedTag;
    setLoading(true);
    try {
      setNotice('');
      const url = shouldFetchAll
        ? `/api/interfaces/realtime-traffic?tag=__all__`
        : `/api/interfaces/tagged-traffic?tag=${encodeURIComponent(selectedTag)}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        setInterfaces([]);
        return;
      }
      const data = await response.json();
      const list = data.interfaces || [];
      console.log(`[TaggedInterfaceTrafficWidget] Fetched ${list.length || 0} interfaces for ${shouldFetchAll ? 'ALL' : `tag "${selectedTag}"`}`);

      // If tag is set but no interfaces match, fallback to ALL (but keep a clear notice)
      if (!shouldFetchAll && selectedTag && list.length === 0) {
        setNotice(`未找到标签「${selectedTag}」的接口，当前展示全量接口 Top 流量（请在 /admin/interfaces 为接口添加该标签）`);
        const fallback = await fetch(`/api/interfaces/realtime-traffic?tag=__all__`);
        if (fallback.ok) {
          const fallbackJson = await fallback.json();
          setInterfaces(fallbackJson.interfaces || []);
          return;
        }
      }

      setInterfaces(list);
    } catch (error) {
      console.error('Failed to fetch tagged traffic:', error);
      setInterfaces([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTag, isVisible]);

  // 初始加载和定时轮询
  useEffect(() => {
    if (!isVisible) return;

    fetchTaggedTraffic();

    // 轮询降低到 60s，主要依靠 WebSocket 实时推送
    const interval = setInterval(fetchTaggedTraffic, 60000);
    return () => clearInterval(interval);
  }, [fetchTaggedTraffic, isVisible]);

  // WebSocket 实时更新 - 当收到 traffic:updated 事件时刷新
  useEffect(() => {
    if (lastUpdate && isVisible) {
      console.log('🔄 Received traffic update via WebSocket, refreshing...');
      fetchTaggedTraffic();
    }
  }, [lastUpdate, fetchTaggedTraffic, isVisible]);

  // Color mapping for different interface types
  const getColorClass = (index: number, status: string): string => {
    if (status === 'DOWN') return 'text-slate-500';

    const colors = [
      'text-cyan-400',
      'text-emerald-400',
      'text-orange-400',
      'text-slate-500',
      'text-blue-400',
      'text-purple-400',
      'text-pink-400',
      'text-yellow-400',
      'text-indigo-400'
    ];
    return colors[index % colors.length];
  };

  // Calculate utilization percentage for progress bar
  const getUtilization = (iface: InterfaceTraffic): number => {
    return Math.max(iface.inUtilization || 0, iface.outUtilization || 0);
  };

  return (
    <div className={`flex-1 panel-card rounded-xl p-4 flex flex-col ${className || ''}`}>
      <div className="panel-card-header px-2 py-1 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{title}</span>
        </div>

        {/* Tag Selector - Always show even if defaultTag is provided, to allow manual override */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-cyan-400 uppercase tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="" className="bg-slate-900">全量 (Top)</option>
              {tags.map(tag => (
                <option key={tag} value={tag} className="bg-slate-900">
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {notice && (
        <div className="mb-3 text-[8px] text-amber-300/90 border border-amber-500/20 bg-amber-500/10 rounded px-2 py-2 leading-relaxed">
          {notice}
        </div>
      )}

      {loading && interfaces.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
        </div>
      ) : interfaces.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-700 space-y-2 opacity-50">
          <Activity className="w-6 h-6 stroke-1" />
          <span className="text-[8px] uppercase tracking-widest font-bold text-center px-2">
            {selectedTag
              ? `标签 "${selectedTag}" 暂无接口数据\n(接口可能未设置此标签)`
              : '暂无接口数据'}
          </span>
          {tags.length === 0 && (
            <span className="text-[7px] text-slate-600 mt-2 text-center px-2">
              提示: 接口同步后需要在管理界面为接口添加标签才能在此显示
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
          {interfaces.map((iface, index) => {
            const colorClass = getColorClass(index, iface.status);
            const utilization = getUtilization(iface);
            const displayName = iface.name.length > 15 ? iface.name.substring(0, 15) + '...' : iface.name;

            return (
              <div
                key={iface.id}
                className="bg-white/5 rounded border border-white/5 p-3 flex flex-col justify-between hover:border-cyan-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase truncate" title={iface.name}>
                    {displayName}
                  </span>
                  {/* 接口状态指示器 */}
                  <div className={`w-2 h-2 rounded-full ${iface.status === 'UP' ? 'bg-emerald-400' :
                      iface.status === 'DOWN' ? 'bg-red-500' :
                        'bg-slate-600'
                    }`} title={`状态: ${iface.status}`} />
                </div>
                {/* 入流量 */}
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[7px] text-cyan-400 font-bold">↓</span>
                  <span className={`text-base font-black font-mono ${colorClass}`}>
                    {iface.inBandwidth}
                  </span>
                  <span className="text-[7px] text-slate-600 font-bold">BPS</span>
                </div>
                {/* 出流量 */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[7px] text-orange-400 font-bold">↑</span>
                  <span className={`text-base font-black font-mono ${colorClass}`}>
                    {iface.outBandwidth}
                  </span>
                  <span className="text-[7px] text-slate-600 font-bold">BPS</span>
                </div>
                <div className="mt-2 h-1 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${utilization > 80
                        ? 'bg-rose-500/60'
                        : utilization > 50
                          ? 'bg-orange-500/60'
                          : 'bg-cyan-500/40'
                      }`}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>
                {iface.deviceIp && (
                  <div className="text-[7px] text-slate-600 font-mono mt-1 truncate" title={iface.deviceIp}>
                    {iface.deviceIp}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
