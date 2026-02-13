/**
 * 生产环境采集器诊断脚本 - 增强版
 * 诊断采集器超时问题，测试 OpManager API 性能和数据质量
 *
 * 功能：
 * - 验证 OpManager API 连接性
 * - 测试 API 调用成功率和响应时间
 * - 检查返回数据的有效性（是否包含 CPU/Memory 等指标）
 * - 生成优化建议
 */

import { opClient } from '@/services/opmanager/client';
import { prisma } from '@/lib/prisma';

interface DataQuality {
  hasData: boolean;
  hasDials: boolean;
  hasCPU: boolean;
  hasMemory: boolean;
  dialCount: number;
}

interface ApiTest {
  device: string;
  responseTime: number;
  success: boolean;
  error?: string;
  code?: string;
  dataQuality?: DataQuality;
}

interface DiagnosticResult {
  totalDevices: number;
  monitoredDevices: number;
  apiTests: ApiTest[];
  apiValidation: {
    connectionTest: any;
    listDevicesTest: any;
    dataQualityTests: any[];
  };
  estimatedCollectionTime: number;
  recommendations: string[];
}

async function diagnoseProdutionCollector(): Promise<DiagnosticResult> {
  console.log('🔍 开始诊断生产环境采集器...\n');

  const result: DiagnosticResult = {
    totalDevices: 0,
    monitoredDevices: 0,
    apiTests: [],
    apiValidation: {
      connectionTest: null,
      listDevicesTest: null,
      dataQualityTests: [],
    },
    estimatedCollectionTime: 0,
    recommendations: [],
  };

  try {
    // 0. 测试 OpManager API 基础连接
    console.log('0️⃣ 测试 OpManager API 连接...');
    try {
      const startTime = Date.now();
      // 使用 OpManager client 测试连接
      const testDevices = await opClient.getDevices({ rows: 1 });
      const responseTime = Date.now() - startTime;

      result.apiValidation.connectionTest = {
        success: true,
        responseTime,
        hasData: testDevices && testDevices.length > 0,
      };

      console.log(`   ✅ 连接成功 (${responseTime}ms)`);
      console.log(`   ✅ API Key 有效\n`);
    } catch (error: any) {
      result.apiValidation.connectionTest = {
        success: false,
        error: error.message,
        code: error.code,
      };

      console.log(`   ❌ 连接失败: ${error.message}`);
      if (error.code === 'ECONNABORTED') {
        console.log(`   ⚠️  超时 - OpManager 响应过慢或网络问题`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        console.log(`   ⚠️  API Key 无效或权限不足`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   ⚠️  无法连接到 OpManager 服务器`);
      }
      console.log('');

      result.recommendations.push('❌ OpManager API 连接失败！请检查网络、URL 和 API Key');
      console.log('📋 诊断结果:\n');
      result.recommendations.forEach((rec) => console.log(rec));
      return result;
    }

    // 0.5. 测试 listDevices API 返回数据
    console.log('0️⃣.5 测试 listDevices API 返回数据...');
    try {
      const devicesFromApi = await opClient.getDevices({ rows: 10 });

      result.apiValidation.listDevicesTest = {
        success: true,
        deviceCount: devicesFromApi.length,
      };

      console.log(`   ✅ 成功获取设备列表`);
      console.log(`   ✅ 返回 ${devicesFromApi.length} 个设备数据\n`);
    } catch (error: any) {
      result.apiValidation.listDevicesTest = {
        success: false,
        error: error.message,
      };
      console.log(`   ❌ listDevices API 失败: ${error.message}\n`);
    }

    // 1. 检查数据库设备数量
    console.log('1️⃣ 检查数据库中的设备数量...');
    const devices = await prisma.device.findMany({
      where: { isMonitored: true },
      select: { id: true, name: true, ipAddress: true },
      take: 10, // 只测试前 10 个设备
    });

    result.totalDevices = await prisma.device.count();
    result.monitoredDevices = await prisma.device.count({
      where: { isMonitored: true },
    });

    console.log(`   总设备数: ${result.totalDevices}`);
    console.log(`   监控设备数: ${result.monitoredDevices}`);
    console.log(`   测试设备数: ${Math.min(devices.length, 10)}\n`);

    // 2. 测试 OpManager API 性能和数据质量
    console.log('2️⃣ 测试 OpManager API 性能和数据质量...');
    console.log('   (测试前 10 个设备，请耐心等待)\n');

    let successCount = 0;
    let hasValidDataCount = 0;

    for (const device of devices.slice(0, 10)) {
      const startTime = Date.now();
      try {
        console.log(`   测试设备: ${device.name}...`);
        const summary = await opClient.getDeviceSummary(device.name);
        const responseTime = Date.now() - startTime;

        // 验证数据质量
        const hasData = !!summary;
        const hasDials = summary?.dials && Array.isArray(summary.dials) && summary.dials.length > 0;
        const hasCPU = summary?.cpuUtilization || summary?.cpu ||
          (hasDials && summary.dials.some((d: any) => d.displayName?.includes('CPU')));
        const hasMemory = summary?.memoryUtilization || summary?.mem ||
          (hasDials && summary.dials.some((d: any) => d.displayName?.includes('Memory')));

        const dataQuality: DataQuality = {
          hasData,
          hasDials,
          hasCPU: !!hasCPU,
          hasMemory: !!hasMemory,
          dialCount: hasDials ? summary.dials.length : 0,
        };

        result.apiTests.push({
          device: device.name,
          responseTime,
          success: true,
          dataQuality,
        });

        result.apiValidation.dataQualityTests.push({
          device: device.name,
          ...dataQuality,
        });

        if (hasData) successCount++;
        if (hasCPU || hasMemory) hasValidDataCount++;

        // 输出详细结果
        let statusIcon = '✅';
        let statusText = '成功';
        if (!hasData) {
          statusIcon = '⚠️';
          statusText = '无数据';
        } else if (!hasCPU && !hasMemory) {
          statusIcon = '⚠️';
          statusText = '数据不完整';
        }

        console.log(
          `   ${statusIcon} ${device.name}: ${responseTime}ms (${statusText})`
        );

        if (hasData && hasDials) {
          console.log(
            `      📊 包含 ${dataQuality.dialCount} 个指标 (CPU: ${dataQuality.hasCPU ? '✓' : '✗'}, Memory: ${dataQuality.hasMemory ? '✓' : '✗'})`
          );
        } else if (hasData) {
          console.log(`      ℹ️  返回数据但缺少 dials 字段`);
        }

      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        result.apiTests.push({
          device: device.name,
          responseTime,
          success: false,
          error: error.message,
          code: error.code,
        });

        let errorDetail = error.message;
        if (error.code === 'ECONNABORTED') {
          errorDetail = '超时';
        } else if (error.response?.status === 404) {
          errorDetail = '设备不存在';
        }

        console.log(
          `   ❌ ${device.name}: ${responseTime}ms (失败: ${errorDetail})`
        );
      }
    }

    console.log('');

    // 3. 计算平均响应时间和预估采集时间
    console.log('3️⃣ 分析采集性能...');
    const successfulTests = result.apiTests.filter((t) => t.success);
    const validDataTests = result.apiTests.filter((t) =>
      t.success && (t.dataQuality?.hasCPU || t.dataQuality?.hasMemory)
    );

    const avgResponseTime =
      successfulTests.length > 0
        ? successfulTests.reduce((sum, t) => sum + t.responseTime, 0) /
          successfulTests.length
        : 0;

    console.log(
      `   平均响应时间: ${Math.round(avgResponseTime)}ms`
    );
    console.log(
      `   成功率: ${successCount}/${result.apiTests.length} (${Math.round((successCount / result.apiTests.length) * 100)}%)`
    );
    console.log(
      `   有效数据率: ${hasValidDataCount}/${result.apiTests.length} (${Math.round((hasValidDataCount / result.apiTests.length) * 100)}%)`
    );

    // 计算预估采集时间（考虑批量处理）
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 1000;
    const batches = Math.ceil(result.monitoredDevices / BATCH_SIZE);
    const estimatedTimePerBatch = avgResponseTime * BATCH_SIZE;
    const estimatedTotalTime =
      batches * estimatedTimePerBatch + (batches - 1) * BATCH_DELAY_MS;

    result.estimatedCollectionTime = estimatedTotalTime;

    console.log(`   批次数: ${batches} (每批 ${BATCH_SIZE} 个设备)`);
    console.log(`   预估每批耗时: ${Math.round(estimatedTimePerBatch)}ms`);
    console.log(
      `   预估总耗时: ${Math.round(estimatedTotalTime / 1000)}秒\n`
    );

    // 4. 生成建议
    console.log('4️⃣ 生成优化建议...\n');

    const currentTimeout = parseInt(process.env.OPMANAGER_TIMEOUT || '30000');
    console.log(`   当前 OPMANAGER_TIMEOUT: ${currentTimeout}ms`);

    // 检查 API 成功率
    const successRate = (successCount / result.apiTests.length) * 100;
    if (successRate < 80) {
      result.recommendations.push(
        `❌ API 成功率过低 (${Math.round(successRate)}%)！检查:\n` +
        `   - OpManager 服务器状态\n` +
        `   - 设备名称是否正确（数据库中的 name 字段必须与 OpManager 一致）\n` +
        `   - API Key 权限是否足够`
      );
    }

    // 检查数据质量
    const validDataRate = (hasValidDataCount / result.apiTests.length) * 100;
    if (validDataRate < 80 && successRate >= 80) {
      result.recommendations.push(
        `⚠️  数据完整性低 (${Math.round(validDataRate)}% 设备有有效指标)！\n` +
        `   - OpManager 可能未采集某些设备的性能数据\n` +
        `   - 某些设备可能不支持 SNMP 或 WMI\n` +
        `   - 检查 OpManager 中设备的监控状态`
      );
    }

    // 检查超时配置
    if (currentTimeout < avgResponseTime * 2) {
      result.recommendations.push(
        `⚠️  超时配置过短！建议设置为 OPMANAGER_TIMEOUT=${Math.ceil(avgResponseTime * 3)} （当前: ${currentTimeout}ms）`
      );
    }

    // 检查采集周期
    const COLLECT_INTERVAL = 60000; // 60秒
    if (estimatedTotalTime > COLLECT_INTERVAL * 0.8) {
      result.recommendations.push(
        `⚠️  采集时间超过周期！预估 ${Math.round(estimatedTotalTime / 1000)}秒 > 60秒周期的 80%`
      );
      result.recommendations.push(
        `   建议: 将采集间隔改为 ${Math.ceil(estimatedTotalTime / 1000 / 60) * 60}秒 或 减少批次大小`
      );
    }

    // 检查设备数量
    if (result.monitoredDevices > 50) {
      result.recommendations.push(
        `⚠️  监控设备过多 (${result.monitoredDevices}个)！建议:
   - 减少批次大小到 3
   - 增加采集间隔到 120秒
   - 或者只监控关键设备`
      );
    }

    // 检查失败率
    const failureRate =
      (result.apiTests.filter((t) => !t.success).length /
        result.apiTests.length) *
      100;
    if (failureRate > 20) {
      result.recommendations.push(
        `⚠️  API 失败率过高 (${Math.round(failureRate)}%)！检查:
   - OpManager 服务器负载
   - 网络连接
   - API Key 是否正确`
      );
    }

    // 如果一切正常
    if (result.recommendations.length === 0) {
      result.recommendations.push('✅ 采集器配置合理，性能正常！');
    }

    // 5. 输出建议
    result.recommendations.forEach((rec) => console.log(rec));

    console.log('\n=== 诊断完成 ===\n');
  } catch (error) {
    console.error('❌ 诊断失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

// 主函数
async function main() {
  try {
    const result = await diagnoseProdutionCollector();

    // 输出 JSON 格式的结果（可选）
    if (process.argv.includes('--json')) {
      console.log('\n📋 诊断结果 (JSON):');
      console.log(JSON.stringify(result, null, 2));
    }

    // 如果有严重问题，退出码为 1
    const hasCriticalIssue = result.recommendations.some(
      (r) =>
        r.includes('超时配置过短') ||
        r.includes('采集时间超过周期') ||
        r.includes('失败率过高') ||
        r.includes('成功率过低') ||
        r.includes('连接失败')
    );

    process.exit(hasCriticalIssue ? 1 : 0);
  } catch (error) {
    console.error('诊断脚本执行失败:', error);
    process.exit(1);
  }
}

main();
