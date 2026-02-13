#!/usr/bin/env ts-node

/**
 * 检查OpManager返回的isManaged字段
 * 用于诊断为什么设备的isMonitored都是false
 */

// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
import { resolve } from 'path';

// 优先加载 .env.local，如果不存在则加载 .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { opClient } from '@/services/opmanager/client';

async function checkIsManaged() {
    console.log('🔍 检查OpManager返回的isManaged字段...\n');
    
    try {
        // 获取前10个设备
        const devices = await opClient.getDevices({ page: 1, rows: 10 });
        
        console.log(`📊 获取到 ${devices.length} 个设备\n`);
        console.log('设备isManaged字段详情：');
        console.log('='.repeat(80));
        
        let trueCount = 0;
        let falseCount = 0;
        let undefinedCount = 0;
        const samples: any[] = [];
        
        for (let i = 0; i < Math.min(devices.length, 10); i++) {
            const dev = devices[i] as any;
            const isManaged = dev.isManaged;
            const isManagedType = typeof isManaged;
            const isManagedValue = isManaged;
            
            samples.push({
                name: dev.name || dev.deviceName,
                displayName: dev.displayName,
                isManaged: isManagedValue,
                isManagedType: isManagedType,
                isManagedString: String(isManagedValue),
                isManagedTrue: isManaged === 'true' || isManaged === true,
                // 检查其他可能的字段
                isMonitored: dev.isMonitored,
                managed: dev.managed,
            });
            
            if (isManaged === 'true' || isManaged === true) {
                trueCount++;
            } else if (isManaged === 'false' || isManaged === false) {
                falseCount++;
            } else {
                undefinedCount++;
            }
        }
        
        // 打印详细信息
        samples.forEach((sample, index) => {
            console.log(`\n设备 ${index + 1}: ${sample.name || sample.displayName}`);
            console.log(`  isManaged 值: ${JSON.stringify(sample.isManaged)} (类型: ${sample.isManagedType})`);
            console.log(`  isManaged 字符串: "${sample.isManagedString}"`);
            console.log(`  判断为true: ${sample.isManagedTrue}`);
            if (sample.isMonitored !== undefined) {
                console.log(`  isMonitored: ${sample.isMonitored}`);
            }
            if (sample.managed !== undefined) {
                console.log(`  managed: ${sample.managed}`);
            }
            
            // 打印所有字段（用于调试）
            const dev = devices[index] as any;
            const relevantFields = Object.keys(dev).filter(key => 
                key.toLowerCase().includes('managed') || 
                key.toLowerCase().includes('monitor')
            );
            if (relevantFields.length > 0) {
                console.log(`  相关字段: ${relevantFields.join(', ')}`);
                relevantFields.forEach(field => {
                    console.log(`    ${field}: ${JSON.stringify(dev[field])} (${typeof dev[field]})`);
                });
            }
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 统计结果：');
        console.log(`  isManaged=true: ${trueCount} 个设备`);
        console.log(`  isManaged=false: ${falseCount} 个设备`);
        console.log(`  isManaged=undefined/null: ${undefinedCount} 个设备`);
        
        console.log('\n💡 结论：');
        if (trueCount === 0) {
            console.log('  ❌ 所有设备的isManaged都不是true');
            console.log('  📌 这就是为什么所有设备的isMonitored都是false的原因');
            console.log('  💡 解决方案：');
            console.log('     1. 如果希望监控所有设备，可以使用批量更新脚本');
            console.log('     2. 或者修改同步逻辑，默认所有设备都监控');
        } else {
            console.log(`  ✅ 有 ${trueCount} 个设备的isManaged是true`);
            console.log('  ⚠️  如果数据库中isMonitored都是false，可能是同步时的问题');
        }
        
    } catch (error: any) {
        console.error('❌ 检查失败:', error.message);
        console.error(error.stack);
    }
}

checkIsManaged().then(() => {
    process.exit(0);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
