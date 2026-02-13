import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/interfaces/[id]
 * Deletes an interface and cascades deletion of related traffic metrics
 * Note: TopologyEdge will be handled by onDelete: SetNull
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query;

    try {
        // Check if interface exists
        const iface = await prisma.interface.findUnique({
            where: { id: String(id) },
            select: { id: true, name: true, displayName: true, device: { select: { displayName: true, name: true } } }
        });

        if (!iface) {
            return res.status(404).json({ message: 'Interface not found' });
        }

        // Delete interface (CASCADE will delete related TrafficMetrics)
        // Note: TopologyEdge will be handled by onDelete: SetNull
        await prisma.interface.delete({
            where: { id: String(id) }
        });

        // Disable caching for write operations
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({
            message: 'Interface deleted successfully',
            deletedInterface: {
                id: iface.id,
                name: iface.name,
                displayName: iface.displayName,
                device: iface.device
            }
        });
    } catch (error) {
        console.error('Failed to delete interface:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
