import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    console.log('🔍 检查 TopologyEdge metadata 中的接口关联信息\n');

    const edges = await prisma.topologyEdge.findMany({
        where: { viewName: '新的业务视图' },
        select: { id: true, label: true, interfaceId: true, metadata: true }
    });

    console.log(`找到 ${edges.length} 条边\n`);
    console.log('='.repeat(80));

    for (let i = 0; i < Math.min(3, edges.length); i++) {
        const edge = edges[i];
        const meta = edge.metadata as any;

        console.log(`\n边 ${i + 1}: ${edge.label}`);
        console.log(`  interfaceId: ${edge.interfaceId || '未关联'}`);
        console.log(`\n  metadata 关键字段:`);
        console.log(`    objName: ${meta?.objName}`);
        console.log(`    name: ${meta?.name}`);
        console.log(`    desc: ${meta?.desc}`);
        console.log(`    parentName: ${meta?.parentName}`);
        console.log(`    ifName: ${meta?.ifName}`);
        console.log(`    intfDisplayName: ${meta?.intfDisplayName}`);
        console.log(`    InTraffic: ${meta?.InTraffic}`);
        console.log(`    OutTraffic: ${meta?.OutTraffic}`);
        console.log('='.repeat(80));
    }

    // 收集所有 objName 和 desc
    const objNames = edges.map(e => (e.metadata as any)?.objName).filter(Boolean);
    const descs = edges.map(e => (e.metadata as any)?.desc).filter(Boolean);

    console.log(`\n所有边的 objName (${objNames.length} 个):`);
    objNames.forEach(name => console.log(`  - ${name}`));

    console.log(`\n所有边的 desc (${descs.length} 个):`);
    descs.forEach(desc => console.log(`  - ${desc}`));

    // 查询 Interface 表，看看有哪些 opmanagerId
    const interfaces = await prisma.interface.findMany({
        select: { id: true, opmanagerId: true, name: true, displayName: true, tags: true }
    });

    console.log(`\n\n数据库中的接口 (${interfaces.length} 个):`);
    console.log('='.repeat(80));

    const taggedInterfaces = interfaces.filter(i => i.tags.length > 0);
    console.log(`\n有标签的接口 (${taggedInterfaces.length} 个):`);
    taggedInterfaces.forEach(intf => {
        console.log(`  opmanagerId: ${intf.opmanagerId}`);
        console.log(`  name: ${intf.name}`);
        console.log(`  displayName: ${intf.displayName}`);
        console.log(`  tags: ${intf.tags.join(', ')}`);
        console.log('');
    });

    // 尝试匹配
    console.log('\n尝试匹配 objName 和 opmanagerId:');
    console.log('='.repeat(80));
    let matchCount = 0;
    for (const objName of objNames) {
        const matched = interfaces.find(i => i.opmanagerId === objName);
        if (matched) {
            console.log(`✅ ${objName} → ${matched.name} (${matched.displayName})`);
            matchCount++;
        } else {
            console.log(`❌ ${objName} → 无匹配`);
        }
    }
    console.log(`\n匹配结果: ${matchCount}/${objNames.length} 条边可以关联到接口`);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
