import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { DeviceStatus, DeviceType, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { status, type, group, query, tags } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const where: Prisma.DeviceWhereInput = {};

        if (status && status !== 'ALL') {
            where.status = status as DeviceStatus;
        }

        if (type && type !== 'ALL') {
            // Support multiple types (comma-separated)
            const typeArray = Array.isArray(type) ? type : (type as string).split(',');
            if (typeArray.length === 1) {
                where.type = typeArray[0] as DeviceType;
            } else if (typeArray.length > 1) {
                where.type = {
                    in: typeArray as DeviceType[]
                };
            }
        }

        if (group && group !== 'ALL') {
            where.group = group as string;
        }

        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : (tags as string).split(',');
            where.tags = {
                hasEvery: tagArray
            };
            // Debug: Log tag filtering
            if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TAG_FILTER === 'true') {
                console.log(`🔍 [api/devices] Filtering by tags: ${tagArray.join(', ')}`);
            }
        }

        if (query) {
            where.OR = [
                { name: { contains: query as string, mode: 'insensitive' } },
                { displayName: { contains: query as string, mode: 'insensitive' } },
                { ipAddress: { contains: query as string } },
            ];
        }

        // Filter by Business View if provided
        // Priority: Use DeviceBusinessView relation if available, fallback to TopologyNode
        const { viewName } = req.query;
        if (viewName && viewName !== 'ALL' && viewName !== '') {
            // First try to find devices through DeviceBusinessView relation
            const deviceViews = await prisma.deviceBusinessView.findMany({
                where: { viewName: viewName as string },
                select: { deviceId: true }
            });

            if (deviceViews.length > 0) {
                // Use DeviceBusinessView relation
                const validDeviceIds = deviceViews.map(dv => dv.deviceId);
                where.id = { in: validDeviceIds };
            } else {
                // Fallback to TopologyNode (for backward compatibility)
                const nodes = await prisma.topologyNode.findMany({
                    where: { viewName: viewName as string },
                    select: { deviceId: true }
                });
                const validDeviceIds = nodes.map(n => n.deviceId).filter(id => id !== null) as string[];

                if (validDeviceIds.length === 0) {
                    where.id = { in: [] };
                } else {
                    where.id = { in: validDeviceIds };
                }
            }
        }

        const [devices, total] = await Promise.all([
            prisma.device.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: { alarms: { where: { status: 'ACTIVE' } } }
                    },
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
            }),
            prisma.device.count({ where }),
        ]);

        // Debug: Log query results when filtering by tags
        if (tags && (process.env.NODE_ENV === 'development' || process.env.DEBUG_TAG_FILTER === 'true')) {
            const tagArray = Array.isArray(tags) ? tags : (tags as string).split(',');
            console.log(`🔍 [api/devices] Query results:`, {
                tags: tagArray,
                totalDevices: total,
                returnedDevices: devices.length,
                sampleDevices: devices.slice(0, 3).map(d => ({
                    name: d.displayName || d.name,
                    tags: d.tags,
                    isMonitored: d.isMonitored
                }))
            });
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json({
            data: devices,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Failed to fetch devices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
