import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DeviceList } from '@/components/domain/DeviceList';
import { Device } from '@prisma/client';

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/devices?limit=100')
            .then(res => res.json())
            .then(data => {
                setDevices(data.data);
                setFilteredDevices(data.data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        let result = devices;

        if (filter !== 'ALL') {
            result = result.filter(d => d.status === filter);
        }

        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(d =>
                d.name.toLowerCase().includes(lower) ||
                d.ipAddress.includes(lower) ||
                (d.displayName || '').toLowerCase().includes(lower)
            );
        }

        setFilteredDevices(result);
    }, [filter, search, devices]);

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Device Inventory</h1>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <DeviceList
                    devices={filteredDevices}
                    onFilterChange={setFilter}
                    onSearchChange={setSearch}
                    isLoading={loading}
                />
            </div>
        </MainLayout>
    );
}
