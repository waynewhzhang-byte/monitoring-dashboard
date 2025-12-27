import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardConfig } from '@/types/dashboard-config';
import { DashboardRenderer } from '@/components/dashboard-builder/DashboardRenderer';
import { DashboardToolbar } from '@/components/dashboard-builder/DashboardToolbar';
import { useDashboardStore } from '@/stores/useDashboardStore';

/**
 * 动态大屏展示页面
 * 根据ID加载并渲染对应的大屏配置
 */
export default function DashboardDisplay() {
  const router = useRouter();
  const { id } = router.query;
  const { setDashboard, activeDashboard } = useDashboardStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDashboardConfig(id as string);
    }
  }, [id]);

  // 监听ESC键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          router.push('/dashboards');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const fetchDashboardConfig = async (dashboardId: string) => {
    try {
      setLoading(true);
      setError(null);

      // 尝试从新的 API 加载
      const response = await fetch(`/api/dashboards/${dashboardId}`);
      
      if (response.ok) {
        const result = await response.json();
        setDashboard(result);
      } else {
        // 降级到旧的 API (预设模板)
        const oldResponse = await fetch(`/api/dashboard-configs/${dashboardId}`);
        const oldResult = await oldResponse.json();
        
        if (oldResult.success) {
          setDashboard(oldResult.data);
        } else {
          setError(oldResult.error || 'Failed to load dashboard configuration');
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard config:', err);
      setError('Failed to load dashboard configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboards');
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400 text-lg">加载大屏配置中...</div>
        </div>
      </div>
    );
  }

  if (error || !activeDashboard) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-red-400 text-xl mb-4">{error || '大屏配置未找到'}</div>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            返回选择页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-slate-950">
      {/* 顶部控制栏 */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <button
          onClick={handleBack}
          className="pointer-events-auto px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg
                     hover:bg-slate-700 transition-colors border border-slate-600
                     flex items-center gap-2 shadow-lg"
        >
          <span>←</span>
          <span>返回</span>
        </button>

        <div className="flex items-center gap-3 pointer-events-auto">
          <DashboardToolbar />

          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg
                       hover:bg-slate-700 transition-colors border border-slate-600 shadow-lg"
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </button>
        </div>
      </div>

      {/* 大屏内容 */}
      <div className="w-full h-full">
        <DashboardRenderer />
      </div>

      {/* 底部提示 */}
      {!activeDashboard.widgets.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-slate-500 text-xl bg-slate-900/50 p-8 rounded-2xl border border-slate-800 border-dashed">
            当前大屏没有任何组件，点击右上角编辑开始添加
          </div>
        </div>
      )}
    </div>
  );
}

