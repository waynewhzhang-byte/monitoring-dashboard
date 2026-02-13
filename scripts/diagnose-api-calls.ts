/**
 * OpManager API 调用诊断脚本
 *
 * 用途：对比代码调用和 Postman 手工调用的差异
 * 特别关注：
 * 1. listDevices (V2) API 的调用
 * 2. getBusinessDetailsView API 的调用（含中文参数）
 *
 * 使用方法：
 * npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-api-calls.ts
 */

// 加载环境变量 - 必须在最前面
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { OpManagerClient } from '../src/services/opmanager/client';

const SEPARATOR = '='.repeat(120);

interface ApiCallResult {
  api: string;
  method: string;
  success: boolean;
  statusCode?: number;
  requestDetails: {
    url: string;
    params?: any;
    headers?: any;
  };
  responseDetails?: {
    dataType: string;
    structureKeys: string[];
    recordCount: number;
    sampleData: any;
  };
  error?: string;
  rawResponse?: any;
}

const results: ApiCallResult[] = [];

function printHeader(title: string) {
  console.log('\n' + SEPARATOR);
  console.log(`  ${title}`);
  console.log(SEPARATOR);
}

function printSection(title: string) {
  console.log('\n' + '-'.repeat(120));
  console.log(`  ${title}`);
  console.log('-'.repeat(120));
}

/**
 * 测试 1: 使用原始 axios 调用 listDevices API（模拟 Postman）
 */
async function testListDevicesRaw() {
  printHeader('测试 1: 原始 HTTP 调用 - listDevices (V2)');

  const result: ApiCallResult = {
    api: 'listDevices-v2',
    method: 'RAW-HTTP',
    success: false,
    requestDetails: {
      url: '',
      params: {},
      headers: {}
    }
  };

  try {
    const baseURL = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('环境变量未设置');
    }

    const url = `${baseURL}/api/json/v2/device/listDevices`;

    console.log(`\n📡 请求配置:`);
    console.log(`   URL: ${url}`);
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   方法: GET`);

    // 模拟 Postman 的调用方式
    // 方式 1: API Key 作为 query parameter
    const params = {
      apiKey: apiKey,
      rows: 10,
      page: 1
    };

    console.log(`   参数:`, params);

    result.requestDetails = {
      url,
      params,
      headers: {
        'Accept': 'application/json',
        'apiKey': apiKey
      }
    };

    printSection('发送请求中...');

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    const response = await axios.get(url, {
      params,
      headers: {
        'Accept': 'application/json',
        'apiKey': apiKey
      },
      httpsAgent,
      timeout: 30000
    });

    result.success = true;
    result.statusCode = response.status;

    console.log(`\n✅ HTTP 状态: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);

    // 分析响应数据结构
    const data = response.data;
    const structureKeys = Object.keys(data);

    console.log(`\n📊 响应数据结构:`);
    console.log(`   顶层字段: ${structureKeys.join(', ')}`);

    if (data.total !== undefined) console.log(`   total: ${data.total}`);
    if (data.records !== undefined) console.log(`   records: ${data.records}`);
    if (data.page !== undefined) console.log(`   page: ${data.page}`);

    let devices: any[] = [];
    if (data.rows && Array.isArray(data.rows)) {
      devices = data.rows;
      console.log(`   rows: Array[${devices.length}]`);
    } else if (Array.isArray(data)) {
      devices = data;
      console.log(`   直接返回数组: Array[${devices.length}]`);
    }

    result.responseDetails = {
      dataType: Array.isArray(data) ? 'array' : 'object',
      structureKeys,
      recordCount: devices.length,
      sampleData: devices.slice(0, 2).map(d => ({
        name: d.name || d.deviceName,
        displayName: d.displayName,
        ipAddress: d.ipAddress || d.ipaddress,
        type: d.type,
        status: d.status || d.statusStr,
        category: d.category,
        isManaged: d.isManaged,
        allFields: Object.keys(d)
      }))
    };

    result.rawResponse = {
      total: data.total,
      records: data.records,
      page: data.page,
      rowsCount: devices.length
    };

    printSection('响应数据样例 (前 2 条)');
    console.log(JSON.stringify(result.responseDetails.sampleData, null, 2));

    printSection('关键字段分析');
    if (devices.length > 0) {
      const firstDevice = devices[0];
      console.log(`\n第一个设备的所有字段:`);
      Object.keys(firstDevice).forEach(key => {
        const value = firstDevice[key];
        const type = typeof value;
        const preview = type === 'string' ? `"${value}"`.substring(0, 50) :
                       type === 'object' ? JSON.stringify(value).substring(0, 50) :
                       value;
        console.log(`   ${key}: (${type}) ${preview}`);
      });
    }

  } catch (error: any) {
    result.success = false;
    result.error = error.message;

    console.log(`\n❌ 请求失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
      console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }

    if (error.code) {
      console.log(`   错误代码: ${error.code}`);
    }
  }

  results.push(result);
  return result;
}

/**
 * 测试 2: 使用项目中的 OpManagerClient 调用 listDevices
 */
async function testListDevicesClient() {
  printHeader('测试 2: 项目代码调用 - listDevices (V2)');

  const result: ApiCallResult = {
    api: 'listDevices-v2',
    method: 'OpManagerClient',
    success: false,
    requestDetails: {
      url: '/api/json/v2/device/listDevices'
    }
  };

  try {
    console.log(`\n📡 使用 OpManagerClient.getDevicesPage() 方法`);

    const opClient = new OpManagerClient();
    const options = { rows: 10, page: 1 };

    console.log(`   参数:`, options);

    printSection('发送请求中...');

    const response = await opClient.getDevicesPage(options);

    result.success = true;
    result.responseDetails = {
      dataType: 'object',
      structureKeys: Object.keys(response),
      recordCount: response.devices.length,
      sampleData: response.devices.slice(0, 2).map(d => ({
        name: d.name,
        displayName: d.displayName,
        ipAddress: d.ipAddress,
        type: d.type,
        status: d.status,
        category: d.category,
        isManaged: d.isManaged
      }))
    };

    result.rawResponse = {
      total: response.total,
      records: response.records,
      page: response.page,
      devicesCount: response.devices.length
    };

    console.log(`\n✅ 调用成功`);
    console.log(`📊 返回数据:`);
    console.log(`   total: ${response.total}`);
    console.log(`   records: ${response.records}`);
    console.log(`   page: ${response.page}`);
    console.log(`   devices.length: ${response.devices.length}`);

    printSection('响应数据样例 (前 2 条)');
    console.log(JSON.stringify(result.responseDetails.sampleData, null, 2));

  } catch (error: any) {
    result.success = false;
    result.error = error.message;
    console.log(`\n❌ 调用失败: ${error.message}`);
  }

  results.push(result);
  return result;
}

/**
 * 测试 3: 对比 listDevices 的两种调用方式
 */
function compareListDevicesResults(rawResult: ApiCallResult, clientResult: ApiCallResult) {
  printHeader('测试 3: 对比分析 - listDevices 调用差异');

  console.log(`\n📊 数据对比:`);
  console.log(`\n1️⃣ 原始 HTTP 调用:`);
  console.log(`   成功: ${rawResult.success ? '✅' : '❌'}`);
  console.log(`   记录数: ${rawResult.rawResponse?.rowsCount || 0}`);
  console.log(`   总数: ${rawResult.rawResponse?.total || 'N/A'}`);

  console.log(`\n2️⃣ OpManagerClient 调用:`);
  console.log(`   成功: ${clientResult.success ? '✅' : '❌'}`);
  console.log(`   记录数: ${clientResult.rawResponse?.devicesCount || 0}`);
  console.log(`   总数: ${clientResult.rawResponse?.total || 'N/A'}`);

  // 数据一致性检查
  printSection('一致性检查');

  if (rawResult.success && clientResult.success) {
    const rawCount = rawResult.rawResponse?.rowsCount || 0;
    const clientCount = clientResult.rawResponse?.devicesCount || 0;

    if (rawCount === clientCount) {
      console.log(`✅ 返回的设备数量一致: ${rawCount}`);
    } else {
      console.log(`⚠️  返回的设备数量不一致:`);
      console.log(`   原始调用: ${rawCount}`);
      console.log(`   客户端调用: ${clientCount}`);
      console.log(`   差异: ${Math.abs(rawCount - clientCount)}`);
    }

    // 对比数据结构
    if (rawResult.responseDetails && clientResult.responseDetails) {
      console.log(`\n📋 数据结构对比:`);
      console.log(`   原始调用字段: ${rawResult.responseDetails.structureKeys.join(', ')}`);
      console.log(`   客户端调用字段: ${clientResult.responseDetails.structureKeys.join(', ')}`);
    }

    // 对比第一个设备的数据
    if (rawResult.responseDetails?.sampleData[0] && clientResult.responseDetails?.sampleData[0]) {
      const rawDevice = rawResult.responseDetails.sampleData[0];
      const clientDevice = clientResult.responseDetails.sampleData[0];

      console.log(`\n🔍 第一个设备数据对比:`);
      console.log(`   原始调用:`);
      console.log(`     - name: ${rawDevice.name}`);
      console.log(`     - ipAddress: ${rawDevice.ipAddress}`);
      console.log(`     - type: ${rawDevice.type}`);
      console.log(`     - status: ${rawDevice.status}`);

      console.log(`   客户端调用:`);
      console.log(`     - name: ${clientDevice.name}`);
      console.log(`     - ipAddress: ${clientDevice.ipAddress}`);
      console.log(`     - type: ${clientDevice.type}`);
      console.log(`     - status: ${clientDevice.status}`);

      // 检查是否匹配
      const matches = rawDevice.name === clientDevice.name &&
                     rawDevice.ipAddress === clientDevice.ipAddress;

      if (matches) {
        console.log(`\n✅ 第一个设备数据匹配`);
      } else {
        console.log(`\n⚠️  第一个设备数据不匹配`);
      }
    }

  } else {
    console.log(`❌ 无法对比：至少有一个调用失败`);
  }
}

/**
 * 测试 4: 原始 HTTP 调用 getBusinessDetailsView（含中文参数）
 */
async function testBusinessViewRaw() {
  printHeader('测试 4: 原始 HTTP 调用 - getBusinessDetailsView (含中文参数)');

  const result: ApiCallResult = {
    api: 'getBusinessDetailsView',
    method: 'RAW-HTTP',
    success: false,
    requestDetails: {
      url: '',
      params: {},
      headers: {}
    }
  };

  try {
    const baseURL = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('环境变量未设置');
    }

    const url = `${baseURL}/api/json/businessview/getBusinessDetailsView`;
    const bvName = '出口业务';

    console.log(`\n📡 请求配置:`);
    console.log(`   URL: ${url}`);
    console.log(`   Business View 名称: "${bvName}" (中文)`);
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);

    const params = {
      apiKey: apiKey,
      bvName: bvName,
      startPoint: 0,
      viewLength: 50
    };

    console.log(`   原始参数:`, params);

    // 显示 URL 编码后的参数
    const encodedBvName = encodeURIComponent(bvName);
    console.log(`   URL 编码后的 bvName: ${encodedBvName}`);

    result.requestDetails = {
      url,
      params,
      headers: {
        'Accept': 'application/json',
        'apiKey': apiKey
      }
    };

    printSection('发送请求中...');

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // 方式 1: 使用 params（axios 会自动 URL 编码）
    console.log(`\n尝试方式 1: 使用 axios params（自动编码）`);
    const response = await axios.get(url, {
      params,
      headers: {
        'Accept': 'application/json',
        'apiKey': apiKey
      },
      httpsAgent,
      timeout: 30000
    });

    result.success = true;
    result.statusCode = response.status;

    console.log(`\n✅ HTTP 状态: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);

    // 分析响应数据结构
    const data = response.data;
    const structureKeys = Object.keys(data);

    console.log(`\n📊 响应数据结构:`);
    console.log(`   顶层字段: ${structureKeys.join(', ')}`);

    let devices: any[] = [];
    let deviceCount = 0;

    // 根据文档，getBusinessDetailsView 返回格式可能是：
    // { result: { devices: [...] } } 或 { devices: [...] } 或直接数组
    if (data.result && data.result.devices) {
      devices = data.result.devices;
      deviceCount = devices.length;
      console.log(`   result.devices: Array[${deviceCount}]`);
    } else if (data.devices && Array.isArray(data.devices)) {
      devices = data.devices;
      deviceCount = devices.length;
      console.log(`   devices: Array[${deviceCount}]`);
    } else if (Array.isArray(data)) {
      devices = data;
      deviceCount = devices.length;
      console.log(`   直接返回数组: Array[${deviceCount}]`);
    } else if (data.data && Array.isArray(data.data)) {
      devices = data.data;
      deviceCount = devices.length;
      console.log(`   data: Array[${deviceCount}]`);
    }

    result.responseDetails = {
      dataType: typeof data,
      structureKeys,
      recordCount: deviceCount,
      sampleData: devices.slice(0, 3).map(d => ({
        name: d.name || d.deviceName,
        displayName: d.displayName,
        ipAddress: d.ipAddress || d.ipaddress,
        type: d.type || d.deviceType,
        status: d.status || d.statusStr,
        allFields: Object.keys(d)
      }))
    };

    result.rawResponse = {
      structureKeys,
      deviceCount,
      hasResult: !!data.result,
      hasDevices: !!data.devices,
      isArray: Array.isArray(data)
    };

    printSection('响应数据样例 (前 3 条)');
    if (devices.length > 0) {
      console.log(JSON.stringify(result.responseDetails.sampleData, null, 2));
    } else {
      console.log('⚠️  没有设备数据');
      console.log('完整响应:', JSON.stringify(data, null, 2).substring(0, 1000));
    }

    printSection('关键字段分析');
    if (devices.length > 0) {
      const firstDevice = devices[0];
      console.log(`\n第一个设备的所有字段:`);
      Object.keys(firstDevice).forEach(key => {
        const value = firstDevice[key];
        const type = typeof value;
        const preview = type === 'string' ? `"${value}"`.substring(0, 50) :
                       type === 'object' ? JSON.stringify(value).substring(0, 50) :
                       value;
        console.log(`   ${key}: (${type}) ${preview}`);
      });
    }

  } catch (error: any) {
    result.success = false;
    result.error = error.message;

    console.log(`\n❌ 请求失败: ${error.message}`);

    if (error.response) {
      console.log(`   HTTP 状态: ${error.response.status} ${error.response.statusText}`);
      console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }

    if (error.code) {
      console.log(`   错误代码: ${error.code}`);
    }

    // 如果是 404 或参数错误，尝试列出所有可用的 Business Views
    if (error.response?.status === 404 || error.response?.status === 400) {
      console.log(`\n💡 提示: 可能是 Business View 名称不存在或参数格式错误`);
      console.log(`   建议检查 OpManager 中是否存在名为 "出口业务" 的 Business View`);
    }
  }

  results.push(result);
  return result;
}

/**
 * 测试 5: 使用 OpManagerClient 调用 getBusinessDetailsView
 */
async function testBusinessViewClient() {
  printHeader('测试 5: 项目代码调用 - getBusinessDetailsView');

  const result: ApiCallResult = {
    api: 'getBusinessDetailsView',
    method: 'OpManagerClient',
    success: false,
    requestDetails: {
      url: '/api/json/businessview/getBusinessDetailsView'
    }
  };

  try {
    const bvName = '出口业务';
    console.log(`\n📡 使用 OpManagerClient.getBusinessDetailsView() 方法`);
    console.log(`   Business View 名称: "${bvName}"`);

    const opClient = new OpManagerClient();

    printSection('发送请求中...');

    const response = await opClient.getBusinessDetailsView(bvName, 0, 50);

    if (response) {
      result.success = true;

      const structureKeys = Object.keys(response);

      let devices: any[] = [];
      let deviceCount = 0;

      if (response.result && response.result.devices) {
        devices = response.result.devices;
        deviceCount = devices.length;
      } else if (response.devices) {
        devices = response.devices;
        deviceCount = devices.length;
      } else if (Array.isArray(response)) {
        devices = response;
        deviceCount = devices.length;
      }

      result.responseDetails = {
        dataType: typeof response,
        structureKeys,
        recordCount: deviceCount,
        sampleData: devices.slice(0, 3)
      };

      result.rawResponse = {
        structureKeys,
        deviceCount,
        responseType: Array.isArray(response) ? 'array' : 'object'
      };

      console.log(`\n✅ 调用成功`);
      console.log(`📊 返回数据:`);
      console.log(`   类型: ${Array.isArray(response) ? 'Array' : 'Object'}`);
      console.log(`   设备数量: ${deviceCount}`);

      printSection('响应数据样例 (前 3 条)');
      if (devices.length > 0) {
        console.log(JSON.stringify(devices.slice(0, 3), null, 2).substring(0, 1000));
      } else {
        console.log('⚠️  没有设备数据');
      }

    } else {
      result.success = false;
      result.error = '返回 null';
      console.log(`\n⚠️  API 调用返回 null`);
    }

  } catch (error: any) {
    result.success = false;
    result.error = error.message;
    console.log(`\n❌ 调用失败: ${error.message}`);
  }

  results.push(result);
  return result;
}

/**
 * 测试 6: 对比 getBusinessDetailsView 的两种调用方式
 */
function compareBusinessViewResults(rawResult: ApiCallResult, clientResult: ApiCallResult) {
  printHeader('测试 6: 对比分析 - getBusinessDetailsView 调用差异');

  console.log(`\n📊 数据对比:`);
  console.log(`\n1️⃣ 原始 HTTP 调用:`);
  console.log(`   成功: ${rawResult.success ? '✅' : '❌'}`);
  console.log(`   设备数量: ${rawResult.rawResponse?.deviceCount || 0}`);
  console.log(`   数据结构: ${rawResult.rawResponse?.structureKeys?.join(', ') || 'N/A'}`);

  console.log(`\n2️⃣ OpManagerClient 调用:`);
  console.log(`   成功: ${clientResult.success ? '✅' : '❌'}`);
  console.log(`   设备数量: ${clientResult.rawResponse?.deviceCount || 0}`);
  console.log(`   数据结构: ${clientResult.rawResponse?.structureKeys?.join(', ') || 'N/A'}`);

  printSection('一致性检查');

  if (rawResult.success && clientResult.success) {
    const rawCount = rawResult.rawResponse?.deviceCount || 0;
    const clientCount = clientResult.rawResponse?.deviceCount || 0;

    if (rawCount === clientCount) {
      console.log(`✅ 返回的设备数量一致: ${rawCount}`);
    } else {
      console.log(`⚠️  返回的设备数量不一致:`);
      console.log(`   原始调用: ${rawCount}`);
      console.log(`   客户端调用: ${clientCount}`);
      console.log(`   差异: ${Math.abs(rawCount - clientCount)}`);
    }

    // 对比数据结构
    if (rawResult.responseDetails && clientResult.responseDetails) {
      console.log(`\n📋 响应结构对比:`);
      console.log(`   原始调用: ${rawResult.responseDetails.structureKeys.join(', ')}`);
      console.log(`   客户端调用: ${clientResult.responseDetails.structureKeys.join(', ')}`);
    }

  } else {
    console.log(`❌ 无法对比：至少有一个调用失败`);

    if (!rawResult.success) {
      console.log(`\n原始调用失败原因: ${rawResult.error}`);
    }
    if (!clientResult.success) {
      console.log(`\n客户端调用失败原因: ${clientResult.error}`);
    }
  }
}

/**
 * 生成最终报告
 */
function generateFinalReport() {
  printHeader('诊断总结报告');

  console.log(`\n📊 测试统计:`);
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;

  console.log(`   总测试数: ${totalTests}`);
  console.log(`   成功: ${successfulTests} ✅`);
  console.log(`   失败: ${failedTests} ❌`);

  console.log(`\n📋 详细结果:`);
  results.forEach((r, index) => {
    const icon = r.success ? '✅' : '❌';
    console.log(`   ${icon} ${index + 1}. ${r.api} (${r.method}): ${r.success ? '成功' : r.error}`);
  });

  printSection('关键发现');

  // listDevices 分析
  const listDevicesRaw = results.find(r => r.api === 'listDevices-v2' && r.method === 'RAW-HTTP');
  const listDevicesClient = results.find(r => r.api === 'listDevices-v2' && r.method === 'OpManagerClient');

  console.log(`\n1️⃣ listDevices API:`);
  if (listDevicesRaw?.success && listDevicesClient?.success) {
    const rawCount = listDevicesRaw.rawResponse?.rowsCount || 0;
    const clientCount = listDevicesClient.rawResponse?.devicesCount || 0;

    if (rawCount === clientCount) {
      console.log(`   ✅ 原始调用和客户端调用返回的数据一致 (${rawCount} 个设备)`);
    } else {
      console.log(`   ⚠️  数据不一致: 原始 ${rawCount} vs 客户端 ${clientCount}`);
    }
  } else {
    console.log(`   ❌ 至少有一个调用失败`);
  }

  // getBusinessDetailsView 分析
  const businessViewRaw = results.find(r => r.api === 'getBusinessDetailsView' && r.method === 'RAW-HTTP');
  const businessViewClient = results.find(r => r.api === 'getBusinessDetailsView' && r.method === 'OpManagerClient');

  console.log(`\n2️⃣ getBusinessDetailsView API:`);
  if (businessViewRaw?.success && businessViewClient?.success) {
    const rawCount = businessViewRaw.rawResponse?.deviceCount || 0;
    const clientCount = businessViewClient.rawResponse?.deviceCount || 0;

    if (rawCount === clientCount) {
      console.log(`   ✅ 原始调用和客户端调用返回的数据一致 (${rawCount} 个设备)`);
    } else {
      console.log(`   ⚠️  数据不一致: 原始 ${rawCount} vs 客户端 ${clientCount}`);
    }

    // 检查中文参数处理
    if (businessViewRaw.requestDetails.params?.bvName === '出口业务') {
      console.log(`   ✅ 中文参数 "出口业务" 处理正确`);
    }
  } else {
    console.log(`   ❌ 至少有一个调用失败`);
    if (businessViewRaw?.error) {
      console.log(`   原始调用错误: ${businessViewRaw.error}`);
    }
    if (businessViewClient?.error) {
      console.log(`   客户端调用错误: ${businessViewClient.error}`);
    }
  }

  printSection('建议');

  console.log(`\n💡 诊断建议:`);

  if (successfulTests === totalTests) {
    console.log(`   ✅ 所有 API 调用成功！代码实现正确。`);
  } else {
    console.log(`   ⚠️  发现 ${failedTests} 个失败的调用，需要检查:`);

    const failedApis = results.filter(r => !r.success);
    failedApis.forEach(r => {
      console.log(`\n   - ${r.api} (${r.method})`);
      console.log(`     错误: ${r.error}`);

      if (r.api === 'getBusinessDetailsView' && r.error?.includes('404')) {
        console.log(`     建议: 检查 OpManager 中是否存在名为 "出口业务" 的 Business View`);
      }
    });
  }

  // Postman 对比建议
  console.log(`\n📌 与 Postman 对比建议:`);
  console.log(`   1. 确认 Postman 使用的 URL、参数与代码一致`);
  console.log(`   2. 检查 Postman 的 Headers 配置（特别是 apiKey）`);
  console.log(`   3. 对比 Postman 响应和代码响应的数据结构`);
  console.log(`   4. 注意中文参数的 URL 编码处理`);

  // 保存报告
  const fs = require('fs');
  const reportPath = `api-diagnosis-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: {
      opmanagerUrl: process.env.OPMANAGER_BASE_URL,
      useMockData: process.env.USE_MOCK_DATA
    },
    summary: {
      total: totalTests,
      successful: successfulTests,
      failed: failedTests
    },
    results
  }, null, 2));

  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '█'.repeat(120));
  console.log('█');
  console.log('█  OpManager API 调用诊断工具');
  console.log('█  对比代码调用 vs Postman 手工调用');
  console.log('█  时间: ' + new Date().toISOString());
  console.log('█');
  console.log('█'.repeat(120));

  try {
    // 测试 listDevices API
    const listDevicesRaw = await testListDevicesRaw();
    const listDevicesClient = await testListDevicesClient();
    compareListDevicesResults(listDevicesRaw, listDevicesClient);

    // 测试 getBusinessDetailsView API
    const businessViewRaw = await testBusinessViewRaw();
    const businessViewClient = await testBusinessViewClient();
    compareBusinessViewResults(businessViewRaw, businessViewClient);

    // 生成最终报告
    generateFinalReport();

  } catch (error: any) {
    console.error('\n❌ 诊断过程发生错误:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + SEPARATOR);
  console.log('诊断完成');
  console.log(SEPARATOR + '\n');
}

main().catch(console.error);
