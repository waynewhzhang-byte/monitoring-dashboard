import React from 'react';
import { WidgetConfig, WidgetType } from '@/types/dashboard-config';
import { useWidgetData } from '@/hooks/useWidgetData';

// Widget组件映射
import { StatCard } from '../widgets/StatCard';
import { DeviceList } from '../domain/DeviceList';
import { AlarmList } from '../domain/AlarmList';
import { TopTrafficList } from '../traffic/TopTrafficList';
import { MetricChart } from '../widgets/MetricChart';
import { TopologyViewer } from '../domain/TopologyViewer';

interface WidgetRendererProps {
  widget: WidgetConfig;
}

/**
 * Widget渲染器
 * 根据Widget配置动态选择并渲染对应组件
 */
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  // 获取Widget数据
  const { data, loading, error } = useWidgetData(widget.dataSource);

  // 渲染加载状态
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-red-400">加载失败: {error.message}</div>
      </div>
    );
  }

  // 根据Widget类型渲染对应组件
  switch (widget.type) {
    case WidgetType.STAT_CARD:
      return (
        <StatCard
          title={widget.title || ''}
          value={data?.value || 0}
          unit={widget.config?.unit}
          trend={data?.trend}
          icon={widget.config?.icon}
          color={widget.config?.color}
        />
      );

    case WidgetType.DEVICE_LIST:
      return (
        <div className="h-full bg-slate-800/50 rounded-lg border border-slate-700 p-4 overflow-hidden">
          {widget.title && (
            <h3 className="text-lg font-semibold text-white mb-4">{widget.title}</h3>
          )}
          <DeviceList devices={data || []} compact={widget.config?.compact} />
        </div>
      );

    case WidgetType.ALARM_LIST:
      return (
        <div className="h-full bg-slate-800/50 rounded-lg border border-slate-700 p-4 overflow-hidden">
          {widget.title && (
            <h3 className="text-lg font-semibold text-white mb-4">{widget.title}</h3>
          )}
          <AlarmList alarms={data || []} compact={widget.config?.compact} />
        </div>
      );

    case WidgetType.TRAFFIC_TOP:
      return (
        <TopTrafficList
          limit={widget.config?.limit || 10}
          autoRefresh={widget.config?.autoRefresh !== false}
        />
      );

    case WidgetType.LINE_CHART:
    case WidgetType.AREA_CHART:
      return (
        <div className="h-full bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          {widget.title && (
            <h3 className="text-lg font-semibold text-white mb-4">{widget.title}</h3>
          )}
          <MetricChart
            data={data || []}
            color={widget.config?.color || '#06b6d4'}
            type={widget.type === WidgetType.AREA_CHART ? 'area' : 'line'}
          />
        </div>
      );

    case WidgetType.TOPOLOGY_MAP:
      return (
        <div className="h-full bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
          {widget.title && (
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{widget.title}</h3>
            </div>
          )}
          <div className="h-[calc(100%-60px)]">
            <TopologyViewer
              initialNodes={data?.nodes || []}
              initialEdges={data?.edges || []}
            />
          </div>
        </div>
      );

    case WidgetType.TITLE:
      return (
        <div className="flex items-center justify-center h-full">
          <h1
            className="font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
            style={{ fontSize: widget.config?.fontSize || '2rem' }}
          >
            {widget.title || '标题'}
          </h1>
        </div>
      );

    case WidgetType.CLOCK:
      return <ClockWidget format={widget.config?.format} />;

    case WidgetType.GAUGE:
      return (
        <GaugeWidget
          title={widget.title}
          value={data?.value || 0}
          max={widget.config?.max || 100}
          unit={widget.config?.unit}
          color={widget.config?.color}
        />
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-slate-400">未知组件类型: {widget.type}</div>
        </div>
      );
  }
};

// 时钟组件
const ClockWidget: React.FC<{ format?: string }> = ({ format = 'full' }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end justify-center h-full pr-8">
      <div className="text-4xl font-bold text-cyan-400">
        {time.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
      <div className="text-slate-400 mt-2">
        {time.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })}
      </div>
    </div>
  );
};

// 仪表盘组件
const GaugeWidget: React.FC<{
  title?: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}> = ({ title, value, max, unit, color = '#06b6d4' }) => {
  const percentage = (value / max) * 100;

  return (
    <div className="h-full bg-slate-800/50 rounded-lg border border-slate-700 p-6 flex flex-col items-center justify-center">
      {title && <div className="text-slate-400 text-sm mb-4">{title}</div>}

      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-700"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(percentage / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{value.toFixed(1)}</div>
            {unit && <div className="text-xs text-slate-400">{unit}</div>}
          </div>
        </div>
      </div>

      <div className="text-slate-500 text-xs mt-4">
        {percentage.toFixed(1)}% / {max}
      </div>
    </div>
  );
};
