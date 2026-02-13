/**
 * Mock Server 初始化
 * 在服务器启动时自动启动 Mock 数据调度器
 */

import { startMockDataScheduler } from '@/services/mock/mock-scheduler';
import { env } from '@/lib/env';

/**
 * 初始化 Mock Server
 * 在 Next.js 服务器启动时调用
 */
export function initMockServer() {
  const updateInterval = env.MOCK_UPDATE_INTERVAL_MINUTES;

  // 启动定时更新
  startMockDataScheduler(updateInterval);

  console.log(`Mock server initialized. Update interval: ${updateInterval} minutes`);
}

// 如果是在服务器端运行，自动初始化
if (typeof window === 'undefined') {
  // 延迟初始化，确保所有模块已加载
  setTimeout(() => {
    initMockServer();
  }, 1000);
}
