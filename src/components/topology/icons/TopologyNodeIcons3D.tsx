/**
 * 业务拓扑节点 3D 图标 - 阿里云风格等轴测立体
 * 参考：灰质块体 + 正面垂直蓝色灯条（服务器）/ 顶面电路图案（交换机）
 */

import React from 'react';

/** 服务器 - 灰色块体，正面垂直蓝色灯条（阿里云风格） */
export const ServerRack3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
    <defs>
      <linearGradient id="aliyun-srv-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="aliyun-srv-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <linearGradient id="aliyun-srv-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="aliyun-srv-bar" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* 顶面 */}
    <path d="M 6 10 L 28 2 L 50 10 L 28 18 Z" fill="url(#aliyun-srv-top)" stroke="#737373" strokeWidth="0.8" />
    {/* 右侧面 */}
    <path d="M 50 10 L 56 14 L 56 38 L 50 34 Z" fill="url(#aliyun-srv-right)" stroke="#525252" strokeWidth="0.8" />
    {/* 正面 - 灰色主面板 */}
    <path
      d="M 6 10 L 6 34 L 28 44 L 50 34 L 50 10 L 28 18 Z"
      fill="url(#aliyun-srv-front)"
      stroke="#6b7280"
      strokeWidth="0.8"
    />
    {/* 垂直蓝色灯条 x4 */}
    {[0, 1, 2, 3].map((i) => (
      <rect
        key={i}
        x={12 + i * 10}
        y={20}
        width={5}
        height={18}
        rx={2}
        fill="url(#aliyun-srv-bar)"
        style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.6))' }}
      />
    ))}
  </svg>
);

/** 交换机 - 深灰块体，顶面电路/网络图案（阿里云风格） */
export const Switch3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
    <defs>
      <linearGradient id="aliyun-sw-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="aliyun-sw-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
      <linearGradient id="aliyun-sw-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#525252" />
        <stop offset="100%" stopColor="#404040" />
      </linearGradient>
    </defs>
    {/* 顶面 - 带电路图案 */}
    <path d="M 8 12 L 28 4 L 48 12 L 28 20 Z" fill="url(#aliyun-sw-top)" stroke="#525252" strokeWidth="0.8" />
    {/* 顶面电路线条 */}
    <g stroke="#94a3b8" strokeWidth="1" fill="none" opacity="0.8">
      <path d="M 14 10 L 22 6 L 30 10" />
      <path d="M 26 10 L 34 6 L 42 10" />
      <path d="M 18 14 L 28 10 L 38 14" />
      <circle cx="28" cy="10" r="2" fill="#94a3b8" opacity="0.6" />
    </g>
    {/* 右侧面 */}
    <path d="M 48 12 L 54 16 L 54 40 L 48 36 Z" fill="url(#aliyun-sw-right)" stroke="#404040" strokeWidth="0.8" />
    {/* 正面 - 端口灯阵 */}
    <path
      d="M 8 12 L 8 36 L 28 46 L 48 36 L 48 12 L 28 20 Z"
      fill="url(#aliyun-sw-front)"
      stroke="#525252"
      strokeWidth="0.8"
    />
    <g fill="#71717a">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={14 + c * 12} y={24 + r * 6} width={8} height={4} rx={1} />
        ))
      )}
    </g>
  </svg>
);

/** 工作站 - 灰色块体 + 显示器正面 */
export const Workstation3D: React.FC = () => (
  <svg width="52" height="48" viewBox="0 0 52 48" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
    <defs>
      <linearGradient id="aliyun-ws-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="aliyun-ws-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
    </defs>
    {/* 顶边 */}
    <path d="M 6 8 L 26 2 L 46 8 L 26 14 Z" fill="url(#aliyun-ws-top)" stroke="#737373" strokeWidth="0.8" />
    {/* 屏幕正面 - 带垂直蓝条 */}
    <path
      d="M 6 8 L 6 30 L 26 40 L 46 30 L 46 8 L 26 14 Z"
      fill="url(#aliyun-ws-front)"
      stroke="#6b7280"
      strokeWidth="0.8"
    />
    <rect x="12" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="18" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="24" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="30" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    {/* 底座 */}
    <ellipse cx="26" cy="44" rx="14" ry="3" fill="#4b5563" stroke="#525252" strokeWidth="0.8" />
  </svg>
);

function isServer(type: string): boolean {
  const t = (type || '').toLowerCase();
  return (
    t.includes('server') ||
    t.includes('storage') ||
    t === 'server' ||
    t === 'storage' ||
    t.includes('windows') ||
    t.includes('linux') ||
    t === 'load_balancer' // 负载均衡器归为服务器类
  );
}

function isSwitch(type: string): boolean {
  const t = (type || '').toLowerCase();
  return (
    t.includes('switch') ||
    t.includes('router') ||
    t.includes('cisco') ||
    t.includes('huawei') ||
    t.includes('firewall') ||
    t === 'switch' ||
    t === 'router'
  );
}

function isWorkstation(type: string): boolean {
  const t = (type || '').toLowerCase();
  return (
    t.includes('workstation') ||
    t.includes('pc') ||
    t.includes('host') ||
    t.includes('printer')
  );
}

/** 根据设备类型返回 3D 图标组件
 * 支持 admin/devices 的设备类型：SERVER, SWITCH, ROUTER, FIREWALL, LOAD_BALANCER, STORAGE, PRINTER, OTHER
 */
export function getTopologyIcon3D(type: string, label?: string): React.ReactNode {
  const eff = !type || type === 'default'
    ? (label || '').toLowerCase().includes('sw') || (label || '').toLowerCase().includes('ranking')
      ? 'switch'
      : (label || '').toLowerCase().includes('app') || (label || '').toLowerCase().includes('web')
        ? 'server'
        : 'switch'
    : type;

  if (isServer(eff)) return <ServerRack3D />;
  if (isSwitch(eff)) return <Switch3D />;
  if (isWorkstation(eff)) return <Workstation3D />;
  return <Switch3D />;
}
