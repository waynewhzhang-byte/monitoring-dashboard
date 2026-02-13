import { NextApiRequest, NextApiResponse } from 'next';
import { interfaceCollector } from '@/services/collector/interface';

/**
 * 手动同步接口数据
 * POST /api/interfaces/sync
 * 基于数据库中已同步的设备列表，从OpManager获取每个设备的接口并同步
 * 注意：此API会遍历Device表中的设备，而不是直接从OpManager获取设备列表
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        console.log('🔄 Manual interface sync triggered');
        console.log('📋 Interface sync will iterate over devices in database (not OpManager device list)');
        const stats = await interfaceCollector.syncInterfaces('MANUAL');
        
        res.status(200).json({
            message: 'Interface sync completed successfully. (Network devices only)',
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to sync interfaces:', error);
        res.status(500).json({
            message: 'Failed to sync interfaces',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
