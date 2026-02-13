
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.query; // Interface ID
    const { tags } = req.body;

    // Validate input
    if (!id) {
        return res.status(400).json({ message: 'Interface ID is required' });
    }

    if (!Array.isArray(tags)) {
        return res.status(400).json({ message: 'Tags must be an array of strings' });
    }

    // Validate tags are strings
    if (!tags.every(tag => typeof tag === 'string')) {
        return res.status(400).json({ message: 'All tags must be strings' });
    }

    try {
        // Check if interface exists
        const existingInterface = await prisma.interface.findUnique({
            where: { id: String(id) },
        });

        if (!existingInterface) {
            console.error('Interface not found:', id);
            return res.status(404).json({ message: 'Interface not found' });
        }

        // Filter and validate tags
        const filteredTags = tags.filter(tag => tag.trim().length > 0);
        
        console.log('Updating interface tags:', {
            interfaceId: id,
            interfaceName: existingInterface.name,
            oldTags: existingInterface.tags,
            newTags: filteredTags
        });

        // Update tags with explicit error handling
        let updatedInterface;
        try {
            updatedInterface = await prisma.interface.update({
                where: { id: String(id) },
                data: { 
                    tags: filteredTags
                },
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    tags: true,
                    deviceId: true,
                    status: true,
                    updatedAt: true,
                }
            });

            // Verify the update was successful by reading back from database
            const verification = await prisma.interface.findUnique({
                where: { id: String(id) },
                select: { tags: true }
            });

            if (!verification || JSON.stringify(verification.tags) !== JSON.stringify(filteredTags)) {
                console.error('Tag update verification failed:', {
                    interfaceId: id,
                    expected: filteredTags,
                    actual: verification?.tags
                });
                throw new Error('Tag update verification failed');
            }

            console.log('Interface tags updated successfully:', {
                interfaceId: id,
                interfaceName: existingInterface.name,
                tags: updatedInterface.tags
            });

            // Disable caching for write operations
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.status(200).json(updatedInterface);
        } catch (updateError: any) {
            console.error('Database update failed:', {
                error: updateError.message,
                code: updateError.code,
                interfaceId: id,
                tags: filteredTags
            });
            throw updateError;
        }
    } catch (error: any) {
        console.error('Failed to update interface tags:', {
            error: error.message,
            stack: error.stack,
            interfaceId: id,
            tags: tags
        });
        
        // Provide more specific error messages
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Interface not found' });
        }
        
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Unique constraint violation' });
        }

        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
