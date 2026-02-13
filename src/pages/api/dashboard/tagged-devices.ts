import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { OpManagerDataCollector } from '@/services/opmanager/data-collector';
import { env } from '@/lib/env';
import { isNetworkDevice, isHardwareServer } from '@/lib/utils';

interface TaggedDevice {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { tag, deviceType } = req.query;

    if (!tag || typeof tag !== 'string' || tag.trim() === '') {
      return res.status(400).json({ message: 'Tag parameter is required' });
    }

    // deviceType=all 时返回所有类型设备（用于全屏总览「核心资产」等，与网络设备同源 CPU/内存）
    if (deviceType && deviceType !== 'servers' && deviceType !== 'network' && deviceType !== 'all') {
      return res.status(400).json({ message: 'deviceType must be "servers", "network", or "all"' });
    }

    const serverRelatedTags = ['核心服务器', '服务器', 'server', '核心', '核心设备', 'Server', 'SERVER'];
    const networkRelatedTags = ['核心', '核心设备', '交换机', '路由器', '防火墙', '核心交换机', '核心路由器'];
    const isServerRelatedTag = serverRelatedTags.some(st =>
      tag.includes(st) || tag.toLowerCase().includes(st.toLowerCase())
    );
    const isNetworkRelatedTag = networkRelatedTags.some(nt =>
      tag.includes(nt) || tag.toLowerCase().includes(nt.toLowerCase())
    );

    const where: any = {
      tags: { has: tag },
      isMonitored: true,
    };

    if (deviceType === 'all') {
      // 不按类型过滤，包含所有类型（与 grouped-devices 同源 getBusinessDetailsView 补全 CPU/内存）
      where.type = { in: ['SERVER', 'STORAGE', 'SWITCH', 'ROUTER', 'FIREWALL', 'LOAD_BALANCER', 'OTHER'] };
    } else if (deviceType === 'servers') {
      if (isServerRelatedTag) {
        where.type = { in: ['SERVER', 'STORAGE', 'OTHER'] };
      } else {
        where.type = { in: ['SERVER', 'STORAGE'] };
      }
    } else {
      // network 或未传（默认 network 兼容旧调用）
      const effectiveType = deviceType || 'network';
      if (effectiveType === 'network') {
        if (isNetworkRelatedTag) {
          where.type = { in: ['SWITCH', 'ROUTER', 'FIREWALL', 'LOAD_BALANCER', 'OTHER'] };
        } else {
          where.type = { in: ['SWITCH', 'ROUTER', 'FIREWALL', 'LOAD_BALANCER'] };
        }
      }
    }

    const localDevices = await prisma.device.findMany({
      where,
      select: {
        id: true,
        opmanagerId: true,
        name: true,
        displayName: true,
        type: true,
        ipAddress: true,
        status: true,
        tags: true, // Include tags in select to verify
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (localDevices.length === 0) {
      return res.status(200).json({ devices: [] });
    }

    // Try to get performance data from OpManager business views
    // We'll fetch all active business views and match devices
    const businessViews = await prisma.businessViewConfig.findMany({
      where: { isActive: true },
    });

    const baseUrl = env.OPMANAGER_BASE_URL || 'http://localhost:8061';
    const apiKey = env.OPMANAGER_API_KEY || '';
    const collector = new OpManagerDataCollector(baseUrl, apiKey);

    // Create a map of device name -> performance data
    const performanceMap = new Map<string, { cpu: number; mem: number; severity: string; status: string }>();

    // Fetch performance data from all business views
    for (const view of businessViews) {
      try {
        const opManagerResponse = await collector.getBusinessDetailsView(
          view.name,
          0,
          1000
        );

        const bv = (opManagerResponse?.BusinessDetailsView ?? (opManagerResponse as any)?.businessDetailsView ?? {}) as { Details?: any[]; details?: any[] };
        const details = Array.isArray(bv.Details) ? bv.Details : Array.isArray(bv.details) ? bv.details : [];
        details.forEach((opDevice: any) => {
          const cpu = Number(opDevice.CPUUtilization ?? opDevice.cpuUtilization ?? 0) || 0;
          const mem = Number(opDevice.MemUtilization ?? opDevice.memUtilization ?? 0) || 0;
          const perf = { cpu, mem, severity: opDevice.severity ?? '5', status: opDevice.status ?? 'Clear' };
          const name = (opDevice.name ?? opDevice.Name ?? '').toString().trim();
          const ip = (opDevice.IpAddress ?? opDevice.ipAddress ?? '').toString().trim();
          const displayName = (opDevice.displayName ?? opDevice.DisplayName ?? '').toString().trim();
          if (name) performanceMap.set(name, perf);
          if (ip) performanceMap.set(ip, perf);
          if (displayName) {
            performanceMap.set(displayName, perf);
            performanceMap.set(displayName.toLowerCase(), perf);
          }
        });
      } catch (error) {
        console.error(`Failed to fetch performance for view ${view.name}:`, error);
        // Continue with other views
      }
    }

    // Build result with performance data（与 grouped-devices 一致的多键匹配）
    const devices: TaggedDevice[] = localDevices.map((device) => {
      const performance =
        performanceMap.get(device.name) ||
        performanceMap.get(device.opmanagerId ?? '') ||
        (device.ipAddress ? performanceMap.get(device.ipAddress.trim()) : null) ||
        (device.displayName ? performanceMap.get(device.displayName.trim()) ?? performanceMap.get(device.displayName.trim().toLowerCase()) : null) ||
        null;

      // Use performance data from OpManager if available, otherwise use local metrics
      const cpuUtilization = performance?.cpu ?? 
                            (device.metrics?.[0]?.cpuUsage ?? 0);
      const memUtilization = performance?.mem ?? 
                            (device.metrics?.[0]?.memoryUsage ?? 0);
      const severity = performance?.severity ?? '5';
      const status = performance?.status ?? 
                    (device.status === 'ONLINE' ? 'Clear' : 
                     device.status === 'OFFLINE' ? 'Service Down' : 'Trouble');

      return {
        id: device.id,
        name: device.name,
        displayName: device.displayName || device.name,
        ipAddress: device.ipAddress,
        type: device.type,
        status,
        cpuUtilization,
        memUtilization,
        severity,
      };
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ devices });
  } catch (error) {
    console.error('Failed to fetch tagged devices:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
