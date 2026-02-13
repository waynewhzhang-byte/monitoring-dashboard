import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label?: string;
    title?: string; // Alias for label
    value: string | number;
    unit?: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: string;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
    label, 
    title, 
    value, 
    unit,
    icon: Icon, 
    trend, 
    color = '#3b82f6',
    className 
}) => {
    const displayLabel = label || title || '';
    const displayValue = unit ? `${value} ${unit}` : value;
    return (
        <div className={`p-6 rounded-xl bg-slate-900 border border-slate-800 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    {displayLabel && <p className="text-sm font-medium text-slate-400">{displayLabel}</p>}
                    <h3 className="text-2xl font-bold text-slate-100 mt-2">{displayValue}</h3>
                </div>
                {Icon && (
                    <div className="p-3 bg-blue-500/10 rounded-lg" style={{ backgroundColor: `${color}10` }}>
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                )}
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
