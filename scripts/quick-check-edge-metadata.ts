/**
 * 快速检查边的 metadata 中是否有流量数据
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck(bvName: string = 'TEST2') {
  console.log('🔍 快速检查边的 metadata 流量数据');
  console.log('─'.repeat(60));

  const edges = await prisma.topologyEdge.findMany({
    where: { viewName: bvName },
    take: 3 // 只看前3条
  });

  if (edges.length === 0) {
    console.log('❌ 没有找到边数据，请先同步拓扑');
    return;
  }

  edges.forEach((edge: any, index: number) => {
    const metadata = edge.metadata as any;
    console.log(`\n边 ${index + 1}: ${edge.sourceId} → ${edge.targetId}`);
    console.log(`  InTraffic: ${metadata?.InTraffic || '❌ 无数据'}`);
    console.log(`  OutTraffic: ${metadata?.OutTraffic || '❌ 无数据'}`);
    console.log(`  status: ${metadata?.status || '❌ 无数据'}`);
  });

  const withTraffic = edges.filter((e: any) => {
    const metadata = e.metadata as any;
    return metadata?.InTraffic || metadata?.OutTraffic;
  }).length;

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 结果: ${withTraffic}/${edges.length} 条边有流量数据`);

  if (withTraffic === edges.length) {
    console.log('✅ 所有边都有流量数据！');
    console.log('💡 直接刷新 Dashboard 即可看到连线流量');
  } else {
    console.log('⚠️  部分边缺少流量数据');
    console.log('💡 建议运行: npm run sync:bv-safe TEST2');
  }

  await prisma.$disconnect();
}

quickCheck('TEST2').catch(console.error);
