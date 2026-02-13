
import React from 'react';

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={`rounded-xl border bg-slate-900 text-slate-100 shadow ${className}`}>
        {children}
    </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <h3 className={`font-semibold leading-none tracking-tight ${className}`}>
        {children}
    </h3>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={`p-6 pt-0 ${className}`}>
        {children}
    </div>
);
