/**
 * 根据 source、target 节点位置计算最优连接点，
 * 使连线从“最近/最合理”的 Handle 引出与接入，实现规范化网络拓扑展示
 */
export function getOptimalHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }
  return dy > 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
}

/** 节点固定尺寸，与 DeviceNode 一致（收紧以让连线贴到可见图标） */
export const NODE_WIDTH = 64;
export const NODE_HEIGHT = 88;
