/**
 * 设备类型
 */
export const DEVICE_TYPES = {
  ROUTER: 'ROUTER',
  SWITCH: 'SWITCH',
  FIREWALL: 'FIREWALL',
  SERVER: 'SERVER',
  LOAD_BALANCER: 'LOAD_BALANCER',
  STORAGE: 'STORAGE',
  PRINTER: 'PRINTER',
  OTHER: 'OTHER',
} as const

/**
 * 设备状态
 */
export const DEVICE_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  UNMANAGED: 'UNMANAGED',
} as const

/**
 * 告警级别
 */
export const ALARM_SEVERITY = {
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

/**
 * 告警状态
 */
export const ALARM_STATUS = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  CLEARED: 'CLEARED',
} as const

/**
 * 告警级别配置
 */
export const ALARM_SEVERITY_CONFIG = {
  CRITICAL: {
    label: '严重',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
  },
  MAJOR: {
    label: '重要',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
  },
  MINOR: {
    label: '次要',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
  },
  WARNING: {
    label: '警告',
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-400',
  },
  INFO: {
    label: '信息',
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500',
  },
} as const

/**
 * 状态颜色配置
 */
export const STATUS_COLOR_CONFIG = {
  ONLINE: {
    color: 'bg-green-500',
    textColor: 'text-green-500',
    label: '在线',
  },
  OFFLINE: {
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    label: '离线',
  },
  WARNING: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    label: '警告',
  },
  ERROR: {
    color: 'bg-red-500',
    textColor: 'text-red-500',
    label: '错误',
  },
  UNMANAGED: {
    color: 'bg-slate-400',
    textColor: 'text-slate-400',
    label: '未监控',
  },
} as const

/**
 * 数据采集间隔（秒），均可通过环境变量后续调整
 */
export const COLLECTION_INTERVALS = {
  /** 设备采集实时性能，默认 300 秒（5 分钟） */
  METRICS: parseInt(process.env.COLLECT_METRICS_INTERVAL || '300'),
  /** 接口采集间隔，默认 300 秒（5 分钟） */
  INTERFACE: parseInt(process.env.COLLECT_INTERFACE_INTERVAL || '300'),
  ALARMS: parseInt(process.env.COLLECT_ALARMS_INTERVAL || '60'),
  TOPOLOGY: parseInt(process.env.SYNC_TOPOLOGY_INTERVAL || '300'),
  DEVICES: parseInt(process.env.SYNC_DEVICES_INTERVAL || '600'),
} as const

/**
 * 数据保留天数
 */
export const DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '30')

/**
 * Redis 缓存 TTL（秒）
 */
export const CACHE_TTL = {
  DEVICE_METRICS: 60,
  INTERFACE_TRAFFIC: 60,
  DEVICE_LIST: 300,
  ALARM_LIST: 30,
} as const

/**
 * API 限流配置
 */
export const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1分钟
  MAX_REQUESTS: parseInt(process.env.API_RATE_LIMIT || '100'),
} as const
