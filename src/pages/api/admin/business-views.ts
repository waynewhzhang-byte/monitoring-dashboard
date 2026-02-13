import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const views = await prisma.businessViewConfig.findMany({
                orderBy: { name: 'asc' }
            });
            res.status(200).json(views);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'POST') {
        try {
            const { name, displayName, description, isActive, refreshInterval } = req.body;
            const view = await prisma.businessViewConfig.create({
                data: { name, displayName, description, isActive, refreshInterval }
            });
            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(201).json(view);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { id, ...data } = req.body;
            const view = await prisma.businessViewConfig.update({
                where: { id },
                data
            });
            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(200).json(view);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            await prisma.businessViewConfig.delete({
                where: { id: String(id) }
            });
            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(204).end();
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
