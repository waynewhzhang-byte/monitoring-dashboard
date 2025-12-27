import React, { useMemo } from 'react';
import { DashboardConfig, WidgetConfig } from '@/types/dashboard-config';
import { WidgetRenderer } from './WidgetRenderer';

interface DashboardRendererProps {
  config: DashboardConfig;
  editable?: boolean;
  onWidgetClick?: (widgetId: string) => void;
}

/**
 * 大屏渲染器
 * 根据配置动态渲染大屏布局和组件
 */
export const DashboardRenderer: React.FC<DashboardRendererProps> = ({
  config,
  editable = false,
  onWidgetClick
}) => {
  const { layout, theme, widgets } = config;

  // 计算网格布局样式
  const gridStyle = useMemo(() => {
    const columns = layout.columns || 24;
    const rowHeight = layout.rowHeight || 80;
    const gap = layout.gap || 16;

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoRows: `${rowHeight}px`,
      gap: `${gap}px`,
      width: '100%',
      height: '100%',
      padding: `${gap}px`
    };
  }, [layout]);

  // 应用主题样式
  const themeStyle = useMemo(() => {
    if (!theme) return {};

    return {
      backgroundColor: theme.backgroundColor || 'transparent',
      color: theme.textColor || 'inherit'
    };
  }, [theme]);

  // 渲染单个Widget
  const renderWidget = (widget: WidgetConfig) => {
    if (widget.visible === false) return null;

    const widgetStyle: React.CSSProperties = {
      gridColumn: `${widget.layout.col} / span ${widget.layout.colSpan}`,
      gridRow: `${widget.layout.row} / span ${widget.layout.rowSpan}`,
      minWidth: widget.layout.minWidth,
      minHeight: widget.layout.minHeight,
      ...widget.style
    };

    return (
      <div
        key={widget.id}
        style={widgetStyle}
        className={`dashboard-widget ${widget.style?.className || ''} ${
          editable ? 'cursor-pointer hover:ring-2 hover:ring-cyan-500' : ''
        }`}
        onClick={() => onWidgetClick?.(widget.id)}
      >
        <WidgetRenderer widget={widget} />
      </div>
    );
  };

  return (
    <div
      className={`dashboard-container ${theme?.customClass || ''}`}
      style={{ ...themeStyle, ...gridStyle }}
    >
      {widgets.map(renderWidget)}
    </div>
  );
};
