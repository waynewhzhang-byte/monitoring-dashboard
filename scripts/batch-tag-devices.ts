
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function batchTag() {
    console.log('🚀 [TAG] 正在开始批量打标逻辑...');

    // 1. 获取所有设备
    const devices = await prisma.device.findMany();
    console.log(`📊 [TAG] 正在处理 ${devices.length} 个设备...`);

    let updatedDevices = 0;
    for (const device of devices) {
        const name = (device.displayName || device.name || '').toLowerCase();
        const tags = new Set<string>(device.tags || []);

        // 规则 A: 核心/重要设备判定
        if (name.includes('核心') || name.includes('center') || name.includes('core')) {
            tags.add('核心');
            tags.add('重要设备');
        }

        // 规则 B: 服务器归类 (针对 OTHER 类型)
        if (name.includes('srv') || name.includes('server') || name.includes('服务器') || name.includes('主机')) {
            tags.add('服务器');
        }

        // 规则 C: 网络设备归类 (针对 OTHER 类型)
        if (name.includes('sw') || name.includes('switch') || name.includes('交换机') || name.includes('route')) {
            tags.add('交换机');
        }

        // 规则 D: 特殊业务关键字
        if (name.includes('集群') || name.includes('云桌面')) {
            tags.add('重要设备');
        }

        // 如果标签有变化，则更新
        if (tags.size > (device.tags?.length || 0)) {
            await prisma.device.update({
                where: { id: device.id },
                data: { tags: Array.from(tags) }
            });
            updatedDevices++;
        }
    }
    console.log(`✅ [TAG] 已完成设备标签更新: ${updatedDevices} 个设备被重新标记。`);

    // 2. 接口打标 (用于 Tab 2 流量大屏)
    console.log('🚀 [TAG] 正在处理接口标签 (上联/互联网出口)...');
    const interfaces = await prisma.interface.findMany();
    let updatedInterfaces = 0;

    for (const intf of interfaces) {
        const name = (intf.displayName || intf.name || '').toLowerCase();
        const tags = new Set<string>(intf.tags || []);

        // 规则: 识别上联口
        if (name.includes('上联') || name.includes('uplink') || name.includes('trun')) {
            tags.add('上联');
        }

        // 规则: 识别出口
        if (name.includes('出口') || name.includes('internet') || name.includes('外网')) {
            tags.add('互联网出口');
        }

        if (tags.size > (intf.tags?.length || 0)) {
            await prisma.interface.update({
                where: { id: intf.id },
                data: { tags: Array.from(tags) }
            });
            updatedInterfaces++;
        }
    }
    console.log(`✅ [TAG] 已完成接口标签更新: ${updatedInterfaces} 个接口被重新标记。`);
}

batchTag()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
