import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, className }) => {
    return (
        <div className={`p-6 rounded-xl bg-slate-900 border border-slate-800 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-400">{label}</p>
                    <h3 className="text-2xl font-bold text-slate-100 mt-2">{value}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-500" />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-slate-500 ml-2">较上小时</span>
                </div>
            )}
        </div>
    );
};
