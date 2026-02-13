import { NextApiRequest, NextApiResponse } from 'next';
import { OpManagerDataCollector } from '@/services/opmanager/data-collector';
import { env } from '@/lib/env';

/**
 * 获取业务视图统计数据（从 OpManager 实时获取）
 * GET /api/stats/business-view?bvName=xxx
 * 
 * Query Parameters:
 * - bvName: 业务视图名称，为空则返回全局统计（所有设备）
 * 
 * 注意：这个 API 直接调用 OpManager 的 getBusinessDetailsView 接口
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { bvName } = req.query;
    const viewName = typeof bvName === 'string' ? bvName.trim() : '';

    // 初始化 OpManager 客户端
    const baseUrl = env.OPMANAGER_BASE_URL || 'http://localhost:8061';
    const apiKey = env.OPMANAGER_API_KEY || '';
    const collector = new OpManagerDataCollector(baseUrl, apiKey);

    let devices: any[] = [];

    if (viewName === '') {
      // 空字符串表示获取全局统计（所有设备）
      // 注意：OpManager 的 LISTDEVICE API 返回所有设备
      console.log('[API /api/stats/business-view] Fetching global device list');
      
      const response = await collector.listDevices({ rows: 1000 });
      devices = response.rows || [];
      
      console.log(`[API /api/stats/business-view] Global: Found ${devices.length} devices`);
    } else {
      // 获取指定业务视图的设备
      console.log(`[API /api/stats/business-view] Fetching business view: ${viewName}`);
      
      const response = await collector.getBusinessDetailsView(viewName, 0, 1000);
      devices = response.BusinessDetailsView?.Details || [];
      
      console.log(`[API /api/stats/business-view] Business view '${viewName}': Found ${devices.length} devices`);
    }

    // 统计设备类型
    let networkCount = 0;
    let serverCount = 0;
    let otherCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let warningCount = 0;

    devices.forEach((device) => {
      // 根据 OpManager 的状态分类
      const status = device.status || 'Unknown';
      const severity = device.severity || '5';
      
      // 状态统计 (基于 severity)
      if (severity === '5' || status === 'Clear') {
        onlineCount++;
      } else if (severity === '1' || status === 'Critical' || status === 'Service Down') {
        offlineCount++;
      } else {
        warningCount++;
      }

      // 设备类型统计（根据 type 字段简单判断）
      const deviceType = (device.type || '').toLowerCase();
      
      if (deviceType.includes('switch') || 
          deviceType.includes('router') || 
          deviceType.includes('firewall') ||
          deviceType.includes('h3c') ||
          deviceType.includes('cisco') ||
          deviceType.includes('huawei')) {
        networkCount++;
      } else if (deviceType.includes('linux') || 
                 deviceType.includes('windows') || 
                 deviceType.includes('server') ||
                 deviceType.includes('esx')) {
        serverCount++;
      } else {
        otherCount++;
      }
    });

    const totalDevices = devices.length;

    // 计算可用性百分比
    const availability = totalDevices > 0
      ? Math.round((onlineCount / totalDevices) * 100 * 100) / 100
      : 100;

    // 计算健康度评分 (0-100)
    const healthScore = totalDevices > 0
      ? Math.round(((onlineCount * 100 + warningCount * 50) / totalDevices))
      : 100;

    // 构建响应数据（与前端期望的格式一致）
    const statsData = {
      devices: {
        totalAll: totalDevices,
        online: onlineCount,
        offline: offlineCount,
        warning: warningCount,
        error: 0,
        availability,
        healthScore,
        byType: {
          network: networkCount,
          server: serverCount,
          other: otherCount
        }
      },
      businessView: viewName || 'global',
      timestamp: new Date().toISOString()
    };

    // 设置缓存控制头（短缓存，因为是实时数据）
    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.setHeader('Pragma', 'no-cache');

    res.status(200).json(statsData);
  } catch (error: any) {
    console.error('[API /api/stats/business-view] Failed to fetch stats:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
}
