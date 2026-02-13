/**
 * 生产环境全面诊断脚本
 *
 * 用途：
 * 1. 检查后端数据采集是否正常
 * 2. 验证 OpManager API 调用是否返回真实数据
 * 3. 检查数据库中的数据完整性
 * 4. 测试各个 API 端点
 * 5. 生成详细的诊断报告
 *
 * 使用方法：
 * npx tsx scripts/production-full-diagnosis.ts
 */

import { PrismaClient } from '@prisma/client';
import { OpManagerClient } from '../src/services/opmanager/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface DiagnosisResult {
  section: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  details?: any;
  timestamp: string;
}

const results: DiagnosisResult[] = [];

function log(section: string, status: DiagnosisResult['status'], message: string, details?: any) {
  const result: DiagnosisResult = {
    section,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  results.push(result);

  const icon = {
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    INFO: 'ℹ️'
  }[status];

  console.log(`\n${icon} [${section}] ${message}`);
  if (details) {
    console.log('   详情:', JSON.stringify(details, null, 2).substring(0, 500));
  }
}

async function checkEnvironmentVariables() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 步骤 1: 环境变量检查');
  console.log('='.repeat(80));

  const requiredEnvVars = [
    'DATABASE_URL',
    'OPMANAGER_BASE_URL',
    'OPMANAGER_API_KEY',
  ];

  const optionalEnvVars = [
    'REDIS_URL',
    'USE_MOCK_DATA',
    'NODE_ENV',
    'OPMANAGER_TIMEOUT',
  ];

  let allPresent = true;

  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      log('环境变量', 'ERROR', `必需环境变量 ${varName} 未设置`);
      allPresent = false;
    } else {
      const maskedValue = varName.includes('KEY') || varName.includes('PASSWORD')
        ? '***masked***'
        : value.substring(0, 50) + (value.length > 50 ? '...' : '');
      log('环境变量', 'SUCCESS', `${varName} 已设置`, { value: maskedValue });
    }
  }

  for (const varName of optionalEnvVars) {
    const value = process.env[varName];
    if (value) {
      log('环境变量', 'INFO', `可选环境变量 ${varName} = ${value}`);
    }
  }

  if (!allPresent) {
    log('环境变量', 'ERROR', '部分必需环境变量缺失，诊断可能不完整');
  }

  return allPresent;
}

async function checkDatabaseConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🗄️  步骤 2: 数据库连接检查');
  console.log('='.repeat(80));

  try {
    await prisma.$connect();
    log('数据库连接', 'SUCCESS', '数据库连接成功');

    // 测试查询
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "Device"`;
    const deviceCount = Number(result[0].count);
    log('数据库连接', 'SUCCESS', `可以执行查询，当前设备数量: ${deviceCount}`);

    return true;
  } catch (error: any) {
    log('数据库连接', 'ERROR', '数据库连接失败', {
      error: error.message,
      code: error.code
    });
    return false;
  }
}

async function checkDatabaseData() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 步骤 3: 数据库数据检查');
  console.log('='.repeat(80));

  try {
    // 检查设备数据
    const deviceCount = await prisma.device.count();
    const activeDeviceCount = await prisma.device.count({
      where: { status: 'ONLINE' }
    });
    const recentDevices = await prisma.device.findMany({
      take: 3,
      orderBy: { updatedAt: 'desc' },
      select: {
        name: true,
        displayName: true,
        ipAddress: true,
        status: true,
        updatedAt: true,
        lastSyncAt: true
      }
    });

    log('数据库数据', deviceCount > 0 ? 'SUCCESS' : 'WARNING',
      `设备总数: ${deviceCount}, 在线设备: ${activeDeviceCount}`, {
      recentDevices: recentDevices.map(d => ({
        name: d.name,
        status: d.status,
        lastSync: d.lastSyncAt
      }))
    });

    // 检查接口数据
    const interfaceCount = await prisma.interface.count();
    const monitoredInterfaceCount = await prisma.interface.count({
      where: { isMonitored: true }
    });
    log('数据库数据', interfaceCount > 0 ? 'SUCCESS' : 'WARNING',
      `接口总数: ${interfaceCount}, 监控中接口: ${monitoredInterfaceCount}`);

    // 检查告警数据
    const alarmCount = await prisma.alarm.count();
    const activeAlarmCount = await prisma.alarm.count({
      where: { status: 'ACTIVE' }
    });
    const recentAlarms = await prisma.alarm.findMany({
      take: 3,
      orderBy: { occurredAt: 'desc' },
      select: {
        title: true,
        severity: true,
        status: true,
        occurredAt: true
      }
    });
    log('数据库数据', 'INFO',
      `告警总数: ${alarmCount}, 活动告警: ${activeAlarmCount}`, {
      recentAlarms
    });

    // 检查指标数据
    const metricCount = await prisma.deviceMetric.count();
    const recentMetrics = await prisma.deviceMetric.findMany({
      take: 3,
      orderBy: { timestamp: 'desc' },
      select: {
        device: { select: { name: true } },
        cpuUsage: true,
        memoryUsage: true,
        timestamp: true
      }
    });
    log('数据库数据', metricCount > 0 ? 'SUCCESS' : 'WARNING',
      `设备指标记录数: ${metricCount}`, {
      recentMetrics: recentMetrics.map(m => ({
        device: m.device.name,
        cpu: m.cpuUsage,
        memory: m.memoryUsage,
        time: m.timestamp
      }))
    });

    // 检查流量数据
    const trafficCount = await prisma.trafficMetric.count();
    const recentTraffic = await prisma.trafficMetric.findMany({
      take: 3,
      orderBy: { timestamp: 'desc' },
      select: {
        interface: {
          select: {
            name: true,
            device: { select: { name: true } }
          }
        },
        inBandwidth: true,
        outBandwidth: true,
        timestamp: true
      }
    });
    log('数据库数据', trafficCount > 0 ? 'SUCCESS' : 'WARNING',
      `流量指标记录数: ${trafficCount}`, {
      recentTraffic: recentTraffic.map(t => ({
        device: t.interface.device.name,
        interface: t.interface.name,
        inBw: t.inBandwidth,
        outBw: t.outBandwidth,
        time: t.timestamp
      }))
    });

    // 检查最后同步时间
    const lastSyncDevice = await prisma.device.findFirst({
      orderBy: { lastSyncAt: 'desc' },
      select: { name: true, lastSyncAt: true }
    });

    if (lastSyncDevice?.lastSyncAt) {
      const timeSinceSync = Date.now() - lastSyncDevice.lastSyncAt.getTime();
      const minutesSinceSync = Math.floor(timeSinceSync / 60000);

      if (minutesSinceSync < 5) {
        log('数据库数据', 'SUCCESS',
          `最近同步时间: ${minutesSinceSync} 分钟前 (${lastSyncDevice.name})`);
      } else if (minutesSinceSync < 30) {
        log('数据库数据', 'WARNING',
          `最近同步时间: ${minutesSinceSync} 分钟前 (${lastSyncDevice.name}) - 可能需要检查采集器`);
      } else {
        log('数据库数据', 'ERROR',
          `最近同步时间: ${minutesSinceSync} 分钟前 (${lastSyncDevice.name}) - 采集器可能已停止`);
      }
    } else {
      log('数据库数据', 'WARNING', '没有设备同步时间记录');
    }

    return true;
  } catch (error: any) {
    log('数据库数据', 'ERROR', '检查数据库数据失败', { error: error.message });
    return false;
  }
}

async function checkOpManagerConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🌐 步骤 4: OpManager API 连接检查');
  console.log('='.repeat(80));

  const opClient = new OpManagerClient();

  try {
    // 测试获取设备列表
    console.log('正在调用 OpManager API: listDevices...');
    const devicesResult = await opClient.getDevicesPage({ rows: 5 });

    if (devicesResult.devices.length > 0) {
      log('OpManager API', 'SUCCESS',
        `成功获取设备列表，返回 ${devicesResult.devices.length} 个设备`, {
        total: devicesResult.total,
        sampleDevices: devicesResult.devices.slice(0, 3).map(d => ({
          name: d.name,
          ip: d.ipAddress,
          status: d.status,
          type: d.type
        }))
      });
    } else {
      log('OpManager API', 'WARNING',
        'OpManager API 返回空设备列表，请检查 API 配置和权限');
      return false;
    }

    // 测试获取告警
    console.log('正在调用 OpManager API: listAlarms...');
    const alarms = await opClient.getAlarms();
    log('OpManager API', alarms.length > 0 ? 'SUCCESS' : 'INFO',
      `成功获取告警列表，返回 ${alarms.length} 个告警`, {
      sampleAlarms: alarms.slice(0, 3).map(a => ({
        name: a.name,
        severity: a.severity,
        message: a.message
      }))
    });

    // 测试获取接口（使用第一个设备）
    if (devicesResult.devices.length > 0) {
      const firstDevice = devicesResult.devices[0];
      console.log(`正在调用 OpManager API: getInterfaces (设备: ${firstDevice.name})...`);
      const interfaces = await opClient.getInterfaces({
        deviceIpAddress: firstDevice.ipAddress,
        rows: 5
      });
      log('OpManager API', interfaces.length > 0 ? 'SUCCESS' : 'WARNING',
        `设备 ${firstDevice.name} 的接口数据: ${interfaces.length} 个接口`, {
        sampleInterfaces: interfaces.slice(0, 3).map(i => ({
          name: i.name,
          status: i.status,
          inTraffic: i.inTraffic,
          outTraffic: i.outTraffic
        }))
      });
    }

    return true;
  } catch (error: any) {
    log('OpManager API', 'ERROR', 'OpManager API 调用失败', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    return false;
  }
}

async function checkInternalAPIs() {
  console.log('\n' + '='.repeat(80));
  console.log('🔌 步骤 5: 内部 API 端点检查');
  console.log('='.repeat(80));

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const endpoints = [
    { path: '/api/devices', method: 'GET', name: '设备列表' },
    { path: '/api/alarms', method: 'GET', name: '告警列表' },
    { path: '/api/dashboard/overview', method: 'GET', name: '仪表板概览' },
    { path: '/api/analytics/top-devices', method: 'GET', name: '设备排名' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`正在测试 ${endpoint.method} ${endpoint.path}...`);
      const response = await axios.get(`${baseURL}${endpoint.path}`, {
        timeout: 10000,
        validateStatus: () => true // 不抛出错误，检查所有状态码
      });

      if (response.status === 200) {
        const dataSize = JSON.stringify(response.data).length;
        log('内部 API', 'SUCCESS',
          `${endpoint.name} API 正常 (${response.status})`, {
          dataSize: `${dataSize} bytes`,
          sampleData: JSON.stringify(response.data).substring(0, 200)
        });
      } else {
        log('内部 API', 'WARNING',
          `${endpoint.name} API 返回非 200 状态码`, {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error: any) {
      log('内部 API', 'ERROR',
        `${endpoint.name} API 调用失败`, {
        error: error.message,
        code: error.code
      });
    }
  }
}

async function checkDataConsistency() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 步骤 6: 数据一致性检查');
  console.log('='.repeat(80));

  try {
    // 检查重复的 OpManager ID（设备）
    const duplicateDeviceIds = await prisma.$queryRaw<Array<{ opmanagerId: string; count: bigint }>>`
      SELECT "opmanagerId", COUNT(*) as count
      FROM "Device"
      GROUP BY "opmanagerId"
      HAVING COUNT(*) > 1
    `;

    if (duplicateDeviceIds.length > 0) {
      log('数据一致性', 'WARNING',
        `发现 ${duplicateDeviceIds.length} 个重复的设备 OpManager ID`, {
        samples: duplicateDeviceIds.slice(0, 3).map(d => ({
          opmanagerId: d.opmanagerId,
          count: Number(d.count)
        }))
      });
    } else {
      log('数据一致性', 'SUCCESS', '所有设备的 OpManager ID 唯一');
    }

    // 检查重复的 OpManager ID（接口）
    const duplicateInterfaceIds = await prisma.$queryRaw<Array<{ opmanagerId: string; count: bigint }>>`
      SELECT "opmanagerId", COUNT(*) as count
      FROM "Interface"
      GROUP BY "opmanagerId"
      HAVING COUNT(*) > 1
    `;

    if (duplicateInterfaceIds.length > 0) {
      log('数据一致性', 'WARNING',
        `发现 ${duplicateInterfaceIds.length} 个重复的接口 OpManager ID`, {
        samples: duplicateInterfaceIds.slice(0, 3).map(d => ({
          opmanagerId: d.opmanagerId,
          count: Number(d.count)
        }))
      });
    } else {
      log('数据一致性', 'SUCCESS', '所有接口的 OpManager ID 唯一');
    }

    // 检查设备状态分布
    const statusDistribution = await prisma.device.groupBy({
      by: ['status'],
      _count: true
    });

    log('数据一致性', 'INFO', '设备状态分布', {
      distribution: statusDistribution.map(s => ({
        status: s.status,
        count: s._count
      }))
    });

    // 检查是否有设备没有接口数据
    const devicesWithoutInterfaces = await prisma.device.count({
      where: {
        interfaces: { none: {} }
      }
    });

    if (devicesWithoutInterfaces > 0) {
      const sampleDevices = await prisma.device.findMany({
        where: { interfaces: { none: {} } },
        take: 5,
        select: { name: true, type: true, status: true }
      });

      log('数据一致性', 'WARNING',
        `${devicesWithoutInterfaces} 个设备没有接口数据`, {
        samples: sampleDevices
      });
    } else {
      log('数据一致性', 'SUCCESS', '所有设备都有接口数据');
    }

    return true;
  } catch (error: any) {
    log('数据一致性', 'ERROR', '数据一致性检查失败', { error: error.message });
    return false;
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📝 诊断报告');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  const infoCount = results.filter(r => r.status === 'INFO').length;

  console.log(`\n总计: ${results.length} 项检查`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`⚠️  警告: ${warningCount}`);
  console.log(`❌ 错误: ${errorCount}`);
  console.log(`ℹ️  信息: ${infoCount}`);

  // 按状态分类显示问题
  if (errorCount > 0) {
    console.log('\n❌ 错误详情:');
    results
      .filter(r => r.status === 'ERROR')
      .forEach(r => {
        console.log(`  - [${r.section}] ${r.message}`);
      });
  }

  if (warningCount > 0) {
    console.log('\n⚠️  警告详情:');
    results
      .filter(r => r.status === 'WARNING')
      .forEach(r => {
        console.log(`  - [${r.section}] ${r.message}`);
      });
  }

  // 生成建议
  console.log('\n💡 诊断建议:');

  if (errorCount === 0 && warningCount === 0) {
    console.log('  ✅ 系统运行正常，所有检查通过！');
  } else {
    if (results.some(r => r.section === '环境变量' && r.status === 'ERROR')) {
      console.log('  1. 检查 .env 文件，确保所有必需环境变量已正确设置');
    }
    if (results.some(r => r.section === '数据库连接' && r.status === 'ERROR')) {
      console.log('  2. 检查数据库连接配置和数据库服务状态');
    }
    if (results.some(r => r.section === 'OpManager API' && r.status === 'ERROR')) {
      console.log('  3. 验证 OpManager API 配置（URL、API Key）是否正确');
      console.log('  4. 确认 OpManager 服务可访问且 API Key 有足效权限');
    }
    if (results.some(r => r.section === '数据库数据' && r.message.includes('采集器'))) {
      console.log('  5. 检查数据采集服务是否正在运行');
      console.log('     运行: npm run collector 或 node dist/services/collector/start.js');
    }
    if (results.some(r => r.section === '内部 API' && r.status === 'ERROR')) {
      console.log('  6. 确认应用服务器正在运行 (npm run dev 或 npm start)');
    }
  }

  // 保存详细报告到文件
  const reportPath = `diagnosis-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      success: successCount,
      warning: warningCount,
      error: errorCount,
      info: infoCount
    },
    results
  }, null, 2));

  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
}

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('█  生产环境全面诊断工具');
  console.log('█  时间: ' + new Date().toISOString());
  console.log('█'.repeat(80));

  try {
    // 执行所有检查
    await checkEnvironmentVariables();
    const dbConnected = await checkDatabaseConnection();

    if (dbConnected) {
      await checkDatabaseData();
      await checkDataConsistency();
    }

    await checkOpManagerConnection();

    // 如果应用正在运行，检查内部 API
    // 注意：这需要应用服务器在运行
    console.log('\nℹ️  注意: 内部 API 检查需要应用服务器正在运行');
    console.log('   如果应用未运行，API 检查将失败');
    await checkInternalAPIs();

    // 生成报告
    await generateReport();

  } catch (error: any) {
    console.error('\n❌ 诊断过程发生错误:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行诊断
main().catch(console.error);
