import { DashboardConfig, WidgetType } from '@/types/dashboard-config';

/**
 * 服务器监控大屏配置
 * 主要关注：服务器性能、资源使用率、性能趋势
 */
export const serverMonitorDashboard: DashboardConfig = {
  id: 'server-monitor',
  name: '服务器监控大屏',
  description: '实时监控服务器性能和资源使用情况',
  layout: {
    columns: 24,
    rowHeight: 80,
    gap: 16
  },
  theme: {
    name: 'dark-green',
    backgroundColor: '#0a1628',
    primaryColor: '#10b981',
    textColor: '#f1f5f9',
    borderColor: '#1e3a5f'
  },
  widgets: [
    // 标题栏
    {
      id: 'title',
      type: WidgetType.TITLE,
      title: '服务器监控中心',
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
    // 服务器总数
    {
      id: 'total-servers',
      type: WidgetType.STAT_CARD,
      title: '服务器总数',
      layout: {
        col: 1,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/devices?type=server',
        refreshInterval: 60000,
        transform: 'data => data.length'
      },
      config: {
        icon: 'server',
        color: '#06b6d4',
        unit: '台'
      },
      visible: true
    },
    // 在线服务器
    {
      id: 'online-servers',
      type: WidgetType.STAT_CARD,
      title: '在线服务器',
      layout: {
        col: 7,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/devices?type=server&status=online',
        refreshInterval: 30000,
        transform: 'data => data.length',
        realtime: true,
        realtimeEvent: 'device:status-changed'
      },
      config: {
        icon: 'check-circle',
        color: '#10b981',
        unit: '台'
      },
      visible: true
    },
    // 平均CPU使用率
    {
      id: 'avg-cpu',
      type: WidgetType.STAT_CARD,
      title: '平均CPU使用率',
      layout: {
        col: 13,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-metrics',
        refreshInterval: 30000,
        transform: 'data => data.avgCpu'
      },
      config: {
        icon: 'cpu',
        color: '#f59e0b',
        unit: '%'
      },
      visible: true
    },
    // 平均内存使用率
    {
      id: 'avg-memory',
      type: WidgetType.STAT_CARD,
      title: '平均内存使用率',
      layout: {
        col: 19,
        row: 2,
        colSpan: 6,
        rowSpan: 2
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
    // 服务器列表
    {
      id: 'server-list',
      type: WidgetType.SERVER_LIST,
      title: '服务器状态列表',
      layout: {
        col: 1,
        row: 4,
        colSpan: 14,
        rowSpan: 6
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/devices?type=server',
        refreshInterval: 30000,
        realtime: true,
        realtimeEvent: 'device:metric-update'
      },
      config: {
        showMetrics: true,
        compact: false
      },
      visible: true
    },
    // CPU使用率Top 5
    {
      id: 'top-cpu',
      type: WidgetType.DEVICE_LIST,
      title: 'CPU使用率 Top 5',
      layout: {
        col: 15,
        row: 4,
        colSpan: 10,
        rowSpan: 3
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/top-devices?metric=cpu&limit=5',
        refreshInterval: 30000
      },
      config: {
        compact: true,
        highlightMetric: 'cpu'
      },
      visible: true
    },
    // 内存使用率Top 5
    {
      id: 'top-memory',
      type: WidgetType.DEVICE_LIST,
      title: '内存使用率 Top 5',
      layout: {
        col: 15,
        row: 7,
        colSpan: 10,
        rowSpan: 3
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/top-devices?metric=memory&limit=5',
        refreshInterval: 30000
      },
      config: {
        compact: true,
        highlightMetric: 'memory'
      },
      visible: true
    },
    // CPU趋势图
    {
      id: 'cpu-trend',
      type: WidgetType.LINE_CHART,
      title: '系统CPU使用率趋势（24小时）',
      layout: {
        col: 1,
        row: 10,
        colSpan: 12,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-trend?metric=cpu&hours=24',
        refreshInterval: 60000
      },
      config: {
        color: '#f59e0b'
      },
      visible: true
    },
    // 内存趋势图
    {
      id: 'memory-trend',
      type: WidgetType.LINE_CHART,
      title: '系统内存使用率趋势（24小时）',
      layout: {
        col: 13,
        row: 10,
        colSpan: 12,
        rowSpan: 4
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-trend?metric=memory&hours=24',
        refreshInterval: 60000
      },
      config: {
        color: '#8b5cf6'
      },
      visible: true
    },
    // 磁盘使用情况
    {
      id: 'disk-usage',
      type: WidgetType.GAUGE,
      title: '平均磁盘使用率',
      layout: {
        col: 1,
        row: 14,
        colSpan: 8,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/system-metrics',
        refreshInterval: 300000,
        transform: 'data => data.avgDisk'
      },
      config: {
        max: 100,
        unit: '%',
        color: '#06b6d4'
      },
      visible: true
    },
    // 系统健康度
    {
      id: 'health-score',
      type: WidgetType.GAUGE,
      title: '系统健康度',
      layout: {
        col: 9,
        row: 14,
        colSpan: 8,
        rowSpan: 2
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
        color: '#10b981'
      },
      visible: true
    },
    // 最新告警
    {
      id: 'recent-alarms',
      type: WidgetType.ALARM_LIST,
      title: '服务器告警',
      layout: {
        col: 17,
        row: 14,
        colSpan: 8,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/alarms?deviceType=server&status=active&limit=5',
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
