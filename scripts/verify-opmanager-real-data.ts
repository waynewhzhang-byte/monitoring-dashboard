/**
 * OpManager API 真实数据验证脚本
 *
 * 用途：快速验证 OpManager API 是否返回真实的生产数据
 *
 * 使用方法：
 * npx tsx scripts/verify-opmanager-real-data.ts
 */

import { OpManagerClient } from '../src/services/opmanager/client';
import axios from 'axios';

const SEPARATOR = '='.repeat(100);

interface TestResult {
  api: string;
  success: boolean;
  dataReceived: boolean;
  recordCount: number;
  sampleData: any;
  error?: string;
}

const results: TestResult[] = [];

function printHeader(title: string) {
  console.log('\n' + SEPARATOR);
  console.log(`  ${title}`);
  console.log(SEPARATOR);
}

function printResult(result: TestResult) {
  const icon = result.success ? '✅' : '❌';
  const dataIcon = result.dataReceived ? '📦' : '📭';

  console.log(`\n${icon} API: ${result.api}`);
  console.log(`${dataIcon} 数据状态: ${result.dataReceived ? `收到 ${result.recordCount} 条记录` : '无数据返回'}`);

  if (result.error) {
    console.log(`❌ 错误: ${result.error}`);
  }

  if (result.sampleData) {
    console.log(`\n📋 数据样例 (前 3 条):`);
    console.log(JSON.stringify(result.sampleData, null, 2));
  }
}

async function testDevicesAPI() {
  printHeader('测试 1: 设备列表 API (listDevices)');

  const result: TestResult = {
    api: 'listDevices',
    success: false,
    dataReceived: false,
    recordCount: 0,
    sampleData: null
  };

  try {
    const opClient = new OpManagerClient();
    console.log('正在调用 OpManager API: GET /api/json/v2/device/listDevices');

    const response = await opClient.getDevicesPage({ rows: 50 });

    result.success = true;
    result.dataReceived = response.devices.length > 0;
    result.recordCount = response.devices.length;
    result.sampleData = {
      total: response.total,
      returned: response.devices.length,
      devices: response.devices.slice(0, 3).map(d => ({
        name: d.name,
        displayName: d.displayName,
        ipAddress: d.ipAddress,
        type: d.type,
        status: d.status,
        category: d.category,
        isManaged: d.isManaged
      }))
    };

    console.log(`✅ API 调用成功`);
    console.log(`📊 统计: 总计 ${response.total} 个设备, 本次返回 ${response.devices.length} 个`);

    // 验证数据真实性
    if (response.devices.length > 0) {
      const firstDevice = response.devices[0];
      console.log(`\n🔍 数据验证 - 第一个设备:`);
      console.log(`   名称: ${firstDevice.name || '未知'}`);
      console.log(`   IP: ${firstDevice.ipAddress || '未知'}`);
      console.log(`   类型: ${firstDevice.type || '未知'}`);
      console.log(`   状态: ${firstDevice.status || '未知'}`);

      // 检查是否是真实数据（不是 mock 数据）
      const isMockData = firstDevice.name?.includes('mock') ||
                        firstDevice.name?.includes('test') ||
                        firstDevice.ipAddress === '192.168.1.1';

      if (isMockData) {
        console.log(`⚠️  警告: 数据可能是模拟数据，请确认 USE_MOCK_DATA=false`);
      } else {
        console.log(`✅ 数据看起来是真实的生产数据`);
      }
    }

  } catch (error: any) {
    result.error = error.message;
    console.log(`❌ API 调用失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
      console.log(`   响应数据:`, error.response.data);
    }
  }

  results.push(result);
  printResult(result);
}

async function testAlarmsAPI() {
  printHeader('测试 2: 告警列表 API (listAlarms)');

  const result: TestResult = {
    api: 'listAlarms',
    success: false,
    dataReceived: false,
    recordCount: 0,
    sampleData: null
  };

  try {
    const opClient = new OpManagerClient();
    console.log('正在调用 OpManager API: GET /api/json/alarm/listAlarms');

    const alarms = await opClient.getAlarms();

    result.success = true;
    result.dataReceived = alarms.length > 0;
    result.recordCount = alarms.length;
    result.sampleData = alarms.slice(0, 3).map(a => ({
      id: a.id,
      name: a.name,
      severity: a.severity,
      message: a.message,
      category: a.category,
      modTime: a.modTime
    }));

    console.log(`✅ API 调用成功`);
    console.log(`📊 统计: 返回 ${alarms.length} 个告警`);

    if (alarms.length > 0) {
      const severityCount = alarms.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`\n📊 告警严重程度分布:`);
      Object.entries(severityCount).forEach(([severity, count]) => {
        console.log(`   ${severity}: ${count}`);
      });
    } else {
      console.log(`ℹ️  当前没有活动告警`);
    }

  } catch (error: any) {
    result.error = error.message;
    console.log(`❌ API 调用失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
    }
  }

  results.push(result);
  printResult(result);
}

async function testInterfacesAPI() {
  printHeader('测试 3: 设备接口 API (getInterfaces)');

  const result: TestResult = {
    api: 'getInterfaces',
    success: false,
    dataReceived: false,
    recordCount: 0,
    sampleData: null
  };

  try {
    const opClient = new OpManagerClient();

    // 先获取一个设备
    console.log('步骤 1: 获取设备列表...');
    const devicesResponse = await opClient.getDevicesPage({ rows: 10 });

    if (devicesResponse.devices.length === 0) {
      throw new Error('没有可用设备进行测试');
    }

    const testDevice = devicesResponse.devices[0];
    console.log(`步骤 2: 使用设备 ${testDevice.name} (IP: ${testDevice.ipAddress}) 测试接口 API`);
    console.log(`正在调用 OpManager API: GET /api/json/device/getInterfaces`);

    const interfaces = await opClient.getInterfaces({
      deviceIpAddress: testDevice.ipAddress
    });

    result.success = true;
    result.dataReceived = interfaces.length > 0;
    result.recordCount = interfaces.length;
    result.sampleData = {
      device: {
        name: testDevice.name,
        ip: testDevice.ipAddress
      },
      interfaces: interfaces.slice(0, 3).map(i => ({
        name: i.name,
        displayName: i.displayName,
        status: i.status,
        ifIndex: i.ifIndex,
        type: i.type,
        ipAddress: i.ipAddress,
        inTraffic: i.inTraffic,
        outTraffic: i.outTraffic,
        inSpeed: i.inSpeed,
        outSpeed: i.outSpeed
      }))
    };

    console.log(`✅ API 调用成功`);
    console.log(`📊 统计: 设备 ${testDevice.name} 有 ${interfaces.length} 个接口`);

    if (interfaces.length > 0) {
      const statusCount = interfaces.reduce((acc, i) => {
        const status = i.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`\n📊 接口状态分布:`);
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      // 检查流量数据
      const withTraffic = interfaces.filter(i =>
        i.inTraffic && i.inTraffic !== 'NA' && i.inTraffic !== '0'
      ).length;
      console.log(`\n📈 有流量数据的接口: ${withTraffic}/${interfaces.length}`);
    }

  } catch (error: any) {
    result.error = error.message;
    console.log(`❌ API 调用失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
    }
  }

  results.push(result);
  printResult(result);
}

async function testRawAPICall() {
  printHeader('测试 4: 原始 HTTP 请求测试');

  const result: TestResult = {
    api: 'raw-http',
    success: false,
    dataReceived: false,
    recordCount: 0,
    sampleData: null
  };

  try {
    const baseURL = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('OPMANAGER_BASE_URL 或 OPMANAGER_API_KEY 未设置');
    }

    console.log(`目标 URL: ${baseURL}`);
    console.log(`API Key: ${apiKey.substring(0, 10)}...`);

    const url = `${baseURL}/api/json/v2/device/listDevices`;
    console.log(`\n正在发送原始 HTTP GET 请求: ${url}`);

    const response = await axios.get(url, {
      params: {
        apiKey: apiKey,
        rows: 5
      },
      headers: {
        'apiKey': apiKey,
        'Accept': 'application/json'
      },
      timeout: 30000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false // 接受自签名证书
      })
    });

    result.success = response.status === 200;
    const data = response.data;

    console.log(`✅ HTTP 请求成功`);
    console.log(`   状态码: ${response.status} ${response.statusText}`);
    console.log(`   响应头 Content-Type: ${response.headers['content-type']}`);

    // 解析响应
    let devices: any[] = [];
    if (data.rows && Array.isArray(data.rows)) {
      devices = data.rows;
    } else if (Array.isArray(data)) {
      devices = data;
    }

    result.dataReceived = devices.length > 0;
    result.recordCount = devices.length;
    result.sampleData = {
      responseStructure: Object.keys(data),
      total: data.total || '未提供',
      records: data.records || '未提供',
      devicesReturned: devices.length,
      firstDevice: devices[0] || null
    };

    console.log(`\n📊 响应结构:`);
    console.log(`   字段: ${Object.keys(data).join(', ')}`);
    console.log(`   设备数量: ${devices.length}`);

    if (data.total !== undefined) {
      console.log(`   总计 (total): ${data.total}`);
    }

  } catch (error: any) {
    result.error = error.message;
    console.log(`❌ HTTP 请求失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
      console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }

    if (error.code === 'ECONNREFUSED') {
      console.log(`\n💡 建议: OpManager 服务可能未运行或 URL 配置错误`);
      console.log(`   当前配置: ${process.env.OPMANAGER_BASE_URL}`);
    }

    if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      console.log(`\n💡 建议: SSL 证书问题，脚本已配置忽略证书验证`);
    }
  }

  results.push(result);
  printResult(result);
}

async function generateSummary() {
  printHeader('诊断总结');

  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const testsWithData = results.filter(r => r.dataReceived).length;
  const failedTests = results.filter(r => !r.success).length;

  console.log(`\n📊 测试统计:`);
  console.log(`   总测试数: ${totalTests}`);
  console.log(`   成功: ${successfulTests} ✅`);
  console.log(`   失败: ${failedTests} ❌`);
  console.log(`   有数据返回: ${testsWithData} 📦`);

  console.log(`\n📋 测试结果明细:`);
  results.forEach(r => {
    const statusIcon = r.success ? '✅' : '❌';
    const dataIcon = r.dataReceived ? '📦' : '📭';
    console.log(`   ${statusIcon} ${dataIcon} ${r.api}: ${r.recordCount} 条记录${r.error ? ` (${r.error})` : ''}`);
  });

  console.log(`\n💡 结论:`);

  if (successfulTests === totalTests && testsWithData === totalTests) {
    console.log(`   ✅ 所有测试通过！OpManager API 正常返回真实数据`);
    console.log(`   ✅ 后端数据采集可以正常工作`);
  } else if (successfulTests === totalTests && testsWithData < totalTests) {
    console.log(`   ⚠️  API 连接正常，但部分 API 没有返回数据`);
    console.log(`   💡 这可能是正常的（例如：当前没有告警）`);
  } else if (failedTests > 0) {
    console.log(`   ❌ 部分或全部测试失败，请检查:`);
    console.log(`      1. OpManager 服务是否正在运行`);
    console.log(`      2. OPMANAGER_BASE_URL 配置是否正确`);
    console.log(`      3. OPMANAGER_API_KEY 是否有效且有足够权限`);
    console.log(`      4. 网络连接是否正常`);
    console.log(`      5. USE_MOCK_DATA 是否设置为 false`);
  }

  // 环境信息
  console.log(`\n🔧 当前环境配置:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
  console.log(`   USE_MOCK_DATA: ${process.env.USE_MOCK_DATA || '未设置'}`);
  console.log(`   OPMANAGER_BASE_URL: ${process.env.OPMANAGER_BASE_URL || '未设置'}`);
  console.log(`   OPMANAGER_API_KEY: ${process.env.OPMANAGER_API_KEY ? '已设置 (****)' : '未设置'}`);

  // 保存报告
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      useMockData: process.env.USE_MOCK_DATA,
      opmanagerUrl: process.env.OPMANAGER_BASE_URL
    },
    summary: {
      total: totalTests,
      successful: successfulTests,
      failed: failedTests,
      withData: testsWithData
    },
    results
  };

  const fs = require('fs');
  const reportPath = `opmanager-verification-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
}

async function main() {
  console.log('\n' + '█'.repeat(100));
  console.log('█');
  console.log('█  OpManager API 真实数据验证工具');
  console.log('█  时间: ' + new Date().toISOString());
  console.log('█');
  console.log('█'.repeat(100));

  try {
    await testDevicesAPI();
    await testAlarmsAPI();
    await testInterfacesAPI();
    await testRawAPICall();
    await generateSummary();

  } catch (error: any) {
    console.error('\n❌ 验证过程发生未预期的错误:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + SEPARATOR);
  console.log('验证完成');
  console.log(SEPARATOR + '\n');
}

main().catch(console.error);
