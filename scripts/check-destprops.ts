import { prisma } from '@/lib/prisma';

async function checkDestProps() {
  const edges = await prisma.topologyEdge.findMany({
    where: { viewName: 'TEST2' },
    select: {
      id: true,
      label: true,
      sourceId: true,
      targetId: true,
      metadata: true
    }
  });

  console.log(`\n🔍 Checking for destProps in ${edges.length} edges\n`);
  console.log('='.repeat(80));

  let hasDestPropsCount = 0;

  edges.forEach((edge, i) => {
    const meta = edge.metadata as any;

    if (meta?.destProps) {
      hasDestPropsCount++;
      console.log(`\n✅ Edge ${i + 1} HAS destProps: ${edge.label}`);
      console.log(`  Source → Target: ${edge.sourceId} → ${edge.targetId}`);
      console.log(`\n  Source Interface (${meta.objName}):`);
      console.log(`    InTraffic: ${meta.InTraffic}`);
      console.log(`    OutTraffic: ${meta.OutTraffic}`);
      console.log(`\n  Destination Props:`);
      console.log(`    ifName: ${meta.destProps.ifName}`);
      console.log(`    intfDisplayName: ${meta.destProps.intfDisplayName}`);
      console.log(`    InTraffic: ${meta.destProps.InTraffic}`);
      console.log(`    OutTraffic: ${meta.destProps.OutTraffic}`);
      console.log(`    InUtil: ${meta.destProps.InUtil}`);
      console.log(`    OutUtil: ${meta.destProps.OutUtil}`);
      console.log(`    status: ${meta.destProps.status}`);
      console.log('='.repeat(80));
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`  Total edges: ${edges.length}`);
  console.log(`  Edges with destProps: ${hasDestPropsCount}`);
  console.log(`  Edges without destProps: ${edges.length - hasDestPropsCount}`);

  if (hasDestPropsCount === 0) {
    console.log(`\n⚠️  No edges have destProps data.`);
    console.log(`   This means OpManager getBVDetails does not provide per-link traffic.`);
    console.log(`   All links from the same interface will show the same traffic values.`);
  }
}

checkDestProps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
