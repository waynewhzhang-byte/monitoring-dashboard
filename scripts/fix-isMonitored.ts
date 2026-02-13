#!/usr/bin/env ts-node

/**
 * 修复设备的isMonitored字段
 * 
 * 用法:
 *   npm run fix:isMonitored          # 将所有设备设置为isMonitored=true
 *   npm run fix:isMonitored -- --keep-false  # 只显示当前状态，不修改
 */

// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';

// 优先加载 .env.local，如果不存在则加载 .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '@/lib/prisma';

async function fixIsMonitored() {
    const args = process.argv.slice(2);
    const keepFalse = args.includes('--keep-false');
    
    console.log('🔧 修复设备isMonitored字段\n');
    
    try {
        // 检查当前状态
        const totalDevices = await prisma.device.count();
        const monitoredDevices = await prisma.device.count({
            where: { isMonitored: true }
        });
        const unmonitoredDevices = await prisma.device.count({
            where: { isMonitored: false }
        });
        
        console.log('📊 当前状态：');
        console.log(`  总设备数: ${totalDevices}`);
        console.log(`  监控设备 (isMonitored=true): ${monitoredDevices}`);
        console.log(`  未监控设备 (isMonitored=false): ${unmonitoredDevices}\n`);
        
        if (keepFalse) {
            console.log('ℹ️  --keep-false 模式：只显示状态，不修改数据');
            return;
        }
        
        if (unmonitoredDevices === 0) {
            console.log('✅ 所有设备都已经是监控状态，无需修复');
            return;
        }
        
        // 更新所有设备为isMonitored=true
        console.log(`🔄 正在将 ${unmonitoredDevices} 个设备设置为监控状态...`);
        
        const result = await prisma.device.updateMany({
            where: { isMonitored: false },
            data: { isMonitored: true }
        });
        
        console.log(`✅ 成功更新 ${result.count} 个设备\n`);
        
        // 验证结果
        const newMonitoredCount = await prisma.device.count({
            where: { isMonitored: true }
        });
        
        console.log('📊 更新后状态：');
        console.log(`  监控设备 (isMonitored=true): ${newMonitoredCount}`);
        console.log(`  未监控设备 (isMonitored=false): ${totalDevices - newMonitoredCount}\n`);
        
        if (newMonitoredCount === totalDevices) {
            console.log('✅ 所有设备现在都是监控状态！');
            console.log('📌 接下来：');
            console.log('   1. Collector将开始收集这些设备的指标');
            console.log('   2. Dashboard API将显示这些设备');
            console.log('   3. 等待1-2分钟后，Dashboard应该会显示数据');
        }
        
    } catch (error: any) {
        console.error('❌ 修复失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixIsMonitored().then(async () => {
    await prisma.$disconnect();
    process.exit(0);
}).catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
