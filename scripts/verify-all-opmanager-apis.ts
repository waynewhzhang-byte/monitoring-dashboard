/**
 * OpManager API 全面验证脚本
 *
 * 用途: 测试所有 8 个 OpManager API 端点，验证是否能正常返回业务数据
 *
 * 使用方法:
 *   npm run verify:opmanager-apis
 *   或
 *   ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/verify-all-opmanager-apis.ts
 *
 * 环境变量:
 *   USE_MOCK_DATA=false  # 测试真实API
 *   USE_MOCK_DATA=true   # 测试Mock数据
 */

// CRITICAL: Load .env file BEFORE importing any modules that depend on environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');
console.log('🔧 Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

// Now import modules that depend on environment variables
import { opClient } from '@/services/opmanager/client';
import { env } from '@/lib/env';

// ANSI 颜色代码
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

// 测试结果统计
interface TestResult {
    name: string;
    endpoint: string;
    success: boolean;
    duration: number;
    dataCount?: number;
    error?: string;
    sampleData?: any;
    warnings?: string[];
}

const testResults: TestResult[] = [];

// 格式化输出
function printHeader(title: string) {
    console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
    console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
    console.log(colors.bright + colors.cyan + '='.repeat(80) + colors.reset + '\n');
}

function printSection(title: string) {
    console.log('\n' + colors.bright + colors.blue + `◆ ${title}` + colors.reset);
    console.log(colors.blue + '─'.repeat(80) + colors.reset);
}

function printSuccess(message: string) {
    console.log(colors.green + '✅ ' + message + colors.reset);
}

function printError(message: string) {
    console.log(colors.red + '❌ ' + message + colors.reset);
}

function printWarning(message: string) {
    console.log(colors.yellow + '⚠️  ' + message + colors.reset);
}

function printInfo(message: string) {
    console.log(colors.cyan + 'ℹ️  ' + message + colors.reset);
}

// 格式化 JSON 输出
function printJson(label: string, data: any, maxDepth: number = 2) {
    console.log(colors.magenta + `${label}:` + colors.reset);
    console.log(JSON.stringify(data, null, 2).split('\n').slice(0, 50).join('\n'));
    if (JSON.stringify(data).length > 1000) {
        console.log(colors.yellow + '  ... (数据已截断，仅显示前50行)' + colors.reset);
    }
}

// 测试环境信息
function printEnvironmentInfo() {
    printSection('环境配置');

    // 安全访问环境变量（env 可能因验证失败而导致脚本退出）
    try {
        console.log(`  OpManager Base URL: ${colors.bright}${env.OPMANAGER_BASE_URL || 'http://localhost:8061'}${colors.reset}`);
        console.log(`  API Key 配置状态:   ${colors.bright}${env.OPMANAGER_API_KEY ? '✅ 已配置 (' + env.OPMANAGER_API_KEY.substring(0, 20) + '...)' : '❌ 未配置'}${colors.reset}`);
        console.log(`  超时时间:          ${colors.bright}${env.OPMANAGER_TIMEOUT || 30000}ms${colors.reset}`);
        console.log(`  Mock 模式:         ${colors.bright}${env.USE_MOCK_DATA === true ? '✅ 启用' : '❌ 禁用'}${colors.reset}`);
        console.log(`  Node 环境:         ${colors.bright}${process.env.NODE_ENV || 'development'}${colors.reset}`);
        console.log(`  数据库配置:        ${colors.bright}${env.DATABASE_URL ? '✅ 已配置' : '❌ 未配置'}${colors.reset}`);
    } catch (error) {
        printError('环境变量读取失败 - 这不应该发生，因为 dotenv 应该已经加载了 .env 文件');
        console.log(colors.red + '  如果您看到此错误，请检查 .env 文件是否存在且格式正确' + colors.reset);
    }
}

// ============================================================================
// 测试用例
// ============================================================================

/**
 * 测试 1: 设备列表 API (分页)
 */
async function test1_DeviceList(): Promise<TestResult> {
    printSection('测试 1: 设备列表 API (分页)');
    const result: TestResult = {
        name: '设备列表 API',
        endpoint: 'GET /api/json/v2/device/listDevices',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        const startTime = Date.now();

        printInfo('调用 API: getDevicesPage({ page: 1, rows: 10 })');
        const response = await (opClient as any).getDevicesPage({
            page: 1,
            rows: 10
        });

        result.duration = Date.now() - startTime;

        if (response && response.devices) {
            result.success = true;
            result.dataCount = response.devices.length;

            printSuccess(`成功获取 ${response.devices.length} 个设备`);
            console.log(`  响应时间: ${result.duration}ms`);
            console.log(`  总记录数: ${response.total || response.records || '未知'}`);
            console.log(`  当前页码: ${response.page || 1}`);

            if (response.devices.length > 0) {
                result.sampleData = response.devices[0];
                printJson('  第一个设备示例数据', response.devices[0]);

                // 数据质量检查
                const firstDevice = response.devices[0];
                const checks = {
                    'deviceName/name': firstDevice.deviceName || firstDevice.name,
                    'ipAddress': firstDevice.ipAddress || firstDevice.ipaddress,
                    'type': firstDevice.type,
                    'status': firstDevice.status,
                    'displayName': firstDevice.displayName,
                };

                console.log('\n  数据字段检查:');
                Object.entries(checks).forEach(([field, value]) => {
                    if (value) {
                        console.log(`    ✅ ${field}: ${value}`);
                    } else {
                        console.log(`    ⚠️  ${field}: ${colors.yellow}缺失${colors.reset}`);
                        result.warnings?.push(`字段 ${field} 缺失`);
                    }
                });
            } else {
                printWarning('API 返回数据为空');
                result.warnings?.push('返回数据为空');
            }
        } else {
            printError('API 返回数据格式异常');
            result.error = '响应格式异常: devices 字段缺失';
        }
    } catch (error: any) {
        result.error = error.message;
        result.duration = Date.now() - (result as any).startTime;
        printError(`请求失败: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 2: 接口列表 API
 */
async function test2_InterfaceList(): Promise<TestResult> {
    printSection('测试 2: 接口列表 API');
    const result: TestResult = {
        name: '接口列表 API',
        endpoint: 'GET /api/json/device/getInterfaces',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        // 首先获取一个设备用于测试
        printInfo('步骤 1: 获取测试设备');
        const devicesResponse = await (opClient as any).getDevicesPage({ rows: 10 });

        if (!devicesResponse.devices || devicesResponse.devices.length === 0) {
            result.error = '无可用设备进行测试';
            printWarning('无可用设备进行接口测试');
            return result;
        }

        const testDevice = devicesResponse.devices[0];
        const deviceIp = testDevice.ipAddress || testDevice.ipaddress;

        if (!deviceIp || deviceIp === 'unknown') {
            result.error = '测试设备无有效IP地址';
            printWarning(`测试设备 ${testDevice.name || testDevice.deviceName} 无有效IP地址`);
            return result;
        }

        printSuccess(`选择测试设备: ${testDevice.displayName || testDevice.name} (IP: ${deviceIp})`);

        const startTime = Date.now();

        printInfo(`步骤 2: 调用 API: getInterfaces({ deviceIpAddress: '${deviceIp}' })`);
        const interfaces = await opClient.getInterfaces({ deviceIpAddress: deviceIp });

        result.duration = Date.now() - startTime;

        if (interfaces && Array.isArray(interfaces)) {
            result.success = true;
            result.dataCount = interfaces.length;

            printSuccess(`成功获取 ${interfaces.length} 个接口`);
            console.log(`  响应时间: ${result.duration}ms`);
            console.log(`  设备名称: ${testDevice.displayName || testDevice.name}`);
            console.log(`  设备IP: ${deviceIp}`);

            if (interfaces.length > 0) {
                result.sampleData = interfaces[0];
                printJson('  第一个接口示例数据', interfaces[0]);

                // 数据质量检查
                const firstInterface = interfaces[0];
                const checks = {
                    'name': firstInterface.name || firstInterface.interfaceName,
                    'displayName': firstInterface.displayName,
                    'status': firstInterface.status || firstInterface.statusStr,
                    'ifIndex': firstInterface.ifIndex || firstInterface.ifIndexNum,
                    'inTraffic': firstInterface.inTraffic,
                    'outTraffic': firstInterface.outTraffic,
                    'ipAddress': firstInterface.ipAddress,
                    'macAddress': firstInterface.macAddress,
                };

                console.log('\n  数据字段检查:');
                Object.entries(checks).forEach(([field, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        console.log(`    ✅ ${field}: ${value}`);
                    } else {
                        console.log(`    ⚠️  ${field}: ${colors.yellow}缺失${colors.reset}`);
                        result.warnings?.push(`字段 ${field} 缺失`);
                    }
                });

                // 检查是否可能有分页限制
                if (interfaces.length >= 100) {
                    printWarning(`接口数量达到 ${interfaces.length}，可能存在分页限制`);
                    result.warnings?.push('可能存在分页限制');
                }
            } else {
                printWarning('设备没有接口数据');
                result.warnings?.push('设备无接口数据');
            }
        } else {
            printError('API 返回数据格式异常');
            result.error = '响应格式异常: 非数组类型';
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 3: 告警列表 API
 */
async function test3_AlarmList(): Promise<TestResult> {
    printSection('测试 3: 告警列表 API');
    const result: TestResult = {
        name: '告警列表 API',
        endpoint: 'GET /api/json/alarm/listAlarms',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        const startTime = Date.now();

        printInfo('调用 API: getAlarms()');
        const alarms = await opClient.getAlarms();

        result.duration = Date.now() - startTime;

        if (Array.isArray(alarms)) {
            result.success = true;
            result.dataCount = alarms.length;

            printSuccess(`成功获取 ${alarms.length} 个告警`);
            console.log(`  响应时间: ${result.duration}ms`);

            if (alarms.length > 0) {
                result.sampleData = alarms[0];
                printJson('  第一个告警示例数据', alarms[0]);

                // 数据质量检查
                const firstAlarm = alarms[0];
                const checks = {
                    'id/alarmId': firstAlarm.id || (firstAlarm as any).alarmId,
                    'severity': firstAlarm.severity,
                    'name/deviceName': firstAlarm.name || (firstAlarm as any).deviceName,
                    'message': firstAlarm.message,
                    'modTime': firstAlarm.modTime,
                    'category': firstAlarm.category,
                };

                console.log('\n  数据字段检查:');
                Object.entries(checks).forEach(([field, value]) => {
                    if (value !== undefined && value !== null) {
                        console.log(`    ✅ ${field}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
                    } else {
                        console.log(`    ⚠️  ${field}: ${colors.yellow}缺失${colors.reset}`);
                        result.warnings?.push(`字段 ${field} 缺失`);
                    }
                });

                // 严重性分布统计
                const severityCount: Record<string, number> = {};
                alarms.forEach(alarm => {
                    const sev = alarm.severity?.toString() || 'UNKNOWN';
                    severityCount[sev] = (severityCount[sev] || 0) + 1;
                });

                console.log('\n  告警严重性分布:');
                Object.entries(severityCount).forEach(([severity, count]) => {
                    console.log(`    ${severity}: ${count}`);
                });
            } else {
                printInfo('当前没有活动告警（这是正常情况）');
            }
        } else {
            printError('API 返回数据格式异常');
            result.error = '响应格式异常: 非数组类型';
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 4: 设备摘要 API
 */
async function test4_DeviceSummary(): Promise<TestResult> {
    printSection('测试 4: 设备摘要 API');
    const result: TestResult = {
        name: '设备摘要 API',
        endpoint: 'GET /api/json/device/getDeviceSummary',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        // 首先获取一个设备
        printInfo('步骤 1: 获取测试设备');
        const devicesResponse = await (opClient as any).getDevicesPage({ rows: 5 });

        if (!devicesResponse.devices || devicesResponse.devices.length === 0) {
            result.error = '无可用设备进行测试';
            printWarning('无可用设备进行摘要测试');
            return result;
        }

        const testDevice = devicesResponse.devices[0];
        const deviceName = testDevice.name || testDevice.deviceName;

        printSuccess(`选择测试设备: ${testDevice.displayName || deviceName}`);

        const startTime = Date.now();

        printInfo(`步骤 2: 调用 API: getDeviceSummary('${deviceName}')`);
        const summary = await opClient.getDeviceSummary(deviceName);

        result.duration = Date.now() - startTime;

        if (summary) {
            result.success = true;
            result.sampleData = summary;

            printSuccess(`成功获取设备摘要数据`);
            console.log(`  响应时间: ${result.duration}ms`);
            console.log(`  设备名称: ${deviceName}`);

            printJson('  摘要数据', summary);

            // 提取性能指标
            console.log('\n  性能指标提取:');

            let cpu = 0, mem = 0, disk = 0;

            // 尝试从 dials 数组提取
            if (summary.dials && Array.isArray(summary.dials)) {
                console.log(`    发现 ${summary.dials.length} 个监控指标 (dials)`);
                const cpuDial = summary.dials.find((d: any) => d.displayName?.includes('CPU'));
                const memDial = summary.dials.find((d: any) => d.displayName?.includes('Memory'));
                const diskDial = summary.dials.find((d: any) => d.displayName?.includes('Disk'));

                if (cpuDial) {
                    cpu = parseFloat(cpuDial.value);
                    console.log(`    ✅ CPU 使用率: ${cpu}%`);
                }
                if (memDial) {
                    mem = parseFloat(memDial.value);
                    console.log(`    ✅ 内存使用率: ${mem}%`);
                }
                if (diskDial) {
                    disk = parseFloat(diskDial.value);
                    console.log(`    ✅ 磁盘使用率: ${disk}%`);
                }
            }

            // 尝试从直接字段提取
            if (summary.cpuUtilization || summary.cpu) {
                cpu = parseFloat(summary.cpuUtilization || summary.cpu);
                console.log(`    ✅ CPU 使用率 (直接字段): ${cpu}%`);
            }
            if (summary.memoryUtilization || summary.mem) {
                mem = parseFloat(summary.memoryUtilization || summary.mem);
                console.log(`    ✅ 内存使用率 (直接字段): ${mem}%`);
            }

            if (summary.responseTime) {
                console.log(`    ✅ 响应时间: ${summary.responseTime}ms`);
            }
            if (summary.packetLoss) {
                console.log(`    ✅ 丢包率: ${summary.packetLoss}%`);
            }

            if (cpu === 0 && mem === 0 && disk === 0) {
                printWarning('未能从摘要数据中提取性能指标，可能需要调整解析逻辑');
                result.warnings?.push('性能指标提取失败');
            }
        } else {
            printWarning('API 返回空数据');
            result.error = '响应为空';
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 5: 图表数据 API (未启用)
 */
async function test5_GraphData(): Promise<TestResult> {
    printSection('测试 5: 图表数据 API (未启用)');
    const result: TestResult = {
        name: '图表数据 API',
        endpoint: 'GET /api/json/device/getGraphData',
        success: false,
        duration: 0,
        warnings: ['此 API 已定义但未在采集器中启用']
    };

    try {
        // 首先获取一个设备
        printInfo('步骤 1: 获取测试设备');
        const devicesResponse = await (opClient as any).getDevicesPage({ rows: 5 });

        if (!devicesResponse.devices || devicesResponse.devices.length === 0) {
            result.error = '无可用设备进行测试';
            printWarning('无可用设备进行图表数据测试');
            return result;
        }

        const testDevice = devicesResponse.devices[0];
        const deviceName = testDevice.name || testDevice.deviceName;

        printSuccess(`选择测试设备: ${testDevice.displayName || deviceName}`);

        const startTime = Date.now();

        printInfo(`步骤 2: 调用 API: getGraphData('${deviceName}', 'CPU')`);
        const graphData = await opClient.getGraphData(deviceName, 'CPU');

        result.duration = Date.now() - startTime;

        if (graphData) {
            result.success = true;
            result.sampleData = graphData;

            printSuccess(`成功获取图表数据`);
            console.log(`  响应时间: ${result.duration}ms`);

            printJson('  图表数据', graphData);
        } else {
            printWarning('API 返回空数据（可能不支持或图表名称不正确）');
            result.warnings?.push('返回空数据');
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        console.log('  注意: 此 API 可能在 Mock 模式下返回 null');
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 6: 仪表板小部件数据 API (未启用)
 */
async function test6_WidgetData(): Promise<TestResult> {
    printSection('测试 6: 仪表板小部件数据 API (未启用)');
    const result: TestResult = {
        name: '仪表板小部件数据 API',
        endpoint: 'GET /api/json/dashboard/getWidgetData',
        success: false,
        duration: 0,
        warnings: ['此 API 已定义但未在采集器中启用']
    };

    try {
        const startTime = Date.now();

        printInfo('调用 API: getWidgetData(\'Dashboard1\', \'widget1\')');
        const widgetData = await opClient.getWidgetData('Dashboard1', 'widget1');

        result.duration = Date.now() - startTime;

        if (widgetData) {
            result.success = true;
            result.sampleData = widgetData;

            printSuccess(`成功获取小部件数据`);
            console.log(`  响应时间: ${result.duration}ms`);

            printJson('  小部件数据', widgetData);
        } else {
            printWarning('API 返回空数据（可能仪表板/小部件不存在）');
            result.warnings?.push('返回空数据');
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        console.log('  注意: 需要提供真实的 dashboardName 和 widgetID 参数');
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 7: 业务视图拓扑 API
 */
async function test7_BusinessViewTopology(): Promise<TestResult> {
    printSection('测试 7: 业务视图拓扑 API');
    const result: TestResult = {
        name: '业务视图拓扑 API',
        endpoint: 'GET /api/json/businessview/getBVDetails',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        // 步骤 1: 获取业务视图列表
        printInfo('步骤 1: 调用 getBusinessView() 获取业务视图列表');
        const businessViewList = await (opClient as any).getBusinessView();

        if (!businessViewList || !businessViewList.BusinessView || !businessViewList.BusinessView.Details) {
            printWarning('未找到任何业务视图');
            printInfo('建议: 在 OpManager 中创建业务视图');
            result.error = '未找到业务视图列表';
            return result;
        }

        const views = businessViewList.BusinessView.Details;
        printSuccess(`找到 ${views.length} 个业务视图`);

        if (views.length === 0) {
            printWarning('业务视图列表为空');
            result.error = '无可用业务视图';
            return result;
        }

        // 显示所有业务视图
        console.log('\n  可用业务视图:');
        views.forEach((view: any, index: number) => {
            console.log(`    ${index + 1}. ${view.name} (显示名: ${view.displayName || 'N/A'})`);
        });

        // 使用第一个业务视图进行测试
        const testBVName = views[0].name;
        printInfo(`\n步骤 2: 使用第一个业务视图进行测试: ${testBVName}`);

        const startTime = Date.now();

        printInfo(`步骤 3: 调用 API: getBVDetails('${testBVName}')`);
        const bvData = await opClient.getBVDetails(testBVName);

        result.duration = Date.now() - startTime;

        if (bvData) {
            result.success = true;
            result.sampleData = bvData;

            const nodeCount = bvData.deviceProperties?.length || 0;
            const linkCount = bvData.linkProperties?.length || 0;

            result.dataCount = nodeCount + linkCount;

            printSuccess(`成功获取业务视图拓扑数据`);
            console.log(`  响应时间: ${result.duration}ms`);
            console.log(`  节点数量: ${nodeCount}`);
            console.log(`  链路数量: ${linkCount}`);

            if (nodeCount > 0) {
                console.log('\n  节点示例:');
                printJson('    第一个节点', bvData.deviceProperties[0]);
            }

            if (linkCount > 0) {
                console.log('\n  链路示例:');
                printJson('    第一个链路', bvData.linkProperties[0]);
            }

            if (nodeCount === 0 && linkCount === 0) {
                printWarning('业务视图为空（可能需要在 OpManager 中配置业务视图）');
                result.warnings?.push('业务视图为空');
            }
        } else {
            printWarning(`业务视图 '${testBVName}' 不存在或返回空数据`);
            result.error = '业务视图不存在或返回空数据';
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        console.log('  提示: 需要在 OpManager 中配置业务视图');
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

/**
 * 测试 8: 业务视图设备详情 API
 */
async function test8_BusinessViewDetails(): Promise<TestResult> {
    printSection('测试 8: 业务视图设备详情 API');
    const result: TestResult = {
        name: '业务视图设备详情 API',
        endpoint: 'GET /api/json/businessview/getBusinessDetailsView',
        success: false,
        duration: 0,
        warnings: []
    };

    try {
        // 步骤 1: 获取业务视图列表
        printInfo('步骤 1: 调用 getBusinessView() 获取业务视图列表');
        const businessViewList = await (opClient as any).getBusinessView();

        if (!businessViewList || !businessViewList.BusinessView || !businessViewList.BusinessView.Details) {
            printWarning('未找到任何业务视图');
            result.error = '未找到业务视图列表';
            return result;
        }

        const views = businessViewList.BusinessView.Details;
        printSuccess(`找到 ${views.length} 个业务视图`);

        if (views.length === 0) {
            printWarning('业务视图列表为空');
            result.error = '无可用业务视图';
            return result;
        }

        // 使用第一个业务视图进行测试
        const testBVName = views[0].name;
        printInfo(`步骤 2: 使用第一个业务视图进行测试: ${testBVName}`);

        const startTime = Date.now();

        printInfo(`步骤 3: 调用 API: getBusinessDetailsView('${testBVName}', 0, 10)`);
        const detailsData = await opClient.getBusinessDetailsView(testBVName, 0, 10);

        result.duration = Date.now() - startTime;

        if (detailsData && detailsData.BusinessDetailsView) {
            result.success = true;
            result.sampleData = detailsData;

            const details = detailsData.BusinessDetailsView.Details || [];
            result.dataCount = details.length;

            printSuccess(`成功获取业务视图设备详情`);
            console.log(`  响应时间: ${result.duration}ms`);
            console.log(`  设备数量: ${details.length}`);

            if (details.length > 0) {
                printJson('  第一个设备详情', details[0]);

                // 检查性能数据
                const firstDevice = details[0];
                console.log('\n  性能数据检查:');
                if (firstDevice.CPUUtilization !== undefined) {
                    console.log(`    ✅ CPU 使用率: ${firstDevice.CPUUtilization}`);
                }
                if (firstDevice.MemUtilization !== undefined) {
                    console.log(`    ✅ 内存使用率: ${firstDevice.MemUtilization}`);
                }
            } else {
                printWarning('业务视图中没有设备详情');
                result.warnings?.push('无设备详情');
            }
        } else {
            printWarning(`业务视图 '${testBVName}' 不存在或返回空数据`);
            result.error = '业务视图不存在或返回空数据';
        }
    } catch (error: any) {
        result.error = error.message;
        printError(`请求失败: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP 状态: ${error.response.status}`);
            console.log(`  错误详情: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
    }

    return result;
}

// ============================================================================
// 汇总报告
// ============================================================================

function printSummaryReport(results: TestResult[]) {
    printHeader('测试汇总报告');

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    console.log(`总测试数: ${colors.bright}${totalCount}${colors.reset}`);
    console.log(`成功数:   ${colors.green}${successCount}${colors.reset}`);
    console.log(`失败数:   ${colors.red}${totalCount - successCount}${colors.reset}`);
    console.log(`成功率:   ${successRate === '100.0' ? colors.green : colors.yellow}${successRate}%${colors.reset}`);

    console.log('\n详细结果:');
    console.log('─'.repeat(120));
    console.log(
        `${'序号'.padEnd(4)} | ` +
        `${'测试名称'.padEnd(25)} | ` +
        `${'状态'.padEnd(8)} | ` +
        `${'响应时间'.padEnd(10)} | ` +
        `${'数据量'.padEnd(8)} | ` +
        `错误/警告`
    );
    console.log('─'.repeat(120));

    results.forEach((r, index) => {
        const status = r.success
            ? `${colors.green}✅ 成功${colors.reset}`
            : `${colors.red}❌ 失败${colors.reset}`;

        const duration = `${r.duration}ms`.padEnd(10);
        const dataCount = r.dataCount !== undefined ? String(r.dataCount).padEnd(8) : 'N/A'.padEnd(8);
        const issueInfo = r.error || (r.warnings && r.warnings.length > 0 ? `⚠️ ${r.warnings.length} warnings` : '');

        console.log(
            `${String(index + 1).padEnd(4)} | ` +
            `${r.name.padEnd(25)} | ` +
            `${status} | ` +
            `${duration} | ` +
            `${dataCount} | ` +
            `${issueInfo}`
        );

        // 打印警告
        if (r.warnings && r.warnings.length > 0) {
            r.warnings.forEach(w => {
                console.log(`       ${colors.yellow}  ⚠️  ${w}${colors.reset}`);
            });
        }

        // 打印错误
        if (r.error && !r.success) {
            console.log(`       ${colors.red}  ❌ ${r.error}${colors.reset}`);
        }
    });
    console.log('─'.repeat(120));

    // 推荐操作
    printSection('推荐操作');

    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
        console.log(`${colors.yellow}发现 ${failedTests.length} 个失败的测试:${colors.reset}`);
        failedTests.forEach(t => {
            console.log(`  • ${t.name}: ${t.error}`);
        });
        console.log('\n建议检查:');
        console.log('  1. OpManager 服务是否正常运行');
        console.log('  2. API Key 是否正确配置');
        console.log('  3. 网络连接是否正常');
        console.log('  4. OpManager 中是否有相应数据（设备、业务视图等）');
    } else {
        console.log(`${colors.green}✅ 所有测试通过！OpManager API 工作正常。${colors.reset}`);
    }

    // 警告汇总
    const allWarnings = results.flatMap(r => r.warnings || []);
    if (allWarnings.length > 0) {
        console.log(`\n${colors.yellow}⚠️  共发现 ${allWarnings.length} 个警告${colors.reset}`);
        const uniqueWarnings = [...new Set(allWarnings)];
        uniqueWarnings.forEach(w => {
            console.log(`  • ${w}`);
        });
    }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
    printHeader('OpManager API 全面验证测试');

    printEnvironmentInfo();

    console.log('\n' + colors.bright + '开始执行测试...' + colors.reset);

    // 执行所有测试
    testResults.push(await test1_DeviceList());
    testResults.push(await test2_InterfaceList());
    testResults.push(await test3_AlarmList());
    testResults.push(await test4_DeviceSummary());
    testResults.push(await test5_GraphData());
    testResults.push(await test6_WidgetData());
    testResults.push(await test7_BusinessViewTopology());
    testResults.push(await test8_BusinessViewDetails());

    // 打印汇总报告
    printSummaryReport(testResults);

    // 退出码
    const allSuccess = testResults.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
}

// 执行
main().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
});
