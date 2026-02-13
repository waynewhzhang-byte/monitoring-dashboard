import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const device = await prisma.device.findUnique({
                where: { id: String(id) },
                include: {
                    interfaces: true,
                    alarms: {
                        where: { status: 'ACTIVE' },
                        orderBy: { occurredAt: 'desc' },
                        take: 5,
                    },
                    metrics: {
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    }
                },
            });

            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.status(200).json(device);
        } catch (error) {
            console.error('Failed to fetch device:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'PATCH') {
        try {
            const { group, displayName, category, tags, type } = req.body;
            
            const updatedDevice = await prisma.device.update({
                where: { id: String(id) },
                data: {
                    ...(group !== undefined && { group }),
                    ...(displayName !== undefined && { displayName }),
                    ...(category !== undefined && { category }),
                    ...(tags !== undefined && { tags }),
                    ...(type !== undefined && { type }),
                }
            });

            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(200).json(updatedDevice);
        } catch (error) {
            console.error('Failed to update device:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            // Check if device exists
            const device = await prisma.device.findUnique({
                where: { id: String(id) },
                select: { id: true, displayName: true, name: true }
            });

            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }

            // Delete device (CASCADE will delete related interfaces, metrics, alarms, etc.)
            // Note: DeviceBusinessView and TopologyNode will be handled by onDelete: Cascade or SetNull
            await prisma.device.delete({
                where: { id: String(id) }
            });

            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(200).json({
                message: 'Device deleted successfully',
                deletedDevice: device
            });
        } catch (error) {
            console.error('Failed to delete device:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
