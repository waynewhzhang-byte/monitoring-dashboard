import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const [nodes, edges] = await Promise.all([
            prisma.topologyNode.findMany(),
            prisma.topologyEdge.findMany()
        ]);

        // If no topology exists, generate a basic one from devices
        if (nodes.length === 0) {
            const devices = await prisma.device.findMany();
            const autoNodes = devices.map((dev, index) => ({
                id: dev.id,
                type: 'custom', // custom node type in frontend
                position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 150 },
                data: {
                    label: dev.displayName || dev.name,
                    status: dev.status,
                    type: dev.type,
                    ip: dev.ipAddress
                }
            }));

            return res.status(200).json({ nodes: autoNodes, edges: [] });
        }

        // Format for ReactFlow
        const formattedNodes = nodes.map(node => ({
            id: node.id,
            type: node.type || 'custom',
            position: { x: node.positionX, y: node.positionY },
            data: {
                label: node.label,
                ...((node.metadata as object) || {})
            }
        }));

        const formattedEdges = edges.map(edge => ({
            id: edge.id,
            source: edge.sourceId,
            target: edge.targetId,
            animated: true,
            label: edge.label
        }));

        res.status(200).json({ nodes: formattedNodes, edges: formattedEdges });
    } catch (error) {
        console.error('Failed to fetch topology:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
