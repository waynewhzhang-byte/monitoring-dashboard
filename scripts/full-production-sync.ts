/**
 * 完整生产环境同步脚本
 * 从 OpManager 生产环境完整同步所有数据
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

console.log('\n' + '='.repeat(80));
console.log('完整生产环境同步');
console.log('='.repeat(80) + '\n');

// 映射 OpManager 设备类型到 Prisma 枚举
function mapDeviceType(opManagerType: string): string {
  const typeStr = (opManagerType || '').toLowerCase();
  
  if (typeStr.includes('router')) return 'ROUTER';
  if (typeStr.includes('switch') || typeStr.includes('catalyst')) return 'SWITCH';
  if (typeStr.includes('firewall') || typeStr.includes('asa')) return 'FIREWALL';
  if (typeStr.includes('server') || typeStr.includes('windows') || typeStr.includes('linux')) return 'SERVER';
  if (typeStr.includes('load') && typeStr.includes('balance')) return 'LOAD_BALANCER';
  if (typeStr.includes('storage') || typeStr.includes('san') || typeStr.includes('nas')) return 'STORAGE';
  if (typeStr.includes('printer')) return 'PRINTER';
  
  return 'OTHER';
}

// 映射 OpManager 设备状态到 Prisma 枚举
function mapDeviceStatus(opManagerStatus: string): string {
  const statusStr = (opManagerStatus || '').toLowerCase();
  
  /**
   * IMPORTANT: ONLINE 概念（避免后续逻辑混乱）
   *
   * - ONLINE / WARNING / ERROR：都表示“设备可达/在线（OpManager 仍在采集）”，区别仅在健康程度
   *   - Clear      → ONLINE
   *   - Attention  → WARNING
   *   - Trouble/Critical → ERROR
   *
   * - OFFLINE：仅对应 OpManager Down（真正离线、不可达/不可 Ping）
   * - UNMANAGED：仅对应 OpManager UnManaged（未纳入监控，不应继续拉实时/性能/接口数据）
   *
   * 结论：WARNING/ERROR 不是离线，仍然“在线可达”；只有 OFFLINE/UNMANAGED 才应跳过进一步采集。
   */
  if (statusStr.includes('critical')) return 'ERROR';
  if (statusStr.includes('trouble')) return 'ERROR';
  if (statusStr.includes('attention') || statusStr.includes('warning') || statusStr.includes('warn')) return 'WARNING';
  if (statusStr.includes('down')) return 'OFFLINE';   // 仅 Down = 离线、不可 Ping
  if (statusStr.includes('unmanaged')) return 'UNMANAGED';  // 未纳入监控，不映射为 OFFLINE
  if (statusStr.includes('clear') || statusStr.includes('up')) return 'ONLINE';
  
  return 'ONLINE';
}

// 映射告警严重程度
function mapAlarmSeverity(severity: string | number): string {
  const severityStr = String(severity).toLowerCase();
  
  if (severityStr === '1' || severityStr.includes('critical')) return 'CRITICAL';
  if (severityStr === '2' || severityStr.includes('major') || severityStr.includes('trouble')) return 'MAJOR';
  if (severityStr === '3' || severityStr.includes('minor') || severityStr.includes('attention')) return 'MINOR';
  if (severityStr === '4' || severityStr.includes('warning') || severityStr.includes('warn')) return 'WARNING';
  if (severityStr === '5' || severityStr.includes('info') || severityStr.includes('ok') || severityStr.includes('clear')) return 'INFO';
  
  return 'WARNING';
}

async function fullSync() {
  try {
    // 验证环境配置
    console.log('🔍 验证环境配置...\n');
    const config = {
      baseUrl: process.env.OPMANAGER_BASE_URL,
      apiKey: process.env.OPMANAGER_API_KEY,
      useMock: process.env.USE_MOCK_DATA,
      database: process.env.DATABASE_URL?.split('@')[1]?.split('?')[0],
    };

    console.log('📋 环境配置:');
    console.log(`   OpManager URL: ${config.baseUrl}`);
    console.log(`   API Key: ${config.apiKey?.substring(0, 10)}...`);
    console.log(`   USE_MOCK_DATA: ${config.useMock || 'false'}`);
    console.log(`   Database: ${config.database}`);
    console.log('');

    if (config.useMock === 'true') {
      console.error('❌ 错误: USE_MOCK_DATA 设置为 true');
      console.error('   请在 .env.local 中设置 USE_MOCK_DATA=false');
      process.exit(1);
    }

    if (!config.baseUrl || !config.apiKey) {
      console.error('❌ 错误: 缺少必需的环境变量');
      console.error('   请确保 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY 已配置');
      process.exit(1);
    }

    console.log('✅ 环境配置验证通过\n');

    // 动态导入模块
    const { opClient } = await import('../src/services/opmanager/client');
    const { prisma } = await import('../src/lib/prisma');

    const stats = {
      devices: 0,
      interfaces: 0,
      alarms: 0,
      businessViews: 0,
      startTime: Date.now(),
    };

    // ========================================
    // 步骤 1: 同步设备
    // ========================================
    console.log('=' .repeat(80));
    console.log('步骤 1/4: 同步设备数据');
    console.log('='.repeat(80) + '\n');

    console.log('📡 从 OpManager 获取设备列表...');
    const devicesResponse = await opClient.getDevicesPage({ rows: 500 });
    console.log(`   ✅ 获取到 ${devicesResponse.devices.length} 个设备\n`);

    console.log('💾 同步设备到数据库...');
    for (const device of devicesResponse.devices) {
      try {
        // 获取实际的状态字段（优先使用 statusStr）
        const actualStatus = (device as any).statusStr || device.status || '';
        
        // 智能判断监控状态
        // 如果 isManaged 未定义，根据 status 判断：能获取到非 UnManaged 的状态说明在监控中
        const opIsManagedRaw = (device as any).isManaged;
        const isMonitored = opIsManagedRaw === undefined
          ? (actualStatus.toLowerCase() !== 'unmanaged')
          : (String(opIsManagedRaw).toLowerCase() === 'true');
        
        const deviceData = {
          name: device.name || device.displayName || device.ipAddress,
          displayName: device.displayName || device.name,
          opmanagerId: device.name || device.ipAddress,
          type: mapDeviceType(device.type) as any,
          status: mapDeviceStatus(actualStatus) as any,  // 使用 actualStatus
          category: device.category || 'Uncategorized',
          ipAddress: device.ipAddress,
          vendor: device.vendorName,
          availability: device.availability || 0,
          isMonitored,
          tags: device.tags ? (Array.isArray(device.tags) ? device.tags : [device.tags]) : [],
          lastSyncAt: new Date(),
        };

        await prisma.device.upsert({
          where: { opmanagerId: deviceData.opmanagerId },
          update: deviceData,
          create: deviceData,
        });

        stats.devices++;
        if (stats.devices % 10 === 0) {
          process.stdout.write(`   处理进度: ${stats.devices}/${devicesResponse.devices.length}\r`);
        }
      } catch (error: any) {
        console.error(`   ⚠️  设备同步失败: ${device.name} - ${error.message}`);
      }
    }

    console.log(`   ✅ 成功同步 ${stats.devices}/${devicesResponse.devices.length} 个设备\n`);

    // ========================================
    // 步骤 2: 同步接口数据
    // ========================================
    console.log('='.repeat(80));
    console.log('步骤 2/4: 同步接口数据');
    console.log('='.repeat(80) + '\n');

    console.log('📡 获取已同步的设备列表...');
    const syncedDevices = await prisma.device.findMany({
      select: {
        id: true,
        name: true,
        ipAddress: true,
        opmanagerId: true,
      },
      where: {
        isMonitored: true, // 仅同步已监控的设备接口
      },
    });
    console.log(`   ✅ 找到 ${syncedDevices.length} 个已监控设备\n`);

    console.log('💾 同步设备接口...');
    let processedDevices = 0;

    for (const device of syncedDevices) {
      try {
        const interfaces = await opClient.getInterfaces({
          deviceIpAddress: device.ipAddress,
        });

        if (interfaces.length === 0) {
          processedDevices++;
          continue;
        }

        for (const iface of interfaces) {
          try {
            const ifaceData = {
              deviceId: device.id,
              opmanagerId: `${device.opmanagerId}_${iface.ifIndex || iface.id}`,
              name: iface.name || '',
              displayName: iface.displayName || iface.name,
              type: iface.type || 'ETHERNET',
              status: (iface.status?.toUpperCase() === 'UP' ? 'UP' : 
                       iface.status?.toUpperCase() === 'DOWN' ? 'DOWN' : 'UNKNOWN') as any,
              ipAddress: iface.ipAddress,
              macAddress: iface.macAddress,
              ifIndex: iface.ifIndex ? parseInt(String(iface.ifIndex), 10) : undefined,
              speed: iface.inSpeed ? BigInt(iface.inSpeed) : undefined,
              lastSyncAt: new Date(),
            };

            await prisma.interface.upsert({
              where: { opmanagerId: ifaceData.opmanagerId },
              update: ifaceData,
              create: ifaceData,
            });

            stats.interfaces++;
          } catch (error: any) {
            // 接口同步失败不影响整体流程
          }
        }

        processedDevices++;
        process.stdout.write(`   处理进度: ${processedDevices}/${syncedDevices.length} 设备 (${stats.interfaces} 个接口)\r`);
      } catch (error: any) {
        console.error(`   ⚠️  设备 ${device.name} 接口同步失败: ${error.message}`);
        processedDevices++;
      }
    }

    console.log(`\n   ✅ 成功同步 ${stats.interfaces} 个接口\n`);

    // ========================================
    // 步骤 3: 同步告警
    // ========================================
    console.log('='.repeat(80));
    console.log('步骤 3/4: 同步告警数据');
    console.log('='.repeat(80) + '\n');

    console.log('📡 从 OpManager 获取告警列表...');
    const alarms = await opClient.getAlarms();
    console.log(`   ✅ 获取到 ${alarms.length} 个告警\n`);

    console.log('💾 同步告警到数据库...');
    for (const alarm of alarms) {
      try {
        // 查找对应的设备
        const device = await prisma.device.findFirst({
          where: {
            OR: [
              { name: alarm.name },
              { opmanagerId: alarm.name },
              { displayName: { contains: alarm.name, mode: 'insensitive' } },
              { ipAddress: alarm.name },
            ],
          },
          select: { id: true },
        });

        if (!device) {
          // 设备不存在，跳过此告警
          continue;
        }

        const alarmData = {
          deviceId: device.id,
          opmanagerId: alarm.id,
          severity: mapAlarmSeverity(alarm.severity) as any,
          category: alarm.category || 'Unknown',
          title: alarm.message?.substring(0, 200) || 'Unknown Alarm',
          message: alarm.message || '',
          status: 'ACTIVE' as any,
          occurredAt: alarm.modTime ? new Date(alarm.modTime) : new Date(),
          lastOccurrence: new Date(),
        };

        // 检查告警是否已存在
        const existingAlarm = await prisma.alarm.findFirst({
          where: {
            deviceId: device.id,
            opmanagerId: alarm.id,
          },
        });

        if (existingAlarm) {
          // 更新现有告警
          await prisma.alarm.update({
            where: { id: existingAlarm.id },
            data: {
              ...alarmData,
              occurrenceCount: existingAlarm.occurrenceCount + 1,
              lastOccurrence: new Date(),
            },
          });
        } else {
          // 创建新告警
          await prisma.alarm.create({
            data: alarmData,
          });
        }

        stats.alarms++;
        if (stats.alarms % 20 === 0) {
          process.stdout.write(`   处理进度: ${stats.alarms}/${alarms.length}\r`);
        }
      } catch (error: any) {
        // 告警同步失败不影响整体流程
      }
    }

    console.log(`   ✅ 成功同步 ${stats.alarms}/${alarms.length} 个告警\n`);

    // ========================================
    // 步骤 4: 同步 Business View
    // ========================================
    console.log('='.repeat(80));
    console.log('步骤 4/4: 同步 Business View');
    console.log('='.repeat(80) + '\n');

    console.log('📡 从 OpManager 获取 Business View 列表...');
    const bvResponse = await opClient.getBusinessView();

    if (bvResponse?.BusinessView?.Details) {
      const businessViews = bvResponse.BusinessView.Details;
      console.log(`   ✅ 获取到 ${businessViews.length} 个 Business View\n`);

      console.log('💾 同步 Business View 配置...');
      for (const bv of businessViews) {
        try {
          const bvName = bv.name?.replace('_bv', '') || bv.displayName;

          await prisma.businessViewConfig.upsert({
            where: { name: bvName },
            update: {
              displayName: bv.displayName || bvName,
              isActive: true,
            },
            create: {
              name: bvName,
              displayName: bv.displayName || bvName,
              isActive: true,
            },
          });

          stats.businessViews++;
        } catch (error: any) {
          console.error(`   ⚠️  Business View 同步失败: ${bv.name}`);
        }
      }

      console.log(`   ✅ 成功同步 ${stats.businessViews} 个 Business View\n`);
    } else {
      console.log('   ℹ️  当前 OpManager 没有 Business View 数据\n');
    }

    // ========================================
    // 同步完成
    // ========================================
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

    console.log('='.repeat(80));
    console.log('✅ 完整同步完成！');
    console.log('='.repeat(80) + '\n');

    console.log('📊 同步统计:');
    console.log(`   设备: ${stats.devices}`);
    console.log(`   接口: ${stats.interfaces}`);
    console.log(`   告警: ${stats.alarms}`);
    console.log(`   Business View: ${stats.businessViews}`);
    console.log(`   总耗时: ${duration} 秒`);
    console.log('');

    // 验证数据
    console.log('🔍 验证数据完整性...\n');
    const dbStats = {
      devices: await prisma.device.count(),
      interfaces: await prisma.interface.count(),
      alarms: await prisma.alarm.count({ where: { status: 'ACTIVE' } }),
      businessViews: await prisma.businessViewConfig.count(),
    };

    console.log('📊 数据库统计:');
    console.log(`   设备总数: ${dbStats.devices}`);
    console.log(`   接口总数: ${dbStats.interfaces}`);
    console.log(`   活动告警: ${dbStats.alarms}`);
    console.log(`   Business View: ${dbStats.businessViews}`);
    console.log('');

    console.log('💡 下一步:');
    console.log('   1. 运行验证脚本: npx tsx scripts/verify-production-setup.ts');
    console.log('   2. 启动采集服务: npm run collector');
    console.log('   3. 启动前端服务: npm run dev');
    console.log('');

    await prisma.$disconnect();

  } catch (error: any) {
    console.error('\n❌ 同步失败:');
    console.error(`   错误信息: ${error.message}`);
    console.error(`   错误堆栈:\n${error.stack}`);
    process.exit(1);
  }
}

fullSync().catch(console.error);
