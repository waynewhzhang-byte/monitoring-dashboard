import { prisma } from '@/lib/prisma';

async function checkEdgeTraffic() {
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

  console.log(`✅ Found ${edges.length} edges in TEST2\n`);
  console.log('='.repeat(80));

  edges.forEach((edge, i) => {
    const meta = edge.metadata as any;
    console.log(`\nEdge ${i + 1}: ${edge.label}`);
    console.log(`  Source → Target: ${edge.sourceId} → ${edge.targetId}`);
    console.log(`  metadata.objName: ${meta?.objName}`);
    console.log(`  metadata.InTraffic: ${meta?.InTraffic}`);
    console.log(`  metadata.OutTraffic: ${meta?.OutTraffic}`);
    console.log(`  metadata.InUtil: ${meta?.InUtil}`);
    console.log(`  metadata.OutUtil: ${meta?.OutUtil}`);

    if (meta?.destProps) {
      console.log(`  ⚠️ destProps found:`);
      console.log(`    destProps.InTraffic: ${meta.destProps.InTraffic}`);
      console.log(`    destProps.OutTraffic: ${meta.destProps.OutTraffic}`);
    }
    console.log('='.repeat(80));
  });

  // Check for duplicate traffic values
  const trafficValues = edges.map(e => {
    const meta = e.metadata as any;
    return `${meta?.InTraffic} / ${meta?.OutTraffic}`;
  });

  const uniqueTraffic = new Set(trafficValues);
  console.log(`\n📊 Traffic Value Summary:`);
  console.log(`  Total edges: ${edges.length}`);
  console.log(`  Unique traffic values: ${uniqueTraffic.size}`);
  console.log(`\n  Traffic values:`);
  uniqueTraffic.forEach(v => {
    const count = trafficValues.filter(tv => tv === v).length;
    console.log(`    ${v} (${count} edges)`);
  });
}

checkEdgeTraffic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
