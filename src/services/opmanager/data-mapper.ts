/**
 * OpManager API 数据映射服务
 * 将 OpManager API 的原始响应数据转换为统一的数据模型
 */

import {
  OpManagerDeviceRaw,
  OpManagerBusinessViewDeviceRaw,
  OpManagerInterfaceRaw,
  OpManagerGetInterfacesInterfaceRaw,
  DeviceInfo,
  DevicePerformance,
  DeviceInterface,
  Device,
  DeviceStatus,
} from '@/types/opmanager';

/**
 * 将 statusNum 字符串转换为 DeviceStatus 枚举
 */
export function mapStatusNum(statusNum: string | number): DeviceStatus {
  const num = typeof statusNum === 'string' ? parseInt(statusNum, 10) : statusNum;
  
  switch (num) {
    case 1:
      return DeviceStatus.CRITICAL;
    case 2:
      return DeviceStatus.TROUBLE;
    case 3:
      return DeviceStatus.ATTENTION;
    case 4:
      return DeviceStatus.SERVICE_DOWN;
    case 5:
      return DeviceStatus.CLEAR;
    case 7:
      return DeviceStatus.UNMANAGED;
    default:
      return DeviceStatus.UNMANAGED;
  }
}

/**
 * 将设备类别中文转换为英文（用于API调用）
 */
export function mapCategoryToEnglish(category: string): string {
  const categoryMap: Record<string, string> = {
    '服务器': 'Server',
    '交换机': 'Switch',
    '路由器': 'Router',
    '打印机': 'Printer',
    '桌面': 'Desktop',
    '防火墙': 'Firewall',
    '无线': 'Wireless',
  };

  return categoryMap[category] || category;
}

/**
 * 将 listDevices API 的原始数据映射为 DeviceInfo
 */
export function mapDeviceRawToInfo(raw: OpManagerDeviceRaw): DeviceInfo {
  return {
    id: raw.id,
    moid: raw.moid,
    deviceName: raw.deviceName,
    displayName: raw.displayName,
    ipAddress: raw.ipaddress,
    category: raw.category,
    categoryEn: mapCategoryToEnglish(raw.category),
    type: raw.type,
    vendorName: raw.vendorName,
    status: mapStatusNum(raw.statusNum),
    statusText: raw.statusStr,
    isSNMP: raw.isSNMP,
    isSuppressed: raw.isSuppressed,
    isNew: raw.isNew,
    interfaceCount: raw.interfaceCount,
    addedTime: raw.addedTime,
    prettyTime: raw.prettyTime,
  };
}

/**
 * 将 getBusinessDetailsView API 的原始数据映射为 DevicePerformance
 */
export function mapBusinessViewDeviceToPerformance(
  raw: OpManagerBusinessViewDeviceRaw
): DevicePerformance {
  return {
    cpuUtilization: raw.CPUUtilization || 0,
    memUtilization: raw.MemUtilization || 0,
    severity: mapStatusNum(raw.severity),
    statusText: raw.status,
    lastUpdated: new Date(),
  };
}

/**
 * 将 listInterfaces API 的原始数据映射为 DeviceInterface
 */
export function mapInterfaceRawToInterface(raw: OpManagerInterfaceRaw): DeviceInterface {
  return {
    id: raw.id,
    interfaceName: raw.interfaceName,
    interfaceDisplayName: raw.interfaceDisplayName,
    deviceName: raw.deviceName,
    deviceDisplayName: raw.displayName,
    type: raw.type,
    operStatus: raw.operStatus,
    adminStatus: raw.adminStatus,
    status: mapStatusNum(raw.statusNum),
    statusText: raw.statusStr,
    ipAddress: raw.ipAddress || '',
    inSpeed: raw.inSpeed,
    outSpeed: raw.outSpeed,
    inTraffic: raw.inTraffic,
    outTraffic: raw.outTraffic,
    inUtilization: raw.inUtil,
    outUtilization: raw.outUtil,
    isSuppressed: raw.isSuppressed,
  };
}

/**
 * 将 getInterfaces API 的原始数据映射为 DeviceInterface
 * 注意：getInterfaces API 返回的格式与 listInterfaces 不同
 */
export function mapGetInterfacesRawToInterface(
  raw: OpManagerGetInterfacesInterfaceRaw,
  deviceName: string,
  deviceDisplayName?: string
): DeviceInterface {
  // 解析 inUtil 和 outUtil（可能是 "NA" 或数字字符串）
  const parseUtil = (util: string): number | undefined => {
    if (!util || util === 'NA' || util.trim() === '') return undefined;
    const num = parseFloat(util);
    return isNaN(num) ? undefined : num;
  };

  // 映射管理状态和运行状态
  const mapAdminStatus = (status: string): string => {
    return status === '1' ? '运行' : status === '2' ? '停止' : status;
  };

  const mapOperStatus = (status: string): string => {
    return status === '1' ? '运行' : status === '2' ? '停止' : status;
  };

  return {
    id: raw.moid,
    interfaceName: raw.name,
    interfaceDisplayName: raw.displayName,
    deviceName: deviceName,
    deviceDisplayName: deviceDisplayName || '',
    type: raw.ifType || raw.type,
    operStatus: mapOperStatus(raw.ifOperStatus),
    adminStatus: mapAdminStatus(raw.ifAdminStatus),
    status: mapStatusNum(raw.statusNum),
    statusText: raw.statusStr,
    ipAddress: raw.ipAddress || '',
    inSpeed: raw.inSpeed,
    outSpeed: raw.outSpeed,
    inTraffic: raw.inTraffic,
    outTraffic: raw.outTraffic,
    inUtilization: parseUtil(raw.inUtil),
    outUtilization: parseUtil(raw.outUtil),
    isSuppressed: raw.isSuppressed,
  };
}

/**
 * 合并设备基本信息和性能信息
 */
export function mergeDeviceInfoWithPerformance(
  deviceInfo: DeviceInfo,
  performance: DevicePerformance
): DeviceInfo {
  return {
    ...deviceInfo,
    performance,
  };
}

/**
 * 合并设备信息和接口列表
 */
export function mergeDeviceWithInterfaces(
  deviceInfo: DeviceInfo,
  interfaces: DeviceInterface[]
): Device {
  return {
    info: deviceInfo,
    performance: deviceInfo.performance,
    interfaces,
  };
}

/**
 * 根据 deviceName 匹配设备
 */
export function matchDeviceByName(
  deviceName: string,
  devices: DeviceInfo[]
): DeviceInfo | undefined {
  return devices.find((d) => d.deviceName === deviceName);
}

/**
 * 根据 deviceName 匹配接口列表
 */
export function matchInterfacesByDeviceName(
  deviceName: string,
  interfaces: DeviceInterface[]
): DeviceInterface[] {
  return interfaces.filter((iface) => iface.deviceName === deviceName);
}

/**
 * 批量合并设备数据（基本信息 + 性能信息 + 接口信息）
 */
export function mergeDeviceData(
  devices: DeviceInfo[],
  performances: Map<string, DevicePerformance>, // key: deviceName
  interfaces: Map<string, DeviceInterface[]> // key: deviceName
): Device[] {
  return devices.map((device) => {
    const performance = performances.get(device.deviceName);
    const deviceInterfaces = interfaces.get(device.deviceName) || [];

    const deviceWithPerformance = performance
      ? mergeDeviceInfoWithPerformance(device, performance)
      : device;

    return mergeDeviceWithInterfaces(deviceWithPerformance, deviceInterfaces);
  });
}

/**
 * 将性能数据转换为 Map（以 deviceName 为 key）
 */
export function performanceArrayToMap(
  performances: Array<{ name: string; performance: DevicePerformance }>
): Map<string, DevicePerformance> {
  const map = new Map<string, DevicePerformance>();
  performances.forEach(({ name, performance }) => {
    map.set(name, performance);
  });
  return map;
}

/**
 * 将接口数据转换为 Map（以 deviceName 为 key）
 */
export function interfacesArrayToMap(
  interfaces: DeviceInterface[]
): Map<string, DeviceInterface[]> {
  const map = new Map<string, DeviceInterface[]>();
  interfaces.forEach((iface) => {
    const existing = map.get(iface.deviceName) || [];
    existing.push(iface);
    map.set(iface.deviceName, existing);
  });
  return map;
}
