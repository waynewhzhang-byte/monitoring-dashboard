export interface OpManagerDevice {
  name: string;
  displayName: string;
  type: string;
  ipAddress: string;
  status: string; // "Attention" | "Trouble" | "Critical" | "Clear"
  machinename: string;
  category: string;
  vendorName?: string;
  modelName?: string;
  serviceTags?: string;
  isManaged: string; // "true" | "false"
  osName?: string;
  sysDescription?: string;
  location?: string;
  contact?: string;
  cpuUtilization?: number;
  memoryUtilization?: number;
  diskUtilization?: number;
  responseTime?: number;
  packetLoss?: number;
  availability?: number;
  tags?: string | string[]; // Device tags (can be string or array)
}

export interface OpManagerAlarm {
  id: string;
  severity: string; // "Critical" | "Major" | "Minor" | "Warning" | "Clear"
  name: string; // Device Name
  message: string;
  modTime: string; // Timestamp
  category: string;
  entity: string; // Source entity
}

export interface OpManagerInterface {
  name: string;
  displayName: string;
  status: string;
  statusStr?: string;
  statusNum?: string | number;
  ifAdminStatus?: string;
  ifOperStatus?: string;
  inTraffic: string | number;
  outTraffic: string | number;
  inSpeed: string | number;
  outSpeed: string | number;
  inUtil?: string | number;
  outUtil?: string | number;
  ifIndex: string | number;
  ifIndexNum?: number;
  moid?: string;
  id?: string;
  interfaceId?: string;
  ipAddress?: string;
  macAddress?: string;
  mtu?: number;
  ifType?: string;
  type?: string;
  errors?: string | number;
  isSuppressed?: boolean;
  isSubInterface?: boolean;
  nfEnabled?: boolean;
  pollingStatus?: string | number;
  imagePath?: string;
  bgColor?: string;
  deviceName?: string;
}

export interface OpManagerResponse<T> {
  result: T;
}

/**
 * Raw OpManager API response structures
 * Used to avoid 'any' in client code
 */
export interface OpManagerRawDevice {
  ipAddress?: string;
  ipaddress?: string;
  name?: string;
  deviceName?: string;
  displayName?: string;
  DisplayName?: string;
  type?: string;
  Type?: string;
  category?: string;
  Category?: string;
  vendorName?: string;
  VendorName?: string;
  vendor?: string;
  [key: string]: unknown;
}

export interface OpManagerListDevicesRawResponse {
  rows?: OpManagerRawDevice[];
  total?: number;
  records?: number;
  page?: number;
  [key: string]: unknown;
}

export interface OpManagerGetInterfacesRawResponse {
  interfaces?: Record<string, unknown>[];
  error?: string;
  total?: number;
  records?: number;
  page?: number;
  [key: string]: unknown;
}
