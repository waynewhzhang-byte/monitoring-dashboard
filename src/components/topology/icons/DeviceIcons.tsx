/**
 * 设备图标组件
 * 匹配截图中的视觉风格：深蓝色主题，渐变效果
 */

import React from 'react';

// 防火墙图标 (红色渐变)
export const FirewallIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="firewallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="8" y="16" width="48" height="32" rx="4" fill="url(#firewallGrad)" filter="url(#glow)" />
    <path d="M24 24h16v16H24z" fill="white" opacity="0.2" />
    <path d="M32 24v16M24 32h16" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <path d="M28 28l4-4 4 4M28 36l4 4 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// 交换机图标 (蓝色渐变)
export const SwitchIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="switchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <filter id="glowBlue">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="8" y="12" width="48" height="40" rx="4" fill="url(#switchGrad)" filter="url(#glowBlue)" />

    {/* 端口指示灯 */}
    <circle cx="16" cy="24" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="24" cy="24" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="32" cy="24" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="40" cy="24" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="48" cy="24" r="2" fill="#22c55e" opacity="0.8" />

    <circle cx="16" cy="32" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="24" cy="32" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="32" cy="32" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="40" cy="32" r="2" fill="#22c55e" opacity="0.8" />
    <circle cx="48" cy="32" r="2" fill="#22c55e" opacity="0.8" />

    {/* 箭头 */}
    <path d="M20 40l4-4 4 4M36 40l4-4 4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// 路由器图标 (青色渐变)
export const RouterIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="routerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <filter id="glowCyan">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="32" cy="32" r="24" fill="url(#routerGrad)" filter="url(#glowCyan)" />

    {/* 中心点 */}
    <circle cx="32" cy="32" r="6" fill="white" opacity="0.3" />

    {/* 四个方向的箭头 */}
    <path d="M32 16v12M32 36v12M16 32h12M36 32h12" stroke="white" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 20l4-4 4 4M28 44l4 4 4-4M20 28l-4 4 4 4M44 28l4 4-4 4"
          stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// 服务器图标 (灰色/银色渐变)
export const ServerIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="serverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <filter id="glowGray">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="12" y="8" width="40" height="48" rx="2" fill="url(#serverGrad)" filter="url(#glowGray)" />

    {/* 服务器分层 */}
    <rect x="16" y="14" width="32" height="10" fill="#94a3b8" opacity="0.3" rx="1" />
    <rect x="16" y="27" width="32" height="10" fill="#94a3b8" opacity="0.3" rx="1" />
    <rect x="16" y="40" width="32" height="10" fill="#94a3b8" opacity="0.3" rx="1" />

    {/* 指示灯 */}
    <circle cx="20" cy="19" r="1.5" fill="#22d3ee" />
    <circle cx="26" cy="19" r="1.5" fill="#22c55e" />

    <circle cx="20" cy="32" r="1.5" fill="#22d3ee" />
    <circle cx="26" cy="32" r="1.5" fill="#22c55e" />

    <circle cx="20" cy="45" r="1.5" fill="#22d3ee" />
    <circle cx="26" cy="45" r="1.5" fill="#22c55e" />
  </svg>
);

// 行为AC/控制器图标 (紫蓝色渐变)
export const ACIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="acGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <filter id="glowPurple">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="8" y="12" width="48" height="40" rx="4" fill="url(#acGrad)" filter="url(#glowPurple)" />

    {/* 控制图标 */}
    <rect x="24" y="28" width="16" height="14" rx="2" fill="white" />
    <path d="M27 28v-4a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="3" fill="none" />

    {/* 无线信号波纹 */}
    <path d="M20 20c-2-2 0-4 2-6M44 20c2-2 0-4-2-6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>
);

// 工作站/客户端图标 (蓝色显示器 + 地球)
export const WorkstationIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="workstationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    {/* 显示器底座 */}
    <rect x="20" y="40" width="24" height="6" rx="2" fill="url(#workstationGrad)" opacity="0.9" />
    <rect x="28" y="36" width="8" height="6" fill="url(#workstationGrad)" />
    {/* 显示器屏幕 */}
    <rect x="10" y="8" width="44" height="30" rx="3" fill="url(#workstationGrad)" />
    <rect x="14" y="12" width="36" height="22" rx="2" fill="#0f172a" />
    {/* 屏幕内地球/网络图标 */}
    <circle cx="32" cy="23" r="6" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.8" />
    <path d="M32 17c-2 1-3 3-3 6s1 5 3 6c2-1 3-3 3-6s-1-5-3-6z" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.6" />
    <path d="M26 23h12M32 17v12" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
  </svg>
);

// 默认设备图标 (通用)
export const DefaultIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 64 64" className={className}>
    <defs>
      <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
    </defs>
    <rect x="12" y="8" width="40" height="48" rx="2" fill="url(#defaultGrad)" />
    <rect x="16" y="14" width="32" height="4" fill="#94a3b8" />
    <rect x="16" y="22" width="32" height="4" fill="#94a3b8" />
    <rect x="16" y="30" width="32" height="4" fill="#94a3b8" />
    <circle cx="20" cy="42" r="2" fill="#22d3ee" />
  </svg>
);

/**
 * 根据设备类型返回对应的图标组件
 */
export function getDeviceIcon(type: string, className?: string) {
  const lowerType = (type || '').toLowerCase();

  if (lowerType.includes('firewall') || lowerType.includes('防火墙')) {
    return <FirewallIcon className={className} />;
  }

  if (lowerType.includes('switch') || lowerType.includes('交换机')) {
    return <SwitchIcon className={className} />;
  }

  if (lowerType.includes('router') || lowerType.includes('路由器') || lowerType.includes('汇聚')) {
    return <RouterIcon className={className} />;
  }

  if (lowerType.includes('server') || lowerType.includes('服务器')) {
    return <ServerIcon className={className} />;
  }

  if (lowerType.includes('ac') || lowerType.includes('行为') || lowerType.includes('控制器')) {
    return <ACIcon className={className} />;
  }

  if (lowerType.includes('workstation') || lowerType.includes('客户端') || lowerType.includes('pc') || lowerType.includes('host')) {
    return <WorkstationIcon className={className} />;
  }

  return <DefaultIcon className={className} />;
}
