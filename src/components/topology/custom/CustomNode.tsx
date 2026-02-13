import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Server, Shield, Network, Monitor, Router, Database } from 'lucide-react';

const CustomNode = ({ data, selected }: NodeProps) => {
  // 根据设备状态和类型获取颜色方案
  // 优先级：告警状态 > 设备类型颜色
  const getDeviceColors = (deviceType?: string, deviceStatus?: string) => {
    // 1. 优先根据告警状态着色
    if (deviceStatus === 'ERROR') {
      return {
        from: 'from-red-500/90',
        to: 'to-red-600/90',
        border: 'border-red-400/50',
        icon: 'text-red-100',
        ring: 'ring-red-400',
        shadow: 'shadow-red-500/60',
      };
    }

    if (deviceStatus === 'WARNING') {
      return {
        from: 'from-yellow-500/90',
        to: 'to-orange-500/90',
        border: 'border-yellow-400/50',
        icon: 'text-yellow-100',
        ring: 'ring-yellow-400',
        shadow: 'shadow-yellow-500/60',
      };
    }

    if (deviceStatus === 'OFFLINE' || deviceStatus === 'UNMANAGED') {
      return {
        from: 'from-gray-500/90',
        to: 'to-gray-600/90',
        border: 'border-gray-400/30',
        icon: 'text-gray-300',
        ring: 'ring-gray-400',
        shadow: 'shadow-gray-500/50',
      };
    }

    // 2. 正常状态：根据设备类型着色
    const type = deviceType?.toLowerCase() || '';

    if (type.includes('server')) {
      return {
        from: 'from-purple-500/90',
        to: 'to-purple-600/90',
        border: 'border-purple-400/30',
        icon: 'text-purple-200',
        ring: 'ring-purple-400',
        shadow: 'shadow-purple-500/50',
      };
    }

    if (type.includes('switch')) {
      return {
        from: 'from-blue-500/90',
        to: 'to-blue-600/90',
        border: 'border-blue-400/30',
        icon: 'text-blue-200',
        ring: 'ring-blue-400',
        shadow: 'shadow-blue-500/50',
      };
    }

    if (type.includes('router')) {
      return {
        from: 'from-cyan-500/90',
        to: 'to-cyan-600/90',
        border: 'border-cyan-400/30',
        icon: 'text-cyan-200',
        ring: 'ring-cyan-400',
        shadow: 'shadow-cyan-500/50',
      };
    }

    if (type.includes('firewall')) {
      return {
        from: 'from-orange-500/90',
        to: 'to-orange-600/90',
        border: 'border-orange-400/30',
        icon: 'text-orange-200',
        ring: 'ring-orange-400',
        shadow: 'shadow-orange-500/50',
      };
    }

    if (type.includes('database') || type.includes('db')) {
      return {
        from: 'from-green-500/90',
        to: 'to-green-600/90',
        border: 'border-green-400/30',
        icon: 'text-green-200',
        ring: 'ring-green-400',
        shadow: 'shadow-green-500/50',
      };
    }

    // 默认颜色（灰蓝色）- 正常状态的未知设备
    return {
      from: 'from-slate-500/90',
      to: 'to-slate-600/90',
      border: 'border-slate-400/30',
      icon: 'text-slate-200',
      ring: 'ring-slate-400',
      shadow: 'shadow-slate-500/50',
    };
  };

  const colors = getDeviceColors(data.type, data.status);

  const getIcon = () => {
    const type = data.type?.toLowerCase() || '';
    const iconClass = `w-7 h-7 ${colors.icon}`;
    if (type.includes('firewall')) return <Shield className={iconClass} />;
    if (type.includes('router')) return <Router className={iconClass} />;
    if (type.includes('switch')) return <Network className={iconClass} />;
    if (type.includes('server')) return <Server className={iconClass} />;
    if (type.includes('database')) return <Database className={iconClass} />;
    return <Monitor className={iconClass} />;
  };

  const statusColor = data.status === 'ERROR' ? '#ef4444' :
                      data.status === 'WARNING' ? '#f59e0b' :
                      '#22c55e';

  // 固定尺寸 80x88，保证 React Flow 计算稳定，连线精确终止于节点边缘
  return (
    <div
      className="flex flex-col items-center justify-center group"
      style={{ width: 80, height: 88 }}
    >
      {/* 四向 Handle，支持多方向连接，连线精确终止于连接点 */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-1 !h-1" />

      <div className={`relative transition-all duration-200 ${selected ? 'scale-110' : ''}`}>
        {/* 紧凑简洁风格 - 图标在上，文字在下 */}
        <div className="flex flex-col items-center gap-1.5" style={{ maxWidth: 80 }}>
          {/* 图标容器 - 小巧的圆角方块，根据设备类型着色 */}
          <div
            className={`
              relative w-12 h-12
              flex items-center justify-center
              bg-gradient-to-br ${colors.from} ${colors.to}
              rounded-lg
              border ${colors.border}
              shadow-lg
              transition-all duration-200
              ${selected ? `ring-2 ${colors.ring} ${colors.shadow}` : ''}
            `}
          >
            {/* 图标 */}
            <div className="flex items-center justify-center">
              {getIcon()}
            </div>

            {/* 状态指示点 - 右上角 */}
            <div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0a1929]"
              style={{ backgroundColor: statusColor }}
            />
          </div>

          {/* 设备名称 - 多行文字 */}
          <div className="w-full text-center px-1">
            <div className="text-white font-semibold text-[11px] leading-tight break-words line-clamp-2">
              {data.label}
            </div>
          </div>

          {/* 额外信息（如果有） */}
          {data.extraInfo && (
            <div className="text-cyan-400/80 text-[9px] font-mono leading-tight">
              {data.extraInfo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(CustomNode);
