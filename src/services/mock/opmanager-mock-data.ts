/**
 * OpManager Mock 数据生成器
 * 基于真实 API 返回结果，生成模拟数据并支持动态更新
 */

import {
  OpManagerDeviceRaw,
  OpManagerBusinessViewDeviceRaw,
  OpManagerInterfaceRaw,
  OpManagerGetInterfacesInterfaceRaw,
  OpManagerGetInterfacesResponse,
  OpManagerAlarmRaw,
  OpManagerBVLinkRaw,
  OpManagerBVSymbolRaw,
  OpManagerBVDetailsResponse,
  DeviceCategory,
  DeviceStatus,
} from '@/types/opmanager';

/**
 * Mock 配置
 */
export interface MockConfig {
  // 设备配置
  deviceCategories: string[]; // 设备类别列表
  deviceTypes: Record<string, string[]>; // 每个类别对应的设备类型
  vendors: Record<string, string[]>; // 每个类别对应的厂商
  businessViews: string[]; // 业务视图名称列表
  deviceCount: number; // 设备总数
  interfaceCountPerDevice: number; // 每个设备的平均接口数
}

/**
 * 默认配置
 */
export const DEFAULT_MOCK_CONFIG: MockConfig = {
  deviceCategories: ['服务器', '交换机', '路由器', '防火墙'],
  deviceTypes: {
    服务器: ['Windows 2019', 'Windows 2016', 'Linux', '华为服务器'],
    交换机: ['H3C S5130S-28S-EI', 'H3C-S10508', 'Cisco Catalyst'],
    路由器: ['H3C 路由器', 'Cisco 路由器'],
    防火墙: ['深信服 AC1200', 'Linux 防火墙', '深信服下一代防火墙'],
  },
  vendors: {
    服务器: ['Microsoft', '华为', 'Dell', 'HP'],
    交换机: ['H3C', 'Cisco', '华为'],
    路由器: ['H3C', 'Cisco'],
    防火墙: ['深信服', 'Linux'],
  },
  businessViews: ['TEST', '出口业务', '核心业务', '办公网络', '生产网络'],
  deviceCount: 50,
  interfaceCountPerDevice: 25,
};

/**
 * 生成随机数（在范围内）
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机浮点数（在范围内）
 */
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 从数组中随机选择一个元素
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成随机 IP 地址
 */
function generateRandomIP(): string {
  return `10.141.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

/**
 * 生成设备名称（格式: IP.设备ID）
 */
function generateDeviceName(ip: string, moid: number): string {
  return `${ip}.${moid}`;
}

/**
 * 生成状态（随机，但倾向于正常状态）
 */
function generateStatus(): { statusNum: string; statusStr: string } {
  const rand = Math.random();
  if (rand < 0.7) {
    // 70% 概率为正常
    return { statusNum: '5', statusStr: '正常' };
  } else if (rand < 0.85) {
    // 15% 概率为问题
    return { statusNum: '2', statusStr: '问题' };
  } else if (rand < 0.95) {
    // 10% 概率为注意
    return { statusNum: '3', statusStr: '注意' };
  } else {
    // 5% 概率为严重
    return { statusNum: '1', statusStr: '严重' };
  }
}

/**
 * 生成设备基本信息（listDevices API）
 */
export function generateDeviceRaw(
  index: number,
  config: MockConfig
): OpManagerDeviceRaw {
  const category = randomChoice(config.deviceCategories);
  const type = randomChoice(config.deviceTypes[category] || []);
  const vendor = randomChoice(config.vendors[category] || ['Unknown']);
  const ip = generateRandomIP();
  const moid = 10000000000 + index;
  const deviceName = generateDeviceName(ip, moid);
  const status = generateStatus();

  return {
    id: String(moid),
    moid,
    deviceName,
    displayName: `${category}${index + 1}_${ip.split('.').pop()}`,
    ipaddress: ip,
    type,
    vendorName: vendor,
    category,
    statusNum: status.statusNum,
    statusStr: status.statusStr,
    isSNMP: Math.random() > 0.2, // 80% 使用 SNMP
    isSuppressed: Math.random() > 0.9, // 10% 被抑制
    isNew: Math.random() > 0.95, // 5% 为新设备
    interfaceCount: randomInt(15, 35),
    addedTime: new Date(Date.now() - randomInt(1, 365) * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19),
    prettyTime: `${randomInt(1, 50)} 天之前`,
    temperature: category === '交换机' ? randomFloat(22, 28) : undefined,
    diskUsage: category === '服务器' ? randomFloat(20, 85) : undefined,
  };
}

/**
 * 生成设备性能信息（getBusinessDetailsView API）
 */
export function generateBusinessViewDeviceRaw(
  deviceName: string,
  displayName: string,
  ipAddress: string,
  type: string,
  baseCPU: number = 0,
  baseMemory: number = 0
): OpManagerBusinessViewDeviceRaw {
  // CPU 和内存利用率在基础值附近随机波动（±20%）
  const cpuVariation = randomFloat(-20, 20);
  const memVariation = randomFloat(-20, 20);

  const cpuUtilization = Math.max(0, Math.min(100, baseCPU + cpuVariation));
  const memUtilization = Math.max(0, Math.min(100, baseMemory + memVariation));

  // 根据利用率确定状态
  let severity = '5';
  let status = 'Clear';

  if (cpuUtilization > 90 || memUtilization > 90) {
    severity = '1';
    status = 'Critical';
  } else if (cpuUtilization > 80 || memUtilization > 80) {
    severity = '2';
    status = 'Trouble';
  } else if (cpuUtilization > 70 || memUtilization > 70) {
    severity = '3';
    status = 'Attention';
  }

  return {
    name: deviceName,
    displayName,
    IpAddress: ipAddress,
    type,
    severity,
    status,
    CPUUtilization: Math.round(cpuUtilization * 10) / 10,
    MemUtilization: Math.round(memUtilization * 10) / 10,
  };
}

/**
 * 生成状态字符串（英文）
 */
function getStatusString(statusNum: string): string {
  const statusMap: Record<string, string> = {
    '1': 'Critical',
    '2': 'Trouble',
    '3': 'Attention',
    '4': 'Service Down',
    '5': 'Clear',
    '7': 'Unknown',
  };
  return statusMap[statusNum] || 'Unknown';
}

/**
 * 生成背景颜色（基于状态）
 */
function getBgColor(statusNum: string): string {
  const colorMap: Record<string, string> = {
    '1': 'ff0000', // 红色 - 严重
    '2': 'ff8000', // 橙色 - 问题
    '3': 'ffff00', // 黄色 - 注意
    '4': '808080', // 灰色 - 服务中断
    '5': '00ff00', // 绿色 - 正常
    '7': 'c0c0c0', // 银色 - 未知
  };
  return colorMap[statusNum] || 'c0c0c0';
}

/**
 * 生成接口信息（listInterfaces API）
 */
export function generateInterfaceRaw(
  deviceName: string,
  deviceDisplayName: string,
  deviceIP: string,
  interfaceIndex: number,
  totalInterfaces: number
): OpManagerInterfaceRaw {
  const status = generateStatus();
  const isUp = status.statusNum === '5';

  const interfaceTypes = ['Ethernet', 'IEEE 802.3ad Lag', 'VLAN', 'Loopback'];
  const speeds = ['10 M', '100 M', '1 G', '10 G', '2 G'];

  const type = randomChoice(interfaceTypes);
  const inSpeed = randomChoice(speeds);
  const outSpeed = randomChoice(speeds);

  const moid = 10000000000 + interfaceIndex;
  const interfaceName = `IF-${deviceName}-${moid}`;

  // 生成流量数据
  const inTraffic = isUp
    ? `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`
    : 'NA';
  const outTraffic = isUp
    ? `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`
    : 'NA';

  const inUtil = isUp ? randomFloat(0, 100) : undefined;
  const outUtil = isUp ? randomFloat(0, 100) : undefined;

  return {
    id: String(moid),
    interfaceName,
    interfaceDisplayName: `${type}${interfaceIndex}-${interfaceName.substring(0, 20)}`,
    deviceName,
    displayName: deviceDisplayName,
    ipAddress: interfaceIndex === 1 ? deviceIP : '', // 第一个接口使用设备 IP
    type,
    operStatus: isUp ? '运行' : '停止',
    adminStatus: isUp ? '运行' : '停止',
    statusNum: parseInt(status.statusNum, 10),
    statusStr: status.statusStr,
    inSpeed,
    outSpeed,
    inTraffic,
    outTraffic,
    inUtil: inUtil ? Math.round(inUtil * 10) / 10 : undefined,
    outUtil: outUtil ? Math.round(outUtil * 10) / 10 : undefined,
    isSuppressed: Math.random() > 0.95, // 5% 被抑制
  };
}

/**
 * 生成接口信息（getInterfaces API 格式）
 */
export function generateGetInterfacesInterfaceRaw(
  deviceName: string,
  deviceIP: string,
  ifIndex: number,
  isSNMP: boolean
): OpManagerGetInterfacesInterfaceRaw {
  const status = generateStatus();
  const isUp = status.statusNum === '5';

  const interfaceTypes = ['Ethernet', 'L3ipvlan', 'IEEE 802.3ad Lag', 'Loopback'];
  const speeds = ['10 M', '100 M', '1 G', '10 G', '2 G'];

  const ifType = randomChoice(interfaceTypes);
  const inSpeed = randomChoice(speeds);
  const outSpeed = randomChoice(speeds);

  const moid = 10000000000 + ifIndex;
  const name = `IF-${deviceName}-${moid}`;

  // 生成显示名称
  const displayName = ifType === 'Ethernet'
    ? `GigabitEthernet${ifIndex}/0/${ifIndex % 10 + 1}-GigabitEthernet${ifIndex}/0/${ifIndex % 10 + 1} Interface`
    : ifType === 'L3ipvlan'
      ? `Vlan-interface${ifIndex}-Vlan-interface${ifIndex} Interface`
      : `${ifType}${ifIndex}-${ifType}${ifIndex} Interface`;

  const trimmedDispName = displayName.length > 30
    ? `${displayName.substring(0, 27)}...`
    : displayName;

  // 生成流量数据
  const inTraffic = isUp
    ? `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`
    : 'NA';
  const outTraffic = isUp
    ? `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`
    : 'NA';

  const inUtil = isUp ? randomFloat(0, 100) : 0;
  const outUtil = isUp ? randomFloat(0, 100) : 0;

  const bgColor = getBgColor(status.statusNum);
  const statusString = getStatusString(status.statusNum);

  // 生成图标路径（基于接口类型）
  const imagePath = ifType === 'Ethernet'
    ? '/apiclient/ember/images/intfTypes/ifType6.gif'
    : ifType === 'L3ipvlan'
      ? '/apiclient/ember/images/intfTypes/anonIfType.gif'
      : '/apiclient/ember/images/intfTypes/ifType6.gif';

  return {
    ifIndex: String(ifIndex),
    ifIndexNum: ifIndex,
    name,
    displayName,
    trimmedDispName,
    ifType,
    type: 'Interface',
    moid: String(moid),
    ipAddress: ifIndex === 1 ? deviceIP : '', // 第一个接口使用设备 IP
    statusNum: status.statusNum,
    status: status.statusNum,
    statusStr: status.statusStr,
    statusString,
    ifAdminStatus: isUp ? '1' : '2',
    ifOperStatus: isUp ? '1' : '2',
    inSpeed,
    outSpeed,
    inTraffic,
    outTraffic,
    inUtil: isUp ? inUtil.toFixed(2) : '0.0',
    outUtil: isUp ? outUtil.toFixed(2) : '0.0',
    errors: String(randomInt(0, 1000)),
    isSuppressed: Math.random() > 0.95, // 5% 被抑制
    isSubInterface: 'false',
    nfEnabled: 'false',
    pollingStatus: '0',
    bgColor,
    imagePath,
    RouterPortType: '',
    'connected-device': '',
    suppressedMessage: '',
  };
}

/**
 * Mock 数据存储
 */
class MockDataStore {
  private devices: OpManagerDeviceRaw[] = [];
  private businessViewDevices: Map<string, OpManagerBusinessViewDeviceRaw[]> = new Map();
  private bvTopologies: Map<string, OpManagerBVDetailsResponse> = new Map();
  private alarms: OpManagerAlarmRaw[] = [];
  private interfaces: OpManagerInterfaceRaw[] = [];
  private config: MockConfig;
  private lastUpdateTime: Date = new Date();

  constructor(config: MockConfig = DEFAULT_MOCK_CONFIG) {
    this.config = config;
    this.generateAllData();
  }

  /**
   * 生成所有数据
   */
  private generateAllData() {
    // 1. 生成设备基本信息
    this.devices = [];
    for (let i = 0; i < this.config.deviceCount; i++) {
      const device = generateDeviceRaw(i, this.config);

      // 为设备分配标签
      const tags = [];
      if (i < 10) tags.push('重要设备');
      if (device.category === '服务器') tags.push('服务器');
      if (device.category === '交换机' || device.category === '路由器' || device.category === '防火墙') {
        tags.push('网络设备');
      }

      (device as any).tags = tags;
      this.devices.push(device);
    }

    // 2. 为每个业务视图生成设备性能信息和拓扑结构
    this.businessViewDevices.clear();
    this.bvTopologies.clear();
    this.config.businessViews.forEach((bvName) => {
      const perfDevices: OpManagerBusinessViewDeviceRaw[] = [];
      const topologyNodes: OpManagerBVSymbolRaw[] = [];
      const topologyLinks: OpManagerBVLinkRaw[] = [];

      // 每个业务视图包含部分设备（随机选择）
      let deviceCount = randomInt(
        Math.floor(this.config.deviceCount * 0.3),
        Math.floor(this.config.deviceCount * 0.5)
      );

      // 特殊处理 TEST 视图，仅包含 4 个设备
      if (bvName === 'TEST') {
        deviceCount = 4;
      }

      let selectedDevices = this.devices
        .sort(() => Math.random() - 0.5)
        .slice(0, deviceCount);

      // 如果是 TEST 视图，确保包含不同类型的网络设备
      if (bvName === 'TEST') {
        const networkDevices = this.devices.filter(d => 
          ['交换机', '路由器', '防火墙'].includes(d.category)
        ).slice(0, 4);
        if (networkDevices.length >= 4) {
          selectedDevices = networkDevices;
        }
      }

      // 生成拓扑节点
      selectedDevices.forEach((device, index) => {
        // 性能数据
        const baseCPU = device.statusNum === '5' ? randomFloat(10, 50) : randomFloat(60, 95);
        const baseMemory = device.statusNum === '5' ? randomFloat(20, 60) : randomFloat(70, 95);

        perfDevices.push(
          generateBusinessViewDeviceRaw(
            device.deviceName,
            device.displayName,
            device.ipaddress,
            device.type,
            baseCPU,
            baseMemory
          )
        );

        // 拓扑节点 (随机分布或环形分布)
        const angle = (index / selectedDevices.length) * 2 * Math.PI;
        const radius = 300;
        topologyNodes.push({
          objName: device.deviceName,
          label: device.displayName,
          type: device.type,
          ipAddress: device.ipaddress,
          x: String(Math.round(Math.cos(angle) * radius)),
          y: String(Math.round(Math.sin(angle) * radius)),
          status: device.statusNum,
          iconName: `/Custom_DevIcon_${randomInt(1000000000000, 2000000000000)}.png`
        });
      });

      // 简单生成一些链路 (确保接口 ID 与 InterfaceCollector 匹配)
      for (let i = 0; i < topologyNodes.length; i++) {
        const source = topologyNodes[i];
        const dest = topologyNodes[(i + 1) % topologyNodes.length];
        
        // 匹配 InterfaceCollector 中的 uniqueOpManagerId 格式: ${deviceName}_${interfaceId}
        const ifIndex = 10000000001 + i;
        const interfaceOpId = `${source.objName}_${ifIndex}`;

        topologyLinks.push({
          source: source.objName,
          dest: dest.objName,
          name: `${source.objName}~${dest.objName}~${Date.now()}#${i}`,
          type: 'Interface',
          ifName: `GigabitEthernet${i}/0/1`,
          intfDisplayName: `GigabitEthernet${i}/0/1-to-${dest.label}`,
          InTraffic: `${randomFloat(1, 100).toFixed(3)} Mbps`,
          OutTraffic: `${randomFloat(1, 100).toFixed(3)} Mbps`,
          InUtil: randomFloat(1, 10).toFixed(2),
          OutUtil: randomFloat(1, 10).toFixed(2),
          status: source.status === '5' && dest.status === '5' ? '2' : '1', // 拓扑状态映射
          parentDispName: source.label,
          destParentDispName: dest.label,
          objName: interfaceOpId,
          destProps: {
            ifName: `GigabitEthernet2/0/${i}`,
            intfDisplayName: `GigabitEthernet2/0/${i}-Interface`,
            InTraffic: `${randomFloat(1, 100).toFixed(3)} Mbps`,
            OutTraffic: `${randomFloat(1, 100).toFixed(3)} Mbps`,
            InUtil: randomFloat(1, 10).toFixed(2),
            OutUtil: randomFloat(1, 10).toFixed(2),
            status: '5'
          }
        });
      }

      this.businessViewDevices.set(bvName, perfDevices);
      this.bvTopologies.set(bvName, {
        linkProperties: topologyLinks,
        deviceProperties: topologyNodes,
        mapProperties: {
          name: `${bvName}_bview.netmap`,
          label: bvName
        }
      });
    });

    // 3. 生成接口信息
    this.interfaces = [];
    this.devices.forEach((device) => {
      const interfaceCount = randomInt(
        Math.floor(device.interfaceCount * 0.8),
        Math.floor(device.interfaceCount * 1.2)
      );

      for (let i = 0; i < interfaceCount; i++) {
        this.interfaces.push(
          generateInterfaceRaw(
            device.deviceName,
            device.displayName,
            device.ipaddress,
            this.interfaces.length + 1,
            interfaceCount
          )
        );
      }
    });

    // 4. 生成告警信息
    this.generateInitialAlarms();

    this.lastUpdateTime = new Date();
  }

  /**
   * 生成初始告警
   */
  private generateInitialAlarms() {
    this.alarms = [];
    this.devices.forEach(device => {
      if (device.statusNum !== '5') {
        this.alarms.push(this.createAlarmForDevice(device));
      }
    });
  }

  /**
   * 为设备创建告警
   */
  private createAlarmForDevice(device: OpManagerDeviceRaw): OpManagerAlarmRaw {
    const statusStr = getStatusString(device.statusNum);
    const alarmId = `ALARM-${device.moid}-${Date.now()}`;
    return {
      id: String(randomInt(100, 10000)),
      severity: device.statusNum,
      status: statusStr,
      name: device.deviceName,
      message: device.statusNum === '1' ? `设备 ${device.displayName} 宕机，无法访问` : `设备 ${device.displayName} 资源使用率过高`,
      modTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      category: device.category,
      entity: randomChoice(['CPU', '内存', '接口']),
      alarmId: alarmId
    };
  }

  /**
   * 更新数据（模拟真实设备运行，随机变化）
   */
  updateData() {
    // 随机更新部分设备的状态
    this.devices.forEach((device) => {
      if (Math.random() < 0.1) {
        // 10% 的设备状态可能变化
        const status = generateStatus();
        device.statusNum = status.statusNum;
        device.statusStr = status.statusStr;
      }
    });

    // 更新性能数据（在原有基础上波动）
    this.businessViewDevices.forEach((devices, bvName) => {
      devices.forEach((device) => {
        // CPU 和内存利用率在 ±5% 范围内波动
        device.CPUUtilization = Math.max(
          0,
          Math.min(100, device.CPUUtilization + randomFloat(-5, 5))
        );
        device.MemUtilization = Math.max(
          0,
          Math.min(100, device.MemUtilization + randomFloat(-5, 5))
        );

        // 根据新的利用率更新状态
        if (device.CPUUtilization > 90 || device.MemUtilization > 90) {
          device.severity = '1';
          device.status = 'Critical';
        } else if (device.CPUUtilization > 80 || device.MemUtilization > 80) {
          device.severity = '2';
          device.status = 'Trouble';
        } else if (device.CPUUtilization > 70 || device.MemUtilization > 70) {
          device.severity = '3';
          device.status = 'Attention';
        } else {
          device.severity = '5';
          device.status = 'Clear';
        }
      });
    });

    // 更新接口状态和流量
    this.interfaces.forEach((iface) => {
      if (Math.random() < 0.05) {
        // 5% 的接口状态可能变化
        const status = generateStatus();
        iface.statusNum = parseInt(status.statusNum, 10);
        iface.statusStr = status.statusStr;
        iface.operStatus = status.statusNum === '5' ? '运行' : '停止';
        iface.adminStatus = status.statusNum === '5' ? '运行' : '停止';
      }

      // 更新流量数据（如果接口是运行的）
      if (iface.operStatus === '运行' && iface.inUtil !== undefined) {
        iface.inUtil = Math.max(0, Math.min(100, (iface.inUtil || 0) + randomFloat(-10, 10)));
        iface.outUtil = Math.max(0, Math.min(100, (iface.outUtil || 0) + randomFloat(-10, 10)));

        // 更新流量字符串
        iface.inTraffic = `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`;
        iface.outTraffic = `${randomFloat(0.1, 100).toFixed(3)} ${randomChoice(['K', 'M', 'G'])}`;
      }
    });

    // 随机产生新告警或清除旧告警
    if (Math.random() < 0.3) {
      const device = randomChoice(this.devices);
      if (device.statusNum !== '5') {
        // 如果设备有问题，且没有告警，则添加告警
        const existing = this.alarms.find(a => a.name === device.deviceName);
        if (!existing) {
          this.alarms.push(this.createAlarmForDevice(device));
        }
      }
    }

    // 清除正常设备的告警
    this.alarms = this.alarms.filter(a => {
      const dev = this.devices.find(d => d.deviceName === a.name);
      return dev && dev.statusNum !== '5';
    });

    this.lastUpdateTime = new Date();
  }

  /**
   * 获取设备列表
   */
  getDevices(options?: {
    category?: string;
    tags?: string;
    page?: number;
    rows?: number;
  }): {
    total: number;
    page: number;
    rows: OpManagerDeviceRaw[];
    records: number;
  } {
    let filtered = [...this.devices];

    // 按类别过滤
    if (options?.category) {
      filtered = filtered.filter((d) => d.category === options.category);
    }

    // 按标签过滤
    if (options?.tags) {
      const tagList = options.tags.split(',');
      filtered = filtered.filter((d) =>
        d.tags && tagList.some(tag => d.tags?.includes(tag))
      );
    }

    const total = filtered.length;
    const page = options?.page || 1;
    const rows = options?.rows || 50;
    const start = (page - 1) * rows;
    const end = start + rows;

    return {
      total: 0, // 保持与真实 API 一致
      page,
      rows: filtered.slice(start, end),
      records: total,
    };
  }

  /**
   * 获取业务视图设备
   */
  getBusinessViewDevices(
    bvName: string,
    startPoint: number = 0,
    viewLength: number = 50
  ): {
    BusinessDetailsView: {
      TotalRecords: string;
      Details: OpManagerBusinessViewDeviceRaw[];
    };
  } {
    const devices = this.businessViewDevices.get(bvName) || [];
    const total = devices.length;
    const end = Math.min(startPoint + viewLength, total);

    return {
      BusinessDetailsView: {
        TotalRecords: String(total),
        Details: devices.slice(startPoint, end),
      },
    };
  }

  /**
   * 获取设备快照（用于 Metric Collection）
   */
  getDeviceSnapshot(deviceName: string): any {
    const device = this.devices.find(d => d.deviceName === deviceName);
    if (!device) return null;

    // 查找该设备是否在某个业务视图中（为了保持数据一致性）
    let perfDevice: OpManagerBusinessViewDeviceRaw | undefined;
    for (const devices of this.businessViewDevices.values()) {
      const found = devices.find(d => d.name === deviceName);
      if (found) {
        perfDevice = found;
        break;
      }
    }

    // 如果没有业务视图数据，则随机生成
    const cpu = perfDevice ? String(perfDevice.CPUUtilization) : String(randomInt(10, 90));
    const mem = perfDevice ? String(perfDevice.MemUtilization) : String(randomInt(20, 80));

    return {
      name: deviceName,
      displayName: device.displayName,
      ipAddress: device.ipaddress,
      type: device.type,
      status: device.statusStr,
      // 模拟 dials 数据结构 (MetricCollector 优先使用)
      dials: [
        { displayName: 'CPU Usage', value: cpu },
        { displayName: 'Memory Usage', value: mem },
        { displayName: 'Partition Details', value: String(randomInt(30, 60)) } // Disk
      ],
      // 备用字段
      cpuUtilization: cpu,
      memoryUtilization: mem,
      responseTime: String(randomInt(1, 100)),
      packetLoss: String(randomInt(0, 5)),
      sysDescr: "Mock Device System Description",
      osName: device.category === '服务器' ? 'Windows' : 'Cisco IOS'
    };
  }

  /**
   * 获取业务视图拓扑
   */
  getBusinessViewTopology(bvName: string): OpManagerBVDetailsResponse | null {
    // Return the generated topology from the map
    return this.bvTopologies.get(bvName) || null;
  }


  /**
   * 获取告警列表
   */
  getAlarms(options?: {
    deviceName?: string;
    severity?: string;
    alertType?: string;
  }): OpManagerAlarmRaw[] {
    let filtered = [...this.alarms];

    if (options?.deviceName) {
      filtered = filtered.filter(a => a.name === options.deviceName);
    }

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    // ActiveAlarms 过滤逻辑
    if (options?.alertType === 'ActiveAlarms') {
      filtered = filtered.filter(a => a.severity !== '5');
    }

    return filtered.sort((a, b) => new Date(b.modTime).getTime() - new Date(a.modTime).getTime());
  }

  /**
   * 获取接口列表（listInterfaces API）
   */
  getInterfaces(options?: {
    deviceName?: string;
    page?: number;
    rows?: number;
  }): {
    total: string;
    records: string;
    page: string;
    rows: OpManagerInterfaceRaw[];
  } {
    let filtered = [...this.interfaces];

    // 按设备名称过滤
    if (options?.deviceName) {
      filtered = filtered.filter((iface) => iface.deviceName === options.deviceName);
    }

    const total = filtered.length;
    const page = options?.page || 1;
    const rows = options?.rows || 100;
    const start = (page - 1) * rows;
    const end = start + rows;

    return {
      total: '0', // 保持与真实 API 一致
      records: String(total),
      page: String(page),
      rows: filtered.slice(start, end),
    };
  }

  /**
   * 获取设备接口（getInterfaces API）
   */
  getInterfacesForDevice(deviceName: string): OpManagerGetInterfacesResponse {
    // 查找设备
    const device = this.devices.find((d) => d.deviceName === deviceName);
    if (!device) {
      // 如果设备不存在，返回空响应
      return {
        isSNMP: true,
        downCount: '0',
        interfaceCount: '0',
        showPollingStatusColumn: true,
        interfaces: [],
      };
    }

    // 获取该设备的所有接口（从 listInterfaces 数据中）
    const deviceInterfaces = this.interfaces.filter(
      (iface) => iface.deviceName === deviceName
    );

    // 转换为 getInterfaces 格式
    const getInterfacesData: OpManagerGetInterfacesInterfaceRaw[] = deviceInterfaces.map(
      (iface, index) => {
        const ifIndex = index + 1;
        return generateGetInterfacesInterfaceRaw(
          deviceName,
          device.ipaddress,
          ifIndex,
          device.isSNMP
        );
      }
    );

    // 计算关闭的接口数量
    const downCount = getInterfacesData.filter(
      (iface) => iface.ifOperStatus === '2'
    ).length;

    return {
      isSNMP: device.isSNMP,
      downCount: String(downCount),
      interfaceCount: String(getInterfacesData.length),
      showPollingStatusColumn: true,
      interfaces: getInterfacesData,
    };
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MockConfig>) {
    this.config = { ...this.config, ...config };
    this.generateAllData();
  }

  /**
   * 获取配置
   */
  getConfig(): MockConfig {
    return { ...this.config };
  }
}

// 单例实例
let mockDataStore: MockDataStore | null = null;

/**
 * 获取 Mock 数据存储实例
 */
export function getMockDataStore(config?: MockConfig): MockDataStore {
  if (!mockDataStore) {
    mockDataStore = new MockDataStore(config);
  }
  return mockDataStore;
}

/**
 * 重置 Mock 数据存储（用于测试）
 */
export function resetMockDataStore(config?: MockConfig) {
  mockDataStore = new MockDataStore(config);
}
