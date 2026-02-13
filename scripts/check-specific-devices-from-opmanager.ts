/**
 * 直接从 OpManager API 查询特定 IP 的设备信息
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量 - 尝试多个可能的文件
const envFiles = ['.env.local', '.env.production', '.env'];
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ 加载环境变量文件: ${file}\n`);
    break;
  }
}

// 直接从环境变量获取配置
const OPMANAGER_BASE_URL = process.env.OPMANAGER_BASE_URL;
const OPMANAGER_API_KEY = process.env.OPMANAGER_API_KEY;

if (!OPMANAGER_BASE_URL || !OPMANAGER_API_KEY) {
  console.error('❌ 缺少必需的环境变量:');
  console.error(`  OPMANAGER_BASE_URL: ${OPMANAGER_BASE_URL ? '✅' : '❌ 未设置'}`);
  console.error(`  OPMANAGER_API_KEY: ${OPMANAGER_API_KEY ? '✅' : '❌ 未设置'}`);
  process.exit(1);
}

console.log('OpManager 配置:');
console.log(`  Base URL: ${OPMANAGER_BASE_URL}`);
console.log(`  API Key: ${OPMANAGER_API_KEY ? '***' + OPMANAGER_API_KEY.slice(-4) : '未设置'}\n`);

async function fetchDevicesFromOpManager(targetIPs: string[]) {
  console.log('=== 从 OpManager 获取设备列表 ===\n');

  try {
    const axios = require('axios');
    const https = require('https');

    // 创建 axios 实例，忽略 SSL 证书验证
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    let allDevices: any[] = [];
    let page = 1;
    const rowsPerPage = 100;
    let hasMore = true;

    console.log('正在获取设备列表...\n');

    while (hasMore) {
      const url = `${OPMANAGER_BASE_URL}/api/json/v2/device/listDevices`;
      const params = {
        apiKey: OPMANAGER_API_KEY,
        page: page,
        rows: rowsPerPage
      };

      console.log(`  请求第 ${page} 页...`);

      const response = await axiosInstance.get(url, { params });
      const data = response.data;

      // OpManager API 可能返回不同的结构
      const devices = data.devices || data.rows || [];

      if (devices.length > 0) {
        allDevices = allDevices.concat(devices);
        console.log(`    获取到 ${devices.length} 台设备 (总计: ${allDevices.length})`);

        // 检查是否还有更多页
        const total = data.total || data.records || 0;
        if (total > 0 && allDevices.length >= total) {
          hasMore = false;
        } else if (devices.length < rowsPerPage) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
        console.log(`    没有更多设备`);
      }

      // 安全限制
      if (page > 100) {
        console.log('  ⚠️  达到分页限制 (100页)');
        break;
      }
    }

    console.log(`\n✅ 总共获取到 ${allDevices.length} 台设备\n`);

    // 查找目标设备
    for (const targetIP of targetIPs) {
      console.log('\n' + '='.repeat(100));
      console.log(`查找设备: ${targetIP}`);
      console.log('='.repeat(100) + '\n');

      // 尝试多种方式匹配
      const device = allDevices.find((d: any) => {
        const deviceIP = d.ipAddress || d.ipaddress || d.IpAddress || '';
        return deviceIP.trim() === targetIP.trim();
      });

      if (!device) {
        console.log(`❌ 未找到 IP 为 ${targetIP} 的设备\n`);
        console.log('可能的原因:');
        console.log('  1. 设备在 OpManager 中不存在或已被删除');
        console.log('  2. IP 地址不匹配');
        console.log('  3. 设备在后续分页中（已达到分页限制）\n');

        // 显示一些相似的 IP
        const similarDevices = allDevices.filter((d: any) => {
          const deviceIP = d.ipAddress || d.ipaddress || d.IpAddress || '';
          return deviceIP.includes(targetIP.split('.').slice(0, 3).join('.'));
        }).slice(0, 5);

        if (similarDevices.length > 0) {
          console.log('相似的设备:');
          similarDevices.forEach((d: any) => {
            const ip = d.ipAddress || d.ipaddress || d.IpAddress || '';
            const name = d.name || d.deviceName || d.displayName || '';
            console.log(`  - ${name} (${ip})`);
          });
        }

        continue;
      }

      console.log('✅ 找到设备！\n');
      console.log('--- OpManager 返回的完整原始数据 ---\n');
      console.log(JSON.stringify(device, null, 2));

      console.log('\n--- 关键字段提取 ---\n');

      // 提取关键字段（支持不同的字段名）
      const deviceName = device.name || device.deviceName || device.Name;
      const displayName = device.displayName || device.DisplayName || deviceName;
      const ipAddress = device.ipAddress || device.ipaddress || device.IpAddress;
      const type = device.type || device.Type;
      const category = device.category || device.Category;
      const status = device.status || device.Status;
      const statusStr = device.statusStr || device.StatusStr;
      const isManaged = device.isManaged || device.IsManaged;
      const isManagedStr = device.isManagedStr || device.IsManagedStr;
      const availability = device.availability || device.Availability;

      console.log(`设备名称 (name/deviceName): ${deviceName}`);
      console.log(`显示名称 (displayName): ${displayName}`);
      console.log(`IP 地址 (ipAddress): ${ipAddress}`);
      console.log(`类型 (type): ${type}`);
      console.log(`分类 (category): ${category}`);
      console.log(`状态 (status): ${status}`);
      console.log(`状态字符串 (statusStr): ${statusStr}`);
      console.log(`是否被管理 (isManaged): ${isManaged} (类型: ${typeof isManaged})`);
      console.log(`是否被管理字符串 (isManagedStr): ${isManagedStr}`);
      console.log(`可用性 (availability): ${availability}`);

      console.log('\n--- 同步逻辑分析 ---\n');

      // 模拟同步逻辑
      const finalStatus = statusStr || status || '';
      console.log(`使用的状态值: "${finalStatus}"`);
      console.log(`  转小写: "${finalStatus.toLowerCase()}"`);
      console.log(`  包含 'unmanaged': ${finalStatus.toLowerCase().includes('unmanaged')}`);
      console.log(`  包含 'down': ${finalStatus.toLowerCase().includes('down')}`);
      console.log(`  包含 'clear': ${finalStatus.toLowerCase().includes('clear')}`);
      console.log(`  包含 'up': ${finalStatus.toLowerCase().includes('up')}`);

      console.log('\n根据当前同步逻辑 (device.ts:204-207):');

      const opIsManagedRaw = isManaged;
      const opIsManaged = opIsManagedRaw === undefined
        ? (finalStatus.toLowerCase() !== 'unmanaged')
        : (opIsManagedRaw === 'true' || opIsManagedRaw === true);

      console.log(`  isManaged 原始值: ${JSON.stringify(opIsManagedRaw)} (${typeof opIsManagedRaw})`);
      console.log(`  计算后的 isMonitored: ${opIsManaged}`);

      if (!opIsManaged) {
        console.log('\n❌ 问题分析:');
        if (opIsManagedRaw === undefined) {
          console.log('  - isManaged 字段为 undefined');
          console.log(`  - 因此使用 status 判断: "${finalStatus}" !== "unmanaged"`);
          if (finalStatus.toLowerCase().includes('unmanaged')) {
            console.log('  - status 包含 "unmanaged"，所以 isMonitored = false');
          }
        } else if (opIsManagedRaw === false || opIsManagedRaw === 'false') {
          console.log(`  - isManaged 明确为 ${opIsManagedRaw}`);
        }
        console.log('\n这就是为什么该设备在数据库中 isMonitored=false 的原因！');
      } else {
        console.log('\n✅ 根据此数据，设备应该被标记为 isMonitored=true');
      }

      // 状态映射
      console.log('\n--- 状态映射 ---\n');
      const statusLower = finalStatus.toLowerCase();
      let mappedStatus = 'ONLINE';

      if (statusLower.includes('critical')) {
        mappedStatus = 'ERROR';
      } else if (statusLower.includes('trouble')) {
        mappedStatus = 'ERROR';
      } else if (statusLower.includes('attention') || statusLower.includes('warning')) {
        mappedStatus = 'WARNING';
      } else if (statusLower.includes('down')) {
        mappedStatus = 'OFFLINE';
      } else if (statusLower.includes('unmanaged')) {
        mappedStatus = 'UNMANAGED';
      } else if (statusLower.includes('clear') || statusLower.includes('up')) {
        mappedStatus = 'ONLINE';
      }

      console.log(`OpManager status: "${finalStatus}"`);
      console.log(`数据库 DeviceStatus: ${mappedStatus}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('检查完成');
    console.log('='.repeat(100) + '\n');

  } catch (error: any) {
    console.error('❌ 获取设备列表失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 执行查询
fetchDevicesFromOpManager(['192.168.255.17', '192.168.255.27']);
