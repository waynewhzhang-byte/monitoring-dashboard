import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { DeviceStatus, DeviceType, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { status, type, query } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const where: Prisma.DeviceWhereInput = {};

        if (status && status !== 'ALL') {
            where.status = status as DeviceStatus;
        }

        if (type && type !== 'ALL') {
            where.type = type as DeviceType;
        }

        if (query) {
            where.OR = [
                { name: { contains: query as string, mode: 'insensitive' } },
                { displayName: { contains: query as string, mode: 'insensitive' } },
                { ipAddress: { contains: query as string } },
            ];
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
                    }
                }
            }),
            prisma.device.count({ where }),
        ]);

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
