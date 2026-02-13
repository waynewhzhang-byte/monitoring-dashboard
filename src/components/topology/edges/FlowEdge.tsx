/**
 * 业务拓扑连线 - 蓝色细线 + 绿色流动箭头
 */

import React, { memo } from 'react';
import {
  EdgeProps,
  getStraightPath,
  EdgeLabelRenderer,
  Position,
} from 'reactflow';

const FlowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  data,
}: EdgeProps) => {
  const isExternal = data?.isExternal === true;
  const markerId = isExternal ? `flow-arrow-ext-${id}` : `flow-arrow-${id}`;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = (style as React.CSSProperties).stroke ?? (isExternal ? '#f97316' : '#0ea5e9');
  const strokeOpacity = isExternal ? 0.9 : 0.65;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,10 L8,5 Z"
            fill={isExternal ? '#f97316' : '#10b981'}
            style={{ opacity: 0.95 }}
          />
        </marker>
      </defs>
      <path
        id={id}
        d={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: 1.5,
          strokeOpacity,
          fill: 'none',
        }}
        className="react-flow__edge-path"
        markerEnd={`url(#${markerId})`}
      />
      {data?.inTraffic && String(data.inTraffic).trim() && data.inTraffic !== '—' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-[#0a0e1a]/95 backdrop-blur-md px-2 py-0.5 rounded border border-cyan-500/25"
          >
            <span className="text-[9px] font-semibold text-cyan-300 font-mono">
              {String(data.inTraffic)}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(FlowEdge);
