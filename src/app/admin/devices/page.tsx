
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Tag, Save, Layers, X, Trash2, RefreshCw } from 'lucide-react';

interface BusinessView {
  name: string;
  displayName: string | null;
}

interface DeviceWithViews {
  id: string;
  opmanagerId: string;
  name: string;
  displayName: string | null;
  type: string;
  category: string | null;
  ipAddress: string;
  status: string;
  tags: string[];
  businessViews?: {
    businessView: BusinessView;
  }[];
}

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState<DeviceWithViews[]>([]);
  const [businessViews, setBusinessViews] = useState<BusinessView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>('');
  const [editingViewsId, setEditingViewsId] = useState<string | null>(null);
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingDevices, setSyncingDevices] = useState(false);

  // Fetch Business Views
  const fetchBusinessViews = async () => {
    try {
      const res = await fetch('/api/admin/views');
      const data = await res.json();
      setBusinessViews(data || []);
    } catch (error) {
      console.error('Failed to fetch business views:', error);
    }
  };

  // Fetch Devices
  const fetchDevices = async () => {
    try {
      setLoading(true);
      // 添加时间戳防止缓存
      const res = await fetch(`/api/devices?limit=1000&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      console.log('Fetched devices:', data.data?.length, 'devices');
      console.log('Total devices in DB:', data.meta?.total);
      // 调试：检查第一个设备的 businessViews
      if (data.data && data.data.length > 0) {
        console.log('First device businessViews:', data.data[0]?.businessViews);
      }
      setDevices(data.data || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessViews();
    fetchDevices();
  }, []);

  // Handle Edit Start
  const startEdit = (device: DeviceWithViews) => {
    setEditingId(device.id);
    setEditTags(device.tags?.join(', ') || '');
  };

  // Handle Save Tags
  const saveTags = async (deviceId: string) => {
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);

      const res = await fetch(`/api/devices/${deviceId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsArray }),
      });

      if (res.ok) {
        // 重新获取设备列表以确保数据同步
        await fetchDevices();
        setEditingId(null);
        showMessage('✅ 标签保存成功！', 'success');
      } else {
        const error = await res.json();
        showMessage(`❌ ${error.message || '保存失败'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      showMessage('❌ 保存失败，请重试', 'error');
    }
  };

  // Handle Edit Type Start
  const startEditType = (device: DeviceWithViews) => {
    setEditingTypeId(device.id);
    setEditType(device.type);
  };

  // Handle Save Type
  const saveType = async (deviceId: string) => {
    if (saving === deviceId) return;
    
    setSaving(deviceId);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editType }),
      });

      if (res.ok) {
        await fetchDevices();
        setEditingTypeId(null);
        setEditType('');
        showMessage('✅ 设备类型保存成功！', 'success');
      } else {
        const error = await res.json();
        showMessage(`❌ ${error.message || '保存失败'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update type:', error);
      showMessage('❌ 保存失败，请重试', 'error');
    } finally {
      setSaving(null);
    }
  };

  // Handle Edit Views Start
  const startEditViews = (device: DeviceWithViews) => {
    setEditingViewsId(device.id);
    setSelectedViews(device.businessViews?.map(v => v.businessView.name) || []);
  };

  // Handle Save Views
  const saveViews = async (deviceId: string) => {
    if (saving === deviceId) return;
    
    setSaving(deviceId);
    try {
      console.log('Saving business views for device:', deviceId, 'views:', selectedViews);
      const res = await fetch(`/api/devices/${deviceId}/business-views`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewNames: selectedViews }),
      });

      if (res.ok) {
        const responseData = await res.json();
        console.log('Save response:', responseData);
        console.log('Device businessViews after save:', responseData.device?.businessViews);
        
        // 直接使用返回的数据更新状态
        if (responseData.device) {
          setDevices(prevDevices => 
            prevDevices.map(device => 
              device.id === deviceId 
                ? { ...device, businessViews: responseData.device.businessViews }
                : device
            )
          );
        }
        
        // 关闭编辑状态
        setEditingViewsId(null);
        setSelectedViews([]);
        showMessage('✅ 业务视图保存成功！', 'success');
        
        // 可选：延迟重新获取以确保数据完全同步（备用方案）
        setTimeout(() => {
          fetchDevices();
        }, 500);
      } else {
        const error = await res.json();
        console.error('Save failed:', error);
        showMessage(`❌ ${error.message || '保存失败'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update views:', error);
      showMessage('❌ 保存失败，请重试', 'error');
    } finally {
      setSaving(null);
    }
  };

  // Toggle view selection
  const toggleView = (viewName: string) => {
    setSelectedViews(prev =>
      prev.includes(viewName)
        ? prev.filter(v => v !== viewName)
        : [...prev, viewName]
    );
  };

  // Handle Manual Device Sync
  const handleSyncDevices = async () => {
    setSyncingDevices(true);
    try {
      const res = await fetch('/api/devices/sync', {
        method: 'POST',
      });

      if (res.ok) {
        showMessage('✅ 设备同步完成！', 'success');
        // Refresh device list after sync
        await fetchDevices();
      } else {
        const error = await res.json();
        showMessage(`❌ ${error.message || '同步失败'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to sync devices:', error);
      showMessage('❌ 同步失败，请重试', 'error');
    } finally {
      setSyncingDevices(false);
    }
  };

  // Handle Delete Device
  const handleDelete = async (deviceId: string, deviceName: string) => {
    if (!confirm(`确定要删除设备 "${deviceName}" 吗？\n\n这将删除设备及其所有关联数据：\n- 接口\n- 指标\n- 告警\n- 拓扑节点\n\n此操作无法撤销！`)) {
      return;
    }

    setDeletingId(deviceId);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showMessage('✅ 设备删除成功！', 'success');
        // Refresh device list
        await fetchDevices();
      } else {
        const error = await res.json();
        showMessage(`❌ ${error.message || '删除失败'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
      showMessage('❌ 删除失败，请重试', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Show message
  const showMessage = (message: string, type: 'success' | 'error') => {
    const msg = document.createElement('div');
    msg.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
    } text-white`;
    msg.textContent = message;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
  };

  const filteredDevices = devices.filter(d =>
    d.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ipAddress?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Device Management</h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSyncDevices}
            disabled={syncingDevices}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingDevices ? 'animate-spin' : ''}`} />
            {syncingDevices ? '同步中...' : '同步设备'}
          </Button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 text-slate-200 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">设备名称</th>
                <th className="px-6 py-4">IP地址</th>
                <th className="px-6 py-4">类型</th>
                <th className="px-6 py-4">类别 (OpManager)</th>
                <th className="px-6 py-4">业务视图</th>
                <th className="px-6 py-4">标签 (自定义)</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">正在加载设备数据...</td></tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      device.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      device.status === 'OFFLINE' ? 'bg-rose-500' :
                      device.status === 'UNMANAGED' ? 'bg-slate-400' :
                      device.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{device.displayName || device.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-300">{device.ipAddress}</td>
                  <td className="px-6 py-4">
                    {editingTypeId === device.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="bg-slate-950 border border-blue-500 rounded px-2 py-1 text-white text-xs focus:outline-none"
                          autoFocus
                        >
                          <option value="SERVER">服务器</option>
                          <option value="SWITCH">交换机</option>
                          <option value="ROUTER">路由器</option>
                          <option value="FIREWALL">防火墙</option>
                          <option value="LOAD_BALANCER">负载均衡器</option>
                          <option value="STORAGE">存储设备</option>
                          <option value="PRINTER">打印机</option>
                          <option value="OTHER">其他设备</option>
                        </select>
                        <Button
                          size="sm"
                          onClick={() => saveType(device.id)}
                          disabled={saving === device.id}
                          className="h-6 bg-emerald-600 hover:bg-emerald-700 text-xs px-2"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTypeId(null);
                            setEditType('');
                          }}
                          disabled={saving === device.id}
                          className="h-6 text-xs text-slate-400 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>
                          {(() => {
                            const typeMap: Record<string, string> = {
                              'SERVER': '服务器',
                              'SWITCH': '交换机',
                              'ROUTER': '路由器',
                              'FIREWALL': '防火墙',
                              'LOAD_BALANCER': '负载均衡器',
                              'PRINTER': '打印机',
                              'STORAGE': '存储设备',
                              'OTHER': '其他设备'
                            };
                            return typeMap[device.type] || device.type;
                          })()}
                        </span>
                        <button
                          onClick={() => startEditType(device)}
                          disabled={editingViewsId === device.id || editingId === device.id || deletingId === device.id}
                          className="text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="编辑类型"
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {device.category || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {editingViewsId === device.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 max-w-md">
                          {businessViews.map(view => (
                            <label
                              key={view.name}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${
                                selectedViews.includes(view.name)
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedViews.includes(view.name)}
                                onChange={() => toggleView(view.name)}
                                className="sr-only"
                              />
                              <Layers className="w-3 h-3" />
                              {view.displayName || view.name}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveViews(device.id)}
                            disabled={saving === device.id}
                            className="h-6 bg-emerald-600 hover:bg-emerald-700 text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            {saving === device.id ? '保存中...' : '保存'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingViewsId(null);
                              setSelectedViews([]);
                            }}
                            disabled={saving === device.id}
                            className="h-6 text-xs text-slate-400"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {device.businessViews && device.businessViews.length > 0 ? (
                          device.businessViews.map((view: any) => {
                            const businessView = view.businessView || view;
                            return (
                              <span
                                key={businessView.name}
                                className="px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-xs text-blue-400 flex items-center gap-1"
                              >
                                <Layers className="w-3 h-3" />
                                {businessView.displayName || businessView.name}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-600 italic text-xs">无视图</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === device.id ? (
                      <input
                        autoFocus
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full bg-slate-950 border border-blue-500 rounded px-2 py-1 text-white text-xs focus:outline-none"
                        placeholder="例如：核心, 网关"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {device.tags?.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                            {tag}
                          </span>
                        ))}
                        {(!device.tags || device.tags.length === 0) && <span className="text-slate-600 italic text-xs">无标签</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === device.id ? (
                        <>
                          <Button size="sm" onClick={() => saveTags(device.id)} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <Save className="w-3 h-3 mr-1" /> 保存
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-slate-400 text-xs">
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => startEditViews(device)}
                            disabled={editingViewsId === device.id || editingTypeId === device.id || editingId === device.id || deletingId === device.id}
                            className="h-7 border-slate-700 hover:bg-slate-800 text-xs"
                          >
                            <Layers className="w-3 h-3 mr-1" /> 视图
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => startEdit(device)}
                            disabled={editingViewsId === device.id || editingTypeId === device.id || deletingId === device.id}
                            className="h-7 border-slate-700 hover:bg-slate-800 text-xs"
                          >
                            <Tag className="w-3 h-3 mr-1" /> 标签
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(device.id, device.displayName || device.name)}
                            disabled={deletingId === device.id || editingViewsId === device.id || editingId === device.id || editingTypeId === device.id}
                            className="h-7 text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs"
                          >
                            <Trash2 className={`w-3 h-3 mr-1 ${deletingId === device.id ? 'animate-spin' : ''}`} />
                            {deletingId === device.id ? '删除中...' : '删除'}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
