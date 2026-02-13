import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 更新拓扑节点位置
 * POST /api/topology/update
 */
export async function POST(req: NextRequest) {
  try {
    const { nodes, viewName, camera } = await req.json();

    if (!viewName || viewName === '') {
      return NextResponse.json({ error: 'viewName is required' }, { status: 400 });
    }

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: 'nodes must be an array' }, { status: 400 });
    }

    // 1. 更新相机状态（如果提供）
    if (camera) {
      await prisma.businessViewConfig.update({
        where: { name: viewName },
        data: {
          cameraX: camera.x,
          cameraY: camera.y,
          cameraZoom: camera.ratio
        }
      }).catch(err => {
        console.warn(`Failed to update camera for view ${viewName}:`, err);
      });
    }

    // 2. 更新每个节点的位置
    // 注意：节点ID可能包含viewName前缀，需要处理
    const updateResults = await Promise.all(nodes.map(async (node: any) => {
      const nodeId = node.id;
      const result = await prisma.topologyNode.updateMany({
        where: {
          id: nodeId,
          viewName: viewName
        },
        data: {
          positionX: node.position.x,
          positionY: node.position.y
        }
      });
      return { id: nodeId, count: result.count };
    }));

    return NextResponse.json({
      message: 'Node positions updated successfully',
      updatedCount: nodes.length,
      results: updateResults
    });
  } catch (error) {
    console.error('Failed to update node positions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
