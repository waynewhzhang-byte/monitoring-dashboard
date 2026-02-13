/**
 * 设备类型定义
 */
export interface Device {
  id: string
  opmanagerId: string
  name: string
  displayName?: string | null
  type: DeviceType
  category?: string | null
  ipAddress: string
  macAddress?: string | null
  vendor?: string | null
  model?: string | null
  serialNumber?: string | null
  osType?: OSType | null
  osVersion?: string | null
  location?: string | null
  status: DeviceStatus
  availability?: number | null
  isMonitored: boolean
  group?: string | null
  createdAt: Date
  updatedAt: Date
  lastSyncAt?: Date | null
}

export type DeviceType =
  | 'ROUTER'
  | 'SWITCH'
  | 'FIREWALL'
  | 'SERVER'
  | 'LOAD_BALANCER'
  | 'STORAGE'
  | 'PRINTER'
  | 'OTHER'

export type DeviceStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'WARNING'
  | 'ERROR'
  | 'UNMANAGED'

export type OSType =
  | 'WINDOWS'
  | 'LINUX'
  | 'UNIX'
  | 'NETWORK_OS'
  | 'OTHER'

/**
 * 设备指标
 */
export interface DeviceMetric {
  id: string
  deviceId: string
  cpuUsage?: number | null
  cpuLoad1m?: number | null
  cpuLoad5m?: number | null
  cpuLoad15m?: number | null
  memoryUsage?: number | null
  memoryTotal?: bigint | null
  memoryUsed?: bigint | null
  memoryFree?: bigint | null
  diskUsage?: number | null
  diskTotal?: bigint | null
  diskUsed?: bigint | null
  diskFree?: bigint | null
  responseTime?: number | null
  packetLoss?: number | null
  uptime?: bigint | null
  temperature?: number | null
  timestamp: Date
}

/**
 * 告警
 */
export interface Alarm {
  id: string
  opmanagerId?: string | null
  deviceId: string
  severity: AlarmSeverity
  category: string
  title: string
  message: string
  status: AlarmStatus
  acknowledgedBy?: string | null
  acknowledgedAt?: Date | null
  resolvedBy?: string | null
  resolvedAt?: Date | null
  clearedAt?: Date | null
  occurredAt: Date
  occurrenceCount: number
  lastOccurrence?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export type AlarmSeverity =
  | 'CRITICAL'
  | 'MAJOR'
  | 'MINOR'
  | 'WARNING'
  | 'INFO'

export type AlarmStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'CLEARED'

/**
 * 接口
 */
export interface Interface {
  id: string
  deviceId: string
  opmanagerId: string
  name: string
  displayName?: string | null
  description?: string | null
  type: string
  macAddress?: string | null
  speed?: bigint | null
  mtu?: number | null
  ipAddress?: string | null
  subnetMask?: string | null
  status: InterfaceStatus
  adminStatus?: InterfaceStatus | null
  ifIndex?: number | null
  isMonitored: boolean
  createdAt: Date
  updatedAt: Date
  lastSyncAt?: Date | null
}

export type InterfaceStatus =
  | 'UP'
  | 'DOWN'
  | 'TESTING'
  | 'DORMANT'
  | 'UNKNOWN'

/**
 * 流量指标
 */
export interface TrafficMetric {
  id: string
  interfaceId: string
  inOctets: bigint
  outOctets: bigint
  inPackets: bigint
  outPackets: bigint
  inBandwidth?: bigint | null
  outBandwidth?: bigint | null
  inUtilization?: number | null
  outUtilization?: number | null
  inErrors?: bigint | null
  outErrors?: bigint | null
  inDiscards?: bigint | null
  outDiscards?: bigint | null
  timestamp: Date
}

/**
 * 拓扑节点
 */
export interface TopologyNode {
  id: string
  deviceId?: string | null
  label: string
  type: string
  positionX: number
  positionY: number
  icon?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

/**
 * 拓扑连接
 */
export interface TopologyEdge {
  id: string
  sourceId: string
  targetId: string
  label?: string | null
  type?: string | null
  interfaceId?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

/**
 * 系统统计
 */
export interface SystemStats {
  totalDevices: number
  onlineDevices: number
  totalInterfaces: number
  activeInterfaces: number
  criticalAlarms: number
  majorAlarms: number
  healthScore: number
}

/**
 * API 响应类型
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

/**
 * 分页参数
 */
export interface PaginationParams {
  limit?: number
  offset?: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}
