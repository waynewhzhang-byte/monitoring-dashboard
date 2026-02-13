import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { OpManagerDataCollector } from '@/services/opmanager/data-collector';
import { env } from '@/lib/env';
import { isNetworkDevice, isHardwareServer } from '@/lib/utils';

/** 从 OpManager 设备对象中解析 CPU/内存利用率（支持 PascalCase/camelCase、number/string，保留 0） */
function parseUtilization(opDevice: any, pascalKey: 'CPUUtilization' | 'MemUtilization'): number {
  const camelKey = pascalKey === 'CPUUtilization' ? 'cpuUtilization' : 'memUtilization';
  const raw = opDevice[pascalKey] ?? opDevice[camelKey];
  if (raw === undefined || raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

interface GroupedDevice {
  id: string;
  name: string;
  displayName: string;
  ipAddress: string;
  type: string;
  status: string;
  cpuUtilization: number;
  memUtilization: number;
  severity: string;
}

interface BusinessViewGroup {
  viewName: string;
  viewDisplayName: string | null;
  servers: GroupedDevice[];
  networkDevices: GroupedDevice[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch all active business views
    const businessViews = await prisma.businessViewConfig.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
    });

    if (businessViews.length === 0) {
      return res.status(200).json({ groups: [] });
    }

    // Initialize OpManager client
    const baseUrl = env.OPMANAGER_BASE_URL || 'http://localhost:8061';
    const apiKey = env.OPMANAGER_API_KEY || '';
    const collector = new OpManagerDataCollector(baseUrl, apiKey);

    // Fetch all devices from local database for type matching
    const localDevices = await prisma.device.findMany({
      select: {
        id: true,
        opmanagerId: true,
        name: true,
        displayName: true,
        type: true,
        ipAddress: true,
        status: true,
        tags: true, // Include tags to help classify OTHER type devices
      },
    });

    // Create a map for quick lookup: opmanagerId / name / ip / ipPart / displayName -> device
    const deviceMap = new Map<string, typeof localDevices[0]>();
    localDevices.forEach(device => {
      deviceMap.set(device.opmanagerId, device);
      deviceMap.set(device.name, device);
      if (device.ipAddress) {
        deviceMap.set(device.ipAddress.trim(), device);
      }
      if (device.displayName && device.displayName.trim()) {
        deviceMap.set(device.displayName.trim(), device);
        deviceMap.set(device.displayName.trim().toLowerCase(), device);
      }
      // OpManager getBusinessDetailsView 可能返回 name 为 "IP.moid"，本地 opmanagerId 可能为 IP 或同格式，用 IP 部分再建索引
      if (device.opmanagerId && device.opmanagerId.includes('.')) {
        const ipPart = device.opmanagerId.split('.').slice(0, -1).join('.');
        if (ipPart && !deviceMap.has(ipPart)) deviceMap.set(ipPart, device);
      }
    });

    const groups: BusinessViewGroup[] = [];

    // Process each business view
    for (const view of businessViews) {
      try {
        // Fetch devices from OpManager for this business view
        const opManagerResponse = await collector.getBusinessDetailsView(
          view.name,
          0,
          1000 // Large limit to get all devices
        );

        // 兼容 OpManager 返回不同大小写
        const bv = (opManagerResponse?.BusinessDetailsView ?? (opManagerResponse as any)?.businessDetailsView ?? {}) as { Details?: unknown[]; details?: unknown[] };
        const devices: any[] = Array.isArray(bv.Details) ? bv.Details : Array.isArray(bv.details) ? bv.details : [];

        const servers: GroupedDevice[] = [];
        const networkDevices: GroupedDevice[] = [];

        // Process each device from OpManager
        for (const opDevice of devices) {
          const opName = (opDevice.name ?? opDevice.Name ?? '').toString().trim();
          const opIp = (opDevice.IpAddress ?? opDevice.ipAddress ?? '').toString().trim();

          const opDisplayName = (opDevice.displayName ?? opDevice.DisplayName ?? '').toString().trim();
          // Find matching local device: 精确 name/IP -> name 去后缀 -> displayName -> find
          let localDevice = deviceMap.get(opName) ?? (opIp ? deviceMap.get(opIp) : undefined);

          if (!localDevice && opName.includes('.')) {
            const nameWithoutSuffix = opName.split('.').slice(0, -1).join('.');
            if (nameWithoutSuffix) localDevice = deviceMap.get(nameWithoutSuffix);
          }
          if (!localDevice && opDisplayName) {
            localDevice = deviceMap.get(opDisplayName) ?? deviceMap.get(opDisplayName.toLowerCase());
          }
          if (!localDevice) {
            localDevice = localDevices.find(
              d =>
                d.opmanagerId === opName ||
                d.name === opName ||
                (opIp && d.ipAddress && d.ipAddress.trim() === opIp) ||
                (opName.includes('.') && d.opmanagerId === opName.split('.').slice(0, -1).join('.')) ||
                (opDisplayName && d.displayName && (d.displayName === opDisplayName || d.displayName.toLowerCase() === opDisplayName.toLowerCase()))
            ) ?? undefined;
          }

          if (!localDevice) continue;

          const groupedDevice: GroupedDevice = {
            id: localDevice.id,
            name: localDevice.name,
            displayName: (opDevice.displayName ?? opDevice.DisplayName) || localDevice.displayName || localDevice.name,
            ipAddress: opIp || localDevice.ipAddress || '',
            type: localDevice.type,
            status: (opDevice.status ?? opDevice.Status) || 'Unknown',
            cpuUtilization: parseUtilization(opDevice, 'CPUUtilization'),
            memUtilization: parseUtilization(opDevice, 'MemUtilization'),
            severity: (opDevice.severity ?? opDevice.Severity) ?? '5',
          };

          // Categorize by device type
          // Check device tags to help classify OTHER type devices
          const deviceTags = (localDevice as any).tags || [];
          const hasServerTag = deviceTags.some((tag: string) => 
            ['核心服务器', '服务器', 'server', '核心', '核心设备'].some(st => 
              tag.includes(st) || tag.toLowerCase().includes(st.toLowerCase())
            )
          );
          const hasNetworkTag = deviceTags.some((tag: string) => 
            ['核心', '核心设备', '交换机', '路由器', '防火墙', '核心交换机', '核心路由器'].some(nt => 
              tag.includes(nt) || tag.toLowerCase().includes(nt.toLowerCase())
            )
          );

          if (isHardwareServer(localDevice.type) || (localDevice.type === 'OTHER' && hasServerTag)) {
            servers.push(groupedDevice);
          } else if (isNetworkDevice(localDevice.type) || (localDevice.type === 'OTHER' && hasNetworkTag)) {
            networkDevices.push(groupedDevice);
          } else {
            // 未分类设备（如 type=OTHER 且无标签）也展示：放入 servers 与 networkDevices，避免“有匹配但大屏无数据”
            servers.push(groupedDevice);
            networkDevices.push(groupedDevice);
          }
        }

        groups.push({
          viewName: view.name,
          viewDisplayName: view.displayName,
          servers,
          networkDevices,
        });
      } catch (error: any) {
        console.error(`Failed to fetch devices for business view ${view.name}:`, error);
        // Continue with other views even if one fails
        groups.push({
          viewName: view.name,
          viewDisplayName: view.displayName,
          servers: [],
          networkDevices: [],
        });
      }
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ groups });
  } catch (error) {
    console.error('Failed to fetch grouped devices:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
