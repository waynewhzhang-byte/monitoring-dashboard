import { z } from 'zod';

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

export const WidgetTypeSchema = z.nativeEnum(WidgetType);

// 数据源配置
export const DataSourceConfigSchema = z.object({
  // API端点
  endpoint: z.string(),

  // 请求方法（可选，默认为 GET）
  method: z.enum(['GET', 'POST']).default('GET').optional(),

  // 请求参数
  params: z.record(z.any()).optional(),

  // 刷新间隔（毫秒）
  refreshInterval: z.number().optional(),

  // 数据转换函数名（可选）
  transform: z.string().optional(),

  // 是否启用WebSocket实时更新
  realtime: z.boolean().optional(),

  // WebSocket事件名
  realtimeEvent: z.string().optional(),
});

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;

// Widget位置和尺寸
export const WidgetLayoutSchema = z.object({
  // 网格列位置 (1-24)
  col: z.number(),

  // 网格行位置 (1-无限)
  row: z.number(),

  // 跨越列数
  colSpan: z.number(),

  // 跨越行数
  rowSpan: z.number(),

  // 最小宽度（可选）
  minWidth: z.number().optional(),

  // 最小高度（可选）
  minHeight: z.number().optional(),
});

export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>;

// Widget配置
export const WidgetConfigSchema = z.object({
  // 唯一标识
  id: z.string(),

  // Widget类型
  type: WidgetTypeSchema,

  // 标题
  title: z.string().optional(),

  // 布局配置
  layout: WidgetLayoutSchema,

  // 数据源
  dataSource: DataSourceConfigSchema.optional(),

  // Widget特定配置
  config: z.record(z.any()).optional(),

  // 样式配置
  style: z.object({
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    textColor: z.string().optional(),
    className: z.string().optional(),
  }).optional(),

  // 是否可见
  visible: z.boolean().optional().default(true),
});

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// 大屏布局配置
export const DashboardLayoutSchema = z.object({
  // 网格列数（默认24）
  columns: z.number().optional().default(24),

  // 网格行高（px）
  rowHeight: z.number().optional().default(80),

  // 间距（px）
  gap: z.number().optional().default(16),
});

export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;

// 大屏主题配置
export const DashboardThemeSchema = z.object({
  // 主题名称
  name: z.string(),

  // 背景色
  backgroundColor: z.string().optional(),

  // 主色调
  primaryColor: z.string().optional(),

  // 文字颜色
  textColor: z.string().optional(),

  // 边框颜色
  borderColor: z.string().optional(),

  // 自定义CSS类
  customClass: z.string().optional(),
});

export type DashboardTheme = z.infer<typeof DashboardThemeSchema>;

// 完整的大屏配置
export const DashboardConfigSchema = z.object({
  // 配置ID
  id: z.string(),

  // 配置名称
  name: z.string(),

  // 描述
  description: z.string().optional(),

  // 布局配置
  layout: DashboardLayoutSchema,

  // 主题配置
  theme: DashboardThemeSchema.optional(),

  // Widget列表
  widgets: z.array(WidgetConfigSchema),

  // 创建时间
  createdAt: z.string().optional(),

  // 更新时间
  updatedAt: z.string().optional(),
});

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

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