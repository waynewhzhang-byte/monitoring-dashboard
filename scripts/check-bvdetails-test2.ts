#!/usr/bin/env tsx
/**
 * 诊断脚本：检查 OpManager getBVDetails API 返回的 TEST2 数据
 *
 * 用途：验证 OpManager 实际返回了多少个设备对象和链接
 */

// ⚠️ 必须在最开始加载环境变量
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 尝试加载环境变量文件（优先级：.env.local > .env）
const possibleEnvFiles = ['.env.local', '.env'];
let loadedEnvFile = '';

for (const file of possibleEnvFiles) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        loadedEnvFile = envPath;
        console.log(`✅ 加载环境变量从: ${envPath}`);
        break;
    }
}

if (!loadedEnvFile) {
    console.error('❌ 未找到环境变量文件 (.env.local 或 .env)');
    process.exit(1);
}

// 验证关键环境变量
const requiredVars = ['DATABASE_URL', 'OPMANAGER_BASE_URL', 'OPMANAGER_API_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ 缺少必需的环境变量: ${missingVars.join(', ')}`);
    console.error(`请检查文件: ${loadedEnvFile}`);
    process.exit(1);
}

console.log(`✅ 环境变量验证通过\n`);

import { opClient } from '../src/services/opmanager/client';
import { prisma } from '../src/lib/prisma';

async function checkBVDetails() {
    console.log('\n=== 诊断 TEST2 业务视图 ===\n');

    try {
        // 1. 直接调用 OpManager getBVDetails API
        console.log('📡 调用 OpManager getBVDetails API for TEST2...');
        const bvData = await opClient.getBVDetails('TEST2');

        if (!bvData) {
            console.error('❌ getBVDetails 返回空数据');
            return;
        }

        console.log('\n✅ getBVDetails 返回数据:');
        console.log(`   - deviceProperties 数量: ${bvData.deviceProperties?.length || 0}`);
        console.log(`   - linkProperties 数量: ${bvData.linkProperties?.length || 0}`);

        // 2. 显示设备详情
        if (bvData.deviceProperties && bvData.deviceProperties.length > 0) {
            console.log('\n📋 设备列表 (deviceProperties):');
            bvData.deviceProperties.forEach((dev: any, index: number) => {
                console.log(`   ${index + 1}. ${dev.label || dev.displayName || dev.objName || dev.name}`);
                console.log(`      - objName: ${dev.objName}`);
                console.log(`      - type: ${dev.type}`);
                console.log(`      - position: (${dev.x}, ${dev.y})`);
            });
        }

        // 3. 显示链接详情
        if (bvData.linkProperties && bvData.linkProperties.length > 0) {
            console.log('\n🔗 链接列表 (linkProperties):');
            bvData.linkProperties.forEach((link: any, index: number) => {
                console.log(`   ${index + 1}. ${link.source} → ${link.dest}`);
                console.log(`      - name: ${link.name}`);
                console.log(`      - interface: ${link.intfDisplayName || link.ifName || 'N/A'}`);
            });
        }

        // 4. 检查数据库中 TEST2 的数据
        console.log('\n\n=== 数据库中 TEST2 的数据 ===\n');

        const dbNodes = await prisma.topologyNode.findMany({
            where: { viewName: 'TEST2' },
            select: { id: true, label: true, type: true }
        });

        const dbEdges = await prisma.topologyEdge.findMany({
            where: { viewName: 'TEST2' },
            select: { id: true, sourceId: true, targetId: true }
        });

        console.log(`📊 数据库统计:`);
        console.log(`   - TopologyNode 数量: ${dbNodes.length}`);
        console.log(`   - TopologyEdge 数量: ${dbEdges.length}`);

        if (dbNodes.length > 0) {
            console.log('\n📋 数据库节点列表:');
            dbNodes.forEach((node, index) => {
                console.log(`   ${index + 1}. ${node.label} (${node.type})`);
                console.log(`      - ID: ${node.id}`);
            });
        }

        // 5. 对比分析
        console.log('\n\n=== 对比分析 ===\n');

        const apiDeviceCount = bvData.deviceProperties?.length || 0;
        const apiLinkCount = bvData.linkProperties?.length || 0;
        const dbNodeCount = dbNodes.length;
        const dbEdgeCount = dbEdges.length;

        console.log(`API 返回: ${apiDeviceCount} 个设备, ${apiLinkCount} 个链接`);
        console.log(`数据库中: ${dbNodeCount} 个节点, ${dbEdgeCount} 个边`);

        if (apiDeviceCount !== dbNodeCount) {
            console.log(`\n⚠️  数据不一致！`);
            console.log(`   - API 应该有 ${apiDeviceCount} 个设备`);
            console.log(`   - 数据库实际有 ${dbNodeCount} 个节点`);
            console.log(`   - 差异: ${Math.abs(apiDeviceCount - dbNodeCount)} 个对象`);
            console.log('\n建议操作:');
            console.log('   1. 运行同步命令清理数据库:');
            console.log('      npm run collector');
            console.log('   2. 或手动同步 TEST2:');
            console.log('      curl -X POST http://localhost:3000/api/topology/sync -H "Content-Type: application/json" -d \'{"bvName":"TEST2"}\'');
        } else {
            console.log('\n✅ 数据一致！API 和数据库的数量匹配。');
        }

    } catch (error) {
        console.error('❌ 诊断失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBVDetails().catch(console.error);
