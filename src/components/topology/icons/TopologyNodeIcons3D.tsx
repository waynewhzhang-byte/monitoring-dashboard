/**
 * 业务拓扑节点 3D 图标 - 专业 IT 网络拓扑风格
 * 参考 Cisco / ManageEngine / SolarWinds 专业网络拓扑图标
 * 每种 IT 设备类型均有独特图形造型 + 专属配色
 */

import React from 'react';

const SHADOW = { filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' };

// ── 路由器 ─────────────────────────────────────────────────────────────────────
/**
 * 路由器 — 圆形 + 四向网络箭头（Cisco 标准路由器符号，青蓝配色）
 */
export const Router3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <radialGradient id="rt-g" cx="38%" cy="32%" r="65%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0c4a6e" />
      </radialGradient>
    </defs>
    {/* Ground shadow */}
    <ellipse cx="28" cy="45" rx="11" ry="2.2" fill="rgba(0,0,0,0.3)" />
    {/* Circle body */}
    <circle cx="28" cy="22" r="13" fill="url(#rt-g)" />
    <circle cx="28" cy="22" r="13" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.75" />
    {/* Inner ring */}
    <circle cx="28" cy="22" r="7" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.6" />
    {/* Center dot */}
    <circle cx="28" cy="22" r="3" fill="#e0f2fe" opacity="0.95" />
    {/* N ↑ */}
    <line x1="28" y1="9" x2="28" y2="4" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="28,1 25,6 31,6" fill="#7dd3fc" />
    {/* S ↓ */}
    <line x1="28" y1="35" x2="28" y2="41" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="28,47 25,42 31,42" fill="#7dd3fc" />
    {/* W ← */}
    <line x1="15" y1="22" x2="8" y2="22" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="3,22 8,19 8,25" fill="#7dd3fc" />
    {/* E → */}
    <line x1="41" y1="22" x2="48" y2="22" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="53,22 48,19 48,25" fill="#7dd3fc" />
  </svg>
);

// ── 交换机 ─────────────────────────────────────────────────────────────────────
/**
 * 交换机 — 宽扁机架单元 + 双排端口 LED 阵列（深蓝配色）
 */
export const Switch3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <linearGradient id="sw-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <linearGradient id="sw-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <linearGradient id="sw-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    {/* Top face */}
    <path d="M 4 17 L 28 9 L 52 17 L 28 25 Z" fill="url(#sw-top)" stroke="#93c5fd" strokeWidth="0.8" />
    {/* Right side */}
    <path d="M 52 17 L 56 19 L 56 37 L 52 35 Z" fill="url(#sw-right)" stroke="#1d4ed8" strokeWidth="0.8" />
    {/* Front face */}
    <path d="M 4 17 L 4 35 L 28 45 L 52 35 L 52 17 L 28 25 Z" fill="url(#sw-front)" stroke="#3b82f6" strokeWidth="0.8" />
    {/* Port LED grid — 2 rows × 8 ports */}
    {[0, 1].map((row) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
        const active = col % 2 === 0 || (row === 0 && col === 1);
        return (
          <rect
            key={`${row}-${col}`}
            x={9 + col * 5}
            y={23 + row * 7}
            width={3.5}
            height={4.5}
            rx={0.5}
            fill={active ? '#4ade80' : '#1e3a8a'}
            opacity={active ? 0.9 : 0.5}
          />
        );
      })
    )}
    {/* Activity indicators */}
    <rect x="45" y="24" width="4" height="2" rx="0.5" fill="#facc15" opacity="0.85" />
    <rect x="45" y="28" width="4" height="2" rx="0.5" fill="#f87171" opacity="0.7" />
  </svg>
);

// ── 防火墙 ─────────────────────────────────────────────────────────────────────
/**
 * 防火墙 — 等轴测砖墙形体 + 火焰标志（橙红配色）
 */
export const Firewall3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <linearGradient id="fw-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="fw-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
      <linearGradient id="fw-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
    </defs>
    {/* Top face */}
    <path d="M 6 12 L 28 4 L 50 12 L 28 20 Z" fill="url(#fw-top)" stroke="#fed7aa" strokeWidth="0.8" />
    {/* Right side */}
    <path d="M 50 12 L 56 16 L 56 40 L 50 36 Z" fill="url(#fw-right)" stroke="#ea580c" strokeWidth="0.8" />
    {/* Front face */}
    <path d="M 6 12 L 6 36 L 28 46 L 50 36 L 50 12 L 28 20 Z" fill="url(#fw-front)" stroke="#f97316" strokeWidth="0.8" />
    {/* Brick horizontal lines */}
    <line x1="7" y1="21" x2="49" y2="21" stroke="#fdba74" strokeWidth="0.7" opacity="0.5" />
    <line x1="9" y1="29" x2="49" y2="29" stroke="#fdba74" strokeWidth="0.7" opacity="0.5" />
    <line x1="11" y1="36" x2="49" y2="36" stroke="#fdba74" strokeWidth="0.7" opacity="0.5" />
    {/* Brick vertical joints */}
    <line x1="18" y1="12" x2="18" y2="21" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="34" y1="12" x2="34" y2="21" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="13" y1="21" x2="13" y2="29" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="28" y1="21" x2="28" y2="29" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="43" y1="21" x2="43" y2="29" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="18" y1="29" x2="18" y2="36" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    <line x1="34" y1="29" x2="34" y2="36" stroke="#fdba74" strokeWidth="0.7" opacity="0.4" />
    {/* Flame icon */}
    <path
      d="M28,22 C26,25 24,28 24.5,31.5 C25,35 26.5,36.5 28,36.5 C29.5,36.5 31,35 31.5,31.5 C32,28 30,25 28,22 Z"
      fill="#fef08a"
      opacity="0.92"
    />
    <path
      d="M28,26 C27,28 26.5,30 27,32.5 C27.3,34 27.7,35.5 28,35.5 C28.3,35.5 28.7,34 29,32.5 C29.5,30 29,28 28,26 Z"
      fill="#f97316"
    />
    <path d="M28,30 C27.5,31 27.5,32.5 28,34 C28.5,32.5 28.5,31 28,30 Z" fill="#fef9c3" opacity="0.9" />
  </svg>
);

// ── 服务器 ─────────────────────────────────────────────────────────────────────
/**
 * 服务器 — 等轴测机架单元 + 垂直蓝色 LED 灯条（银灰配色）
 */
export const ServerRack3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' }}>
    <defs>
      <linearGradient id="srv-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="srv-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="srv-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <linearGradient id="srv-bar" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
    </defs>
    {/* Top face */}
    <path d="M 6 10 L 28 2 L 50 10 L 28 18 Z" fill="url(#srv-top)" stroke="#94a3b8" strokeWidth="0.8" />
    {/* Right side */}
    <path d="M 50 10 L 56 14 L 56 38 L 50 34 Z" fill="url(#srv-right)" stroke="#475569" strokeWidth="0.8" />
    {/* Front face */}
    <path d="M 6 10 L 6 34 L 28 44 L 50 34 L 50 10 L 28 18 Z" fill="url(#srv-front)" stroke="#64748b" strokeWidth="0.8" />
    {/* Chassis divider */}
    <line x1="7" y1="22" x2="49" y2="22" stroke="#475569" strokeWidth="0.8" opacity="0.7" />
    {/* Blue LED strips ×4 */}
    {[0, 1, 2, 3].map((i) => (
      <rect
        key={i}
        x={13 + i * 9}
        y={24}
        width={5}
        height={14}
        rx={2}
        fill="url(#srv-bar)"
        style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.7))' }}
      />
    ))}
    {/* Power LED */}
    <circle
      cx="44"
      cy="15.5"
      r="2.5"
      fill="#4ade80"
      opacity="0.9"
      style={{ filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.8))' }}
    />
    {/* Drive activity LED */}
    <rect x="10" y="14.5" width="5" height="2.5" rx="0.8" fill="#38bdf8" opacity="0.85" />
  </svg>
);

// ── 负载均衡 ───────────────────────────────────────────────────────────────────
/**
 * 负载均衡 — 等轴测服务器体 + 流量 Y 形分流箭头（绿色配色）
 */
export const LoadBalancer3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <linearGradient id="lb-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
      <linearGradient id="lb-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="lb-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#16a34a" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
    </defs>
    {/* Top face */}
    <path d="M 6 10 L 28 2 L 50 10 L 28 18 Z" fill="url(#lb-top)" stroke="#bbf7d0" strokeWidth="0.8" />
    {/* Right side */}
    <path d="M 50 10 L 56 14 L 56 38 L 50 34 Z" fill="url(#lb-right)" stroke="#16a34a" strokeWidth="0.8" />
    {/* Front face */}
    <path d="M 6 10 L 6 34 L 28 44 L 50 34 L 50 10 L 28 18 Z" fill="url(#lb-front)" stroke="#22c55e" strokeWidth="0.8" />
    {/* Y-split traffic arrows */}
    {/* Input → center */}
    <line x1="10" y1="27" x2="21" y2="27" stroke="#d1fae5" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="24,27 20,24.5 20,29.5" fill="#d1fae5" />
    {/* Center node */}
    <circle cx="28" cy="27" r="3.5" fill="#bbf7d0" opacity="0.9" />
    {/* Output upper */}
    <line x1="31" y1="25" x2="40" y2="20" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" />
    <polygon points="43,18.5 39,19.5 40,23" fill="#86efac" />
    {/* Output lower */}
    <line x1="31" y1="29" x2="40" y2="34" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" />
    <polygon points="43,35.5 39,33 40,37" fill="#86efac" />
  </svg>
);

// ── 存储 ───────────────────────────────────────────────────────────────────────
/**
 * 存储 — 三层堆叠磁盘圆柱体（紫色配色）
 */
export const Storage3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <linearGradient id="stg-side" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#581c87" />
      </linearGradient>
      <linearGradient id="stg-top" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    {/* Disk 3 — bottom */}
    <ellipse cx="28" cy="43" rx="15" ry="5" fill="#3b0764" />
    <path d="M 13 38 L 13 43 A 15,5 0 0,0 43,43 L 43 38" fill="url(#stg-side)" />
    <ellipse cx="28" cy="38" rx="15" ry="5" fill="url(#stg-top)" opacity="0.82" />
    {/* Disk 2 — middle */}
    <ellipse cx="28" cy="33" rx="15" ry="5" fill="#4c1d95" />
    <path d="M 13 28 L 13 33 A 15,5 0 0,0 43,33 L 43 28" fill="url(#stg-side)" />
    <ellipse cx="28" cy="28" rx="15" ry="5" fill="url(#stg-top)" opacity="0.88" />
    {/* Disk 1 — top */}
    <ellipse cx="28" cy="23" rx="15" ry="5" fill="#581c87" />
    <path d="M 13 18 L 13 23 A 15,5 0 0,0 43,23 L 43 18" fill="url(#stg-side)" />
    <ellipse cx="28" cy="18" rx="15" ry="5" fill="url(#stg-top)" />
    {/* Disk center hole */}
    <ellipse cx="28" cy="18" rx="5.5" ry="2" fill="#3b0764" />
    <ellipse cx="28" cy="18" rx="2.5" ry="0.9" fill="#1e1b4b" />
    {/* Highlight ring */}
    <ellipse cx="28" cy="18" rx="10" ry="3.8" fill="none" stroke="#f0abfc" strokeWidth="0.8" opacity="0.55" />
  </svg>
);

// ── 打印机 ─────────────────────────────────────────────────────────────────────
/**
 * 打印机 — 等轴测打印机机体 + 出纸口白色纸张（灰蓝配色）
 */
export const Printer3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={SHADOW}>
    <defs>
      <linearGradient id="pr-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="pr-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="pr-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    {/* Paper sheet coming out */}
    <path d="M 18 4 L 38 4 L 38 17 L 18 17 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
    <line x1="21" y1="8" x2="35" y2="8" stroke="#94a3b8" strokeWidth="0.7" opacity="0.65" />
    <line x1="21" y1="11" x2="35" y2="11" stroke="#94a3b8" strokeWidth="0.7" opacity="0.65" />
    <line x1="21" y1="14" x2="35" y2="14" stroke="#94a3b8" strokeWidth="0.7" opacity="0.45" />
    {/* Body top face */}
    <path d="M 6 19 L 28 11 L 50 19 L 28 27 Z" fill="url(#pr-top)" stroke="#94a3b8" strokeWidth="0.8" />
    {/* Right side */}
    <path d="M 50 19 L 56 23 L 56 39 L 50 35 Z" fill="url(#pr-right)" stroke="#475569" strokeWidth="0.8" />
    {/* Front face */}
    <path d="M 6 19 L 6 35 L 28 45 L 50 35 L 50 19 L 28 27 Z" fill="url(#pr-front)" stroke="#64748b" strokeWidth="0.8" />
    {/* Paper feed slot */}
    <rect x="13" y="23" width="26" height="3" rx="1" fill="#0f172a" opacity="0.8" />
    {/* Control LEDs */}
    <circle cx="40" cy="29" r="2" fill="#4ade80" opacity="0.9" />
    <circle cx="44" cy="29" r="2" fill="#fbbf24" opacity="0.7" />
  </svg>
);

// ── 工作站 ─────────────────────────────────────────────────────────────────────
/**
 * 工作站 / PC — 等轴测显示器 + 垂直蓝色灯条（灰色配色）
 */
export const Workstation3D: React.FC = () => (
  <svg width="52" height="48" viewBox="0 0 52 48" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
    <defs>
      <linearGradient id="ws-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="ws-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
    </defs>
    <path d="M 6 8 L 26 2 L 46 8 L 26 14 Z" fill="url(#ws-top)" stroke="#737373" strokeWidth="0.8" />
    <path
      d="M 6 8 L 6 30 L 26 40 L 46 30 L 46 8 L 26 14 Z"
      fill="url(#ws-front)"
      stroke="#6b7280"
      strokeWidth="0.8"
    />
    <rect x="12" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="18" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="24" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <rect x="30" y="16" width="4" height="18" rx="1" fill="#3b82f6" opacity="0.9" />
    <ellipse cx="26" cy="44" rx="14" ry="3" fill="#4b5563" stroke="#525252" strokeWidth="0.8" />
  </svg>
);

// ── 通用设备 ────────────────────────────────────────────────────────────────────
/**
 * 通用设备 — 等轴测通用盒体（中性灰色）
 */
export const Other3D: React.FC = () => (
  <svg width="56" height="48" viewBox="0 0 56 48" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
    <defs>
      <linearGradient id="oth-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="oth-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <linearGradient id="oth-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
    </defs>
    <path d="M 6 12 L 28 4 L 50 12 L 28 20 Z" fill="url(#oth-top)" stroke="#9ca3af" strokeWidth="0.8" />
    <path d="M 50 12 L 56 16 L 56 40 L 50 36 Z" fill="url(#oth-right)" stroke="#4b5563" strokeWidth="0.8" />
    <path d="M 6 12 L 6 36 L 28 46 L 50 36 L 50 12 L 28 20 Z" fill="url(#oth-front)" stroke="#6b7280" strokeWidth="0.8" />
    {/* Network connection dots */}
    <circle cx="20" cy="28" r="3" fill="#9ca3af" opacity="0.7" />
    <circle cx="28" cy="24" r="3" fill="#9ca3af" opacity="0.7" />
    <circle cx="36" cy="28" r="3" fill="#9ca3af" opacity="0.7" />
    <line x1="23" y1="28" x2="25" y2="25" stroke="#9ca3af" strokeWidth="1" opacity="0.6" />
    <line x1="31" y1="25" x2="33" y2="28" stroke="#9ca3af" strokeWidth="1" opacity="0.6" />
  </svg>
);

// ── 映射函数 ────────────────────────────────────────────────────────────────────
/**
 * 根据设备类型返回对应的专业 3D 图标
 * 支持 DeviceType 枚举所有值：ROUTER, SWITCH, FIREWALL, SERVER, LOAD_BALANCER, STORAGE, PRINTER, OTHER
 */
export function getTopologyIcon3D(type: string, label?: string): React.ReactNode {
  const t = (type || '').toUpperCase();
  const lbl = (label || '').toLowerCase();

  // Exact DeviceType enum match
  switch (t) {
    case 'ROUTER':        return <Router3D />;
    case 'SWITCH':        return <Switch3D />;
    case 'FIREWALL':      return <Firewall3D />;
    case 'SERVER':        return <ServerRack3D />;
    case 'LOAD_BALANCER': return <LoadBalancer3D />;
    case 'STORAGE':       return <Storage3D />;
    case 'PRINTER':       return <Printer3D />;
    case 'OTHER':         return <Other3D />;
  }

  // Partial / vendor-specific type strings
  if (t.includes('ROUTER') || t.includes('HUAWEI_AR') || t.includes('CISCO_ISR'))
    return <Router3D />;
  if (t.includes('SWITCH') || t.includes('CISCO_CAT') || t.includes('HUAWEI_S'))
    return <Switch3D />;
  if (t.includes('FIREWALL') || t.includes('ASA') || t.includes('PALOALTO') || t.includes('FORTIGATE'))
    return <Firewall3D />;
  if (t.includes('SERVER') || t.includes('WINDOWS') || t.includes('LINUX') || t.includes('ESX'))
    return <ServerRack3D />;
  if (t.includes('LOAD_BALANCER') || t.includes('F5') || t.includes('HAPROXY'))
    return <LoadBalancer3D />;
  if (t.includes('STORAGE') || t.includes('NAS') || t.includes('SAN'))
    return <Storage3D />;
  if (t.includes('PRINTER') || t.includes('PRINT'))
    return <Printer3D />;
  if (t.includes('WORKSTATION') || t.includes('PC') || t.includes('HOST') || t.includes('DESKTOP'))
    return <Workstation3D />;

  // Label-based heuristics (for devices with type = 'default' or empty)
  if (!type || type === 'default') {
    if (lbl.includes('router') || lbl.includes('路由') || lbl.match(/\bcr\b|\bdr\b|\bpe\b/))
      return <Router3D />;
    if (lbl.includes('switch') || lbl.includes('交换') || lbl.match(/\bcsw\b|\bdsw\b|\basw\b/))
      return <Switch3D />;
    if (lbl.includes('firewall') || lbl.includes('防火') || lbl.includes('fw') || lbl.includes('asa'))
      return <Firewall3D />;
    if (lbl.includes('server') || lbl.includes('服务器') || lbl.includes('app') || lbl.includes('web'))
      return <ServerRack3D />;
    if (lbl.includes('storage') || lbl.includes('存储') || lbl.includes('nas') || lbl.includes('san'))
      return <Storage3D />;
    if (lbl.includes('lb') || lbl.includes('load') || lbl.includes('balancer') || lbl.includes('f5'))
      return <LoadBalancer3D />;
    if (lbl.includes('print') || lbl.includes('打印'))
      return <Printer3D />;
    if (lbl.includes('pc') || lbl.includes('workstation') || lbl.includes('客户端'))
      return <Workstation3D />;
  }

  // Default fallback
  return <Other3D />;
}
