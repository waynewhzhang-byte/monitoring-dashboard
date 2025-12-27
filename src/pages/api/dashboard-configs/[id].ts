import type { NextApiRequest, NextApiResponse } from 'next';
import { getDashboardTemplateById } from '@/config/dashboards';
import { DashboardConfig } from '@/types/dashboard-config';

/**
 * 单个大屏配置管理API
 * GET /api/dashboard-configs/:id - 获取指定大屏配置
 * PUT /api/dashboard-configs/:id - 更新大屏配置（未来功能）
 * DELETE /api/dashboard-configs/:id - 删除大屏配置（未来功能）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid dashboard ID'
    });
  }

  if (req.method === 'GET') {
    return handleGetDashboard(id, req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateDashboard(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteDashboard(id, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * 获取指定大屏配置
 */
async function handleGetDashboard(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 从预设模板中查找
    const template = getDashboardTemplateById(id);

    if (!template) {
      // TODO: 从数据库查找自定义配置
      // const customConfig = await prisma.dashboardConfig.findUnique({ where: { id } });
      // if (customConfig) return res.status(200).json({ success: true, data: customConfig });

      return res.status(404).json({
        success: false,
        error: 'Dashboard configuration not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching dashboard config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard configuration'
    });
  }
}

/**
 * 更新大屏配置
 * 未来功能：允许用户更新自定义配置
 */
async function handleUpdateDashboard(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const config: Partial<DashboardConfig> = req.body;

    // 不允许修改预设模板
    const template = getDashboardTemplateById(id);
    if (template) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify preset templates'
      });
    }

    // TODO: 更新数据库中的自定义配置
    // const updated = await prisma.dashboardConfig.update({
    //   where: { id },
    //   data: config
    // });

    return res.status(200).json({
      success: true,
      message: 'Dashboard configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating dashboard config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update dashboard configuration'
    });
  }
}

/**
 * 删除大屏配置
 * 未来功能：允许用户删除自定义配置
 */
async function handleDeleteDashboard(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 不允许删除预设模板
    const template = getDashboardTemplateById(id);
    if (template) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete preset templates'
      });
    }

    // TODO: 从数据库删除自定义配置
    // await prisma.dashboardConfig.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Dashboard configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dashboard config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete dashboard configuration'
    });
  }
}
