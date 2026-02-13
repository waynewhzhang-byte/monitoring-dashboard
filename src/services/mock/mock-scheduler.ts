/**
 * Mock 数据定时更新调度器
 * 每 10 分钟自动更新一次数据，模拟真实设备运行
 */

import { getMockDataStore } from './opmanager-mock-data';

class MockScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private updateInterval: number = 10 * 60 * 1000; // 10 分钟（毫秒）

  /**
   * 启动定时更新
   */
  start(intervalMinutes: number = 10) {
    if (this.intervalId) {
      this.stop();
    }

    this.updateInterval = intervalMinutes * 60 * 1000;
    
    // 立即执行一次更新
    this.updateData();

    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.updateData();
    }, this.updateInterval);

    console.log(`Mock data scheduler started. Update interval: ${intervalMinutes} minutes`);
  }

  /**
   * 停止定时更新
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Mock data scheduler stopped');
    }
  }

  /**
   * 更新数据
   */
  private updateData() {
    try {
      const store = getMockDataStore();
      store.updateData();
      console.log(`Mock data updated at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error updating mock data:', error);
    }
  }

  /**
   * 手动触发更新
   */
  triggerUpdate() {
    this.updateData();
  }

  /**
   * 设置更新间隔
   */
  setInterval(minutes: number) {
    this.updateInterval = minutes * 60 * 1000;
    if (this.intervalId) {
      this.stop();
      this.start(minutes);
    }
  }
}

// 单例实例
let mockScheduler: MockScheduler | null = null;

/**
 * 获取 Mock 调度器实例
 */
export function getMockScheduler(): MockScheduler {
  if (!mockScheduler) {
    mockScheduler = new MockScheduler();
  }
  return mockScheduler;
}

/**
 * 启动 Mock 数据自动更新（在服务器启动时调用）
 */
export function startMockDataScheduler(intervalMinutes: number = 10) {
  const scheduler = getMockScheduler();
  scheduler.start(intervalMinutes);
}

/**
 * 停止 Mock 数据自动更新
 */
export function stopMockDataScheduler() {
  const scheduler = getMockScheduler();
  scheduler.stop();
}
