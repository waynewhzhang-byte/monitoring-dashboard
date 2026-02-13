import { DashboardConfig, WidgetType } from '@/types/dashboard-config';

/**
 * 综合监控大屏配置
 * 全方位监控：设备、告警、性能、流量
 */
export const comprehensiveDashboard: DashboardConfig = {
  id: 'comprehensive',
  name: '综合监控大屏',
  description: '全方位监控系统状态、设备性能和网络流量',
  layout: {
    columns: 24,
    rowHeight: 80,
    gap: 16
  },
  theme: {
    name: 'dark-purple',
    backgroundColor: '#1a1625',
    primaryColor: '#a855f7',
    textColor: '#f1f5f9',
    borderColor: '#4c1d95'
  },
  widgets: [
    // 标题栏
    {
      id: 'title',
      type: WidgetType.TITLE,
      title: '智能监控大屏',
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
    // 系统健康度
    {
      id: 'health-score',
      type: WidgetType.GAUGE,
      title: '系统健康度',
      layout: {
        col: 1,
        row: 2,
        colSpan: 6,
        rowSpan: 3
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/health',
        refreshInterval: 60000,
        transform: 'data => data.score'
      },
      config: {
        max: 100,
        unit: '分',
        color: '#a855f7'
      },
      visible: true
    },
    // 在线设备
    {
      id: 'online-devices',
      type: WidgetType.STAT_CARD,
      title: '在线设备',
      layout: {
        col: 7,
        row: 2,
        colSpan: 6,
        rowSpan: 1.5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/dashboard/overview',
        refreshInterval: 30000,
        transform: 'data => data.devices.online'
      },
      config: {
        icon: 'server',
        color: '#10b981',
        unit: '台'
      },
      visible: true
    },
    // 离线设备
    {
      id: 'offline-devices',
      type: WidgetType.STAT_CARD,
      title: '离线设备',
      layout: {
        col: 7,
        row: 3.5,
        colSpan: 6,
        rowSpan: 1.5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/dashboard/overview',
        refreshInterval: 30000,
        transform: 'data => data.devices.offline'
      },
      config: {
        icon: 'alert',
        color: '#ef4444',
        unit: '台'
      },
      visible: true
    },
    // 活动告警
    {
      id: 'active-alarms',
      type: WidgetType.STAT_CARD,
      title: '活动告警',
      layout: {
        col: 13,
        row: 2,
        colSpan: 6,
        rowSpan: 1.5
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
        icon: 'bell',
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
        col: 13,
        row: 3.5,
        colSpan: 6,
        rowSpan: 1.5
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
    // 平均CPU
    {
      id: 'avg-cpu',
      type: WidgetType.STAT_CARD,
      title: '平均CPU',
      layout: {
        col: 19,
        row: 2,
        colSpan: 6,
        rowSpan: 1.5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-metrics',
        refreshInterval: 30000,
        transform: 'data => data.avgCpu'
      },
      config: {
        icon: 'cpu',
        color: '#06b6d4',
        unit: '%'
      },
      visible: true
    },
    // 平均内存
    {
      id: 'avg-memory',
      type: WidgetType.STAT_CARD,
      title: '平均内存',
      layout: {
        col: 19,
        row: 3.5,
        colSpan: 6,
        rowSpan: 1.5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-metrics',
        refreshInterval: 30000,
        transform: 'data => data.avgMemory'
      },
      config: {
        icon: 'database',
        color: '#8b5cf6',
        unit: '%'
      },
      visible: true
    },
    // 网络拓扑
    {
      id: 'topology',
      type: WidgetType.TOPOLOGY_MAP,
      title: '网络拓扑',
      layout: {
        col: 1,
        row: 5,
        colSpan: 12,
        rowSpan: 5
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/topology',
        refreshInterval: 60000,
        realtime: true,
        realtimeEvent: 'device:status-changed'
      },
      visible: true
    },
    // 告警趋势
    {
      id: 'alarm-trend',
      type: WidgetType.AREA_CHART,
      title: '告警趋势（24小时）',
      layout: {
        col: 13,
        row: 5,
        colSpan: 12,
        rowSpan: 5
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
    // 关键设备
    {
      id: 'critical-devices',
      type: WidgetType.DEVICE_LIST,
      title: '关键设备监控',
      layout: {
        col: 1,
        row: 10,
        colSpan: 8,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/dashboard/critical-devices',
        refreshInterval: 30000,
        realtime: true,
        realtimeEvent: 'device:status-changed'
      },
      config: {
        compact: true
      },
      visible: true
    },
    // 流量Top 10
    {
      id: 'traffic-top',
      type: WidgetType.TRAFFIC_TOP,
      title: 'Top 10 流量接口',
      layout: {
        col: 9,
        row: 10,
        colSpan: 8,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/traffic/top?limit=10',
        refreshInterval: 30000
      },
      config: {
        limit: 10,
        autoRefresh: true
      },
      visible: true
    },
    // 最新告警
    {
      id: 'recent-alarms',
      type: WidgetType.ALARM_LIST,
      title: '最新告警',
      layout: {
        col: 17,
        row: 10,
        colSpan: 8,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms?status=active&limit=10',
        refreshInterval: 10000,
        realtime: true,
        realtimeEvent: 'alarm:new'
      },
      config: {
        compact: true
      },
      visible: true
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
