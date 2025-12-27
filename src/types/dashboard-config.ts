/**
 * 大屏配置类型定义
 */

// Widget组件类型
export enum WidgetType {
  // 统计卡片
  STAT_CARD = 'stat-card',

  // 列表类
  DEVICE_LIST = 'device-list',
  ALARM_LIST = 'alarm-list',
  TRAFFIC_TOP = 'traffic-top',
  SERVER_LIST = 'server-list',

  // 图表类
  LINE_CHART = 'line-chart',
  BAR_CHART = 'bar-chart',
  PIE_CHART = 'pie-chart',
  AREA_CHART = 'area-chart',

  // 拓扑类
  TOPOLOGY_MAP = 'topology-map',
  NETWORK_MAP = 'network-map',

  // 仪表盘
  GAUGE = 'gauge',
  PROGRESS = 'progress',

  // 文本类
  TITLE = 'title',
  CLOCK = 'clock',
  TICKER = 'ticker',

  // 自定义
  CUSTOM = 'custom'
}

// 数据源配置
export interface DataSourceConfig {
  // API端点
  endpoint: string;

  // 请求方法
  method?: 'GET' | 'POST';

  // 请求参数
  params?: Record<string, any>;

  // 刷新间隔（毫秒）
  refreshInterval?: number;

  // 数据转换函数名（可选）
  transform?: string;

  // 是否启用WebSocket实时更新
  realtime?: boolean;

  // WebSocket事件名
  realtimeEvent?: string;
}

// Widget位置和尺寸
export interface WidgetLayout {
  // 网格列位置 (1-24)
  col: number;

  // 网格行位置 (1-无限)
  row: number;

  // 跨越列数
  colSpan: number;

  // 跨越行数
  rowSpan: number;

  // 最小宽度（可选）
  minWidth?: number;

  // 最小高度（可选）
  minHeight?: number;
}

// Widget配置
export interface WidgetConfig {
  // 唯一标识
  id: string;

  // Widget类型
  type: WidgetType;

  // 标题
  title?: string;

  // 布局配置
  layout: WidgetLayout;

  // 数据源
  dataSource?: DataSourceConfig;

  // Widget特定配置
  config?: Record<string, any>;

  // 样式配置
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    className?: string;
  };

  // 是否可见
  visible?: boolean;
}

// 大屏布局配置
export interface DashboardLayout {
  // 网格列数（默认24）
  columns?: number;

  // 网格行高（px）
  rowHeight?: number;

  // 间距（px）
  gap?: number;
}

// 大屏主题配置
export interface DashboardTheme {
  // 主题名称
  name: string;

  // 背景色
  backgroundColor?: string;

  // 主色调
  primaryColor?: string;

  // 文字颜色
  textColor?: string;

  // 边框颜色
  borderColor?: string;

  // 自定义CSS类
  customClass?: string;
}

// 完整的大屏配置
export interface DashboardConfig {
  // 配置ID
  id: string;

  // 配置名称
  name: string;

  // 描述
  description?: string;

  // 布局配置
  layout: DashboardLayout;

  // 主题配置
  theme?: DashboardTheme;

  // Widget列表
  widgets: WidgetConfig[];

  // 创建时间
  createdAt?: string;

  // 更新时间
  updatedAt?: string;
}

// 预设配置模板
export const DashboardTemplates = {
  // 网络监控大屏
  NETWORK_MONITOR: 'network-monitor',

  // 告警中心大屏
  ALARM_CENTER: 'alarm-center',

  // 服务器监控大屏
  SERVER_MONITOR: 'server-monitor',

  // 综合监控大屏
  COMPREHENSIVE: 'comprehensive',

  // 自定义
  CUSTOM: 'custom'
} as const;

export type DashboardTemplate = typeof DashboardTemplates[keyof typeof DashboardTemplates];
