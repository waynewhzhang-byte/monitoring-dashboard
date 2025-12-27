import type { NextApiRequest, NextApiResponse } from 'next';
import { getDashboardTemplates, dashboardTemplateMetadata } from '@/config/dashboards';
import { DashboardConfig } from '@/types/dashboard-config';

/**
 * 大屏配置管理API
 * GET /api/dashboard-configs - 获取所有可用的大屏配置
 * POST /api/dashboard-configs - 创建自定义大屏配置（未来功能）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetDashboards(req, res);
  } else if (req.method === 'POST') {
    return handleCreateDashboard(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * 获取所有大屏配置
 */
async function handleGetDashboards(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { metadata } = req.query;

    // 如果只需要元数据（用于列表展示）
    if (metadata === 'true') {
      return res.status(200).json({
        success: true,
        data: dashboardTemplateMetadata
      });
    }

    // 返回完整配置
    const templates = getDashboardTemplates();
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching dashboard configs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard configurations'
    });
  }
}

/**
 * 创建自定义大屏配置
 * 未来功能：允许用户保存自定义配置到数据库
 */
async function handleCreateDashboard(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const config: DashboardConfig = req.body;

    // 验证配置
    if (!config.id || !config.name || !config.layout || !config.widgets) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dashboard configuration'
      });
    }

    // TODO: 保存到数据库
    // await prisma.dashboardConfig.create({ data: config });

    return res.status(201).json({
      success: true,
      message: 'Dashboard configuration created successfully',
      data: config
    });
  } catch (error) {
    console.error('Error creating dashboard config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create dashboard configuration'
    });
  }
}
