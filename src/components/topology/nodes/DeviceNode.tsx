/**
 * 设备节点组件 - 业务拓扑参考风格
 * 类立体图标：服务器柜体、工作站显示器、交换机，亮绿状态点
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getTopologyIcon3D } from '../icons/TopologyNodeIcons3D';

export interface DeviceNodeData {
  label: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR';
  ip?: string;
  icon?: string;
  cpu?: number;
  memory?: number;
  metadata?: Record<string, unknown>;
}

const STATUS_DOT = {
  ONLINE: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
  ERROR: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse',
  WARNING: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse',
  OFFLINE: 'bg-slate-500',
  UNMANAGED: 'bg-slate-500',
};

const TYPE_LABEL: Record<string, string> = {
  SERVER: '服务器',
  SWITCH: '交换机',
  ROUTER: '路由器',
  FIREWALL: '防火墙',
  STORAGE: '存储',
  LOAD_BALANCER: '负载均衡',
  PRINTER: '打印机',
  OTHER: '其他',
};

export const DeviceNode: React.FC<NodeProps<DeviceNodeData>> = ({ data, selected }) => {
  const statusDot = STATUS_DOT[data.status] || STATUS_DOT.OFFLINE;

  return (
    <div
      className="relative flex flex-col items-center justify-start overflow-visible"
      style={{ width: 64, height: 88, padding: 0, boxSizing: 'border-box' }}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-1 !h-1" />

      <div
        className={`
          relative flex flex-col items-center gap-1
          transition-all duration-200 shrink-0
          ${selected ? 'scale-110 ring-2 ring-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}
        `}
        style={{ width: 56 }}
      >
        {getTopologyIcon3D(data.type || '', data.label)}

        {/* 类型标签 - 便于确认 Device 表类型已生效 */}
        {data.type && data.type !== 'default' && (
          <span className="text-[8px] text-cyan-400/90 font-medium">
            {TYPE_LABEL[data.type] || data.type}
          </span>
        )}

        {/* 状态指示点 - 右上角亮绿圆点 */}
        <div
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0e1a] ${statusDot}`}
          title={data.status}
        />

        {/* 设备名称 */}
        <div className="w-full text-center px-0.5">
          <div className="text-slate-200 text-[10px] font-medium leading-tight break-words line-clamp-2">
            {data.label}
          </div>
          {data.ip && (
            <div className="text-slate-500 text-[8px] font-mono mt-0.5 truncate">
              {data.ip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
