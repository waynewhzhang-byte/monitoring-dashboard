
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Save, ExternalLink } from 'lucide-react';

interface ViewConfig {
  id: string;
  name: string; // OpManager Name
  displayName: string | null;
  description: string | null;
  isActive: boolean;
}

export default function TopologyManagementPage() {
  const [views, setViews] = useState<ViewConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newView, setNewView] = useState({ name: '', displayName: '' });

  // Fetch Views
  const fetchViews = async () => {
    try {
      const res = await fetch('/api/admin/views');
      const data = await res.json();
      setViews(data);
    } catch (error) {
      console.error('Failed to fetch views:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViews();
  }, []);

  // Add View
  const handleAdd = async () => {
    if (!newView.name) return;

    try {
      const res = await fetch('/api/admin/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newView),
      });

      if (res.ok) {
        fetchViews();
        setNewView({ name: '', displayName: '' });
      }
    } catch (error) {
      console.error('Failed to add view:', error);
    }
  };

  // Delete View
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？这将仅删除配置。')) return;

    try {
      const res = await fetch(`/api/admin/views?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setViews(views.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete view:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Business View Management</h2>
          <p className="text-slate-400 text-sm mt-1">Configure OpManager Business Views mappings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <Card className="border-slate-800 bg-slate-900/50 h-fit">
          <CardHeader>
            <CardTitle>Add New View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">OpManager View Name</label>
              <input
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                placeholder="e.g. TEST2、新的业务视图"
                value={newView.name}
                onChange={e => setNewView({ ...newView, name: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">必须与 OpManager 中业务视图名称完全一致（含大小写，如 TEST2 而非 test2）。</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Display Name (User Friendly)</label>
              <input
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                placeholder="e.g. Internet Exit"
                value={newView.displayName}
                onChange={e => setNewView({ ...newView, displayName: e.target.value })}
              />
            </div>
            <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add View Config
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <div className="lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-0">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900 text-slate-200 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">OpManager Name</th>
                    <th className="px-6 py-4">Display Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {views.map((view) => (
                    <tr key={view.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-mono text-white">{view.name}</td>
                      <td className="px-6 py-4">{view.displayName || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(view.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {views.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center italic">No views configured. Add one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
