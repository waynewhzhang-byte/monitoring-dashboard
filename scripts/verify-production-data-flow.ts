#!/usr/bin/env ts-node
/**
 * 生产环境数据流完整验证脚本
 *
 * 验证流程:
 * 1. 环境配置检查
 * 2. OpManager API 连接测试
 * 3. 数据采集测试 (设备、接口、指标、告警)
 * 4. 数据库写入验证
 * 5. Dashboard API 读取测试
 * 6. 数据一致性检查
 *
 * 运行方式:
 * npm run verify:data-flow
 * 或
 * ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-production-data-flow.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// 加载环境变量
const envPath = path.resolve(process.cwd(), '.env');
console.log('📂 Loading environment from:', envPath);
dotenv.config({ path: envPath });

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function error(message: string) {
  log(`❌ ${message}`, 'red');
}

function warning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'bright');
}

// 测试结果统计
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
  error?: any;
  duration?: number;
}

const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
  if (result.passed) {
    success(`${result.name}: ${result.message}`);
  } else {
    error(`${result.name}: ${result.message}`);
    if (result.error) {
      console.error('  Error details:', result.error);
    }
  }
}

// 辅助函数：测量执行时间
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// 1. 环境配置检查
async function checkEnvironment() {
  section('1. 环境配置检查');

  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPMANAGER_BASE_URL',
    'OPMANAGER_API_KEY',
  ];

  let allPresent = true;
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      error(`Missing environment variable: ${varName}`);
      allPresent = false;
    } else {
      // 隐藏敏感信息
      const displayValue = varName.includes('KEY') || varName.includes('PASSWORD')
        ? '***' + value.slice(-4)
        : value;
      info(`${varName}: ${displayValue}`);
    }
  }

  addResult({
    name: 'Environment Check',
    passed: allPresent,
    message: allPresent ? 'All required variables present' : 'Missing required variables',
  });

  return allPresent;
}

// 2. OpManager API 连接测试
async function testOpManagerConnection() {
  section('2. OpManager API 连接测试');

  try {
    const baseURL = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;
    const timeout = parseInt(process.env.OPMANAGER_TIMEOUT || '30000');

    info(`Connecting to: ${baseURL}`);

    // 测试基础连接 - 获取设备列表（只取1条测试）
    const { result, duration } = await measureTime(async () => {
      const response = await axios.get(`${baseURL}/api/json/device/listDevices_v2`, {
        params: {
          apiKey,
          limit: 1,
        },
        timeout,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
        }),
      });
      return response.data;
    });

    addResult({
      name: 'OpManager Connection',
      passed: true,
      message: `Connected successfully (${duration}ms)`,
      data: {
        responseTime: duration,
        sampleDevice: result?.message?.devices?.[0]?.name || 'N/A',
      },
      duration,
    });

    return true;
  } catch (err: any) {
    addResult({
      name: 'OpManager Connection',
      passed: false,
      message: 'Failed to connect',
      error: err.message,
    });
    return false;
  }
}

// 3. 数据采集测试
async function testDataCollection() {
  section('3. 数据采集测试');

  // 动态导入（避免在环境检查前加载）
  const { deviceCollector } = await import('@/services/collector/device');
  const { interfaceCollector } = await import('@/services/collector/interface');
  const { metricCollector } = await import('@/services/collector/metric');
  const { alarmCollector } = await import('@/services/collector/alarm');

  // 3.1 设备采集
  try {
    info('Testing device collection...');
    const { duration } = await measureTime(() => deviceCollector.syncDevices());

    addResult({
      name: 'Device Collection',
      passed: true,
      message: `Devices synced successfully (${duration}ms)`,
      duration,
    });
  } catch (err: any) {
    addResult({
      name: 'Device Collection',
      passed: false,
      message: 'Failed to sync devices',
      error: err.message,
    });
  }

  // 3.2 接口采集
  try {
    info('Testing interface collection...');
    const { duration } = await measureTime(() => interfaceCollector.syncInterfaces());

    addResult({
      name: 'Interface Collection',
      passed: true,
      message: `Interfaces synced successfully (${duration}ms)`,
      duration,
    });
  } catch (err: any) {
    addResult({
      name: 'Interface Collection',
      passed: false,
      message: 'Failed to sync interfaces',
      error: err.message,
    });
  }

  // 3.3 指标采集
  try {
    info('Testing metric collection...');
    const { duration } = await measureTime(() => metricCollector.collectMetrics());

    addResult({
      name: 'Metric Collection',
      passed: true,
      message: `Metrics collected successfully (${duration}ms)`,
      duration,
    });
  } catch (err: any) {
    addResult({
      name: 'Metric Collection',
      passed: false,
      message: 'Failed to collect metrics',
      error: err.message,
    });
  }

  // 3.4 告警采集
  try {
    info('Testing alarm collection...');
    const { duration } = await measureTime(() => alarmCollector.syncAlarms());

    addResult({
      name: 'Alarm Collection',
      passed: true,
      message: `Alarms synced successfully (${duration}ms)`,
      duration,
    });
  } catch (err: any) {
    addResult({
      name: 'Alarm Collection',
      passed: false,
      message: 'Failed to sync alarms',
      error: err.message,
    });
  }
}

// 4. 数据库验证
async function verifyDatabaseData() {
  section('4. 数据库数据验证');

  const { prisma } = await import('@/lib/prisma');

  try {
    // 4.1 设备数据
    const deviceCount = await prisma.device.count();
    const monitoredDeviceCount = await prisma.device.count({
      where: { isMonitored: true },
    });

    if (deviceCount > 0) {
      success(`Devices in DB: ${deviceCount} (${monitoredDeviceCount} monitored)`);
      addResult({
        name: 'Device Data in DB',
        passed: true,
        message: `${deviceCount} devices found`,
        data: { total: deviceCount, monitored: monitoredDeviceCount },
      });
    } else {
      warning('No devices found in database');
      addResult({
        name: 'Device Data in DB',
        passed: false,
        message: 'No devices in database',
      });
    }

    // 4.2 接口数据
    const interfaceCount = await prisma.interface.count();
    const monitoredInterfaceCount = await prisma.interface.count({
      where: { isMonitored: true },
    });

    if (interfaceCount > 0) {
      success(`Interfaces in DB: ${interfaceCount} (${monitoredInterfaceCount} monitored)`);
      addResult({
        name: 'Interface Data in DB',
        passed: true,
        message: `${interfaceCount} interfaces found`,
        data: { total: interfaceCount, monitored: monitoredInterfaceCount },
      });
    } else {
      warning('No interfaces found in database');
      addResult({
        name: 'Interface Data in DB',
        passed: false,
        message: 'No interfaces in database',
      });
    }

    // 4.3 指标数据
    const metricCount = await prisma.deviceMetric.count();
    if (metricCount > 0) {
      const latestMetric = await prisma.deviceMetric.findFirst({
        orderBy: { timestamp: 'desc' },
        include: { device: { select: { name: true } } },
      });

      success(`Metrics in DB: ${metricCount}`);
      info(`Latest metric: ${latestMetric?.device.name} at ${latestMetric?.timestamp.toISOString()}`);

      addResult({
        name: 'Metric Data in DB',
        passed: true,
        message: `${metricCount} metrics found`,
        data: {
          total: metricCount,
          latest: latestMetric?.timestamp,
        },
      });
    } else {
      warning('No metrics found in database');
      addResult({
        name: 'Metric Data in DB',
        passed: false,
        message: 'No metrics in database',
      });
    }

    // 4.4 告警数据
    const alarmCount = await prisma.alarm.count();
    const activeAlarmCount = await prisma.alarm.count({
      where: { status: 'ACTIVE' },
    });

    if (alarmCount > 0) {
      success(`Alarms in DB: ${alarmCount} (${activeAlarmCount} active)`);
      addResult({
        name: 'Alarm Data in DB',
        passed: true,
        message: `${alarmCount} alarms found`,
        data: { total: alarmCount, active: activeAlarmCount },
      });
    } else {
      warning('No alarms found in database');
      addResult({
        name: 'Alarm Data in DB',
        passed: false,
        message: 'No alarms in database',
      });
    }

    // 4.5 最近更新时间检查
    const recentDevice = await prisma.device.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { name: true, updatedAt: true },
    });

    if (recentDevice) {
      const minutesAgo = Math.round((Date.now() - recentDevice.updatedAt.getTime()) / 60000);
      info(`Most recent device update: ${recentDevice.name} (${minutesAgo} minutes ago)`);

      if (minutesAgo > 30) {
        warning(`Data might be stale (updated ${minutesAgo} minutes ago)`);
      }
    }

  } catch (err: any) {
    error('Database verification failed');
    console.error(err);
    addResult({
      name: 'Database Verification',
      passed: false,
      message: 'Failed to verify database',
      error: err.message,
    });
  }
}

// 5. Dashboard API 测试
async function testDashboardAPIs() {
  section('5. Dashboard API 端点测试');

  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  info(`Testing APIs at: ${baseURL}`);

  const apiEndpoints = [
    { name: 'Devices List', path: '/api/devices' },
    { name: 'Dashboard Overview', path: '/api/dashboard/overview' },
    { name: 'Alarms List', path: '/api/alarms' },
    { name: 'Top Traffic', path: '/api/traffic/top' },
    { name: 'Analytics Top Devices', path: '/api/analytics/top-devices' },
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const { result, duration } = await measureTime(async () => {
        const response = await axios.get(`${baseURL}${endpoint.path}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500, // 接受 4xx 状态码
        });
        return response;
      });

      if (result.status === 200) {
        let dataInfo = '';
        const data = result.data?.data || result.data;

        if (Array.isArray(data)) {
          dataInfo = `${data.length} items`;
        } else if (typeof data === 'object') {
          const keys = Object.keys(data);
          dataInfo = `${keys.length} fields`;
        }

        addResult({
          name: endpoint.name,
          passed: true,
          message: `OK (${duration}ms) - ${dataInfo}`,
          duration,
          data: { status: result.status, dataPreview: dataInfo },
        });
      } else {
        addResult({
          name: endpoint.name,
          passed: false,
          message: `HTTP ${result.status}`,
          data: { status: result.status },
        });
      }
    } catch (err: any) {
      addResult({
        name: endpoint.name,
        passed: false,
        message: 'Request failed',
        error: err.message,
      });
    }
  }
}

// 6. 数据一致性检查
async function verifyDataConsistency() {
  section('6. 数据一致性检查');

  try {
    const { prisma } = await import('@/lib/prisma');

    // 6.1 检查设备是否有关联的接口
    const devicesWithInterfaces = await prisma.device.findMany({
      where: {
        isMonitored: true,
        interfaces: { some: {} },
      },
      include: {
        _count: { select: { interfaces: true } },
      },
      take: 5,
    });

    if (devicesWithInterfaces.length > 0) {
      success(`Found ${devicesWithInterfaces.length} devices with interfaces`);
      devicesWithInterfaces.forEach((device) => {
        info(`  ${device.name}: ${device._count.interfaces} interfaces`);
      });

      addResult({
        name: 'Device-Interface Relationship',
        passed: true,
        message: 'Devices have associated interfaces',
        data: { samplesChecked: devicesWithInterfaces.length },
      });
    } else {
      warning('No devices found with interfaces');
      addResult({
        name: 'Device-Interface Relationship',
        passed: false,
        message: 'No device-interface relationships found',
      });
    }

    // 6.2 检查是否有最近的指标数据
    const recentMetrics = await prisma.deviceMetric.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 最近5分钟
        },
      },
    });

    if (recentMetrics > 0) {
      success(`Found ${recentMetrics} metrics from the last 5 minutes`);
      addResult({
        name: 'Recent Metrics',
        passed: true,
        message: `${recentMetrics} recent metrics found`,
      });
    } else {
      warning('No metrics from the last 5 minutes');
      addResult({
        name: 'Recent Metrics',
        passed: false,
        message: 'No recent metrics (might indicate collector not running)',
      });
    }

    // 6.3 检查设备状态分布
    const deviceStatusCounts = await prisma.device.groupBy({
      by: ['status'],
      _count: true,
      where: { isMonitored: true },
    });

    info('Device status distribution:');
    deviceStatusCounts.forEach((group) => {
      info(`  ${group.status}: ${group._count} devices`);
    });

    addResult({
      name: 'Device Status Distribution',
      passed: deviceStatusCounts.length > 0,
      message: `${deviceStatusCounts.length} different statuses`,
      data: deviceStatusCounts,
    });

  } catch (err: any) {
    error('Data consistency check failed');
    console.error(err);
    addResult({
      name: 'Data Consistency',
      passed: false,
      message: 'Failed to verify consistency',
      error: err.message,
    });
  }
}

// 生成测试报告
function generateReport() {
  section('📊 测试报告');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  log('\n测试结果汇总:', 'bright');
  log(`  总测试数: ${total}`, 'cyan');
  success(`  通过: ${passed}`);
  if (failed > 0) {
    error(`  失败: ${failed}`);
  }
  log(`  通过率: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');

  // 性能统计
  const resultsWithDuration = results.filter((r) => r.duration !== undefined);
  if (resultsWithDuration.length > 0) {
    const totalDuration = resultsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = (totalDuration / resultsWithDuration.length).toFixed(0);

    log('\n性能统计:', 'bright');
    log(`  总耗时: ${totalDuration}ms`, 'cyan');
    log(`  平均耗时: ${avgDuration}ms`, 'cyan');
  }

  // 失败详情
  if (failed > 0) {
    log('\n❌ 失败的测试:', 'red');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  • ${r.name}: ${r.message}`, 'red');
        if (r.error) {
          log(`    ${r.error}`, 'yellow');
        }
      });
  }

  // 建议
  log('\n💡 建议:', 'bright');

  const failedTests = results.filter((r) => !r.passed);
  if (failedTests.some((r) => r.name === 'OpManager Connection')) {
    warning('  • 检查 OpManager 服务是否可访问');
    warning('  • 验证 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY 是否正确');
  }

  if (failedTests.some((r) => r.name.includes('Collection'))) {
    warning('  • 检查采集器是否正在运行: npm run collector');
    warning('  • 查看采集器日志获取详细错误信息');
  }

  if (failedTests.some((r) => r.name.includes('DB'))) {
    warning('  • 检查数据库连接是否正常');
    warning('  • 运行手动同步: npm run check:sync');
  }

  if (failedTests.some((r) => r.name.includes('API'))) {
    warning('  • 检查 Next.js 服务是否正在运行: npm run dev 或 npm run start');
    warning('  • 验证 NEXT_PUBLIC_APP_URL 环境变量');
  }

  if (failedTests.some((r) => r.name === 'Recent Metrics')) {
    warning('  • 采集器可能未运行或刚启动');
    warning('  • 等待 1-2 分钟后重新运行此脚本');
  }

  // 最终结论
  log('\n' + '='.repeat(60), 'bright');
  if (passRate === '100.0') {
    success('🎉 所有测试通过！数据流运行正常。');
  } else if (parseFloat(passRate) >= 80) {
    warning('⚠️  大部分测试通过，但存在一些问题需要关注。');
  } else {
    error('❌ 多个测试失败，数据流可能存在严重问题。');
  }
  log('='.repeat(60) + '\n', 'bright');

  return failed === 0;
}

// 主函数
async function main() {
  log('\n🚀 Production Data Flow Verification', 'bright');
  log(`Started at: ${new Date().toISOString()}\n`, 'cyan');

  try {
    // 1. 环境检查
    const envOk = await checkEnvironment();
    if (!envOk) {
      error('\n❌ 环境配置不完整，无法继续测试');
      process.exit(1);
    }

    // 2. OpManager 连接
    const opManagerOk = await testOpManagerConnection();
    if (!opManagerOk) {
      warning('\n⚠️  OpManager 连接失败，部分测试将跳过');
    }

    // 3. 数据采集测试
    if (opManagerOk) {
      await testDataCollection();
    } else {
      warning('Skipping data collection tests (OpManager not accessible)');
    }

    // 4. 数据库验证
    await verifyDatabaseData();

    // 5. Dashboard API 测试
    await testDashboardAPIs();

    // 6. 数据一致性
    await verifyDataConsistency();

    // 7. 生成报告
    const allPassed = generateReport();

    // 退出码
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    error('\n❌ 验证过程发生未预期的错误:');
    console.error(err);
    process.exit(1);
  }
}

// 运行
main();
