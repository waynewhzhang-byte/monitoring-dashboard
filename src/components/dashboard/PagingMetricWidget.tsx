import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Activity, Cpu, HardDrive, Zap } from 'lucide-react';

interface PagingMetricWidgetProps {
  title: string;
  type: 'core' | 'export' | 'aggregate';
  tag?: string; // Optional tag for filtering (deprecated, use internal tag selector)
  isVisible?: boolean; // Whether this component is currently visible (for pausing updates)
}

export const PagingMetricWidget: React.FC<PagingMetricWidgetProps> = ({ title, type, tag: propTag, isVisible = true }) => {
  const [currentPage, setCurrentPage] = useState<'traffic' | 'cpu' | 'memory' | 'disk'>('traffic');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(propTag || '');

  // Fetch available device tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/devices/tags');
        const data = await response.json();
        const availableTags = data.tags || [];
        setTags(availableTags);
        
        // Auto-select first tag if available and no tag is set
        if (availableTags.length > 0 && !selectedTag && !propTag) {
          setSelectedTag(availableTags[0]);
        } else if (propTag) {
          setSelectedTag(propTag);
        }
      } catch (error) {
        console.error('Failed to fetch device tags:', error);
      }
    };

    fetchTags();
  }, [propTag]);

  // Fetch historical data based on tag
  useEffect(() => {
    // Skip data fetching if component is not visible
    if (!isVisible) {
      return;
    }

    const fetchData = async () => {
      const tag = selectedTag || propTag;
      if (!tag) {
        // If no tag, generate mock data (fallback)
        const now = new Date();
        const mockData = Array.from({ length: 12 }, (_, i) => {
          const time = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
          return {
            time: time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            value: Math.round(Math.random() * 40 + (currentPage === 'traffic' ? 30 : 20)),
            value2: Math.round(Math.random() * 30 + 10),
          };
        });
        setData(mockData);
        return;
      }

      setLoading(true);
      try {
        // Fetch historical traffic data for the tag (using device tag)
        const response = await fetch(`/api/interfaces/tagged-traffic-history?tag=${encodeURIComponent(tag)}&range=1h&tagType=device`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          // Use real data
          setData(result.data.map((item: any) => ({
            time: item.time,
            value: currentPage === 'traffic' ? item.value : Math.round(item.inUtilization || 0),
            value2: currentPage === 'traffic' ? item.value2 : Math.round(item.outUtilization || 0),
          })));
        } else {
          // If no historical data, generate mock data
          const now = new Date();
          const mockData = Array.from({ length: 12 }, (_, i) => {
            const time = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
            return {
              time: time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
              value: Math.round(Math.random() * 40 + (currentPage === 'traffic' ? 30 : 20)),
              value2: Math.round(Math.random() * 30 + 10),
            };
          });
          setData(mockData);
        }
      } catch (error) {
        console.error('Failed to fetch traffic history:', error);
        // Fallback to mock data on error
        const now = new Date();
        const mockData = Array.from({ length: 12 }, (_, i) => {
          const time = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
          return {
            time: time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            value: Math.round(Math.random() * 40 + (currentPage === 'traffic' ? 30 : 20)),
            value2: Math.round(Math.random() * 30 + 10),
          };
        });
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds if tag is provided
    const tag = selectedTag || propTag;
    const interval = tag && isVisible ? setInterval(fetchData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTag, propTag, currentPage, isVisible]); // Add isVisible to dependencies

  const pages: ('traffic' | 'cpu' | 'memory' | 'disk')[] = ['traffic', 'cpu', 'memory'];
  if (type === 'export' || type === 'core') pages.push('disk');

  const rotatePage = (dir: 'next' | 'prev') => {
    const idx = pages.indexOf(currentPage);
    if (dir === 'next') {
      setCurrentPage(pages[(idx + 1) % pages.length]);
    } else {
      setCurrentPage(pages[(idx - 1 + pages.length) % pages.length]);
    }
  };

  const getPageIcon = () => {
    switch(currentPage) {
      case 'traffic': return <Zap className="w-3 h-3 text-cyan-400" />;
      case 'cpu': return <Cpu className="w-3 h-3 text-blue-400" />;
      case 'memory': return <Activity className="w-3 h-3 text-purple-400" />;
      case 'disk': return <HardDrive className="w-3 h-3 text-emerald-400" />;
    }
  };

  const getPageTitle = () => {
    switch(currentPage) {
      case 'traffic': return '实时流量 (Mbps)';
      case 'cpu': return 'CPU 利用率 (%)';
      case 'memory': return '内存使用率 (%)';
      case 'disk': return '磁盘利用率 (%)';
    }
  };

  const getColor = () => {
    switch(currentPage) {
      case 'traffic': return '#0ea5e9';
      case 'cpu': return '#3b82f6';
      case 'memory': return '#a855f7';
      case 'disk': return '#10b981';
    }
  };

  return (
    <div className="flex flex-col h-full cyber-panel rounded-lg overflow-hidden group">
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tag Selector */}
          {tags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[8px] font-bold text-cyan-400 uppercase tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="" className="bg-slate-900">全部</option>
              {tags.map(tag => (
                <option key={tag} value={tag} className="bg-slate-900">
                  {tag}
                </option>
              ))}
            </select>
          )}
          <button 
            onClick={() => rotatePage('prev')}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-slate-500 hover:text-cyan-400" />
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/50 rounded border border-white/5">
            {getPageIcon()}
            <span className="text-[8px] font-black text-slate-300 uppercase">{currentPage}</span>
          </div>
          <button 
            onClick={() => rotatePage('next')}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-slate-500 hover:text-cyan-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{getPageTitle()}</span>
          <span className="text-sm font-black text-white font-mono">
            {data[data.length-1]?.value}
            <span className="text-[8px] text-slate-600 ml-1">AVG</span>
          </span>
        </div>

        <div className="flex-1 min-h-0">
          {isVisible ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={`color-${currentPage}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColor()} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  fontSize={8} 
                  tick={{ fill: '#475569' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis fontSize={8} tick={{ fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(14, 165, 233, 0.2)', fontSize: '9px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getColor()} 
                  fillOpacity={1} 
                  fill={`url(#color-${currentPage})`} 
                  strokeWidth={2}
                  animationDuration={1000}
                />
                {currentPage === 'traffic' && (
                  <Area 
                    type="monotone" 
                    dataKey="value2" 
                    stroke="#8b5cf6" 
                    fillOpacity={0.1} 
                    fill="#8b5cf6" 
                    strokeWidth={1}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-slate-500 text-[8px] uppercase tracking-widest">图表加载中...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
