import { DashboardConfig, WidgetType } from '@/types/dashboard-config';

/**
 * 告警中心大屏配置
 * 主要关注：告警统计、告警趋势、告警详情
 */
export const alarmCenterDashboard: DashboardConfig = {
  id: 'alarm-center',
  name: '告警中心大屏',
  description: '实时监控系统告警、分析告警趋势',
  layout: {
    columns: 24,
    rowHeight: 80,
    gap: 16
  },
  theme: {
    name: 'dark-red',
    backgroundColor: '#1e1b2e',
    primaryColor: '#f43f5e',
    textColor: '#f1f5f9',
    borderColor: '#334155'
  },
  widgets: [
    // 标题栏
    {
      id: 'title',
      type: WidgetType.TITLE,
      title: '告警监控中心',
      layout: {
        col: 1,
        row: 1,
        colSpan: 18,
        rowSpan: 1
      },
      config: {
        fontSize: '2.5rem'
      },
      visible: true
    },
    // 时钟
    {
      id: 'clock',
      type: WidgetType.CLOCK,
      layout: {
        col: 19,
        row: 1,
        colSpan: 6,
        rowSpan: 1
      },
      config: {
        format: 'full'
      },
      visible: true
    },
    // 活动告警总数
    {
      id: 'total-alarms',
      type: WidgetType.STAT_CARD,
      title: '活动告警',
      layout: {
        col: 1,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/stats',
        refreshInterval: 10000,
        transform: 'data => data.total',
        realtime: true,
        realtimeEvent: 'alarm:new'
      },
      config: {
        icon: 'alert-circle',
        color: '#f59e0b',
        unit: '个'
      },
      visible: true
    },
    // 严重告警
    {
      id: 'critical-alarms',
      type: WidgetType.STAT_CARD,
      title: '严重告警',
      layout: {
        col: 7,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/stats',
        refreshInterval: 10000,
        transform: 'data => data.bySeverity.critical || 0',
        realtime: true,
        realtimeEvent: 'alarm:new'
      },
      config: {
        icon: 'alert-triangle',
        color: '#ef4444',
        unit: '个'
      },
      visible: true
    },
    // 今日新增告警
    {
      id: 'today-alarms',
      type: WidgetType.STAT_CARD,
      title: '今日新增',
      layout: {
        col: 13,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/trends?hours=24',
        refreshInterval: 60000,
        transform: 'data => data.reduce((sum, item) => sum + item.count, 0)'
      },
      config: {
        icon: 'trending-up',
        color: '#06b6d4',
        unit: '个'
      },
      visible: true
    },
    // 平均解决时间
    {
      id: 'avg-resolution-time',
      type: WidgetType.STAT_CARD,
      title: '平均解决时间',
      layout: {
        col: 19,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/stats',
        refreshInterval: 300000,
        transform: 'data => Math.round((data.avgResolutionTime || 0) / 60)'
      },
      config: {
        icon: 'clock',
        color: '#8b5cf6',
        unit: '分钟'
      },
      visible: true
    },
    // 告警趋势图
    {
      id: 'alarm-trend-chart',
      type: WidgetType.AREA_CHART,
      title: '24小时告警趋势',
      layout: {
        col: 1,
        row: 4,
        colSpan: 16,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/trends?hours=24',
        refreshInterval: 60000
      },
      config: {
        color: '#f43f5e'
      },
      visible: true
    },
    // 告警分布（按严重程度）
    {
      id: 'alarm-severity-chart',
      type: WidgetType.PIE_CHART,
      title: '告警严重度分布',
      layout: {
        col: 17,
        row: 4,
        colSpan: 8,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/stats',
        refreshInterval: 60000,
        transform: `data => Object.entries(data.bySeverity).map(([name, value]) => ({ name, value }))`
      },
      config: {
        colors: {
          critical: '#ef4444',
          warning: '#f59e0b',
          info: '#06b6d4'
        }
      },
      visible: true
    },
    // 告警详情列表 - 严重
    {
      id: 'critical-alarm-list',
      type: WidgetType.ALARM_LIST,
      title: '严重告警列表',
      layout: {
        col: 1,
        row: 8,
        colSpan: 12,
        rowSpan: 5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms?status=active&severity=critical&limit=20',
        refreshInterval: 10000,
        realtime: true,
        realtimeEvent: 'alarm:new'
      },
      config: {
        compact: false,
        showActions: true
      },
      visible: true
    },
    // 告警详情列表 - 警告
    {
      id: 'warning-alarm-list',
      type: WidgetType.ALARM_LIST,
      title: '警告告警列表',
      layout: {
        col: 13,
        row: 8,
        colSpan: 12,
        rowSpan: 5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms?status=active&severity=warning&limit=20',
        refreshInterval: 10000,
        realtime: true,
        realtimeEvent: 'alarm:new'
      },
      config: {
        compact: false,
        showActions: true
      },
      visible: true
    },
    // Top告警设备
    {
      id: 'top-alarm-devices',
      type: WidgetType.DEVICE_LIST,
      title: 'Top 10 告警设备',
      layout: {
        col: 1,
        row: 13,
        colSpan: 24,
        rowSpan: 3
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms/stats',
        refreshInterval: 60000,
        transform: 'data => data.topDevices || []'
      },
      config: {
        compact: true,
        showAlarmCount: true
      },
      visible: true
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
