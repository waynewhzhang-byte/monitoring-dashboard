/**
 * 生产环境完整验证脚本
 * 验证所有数据和功能是否正常
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const SEPARATOR = '='.repeat(80);

console.log('\n' + SEPARATOR);
console.log('生产环境完整验证');
console.log(SEPARATOR + '\n');

interface VerificationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: VerificationResult[] = [];

function logResult(result: VerificationResult) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.test}`);
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  if (result.data) {
    console.log(`   数据:`, result.data);
  }
  console.log('');
}

async function verify() {
  try {
    // ========================================
    // 1. 环境配置验证
    // ========================================
    console.log(SEPARATOR);
    console.log('1. 环境配置验证');
    console.log(SEPARATOR + '\n');

    // 检查 USE_MOCK_DATA
    const useMock = process.env.USE_MOCK_DATA;
    const mockTest: VerificationResult = {
      category: '环境配置',
      test: 'MOCK 数据已禁用',
      passed: useMock !== 'true',
      message: `USE_MOCK_DATA = ${useMock || 'false'}`,
    };
    results.push(mockTest);
    logResult(mockTest);

    // 检查 OpManager 配置
    const opConfig = {
      baseUrl: process.env.OPMANAGER_BASE_URL,
      apiKey: process.env.OPMANAGER_API_KEY,
    };
    const opConfigTest: VerificationResult = {
      category: '环境配置',
      test: 'OpManager 配置完整',
      passed: !!(opConfig.baseUrl && opConfig.apiKey),
      message: `URL: ${opConfig.baseUrl}, API Key: ${opConfig.apiKey ? '已配置' : '未配置'}`,
    };
    results.push(opConfigTest);
    logResult(opConfigTest);

    // ========================================
    // 2. 数据库连接验证
    // ========================================
    console.log(SEPARATOR);
    console.log('2. 数据库连接验证');
    console.log(SEPARATOR + '\n');

    const { prisma } = await import('../src/lib/prisma');

    try {
      await prisma.$connect();
      const dbTest: VerificationResult = {
        category: '数据库',
        test: '数据库连接正常',
        passed: true,
        message: '成功连接到 PostgreSQL',
      };
      results.push(dbTest);
      logResult(dbTest);
    } catch (error: any) {
      const dbTest: VerificationResult = {
        category: '数据库',
        test: '数据库连接失败',
        passed: false,
        message: error.message,
      };
      results.push(dbTest);
      logResult(dbTest);
      throw error;
    }

    // ========================================
    // 3. 数据完整性验证
    // ========================================
    console.log(SEPARATOR);
    console.log('3. 数据完整性验证');
    console.log(SEPARATOR + '\n');

    // 设备数据
    const deviceCount = await prisma.device.count();
    const deviceTest: VerificationResult = {
      category: '数据完整性',
      test: '设备数据',
      passed: deviceCount > 0,
      message: `数据库中有 ${deviceCount} 个设备`,
      data: { count: deviceCount },
    };
    results.push(deviceTest);
    logResult(deviceTest);

    // 告警数据
    const alarmCount = await prisma.alarm.count({ where: { status: 'ACTIVE' } });
    const alarmTest: VerificationResult = {
      category: '数据完整性',
      test: '告警数据',
      passed: true, // 告警可以为0，不是错误
      message: `数据库中有 ${alarmCount} 个活动告警`,
      data: { count: alarmCount },
    };
    results.push(alarmTest);
    logResult(alarmTest);

    // Business View
    const bvCount = await prisma.businessViewConfig.count();
    const bvTest: VerificationResult = {
      category: '数据完整性',
      test: 'Business View 配置',
      passed: bvCount > 0,
      message: `配置了 ${bvCount} 个 Business View`,
      data: { count: bvCount },
    };
    results.push(bvTest);
    logResult(bvTest);

    // ========================================
    // 4. OpManager API 连接验证
    // ========================================
    console.log(SEPARATOR);
    console.log('4. OpManager API 连接验证');
    console.log(SEPARATOR + '\n');

    const { opClient } = await import('../src/services/opmanager/client');

    // 测试设备 API
    try {
      const devicesResponse = await opClient.getDevicesPage({ rows: 5 });
      const deviceApiTest: VerificationResult = {
        category: 'OpManager API',
        test: '设备列表 API',
        passed: devicesResponse.devices.length > 0,
        message: `成功获取 ${devicesResponse.devices.length} 个设备`,
        data: { count: devicesResponse.devices.length },
      };
      results.push(deviceApiTest);
      logResult(deviceApiTest);
    } catch (error: any) {
      const deviceApiTest: VerificationResult = {
        category: 'OpManager API',
        test: '设备列表 API',
        passed: false,
        message: `API 调用失败: ${error.message}`,
      };
      results.push(deviceApiTest);
      logResult(deviceApiTest);
    }

    // 测试告警 API
    try {
      const alarms = await opClient.getAlarms();
      const alarmApiTest: VerificationResult = {
        category: 'OpManager API',
        test: '告警列表 API',
        passed: true,
        message: `成功获取 ${alarms.length} 个告警`,
        data: { count: alarms.length },
      };
      results.push(alarmApiTest);
      logResult(alarmApiTest);
    } catch (error: any) {
      const alarmApiTest: VerificationResult = {
        category: 'OpManager API',
        test: '告警列表 API',
        passed: false,
        message: `API 调用失败: ${error.message}`,
      };
      results.push(alarmApiTest);
      logResult(alarmApiTest);
    }

    // 测试 Business View API
    try {
      const bvResponse = await opClient.getBusinessView();
      const bvApiTest: VerificationResult = {
        category: 'OpManager API',
        test: 'Business View API',
        passed: !!(bvResponse?.BusinessView?.Details),
        message: bvResponse?.BusinessView?.Details
          ? `成功获取 ${bvResponse.BusinessView.Details.length} 个 Business View`
          : 'Business View 数据为空',
        data: bvResponse?.BusinessView?.Details
          ? { count: bvResponse.BusinessView.Details.length }
          : undefined,
      };
      results.push(bvApiTest);
      logResult(bvApiTest);
    } catch (error: any) {
      const bvApiTest: VerificationResult = {
        category: 'OpManager API',
        test: 'Business View API',
        passed: false,
        message: `API 调用失败: ${error.message}`,
      };
      results.push(bvApiTest);
      logResult(bvApiTest);
    }

    // ========================================
    // 5. 数据一致性验证
    // ========================================
    console.log(SEPARATOR);
    console.log('5. 数据一致性验证');
    console.log(SEPARATOR + '\n');

    // 验证设备状态分布
    const deviceStats = await prisma.device.groupBy({
      by: ['status'],
      _count: true,
    });
    const deviceStatsTest: VerificationResult = {
      category: '数据一致性',
      test: '设备状态分布',
      passed: true,
      message: '设备状态统计',
      data: deviceStats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
    };
    results.push(deviceStatsTest);
    logResult(deviceStatsTest);

    // 验证告警严重程度分布
    if (alarmCount > 0) {
      const alarmStats = await prisma.alarm.groupBy({
        by: ['severity'],
        where: { status: 'ACTIVE' },
        _count: true,
      });
      const alarmStatsTest: VerificationResult = {
        category: '数据一致性',
        test: '告警严重程度分布',
        passed: true,
        message: '告警严重程度统计',
        data: alarmStats.reduce((acc: any, stat: any) => {
          acc[stat.severity] = stat._count;
          return acc;
        }, {}),
      };
      results.push(alarmStatsTest);
      logResult(alarmStatsTest);
    }

    // ========================================
    // 6. 采集器配置验证
    // ========================================
    console.log(SEPARATOR);
    console.log('6. 采集器配置验证');
    console.log(SEPARATOR + '\n');

    const collectorConfig = {
      metricsInterval: process.env.COLLECT_METRICS_INTERVAL || '60',
      alarmsInterval: process.env.COLLECT_ALARMS_INTERVAL || '30',
      devicesInterval: process.env.SYNC_DEVICES_INTERVAL || '600',
    };

    const collectorTest: VerificationResult = {
      category: '采集器配置',
      test: '采集间隔配置',
      passed: true,
      message: '采集器配置正常',
      data: collectorConfig,
    };
    results.push(collectorTest);
    logResult(collectorTest);

    // ========================================
    // 7. 示例数据展示
    // ========================================
    console.log(SEPARATOR);
    console.log('7. 示例数据展示');
    console.log(SEPARATOR + '\n');

    // 设备样例
    const sampleDevices = await prisma.device.findMany({
      take: 3,
      select: {
        name: true,
        displayName: true,
        ipAddress: true,
        type: true,
        status: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    console.log('📋 设备样例:');
    sampleDevices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.displayName || device.name}`);
      console.log(`      IP: ${device.ipAddress}`);
      console.log(`      类型: ${device.type}, 状态: ${device.status}`);
    });
    console.log('');

    // 告警样例
    if (alarmCount > 0) {
      const sampleAlarms = await prisma.alarm.findMany({
        take: 3,
        where: { status: 'ACTIVE' },
        select: {
          severity: true,
          category: true,
          title: true,
          device: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
      });

      console.log('🚨 告警样例:');
      sampleAlarms.forEach((alarm, index) => {
        console.log(`   ${index + 1}. [${alarm.severity}] ${alarm.device.name}`);
        console.log(`      ${alarm.title.substring(0, 80)}`);
      });
      console.log('');
    }

    // ========================================
    // 总结
    // ========================================
    console.log(SEPARATOR);
    console.log('验证总结');
    console.log(SEPARATOR + '\n');

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('📊 测试统计:');
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过: ${passedTests} ✅`);
    console.log(`   失败: ${failedTests} ❌`);
    console.log('');

    console.log('📋 分类统计:');
    const categories = [...new Set(results.map((r) => r.category))];
    categories.forEach((category) => {
      const categoryTests = results.filter((r) => r.category === category);
      const categoryPassed = categoryTests.filter((r) => r.passed).length;
      console.log(
        `   ${category}: ${categoryPassed}/${categoryTests.length} 通过`
      );
    });
    console.log('');

    if (failedTests === 0) {
      console.log('✅ 所有验证通过！生产环境配置正确。');
      console.log('');
      console.log('🚀 准备就绪！可以启动服务：');
      console.log('   1. npm run collector  # 启动数据采集服务');
      console.log('   2. npm run dev         # 启动前端服务');
      console.log('');
    } else {
      console.log(`❌ 有 ${failedTests} 项验证失败，请检查配置。`);
      console.log('');
      console.log('失败项目:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   ❌ ${r.test}: ${r.message}`);
        });
      console.log('');
    }

    // 保存验证报告
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        opmanagerUrl: process.env.OPMANAGER_BASE_URL,
        useMockData: process.env.USE_MOCK_DATA || 'false',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
      },
      results,
    };

    const fs = require('fs');
    const reportPath = `production-verification-${new Date()
      .toISOString()
      .replace(/:/g, '-')
      .split('.')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 详细报告已保存到: ${reportPath}\n`);

    await prisma.$disconnect();

    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ 验证过程发生错误:');
    console.error(`   ${error.message}`);
    console.error(`\n${error.stack}`);
    process.exit(1);
  }
}

verify().catch(console.error);
