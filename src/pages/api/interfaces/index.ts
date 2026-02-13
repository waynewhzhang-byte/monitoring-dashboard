import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { query, tags, deviceId } = req.query;
    const page = Number(req.query.page) || 1;
    const MAX_LIMIT = 5500; // Maximum limit to prevent performance issues (covers 5343 interfaces)
    const requestedLimit = Number(req.query.limit) || 1000; // Default limit
    const limit = Math.min(requestedLimit, MAX_LIMIT); // Enforce maximum limit
    const skip = (page - 1) * limit;

    try {
        const where: Prisma.InterfaceWhereInput = {};

        if (deviceId) {
            where.deviceId = deviceId as string;
        }

        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : (tags as string).split(',');
            where.tags = {
                hasEvery: tagArray
            };
        }

        if (query) {
            where.OR = [
                { name: { contains: query as string, mode: 'insensitive' } },
                { displayName: { contains: query as string, mode: 'insensitive' } },
                { description: { contains: query as string, mode: 'insensitive' } },
            ];
        }

        const [interfaces, total] = await Promise.all([
            prisma.interface.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    opmanagerId: true,
                    status: true,
                    ipAddress: true,
                    isMonitored: true,
                    tags: true, // Explicitly include tags
                    speed: true, // Include speed for serialization
                    createdAt: true,
                    updatedAt: true,
                    lastSyncAt: true,
                    device: {
                        select: { displayName: true, name: true }
                    },
                    trafficMetrics: {
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    }
                }
            }),
            prisma.interface.count({ where }),
        ]);
        
        // Debug: Log interfaces with specific opmanagerId to verify tags
        const debugInterface = interfaces.find(i => i.opmanagerId?.includes('10000000009-10000000047'));
        if (debugInterface) {
            console.log(`🔍 Debug interface tags: opmanagerId=${debugInterface.opmanagerId}, tags=${JSON.stringify(debugInterface.tags)}`);
        }

        // Convert BigInt fields to string for JSON serialization
        const serializedInterfaces = interfaces.map(iface => ({
            ...iface,
            speed: iface.speed !== null ? iface.speed.toString() : null,
            trafficMetrics: iface.trafficMetrics.map(metric => ({
                ...metric,
                inOctets: metric.inOctets.toString(),
                outOctets: metric.outOctets.toString(),
                inPackets: metric.inPackets.toString(),
                outPackets: metric.outPackets.toString(),
                inBandwidth: metric.inBandwidth !== null ? metric.inBandwidth.toString() : null,
                outBandwidth: metric.outBandwidth !== null ? metric.outBandwidth.toString() : null,
                inErrors: metric.inErrors !== null ? metric.inErrors.toString() : null,
                outErrors: metric.outErrors !== null ? metric.outErrors.toString() : null,
                inDiscards: metric.inDiscards !== null ? metric.inDiscards.toString() : null,
                outDiscards: metric.outDiscards !== null ? metric.outDiscards.toString() : null,
            }))
        }));

        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json({
            data: serializedInterfaces,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Failed to fetch interfaces:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
