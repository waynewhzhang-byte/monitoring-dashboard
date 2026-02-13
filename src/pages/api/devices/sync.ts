import { NextApiRequest, NextApiResponse } from 'next';
import { deviceCollector } from '@/services/collector/device';

/**
 * 手动同步设备数据
 * POST /api/devices/sync
 * 从OpManager LISTDEVICE API获取设备列表并同步到数据库
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        console.log('🔄 Manual device sync triggered');
        await deviceCollector.syncDevices('MANUAL');
        
        res.status(200).json({
            message: 'Device sync completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to sync devices:', error);
        res.status(500).json({
            message: 'Failed to sync devices',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
