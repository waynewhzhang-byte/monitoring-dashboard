/**
 * Dashboard API 端点诊断脚本
 * 用于验证所有 dashboard 相关 API 是否正常工作
 * 
 * 运行方式:
 * npx tsx scripts/diagnose-dashboard-api.ts
 * 
 * 或添加到 package.json:
 * "scripts": {
 *   "diagnose:dashboard": "tsx scripts/diagnose-dashboard-api.ts"
 * }
 */

import * as http from 'http';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  statusCode?: number;
  message: string;
  data?: any;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const results: TestResult[] = [];

/**
 * 发送 HTTP 请求
 */
async function fetchApi(path: string, method: string = 'GET'): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode || 0, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode || 0, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 测试单个 API 端点
 */
async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  expectedStatus: number = 200,
  validator?: (data: any) => { valid: boolean; message: string }
): Promise<TestResult> {
  try {
    console.log(`Testing ${method} ${endpoint}...`);
    const { statusCode, data } = await fetchApi(endpoint, method);

    if (statusCode !== expectedStatus) {
      return {
        endpoint,
        method,
        status: 'FAIL',
        statusCode,
        message: `Expected status ${expectedStatus}, got ${statusCode}`,
        data,
      };
    }

    // 运行自定义验证器
    if (validator) {
      const validation = validator(data);
      return {
        endpoint,
        method,
        status: validation.valid ? 'PASS' : 'WARN',
        statusCode,
        message: validation.message,
        data,
      };
    }

    return {
      endpoint,
      method,
      status: 'PASS',
      statusCode,
      message: 'OK',
      data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: `Request failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * 主诊断流程
 */
async function runDiagnostics() {
  console.log('='.repeat(80));
  console.log('Dashboard API 诊断脚本');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(80));
  console.log();

  // 1. 测试 /api/stats/business-view (全局)
  results.push(
    await testEndpoint(
      '/api/stats/business-view?bvName=',
      'GET',
      200,
      (data) => {
        if (!data || !data.devices) {
          return { valid: false, message: 'Missing devices field in response' };
        }
        if (typeof data.devices.totalAll !== 'number') {
          return { valid: false, message: 'devices.totalAll is not a number' };
        }
        if (!data.devices.byType) {
          return { valid: false, message: 'Missing devices.byType field' };
        }
        return {
          valid: true,
          message: `OK - Found ${data.devices.totalAll} devices (network: ${data.devices.byType.network || 0}, server: ${data.devices.byType.server || 0})`,
        };
      }
    )
  );

  // 2. 测试 /api/dashboard/overview
  results.push(
    await testEndpoint(
      '/api/dashboard/overview',
      'GET',
      200,
      (data) => {
        if (!data || !data.devices) {
          return { valid: false, message: 'Missing devices field' };
        }
        return {
          valid: true,
          message: `OK - ${data.devices.total} devices, ${data.devices.online} online`,
        };
      }
    )
  );

  // 3. 测试 /api/dashboard/grouped-devices
  results.push(
    await testEndpoint(
      '/api/dashboard/grouped-devices',
      'GET',
      200,
      (data) => {
        if (!data || !Array.isArray(data.groups)) {
          return { valid: false, message: 'Response missing groups array' };
        }
        return {
          valid: true,
          message: `OK - Found ${data.groups.length} business view groups`,
        };
      }
    )
  );

  // 4. 测试 /api/devices
  results.push(
    await testEndpoint(
      '/api/devices?limit=10',
      'GET',
      200,
      (data) => {
        if (!data || !Array.isArray(data.data)) {
          return { valid: false, message: 'Response missing data array' };
        }
        if (data.data.length === 0) {
          return { valid: false, message: 'No devices found in database' };
        }
        return {
          valid: true,
          message: `OK - Found ${data.meta?.total || data.data.length} devices`,
        };
      }
    )
  );

  // 5. 测试 /api/alarms/stats
  results.push(
    await testEndpoint(
      '/api/alarms/stats',
      'GET',
      200,
      (data) => {
        if (!data) {
          return { valid: false, message: 'Empty response' };
        }
        return {
          valid: true,
          message: `OK - Active alarms: ${data.active || 0}`,
        };
      }
    )
  );

  // 6. 测试 /api/interfaces (可选，可能为空)
  results.push(
    await testEndpoint(
      '/api/interfaces?limit=5',
      'GET',
      200,
      (data) => {
        if (!data || !Array.isArray(data.data)) {
          return { valid: false, message: 'Response missing data array' };
        }
        return {
          valid: true,
          message: `OK - Found ${data.meta?.total || data.data.length} interfaces`,
        };
      }
    )
  );

  // 输出结果
  console.log('\n');
  console.log('='.repeat(80));
  console.log('诊断结果');
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result, index) => {
    const icon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    const statusColor =
      result.status === 'PASS'
        ? '\x1b[32m'
        : result.status === 'WARN'
        ? '\x1b[33m'
        : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(
      `\n${index + 1}. ${icon} ${statusColor}${result.status}${resetColor} ${
        result.method
      } ${result.endpoint}`
    );
    console.log(`   状态码: ${result.statusCode || 'N/A'}`);
    console.log(`   消息: ${result.message}`);

    if (result.status === 'FAIL' && result.error) {
      console.log(`   错误: ${result.error}`);
    }

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARN') warnCount++;
    else failCount++;
  });

  console.log('\n' + '='.repeat(80));
  console.log('汇总统计');
  console.log('='.repeat(80));
  console.log(`✅ 通过: ${passCount}`);
  console.log(`⚠️  警告: ${warnCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`总计: ${results.length} 个测试`);

  // 诊断建议
  console.log('\n' + '='.repeat(80));
  console.log('诊断建议');
  console.log('='.repeat(80));

  if (failCount === 0 && warnCount === 0) {
    console.log('✅ 所有 API 端点正常工作！');
  } else {
    console.log('\n发现以下问题:\n');

    const failedTests = results.filter((r) => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('❌ 失败的端点:');
      failedTests.forEach((test) => {
        console.log(`   - ${test.endpoint}`);
        console.log(`     原因: ${test.message}`);
        
        if (test.endpoint.includes('/api/stats/business-view')) {
          console.log('     解决方案: 确保已创建 src/pages/api/stats/business-view.ts 文件');
          console.log('               并重启服务器: npm run build && npm run start');
        } else if (test.endpoint.includes('/api/devices') && test.message.includes('No devices')) {
          console.log('     解决方案: 运行设备同步脚本');
          console.log('               npm run scripts:sync-devices 或');
          console.log('               curl -X POST http://localhost:3000/api/devices/sync');
        }
      });
    }

    const warnTests = results.filter((r) => r.status === 'WARN');
    if (warnTests.length > 0) {
      console.log('\n⚠️  需要注意的端点:');
      warnTests.forEach((test) => {
        console.log(`   - ${test.endpoint}`);
        console.log(`     原因: ${test.message}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('下一步操作');
  console.log('='.repeat(80));
  console.log('1. 如果所有测试通过，访问 http://localhost:3000/dashboard 查看数据');
  console.log('2. 如果有失败，根据上述建议修复问题');
  console.log('3. 运行数据库诊断: npm run diagnose:database');
  console.log('4. 检查浏览器控制台是否有 JavaScript 错误');
  console.log('='.repeat(80));

  // 返回退出码
  process.exit(failCount > 0 ? 1 : 0);
}

// 运行诊断
runDiagnostics().catch((error) => {
  console.error('诊断脚本执行失败:', error);
  process.exit(1);
});
