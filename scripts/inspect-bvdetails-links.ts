import { opClient } from '@/services/opmanager/client';

async function inspect() {
    console.log('🔍 检查 getBVDetails 返回的链路数据\n');

    const bvName = process.argv[2] || 'TEST2';
    const data = await opClient.getBVDetails(bvName);

    if (!data || !data.linkProperties) {
        console.log('❌ 没有找到链路数据');
        return;
    }

    console.log(`找到 ${data.linkProperties.length} 条链路\n`);
    console.log('='.repeat(80));

    for (let i = 0; i < Math.min(3, data.linkProperties.length); i++) {
        const link = data.linkProperties[i];
        console.log(`\n链路 ${i + 1}:`);
        console.log(`  objName: ${link.objName}`);
        console.log(`  name: ${link.name}`);
        console.log(`  desc: ${link.desc}`);
        console.log(`  parentName: ${link.parentName}`);
        console.log(`  ifName: ${link.ifName}`);
        console.log(`  intfDisplayName: ${link.intfDisplayName}`);
        console.log(`  source: ${link.source}`);
        console.log(`  dest: ${link.dest}`);
        console.log(`  InTraffic: ${(link as any).InTraffic}`);
        console.log(`  OutTraffic: ${(link as any).OutTraffic}`);
        console.log(`\n  完整数据:`);
        console.log(JSON.stringify(link, null, 2));
        console.log('='.repeat(80));
    }

    // 查看所有唯一的 objName
    const uniqueObjNames = [...new Set(data.linkProperties.map((l: any) => l.objName))];
    console.log(`\n所有唯一的 objName (${uniqueObjNames.length} 个):`);
    uniqueObjNames.forEach(name => console.log(`  - ${name}`));

    // 查看所有唯一的 desc
    const uniqueDescs = [...new Set(data.linkProperties.map((l: any) => l.desc))];
    console.log(`\n所有唯一的 desc (${uniqueDescs.length} 个):`);
    uniqueDescs.forEach(desc => console.log(`  - ${desc}`));
}

inspect().catch(console.error);
