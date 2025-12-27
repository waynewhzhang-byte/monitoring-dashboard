import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AlarmList } from '@/components/domain/AlarmList';
import { StatCard } from '@/components/widgets/StatCard';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { Alarm } from '@prisma/client';

export default function AlarmsPage() {
    const socket = useSocket();
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ active: 0, critical: 0, warning: 0 });

    const fetchAlarms = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/alarms?status=ACTIVE&limit=100');
            const data = await res.json();
            setAlarms(data.data);

            // Count severities
            const active = data.meta.total;
            const critical = data.data.filter((a: Alarm) => a.severity === 'CRITICAL').length;
            const warning = data.data.filter((a: Alarm) => a.severity === 'WARNING').length;
            setCounts({ active, critical, warning });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchAlarms();
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('alarms:new', () => fetchAlarms());
        socket.on('alarms:update', () => fetchAlarms());
    }, [socket]);

    return (
        <MainLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Alarm Management</h1>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        label="Active Alerts"
                        value={counts.active}
                        icon={AlertCircle}
                        className={counts.active > 0 ? 'bg-rose-500/10 border-rose-500/20' : ''}
                    />
                    <StatCard
                        label="Critical"
                        value={counts.critical}
                        icon={AlertTriangle}
                        className="text-rose-500"
                    />
                    <StatCard
                        label="Warnings"
                        value={counts.warning}
                        icon={AlertCircle}
                        className="text-amber-500"
                    />
                </div>

                {/* List */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-200">Active Incidents</h3>
                    </div>
                    <AlarmList
                        alarms={alarms}
                        onAcknowledge={async (id) => {
                            await fetch(`/api/alarms/${id}/ack`, { method: 'POST' });
                        }}
                        isLoading={loading}
                    />
                </div>
            </div>
        </MainLayout>
    );
}
