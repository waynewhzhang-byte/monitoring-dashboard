import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AlarmStatus, AlarmSeverity, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { status, severity, deviceId } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        const where: Prisma.AlarmWhereInput = {};

        if (status && status !== 'ALL') {
            where.status = status as AlarmStatus;
        } else if (!status) {
            // Default to showing only active incidents if not specified
            where.status = { in: ['ACTIVE', 'ACKNOWLEDGED'] };
        }

        if (severity && severity !== 'ALL') {
            where.severity = severity as AlarmSeverity;
        }

        if (deviceId) {
            where.deviceId = String(deviceId);
        }

        const [alarms, total] = await Promise.all([
            prisma.alarm.findMany({
                where,
                skip,
                take: limit,
                orderBy: { occurredAt: 'desc' },
                include: {
                    device: {
                        select: {
                            name: true,
                            displayName: true,
                            ipAddress: true,
                        }
                    }
                }
            }),
            prisma.alarm.count({ where }),
        ]);

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json({
            data: alarms,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Failed to fetch alarms:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
