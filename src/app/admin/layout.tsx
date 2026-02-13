
import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Server, Network, Settings, Activity } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const menuItems = [
        { name: '概览', href: '/admin', icon: LayoutDashboard },
        { name: '设备管理', href: '/admin/devices', icon: Server },
        { name: '接口管理', href: '/admin/interfaces', icon: Network },
        { name: '业务视图', href: '/admin/topology', icon: Activity },
        { name: '系统设置', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <div className="p-6">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        管理控制台
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">系统管理中心</p>
                </div>

                <nav className="px-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                <Icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-grid-slate-900/[0.04]">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
