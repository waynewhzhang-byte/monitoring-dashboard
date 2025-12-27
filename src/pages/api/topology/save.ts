import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * 保存拓扑配置
 * POST /api/topology/save
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { nodes, edges } = req.body;

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }

    try {
        // 使用事务确保数据一致性
        await prisma.$transaction(async (tx) => {
            // 1. 删除所有现有的拓扑数据
            await tx.topologyEdge.deleteMany({});
            await tx.topologyNode.deleteMany({});

            // 2. 创建新的节点
            for (const node of nodes) {
                await tx.topologyNode.create({
                    data: {
                        id: node.id,
                        deviceId: node.data?.deviceId || null,
                        label: node.data?.label || node.id,
                        type: node.type || 'default',
                        positionX: node.position.x,
                        positionY: node.position.y,
                        icon: node.data?.icon || null,
                        metadata: node.data || {}
                    }
                });
            }

            // 3. 创建新的连接
            for (const edge of edges) {
                await tx.topologyEdge.create({
                    data: {
                        id: edge.id,
                        sourceId: edge.source,
                        targetId: edge.target,
                        label: edge.label || null,
                        type: edge.type || null,
                        interfaceId: edge.data?.interfaceId || null,
                        metadata: edge.data || {}
                    }
                });
            }
        });

        res.status(200).json({
            message: 'Topology saved successfully',
            nodeCount: nodes.length,
            edgeCount: edges.length
        });
    } catch (error) {
        console.error('Failed to save topology:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
