import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/interfaces/[id]/monitored
 * Update interface isMonitored field
 * Body: { isMonitored: boolean }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;
    const { isMonitored } = req.body;

    if (typeof isMonitored !== 'boolean') {
        return res.status(400).json({ message: 'isMonitored must be a boolean' });
    }

    try {
        // Check if interface exists
        const existingInterface = await prisma.interface.findUnique({
            where: { id: String(id) },
            select: { id: true, name: true }
        });

        if (!existingInterface) {
            return res.status(404).json({ message: 'Interface not found' });
        }

        // Update isMonitored field
        const updatedInterface = await prisma.interface.update({
            where: { id: String(id) },
            data: { isMonitored },
            select: {
                id: true,
                name: true,
                displayName: true,
                isMonitored: true,
                updatedAt: true,
            }
        });

        // Disable caching for write operations
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json(updatedInterface);
    } catch (error: any) {
        console.error('Failed to update interface monitored status:', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Interface not found' });
        }

        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
