
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Tag, Save, Network, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { Interface, Device } from '@prisma/client';

// Extended type to include partial device info
interface InterfaceWithDevice extends Interface {
  device: {
    displayName: string | null;
    name: string;
  };
}

export default function InterfaceManagementPage() {
  const [interfaces, setInterfaces] = useState<InterfaceWithDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingMonitored, setTogglingMonitored] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInterfaces, setTotalInterfaces] = useState(0);
  const pageSize = 100; // Show 100 interfaces per page

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/interfaces/tags');
        const data = await res.json();
        setAvailableTags(data.tags || []);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, []);

  // Fetch Interfaces with pagination
  const fetchInterfaces = async (page: number = currentPage) => {
    try {
      setLoading(true);
      // Build query URL with pagination, optional tag filter, and search query
      let url = `/api/interfaces?page=${page}&limit=${pageSize}&_t=${Date.now()}`;
      if (selectedTag) {
        url += `&tags=${encodeURIComponent(selectedTag)}`;
      }
      if (searchTerm.trim()) {
        url += `&query=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      setInterfaces(data.data || []);
      // Update pagination metadata
      if (data.meta) {
        setTotalPages(data.meta.totalPages || 1);
        setTotalInterfaces(data.meta.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch interfaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when tag filter or search changes
    setCurrentPage(1);
    fetchInterfaces(1);
  }, [selectedTag]);

  // Debounced search effect - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInterfaces(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle Edit Start
  const startEdit = (iface: InterfaceWithDevice) => {
    setEditingId(iface.id);
    setEditTags(iface.tags?.join(', ') || '');
  };

  // Handle Save
  const saveTags = async (ifaceId: string) => {
    if (saving === ifaceId) return; // Prevent duplicate requests
    
    setSaving(ifaceId);
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);

      const res = await fetch(`/api/interfaces/${ifaceId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsArray }),
      });

      const responseData = await res.json();
      
      if (res.ok) {
        // Update local state immediately
        setInterfaces(interfaces.map(i =>
          i.id === ifaceId ? { ...i, tags: responseData.tags || tagsArray } : i
        ));
        setEditingId(null);
        
        // Refresh interface list from server to ensure data consistency
        // Use a small delay to ensure database write is complete
        setTimeout(async () => {
          await fetchInterfaces(currentPage);
        }, 500);
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = '✅ 标签保存成功！';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.remove();
        }, 2000);
      } else {
        throw new Error(responseData.message || `保存失败 (${res.status})`);
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Show error message
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMsg.textContent = `❌ ${error instanceof Error ? error.message : '保存失败，请重试'}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.remove();
      }, 3000);
    } finally {
      setSaving(null);
    }
  };

  // Handle Delete Interface (with device context)
  const handleDelete = async (ifaceId: string, ifaceName: string, deviceName?: string) => {
    if (!confirm(`确定要删除接口 "${ifaceName}" 吗？\n\n这将删除接口及其所有关联数据：\n- 流量指标\n- 拓扑连接\n\n此操作无法撤销！`)) {
      return;
    }

    setDeletingId(ifaceId);
    try {
      const res = await fetch(`/api/interfaces/${ifaceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = '✅ 接口删除成功！';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 2000);
        
        // Refresh interface list (stay on current page)
        await fetchInterfaces(currentPage);
      } else {
        const error = await res.json();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        errorMsg.textContent = `❌ ${error.message || '删除失败'}`;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
      }
    } catch (error) {
      console.error('Failed to delete interface:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ 删除失败，请重试';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Manual Sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/interfaces/sync', {
        method: 'POST',
      });

      if (res.ok) {
        // Refresh interface list after sync (reset to page 1)
        setCurrentPage(1);
        await fetchInterfaces(1);
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = '✅ 接口同步完成！（基于数据库中的设备列表）';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        const error = await res.json();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        errorMsg.textContent = `❌ 同步失败: ${error.message || '未知错误'}`;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
      }
    } catch (error) {
      console.error('Failed to sync interfaces:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ 同步失败，请查看控制台日志';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Handle Toggle Monitored Status
  const handleToggleMonitored = async (ifaceId: string, currentStatus: boolean) => {
    setTogglingMonitored(ifaceId);
    try {
      const res = await fetch(`/api/interfaces/${ifaceId}/monitored`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMonitored: !currentStatus }),
      });

      if (res.ok) {
        // Update local state
        setInterfaces(interfaces.map(i =>
          i.id === ifaceId ? { ...i, isMonitored: !currentStatus } : i
        ));
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = `✅ ${!currentStatus ? '已启用监控' : '已禁用监控'}`;
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 2000);
      } else {
        const error = await res.json();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        errorMsg.textContent = `❌ ${error.message || '操作失败'}`;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle monitored status:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ 操作失败，请重试';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setTogglingMonitored(null);
    }
  };

  // Handle Delete Interface (with device context)
  const handleDeleteWithDevice = async (ifaceId: string, ifaceName: string, deviceName: string) => {
    if (!confirm(`确定要删除接口 "${ifaceName}" (设备: ${deviceName}) 吗？\n\n这将删除接口及其所有关联数据：\n- 流量指标\n\n此操作无法撤销！`)) {
      return;
    }

    setDeletingId(ifaceId);
    try {
      const res = await fetch(`/api/interfaces/${ifaceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = '✅ 接口删除成功！';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
        // Refresh interface list (stay on current page)
        await fetchInterfaces(currentPage);
      } else {
        const error = await res.json();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        errorMsg.textContent = `❌ ${error.message || '删除失败'}`;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
      }
    } catch (error) {
      console.error('Failed to delete interface:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ 删除失败，请重试';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  // No need for client-side filtering since we use server-side search
  const filteredInterfaces = interfaces;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">接口管理</h2>
          <p className="text-slate-400 text-sm mt-1">管理网络接口并定义自定义标签。接口同步基于数据库中已同步的设备列表。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '同步接口'}
          </Button>
          <div className="flex items-center gap-3">
            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部标签</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                ))}
              </select>
            )}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                placeholder="搜索接口、设备..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="服务端搜索，支持在所有接口中搜索"
              />
            </div>
          </div>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 text-slate-200 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">所属设备</th>
                <th className="px-6 py-4">接口名称</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">IP地址</th>
                <th className="px-6 py-4">监控</th>
                <th className="px-6 py-4">标签 (自定义)</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">正在加载接口数据...</td></tr>
              ) : filteredInterfaces.map((iface) => (
                <tr key={iface.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-blue-400 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    {iface.device.displayName || iface.device.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-white">{iface.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${iface.status === 'UP' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}>
                      {iface.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{iface.ipAddress || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleMonitored(iface.id, iface.isMonitored)}
                      disabled={togglingMonitored === iface.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                        iface.isMonitored
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/50 hover:bg-slate-700'
                      } ${togglingMonitored === iface.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={iface.isMonitored ? '点击禁用监控' : '点击启用监控'}
                    >
                      {togglingMonitored === iface.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : iface.isMonitored ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">
                        {iface.isMonitored ? '已启用' : '已禁用'}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === iface.id ? (
                      <input
                        autoFocus
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full bg-slate-950 border border-blue-500 rounded px-2 py-1 text-white focus:outline-none"
                        placeholder="例如：上联, 专线"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {iface.tags?.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                            {tag}
                          </span>
                        ))}
                        {(!iface.tags || iface.tags.length === 0) && <span className="text-slate-600 italic text-xs">无标签</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === iface.id ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => saveTags(iface.id)} 
                            disabled={saving === iface.id}
                            className="h-7 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className={`w-3 h-3 mr-1 ${saving === iface.id ? 'animate-spin' : ''}`} /> 
                            {saving === iface.id ? '保存中...' : '保存'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingId(null);
                              setEditTags('');
                            }} 
                            disabled={saving === iface.id}
                            className="h-7 text-slate-400 disabled:opacity-50"
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => startEdit(iface)} 
                            disabled={deletingId === iface.id}
                            className="h-7 border-slate-700 hover:bg-slate-800"
                          >
                            <Tag className="w-3 h-3 mr-1" /> 编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(iface.id, iface.displayName || iface.name, iface.device.displayName || iface.device.name)}
                            disabled={deletingId === iface.id || editingId === iface.id}
                            className="h-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className={`w-3 h-3 mr-1 ${deletingId === iface.id ? 'animate-spin' : ''}`} />
                            {deletingId === iface.id ? '删除中...' : '删除'}
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
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              显示第 <span className="font-bold text-white">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-white">{Math.min(currentPage * pageSize, totalInterfaces)}</span> 条，共 <span className="font-bold text-white">{totalInterfaces}</span> 条接口
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const newPage = currentPage - 1;
                  if (newPage >= 1) {
                    setCurrentPage(newPage);
                    fetchInterfaces(newPage);
                  }
                }}
                disabled={currentPage === 1 || loading}
                className="h-8 border-slate-700 hover:bg-slate-800 disabled:opacity-50"
              >
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchInterfaces(pageNum);
                      }}
                      className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const newPage = currentPage + 1;
                  if (newPage <= totalPages) {
                    setCurrentPage(newPage);
                    fetchInterfaces(newPage);
                  }
                }}
                disabled={currentPage === totalPages || loading}
                className="h-8 border-slate-700 hover:bg-slate-800 disabled:opacity-50"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
