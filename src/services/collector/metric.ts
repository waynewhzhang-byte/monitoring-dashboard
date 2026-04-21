import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { broadcaster, BroadcastEvent } from '@/services/broadcast';
import { DeviceStatus } from '@prisma/client';

// Process devices in batches to control concurrency
// 减少批次大小以避免同时发送过多请求导致OpManager超时
const BATCH_SIZE = 5; // 从10减少到5，降低并发压力
const BATCH_DELAY_MS = 1000; // 批次之间延迟1秒

// Helper to chunk array without external dependency
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export class MetricCollector {
  async collectMetrics() {
    console.log('📊 Starting Metric & Status Collection...');
    try {
      // Get monitored & reachable devices with their names
      /**
       * IMPORTANT: ONLINE 概念（避免后续逻辑混乱）
       *
       * WARNING/ERROR 不是"离线"，而是"在线但有故障/告警"——仍应继续拉取性能数据。
       * 只有：
       * - OFFLINE（OpManager Down：不可达/不可 Ping）
       * - UNMANAGED（OpManager UnManaged：未纳入监控）
       * 才应跳过进一步采集，避免无意义请求导致超时/卡住。
       */
      const devices = await prisma.device.findMany({
        where: {
          isMonitored: true,
          status: { notIn: [DeviceStatus.OFFLINE, DeviceStatus.UNMANAGED] },
          topologyNodes: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          opmanagerId: true, // 企业版需要（可能包含后缀）
          ipAddress: true, // 作为备选标识
        },
      });
      const timestamp = new Date();

      let successCount = 0;
      let statusUpdateCount = 0;
      const metricsToInsert: Record<string, unknown>[] = [];
      const deviceStatusUpdates: Array<{ id: string; status: DeviceStatus }> =
        [];

      // Split devices into batches
      const batches = chunkArray(devices, BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        // 批次之间添加延迟，避免连续请求导致OpManager过载
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }

        // Process batch in parallel
        await Promise.all(
          batch.map(async (device) => {
            try {
              // Fetch device summary using device NAME and IP (with fallback)
              // 添加重试机制，最多重试2次
              let summary: Record<string, unknown> | null = null;
              let retries = 2;
              while (retries >= 0 && !summary) {
                try {
                  summary = await opClient.getDeviceSummary({
                    deviceName: device.opmanagerId || device.name || undefined,
                    deviceIpAddress: device.ipAddress || undefined,
                  });
                  break;
                } catch (error: any) {
                  if (
                    retries > 0 &&
                    (error.code === 'ECONNABORTED' ||
                      error.message?.includes('timeout'))
                  ) {
                    console.warn(
                      `⚠️ Timeout fetching metrics for ${device.name}, retrying... (${retries} retries left)`
                    );
                    retries--;
                    await new Promise((resolve) => setTimeout(resolve, 2000)); // 重试前等待2秒
                  } else {
                    throw error; // 非超时错误直接抛出
                  }
                }
              }

              if (!summary) {
                // console.debug(`ℹ️ No summary returned for ${device.name}`); // Reduce noise
                return;
              }

              // Extract device status from getDeviceSummary
              // getDeviceSummary 返回设备的实时状态（statusStr 或 status 字段）
              // 支持中英文状态（生产环境可能返回中文）
              const summaryStatus =
                (summary.statusStr as string) ||
                (summary.status as string) ||
                '';

              // 检查并映射状态
              let newStatus: DeviceStatus | null = null;
              const statusEn = summaryStatus.toLowerCase();
              if (
                statusEn.includes('critical') ||
                statusEn.includes('down') ||
                statusEn.includes('服务断开')
              ) {
                newStatus = DeviceStatus.ERROR;
              } else if (
                statusEn.includes('warning') ||
                statusEn.includes('attention') ||
                statusEn.includes('trouble') ||
                statusEn.includes('警告') ||
                statusEn.includes('故障') ||
                statusEn.includes('注意')
              ) {
                newStatus = DeviceStatus.WARNING;
              } else if (
                statusEn.includes('clear') ||
                statusEn.includes('online') ||
                statusEn.includes('正常')
              ) {
                newStatus = DeviceStatus.ONLINE;
              } else if (
                statusEn.includes('offline') ||
                statusEn.includes('离线')
              ) {
                newStatus = DeviceStatus.OFFLINE;
              } else if (
                statusEn.includes('unmanaged') ||
                statusEn.includes('未管理')
              ) {
                newStatus = DeviceStatus.UNMANAGED;
              }

              if (newStatus) {
                deviceStatusUpdates.push({ id: device.id, status: newStatus });
              }

              // Extract metric values
              const cpu = parseFloat(
                String(
                  summary.CPUUtilization ||
                    summary.cpuutilization ||
                    summary.cpu_utilization ||
                    '0'
                )
              );
              const mem = parseFloat(
                String(
                  summary.MemoryUtilization ||
                    summary.MemUtilization ||
                    summary.memoryutilization ||
                    summary.memory_utilization ||
                    '0'
                )
              );
              const disk = parseFloat(
                String(
                  summary.DiskUtilization ||
                    summary.diskutilization ||
                    summary.disk_utilization ||
                    '0'
                )
              );
              const resp = parseFloat(
                String(summary.ResponseTime || summary.responsetime || '0')
              );
              const loss = parseFloat(
                String(summary.PacketLoss || summary.packetloss || '0')
              );

              // Validate values
              if (isNaN(cpu) && isNaN(mem) && isNaN(resp)) return;

              const metrics = {
                deviceId: device.id,
                cpuUsage: isNaN(cpu) ? null : cpu,
                memoryUsage: isNaN(mem) ? null : mem,
                diskUsage: isNaN(disk) ? null : disk,
                responseTime: isNaN(resp) ? null : resp,
                packetLoss: isNaN(loss) ? null : loss,
                timestamp,
              };

              metricsToInsert.push(metrics);

              // Broadcast real-time update
              await broadcaster.emit(
                `device:${device.id}`,
                BroadcastEvent.METRICS_UPDATE,
                metrics
              );

              successCount++;
            } catch (err) {
              console.error(`❌ Failed to collect metrics for ${device.name}`);
            }
          })
        );
      }

      // 1. Bulk insert metrics
      if (metricsToInsert.length > 0) {
        await prisma.deviceMetric.createMany({
          data: metricsToInsert as any, // Prisma createMany data type
        });
      }

      // 2. Update device statuses
      if (deviceStatusUpdates.length > 0) {
        // Unfortunately Prisma doesn't have bulk update with different values per ID
        // We'll update them individually in a transaction
        await prisma.$transaction(
          deviceStatusUpdates.map((update) =>
            prisma.device.update({
              where: { id: update.id },
              data: { status: update.status, lastSyncAt: timestamp },
            })
          )
        );
        statusUpdateCount = deviceStatusUpdates.length;
      }

      console.log(`✅ Collected metrics for ${successCount} devices.`);
      if (statusUpdateCount > 0) {
        console.log(`✅ Updated status for ${statusUpdateCount} devices.`);
      }
    } catch (error) {
      console.error('❌ Metric collection scheduler failed:', error);
    }
  }
}

export const metricCollector = new MetricCollector();
