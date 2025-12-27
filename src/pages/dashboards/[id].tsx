import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardConfig } from '@/types/dashboard-config';
import { DashboardRenderer } from '@/components/dashboard-builder/DashboardRenderer';

/**
 * 动态大屏展示页面
 * 根据ID加载并渲染对应的大屏配置
 */
export default function DashboardDisplay() {
  const router = useRouter();
  const { id } = router.query;
  const [config, setConfig] = useState<DashboardConfig | null>(null);
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
        router.push('/dashboards');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const fetchDashboardConfig = async (dashboardId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard-configs/${dashboardId}`);
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard configuration');
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

  if (error || !config) {
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
    <div className="w-screen h-screen overflow-hidden relative">
      {/* 顶部控制栏 */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg
                     hover:bg-slate-700 transition-colors border border-slate-600
                     flex items-center gap-2"
        >
          <span>←</span>
          <span>返回</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg border border-slate-600">
            <span className="text-slate-400 mr-2">当前大屏:</span>
            <span className="font-semibold">{config.name}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg
                       hover:bg-slate-700 transition-colors border border-slate-600"
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? '⊟' : '⊡'}
          </button>
        </div>
      </div>

      {/* 大屏内容 */}
      <div className="w-full h-full">
        <DashboardRenderer config={config} />
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="px-4 py-2 bg-slate-800/60 backdrop-blur-sm text-slate-400 text-sm rounded-lg border border-slate-600">
          按 ESC 键退出 | 点击返回按钮切换大屏
        </div>
      </div>
    </div>
  );
}
