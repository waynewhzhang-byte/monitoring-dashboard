
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query; // Device ID
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ message: 'Tags must be an array of strings' });
    }

    try {
        const updatedDevice = await prisma.device.update({
            where: { id: String(id) },
            data: { tags },
        });

        // Disable caching for write operations
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json(updatedDevice);
    } catch (error) {
        console.error('Failed to update tags:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
