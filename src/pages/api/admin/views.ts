
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const views = await prisma.businessViewConfig.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json(views);
    }

    if (req.method === 'POST') {
        const { name, displayName } = req.body;
        try {
            const view = await prisma.businessViewConfig.create({
                data: { name, displayName, isActive: true }
            });
            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            return res.status(201).json(view);
        } catch (error) {
            return res.status(400).json({ message: 'Failed to create view. Name likely exists.' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        await prisma.businessViewConfig.delete({ where: { id: String(id) } });
        // Disable caching for write operations
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
