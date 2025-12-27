'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Server,
    AlertTriangle,
    Network,
    Settings,
    Menu,
    X,
    Monitor
} from 'lucide-react';

interface MainLayoutProps {
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { label: '仪表盘', href: '/admin', icon: LayoutDashboard },
    { label: '设备列表', href: '/admin/devices', icon: Server },
    { label: '告警中心', href: '/admin/alarms', icon: AlertTriangle },
    { label: '网络拓扑', href: '/admin/topology', icon: Network },
    // { label: '系统设置', href: '/admin/settings', icon: Settings },
];

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        智能监控系统
                    </span>
                    <button
                        className="ml-auto lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="p-4 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) && item.href !== '/admin');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'}
                `}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
                        >
                            <Monitor size={20} />
                            <span className="font-medium">大屏模式</span>
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center px-4 lg:px-8">
                    <button
                        className="mr-4 lg:hidden text-slate-400"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex bg-slate-900/50 px-3 py-1 rounded-md text-sm text-slate-400">
                        {/* Simple Breadcrumb placeholder */}
                        <span>监控中心</span>
                        <span className="mx-2">/</span>
                        <span className="text-slate-200 capitalize">
                            {pathname === '/admin' ? '仪表盘' : pathname?.split('/').pop()}
                        </span>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
