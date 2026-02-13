/**
 * 调试脚本：比较数据库存储的边数据与 API 返回的原始数据
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const bvName = process.argv[2] || 'TEST2';

    console.log('='.repeat(80));
    console.log(`📊 数据库中 ${bvName} 的边数据`);
    console.log('='.repeat(80));
    console.log('');

    try {
        const edges = await prisma.topologyEdge.findMany({
            where: { viewName: bvName },
            orderBy: { id: 'asc' }
        });

        console.log(`找到 ${edges.length} 条边`);
        console.log('');

        if (edges.length === 0) {
            console.log('❌ 没有找到边数据，请先同步拓扑');
            return;
        }

        // 显示每条边的流量数据
        edges.forEach((edge, index) => {
            const metadata = edge.metadata as any;

            console.log(`边 ${index + 1}: ${edge.sourceId} → ${edge.targetId}`);
            console.log('─'.repeat(60));
            console.log(`   ID: ${edge.id}`);
            console.log(`   Label: ${edge.label}`);

            // 流量数据
            const inTraffic = metadata?.InTraffic ?? metadata?.destProps?.InTraffic ?? 'N/A';
            const outTraffic = metadata?.OutTraffic ?? metadata?.destProps?.OutTraffic ?? 'N/A';

            console.log(`   InTraffic (from metadata): ${inTraffic}`);
            console.log(`   OutTraffic (from metadata): ${outTraffic}`);
            console.log(`   metadata.InTraffic exists: ${metadata?.InTraffic !== undefined}`);
            console.log(`   metadata.OutTraffic exists: ${metadata?.OutTraffic !== undefined}`);
            console.log(`   metadata keys: ${Object.keys(metadata || {}).join(', ')}`);
            console.log('');
        });

        // 统计唯一流量值
        console.log('='.repeat(80));
        console.log('📊 唯一流量值统计:');
        console.log('='.repeat(80));

        const inValues = edges.map(e => {
            const m = e.metadata as any;
            return m?.InTraffic ?? m?.destProps?.InTraffic ?? 'N/A';
        });

        const outValues = edges.map(e => {
            const m = e.metadata as any;
            return m?.OutTraffic ?? m?.destProps?.OutTraffic ?? 'N/A';
        });

        const uniqueIn = [...new Set(inValues)];
        const uniqueOut = [...new Set(outValues)];

        console.log(`InTraffic 唯一值: ${uniqueIn.join(', ')}`);
        console.log(`OutTraffic 唯一值: ${uniqueOut.join(', ')}`);
        console.log('');

        // 显示第一条边的完整 metadata
        console.log('='.repeat(80));
        console.log('📄 第一条边的完整 metadata:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(edges[0].metadata, null, 2));

    } catch (error: any) {
        console.error('❌ 查询失败:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
