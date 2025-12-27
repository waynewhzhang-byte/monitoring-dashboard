import React from 'react';
import Link from 'next/link';
import { Device, DeviceStatus } from '@prisma/client';
import { Search } from 'lucide-react';
import { StatusIndicator } from '../widgets/StatusIndicator';
import { formatDistanceToNow } from 'date-fns';

interface DeviceListProps {
    devices: Device[];
    onFilterChange: (status: string) => void;
    onSearchChange: (query: string) => void;
    isLoading?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
    devices,
    onFilterChange,
    onSearchChange,
    isLoading
}) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Header / Filters */}
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => onFilterChange('ALL')} className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-800 text-slate-300 hover:text-white">All</button>
                    <button onClick={() => onFilterChange('ONLINE')} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-800 text-emerald-400">Online</button>
                    <button onClick={() => onFilterChange('OFFLINE')} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-800 text-rose-400">Offline</button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search devices..."
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 w-full md:w-64"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-400 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Device Name</th>
                            <th className="px-6 py-3">IP Address</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Last Sync</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                        ) : devices.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No devices found</td></tr>
                        ) : (
                            devices.map((device) => (
                                <tr key={device.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {device.displayName || device.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{device.ipAddress}</td>
                                    <td className="px-6 py-4 text-slate-400">{device.type}</td>
                                    <td className="px-6 py-4">
                                        <StatusIndicator status={device.status} showLabel={true} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {device.lastSyncAt ? formatDistanceToNow(new Date(device.lastSyncAt), { addSuffix: true }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/devices/${device.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                            Details
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
