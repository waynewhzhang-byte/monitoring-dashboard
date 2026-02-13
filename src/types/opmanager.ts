/**
 * OpManager API 原始响应类型定义
 */

// ==================== listDevices v2 API 类型 ====================

/**
 * listDevices v2 API 返回的设备对象
 */
export interface OpManagerDeviceRaw {
  id: string;
  moid: number;
  deviceName: string; // 格式: "10.141.69.123.10000000001"
  displayName: string;
  ipaddress: string;
  type: string; // 设备类型/型号，如 "Windows 2019", "Huawei-USG5550"
  vendorName: string; // 厂商名称，如 "Microsoft", "Huawei"
  category: string; // 设备类别（可能为中文），如 "服务器", "交换机"
  statusNum: string; // 状态编号: "1"(严重), "2"(问题), "5"(正常)
  statusStr: string; // 状态字符串（可能为中文），如 "正常", "问题"
  isSNMP: boolean;
  isSuppressed: boolean;
  isNew: boolean;
  interfaceCount: number;
  addedTime: string;
  prettyTime: string;
  tags?: string[];
  temperature?: number; // 机房温度 (Celsius)
  diskUsage?: number; // 磁盘利用率 (%)
}

/**
 * listDevices v2 API 响应
 */
export interface OpManagerListDevicesResponse {
  total: number; // ⚠️ 可能为 0，使用 records 获取真实总数
  page: number;
  rows: OpManagerDeviceRaw[];
  records: number; // ✅ 实际总记录数
}

// ==================== getBusinessDetailsView API 类型 ====================

/**
 * getBusinessDetailsView API 返回的设备对象（包含性能指标）
 */
export interface OpManagerBusinessViewDeviceRaw {
  name: string; // 设备名称（Managed Entity name），格式: "10.141.0.252.10000000001"
  displayName: string;
  IpAddress: string;
  type: string;
  severity: string; // 严重程度编号: "1"(严重), "2"(问题), "5"(正常)
  status: string; // 状态字符串（英文），如 "Clear", "Trouble", "Critical"
  CPUUtilization: number; // CPU 利用率（百分比）
  MemUtilization: number; // 内存利用率（百分比）
}

/**
 * getBusinessDetailsView API 响应
 */
export interface OpManagerBusinessDetailsViewResponse {
  BusinessDetailsView: {
    TotalRecords: string;
    Details: OpManagerBusinessViewDeviceRaw[];
  };
}

// ==================== listInterfaces API 类型 ====================

/**
 * listInterfaces API 返回的接口对象
 */
export interface OpManagerInterfaceRaw {
  id: string;
  interfaceName: string; // 格式: "IF-1.1.1.45.10000000001-10000006553"
  interfaceDisplayName: string;
  deviceName: string; // 所属设备名称，格式: "1.1.1.45.10000000001"
  displayName: string; // 设备显示名称
  ipAddress: string;
  type: string; // 接口类型，如 "Ethernet", "IEEE 802.3ad Lag"
  operStatus: string; // 运行状态（可能为中文），如 "运行", "停止"
  adminStatus: string; // 管理状态（可能为中文），如 "运行", "停止"
  statusNum: number; // 状态编号: 1(严重), 2(问题), 5(正常)
  statusStr: string; // 状态字符串（可能为中文），如 "正常", "问题"
  inSpeed: string; // 入站速度，如 "10 Gbps"
  outSpeed: string; // 出站速度，如 "10 Gbps"
  inTraffic: string; // 入站流量，如 "NA", "1.144 M"
  outTraffic: string; // 出站流量，如 "NA", "103.081 Mbps"
  inUtil?: number; // 入站利用率（百分比），可能不存在
  outUtil?: number; // 出站利用率（百分比），可能不存在
  isSuppressed: boolean;
}

/**
 * listInterfaces API 响应
 */
export interface OpManagerListInterfacesResponse {
  total: string;
  records: string;
  page: string;
  rows: OpManagerInterfaceRaw[];
}

// ==================== getInterfaces API 类型 ====================

/**
 * getInterfaces API 返回的接口对象（与 listInterfaces 格式不同）
 */
export interface OpManagerGetInterfacesInterfaceRaw {
  name: string; // 接口名称，格式: "IF-1.1.1.45.10000000001-10000006553"
  displayName: string; // 接口显示名称
  ifIndex: string; // 接口索引
  ifIndexNum: number; // 接口索引（数字）
  ifType: string; // 接口类型，如 "Ethernet", "L3ipvlan"
  type: string; // 类型，通常为 "Interface"
  moid: string; // 接口 MOID
  ipAddress: string; // IP 地址
  statusNum: string; // 状态编号: "1"(严重), "2"(问题), "5"(正常)
  statusStr: string; // 状态字符串（可能为中文），如 "正常", "问题"
  statusString: string; // 状态字符串（英文），如 "Clear", "Trouble"
  status: string; // 状态编号（字符串）
  inSpeed: string; // 入站速度，如 "10 M", "10 G"
  outSpeed: string; // 出站速度，如 "10 M", "10 G"
  inTraffic: string; // 入站流量，如 "NA", "1.144 M"
  outTraffic: string; // 出站流量，如 "NA", "966.624 K"
  inUtil: string; // 入站利用率（百分比字符串），如 "0.04", "NA"
  outUtil: string; // 出站利用率（百分比字符串），如 "11.44", "NA"
  ifAdminStatus: string; // 管理状态: "1"(Up), "2"(Down)
  ifOperStatus: string; // 运行状态: "1"(Up), "2"(Down)
  isSuppressed: boolean;
  isSubInterface: string; // "true" | "false"
  pollingStatus: string; // 轮询状态
  errors: string; // 错误数
  bgColor?: string; // 背景颜色（十六进制）
  imagePath?: string; // 图标路径
  RouterPortType?: string;
  nfEnabled?: string;
  suppressedMessage?: string;
  trimmedDispName?: string;
  'connected-device'?: string;
}

/**
 * getInterfaces API 响应
 */
export interface OpManagerGetInterfacesResponse {
  isSNMP: boolean;
  downCount: string; // 宕机接口数量
  interfaceCount: string; // 接口总数
  showPollingStatusColumn: boolean;
  interfaces: OpManagerGetInterfacesInterfaceRaw[];
}

// ==================== listAlarms API 类型 ====================

/**
 * listAlarms API 返回的告警对象
 */
export interface OpManagerAlarmRaw {
  id: string; // 告警 ID
  severity: string; // 严重程度编号: "1"(严重), "2"(问题), "3"(注意), "4"(服务中断), "5"(正常)
  status: string; // 状态字符串，如 "Critical", "Trouble", "Clear"
  name: string; // 设备名称（Managed Entity name）
  message: string; // 告警消息内容
  modTime: string; // 修改时间，格式: "2022-05-02 08:00:00"
  category: string; // 类别
  entity: string; // 实体（如接口名、CPU等）
  alarmId: string; // 告警唯一标识符
}

// ==================== getBVDetails API 类型 ====================

/**
 * getBVDetails API 返回的链路对象
 */
export interface OpManagerBVLinkRaw {
  source: string; // 源设备名称
  dest: string; // 目的设备名称
  name: string; // 链路唯一名称
  type: string; // 类型，如 "Interface"
  ifName: string; // 接口名称
  intfDisplayName: string; // 接口显示名称
  InTraffic: string; // 入站流量
  OutTraffic: string; // 出站流量
  InUtil: string; // 入站利用率
  OutUtil: string; // 出站利用率
  status: string; // 链路状态
  parentDispName: string; // 源设备显示名称
  destParentDispName: string; // 目的设备显示名称
  smoothType?: string; // 曲线类型
  objName: string; // 接口对象名称
  destProps?: {
    ifName: string;
    intfDisplayName: string;
    InTraffic: string;
    OutTraffic: string;
    InUtil: string;
    OutUtil: string;
    status: string;
  };
}

/**
 * getBVDetails API 返回的设备对象（拓扑节点）
 */
export interface OpManagerBVSymbolRaw {
  objName: string; // 设备名称
  label: string; // 显示名称
  type: string; // 设备类型
  ipAddress?: string; // OPM 可能不返回或使用 IpAddress 等其它键
  x: string; // X 坐标
  y: string; // Y 坐标
  status: string; // 状态编号 1=严重 2=问题 3=注意 5=正常 7=未管理
  iconName: string; // 图标路径
}

/**
 * getBVDetails API 响应
 */
export interface OpManagerBVDetailsResponse {
  linkProperties: OpManagerBVLinkRaw[];
  deviceProperties: OpManagerBVSymbolRaw[];
  mapProperties: {
    name: string;
    label: string;
    [key: string]: any;
  };
}

// ==================== 统一的数据模型 ====================

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  CRITICAL = 1, // 严重
  TROUBLE = 2, // 问题
  ATTENTION = 3, // 注意
  SERVICE_DOWN = 4, // 服务中断
  CLEAR = 5, // 正常
  UNMANAGED = 7, // 未管理
}

/**
 * 设备类别枚举（英文值，用于API参数）
 */
export enum DeviceCategory {
  SERVER = 'Server',
  SWITCH = 'Switch',
  ROUTER = 'Router',
  PRINTER = 'Printer',
  DESKTOP = 'Desktop',
  FIREWALL = 'Firewall',
  WIRELESS = 'Wireless',
}

/**
 * 统一的设备基本信息模型
 */
export interface DeviceInfo {
  // 标识信息
  id: string;
  moid: number;
  deviceName: string; // Managed Entity name
  displayName: string;
  ipAddress: string;

  // 分类信息
  category: string; // 设备类别（可能为中文）
  categoryEn: string; // 设备类别（英文，用于API调用）
  type: string; // 设备类型/型号
  vendorName: string; // 厂商名称

  // 状态信息
  status: DeviceStatus;
  statusText: string; // 状态文本（可能为中文）

  // 监控信息
  isSNMP: boolean;
  isSuppressed: boolean;
  isNew: boolean;
  interfaceCount: number;

  // 时间信息
  addedTime: string;
  prettyTime: string;

  // 性能信息（可选，来自 getBusinessDetailsView）
  performance?: DevicePerformance;
}

/**
 * 设备性能信息模型
 */
export interface DevicePerformance {
  cpuUtilization: number; // CPU 利用率（百分比）
  memUtilization: number; // 内存利用率（百分比）
  severity: DeviceStatus; // 严重程度
  statusText: string; // 状态文本（英文）
  lastUpdated?: Date; // 最后更新时间
}

/**
 * 设备接口信息模型
 */
export interface DeviceInterface {
  // 标识信息
  id: string;
  interfaceName: string;
  interfaceDisplayName: string;
  deviceName: string; // 所属设备名称
  deviceDisplayName: string; // 所属设备显示名称

  // 类型信息
  type: string; // 接口类型

  // 状态信息
  operStatus: string; // 运行状态
  adminStatus: string; // 管理状态
  status: DeviceStatus;
  statusText: string;

  // 网络信息
  ipAddress: string;
  inSpeed: string; // 入站速度
  outSpeed: string; // 出站速度
  inTraffic: string; // 入站流量
  outTraffic: string; // 出站流量
  inUtilization?: number; // 入站利用率（百分比）
  outUtilization?: number; // 出站利用率（百分比）

  // 其他信息
  isSuppressed: boolean;
}

/**
 * 完整的设备数据模型（包含基本信息和接口信息）
 */
export interface Device {
  // 基本信息
  info: DeviceInfo;

  // 性能信息（可选）
  performance?: DevicePerformance;

  // 接口列表（可选）
  interfaces?: DeviceInterface[];
}

/**
 * 设备统计信息
 */
export interface DeviceStatistics {
  total: number;
  byStatus: Record<DeviceStatus, number>;
  byCategory: Record<string, number>;
  byVendor: Record<string, number>;
  byType: Record<string, number>;
  problemDevices: DeviceInfo[];
  totalInterfaces: number;
}

/**
 * 性能统计信息
 */
export interface PerformanceStatistics {
  total: number;
  avgCPU: number;
  avgMemory: number;
  maxCPU: number;
  maxMemory: number;
  highCPUDevices: DeviceInfo[]; // CPU > 80%
  highMemoryDevices: DeviceInfo[]; // 内存 > 80%
  byStatus: Record<string, number>;
}
