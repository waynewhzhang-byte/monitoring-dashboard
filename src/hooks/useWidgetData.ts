import { useState, useEffect } from 'react';
import { DataSourceConfig } from '@/types/dashboard-config';
import { useSocket } from './useSocket';

/**
 * Widget数据钩子
 * 根据数据源配置自动获取和更新数据
 */
export function useWidgetData(dataSource?: DataSourceConfig) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!dataSource) {
      setLoading(false);
      return;
    }

    // 获取数据
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(dataSource.endpoint, window.location.origin);

        // 添加查询参数
        if (dataSource.params) {
          Object.entries(dataSource.params).forEach(([key, value]) => {
            url.searchParams.append(key, String(value));
          });
        }

        const response = await fetch(url.toString(), {
          method: dataSource.method || 'GET'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let result = await response.json();

        // 如果有数据转换函数，应用转换
        if (dataSource.transform && typeof window[dataSource.transform as any] === 'function') {
          result = (window[dataSource.transform as any] as Function)(result);
        }

        setData(result);
      } catch (err) {
        setError(err as Error);
        console.error('Widget data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // 初始加载
    fetchData();

    // 设置定时刷新
    let interval: NodeJS.Timeout | undefined;
    if (dataSource.refreshInterval && dataSource.refreshInterval > 0) {
      interval = setInterval(fetchData, dataSource.refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dataSource]);

  // WebSocket实时更新
  useEffect(() => {
    if (!socket || !dataSource?.realtime || !dataSource.realtimeEvent) {
      return;
    }

    const handleUpdate = (newData: any) => {
      setData(newData);
    };

    socket.on(dataSource.realtimeEvent, handleUpdate);

    return () => {
      socket.off(dataSource.realtimeEvent!, handleUpdate);
    };
  }, [socket, dataSource]);

  return { data, loading, error };
}
