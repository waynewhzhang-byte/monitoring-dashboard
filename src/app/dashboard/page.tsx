'use client';

import React, { useState, useEffect } from 'react';
import { ReactFlowTopologyViewer } from '@/components/topology/ReactFlowTopologyViewer';
import { AlarmRollingList } from '@/components/domain/AlarmRollingList';
import { TaggedDevicePanel } from '@/components/dashboard/TaggedDevicePanel';
import { DeviceOverviewDonut } from '@/components/dashboard/DeviceOverviewDonut';
import { PagingMetricWidget } from '@/components/dashboard/PagingMetricWidget';
import { TaggedInterfaceTrafficWidget } from '@/components/dashboard/TaggedInterfaceTrafficWidget';
import { MultiServerHistoryChart } from '@/components/widgets/MultiServerHistoryChart';
import { DeviceTagSelector, getSelectedTag, getSelectedBusinessViewName } from '@/components/dashboard/DeviceTagSelector';
import { BusinessViewGroupedPanel } from '@/components/dashboard/BusinessViewGroupedPanel';
import { ShieldCheck, Zap, Globe, Lock, Clock, Calendar, ChevronRight, Server, LayoutDashboard, Database, Network, ListChecks, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataSourceStatus {
  dataSource: 'opmanager' | 'mock';
  deviceCount: number;
  lastDeviceSyncAt: string | null;
  activeTopologyViews: number;
  hints: {
    useRealData?: string;
    useMockData?: string;
    noDevices?: string;
    noTopologyViews?: string;
  };
}

export default function DashboardPage() {
  // Tab 0 (Overview) specific: topology view (stored in localStorage)
  const [topologyView, setTopologyView] = useState<string>(''); // Default to Global
  const [stats, setStats] = useState<any>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Servers, 2: Network
  const [selectedServerTag, setSelectedServerTag] = useState<string>(''); // Tag filter for servers (empty = all)
  const [selectedServerTypeFilter, setSelectedServerTypeFilter] = useState<'SERVER' | 'STORAGE' | ''>(''); // 硬件服务器类型：SERVER | STORAGE | 全部
  const [selectedNetworkTag, setSelectedNetworkTag] = useState<string>(''); // Tag filter for network devices (empty = all)

  // Load topology view from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('dashboard-topology-view') || '';
    setTopologyView(savedView);
  }, []);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Auto-rotate tabs every 60 seconds
    const tabTimer = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 3);
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(tabTimer);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Use DB-backed overview stats to avoid OpManager/BV differences
      const response = await fetch(`/api/dashboard/overview`);
      const data = await response.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDataSourceStatus = async () => {
    try {
      const res = await fetch('/api/data-source');
      if (res.ok) {
        const data = await res.json();
        setDataSourceStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch data source status:', e);
    }
  };

  useEffect(() => {
    fetchDataSourceStatus();
    const interval = setInterval(fetchDataSourceStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const dataSourceBannerMessage =
    dataSourceStatus?.hints?.useMockData ||
    dataSourceStatus?.hints?.noDevices ||
    dataSourceStatus?.hints?.noTopologyViews ||
    null;
  const dataSourceBannerIsWarning = Boolean(
    dataSourceStatus?.hints?.useMockData ||
    dataSourceStatus?.hints?.noDevices ||
    dataSourceStatus?.hints?.noTopologyViews
  );
  const dataSourceBannerIsSuccess =
    !dataSourceBannerIsWarning && dataSourceStatus?.hints?.useRealData;

  if (!mounted) return null;

  return (
    <div className="h-screen bg-[#020617] text-slate-200 overflow-hidden flex flex-col font-sans relative">
      {/* Background Cyber Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e912_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e912_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
      </div>

      {/* Top Futuristic Header */}
      <header className="h-20 flex items-center justify-between px-10 relative z-[100] shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-cyan-500" />
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
                {now?.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-900/40 p-1 rounded-lg border border-white/5 backdrop-blur-md">
            {[
              { id: 0, label: '全屏总览', icon: LayoutDashboard },
              { id: 1, label: '硬件服务器', icon: Database },
              { id: 2, label: '网络设备', icon: Network },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[420px]">
          <div className="h-16 flex items-center justify-center border-b border-[var(--panel-border-subtle)]">
            <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase">
              智能监控可视化平台
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500 animate-pulse" />
              <span className="text-xl font-black font-mono text-white tracking-tighter shadow-cyan-500/20 drop-shadow-md">
                {now?.toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 transition-all group">
              <Lock className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 数据源状态提示：Mock / 未同步设备 / 未配置业务视图 / 真实数据 */}
      {(dataSourceBannerMessage || dataSourceBannerIsSuccess) && (
        <div
          className={`shrink-0 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium relative z-[90] ${
            dataSourceBannerIsWarning
              ? 'bg-amber-500/15 text-amber-400 border-b border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
          }`}
        >
          {dataSourceBannerIsWarning ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>
            {dataSourceBannerMessage || dataSourceStatus?.hints?.useRealData}
          </span>
          {dataSourceStatus?.dataSource === 'opmanager' && dataSourceStatus?.deviceCount > 0 && (
            <span className="text-slate-500 text-xs">
              设备 {dataSourceStatus.deviceCount} 台
              {dataSourceStatus.lastDeviceSyncAt
                ? ` · 最近同步 ${new Date(dataSourceStatus.lastDeviceSyncAt).toLocaleString('zh-CN')}`
                : ''}
            </span>
          )}
        </div>
      )}

      <main className="flex-1 p-6 min-h-0 relative z-10 overflow-hidden">

        {/* TAB 0: OVERVIEW - Topology, Assets, Alarms */}
        <div 
          className="h-full w-full flex flex-col overflow-hidden"
          style={{ display: activeTab === 0 ? 'flex' : 'none' }}
          data-tab-active={activeTab === 0}
        >
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
            <div className="col-span-3 flex flex-col gap-6 min-h-0">
              <div className="h-64 shrink-0">
                <DeviceOverviewDonut data={stats} isVisible={activeTab === 0} />
              </div>
              <div className="flex-1 min-h-0">
                <TaggedDevicePanel tag="核心" title="核心资产状态" isVisible={activeTab === 0} />
              </div>
            </div>

            <div className="col-span-6 panel-card rounded-3xl relative overflow-hidden group min-h-0">
              <div className="absolute inset-0 scanline opacity-10" />
              <div className="absolute inset-0">
                <ReactFlowTopologyViewer
                  viewName={topologyView}
                  isVisible={activeTab === 0}
                  onViewChange={setTopologyView}
                />
              </div>
            </div>

            <div className="col-span-3 flex flex-col gap-6 min-h-0">
              <div className="flex-1 panel-card rounded-xl overflow-hidden flex flex-col min-h-0">
                <div className="panel-card-header px-4 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-rose-500" />
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">全网实时告警</span>
                  </div>
                  <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
                  <AlarmRollingList isVisible={activeTab === 0} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: HARDWARE SERVERS - Server specific metrics */}
        <div 
          className="h-full w-full"
          style={{ display: activeTab === 1 ? 'flex' : 'none' }}
        >
          <div className="h-full w-full flex flex-col gap-6">
            {/* Tag + Type Filter */}
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">标签筛选:</span>
                <DeviceTagSelector 
                  selectedTag={selectedServerTag} 
                  onTagChange={setSelectedServerTag}
                  defaultLabel="全部服务器 (按业务视图分组)"
                />
                <span className="text-[8px] text-slate-600 italic">
                  {getSelectedTag(selectedServerTag) ? '(标签模式)' : getSelectedBusinessViewName(selectedServerTag) ? `(业务视图: ${getSelectedBusinessViewName(selectedServerTag)})` : '(业务视图模式)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">类型:</span>
                <select
                  value={selectedServerTypeFilter}
                  onChange={(e) => setSelectedServerTypeFilter((e.target.value || '') as '' | 'SERVER' | 'STORAGE')}
                  className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-cyan-400 uppercase tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all hover:border-cyan-500/30"
                >
                  <option value="" className="bg-slate-900">全部服务器</option>
                  <option value="SERVER" className="bg-slate-900">服务器 (SERVER)</option>
                  <option value="STORAGE" className="bg-slate-900">存储 (STORAGE)</option>
                </select>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
              <div className="min-h-0">
                <BusinessViewGroupedPanel 
                  deviceType="servers"
                  title={
                    getSelectedTag(selectedServerTag)
                      ? `标签: ${getSelectedTag(selectedServerTag)}`
                      : getSelectedBusinessViewName(selectedServerTag)
                        ? `业务视图: ${getSelectedBusinessViewName(selectedServerTag)}`
                        : '业务视图服务器分组'
                  }
                  selectedTag={selectedServerTag || undefined}
                  serverTypeFilter={selectedServerTypeFilter || undefined}
                  isVisible={activeTab === 1}
                />
              </div>
              <div className="min-h-0 flex flex-col">
                <MultiServerHistoryChart
                  title="服务器集群性能趋势"
                  isVisible={activeTab === 1}
                  deviceTypes={['SERVER', 'STORAGE']}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: NETWORK DEVICES - Switches & Firewalls, Interface Traffic */}
        <div 
          className="h-full w-full"
          style={{ display: activeTab === 2 ? 'flex' : 'none' }}
        >
          <div className="h-full w-full flex flex-col gap-6">
            {/* Tag Selector */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">标签筛选:</span>
                <DeviceTagSelector 
                  selectedTag={selectedNetworkTag} 
                  onTagChange={setSelectedNetworkTag}
                  defaultLabel="全部网络设备 (按业务视图分组)"
                />
                <span className="text-[8px] text-slate-600 italic">
                  {getSelectedTag(selectedNetworkTag) ? '(标签模式)' : getSelectedBusinessViewName(selectedNetworkTag) ? `(业务视图: ${getSelectedBusinessViewName(selectedNetworkTag)})` : '(业务视图模式)'}
                </span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-12 gap-6">
              {/* 1. 业务视图面板 (左侧列表) - 占2列 */}
              <div className="col-span-2 flex flex-col min-h-0">
                <BusinessViewGroupedPanel 
                  deviceType="network"
                  title={
                    getSelectedTag(selectedNetworkTag)
                      ? `标签: ${getSelectedTag(selectedNetworkTag)}`
                      : getSelectedBusinessViewName(selectedNetworkTag)
                        ? `业务视图: ${getSelectedBusinessViewName(selectedNetworkTag)}`
                        : '业务视图分组'
                  }
                  selectedTag={selectedNetworkTag || undefined}
                  isVisible={activeTab === 2}
                />
              </div>

              {/* 2. 核心性能趋势图 (中间) - 占4列 */}
              <div className="col-span-4 flex flex-col min-h-0">
                <MultiServerHistoryChart
                  title="核心网络设备性能趋势 (8台设备对比)"
                  limit={8}
                  isVisible={activeTab === 2}
                  deviceTypes={['SWITCH', 'ROUTER', 'FIREWALL', 'LOAD_BALANCER']}
                />
              </div>

              {/* 3. 上联监控 (右侧1) - 占3列 */}
              <div className="col-span-3 flex flex-col min-h-0">
                <TaggedInterfaceTrafficWidget 
                  title="上联出口流量监控"
                  defaultTag="上联"
                  isVisible={activeTab === 2} 
                />
              </div>

              {/* 4. 互联网出口监控 (右侧2) - 占3列 */}
              <div className="col-span-3 flex flex-col min-h-0">
                <TaggedInterfaceTrafficWidget 
                  title="互联网出口流量监控"
                  defaultTag="互联网出口"
                  isVisible={activeTab === 2} 
                />
              </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="h-10 border-t border-[var(--panel-border-subtle)] bg-slate-950/80 backdrop-blur-md px-10 flex items-center justify-between relative z-[100] shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-500/90 uppercase tracking-wider">智能引擎就绪</span>
          </div>
          <div className="h-4 w-px bg-[var(--panel-border-subtle)]" />
          <div className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            TAB: <span className="text-slate-400">0{activeTab + 1}</span>
          </div>
          <div className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            MODE: <span className="text-cyan-500/90">{activeTab === 0 ? 'TOTAL_VISIBILITY' : activeTab === 1 ? 'HARDWARE_COMPUTE' : 'NETWORK_FABRIC'}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-8 h-1 rounded-full transition-all duration-500 ${activeTab === i ? 'bg-cyan-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <span className="text-[8px] font-mono text-[var(--text-muted)]">
            v2.2.0-STABLE
          </span>
        </div>
      </footer>
    </div>
  );
}
