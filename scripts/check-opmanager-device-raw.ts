/**
 * 检查 OpManager 返回的设备原始数据
 * 用于诊断为什么 Managed 设备在同步后变成 UNMANAGED
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

import { opClient } from '../src/services/opmanager/client';

async function checkOpManagerDeviceRaw(ipAddresses: string[]) {
  console.log('\n=== 检查 OpManager 设备原始数据 ===\n');

  try {
    console.log('正在从 OpManager 获取设备列表...\n');

    // 获取第一页设备
    const result = await (opClient as any).getDevicesPage({
      page: 1,
      rows: 1000 // 获取足够多的设备
    });

    const allDevices = result.devices || [];
    console.log(`总共获取到 ${allDevices.length} 台设备\n`);

    // 查找目标设备
    for (const targetIP of ipAddresses) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`查找设备: ${targetIP}`);
      console.log('='.repeat(80) + '\n');

      const device = allDevices.find((d: any) =>
        d.ipAddress === targetIP ||
        d.ipaddress === targetIP ||
        (d.ipAddress && d.ipAddress.trim() === targetIP.trim())
      );

      if (!device) {
        console.log(`❌ 在 OpManager 中没有找到 IP 为 ${targetIP} 的设备\n`);
        console.log('可能的原因：');
        console.log('  1. IP 地址不匹配（检查大小写、空格）');
        console.log('  2. 设备在 OpManager 中已被删除');
        console.log('  3. 分页问题（需要获取更多页）\n');
        continue;
      }

      console.log('✅ 找到设备！OpManager 返回的原始数据：\n');
      console.log(JSON.stringify(device, null, 2));

      console.log('\n--- 关键字段分析 ---\n');

      // 1. isManaged 字段
      const isManagedRaw = (device as any).isManaged;
      console.log(`isManaged (原始值): ${JSON.stringify(isManagedRaw)}`);
      console.log(`  类型: ${typeof isManagedRaw}`);
      console.log(`  是否为 undefined: ${isManagedRaw === undefined}`);

      if (isManagedRaw !== undefined) {
        const parsed = isManagedRaw === 'true' || isManagedRaw === true;
        console.log(`  解析后: ${parsed}`);
      } else {
        console.log(`  ⚠️  isManaged 字段缺失或为 undefined`);
      }

      // 2. status 和 statusStr 字段
      const status = (device as any).status;
      const statusStr = (device as any).statusStr;
      console.log(`\nstatus: ${JSON.stringify(status)}`);
      console.log(`statusStr: ${JSON.stringify(statusStr)}`);

      const finalStatus = statusStr || status || '';
      console.log(`使用的状态值: ${finalStatus}`);
      console.log(`  转小写: ${finalStatus.toLowerCase()}`);
      console.log(`  包含 'unmanaged': ${finalStatus.toLowerCase().includes('unmanaged')}`);
      console.log(`  包含 'down': ${finalStatus.toLowerCase().includes('down')}`);
      console.log(`  包含 'clear': ${finalStatus.toLowerCase().includes('clear')}`);
      console.log(`  包含 'up': ${finalStatus.toLowerCase().includes('up')}`);

      // 3. 当前同步逻辑的判断结果
      console.log('\n--- 当前同步逻辑判断 ---\n');

      const opIsManaged = isManagedRaw === undefined
        ? (finalStatus.toLowerCase() !== 'unmanaged')
        : (isManagedRaw === 'true' || isManagedRaw === true);

      console.log(`根据当前逻辑，isMonitored 应该为: ${opIsManaged}`);

      if (!opIsManaged) {
        console.log('\n❌ 问题分析：');
        if (isManagedRaw === undefined) {
          console.log('  - isManaged 字段缺失');
          console.log(`  - status 为 "${finalStatus}"`);
          if (finalStatus.toLowerCase().includes('unmanaged')) {
            console.log('  - status 包含 "unmanaged"，所以 isMonitored=false');
            console.log('\n🔧 修复建议：');
            console.log('  OpManager 返回的 status 是 "unmanaged"，但您说设备在 OpManager 中是被管理状态');
            console.log('  可能的原因：');
            console.log('  1. OpManager 数据不一致（界面显示 Managed，但 API 返回 UnManaged）');
            console.log('  2. 需要在 OpManager 中重新添加/刷新该设备');
            console.log('  3. OpManager 的监控状态需要更新');
          }
        } else {
          console.log(`  - isManaged 明确为 ${isManagedRaw}`);
          console.log('  - 解析为 false');
        }
      } else {
        console.log('\n✅ 根据当前逻辑，设备应该被标记为 isMonitored=true');
        console.log('   如果数据库中是 false，说明：');
        console.log('   1. 最近一次同步时 OpManager 返回的数据不同');
        console.log('   2. 或者同步逻辑在那之后被修改了');
      }

      // 4. 其他重要字段
      console.log('\n--- 其他字段 ---\n');
      console.log(`name/deviceName: ${device.name || (device as any).deviceName}`);
      console.log(`displayName: ${device.displayName}`);
      console.log(`type: ${device.type}`);
      console.log(`category: ${device.category}`);
      console.log(`availability: ${device.availability}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('检查完成');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 检查这两个有问题的设备
checkOpManagerDeviceRaw(['192.168.255.17', '192.168.255.27']);
