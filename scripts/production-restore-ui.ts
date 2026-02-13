
/**
 * 生产环境大屏 UI 一键恢复脚本
 * 功能：自动探测业务视图 -> 初始化数据库配置 -> 强制同步拓扑
 * 用法: ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/production-restore-ui.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { opClient } from '../src/services/opmanager/client';
import { TopologyCollector } from '../src/services/collector/topology';
import axios from 'axios';
import https from 'https';

async function restoreUI() {
    console.log('\n' + '='.repeat(60));
    console.log('🎨  生产环境大屏 UI 恢复启动');
    console.log('='.repeat(60) + '\n');

    const baseUrl = process.env.OPMANAGER_BASE_URL;
    const apiKey = process.env.OPMANAGER_API_KEY;

    if (!baseUrl || !apiKey) {
        console.error('❌ 错误: 未找到 OpManager 配置');
        return;
    }

    // --- 步骤 1: 探测业务视图 ---
    console.log('【1/3】正在探测 OpManager 中的业务视图 (Business View Discovery)...');

    let discoveredViews: Array<{ name: string, displayName: string }> = [];

    try {
        const instance = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const response = await instance.get('/api/json/businessview/getBusinessViews', {
            params: { apiKey }
        });

        if (Array.isArray(response.data)) {
            discoveredViews = response.data.map((bv: any) => ({
                name: bv.name,
                displayName: bv.displayName || bv.name
            }));
        } else if (response.data && response.data.result && Array.isArray(response.data.result)) {
            discoveredViews = response.data.result.map((bv: any) => ({
                name: bv.name,
                displayName: bv.displayName || bv.name
            }));
        }
    } catch (e: any) {
        console.warn(`⚠️  API 探测视图失败: ${e.message}`);
    }

    // 如果 API 没找到，尝试默认名称
    if (discoveredViews.length === 0) {
        console.log('ℹ️  未探测到特定视图，将尝试使用系统默认名称 "核心业务视图"...');
        discoveredViews.push({ name: '核心业务视图', displayName: '核心业务视图' });
    } else {
        console.log(`✅ 已发现 ${discoveredViews.length} 个业务视图:`);
        discoveredViews.forEach(v => console.log(`   - ${v.displayName} (内部名称: ${v.name})`));
    }

    // --- 步骤 2: 初始化数据库配置 ---
    console.log('\n【2/3】正在初始化数据库配置 (BusinessViewConfig)...');

    for (const view of discoveredViews) {
        await prisma.businessViewConfig.upsert({
            where: { name: view.name },
            update: { isActive: true },
            create: {
                name: view.name,
                displayName: view.displayName,
                isActive: true
            }
        });
        console.log(`✅ 已启用视图配置: ${view.displayName}`);
    }

    // --- 步骤 3: 强制同步拓扑 ---
    console.log('\n【3/3】正在启动拓扑数据同步 (Topology Synchronization)...');

    const topologyCollector = new TopologyCollector();

    for (const view of discoveredViews) {
        console.log(`🔄 正在同步拓扑: ${view.displayName}...`);
        try {
            const result = await topologyCollector.syncBusinessView(view.name);
            console.log(`✅ 同步完成: 节点 ${result.nodes}, 连线 ${result.edges}`);
        } catch (error: any) {
            console.error(`❌ 同步 ${view.name} 失败: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉  UI 恢复尝试完成！');
    console.log('👉  请刷新大屏页面查看效果。');
    console.log('='.repeat(60) + '\n');
}

restoreUI().catch(console.error).finally(() => prisma.$disconnect());
