import React from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { ViewSelector } from '@/components/dashboard/ViewSelector';
import { Settings, Edit2, Save, X, Trash2, Plus } from 'lucide-react';

export const DashboardToolbar: React.FC = () => {
  const {
    activeDashboard,
    isEditing,
    unsavedChanges,
    toggleEditing,
    setDashboard
  } = useDashboardStore();

  const handleEdit = () => {
    toggleEditing(true);
  };

  const handleCancel = () => {
    // 重新加载原始配置以撤销更改
    if (activeDashboard) {
      fetchDashboard(activeDashboard.id);
    }
    toggleEditing(false);
  };

  const handleSave = async () => {
    if (!activeDashboard) return;

    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeDashboard),
      });

      if (response.ok) {
        const savedData = await response.json();
        setDashboard(savedData);
        toggleEditing(false);
        alert('保存成功！');
      } else {
        alert('保存失败，请检查配置。');
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
      alert('保存出错。');
    }
  };

  const fetchDashboard = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboards/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error reloading dashboard:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg border border-slate-700 shadow-xl">
      <ViewSelector
        currentView={useDashboardStore(s => s.currentBusinessView)}
        onViewChange={useDashboardStore(s => s.setBusinessView)}
      />
      <div className="w-px h-4 bg-slate-700 mx-1" />
      {!isEditing ? (
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          <span>编辑</span>
        </button>
      ) : (
        <>
          <button
            onClick={handleSave}
            disabled={!unsavedChanges}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${unsavedChanges
              ? 'bg-cyan-600 text-white hover:bg-cyan-500'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>

          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
            <span>取消</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-md transition-colors"
            title="添加组件"
          >
            <Plus className="w-4 h-4" />
          </button>
        </>
      )}

      <button
        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
        title="大屏设置"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
};
