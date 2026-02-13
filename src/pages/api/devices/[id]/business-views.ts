import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * 更新设备所属的业务视图
 * PUT /api/devices/[id]/business-views
 * Body: { viewNames: string[] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;
    const { viewNames } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Device ID is required' });
    }

    if (!Array.isArray(viewNames)) {
        return res.status(400).json({ message: 'viewNames must be an array of strings' });
    }

    try {
        // Check if device exists
        const device = await prisma.device.findUnique({
            where: { id: String(id) }
        });

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Validate all view names exist
        if (viewNames.length > 0) {
            const existingViews = await prisma.businessViewConfig.findMany({
                where: {
                    name: { in: viewNames }
                },
                select: { name: true }
            });

            const existingViewNames = existingViews.map(v => v.name);
            const invalidViews = viewNames.filter(v => !existingViewNames.includes(v));

            if (invalidViews.length > 0) {
                return res.status(400).json({
                    message: `Invalid view names: ${invalidViews.join(', ')}`
                });
            }
        }

        // Use transaction to update device views
        await prisma.$transaction(async (tx) => {
            // Delete existing relations
            await tx.deviceBusinessView.deleteMany({
                where: { deviceId: String(id) }
            });

            // Create new relations
            if (viewNames.length > 0) {
                await tx.deviceBusinessView.createMany({
                    data: viewNames.map(viewName => ({
                        deviceId: String(id),
                        viewName: viewName
                    }))
                });
            }
        });

        // Fetch updated device with views
        const updatedDevice = await prisma.device.findUnique({
            where: { id: String(id) },
            include: {
                businessViews: {
                    include: {
                        businessView: {
                            select: {
                                name: true,
                                displayName: true
                            }
                        }
                    }
                }
            }
        });

        // Disable caching for write operations
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({
            message: 'Device business views updated successfully',
            device: updatedDevice
        });
    } catch (error: any) {
        console.error('Failed to update device business views:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
