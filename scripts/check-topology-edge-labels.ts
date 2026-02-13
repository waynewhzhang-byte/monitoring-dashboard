/**
 * 检查拓扑 API 返回的边数据是否包含流量标签
 */

async function checkTopologyEdgeLabels() {
  const bvName = process.argv[2] || 'TEST2';

  console.log(`\n🔍 检查业务视图 "${bvName}" 的拓扑边标签...\n`);

  try {
    const response = await fetch(`http://localhost:3000/api/topology?bvName=${encodeURIComponent(bvName)}`);

    if (!response.ok) {
      console.error(`❌ API 请求失败: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    console.log(`✅ 获取到拓扑数据:`);
    console.log(`   - 节点数: ${data.nodes?.length || 0}`);
    console.log(`   - 边数: ${data.edges?.length || 0}\n`);

    if (!data.edges || data.edges.length === 0) {
      console.log('⚠️  没有边数据');
      return;
    }

    console.log('📊 边的流量标签详情:\n');

    data.edges.forEach((edge: any, index: number) => {
      console.log(`${index + 1}. 边 ID: ${edge.id}`);
      console.log(`   Source: ${edge.source}`);
      console.log(`   Target: ${edge.target}`);
      console.log(`   Label: ${edge.label || '(无标签)'}`);
      console.log(`   Animated: ${edge.animated ? '是' : '否'}`);
      console.log(`   Style: ${JSON.stringify(edge.style || {})}`);

      if (edge.data) {
        console.log(`   Data:`);
        console.log(`     - status: ${edge.data.status || '(无)'}`);
        console.log(`     - inTraffic: ${edge.data.inTraffic || '(无)'}`);
        console.log(`     - outTraffic: ${edge.data.outTraffic || '(无)'}`);
        console.log(`     - utilization: ${edge.data.utilization || '(无)'}`);
      }
      console.log('');
    });

    // 统计有/无标签的边
    const withLabel = data.edges.filter((e: any) => e.label && e.label !== '—').length;
    const withoutLabel = data.edges.length - withLabel;

    console.log('\n📈 统计:');
    console.log(`   - 有流量标签的边: ${withLabel}`);
    console.log(`   - 无流量标签的边: ${withoutLabel}`);

    if (withoutLabel > 0) {
      console.log(`\n⚠️  警告: ${withoutLabel} 条边没有流量标签`);
      console.log('   可能原因:');
      console.log('   1. Interface 没有关联到 TrafficMetric');
      console.log('   2. TopologyEdge.metadata 中没有流量数据');
      console.log('   3. 接口未被监控 (isMonitored=false)');
    } else {
      console.log('\n✅ 所有边都有流量标签！');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkTopologyEdgeLabels();
