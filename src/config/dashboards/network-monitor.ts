import { DashboardConfig, WidgetType } from '@/types/dashboard-config';

/**
 * 网络监控大屏配置
 * 主要关注：设备状态、流量统计、网络拓扑
 */
export const networkMonitorDashboard: DashboardConfig = {
  id: 'network-monitor',
  name: '网络监控大屏',
  description: '实时监控网络设备状态、流量和拓扑结构',
  layout: {
    columns: 24,
    rowHeight: 80,
    gap: 16
  },
  theme: {
    name: 'dark-blue',
    backgroundColor: '#0f172a',
    primaryColor: '#06b6d4',
    textColor: '#f1f5f9',
    borderColor: '#334155'
  },
  widgets: [
    // 标题栏
    {
      id: 'title',
      type: WidgetType.TITLE,
      title: '网络监控中心',
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
    // 在线设备统计
    {
      id: 'online-devices',
      type: WidgetType.STAT_CARD,
      title: '在线设备',
      layout: {
        col: 1,
        row: 2,
        colSpan: 6,
        rowSpan: 2
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
    // 离线设备统计
    {
      id: 'offline-devices',
      type: WidgetType.STAT_CARD,
      title: '离线设备',
      layout: {
        col: 7,
        row: 2,
        colSpan: 6,
        rowSpan: 2
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
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/dashboard/overview',
        refreshInterval: 10000,
        transform: 'data => data.alarms.active',
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
    // 系统健康度
    {
      id: 'health-score',
      type: WidgetType.GAUGE,
      title: '系统健康度',
      layout: {
        col: 19,
        row: 2,
        colSpan: 6,
        rowSpan: 2
      },
      dataSource: {
        method: 'GET',
        endpoint: '/api/analytics/health',
        refreshInterval: 60000
      },
      config: {
        max: 100,
        unit: '分',
        color: '#06b6d4'
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
        row: 4,
        colSpan: 14,
        rowSpan: 6
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
    // 流量Top 10
    {
      id: 'traffic-top',
      type: WidgetType.TRAFFIC_TOP,
      title: 'Top 10 流量接口',
      layout: {
        col: 15,
        row: 4,
        colSpan: 10,
        rowSpan: 6
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
    // 设备列表
    {
      id: 'device-list',
      type: WidgetType.DEVICE_LIST,
      title: '关键设备监控',
      layout: {
        col: 1,
        row: 10,
        colSpan: 12,
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
    // 告警列表
    {
      id: 'alarm-list',
      type: WidgetType.ALARM_LIST,
      title: '最新告警',
      layout: {
        col: 13,
        row: 10,
        colSpan: 12,
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
