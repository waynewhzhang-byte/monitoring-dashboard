import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint to check monitored status of interfaces with "上联" tag
 * GET /api/debug/check-interface-monitored
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Find all interfaces with "上联" tag
        const interfacesWithTag = await prisma.interface.findMany({
            where: {
                tags: {
                    has: '上联'
                }
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                opmanagerId: true,
                tags: true,
                isMonitored: true,
                status: true,
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        ipAddress: true
                    }
                }
            },
            orderBy: {
                displayName: 'asc'
            }
        });

        const monitored = interfacesWithTag.filter(i => i.isMonitored);
        const unmonitored = interfacesWithTag.filter(i => !i.isMonitored);

        // Also check the specific interface mentioned by user
        const specificInterface = await prisma.interface.findFirst({
            where: {
                opmanagerId: {
                    contains: '10000000009-10000000047'
                }
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                opmanagerId: true,
                tags: true,
                isMonitored: true,
                status: true,
                device: {
                    select: {
                        name: true,
                        displayName: true,
                        ipAddress: true
                    }
                }
            }
        });

        res.status(200).json({
            summary: {
                total: interfacesWithTag.length,
                monitored: monitored.length,
                unmonitored: unmonitored.length
            },
            monitored: monitored.map(i => ({
                name: i.displayName || i.name,
                device: i.device.displayName || i.device.name,
                deviceIp: i.device.ipAddress,
                opmanagerId: i.opmanagerId,
                status: i.status,
                tags: i.tags
            })),
            unmonitored: unmonitored.map(i => ({
                name: i.displayName || i.name,
                device: i.device.displayName || i.device.name,
                deviceIp: i.device.ipAddress,
                opmanagerId: i.opmanagerId,
                status: i.status,
                tags: i.tags
            })),
            specificInterface: specificInterface ? {
                name: specificInterface.displayName || specificInterface.name,
                device: specificInterface.device.displayName || specificInterface.device.name,
                deviceIp: specificInterface.device.ipAddress,
                opmanagerId: specificInterface.opmanagerId,
                tags: specificInterface.tags,
                isMonitored: specificInterface.isMonitored,
                status: specificInterface.status
            } : null
        });
    } catch (error: any) {
        console.error('Failed to check interface monitored status:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
