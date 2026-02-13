import React, { useMemo, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { DashboardConfig, WidgetConfig } from '@/types/dashboard-config';
import { WidgetRenderer } from './WidgetRenderer';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { RealtimeStatusIndicator } from '@/components/widgets/RealtimeStatusIndicator';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardRendererProps {
  config?: DashboardConfig;
  editable?: boolean;
  onWidgetClick?: (widgetId: string) => void;
}

/**
 * 大屏渲染器
 * 根据配置动态渲染大屏布局和组件
 */
export const DashboardRenderer: React.FC<DashboardRendererProps> = ({
  config: propConfig,
  editable: propEditable,
  onWidgetClick
}) => {
  // 从 Store 获取状态和操作
  const { activeDashboard, isEditing, updateWidgetLayout } = useDashboardStore();

  // 优先使用 prop，否则使用 store
  const config = propConfig || activeDashboard;
  const editable = propEditable !== undefined ? propEditable : isEditing;

  // 🔥 启用实时数据更新
  const { isConnected, lastUpdate } = useRealtimeUpdates();

  // 显示实时更新状态指示器
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 Dashboard realtime updates: ACTIVE');
    } else {
      console.log('❌ Dashboard realtime updates: DISCONNECTED');
    }
  }, [isConnected]);

  if (!config) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-900 text-slate-400">
        未加载大屏配置
      </div>
    );
  }

  const { layout, theme, widgets } = config;

  // 转换配置到 React Grid Layout 格式
  const rglLayout = useMemo(() => {
    return widgets.map(w => ({
      i: w.id,
      x: w.layout.col - 1,
      y: w.layout.row - 1,
      w: w.layout.colSpan,
      h: w.layout.rowSpan,
      minW: w.layout.minWidth,
      minH: w.layout.minHeight,
    }));
  }, [widgets]);

  // 处理布局改变
  const handleLayoutChange = (currentLayout: any, allLayouts?: any) => {
    if (!editable) return;
    
    (currentLayout || []).forEach((item: any) => {
      const widget = widgets.find(w => w.id === item.i);
      if (widget) {
        const newLayout = {
          col: item.x + 1,
          row: item.y + 1,
          colSpan: item.w,
          rowSpan: item.h,
          minWidth: item.minW,
          minHeight: item.minH,
        };
        
        // 只有当位置或尺寸真的改变时才更新 store
        if (
          newLayout.col !== widget.layout.col ||
          newLayout.row !== widget.layout.row ||
          newLayout.colSpan !== widget.layout.colSpan ||
          newLayout.rowSpan !== widget.layout.rowSpan
        ) {
          updateWidgetLayout(item.i, newLayout);
        }
      }
    });
  };

  // 应用主题样式
  const themeStyle = useMemo(() => {
    if (!theme) return {};
    return {
      backgroundColor: theme.backgroundColor || 'transparent',
      color: theme.textColor || 'inherit'
    };
  }, [theme]);

  // 渲染编辑模式下的布局
  if (editable) {
    const responsiveProps = {
      className: "layout",
      layouts: { lg: rglLayout },
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xss: 0 },
      cols: { lg: layout.columns || 24, md: 20, sm: 12, xs: 8, xss: 4 },
      rowHeight: layout.rowHeight || 80,
      margin: [layout.gap || 16, layout.gap || 16] as [number, number],
      onLayoutChange: handleLayoutChange,
      draggableHandle: ".widget-drag-handle",
    };
    
    return (
      <div
        className={`dashboard-container ${theme?.customClass || ''} w-full h-full`}
        style={themeStyle}
      >
        {/* @ts-ignore - Responsive component props may not match exactly */}
        <Responsive {...responsiveProps}>
          {widgets.map(widget => (
            <div
              key={widget.id}
              className={`dashboard-widget-wrapper group ${widget.style?.className || ''}`}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="widget-drag-handle cursor-move p-1 bg-slate-700/80 rounded border border-slate-600">
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              </div>
              <div 
                className="w-full h-full hover:ring-2 hover:ring-cyan-500 transition-all rounded-lg overflow-hidden"
                onClick={() => onWidgetClick?.(widget.id)}
              >
                <WidgetRenderer widget={widget} />
              </div>
            </div>
          ))}
        </Responsive>
      </div>
    );
  }

  // 渲染预览/展示模式下的静态布局 (保持原有 CSS Grid 提高性能)
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.columns || 24}, 1fr)`,
    gridAutoRows: `${layout.rowHeight || 80}px`,
    gap: `${layout.gap || 16}px`,
    padding: `${layout.gap || 16}px`,
    width: '100%',
    height: '100%',
  };

  return (
    <div
      className={`dashboard-container ${theme?.customClass || ''} relative`}
      style={{ ...themeStyle, ...gridStyle }}
    >
      {/* 实时状态指示器 */}
      <div className="absolute top-4 right-4 z-50 pointer-events-none">
        <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700 shadow-lg">
          <RealtimeStatusIndicator isConnected={isConnected} />
        </div>
      </div>

      {widgets.map(widget => (
        <div
          key={`${widget.id}-${lastUpdate}`} // 使用 lastUpdate 作为 key 的一部分，触发重新渲染
          style={{
            gridColumn: `${widget.layout.col} / span ${widget.layout.colSpan}`,
            gridRow: `${widget.layout.row} / span ${widget.layout.rowSpan}`,
            minWidth: widget.layout.minWidth,
            minHeight: widget.layout.minHeight,
            ...widget.style
          }}
          className={`dashboard-widget ${widget.style?.className || ''}`}
        >
          <WidgetRenderer widget={widget} realtimeKey={lastUpdate} />
        </div>
      ))}
    </div>
  );
};
