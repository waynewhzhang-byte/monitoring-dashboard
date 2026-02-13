
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { Server, Activity, ShieldAlert, Network } from 'lucide-react';

export default function AdminPage() {
    const items = [
        {
            title: '设备管理',
            description: '管理监控设备，分配标签，配置轮询策略。',
            href: '/admin/devices',
            icon: Server,
            color: 'text-blue-400',
        },
        {
            title: '业务视图配置',
            description: '定义业务视图名称并将其映射到拓扑定义。',
            href: '/admin/topology',
            icon: Activity,
            color: 'text-emerald-400',
        },
        {
            title: '接口管理',
            description: '查看所有网络接口状态，定义接口标签。',
            href: '/admin/interfaces',
            icon: Network,
            color: 'text-cyan-400',
        },
        {
            title: '告警策略',
            description: '配置告警规则和通知设置。',
            href: '/admin/alarms',
            icon: ShieldAlert,
            color: 'text-amber-400',
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">系统管理</h2>
                <p className="text-slate-400 mt-2">管理您的监控基础设施和系统配置。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href}>
                            <Card className="h-full hover:bg-slate-900 border-slate-800 transition-colors cursor-pointer group">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-slate-950 ${item.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-400 group-hover:text-slate-300">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
