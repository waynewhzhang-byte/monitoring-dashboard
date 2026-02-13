import React, { memo } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, Position } from 'reactflow';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  const edgeColor = (style as React.CSSProperties).stroke ?? '#475569';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 1.5,
          stroke: edgeColor,
          opacity: 0.7,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* 流量标签 - 显示在连线中间（只在有实际流量值时显示） */}
      {data?.inTraffic && String(data.inTraffic).trim() && data.inTraffic !== '—' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-[#0a1929]/90 backdrop-blur-md px-2 py-0.5 rounded border border-cyan-400/30 shadow-lg"
          >
            <span className="text-[9px] font-semibold text-cyan-300 font-mono tracking-tight">
              {data.inTraffic}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(CustomEdge);
