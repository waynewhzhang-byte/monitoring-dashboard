import { DashboardConfig } from '@/types/dashboard-config';
import { networkMonitorDashboard } from './network-monitor';
import { alarmCenterDashboard } from './alarm-center';
import { serverMonitorDashboard } from './server-monitor';
import { comprehensiveDashboard } from './comprehensive';

/**
 * 预设大屏配置模板集合
 */
export const dashboardTemplates: Record<string, DashboardConfig> = {
  'network-monitor': networkMonitorDashboard,
  'alarm-center': alarmCenterDashboard,
  'server-monitor': serverMonitorDashboard,
  'comprehensive': comprehensiveDashboard
};

/**
 * 获取所有可用的大屏模板列表
 */
export function getDashboardTemplates(): DashboardConfig[] {
  return Object.values(dashboardTemplates);
}

/**
 * 根据ID获取大屏模板
 */
export function getDashboardTemplateById(id: string): DashboardConfig | null {
  return dashboardTemplates[id] || null;
}

/**
 * 大屏模板元数据
 */
export const dashboardTemplateMetadata = [
  {
    id: 'network-monitor',
    name: '网络监控大屏',
    description: '实时监控网络设备状态、流量和拓扑结构',
    icon: 'network',
    primaryColor: '#06b6d4',
    features: ['设备状态', '流量统计', '网络拓扑', '实时告警']
  },
  {
    id: 'alarm-center',
    name: '告警中心大屏',
    description: '实时监控系统告警、分析告警趋势',
    icon: 'alert-triangle',
    primaryColor: '#f43f5e',
    features: ['告警统计', '告警趋势', '严重告警', '设备排行']
  },
  {
    id: 'server-monitor',
    name: '服务器监控大屏',
    description: '实时监控服务器性能和资源使用情况',
    icon: 'server',
    primaryColor: '#10b981',
    features: ['服务器状态', 'CPU监控', '内存监控', '性能趋势']
  },
  {
    id: 'comprehensive',
    name: '综合监控大屏',
    description: '全方位监控系统状态、设备性能和网络流量',
    icon: 'layout-dashboard',
    primaryColor: '#a855f7',
    features: ['系统健康度', '设备监控', '告警分析', '流量统计']
  }
];

export default dashboardTemplates;
